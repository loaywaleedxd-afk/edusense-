"""User management router — admin only, protected by JWT auth."""
from fastapi import APIRouter, HTTPException, Depends
import aiosqlite, os

from auth_utils import require_role, hash_password

router = APIRouter()
DB = os.getenv("DB_PATH", "emotion_system.db")


@router.get("/")
async def list_users(
    role: str = None,
    payload: dict = Depends(require_role("admin")),
):
    """List all users — admin only. Passwords are never returned."""
    async with aiosqlite.connect(DB) as db:
        db.row_factory = aiosqlite.Row
        if role:
            async with db.execute(
                "SELECT id, username, full_name as name, email, role FROM users WHERE role=? ORDER BY full_name",
                (role,),
            ) as cur:
                rows = await cur.fetchall()
        else:
            async with db.execute(
                "SELECT id, username, full_name as name, email, role FROM users ORDER BY role, full_name"
            ) as cur:
                rows = await cur.fetchall()
    return [dict(r) for r in rows]


@router.post("/")
async def create_user(
    data: dict,
    payload: dict = Depends(require_role("admin")),
):
    """Create any user — admin only. Password is bcrypt-hashed on creation."""
    plain_pwd = (data.get("password") or data.get("username", "")).strip()
    if len(plain_pwd) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    async with aiosqlite.connect(DB) as db:
        try:
            await db.execute(
                "INSERT INTO users (username, full_name, email, role, password) VALUES (?, ?, ?, ?, ?)",
                (
                    data.get("username", "").strip(),
                    data.get("name", data.get("full_name", "")).strip(),
                    data.get("email", "").strip(),
                    data.get("role", "student"),
                    hash_password(plain_pwd),
                ),
            )
            await db.commit()
        except Exception as e:
            raise HTTPException(status_code=400, detail=str(e))
    return {"message": "User created"}
