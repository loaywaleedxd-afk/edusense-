"""
Academic Advising Router
— Appointment booking (student ↔ advisor)
— Advisor notes per student
— Degree audit (completed vs required courses)
— Graduation progress percentage
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
import aiosqlite, os, json
from datetime import datetime

from auth_utils import require_auth, require_role

router = APIRouter()
DB = os.getenv("DB_PATH", "emotion_system.db")


# ── Pydantic models ───────────────────────────────────────────────────────────
class AppointmentCreate(BaseModel):
    student_id:     str
    advisor_id:     str
    scheduled_date: str      # YYYY-MM-DD
    scheduled_time: str      # HH:MM
    duration_min:   int = 30
    topic:          str = ""
    student_notes:  str = ""
    meeting_link:   str = ""

class AppointmentUpdate(BaseModel):
    status:       Optional[str] = None   # confirmed | completed | cancelled
    advisor_notes: Optional[str] = None
    meeting_link:  Optional[str] = None

class NoteCreate(BaseModel):
    student_id: str
    advisor_id: str
    note:       str
    is_private: bool = True   # True = advisor only; False = student can see


# ── Appointments ──────────────────────────────────────────────────────────────

@router.get("/appointments")
async def list_appointments(payload: dict = Depends(require_auth)):
    role = payload.get("role")
    sub  = payload.get("sub")

    async with aiosqlite.connect(DB) as db:
        db.row_factory = aiosqlite.Row

        if role == "student":
            # Find student_id for this user
            s = await (await db.execute(
                "SELECT student_id FROM students WHERE user_id=(SELECT id FROM users WHERE username=?)",
                (sub,)
            )).fetchone()
            if not s:
                return []
            rows = await (await db.execute(
                """SELECT a.*,
                          u.full_name as advisor_name
                   FROM advisor_appointments a
                   LEFT JOIN doctors d ON a.advisor_id = d.doctor_id
                   LEFT JOIN users   u ON d.user_id    = u.id
                   WHERE a.student_id=?
                   ORDER BY a.scheduled_date DESC, a.scheduled_time DESC""",
                (s["student_id"],)
            )).fetchall()

        elif role in ("doctor", "admin"):
            d = await (await db.execute(
                "SELECT doctor_id FROM doctors WHERE user_id=(SELECT id FROM users WHERE username=?)",
                (sub,)
            )).fetchone()
            if role == "doctor" and not d:
                return []
            advisor_filter = f"WHERE a.advisor_id='{d['doctor_id']}'" if (role == "doctor" and d) else ""
            rows = await (await db.execute(
                f"""SELECT a.*,
                           su.full_name as student_name
                    FROM advisor_appointments a
                    LEFT JOIN students s ON a.student_id = s.student_id
                    LEFT JOIN users   su ON s.user_id    = su.id
                    {advisor_filter}
                    ORDER BY a.scheduled_date DESC, a.scheduled_time DESC"""
            )).fetchall()
        else:
            return []

    return [dict(r) for r in rows]


@router.post("/appointments")
async def book_appointment(body: AppointmentCreate, payload: dict = Depends(require_auth)):
    async with aiosqlite.connect(DB) as db:
        cur = await db.execute(
            """INSERT INTO advisor_appointments
               (student_id, advisor_id, scheduled_date, scheduled_time,
                duration_min, topic, student_notes, meeting_link)
               VALUES (?,?,?,?,?,?,?,?)""",
            (body.student_id, body.advisor_id, body.scheduled_date, body.scheduled_time,
             body.duration_min, body.topic, body.student_notes, body.meeting_link)
        )
        await db.commit()
    return {"id": cur.lastrowid, "message": "Appointment requested successfully"}


@router.put("/appointments/{appt_id}")
async def update_appointment(
    appt_id: int,
    body: AppointmentUpdate,
    payload: dict = Depends(require_auth)
):
    fields, vals = [], []
    if body.status       is not None: fields.append("status=?");        vals.append(body.status)
    if body.advisor_notes is not None: fields.append("advisor_notes=?"); vals.append(body.advisor_notes)
    if body.meeting_link  is not None: fields.append("meeting_link=?");  vals.append(body.meeting_link)
    if not fields:
        raise HTTPException(400, "Nothing to update")
    vals.append(appt_id)
    async with aiosqlite.connect(DB) as db:
        await db.execute(f"UPDATE advisor_appointments SET {','.join(fields)} WHERE id=?", vals)
        await db.commit()
    return {"message": "Appointment updated"}


@router.delete("/appointments/{appt_id}")
async def cancel_appointment(appt_id: int, payload: dict = Depends(require_auth)):
    async with aiosqlite.connect(DB) as db:
        await db.execute(
            "UPDATE advisor_appointments SET status='cancelled' WHERE id=?",
            (appt_id,)
        )
        await db.commit()
    return {"message": "Appointment cancelled"}


# ── Advisor Notes ─────────────────────────────────────────────────────────────

@router.get("/notes/{student_id}")
async def get_notes(student_id: str, payload: dict = Depends(require_auth)):
    role = payload.get("role")
    async with aiosqlite.connect(DB) as db:
        db.row_factory = aiosqlite.Row
        if role in ("doctor", "admin"):
            rows = await (await db.execute(
                """SELECT n.*, u.full_name as advisor_name
                   FROM advisor_student_notes n
                   LEFT JOIN doctors d ON n.advisor_id = d.doctor_id
                   LEFT JOIN users   u ON d.user_id    = u.id
                   WHERE n.student_id=? ORDER BY n.created_at DESC""",
                (student_id,)
            )).fetchall()
        else:
            # Students only see non-private notes
            rows = await (await db.execute(
                "SELECT * FROM advisor_student_notes WHERE student_id=? AND is_private=0 ORDER BY created_at DESC",
                (student_id,)
            )).fetchall()
    return [dict(r) for r in rows]


@router.post("/notes")
async def add_note(body: NoteCreate, payload: dict = Depends(require_role("doctor", "admin"))):
    async with aiosqlite.connect(DB) as db:
        cur = await db.execute(
            "INSERT INTO advisor_student_notes (student_id, advisor_id, note, is_private) VALUES (?,?,?,?)",
            (body.student_id, body.advisor_id, body.note, int(body.is_private))
        )
        await db.commit()
    return {"id": cur.lastrowid, "message": "Note saved"}


@router.delete("/notes/{note_id}")
async def delete_note(note_id: int, payload: dict = Depends(require_role("doctor", "admin"))):
    async with aiosqlite.connect(DB) as db:
        await db.execute("DELETE FROM advisor_student_notes WHERE id=?", (note_id,))
        await db.commit()
    return {"message": "Note deleted"}


# ── Degree Audit ──────────────────────────────────────────────────────────────

@router.get("/degree-audit/{student_id}")
async def degree_audit(student_id: str, payload: dict = Depends(require_auth)):
    """
    Compare courses the student has completed (grade ≥ 60) against required degree courses.
    Returns per-category breakdown and overall completion %.
    """
    async with aiosqlite.connect(DB) as db:
        db.row_factory = aiosqlite.Row

        # Courses student has passed
        passed_rows = await (await db.execute(
            "SELECT course_code, course_name, grade FROM grades WHERE student_id=? AND grade >= 60",
            (student_id,)
        )).fetchall()
        passed_codes = {r["course_code"] for r in passed_rows}

        # Student's program / department
        student = await (await db.execute(
            "SELECT department FROM students WHERE student_id=?", (student_id,)
        )).fetchone()
        dept = student["department"] if student else None

        # Required courses (filter by department/program if available)
        if dept:
            req_rows = await (await db.execute(
                "SELECT * FROM degree_requirements WHERE department=? OR department IS NULL ORDER BY semester_order, category",
                (dept,)
            )).fetchall()
        else:
            req_rows = await (await db.execute(
                "SELECT * FROM degree_requirements ORDER BY semester_order, category"
            )).fetchall()

        # Build audit
        requirements = []
        for r in req_rows:
            rd = dict(r)
            rd["completed"] = r["course_code"] in passed_codes
            rd["grade"] = next(
                (row["grade"] for row in passed_rows if row["course_code"] == r["course_code"]),
                None
            )
            requirements.append(rd)

        # Also count enrolled courses not in requirements
        enrolled_rows = await (await db.execute(
            """SELECT l.course_code, l.course_name FROM course_enrollments ce
               JOIN lectures l ON ce.course_id = l.lecture_id
               WHERE ce.student_id=?""",
            (student_id,)
        )).fetchall()

    total_req  = len([r for r in requirements if r["is_required"]])
    completed  = len([r for r in requirements if r["completed"] and r["is_required"]])
    electives  = len([r for r in requirements if not r["is_required"] and r["completed"]])
    pct        = round(completed / max(1, total_req) * 100, 1)

    categories = {}
    for r in requirements:
        cat = r["category"]
        if cat not in categories:
            categories[cat] = {"total": 0, "completed": 0, "courses": []}
        categories[cat]["total"] += 1
        if r["completed"]:
            categories[cat]["completed"] += 1
        categories[cat]["courses"].append(r)

    return {
        "student_id":         student_id,
        "total_required":     total_req,
        "completed_required": completed,
        "electives_done":     electives,
        "graduation_pct":     pct,
        "categories":         categories,
        "currently_enrolled": [dict(r) for r in enrolled_rows],
    }


@router.get("/graduation-progress/{student_id}")
async def graduation_progress(student_id: str, payload: dict = Depends(require_auth)):
    """Quick graduation percentage — lighter than full audit."""
    async with aiosqlite.connect(DB) as db:
        total = await (await db.execute(
            "SELECT COUNT(*) as n FROM degree_requirements WHERE is_required=1"
        )).fetchone()
        done = await (await db.execute(
            """SELECT COUNT(*) as n FROM degree_requirements dr
               JOIN grades g ON g.course_code = dr.course_code
               WHERE g.student_id=? AND g.grade >= 60 AND dr.is_required=1""",
            (student_id,)
        )).fetchone()

    t = total["n"] if total else 0
    d = done["n"]  if done  else 0
    return {
        "total":   t,
        "done":    d,
        "percent": round(d / max(1, t) * 100, 1)
    }
