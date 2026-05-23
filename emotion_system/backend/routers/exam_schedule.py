"""Exam schedule router."""
from fastapi import APIRouter, Depends
from database import get_db
from auth_utils import require_auth, require_role

router = APIRouter()


@router.get("/")
async def get_exams(payload: dict = Depends(require_auth), db=Depends(get_db)):
    role = payload.get("role")
    uid  = payload.get("sub")
    if role == "student":
        rows = await db.fetch(
            """SELECT e.* FROM exam_schedule e
               JOIN course_enrollments ce ON ce.course_id = e.course_id
               JOIN students s ON s.student_id = ce.student_id
               WHERE s.user_id = $1 ORDER BY e.date""",
            int(uid)
        )
    elif role == "doctor":
        rows = await db.fetch(
            """SELECT e.* FROM exam_schedule e
               JOIN lectures l ON l.course_code = e.course_id
               JOIN doctors d ON d.doctor_id = l.doctor_id
               WHERE d.user_id = $1 ORDER BY e.date""",
            int(uid)
        )
    else:
        rows = await db.fetch("SELECT * FROM exam_schedule ORDER BY date")
    return [dict(r) for r in rows]


@router.post("/")
async def add_exam(data: dict, payload: dict = Depends(require_role("doctor", "admin")), db=Depends(get_db)):
    await db.execute(
        """INSERT INTO exam_schedule
           (id, course_id, course_name, type, date, time, room, duration, notes, created_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
           ON CONFLICT (id) DO UPDATE SET
             course_id=EXCLUDED.course_id, course_name=EXCLUDED.course_name,
             type=EXCLUDED.type, date=EXCLUDED.date, time=EXCLUDED.time,
             room=EXCLUDED.room, duration=EXCLUDED.duration, notes=EXCLUDED.notes,
             created_at=EXCLUDED.created_at""",
        data["id"], data.get("courseId",""), data.get("courseName",""),
        data.get("type","midterm"), data.get("date",""), data.get("time",""),
        data.get("room",""), int(data.get("duration",120)),
        data.get("notes",""), data.get("createdAt","")
    )
    return {"ok": True}


@router.delete("/{exam_id}")
async def delete_exam(exam_id: str, payload: dict = Depends(require_role("doctor", "admin")), db=Depends(get_db)):
    await db.execute("DELETE FROM exam_schedule WHERE id=$1", exam_id)
    return {"ok": True}
