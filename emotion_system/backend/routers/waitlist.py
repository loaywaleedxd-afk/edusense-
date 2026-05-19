"""Course waitlist router."""
from fastapi import APIRouter, Depends
import aiosqlite, os
from auth_utils import require_auth, require_role

router = APIRouter()
DB = os.getenv("DB_PATH", "emotion_system.db")


@router.get("/{course_id}")
async def get_waitlist(course_id: str, payload: dict = Depends(require_role("doctor","admin"))):
    async with aiosqlite.connect(DB) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            "SELECT * FROM course_waitlist WHERE course_id=? ORDER BY joined_at",
            (course_id,)
        ) as cur:
            rows = await cur.fetchall()
    return [dict(r) for r in rows]


@router.post("/{course_id}/{student_id}")
async def join_waitlist(course_id: str, student_id: str, payload: dict = Depends(require_auth)):
    async with aiosqlite.connect(DB) as db:
        await db.execute(
            "INSERT OR IGNORE INTO course_waitlist (course_id, student_id) VALUES (?,?)",
            (course_id, student_id)
        )
        await db.commit()
    return {"ok": True}


@router.delete("/{course_id}/{student_id}")
async def leave_waitlist(course_id: str, student_id: str, payload: dict = Depends(require_auth)):
    async with aiosqlite.connect(DB) as db:
        await db.execute(
            "DELETE FROM course_waitlist WHERE course_id=? AND student_id=?",
            (course_id, student_id)
        )
        await db.commit()
    return {"ok": True}
