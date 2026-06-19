"""
auth.py — Authentication for Wayfind

Supports:
  • Username / password  (JWT issued on POST /auth/login)
  • Google OAuth 2.0     (redirect flow → GET /auth/google/callback)

JWT payload:  { "sub": user_id, "exp": ... }

Google OAuth flow:
  1. Frontend calls GET /auth/google  → gets consent URL → window.location.href = url
  2. User approves → Google redirects to GET /auth/google/callback?code=...
  3. Backend exchanges code → creates/updates user → RedirectResponse to
     FRONTEND_URL/?token=<jwt>&user_id=...&display_name=...&avatar_url=...
  4. React reads params from URL on mount → saves auth → cleans URL

Set FRONTEND_URL env var to your React dev server (default: http://localhost:5173)
Set GOOGLE_REDIRECT_URI to http://localhost:8000/auth/google/callback (must match
what you registered in Google Cloud Console).
"""

import os
import sqlite3
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional
from urllib.parse import urlencode

import bcrypt
import httpx
from fastapi import Depends, HTTPException, status
from fastapi.responses import RedirectResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from pydantic import BaseModel

# ── Config ────────────────────────────────────────────────────────────────────
SECRET_KEY      = os.getenv("JWT_SECRET_KEY", "CHANGE_ME_in_production_use_a_long_random_string")
ALGORITHM       = "HS256"
TOKEN_EXPIRE_H  = 72   # hours

# React dev server — after Google auth the backend redirects here with the token
FRONTEND_URL         = os.getenv("FRONTEND_URL", "http://localhost:5173")

GOOGLE_CLIENT_ID     = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
# Must match EXACTLY what you registered in Google Cloud Console → Credentials
GOOGLE_REDIRECT_URI  = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:8000/auth/google/callback")

# ── Crypto ────────────────────────────────────────────────────────────────────
bearer = HTTPBearer(auto_error=False)

# ── User DB ───────────────────────────────────────────────────────────────────
USER_DB = "wayfind_users.db"


def _user_conn():
    conn = sqlite3.connect(USER_DB, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def init_user_db():
    conn = _user_conn()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS users (
            user_id      TEXT PRIMARY KEY,
            username     TEXT UNIQUE,
            email        TEXT UNIQUE,
            hashed_pw    TEXT,
            google_id    TEXT UNIQUE,
            display_name TEXT,
            avatar_url   TEXT,
            created_at   TEXT
        )
    """)
    conn.commit()
    conn.close()


# ── Pydantic models ───────────────────────────────────────────────────────────
class RegisterRequest(BaseModel):
    username: str
    password: str
    display_name: Optional[str] = None


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type:   str = "bearer"
    user_id:      str
    username:     str
    display_name: str
    avatar_url:   Optional[str] = None


class UserInfo(BaseModel):
    user_id:      str
    username:     Optional[str]
    display_name: str
    avatar_url:   Optional[str] = None


# ── Password helpers ──────────────────────────────────────────────────────────
def hash_password(pw: str) -> str:
    """Hash a password using bcrypt directly — no passlib dependency."""
    return bcrypt.hashpw(pw.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    """Verify a bcrypt hash. Returns False on any error so login just fails."""
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


# ── JWT helpers ───────────────────────────────────────────────────────────────
def create_token(user_id: str) -> str:
    exp = datetime.now(timezone.utc) + timedelta(hours=TOKEN_EXPIRE_H)
    return jwt.encode({"sub": user_id, "exp": exp}, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> str:
    """Return user_id or raise HTTP 401."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        uid = payload.get("sub")
        if not uid:
            raise HTTPException(status_code=401, detail="Invalid token payload")
        return uid
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


# ── FastAPI dependency — standard routes ──────────────────────────────────────
def get_current_user(
    creds: Optional[HTTPAuthorizationCredentials] = Depends(bearer),
) -> UserInfo:
    if creds is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user_id = decode_token(creds.credentials)

    conn = _user_conn()
    row  = conn.execute(
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


# ── DB helpers ────────────────────────────────────────────────────────────────
def _get_user_by_username(username: str):
    conn = _user_conn()
    row  = conn.execute("SELECT * FROM users WHERE username = ?", (username,)).fetchone()
    conn.close()
    return row


def _get_user_by_google_id(google_id: str):
    conn = _user_conn()
    row  = conn.execute("SELECT * FROM users WHERE google_id = ?", (google_id,)).fetchone()
    conn.close()
    return row


def _get_user_by_email(email: str):
    conn = _user_conn()
    row  = conn.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
    conn.close()
    return row


def _create_user(
    username=None, hashed_pw=None, email=None,
    google_id=None, display_name=None, avatar_url=None,
) -> str:
    user_id = str(uuid.uuid4())
    conn = _user_conn()
    conn.execute(
        """INSERT INTO users
           (user_id, username, email, hashed_pw, google_id, display_name, avatar_url, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            user_id, username, email, hashed_pw, google_id,
            display_name or username or "Traveller",
            avatar_url,
            datetime.utcnow().isoformat(),
        ),
    )
    conn.commit()
    conn.close()
    return user_id


# ── Auth route handlers (imported into main.py) ───────────────────────────────

def register_handler(body: RegisterRequest) -> TokenResponse:
    if _get_user_by_username(body.username):
        raise HTTPException(status_code=400, detail="Username already taken")
    uid = _create_user(
        username=body.username,
        hashed_pw=hash_password(body.password),
        display_name=body.display_name or body.username,
    )
    token = create_token(uid)
    return TokenResponse(
        access_token=token,
        user_id=uid,
        username=body.username,
        display_name=body.display_name or body.username,
    )


def login_handler(body: LoginRequest) -> TokenResponse:
    row = _get_user_by_username(body.username)
    if not row or not row["hashed_pw"] or not verify_password(body.password, row["hashed_pw"]):
        raise HTTPException(status_code=401, detail="Incorrect username or password")
    token = create_token(row["user_id"])
    return TokenResponse(
        access_token=token,
        user_id=row["user_id"],
        username=row["username"],
        display_name=row["display_name"] or row["username"],
        avatar_url=row["avatar_url"],
    )


def google_login_url_handler() -> dict:
    """Return the Google OAuth consent URL for the frontend to redirect to."""
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=501, detail="Google OAuth not configured — set GOOGLE_CLIENT_ID env var")
    params = urlencode({
        "client_id":     GOOGLE_CLIENT_ID,
        "redirect_uri":  GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope":         "openid email profile",
        "access_type":   "offline",
        "prompt":        "consent",
    })
    return {"url": f"https://accounts.google.com/o/oauth2/v2/auth?{params}"}


async def google_callback_handler(code: str) -> RedirectResponse:
    """
    Exchange Google auth code → JWT, then redirect the BROWSER back to the
    React app with the token embedded as URL query params.

    The browser lands here from Google's redirect, so we cannot return JSON —
    the browser would just display it. Instead we issue a 302 to FRONTEND_URL
    so React picks up the token on mount.
    """
    if not GOOGLE_CLIENT_ID:
        # Redirect to frontend with an error param so it can show a message
        return RedirectResponse(f"{FRONTEND_URL}/?auth_error=google_not_configured")

    async with httpx.AsyncClient() as client:
        # 1. Exchange code for Google access token
        token_res = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "code":          code,
                "client_id":     GOOGLE_CLIENT_ID,
                "client_secret": GOOGLE_CLIENT_SECRET,
                "redirect_uri":  GOOGLE_REDIRECT_URI,
                "grant_type":    "authorization_code",
            },
        )
        if token_res.status_code != 200:
            return RedirectResponse(f"{FRONTEND_URL}/?auth_error=google_token_failed")

        tokens = token_res.json()

        # 2. Fetch user profile from Google
        info_res = await client.get(
            "https://www.googleapis.com/oauth2/v2/userinfo",
            headers={"Authorization": f"Bearer {tokens['access_token']}"},
        )
        if info_res.status_code != 200:
            return RedirectResponse(f"{FRONTEND_URL}/?auth_error=google_userinfo_failed")

        info = info_res.json()

    google_id    = info["id"]
    email        = info.get("email", "")
    display_name = info.get("name", email)
    avatar_url   = info.get("picture", "")

    # 3. Find existing user or create new one
    row = _get_user_by_google_id(google_id) or _get_user_by_email(email)
    if row:
        user_id = row["user_id"]
        conn = _user_conn()
        conn.execute(
            "UPDATE users SET google_id=?, display_name=?, avatar_url=? WHERE user_id=?",
            (google_id, display_name, avatar_url, user_id),
        )
        conn.commit()
        conn.close()
    else:
        user_id = _create_user(
            email=email,
            google_id=google_id,
            display_name=display_name,
            avatar_url=avatar_url,
        )

    # 4. Issue our own JWT and redirect browser back to React with token in URL
    token = create_token(user_id)
    qs = urlencode({
        "token":        token,
        "user_id":      user_id,
        "username":     email,
        "display_name": display_name,
        "avatar_url":   avatar_url or "",
    })
    return RedirectResponse(f"{FRONTEND_URL}/?{qs}")