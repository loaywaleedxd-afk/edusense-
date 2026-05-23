"""Authentication router — bcrypt passwords + real JWT tokens."""
from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel
import aiosqlite, os, time
from collections import defaultdict

from auth_utils import (
    verify_password, hash_password,
    create_token, require_auth,
)

router = APIRouter()
DB = os.getenv("DB_PATH", "emotion_system.db")

# Simple in-memory rate limiter: max 10 attempts per IP per 5 minutes
_login_attempts: dict = defaultdict(list)
_MAX_ATTEMPTS = 10
_WINDOW_SEC   = 300

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
async def login(req: LoginRequest, request: Request):
    _check_rate_limit(request.client.host if request.client else "unknown")
    uname = req.username.strip().lower()
    pwd   = req.password.strip()

    async with aiosqlite.connect(DB) as db:
        db.row_factory = aiosqlite.Row

        # 1. Match by username or email
        async with db.execute(
            "SELECT * FROM users WHERE LOWER(username)=? OR LOWER(email)=?",
            (uname, uname),
        ) as cur:
            user = await cur.fetchone()

        # 2. Fallback: students may log in with their student_id
        if not user:
            async with db.execute(
                """SELECT u.* FROM users u
                   JOIN students s ON s.user_id = u.id
                   WHERE LOWER(s.student_id) = ?""",
                (uname.upper(),),
            ) as cur:
                user = await cur.fetchone()

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
                "UPDATE users SET password=? WHERE id=?",
                (new_hash, user["id"]),
            )
            await db.commit()

        # ── Issue real JWT ─────────────────────────────────────────────────────
        token = create_token({
            "sub":  str(user["id"]),
            "role": user.get("role", "student"),
            "name": user.get("full_name", ""),
        })

        return {
            "token": token,
            "user": {
                "id":       user["id"],
                "username": user.get("username") or uname,
                "name":     user.get("full_name") or uname,
                "email":    user.get("email", ""),
                "role":     user.get("role", "student"),
            },
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


@router.post("/change-password")
async def change_password(data: dict, payload: dict = Depends(require_auth)):
    """Allow authenticated users to change their own password."""
    user_id  = int(payload["sub"])
    old_pwd  = (data.get("old_password") or "").strip()
    new_pwd  = (data.get("new_password") or "").strip()

    if len(new_pwd) < 8:
        raise HTTPException(status_code=400, detail="New password must be at least 8 characters")

    async with aiosqlite.connect(DB) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("SELECT password FROM users WHERE id=?", (user_id,)) as cur:
            row = await cur.fetchone()
        if not row or not verify_password(old_pwd, row["password"]):
            raise HTTPException(status_code=401, detail="Current password is incorrect")

        await db.execute(
            "UPDATE users SET password=? WHERE id=?",
            (hash_password(new_pwd), user_id),
        )
        await db.commit()

    return {"message": "Password changed successfully"}
