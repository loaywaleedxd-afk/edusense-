"""
auth_utils.py — password hashing (bcrypt) + JWT token creation/verification.
Import this everywhere instead of comparing passwords as plain strings.
"""
import os
from datetime import datetime, timedelta, timezone
from typing import Optional

from jose import JWTError, jwt
import bcrypt as _bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

# ── Config ────────────────────────────────────────────────────────────────────
# Override SECRET_KEY via environment variable in production.
SECRET_KEY = os.getenv("JWT_SECRET", "edusense-change-me-in-production-use-a-long-random-string")
ALGORITHM  = "HS256"
TOKEN_EXPIRE_HOURS = 12

# ── Bcrypt helpers ─────────────────────────────────────────────────────────────
def hash_password(plain: str) -> str:
    """Return a bcrypt hash of *plain*."""
    return _bcrypt.hashpw(plain.encode(), _bcrypt.gensalt(rounds=12)).decode()

def verify_password(plain: str, hashed: str) -> bool:
    """Return True if *plain* matches *hashed*.
    Falls back to plain-text comparison for legacy accounts (they get
    upgraded to bcrypt on next successful login).
    """
    if hashed.startswith("$2b$") or hashed.startswith("$2a$"):
        return _bcrypt.checkpw(plain.encode(), hashed.encode())
    return plain == hashed   # legacy plain-text — login route upgrades it

# ── JWT ────────────────────────────────────────────────────────────────────────
def create_token(data: dict, expires_hours: int = TOKEN_EXPIRE_HOURS) -> str:
    payload = data.copy()
    payload["exp"] = datetime.now(timezone.utc) + timedelta(hours=expires_hours)
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def decode_token(token: str) -> Optional[dict]:
    """Return decoded payload or None on any error."""
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        return None

# ── FastAPI dependency — validates Bearer token on protected routes ─────────────
bearer_scheme = HTTPBearer(auto_error=False)

def _credentials_exception(detail: str = "Not authenticated"):
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=detail,
        headers={"WWW-Authenticate": "Bearer"},
    )

def require_auth(credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme)):
    """Dependency: raises 401 if token missing or invalid."""
    if not credentials:
        raise _credentials_exception("Missing Bearer token")
    payload = decode_token(credentials.credentials)
    if payload is None:
        raise _credentials_exception("Invalid or expired token")
    return payload   # caller can read payload["sub"], payload["role"], etc.

def require_role(*roles: str):
    """Dependency factory: raises 403 if user role not in *roles*."""
    def _dep(payload: dict = Depends(require_auth)):
        if payload.get("role") not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Requires role: {' or '.join(roles)}",
            )
        return payload
    return _dep


def require_superadmin(credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme)):
    """
    Dependency: raises 401/403 unless the token carries role='superadmin'.
    Deliberately returns a generic 403 — does not reveal the role name.
    """
    if not credentials:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    payload = decode_token(credentials.credentials)
    if payload is None or payload.get("role") != "superadmin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    return payload
