# Wayfind — AI Travel Itinerary Planner

An agentic, full-stack travel planner that turns a single trip request (source,
destination, dates, budget, preferences) into a complete, bookable itinerary —
weather-aware attraction selection, hotel and flight discovery, human-in-the-loop
review and refinement, real-world booking verification, and deep-link checkout —
orchestrated by a 12-node LangGraph state machine with an LLM at the decision
points that actually need judgment.

---

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [Project Structure](#project-structure)
3. [Setup & Installation](#setup--installation)
4. [How the Agent Thinks: The Graph](#how-the-agent-thinks-the-graph)
5. [The "Brain": Where the LLM Is Actually Used (and Where It Isn't)](#the-brain-where-the-llm-is-actually-used-and-where-it-isnt)
6. [Human-in-the-Loop Model](#human-in-the-loop-model)
7. [API Reference](#api-reference)
8. [Configuration](#configuration)
9. [Design Decisions](#design-decisions)
10. [Key Decisions on Unclear Requirements](#key-decisions-on-unclear-requirements)
11. [Known Limitations / Edge Cases](#known-limitations--edge-cases)
12. [Version Control Strategy](#version-control-strategy)

---

## Tech Stack

| Layer | Technology | Rationale |
|---|---|---|
| Agent orchestration | LangGraph | Native support for conditional branching, loops, and *pausable* execution via `interrupt()` — a plain call-chain can't wait on a human mid-flow |
| LLM | LLaMA 3.3 70B via Groq | Fast inference keeps the multi-call pipeline (ranking, drafting, refining, verifying) responsive; swappable to Gemini via a commented config |
| API framework | FastAPI | Native async, SSE support, and Pydantic-first request/response models line up with the rest of the stack |
| State persistence | SQLite (via LangGraph `SqliteSaver`) | Lets a trip pause on an interrupt and resume after a server restart, days later, without losing progress |
| Frontend | React | Renders the live agent timeline, interrupt cards (flight selection, feedback), and final booking summary |
| Structured output | Pydantic | Every LLM extraction/classification step is schema-validated on the way out, not trusted as free text |
| Auth | JWT + Google OAuth 2.0 | Stateless bearer auth for REST + SSE, with OAuth as an alternative to password login |
| External data | OpenWeather, OpenTripMap, Geoapify, Tavily | Weather, attractions, hotels, and flight/verification search respectively — no single provider covers the whole trip |

---

## Project Structure

```
backend/
├── main.py                        # FastAPI app: routes, SSE streaming, auth wiring
├── auth.py                        # JWT + Google OAuth handlers, user DB
├── graph.py                       # LangGraph StateGraph assembly — the pipeline itself
├── schema.py                      # All Pydantic models + PlannerState (TypedDict)
├── LLM_config.py                  # LLM client configuration (Groq / Gemini)
├── tools/
│   ├── weather_tool.py            # OpenWeather fetch + rule-based day suitability
│   ├── attractions_tool.py        # OpenTripMap discovery + popularity scoring
│   ├── attraction_ranking_tool.py # Rule-based pre-score → LLM final selection
│   ├── hotel_discovery_tool.py    # Geoapify discovery + haversine/style scoring + link enrichment
│   └── flight_discovery_tool.py   # Tavily search → LLM extraction → scored candidates
├── agents/
│   ├── draft_itenary_agent.py     # LLM drafts daily plans; Python reassembles the full itinerary
│   ├── itenary_refinement_agent.py# Feedback → search queries → grounded LLM rewrite
│   ├── booking_verification_agent.py # Tavily + LLM verification of flight/hotel availability
│   ├── timeline_repair_agent.py   # Conditional LLM repair when verified data drifts from planned
│   ├── checkout_link_generator.py # Pure logic — builds deep-link checkout URLs
│   └── booking_summary_agent.py   # Pure logic — final pre-payment figures, never LLM-derived
frontend/
└── (React app — live node timeline, interrupt cards, booking summary UI)
```

---

## Setup & Installation

### Prerequisites

- Python ≥ 3.10, Node.js ≥ 18
- API keys: Groq, OpenWeather, OpenTripMap, Geoapify, Tavily
- (Optional) Google OAuth client ID/secret for social login

### Steps

```bash
# 1. Clone the repository
git clone <your-repo-url>
cd wayfind

# 2. Backend setup
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Fill in API_KEY (Groq), OPENWEATHER_API_KEY, OPENTRIPMAP_API_KEY,
# GEOAPIFY_API_KEY, TAVILY_API_KEY, JWT_SECRET_KEY, GOOGLE_CLIENT_ID/SECRET

# 3. Run the backend
uvicorn main:app --reload
# Server starts on http://localhost:8000

# 4. Frontend setup
cd ../frontend
npm install
npm run dev
# Dev server starts on http://localhost:5173
```

> **Note:** `.env`, `*.db`, `*.db-shm`, `*.db-wal` are gitignored — every developer
> needs their own local `.env` and will generate fresh local SQLite files on
> first run (`wayfind_users.db`, `trip_planner.db`, `wayfind_meta.db`).

---

## How the Agent Thinks: The Graph

The whole planning process is one `StateGraph` over a single `PlannerState`
`TypedDict` — every node reads what it needs from state and writes its result
back, so the graph is really a pipeline of state transformations, not a
conversation:

```
get_weather → get_attractions → attraction_ranking_node → get_hotels → hotel_ranking_node
    → flight_discovery ──┬─→ flight_selection (interrupt)      ─┐
                         └─→ manual_flight_input (interrupt)    ├─→ draft_itinerary
                                                                 ┘
    → review_decision (interrupt)
         ├─ needs work & refinements left → collect_feedback (interrupt) → refine_node → review_decision (loop)
         └─ approved / refinements exhausted → booking_verification
    → timeline_repair (conditional no-op) → checkout_link_generator → booking_summary → END
```

**Why LangGraph instead of a linear script:** three properties a plain
function-call chain can't give you:

- **Conditional branching** — `flight_router` sends the graph down a different
  path depending on whether automated flight discovery actually found anything.
- **Bounded loops** — the refinement cycle (`collect_feedback → refine_node →
  review_decision`) repeats until the user is happy *or* `MAX_REFINEMENTS` (3)
  is hit, whichever comes first.
- **Pausable execution** — `interrupt()` freezes the graph mid-run and hands
  control back to the caller. Combined with the `SqliteSaver` checkpointer,
  a trip can sit paused on "pick a flight" for hours or across a server
  restart and resume exactly where it left off.

---

## The "Brain": Where the LLM Is Actually Used (and Where It Isn't)

This is the part most worth understanding, because the project deliberately
does **not** put an LLM in charge of everything. The design principle: *let the
LLM make judgment calls where judgment is genuinely needed; keep anything
money-facing or objectively computable in deterministic Python.*

| Node | Uses LLM? | What the LLM actually decides |
|---|---|---|
| `get_weather` | No | Pure rule-based thresholds (rain %, temp) → `Suitability` enum |
| `get_attractions` | No | Pure API fetch + a numeric popularity heuristic |
| `attraction_ranking_node` | **Yes** | Rule-based scoring narrows 25→15 candidates; the LLM picks the final subset given travel style, interests, and weather — this is a genuine judgment call (which mix of museums vs. outdoor spots suits *this* traveler) that a formula alone handles poorly |
| `get_hotels` | No | Pure API fetch |
| `hotel_ranking_node` | Partial | Selection is fully deterministic (top-scored hotel by `compute_hotel_score`); an LLM call also runs to *explain* the pick in natural language for the UI, but does not influence which hotel is chosen |
| `flight_discovery_node` | **Yes** | Tavily search returns unstructured web content; the LLM's job here is pure **extraction** (turn prose into structured `Flight` objects), not judgment — scoring/selection of cheapest/fastest/best-value is deterministic afterward |
| `draft_itinerary` | **Yes** | The core generative step — given weather, attractions, hotel, and flight *context* (not full objects — see below), the LLM composes a day-by-day schedule. This is genuinely creative/combinatorial work no formula reasonably replaces |
| `review_decision` / `collect_feedback` | No | Pure human input via `interrupt()` |
| `refine_node` | **Yes** (twice) | First LLM call turns free-text feedback into targeted search queries (judgment: *what does this feedback actually require looking up?*); second LLM call rewrites the itinerary grounded in those results |
| `booking_verification_node` | **Yes** | Extracts structured availability/pricing from search snippets — extraction, not judgment, with a deliberate bias toward `is_available=True` + a caveat over blocking checkout |
| `timeline_repair_node` | Conditional | Only invoked if a Python-computed diff (`_needs_repair`) detects real drift between planned and verified data — the LLM never decides *whether* to repair, only *how* to reflow the schedule once repair is triggered |
| `checkout_link_generator` | No | Pure URL construction |
| `booking_summary_node` | No | Pure arithmetic on verified figures — explicitly never LLM-derived, since this is the number the user pays against |

**The one-line summary:** the LLM is the "brain" for *selection under
ambiguous criteria* (which attractions fit this traveler) and *generation*
(writing the actual schedule) and *unstructured-text extraction* (pulling
facts out of search results) — never for the final dollar amount or for
decisions that are really just "compare two numbers."

### A deliberate anti-pattern to avoid: the "decorative" LLM call

`hotel_ranking_node` prompts the LLM to *"choose the best hotel, explain why"* —
but the actual `selected_hotel` assignment is `top_hotels[0]`, fully independent
of what the LLM says. This was a conscious trade-off during development
(the explanation is useful narrative for the UI/`messages` log) but is worth
flagging explicitly: **an LLM call that doesn't influence the decision it's
prompted to make is wasted latency and cost unless its only job is narration.**
If revisited, this should either be wired into the actual selection via
`with_structured_output`, or explicitly relabeled as an "explain the pick"
call rather than a "make the pick" call.

### Prompt discipline: context vs. echo

`draft_itinerary`'s prompt sends the LLM only the *fields it needs for
scheduling* (hotel name/location/coordinates; flight airline and
arrival/departure times) — not the full `Hotel`/`RoundTripFlightOption`
objects. The LLM is asked to return only `daily_plans` and `travel_tips`;
the final `TravelItinerary` (including `hotel`, `selected_flight`,
`total_estimated_cost`) is reassembled in Python from state, which already
holds the verified, correctly-typed objects. This keeps the LLM's output
short (cheaper, less likely to truncate mid-response) and keeps identifiers
like `hotel_id` and computed totals exactly correct instead of trusting the
model to copy them verbatim.

---

## Human-in-the-Loop Model

Three distinct `interrupt()` points, each serving a different purpose:

1. **`flight_selection` / `manual_flight_input`** — the user must choose
   between discovered flight options, or supply preferences manually if
   discovery failed. Nothing downstream can proceed without a concrete
   `selected_flight`.
2. **`review_decision`** — a lightweight yes/no gate: does the draft itinerary
   need changes? This exists as its own node (rather than folded into
   `collect_feedback`) so "no changes needed" is a fast, single-step exit from
   the loop.
3. **`collect_feedback`** — only reached if review says yes; collects free-text
   feedback, which `refine_node` turns into targeted searches + a grounded
   rewrite.

Every interrupt payload is persisted via the checkpointer, so a trip can be
resumed via `Command(resume=value)` from any process — including a fresh
server instance — as long as the `thread_id` and underlying SQLite file are
retained.

---

## API Reference

*(Fill in with actual routes from `main.py` — e.g. `POST /trips`,
`GET /trips/{id}/state`, `POST /trips/{id}/resume`,
`GET /trips/{id}/itinerary.pdf`, `GET /auth/google`, etc.)*

---

## Configuration

| Variable | Default | Description |
|---|---|---|
| `API_KEY` | — | Groq API key for the LLM |
| `OPENWEATHER_API_KEY` | — | Weather forecast provider |
| `OPENTRIPMAP_API_KEY` | — | Attraction discovery provider |
| `GEOAPIFY_API_KEY` | — | Hotel discovery / geocoding provider |
| `TAVILY_API_KEY` | — | Web search for flights, hotel links, verification, refinement |
| `JWT_SECRET_KEY` | insecure placeholder — **must** be overridden in production | Signs auth tokens |
| `FRONTEND_URL` | `http://localhost:5173` | Where Google OAuth redirects the browser after login |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | — | Google OAuth app credentials |
| `GOOGLE_REDIRECT_URI` | `http://localhost:8000/auth/google/callback` | Must exactly match the URI registered in Google Cloud Console |
| `MAX_REFINEMENTS` | `3` (hardcoded in `graph.py`) | Caps the feedback/refine loop so it can't run forever |

---

## Design Decisions

### 1. LangGraph over a linear LLM-call chain
A plain sequence of function calls can't pause for human input mid-execution
without losing all in-progress state, and can't express "loop up to 3 times"
or "branch depending on whether the last step succeeded" cleanly. LangGraph's
`interrupt()` + checkpointer combination directly solves both.

### 2. Fail-soft data discovery, fail-hard generation
Every external-data node (`get_weather`, `get_attractions`, `get_hotels`,
`flight_discovery`) wraps its logic in try/except and degrades to an empty
result rather than crashing the graph — one flaky API shouldn't kill the whole
trip. `draft_itinerary`, by contrast, raises on a parse/validation failure,
because a half-formed itinerary silently accepted as valid is worse than a
visible failure the user can retry.

### 3. Deterministic money math, generative scheduling
Every number that ends up in front of the user as something they're expected
to pay (`booking_summary_node`'s `grand_total`) is computed in plain Python
from verified data. The LLM never invents or is trusted to correctly echo a
price — it only ever influences *what* gets scheduled, not *what it costs*.

### 4. Two-stage ranking (rule-based pre-filter → LLM final pick)
Both attraction ranking and, in spirit, flight scoring follow the same shape:
a cheap deterministic heuristic narrows a large candidate pool, and the LLM
only sees a manageable shortlist for the genuinely judgment-based final call.
This keeps prompt size (and cost) bounded regardless of how many raw
candidates an API returns.

### 5. Structured output for extraction, manual JSON parsing for generation
`with_structured_output(PydanticModel)` is used wherever the task is
*classification/extraction* (`AttractionSelection`, `FlightSearchOutput`).
The itinerary draft, by contrast, is requested as raw JSON with fence-stripping
and manual `model_validate` — chosen because the schema is large and
variable-length (arbitrary number of days × arbitrary activities per day),
which is more reliably expressed as a described JSON shape in the prompt than
forced through structured-output tooling for every nested list.

---

## Key Decisions on Unclear Requirements

Several parts of a "book my whole trip end-to-end" assignment are inherently
under-specified. Here's what was decided, and why, where the brief didn't
pin down an exact behavior:

- **What happens when automated flight search finds nothing?**
  Rather than fail the whole trip, a `manual_flight_input` interrupt collects
  airline/budget/direct-only preferences and constructs a placeholder
  `RoundTripFlightOption` with `"TBD"` times. Interpreted the goal as
  "always produce *some* itinerary the user can act on," not "fail cleanly
  when data is incomplete."

- **How many refinement rounds is "enough"?**
  Capped at `MAX_REFINEMENTS = 3`. No requirement specified a number, so this
  was chosen as a balance between giving the user real iterative control and
  bounding LLM cost/latency — an unbounded loop risks a user (or a buggy
  feedback-extraction step) trapping the pipeline indefinitely.

- **What counts as "verified" for booking?**
  Since there's no paid flights/hotels API in this build, "verification" is
  defined as *best-effort web search + LLM extraction*, and — deliberately —
  never blocks checkout. If search is inconclusive, the item is marked
  available with a caveat note rather than failing the run. This was a
  conscious choice to prioritize "the user always reaches a checkout link"
  over "we refuse to proceed without certainty," given the absence of a
  authoritative data source to check against.

- **Should the itinerary drafting LLM call be trusted with pricing figures?**
  No — decided that `total_estimated_cost` should never be LLM arithmetic.
  The LLM only supplies attribute costs where known (activities); the hotel
  and flight cost components are computed directly from the `Hotel` /
  `RoundTripFlightOption` objects already in state.

- **What data belongs to "attraction category" when the source API's
  taxonomy doesn't match user-facing interest labels?**
  OpenTripMap has no "nightlife" or "shopping" category — both were mapped to
  its generic `interesting_places` bucket rather than omitted, on the
  assumption that returning *something* plausible is more useful to the user
  than silently dropping an entire stated interest.

- **How much of the hotel/flight object should the itinerary-drafting prompt
  see?**
  Initially the full serialized object was injected (and asked to be echoed
  back verbatim) — this caused real failures (LLM output truncated mid-string
  on a long `hotel_id`/`booking_url`). Revised to send only
  scheduling-relevant fields and reassemble the full object in Python
  afterward, since the LLM has no reason to *generate* an ID it never
  invented in the first place.

- **Should hotel/attraction pricing gaps (`price_per_night`, `entry_fee`
  both frequently `0.0` due to free-tier API limitations) block the pipeline?**
  No — treated as an acceptable known limitation for a project without a
  paid pricing API, surfaced transparently via `"estimated_cost": 0` rather
  than a guessed number, on the principle that an honest zero is better than
  a plausible-looking fabrication.

---

## Known Limitations / Edge Cases

| Scenario | How it's currently handled |
|---|---|
| Automated flight discovery returns nothing | Falls back to a manual-input interrupt with placeholder `"TBD"` flight data |
| Hotel/attraction pricing unavailable from free-tier APIs | Stored as `0.0`; downstream costs reflect this transparently rather than guessing |
| LLM wraps JSON in markdown fences despite instructions | Manually stripped in every agent that parses raw LLM output |
| LLM output truncated mid-string | Mitigated by trimming what's injected into (and echoed by) the itinerary-drafting prompt; recommended further fix: explicit `max_tokens` + a repair/retry loop |
| User feedback is purely structural (e.g. "swap day 2 and 3") | `refine_node`'s query-extraction step returns an empty query list — no unnecessary search |
| Booking verification search is inconclusive | Marked available with a caveat note rather than blocking checkout |
| Verified flight/hotel data drifts from the originally planned itinerary | `timeline_repair_node` patches only Day 1 / last-day timing and costs, conditionally, via `_needs_repair()` |
| Refinement loop could run forever on persistent negative feedback | Hard-capped at `MAX_REFINEMENTS` (3); proceeds to booking regardless afterward |
| Same hotel/destination queried repeatedly across different users | Not yet cached — a known follow-up opportunity, since attraction/hotel data for a city changes rarely |

---

## Version Control Strategy

- `.env`, `*.db`, `*.db-shm`, `*.db-wal` are gitignored — secrets and local
  SQLite state (user auth, LangGraph checkpoints, trip metadata) never belong
  in version control.
- If any of the above were committed before `.gitignore` was added, they must
  be removed with `git rm --cached` **and** any real secrets rotated — removing
  a file from tracking does not erase it from git history.
- Feature branches per node/agent addition recommended given the graph's
  modular structure — most changes are scoped to a single node file plus
  `schema.py` if the state shape changes.