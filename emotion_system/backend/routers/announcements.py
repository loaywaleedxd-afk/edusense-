"""Announcements router."""
from fastapi import APIRouter, Depends
import aiosqlite, os
from auth_utils import require_auth, require_role

router = APIRouter()
DB = os.getenv("DB_PATH", "emotion_system.db")


@router.get("/")
async def get_announcements(payload: dict = Depends(require_auth)):
    async with aiosqlite.connect(DB) as db:
        db.row_factory = aiosqlite.Row
        role = payload.get("role")
        uid  = payload.get("sub")
        if role == "student":
            async with db.execute(
                """SELECT a.* FROM announcements a
                   JOIN course_enrollments ce ON ce.course_id = a.course_id
                   JOIN students s ON s.student_id = ce.student_id
                   WHERE s.user_id = ? ORDER BY a.created_at DESC""",
                (int(uid),)
            ) as cur:
                rows = await cur.fetchall()
        elif role == "doctor":
            async with db.execute(
                """SELECT a.* FROM announcements a
                   JOIN doctors d ON d.doctor_id = a.doctor_id
                   WHERE d.user_id = ? ORDER BY a.created_at DESC""",
                (int(uid),)
            ) as cur:
                rows = await cur.fetchall()
        else:
            async with db.execute("SELECT * FROM announcements ORDER BY created_at DESC") as cur:
                rows = await cur.fetchall()
    return [dict(r) for r in rows]


@router.post("/")
async def add_announcement(data: dict, payload: dict = Depends(require_role("doctor", "admin"))):
    async with aiosqlite.connect(DB) as db:
        await db.execute(
            """INSERT OR REPLACE INTO announcements
               (id, course_id, course_name, doctor_id, doctor_name, title, body, created_at)
               VALUES (?,?,?,?,?,?,?,?)""",
            (data["id"], data.get("courseId",""), data.get("courseName",""),
             data.get("doctorId",""), data.get("doctorName",""),
             data.get("title",""), data.get("body",""), data.get("createdAt",""))
        )
        await db.commit()
    return {"ok": True}


@router.delete("/{ann_id}")
async def delete_announcement(ann_id: str, payload: dict = Depends(require_role("doctor", "admin"))):
    async with aiosqlite.connect(DB) as db:
        await db.execute("DELETE FROM announcements WHERE id=?", (ann_id,))
        await db.commit()
    return {"ok": True}
