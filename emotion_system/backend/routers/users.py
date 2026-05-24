"""User management router — admin only, protected by JWT auth."""
from fastapi import APIRouter, HTTPException, Depends

from database import get_db
from auth_utils import require_role, require_auth, hash_password

router = APIRouter()


@router.get("/")
async def list_users(
    role: str = None,
    payload: dict = Depends(require_role("admin")),
    db=Depends(get_db),
):
    """List all users — admin only. Passwords are never returned."""
    if role:
        rows = await db.fetch(
            "SELECT id, username, full_name as name, email, role FROM users WHERE role=$1 ORDER BY full_name",
            role,
        )
    else:
        rows = await db.fetch(
            "SELECT id, username, full_name as name, email, role FROM users ORDER BY role, full_name"
        )
    return [dict(r) for r in rows]


@router.post("/")
async def create_user(
    data: dict,
    payload: dict = Depends(require_role("admin")),
    db=Depends(get_db),
):
    """Create any user — admin only. Password is bcrypt-hashed on creation."""
    plain_pwd = (data.get("password") or data.get("username", "")).strip()
    if len(plain_pwd) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    try:
        await db.execute(
            "INSERT INTO users (username, full_name, email, role, password) VALUES ($1, $2, $3, $4, $5)",
            data.get("username", "").strip(),
            data.get("name", data.get("full_name", "")).strip(),
            data.get("email", "").strip(),
            data.get("role", "student"),
            hash_password(plain_pwd),
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {"message": "User created"}


# ── User preferences (any authenticated user) ─────────────────────────────────

@router.get("/preferences")
async def get_preferences(
    payload: dict = Depends(require_auth),
    db=Depends(get_db),
):
    """Return the calling user's preferences (language, etc.)."""
    uid = int(payload.get("sub"))
    row = await db.fetchrow("SELECT language FROM users WHERE id=$1", uid)
    return {"language": (row["language"] if row else None) or "en"}


@router.put("/preferences")
async def update_preferences(
    data: dict,
    payload: dict = Depends(require_auth),
    db=Depends(get_db),
):
    """Update the calling user's preferences (language, etc.)."""
    uid = int(payload.get("sub"))
    if "language" in data:
        lang = data["language"]
        if lang not in ("en", "ar"):
            raise HTTPException(status_code=400, detail="Unsupported language")
        await db.execute("UPDATE users SET language=$1 WHERE id=$2", lang, uid)
    return {"ok": True}
