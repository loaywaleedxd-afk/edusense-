"""User management router (admin use)"""
from fastapi import APIRouter, HTTPException
import aiosqlite, os

router = APIRouter()
DB = os.getenv("DB_PATH", "emotion_system.db")

@router.get("/")
async def list_users(role: str = None):
    async with aiosqlite.connect(DB) as db:
        db.row_factory = aiosqlite.Row
        if role:
            async with db.execute(
                "SELECT id, username, full_name as name, email, role FROM users WHERE role=? ORDER BY full_name",
                (role,)
            ) as cur:
                rows = await cur.fetchall()
        else:
            async with db.execute(
                "SELECT id, username, full_name as name, email, role FROM users ORDER BY role, full_name"
            ) as cur:
                rows = await cur.fetchall()
    return [dict(r) for r in rows]

@router.post("/")
async def create_user(data: dict):
    async with aiosqlite.connect(DB) as db:
        try:
            await db.execute(
                """INSERT INTO users (username, full_name, email, role, password)
                   VALUES (?, ?, ?, ?, ?)""",
                (
                    data.get("username", "").strip(),
                    data.get("name", data.get("full_name", "")).strip(),
                    data.get("email", "").strip(),
                    data.get("role", "student"),
                    data.get("password", data.get("username", "")).strip(),
                )
            )
            await db.commit()
        except Exception as e:
            raise HTTPException(status_code=400, detail=str(e))
    return {"message": "User created"}
