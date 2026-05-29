"""Grades router — protected by JWT auth."""
from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from database import get_db
from auth_utils import require_auth, require_role
from notifier import manager

router = APIRouter()

def _current_semester() -> str:
    """Auto-detect current semester: S1 = Sep–Jan, S2 = Feb–Aug."""
    month = datetime.utcnow().month
    year  = datetime.utcnow().year
    return f"{year}-S1" if month >= 9 else f"{year}-S2"


class GradeEntry(BaseModel):
    student_id: str
    course_code: str
    course_name: str
    grade: float
    doctor_id: Optional[str] = None
    semester: Optional[str] = None   # e.g. "2025-S1" — defaults to current semester


@router.get("/student/{student_id}")
async def get_student_grades(
    student_id: str,
    semester: Optional[str] = None,
    payload: dict = Depends(require_auth),
    db=Depends(get_db),
):
    """Students can only read their own grades; doctors/admins can read any.
       Optional ?semester=2025-S1 to filter by semester.
    """
    caller_role = payload.get("role")
    caller_id   = payload.get("sub")

    if caller_role == "student":
        row = await db.fetchrow(
            "SELECT student_id FROM students WHERE user_id=$1", int(caller_id)
        )
        if not row or row["student_id"].upper() != student_id.upper():
            raise HTTPException(status_code=403, detail="Access denied")

    if semester:
        rows = await db.fetch(
            "SELECT * FROM grades WHERE student_id=$1 AND semester=$2 ORDER BY created_at DESC",
            student_id, semester,
        )
    else:
        rows = await db.fetch(
            "SELECT * FROM grades WHERE student_id=$1 ORDER BY semester DESC, created_at DESC",
            student_id,
        )
    return [dict(r) for r in rows]


@router.get("/course/{course_code}")
async def get_course_grades(
    course_code: str,
    payload: dict = Depends(require_role("doctor", "admin")),
    db=Depends(get_db),
):
    """Only doctors and admins can view full course grade lists."""
    rows = await db.fetch(
        """SELECT g.*, u.full_name FROM grades g
           LEFT JOIN students s ON g.student_id = s.student_id
           LEFT JOIN users u ON s.user_id = u.id
           WHERE g.course_code=$1 ORDER BY g.grade DESC""",
        course_code,
    )
    return [dict(r) for r in rows]


@router.post("/")
async def save_grade(
    entry: GradeEntry,
    request: Request,
    payload: dict = Depends(require_role("doctor", "admin")),
    db=Depends(get_db),
):
    """Only doctors and admins can post/update grades.
    Doctors may only grade students enrolled in their own courses."""
    if not (0 <= entry.grade <= 100):
        raise HTTPException(status_code=400, detail="Grade must be between 0 and 100")
    # Resolve doctor_id from JWT if not supplied in body
    doctor_id = entry.doctor_id
    if payload.get("role") == "doctor":
        row = await db.fetchrow(
            "SELECT doctor_id FROM doctors WHERE user_id=$1", int(payload["sub"])
        )
        if row:
            doctor_id = row["doctor_id"]
        # Verify this doctor teaches the given course
        teaches = await db.fetchrow(
            "SELECT 1 FROM lectures WHERE doctor_id=$1 AND course_code=$2",
            doctor_id, entry.course_code,
        )
        if not teaches:
            raise HTTPException(status_code=403, detail="You are not the instructor for this course")

    semester = entry.semester or _current_semester()

    await db.execute(
        """INSERT INTO grades (student_id, course_code, course_name, grade, doctor_id, semester)
           VALUES ($1,$2,$3,$4,$5,$6)
           ON CONFLICT(student_id, course_code, semester) DO UPDATE SET grade=EXCLUDED.grade""",
        entry.student_id, entry.course_code, entry.course_name, entry.grade, doctor_id, semester,
    )
    # Notify the student in real-time
    try:
        stu_row = await db.fetchrow(
            "SELECT user_id FROM students WHERE student_id=$1", entry.student_id
        )
        if stu_row and stu_row["user_id"]:
            await manager.notify_user(str(stu_row["user_id"]), {
                "type": "grade_update",
                "title": "Grade Posted",
                "message": f"Your grade for {entry.course_name}: {entry.grade:.1f}",
                "course": entry.course_code,
                "grade": entry.grade,
                "icon": "📝",
                "color": "#10b981",
            })
    except Exception:
        pass  # WS failure must not break the grade endpoint
    return {"message": "Grade saved"}


# ── Semester GPA endpoints ────────────────────────────────────────────────────

@router.get("/semesters")
async def list_semesters(
    payload: dict = Depends(require_role("doctor", "admin")),
    db=Depends(get_db),
):
    """Return all distinct semesters that have grades recorded."""
    rows = await db.fetch(
        "SELECT DISTINCT semester FROM grades ORDER BY semester DESC"
    )
    return [r["semester"] for r in rows]


@router.post("/calculate-semester-gpa")
async def calculate_semester_gpa(
    data: dict,
    payload: dict = Depends(require_role("doctor", "admin")),
    db=Depends(get_db),
):
    """Calculate GPA for all students in a semester and save to semester_gpa table.
       Body: { "semester": "2025-S1" }  — defaults to current semester.
    """
    semester = data.get("semester") or _current_semester()

    # Get all students who have grades in this semester
    rows = await db.fetch(
        """SELECT student_id, ROUND(AVG(grade)::numeric, 2) as gpa, COUNT(*) as total_courses
           FROM grades WHERE semester=$1 GROUP BY student_id""",
        semester,
    )
    if not rows:
        return {"message": f"No grades found for semester {semester}", "updated": 0}

    updated = 0
    for r in rows:
        await db.execute(
            """INSERT INTO semester_gpa (student_id, semester, gpa, total_courses, calculated_at)
               VALUES ($1,$2,$3,$4,NOW())
               ON CONFLICT(student_id, semester) DO UPDATE SET
                 gpa=EXCLUDED.gpa,
                 total_courses=EXCLUDED.total_courses,
                 calculated_at=EXCLUDED.calculated_at""",
            r["student_id"], semester, r["gpa"], r["total_courses"],
        )
        updated += 1

    return {"message": f"GPA calculated for {updated} students", "semester": semester, "updated": updated}


@router.get("/semester-gpa/{student_id}")
async def get_student_semester_gpas(
    student_id: str,
    payload: dict = Depends(require_auth),
    db=Depends(get_db),
):
    """Return all semester GPAs for a student (GPA history across semesters)."""
    caller_role = payload.get("role")
    caller_id   = payload.get("sub")

    if caller_role == "student":
        row = await db.fetchrow(
            "SELECT student_id FROM students WHERE user_id=$1", int(caller_id)
        )
        if not row or row["student_id"].upper() != student_id.upper():
            raise HTTPException(status_code=403, detail="Access denied")

    rows = await db.fetch(
        "SELECT * FROM semester_gpa WHERE student_id=$1 ORDER BY semester DESC",
        student_id,
    )
    return [dict(r) for r in rows]


@router.get("/all-semester-gpa")
async def get_all_semester_gpas(
    semester: Optional[str] = None,
    payload: dict = Depends(require_role("doctor", "admin")),
    db=Depends(get_db),
):
    """Return GPA for all students, optionally filtered by semester."""
    if semester:
        rows = await db.fetch(
            """SELECT sg.*, u.full_name as student_name, s.department
               FROM semester_gpa sg
               JOIN students s ON sg.student_id = s.student_id
               JOIN users u ON s.user_id = u.id
               WHERE sg.semester=$1 ORDER BY sg.gpa DESC""",
            semester,
        )
    else:
        rows = await db.fetch(
            """SELECT sg.*, u.full_name as student_name, s.department
               FROM semester_gpa sg
               JOIN students s ON sg.student_id = s.student_id
               JOIN users u ON s.user_id = u.id
               ORDER BY sg.semester DESC, sg.gpa DESC"""
        )
    return [dict(r) for r in rows]
