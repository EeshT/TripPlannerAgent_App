"""
FastAPI backend for the Wayfind trip planner — with JWT auth.

Auth endpoints:
  POST /auth/register                  → create account, returns JWT
  POST /auth/login                     → login, returns JWT
  GET  /auth/google                    → get Google OAuth consent URL
  GET  /auth/google/callback?code=...  → exchange code → JWT

Trip endpoints (all require  Authorization: Bearer <token>  OR  ?token=<jwt>):
  GET  /trips/history/all              → trips for THIS user only
  POST /trips/start                    → create + kick-off a new trip
  GET  /trips/{thread_id}/stream       → SSE stream (stays open; ?token= supported)
  POST /trips/{thread_id}/resume       → send interrupt resume value
  GET  /trips/{thread_id}/state        → current graph state (for reload)
  DELETE /trips/{thread_id}            → delete a session & its node history
  GET  /trips/{thread_id}/nodes        → persisted node timeline for a session
"""

import asyncio
import json
import sqlite3
import threading
import uuid
from contextlib import asynccontextmanager
from datetime import datetime
from typing import Any, Optional

import uvicorn
from fastapi import Depends, FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse, StreamingResponse
from pydantic import BaseModel

from langgraph.types import Command
from graph import graph, MAX_REFINEMENTS
from schema import TravelRequest, TravelerPreferences

from auth import (
    UserInfo,
    TokenResponse,
    RegisterRequest,
    LoginRequest,
    get_current_user,
    init_user_db,
    register_handler,
    login_handler,
    google_login_url_handler,
    google_callback_handler,
    decode_token,
    _user_conn,
)


# ─────────────────────────────────────────────────────────────────────────────
# SSE-friendly auth dependency
# EventSource in browsers cannot set custom headers, so we accept the JWT as
# either  Authorization: Bearer <token>  OR  ?token=<jwt>  query param.
# ─────────────────────────────────────────────────────────────────────────────
def get_user_sse(
    request: Request,
    token: Optional[str] = Query(default=None),
) -> UserInfo:
    auth_header = request.headers.get("authorization", "")
    raw_token: Optional[str] = None

    if auth_header.lower().startswith("bearer "):
        raw_token = auth_header[7:].strip()
    elif token:
        raw_token = token

    if not raw_token:
        raise HTTPException(
            status_code=401,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = decode_token(raw_token)   # raises 401 on bad/expired token
    conn = _user_conn()
    row = conn.execute(
        "SELECT user_id, username, display_name, avatar_url FROM users WHERE user_id = ?",
        (user_id,),
    ).fetchone()
    conn.close()

    if not row:
        raise HTTPException(status_code=401, detail="User not found")

    return UserInfo(
        user_id=row["user_id"],
        username=row["username"],
        display_name=row["display_name"] or row["username"] or "Traveller",
        avatar_url=row["avatar_url"],
    )


# ── Meta DB ───────────────────────────────────────────────────────────────────
META_DB = "wayfind_meta.db"


def _meta_conn():
    conn = sqlite3.connect(META_DB, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def _init_meta_db():
    conn = _meta_conn()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS trips (
            thread_id    TEXT PRIMARY KEY,
            user_id      TEXT NOT NULL DEFAULT '',
            source       TEXT,
            destination  TEXT,
            created_at   TEXT,
            is_done      INTEGER DEFAULT 0
        )
    """)
    # Node history — persists timeline so switching sessions restores full history
    conn.execute("""
        CREATE TABLE IF NOT EXISTS trip_nodes (
            id             INTEGER PRIMARY KEY AUTOINCREMENT,
            thread_id      TEXT    NOT NULL,
            seq            INTEGER NOT NULL,
            node           TEXT    NOT NULL,
            status         TEXT    NOT NULL,
            type           TEXT,
            label          TEXT,
            interrupt_data TEXT,
            payload        TEXT,
            error_msg      TEXT,
            resolved       INTEGER DEFAULT 0,
            recorded_at    TEXT,
            UNIQUE(thread_id, seq)
        )
    """)
    conn.commit()
    conn.close()


# ── In-memory SSE queue registry ─────────────────────────────────────────────
_sse_queues: dict[str, asyncio.Queue] = {}
_sse_lock   = threading.Lock()


def _get_or_create_queue(thread_id: str) -> asyncio.Queue:
    with _sse_lock:
        if thread_id not in _sse_queues:
            _sse_queues[thread_id] = asyncio.Queue()
        return _sse_queues[thread_id]


def _drop_queue(thread_id: str):
    with _sse_lock:
        _sse_queues.pop(thread_id, None)


# ── Node history DB helpers ───────────────────────────────────────────────────

def _get_last_seq(thread_id: str) -> int:
    conn = _meta_conn()
    row = conn.execute(
        "SELECT MAX(seq) AS m FROM trip_nodes WHERE thread_id = ?", (thread_id,)
    ).fetchone()
    conn.close()
    return (row["m"] or 0) if row else 0


def _upsert_node(
    thread_id: str, seq: int, node: str, status: str,
    type_: str = None, label: str = None,
    interrupt_data: Any = None, payload: Any = None,
    error_msg: str = None, resolved: bool = False,
):
    conn = _meta_conn()
    conn.execute(
        """INSERT INTO trip_nodes
           (thread_id, seq, node, status, type, label,
            interrupt_data, payload, error_msg, resolved, recorded_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(thread_id, seq) DO UPDATE SET
             status         = excluded.status,
             type           = excluded.type,
             label          = excluded.label,
             interrupt_data = excluded.interrupt_data,
             payload        = excluded.payload,
             error_msg      = excluded.error_msg,
             resolved       = excluded.resolved,
             recorded_at    = excluded.recorded_at
        """,
        (
            thread_id, seq, node, status, type_, label,
            json.dumps(interrupt_data) if interrupt_data is not None else None,
            json.dumps(payload)        if payload        is not None else None,
            error_msg,
            1 if resolved else 0,
            datetime.utcnow().isoformat(),
        ),
    )
    conn.commit()
    conn.close()


def _patch_node(thread_id: str, seq: int, **kwargs):
    """Update specific columns on an existing node row."""
    if not kwargs:
        return
    allowed = {"status", "resolved", "payload", "error_msg", "interrupt_data"}
    sets, params = [], []
    for k, v in kwargs.items():
        if k not in allowed:
            continue
        sets.append(f"{k} = ?")
        if k in ("payload", "interrupt_data") and v is not None:
            params.append(json.dumps(v))
        elif k == "resolved":
            params.append(1 if v else 0)
        else:
            params.append(v)
    if not sets:
        return
    params += [thread_id, seq]
    conn = _meta_conn()
    conn.execute(
        f"UPDATE trip_nodes SET {', '.join(sets)} WHERE thread_id=? AND seq=?",
        params,
    )
    conn.commit()
    conn.close()


def _get_node_history(thread_id: str) -> list[dict]:
    conn = _meta_conn()
    rows = conn.execute(
        "SELECT * FROM trip_nodes WHERE thread_id = ? ORDER BY seq ASC",
        (thread_id,),
    ).fetchall()
    conn.close()

    result = []
    for r in rows:
        d = dict(r)
        for col in ("interrupt_data", "payload"):
            if d.get(col):
                try:
                    d[col] = json.loads(d[col])
                except Exception:
                    pass
        result.append(d)
    return result


# ── Serialisation helpers ─────────────────────────────────────────────────────

def _pydantic_safe(obj: Any) -> Any:
    if hasattr(obj, "model_dump"):
        return _pydantic_safe(obj.model_dump())
    if isinstance(obj, dict):
        return {k: _pydantic_safe(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_pydantic_safe(i) for i in obj]
    if hasattr(obj, "isoformat"):
        return obj.isoformat()
    return obj


def _state_to_dict(state: Any) -> dict:
    raw = dict(state) if not isinstance(state, dict) else state
    return _pydantic_safe(raw)


# ── Lifespan ──────────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(_: FastAPI):
    _init_meta_db()
    init_user_db()
    yield


# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(title="Wayfind API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ═════════════════════════════════════════════════════════════════════════════
# Auth routes  (public — no JWT required)
# ═════════════════════════════════════════════════════════════════════════════

@app.post("/auth/register", response_model=TokenResponse)
def route_register(body: RegisterRequest):
    return register_handler(body)


@app.post("/auth/login", response_model=TokenResponse)
def route_login(body: LoginRequest):
    return login_handler(body)


@app.get("/auth/google")
def route_google_login():
    return google_login_url_handler()


@app.get("/auth/google/callback", response_class=RedirectResponse)
async def route_google_callback(code: str):
    # google_callback_handler returns a RedirectResponse to the React app
    # with the JWT embedded as ?token=... query params.
    return await google_callback_handler(code)


@app.get("/auth/me", response_model=UserInfo)
def route_me(user: UserInfo = Depends(get_current_user)):
    return user


# ═════════════════════════════════════════════════════════════════════════════
# Pydantic models
# ═════════════════════════════════════════════════════════════════════════════

class TripStartRequest(BaseModel):
    source: str
    destination: str
    start_date: str
    end_date: str
    num_people: int = 2
    budget: float = 50000
    travel_style: str = "balanced"
    flexibility_tolerance: str = "medium"
    interests: list[str] = []
    dietary_restrictions: list[str] = []
    accessibility_needs: list[str] = []


class ResumeRequest(BaseModel):
    value: Any


# ═════════════════════════════════════════════════════════════════════════════
# Core graph driver
# ═════════════════════════════════════════════════════════════════════════════

def _drive_graph(
    thread_id: str,
    input_value: Any,
    loop: asyncio.AbstractEventLoop,
    is_resume: bool,
):
    """
    Drive the LangGraph graph forward (initial run or resume after interrupt).

    CRITICAL BEHAVIOURS:
    - Persists every node transition to trip_nodes so the frontend can reload
      the full timeline when switching between sessions.
    - Does NOT send stream_end on interrupt — SSE connection stays alive.
    - Sends stream_end only when graph truly finishes or hits a fatal error.
    - Enriches review_decision interrupt with the current itinerary.
    """
    queue  = _get_or_create_queue(thread_id)
    config = {"configurable": {"thread_id": thread_id}}
    seq    = _get_last_seq(thread_id)

    def emit(event: dict):
        asyncio.run_coroutine_threadsafe(queue.put(event), loop)

    try:
        prev_node: Optional[str] = None
        interrupted = False
        stream_input = Command(resume=input_value) if is_resume else input_value

        for chunk in graph.stream(stream_input, config=config, stream_mode="updates"):
            for node_name, _delta in chunk.items():
                if node_name == "__interrupt__":
                    continue

                if node_name != prev_node:
                    event_type = "node_start" if prev_node is None else "node_change"

                    # Mark previous node as done in DB
                    if prev_node is not None:
                        _patch_node(thread_id, seq, status="done")

                    seq += 1
                    _upsert_node(thread_id, seq, node_name, "running",
                                 type_="node_progress",
                                 label=node_name)

                    emit({"type": event_type, "node": node_name, "seq": seq})
                    prev_node = node_name

            # Check for a pending interrupt after each chunk
            snap = graph.get_state(config)
            if snap.tasks:
                for task in snap.tasks:
                    if not (hasattr(task, "interrupts") and task.interrupts):
                        continue
                    for intr in task.interrupts:
                        raw_iv = intr.value

                        # Enrich review_decision with the current itinerary so
                        # the frontend can render it alongside the review card.
                        if isinstance(raw_iv, str):
                            state_vals = _state_to_dict(snap.values)
                            interrupt_data = {
                                "type":      "review_decision",
                                "message":   raw_iv,
                                "itinerary": state_vals.get("itinerary"),
                            }
                        else:
                            interrupt_data = _pydantic_safe(raw_iv)

                        itype = (
                            interrupt_data.get("type", "unknown")
                            if isinstance(interrupt_data, dict)
                            else "unknown"
                        )

                        # Persist interrupt state
                        _patch_node(thread_id, seq, status="waiting",
                                    interrupt_data=interrupt_data, resolved=False)

                        emit({
                            "type":           "interrupt",
                            "node":           prev_node or "unknown",
                            "interrupt_data": interrupt_data,
                            "seq":            seq,
                        })

                    interrupted = True
                    return   # SSE stays alive — no stream_end

        if not interrupted:
            # Mark last running node as done
            if prev_node:
                _patch_node(thread_id, seq, status="done")

            final_snap  = graph.get_state(config)
            final_state = _state_to_dict(final_snap.values)

            # Persist rich result entries
            if final_state.get("itinerary"):
                seq += 1
                _upsert_node(thread_id, seq, "draft_itinerary", "done",
                             type_="itinerary", label="Itinerary ready",
                             payload=final_state["itinerary"])

            if final_state.get("booking_summary"):
                seq += 1
                _upsert_node(thread_id, seq, "booking_summary", "done",
                             type_="booking_summary", label="Booking summary",
                             payload=final_state["booking_summary"])

            emit({"type": "graph_done", "state": final_state})

            conn = _meta_conn()
            conn.execute(
                "UPDATE trips SET is_done = 1 WHERE thread_id = ?", (thread_id,)
            )
            conn.commit()
            conn.close()

            emit({"type": "stream_end"})

    except Exception as exc:
        emit({"type": "error", "error": str(exc)})
        emit({"type": "stream_end"})


def _run_graph(
    thread_id: str,
    initial_state: dict,
    loop: asyncio.AbstractEventLoop,
):
    _drive_graph(thread_id, initial_state, loop, is_resume=False)


def _resume_graph(
    thread_id: str,
    value: Any,
    loop: asyncio.AbstractEventLoop,
):
    # Mark any pending interrupt nodes as resolved before re-driving
    conn = _meta_conn()
    conn.execute(
        "UPDATE trip_nodes SET resolved = 1 WHERE thread_id = ? AND status = 'waiting'",
        (thread_id,),
    )
    conn.commit()
    conn.close()
    _drive_graph(thread_id, value, loop, is_resume=True)


# ═════════════════════════════════════════════════════════════════════════════
# Ownership guard
# ═════════════════════════════════════════════════════════════════════════════

def _assert_owner(thread_id: str, user_id: str):
    conn = _meta_conn()
    row  = conn.execute(
        "SELECT user_id FROM trips WHERE thread_id = ?", (thread_id,)
    ).fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="Trip not found")
    if row["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="Not your trip")


# ═════════════════════════════════════════════════════════════════════════════
# Trip routes  (JWT required on all)
# ═════════════════════════════════════════════════════════════════════════════

@app.get("/trips/history/all")
def get_all_history(user: UserInfo = Depends(get_current_user)):
    """Return all trips belonging to the authenticated user."""
    conn = _meta_conn()
    rows = conn.execute(
        "SELECT thread_id, source, destination, created_at, is_done "
        "FROM trips WHERE user_id = ? ORDER BY created_at DESC",
        (user.user_id,),
    ).fetchall()
    conn.close()
    return {"sessions": [dict(r) for r in rows]}


@app.post("/trips/start")
async def start_trip(
    body: TripStartRequest,
    user: UserInfo = Depends(get_current_user),
):
    thread_id = str(uuid.uuid4())

    prefs = TravelerPreferences(
        travel_style=body.travel_style,
        flexibility_tolerance=body.flexibility_tolerance,
        interests=body.interests,
        dietary_restrictions=body.dietary_restrictions,
        accessibility_needs=body.accessibility_needs,
    )
    travel_request = TravelRequest(
        source=body.source,
        destination=body.destination,
        start_date=body.start_date,
        end_date=body.end_date,
        num_people=body.num_people,
        budget=body.budget,
        nearby_towns=[],
        preferences=prefs,
    )

    initial_state = {
        "user_request":          travel_request,
        "hotels":                [],
        "selected_hotel":        None,
        "attractions":           [],
        "selected_attractions":  [],
        "weather":               [],
        "flight_options":        [],
        "selected_flight":       None,
        "flight_search_success": False,
        "transit":               [],
        "itinerary":             None,
        "user_feedback":         None,
        "feedback_required":     False,
        "refinement_count":      0,
        "booking_verification":  None,
        "checkout_links":        None,
        "booking_summary":       None,
        "messages":              [],
    }

    conn = _meta_conn()
    conn.execute(
        "INSERT INTO trips (thread_id, user_id, source, destination, created_at, is_done) "
        "VALUES (?, ?, ?, ?, ?, 0)",
        (thread_id, user.user_id, body.source, body.destination,
         datetime.utcnow().isoformat()),
    )
    conn.commit()
    conn.close()

    _get_or_create_queue(thread_id)   # create before thread starts

    loop = asyncio.get_event_loop()
    threading.Thread(
        target=_run_graph,
        args=(thread_id, initial_state, loop),
        daemon=True,
    ).start()

    return {"thread_id": thread_id, "destination": body.destination}


@app.get("/trips/{thread_id}/nodes")
def get_node_history(
    thread_id: str,
    user: UserInfo = Depends(get_current_user),
):
    """Return the persisted node timeline — used when switching between sessions."""
    _assert_owner(thread_id, user.user_id)
    return {"nodes": _get_node_history(thread_id)}


@app.get("/trips/{thread_id}/stream")
async def stream_trip(
    thread_id: str,
    request: Request,
    user: UserInfo = Depends(get_user_sse),   # accepts header OR ?token=
):
    """
    SSE endpoint. Stays open until stream_end (true completion / fatal error).
    Accepts JWT via Authorization header or ?token= query param, because the
    browser EventSource API cannot send custom headers.
    """
    _assert_owner(thread_id, user.user_id)
    queue = _get_or_create_queue(thread_id)

    async def event_generator():
        try:
            while True:
                if await request.is_disconnected():
                    break
                try:
                    event = await asyncio.wait_for(queue.get(), timeout=15.0)
                    yield f"data: {json.dumps(event)}\n\n"
                    if event.get("type") == "stream_end":
                        break
                except asyncio.TimeoutError:
                    yield f"data: {json.dumps({'type': 'ping'})}\n\n"
        except asyncio.CancelledError:
            pass

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control":     "no-cache",
            "X-Accel-Buffering": "no",
            "Connection":        "keep-alive",
        },
    )


@app.post("/trips/{thread_id}/resume")
async def resume_trip(
    thread_id: str,
    body: ResumeRequest,
    user: UserInfo = Depends(get_current_user),
):
    """Resume after an interrupt. Uses the SAME SSE queue — no reconnect needed."""
    _assert_owner(thread_id, user.user_id)

    config = {"configurable": {"thread_id": thread_id}}
    snap   = graph.get_state(config)
    if snap is None:
        raise HTTPException(status_code=404, detail="Thread not found")

    _get_or_create_queue(thread_id)

    loop = asyncio.get_event_loop()
    threading.Thread(
        target=_resume_graph,
        args=(thread_id, body.value, loop),
        daemon=True,
    ).start()

    return {"status": "resumed", "thread_id": thread_id}


@app.get("/trips/{thread_id}/state")
def get_trip_state(
    thread_id: str,
    user: UserInfo = Depends(get_current_user),
):
    """
    Snapshot for reload. Enriches review_decision interrupt with itinerary
    the same way _drive_graph does.
    """
    _assert_owner(thread_id, user.user_id)

    config = {"configurable": {"thread_id": thread_id}}
    try:
        snap = graph.get_state(config)
    except Exception as exc:
        raise HTTPException(status_code=404, detail=str(exc))

    if snap is None or snap.values is None:
        raise HTTPException(status_code=404, detail="Thread not found")

    state_dict = _state_to_dict(snap.values)
    is_done    = len(snap.next) == 0

    interrupt_data = None
    current_node   = None
    if snap.tasks:
        for task in snap.tasks:
            current_node = task.name
            if hasattr(task, "interrupts") and task.interrupts:
                raw_iv = task.interrupts[0].value
                if isinstance(raw_iv, str):
                    interrupt_data = {
                        "type":      "review_decision",
                        "message":   raw_iv,
                        "itinerary": state_dict.get("itinerary"),
                    }
                else:
                    interrupt_data = _pydantic_safe(raw_iv)
                break

    return {
        "is_done":          is_done,
        "refinements_used": state_dict.get("refinement_count", 0),
        "max_refinements":  MAX_REFINEMENTS,
        "current_node":     current_node,
        "current_label":    current_node,
        "interrupt_data":   interrupt_data,
        "state":            state_dict,
    }


@app.delete("/trips/{thread_id}")
def delete_trip(
    thread_id: str,
    user: UserInfo = Depends(get_current_user),
):
    """Delete a trip session, its node history, and close any live SSE queue."""
    _assert_owner(thread_id, user.user_id)

    _drop_queue(thread_id)   # close live SSE if active

    conn = _meta_conn()
    conn.execute("DELETE FROM trip_nodes WHERE thread_id = ?", (thread_id,))
    conn.execute("DELETE FROM trips      WHERE thread_id = ?", (thread_id,))
    conn.commit()
    conn.close()

    return {"deleted": True, "thread_id": thread_id}


# ═════════════════════════════════════════════════════════════════════════════
if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)