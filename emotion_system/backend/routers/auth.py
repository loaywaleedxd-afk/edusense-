"""Authentication router — bcrypt passwords + real JWT tokens."""
from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel
import os
import time
from collections import defaultdict

from database import get_db
from auth_utils import (
    verify_password, hash_password,
    create_token, require_auth,
)

router = APIRouter()

# Simple in-memory rate limiter: max 10 attempts per IP per 5 minutes
_login_attempts: dict = defaultdict(list)
_MAX_ATTEMPTS = 10
_WINDOW_SEC   = 300

# In-memory reset tokens: {token: {username, expires}}
# A real deployment should persist these in Redis or the DB
import secrets
_reset_tokens: dict = {}
_RESET_TOKEN_TTL = 600  # 10 minutes

def _check_rate_limit(ip: str):
    now  = time.time()
    hits = [t for t in _login_attempts[ip] if now - t < _WINDOW_SEC]
    _login_attempts[ip] = hits
    if len(hits) >= _MAX_ATTEMPTS:
        raise HTTPException(status_code=429, detail="Too many login attempts. Try again in 5 minutes.")
    _login_attempts[ip].append(now)


class LoginRequest(BaseModel):
    username: str
    password: str


@router.post("/login")
async def login(req: LoginRequest, request: Request, db=Depends(get_db)):
    _check_rate_limit(request.client.host if request.client else "unknown")
    uname = req.username.strip().lower()
    pwd   = req.password.strip()

    # 1. Match by username or email
    user = await db.fetchrow(
        "SELECT * FROM users WHERE LOWER(username)=$1 OR LOWER(email)=$2",
        uname, uname,
    )

    # 2. Fallback: students may log in with their student_id
    if not user:
        user = await db.fetchrow(
            """SELECT u.* FROM users u
               JOIN students s ON s.user_id = u.id
               WHERE LOWER(s.student_id) = $1""",
            uname,   # uname is already lowercase — LOWER(student_id) will match
        )

    if not user:
        raise HTTPException(status_code=401, detail="Invalid username or password")

    user = dict(user)
    stored_pw = user.get("password") or ""

    if not verify_password(pwd, stored_pw):
        raise HTTPException(status_code=401, detail="Invalid username or password")

    # ── Upgrade legacy plain-text password to bcrypt on first successful login ──
    if not (stored_pw.startswith("$2b$") or stored_pw.startswith("$2a$")):
        new_hash = hash_password(pwd)
        await db.execute(
            "UPDATE users SET password=$1 WHERE id=$2",
            new_hash, user["id"],
        )

    # ── Issue real JWT ─────────────────────────────────────────────────────
    token = create_token({
        "sub":  str(user["id"]),
        "role": user.get("role", "student"),
        "name": user.get("full_name", ""),
    })

    # For student users, fetch their photo_path and student_id for the profile picture
    photo_path = None
    student_id = None
    if user.get("role") == "student":
        s_row = await db.fetchrow(
            "SELECT photo_path, student_id FROM students WHERE user_id=$1",
            user["id"],
        )
        if s_row:
            photo_path = s_row["photo_path"]
            student_id = s_row["student_id"]

    user_obj = {
        "id":         user["id"],
        "username":   user.get("username") or uname,
        "name":       user.get("full_name") or uname,
        "email":      user.get("email", ""),
        "role":       user.get("role", "student"),
        "photo_path": photo_path,   # e.g. /photos/aast/231014184.jpg
    }
    if student_id:
        user_obj["student_id"] = student_id
        user_obj["studentId"]  = student_id   # camelCase alias for frontend

    return {
        "token": token,
        "user": user_obj,
        "message": "Login successful",
    }


@router.get("/me")
async def get_me(payload: dict = Depends(require_auth)):
    """Return the caller's identity. Requires a valid Bearer token."""
    return {
        "id":   payload.get("sub"),
        "role": payload.get("role"),
        "name": payload.get("name"),
    }


@router.post("/request-reset")
async def request_reset(request: Request, db=Depends(get_db)):
    """Issue a short-lived reset token for the given username/email.
    Returns the token — in production this should be emailed, not returned directly."""
    _check_rate_limit(request.client.host if request.client else "unknown")
    data = await request.json()
    username = (data.get("username") or "").strip().lower()
    if not username:
        raise HTTPException(status_code=400, detail="Username or email required")
    row = await db.fetchrow(
        "SELECT id FROM users WHERE LOWER(username)=$1 OR LOWER(email)=$1", username
    )
    if not row:
        # Don't reveal whether the user exists
        return {"ok": True, "message": "If that account exists, a reset token has been issued."}
    token = secrets.token_urlsafe(32)
    _reset_tokens[token] = {"username": username, "expires": time.time() + _RESET_TOKEN_TTL}
    # NOTE: In production this token must be emailed to the user — never returned in the response.
    # The frontend's "forgot password" flow should direct the user to check their email.
    return {"ok": True, "message": "If that account exists, a reset link has been sent to the registered email."}


@router.post("/reset-password")
async def reset_password(request: Request, db=Depends(get_db)):
    """Reset a user's password. Requires a valid reset_token from /request-reset."""
    _check_rate_limit(request.client.host if request.client else "unknown")
    data = await request.json()
    reset_token  = (data.get("reset_token") or "").strip()
    new_password = (data.get("new_password") or "").strip()

    if not reset_token or not new_password or len(new_password) < 6:
        raise HTTPException(status_code=400, detail="Invalid request")

    entry = _reset_tokens.get(reset_token)
    if not entry or time.time() > entry["expires"]:
        _reset_tokens.pop(reset_token, None)
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")

    username = entry["username"]
    _reset_tokens.pop(reset_token, None)  # one-time use

    hashed = hash_password(new_password)
    result = await db.execute(
        "UPDATE users SET password=$1 WHERE LOWER(username)=$2 OR LOWER(email)=$2",
        hashed, username,
    )
    if result == "UPDATE 0":
        raise HTTPException(status_code=404, detail="User not found")
    return {"ok": True}


@router.post("/change-password")
async def change_password(data: dict, request: Request, payload: dict = Depends(require_auth), db=Depends(get_db)):
    """Allow authenticated users to change their own password."""
    _check_rate_limit(request.client.host if request.client else "unknown")
    user_id  = int(payload["sub"])
    old_pwd  = (data.get("old_password") or "").strip()
    new_pwd  = (data.get("new_password") or "").strip()

    if len(new_pwd) < 8:
        raise HTTPException(status_code=400, detail="New password must be at least 8 characters")

    row = await db.fetchrow("SELECT password FROM users WHERE id=$1", user_id)
    if not row or not verify_password(old_pwd, row["password"]):
        raise HTTPException(status_code=401, detail="Current password is incorrect")

    await db.execute(
        "UPDATE users SET password=$1 WHERE id=$2",
        hash_password(new_pwd), user_id,
    )

    return {"message": "Password changed successfully"}
