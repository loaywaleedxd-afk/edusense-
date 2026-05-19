"""Exam schedule router."""
from fastapi import APIRouter, Depends
import aiosqlite, os
from auth_utils import require_auth, require_role

router = APIRouter()
DB = os.getenv("DB_PATH", "emotion_system.db")


@router.get("/")
async def get_exams(payload: dict = Depends(require_auth)):
    async with aiosqlite.connect(DB) as db:
        db.row_factory = aiosqlite.Row
        role = payload.get("role")
        uid  = payload.get("sub")
        if role == "student":
            async with db.execute(
                """SELECT e.* FROM exam_schedule e
                   JOIN course_enrollments ce ON ce.course_id = e.course_id
                   JOIN students s ON s.student_id = ce.student_id
                   WHERE s.user_id = ? ORDER BY e.date""",
                (int(uid),)
            ) as cur:
                rows = await cur.fetchall()
        elif role == "doctor":
            async with db.execute(
                """SELECT e.* FROM exam_schedule e
                   JOIN lectures l ON l.course_code = e.course_id
                   JOIN doctors d ON d.doctor_id = l.doctor_id
                   WHERE d.user_id = ? ORDER BY e.date""",
                (int(uid),)
            ) as cur:
                rows = await cur.fetchall()
        else:
            async with db.execute("SELECT * FROM exam_schedule ORDER BY date") as cur:
                rows = await cur.fetchall()
    return [dict(r) for r in rows]


@router.post("/")
async def add_exam(data: dict, payload: dict = Depends(require_role("doctor", "admin"))):
    async with aiosqlite.connect(DB) as db:
        await db.execute(
            """INSERT OR REPLACE INTO exam_schedule
               (id, course_id, course_name, type, date, time, room, duration, notes, created_at)
               VALUES (?,?,?,?,?,?,?,?,?,?)""",
            (data["id"], data.get("courseId",""), data.get("courseName",""),
             data.get("type","midterm"), data.get("date",""), data.get("time",""),
             data.get("room",""), int(data.get("duration",120)),
             data.get("notes",""), data.get("createdAt",""))
        )
        await db.commit()
    return {"ok": True}


@router.delete("/{exam_id}")
async def delete_exam(exam_id: str, payload: dict = Depends(require_role("doctor", "admin"))):
    async with aiosqlite.connect(DB) as db:
        await db.execute("DELETE FROM exam_schedule WHERE id=?", (exam_id,))
        await db.commit()
    return {"ok": True}
