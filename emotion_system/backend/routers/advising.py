"""
Academic Advising Router
— Appointment booking (student <-> advisor)
— Advisor notes per student
— Degree audit (completed vs required courses)
— Graduation progress percentage
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
import json
from datetime import datetime

from database import get_db
from auth_utils import require_auth, require_role

router = APIRouter()


# ── Pydantic models ───────────────────────────────────────────────────────────
class AppointmentCreate(BaseModel):
    student_id:     str
    advisor_id:     str
    scheduled_date: str
    scheduled_time: str
    duration_min:   int = 30
    topic:          str = ""
    student_notes:  str = ""
    meeting_link:   str = ""

class AppointmentUpdate(BaseModel):
    status:        Optional[str] = None
    advisor_notes: Optional[str] = None
    meeting_link:  Optional[str] = None

class NoteCreate(BaseModel):
    student_id: str
    advisor_id: str
    note:       str
    is_private: bool = True


# ── Appointments ──────────────────────────────────────────────────────────────

@router.get("/appointments")
async def list_appointments(payload: dict = Depends(require_auth), db=Depends(get_db)):
    role = payload.get("role")
    sub  = payload.get("sub")

    if role == "student":
        s = await db.fetchrow(
            "SELECT student_id FROM students WHERE user_id=$1",
            int(sub)
        )
        if not s:
            return []
        rows = await db.fetch(
            """SELECT a.*,
                      u.full_name as advisor_name
               FROM advisor_appointments a
               LEFT JOIN doctors d ON a.advisor_id = d.doctor_id
               LEFT JOIN users   u ON d.user_id    = u.id
               WHERE a.student_id=$1
               ORDER BY a.scheduled_date DESC, a.scheduled_time DESC""",
            s["student_id"]
        )

    elif role in ("doctor", "admin"):
        d = await db.fetchrow(
            "SELECT doctor_id FROM doctors WHERE user_id=$1",
            int(sub)
        )
        if role == "doctor" and not d:
            return []
        if role == "doctor" and d:
            rows = await db.fetch(
                """SELECT a.*,
                          su.full_name as student_name
                   FROM advisor_appointments a
                   LEFT JOIN students s ON a.student_id = s.student_id
                   LEFT JOIN users   su ON s.user_id    = su.id
                   WHERE a.advisor_id=$1
                   ORDER BY a.scheduled_date DESC, a.scheduled_time DESC""",
                d["doctor_id"]
            )
        else:
            rows = await db.fetch(
                """SELECT a.*,
                          su.full_name as student_name
                   FROM advisor_appointments a
                   LEFT JOIN students s ON a.student_id = s.student_id
                   LEFT JOIN users   su ON s.user_id    = su.id
                   ORDER BY a.scheduled_date DESC, a.scheduled_time DESC"""
            )
    else:
        return []

    return [dict(r) for r in rows]


@router.post("/appointments")
async def book_appointment(body: AppointmentCreate, payload: dict = Depends(require_auth), db=Depends(get_db)):
    row = await db.fetchrow(
        """INSERT INTO advisor_appointments
           (student_id, advisor_id, scheduled_date, scheduled_time,
            duration_min, topic, student_notes, meeting_link)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id""",
        body.student_id, body.advisor_id, body.scheduled_date, body.scheduled_time,
        body.duration_min, body.topic, body.student_notes, body.meeting_link
    )
    return {"id": row["id"], "message": "Appointment requested successfully"}


@router.put("/appointments/{appt_id}")
async def update_appointment(
    appt_id: int,
    body: AppointmentUpdate,
    payload: dict = Depends(require_auth),
    db=Depends(get_db)
):
    fields, vals = [], []
    idx = 1
    if body.status        is not None:
        fields.append(f"status=${idx}");        vals.append(body.status);        idx += 1
    if body.advisor_notes is not None:
        fields.append(f"advisor_notes=${idx}"); vals.append(body.advisor_notes); idx += 1
    if body.meeting_link  is not None:
        fields.append(f"meeting_link=${idx}");  vals.append(body.meeting_link);  idx += 1
    if not fields:
        raise HTTPException(400, "Nothing to update")
    vals.append(appt_id)
    await db.execute(f"UPDATE advisor_appointments SET {','.join(fields)} WHERE id=${idx}", *vals)
    return {"message": "Appointment updated"}


@router.delete("/appointments/{appt_id}")
async def cancel_appointment(appt_id: int, payload: dict = Depends(require_auth), db=Depends(get_db)):
    await db.execute(
        "UPDATE advisor_appointments SET status='cancelled' WHERE id=$1",
        appt_id
    )
    return {"message": "Appointment cancelled"}


# ── Advisor Notes ─────────────────────────────────────────────────────────────

@router.get("/notes/{student_id}")
async def get_notes(student_id: str, payload: dict = Depends(require_auth), db=Depends(get_db)):
    role = payload.get("role")
    if role in ("doctor", "admin"):
        rows = await db.fetch(
            """SELECT n.*, u.full_name as advisor_name
               FROM advisor_student_notes n
               LEFT JOIN doctors d ON n.advisor_id = d.doctor_id
               LEFT JOIN users   u ON d.user_id    = u.id
               WHERE n.student_id=$1 ORDER BY n.created_at DESC""",
            student_id
        )
    else:
        rows = await db.fetch(
            "SELECT * FROM advisor_student_notes WHERE student_id=$1 AND is_private=FALSE ORDER BY created_at DESC",
            student_id
        )
    return [dict(r) for r in rows]


@router.post("/notes")
async def add_note(body: NoteCreate, payload: dict = Depends(require_role("doctor", "admin")), db=Depends(get_db)):
    row = await db.fetchrow(
        "INSERT INTO advisor_student_notes (student_id, advisor_id, note, is_private) VALUES ($1,$2,$3,$4) RETURNING id",
        body.student_id, body.advisor_id, body.note, body.is_private
    )
    return {"id": row["id"], "message": "Note saved"}


@router.delete("/notes/{note_id}")
async def delete_note(note_id: int, payload: dict = Depends(require_role("doctor", "admin")), db=Depends(get_db)):
    await db.execute("DELETE FROM advisor_student_notes WHERE id=$1", note_id)
    return {"message": "Note deleted"}


# ── Degree Audit ──────────────────────────────────────────────────────────────

@router.get("/degree-audit/{student_id}")
async def degree_audit(student_id: str, payload: dict = Depends(require_auth), db=Depends(get_db)):
    # Courses student has passed
    passed_rows = await db.fetch(
        "SELECT course_code, course_name, grade FROM grades WHERE student_id=$1 AND grade >= 60",
        student_id
    )
    passed_codes = {r["course_code"] for r in passed_rows}

    # Student's department
    student = await db.fetchrow(
        "SELECT department FROM students WHERE student_id=$1", student_id
    )
    dept = student["department"] if student else None

    if dept:
        req_rows = await db.fetch(
            "SELECT * FROM degree_requirements WHERE department=$1 OR department IS NULL ORDER BY semester_order, category",
            dept
        )
    else:
        req_rows = await db.fetch(
            "SELECT * FROM degree_requirements ORDER BY semester_order, category"
        )

    requirements = []
    for r in req_rows:
        rd = dict(r)
        rd["completed"] = r["course_code"] in passed_codes
        rd["grade"] = next(
            (row["grade"] for row in passed_rows if row["course_code"] == r["course_code"]),
            None
        )
        requirements.append(rd)

    enrolled_rows = await db.fetch(
        """SELECT l.course_code, l.course_name FROM course_enrollments ce
           JOIN lectures l ON ce.course_id = l.lecture_id
           WHERE ce.student_id=$1""",
        student_id
    )

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
async def graduation_progress(student_id: str, payload: dict = Depends(require_auth), db=Depends(get_db)):
    total = await db.fetchrow(
        "SELECT COUNT(*) as n FROM degree_requirements WHERE is_required=TRUE"
    )
    done = await db.fetchrow(
        """SELECT COUNT(*) as n FROM degree_requirements dr
           JOIN grades g ON g.course_code = dr.course_code
           WHERE g.student_id=$1 AND g.grade >= 60 AND dr.is_required=TRUE""",
        student_id
    )

    t = total["n"] if total else 0
    d = done["n"]  if done  else 0
    return {
        "total":   t,
        "done":    d,
        "percent": round(d / max(1, t) * 100, 1)
    }
