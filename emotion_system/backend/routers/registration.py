"""Registration status router."""
from fastapi import APIRouter, Depends
import aiosqlite, os
from auth_utils import require_auth, require_role

router = APIRouter()
DB = os.getenv("DB_PATH", "emotion_system.db")


@router.get("/")
async def get_registration(payload: dict = Depends(require_auth)):
    async with aiosqlite.connect(DB) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("SELECT * FROM registration_status WHERE id=1") as cur:
            row = await cur.fetchone()
    if row:
        r = dict(row)
        return {"open": bool(r["is_open"]), "semester": r["semester"], "deadline": r["deadline"]}
    return {"open": True, "semester": "Fall 2024", "deadline": "2024-12-15"}


@router.put("/")
async def set_registration(data: dict, payload: dict = Depends(require_role("admin"))):
    async with aiosqlite.connect(DB) as db:
        await db.execute(
            """INSERT INTO registration_status (id, is_open, semester, deadline)
               VALUES (1,?,?,?)
               ON CONFLICT(id) DO UPDATE SET is_open=excluded.is_open,
               semester=excluded.semester, deadline=excluded.deadline""",
            (1 if data.get("open") else 0,
             data.get("semester","Fall 2024"), data.get("deadline","2024-12-15"))
        )
        await db.commit()
    return {"ok": True}
