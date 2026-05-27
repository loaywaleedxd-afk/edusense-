"""Grades router — protected by JWT auth."""
from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel
from typing import Optional

from database import get_db
from auth_utils import require_auth, require_role
from notifier import manager

router = APIRouter()


class GradeEntry(BaseModel):
    student_id: str
    course_code: str
    course_name: str
    grade: float
    doctor_id: Optional[str] = "D001"


@router.get("/student/{student_id}")
async def get_student_grades(
    student_id: str,
    payload: dict = Depends(require_auth),
    db=Depends(get_db),
):
    """Students can only read their own grades; doctors/admins can read any."""
    caller_role = payload.get("role")
    caller_id   = payload.get("sub")

    if caller_role == "student":
        row = await db.fetchrow(
            "SELECT student_id FROM students WHERE user_id=$1", int(caller_id)
        )
        if not row or row["student_id"].upper() != student_id.upper():
            raise HTTPException(status_code=403, detail="Access denied")

    rows = await db.fetch(
        "SELECT * FROM grades WHERE student_id=$1 ORDER BY created_at DESC",
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
    """Only doctors and admins can post/update grades."""
    await db.execute(
        """INSERT INTO grades (student_id, course_code, course_name, grade, doctor_id)
           VALUES ($1,$2,$3,$4,$5)
           ON CONFLICT(student_id, course_code) DO UPDATE SET grade=EXCLUDED.grade""",
        entry.student_id, entry.course_code, entry.course_name, entry.grade, entry.doctor_id,
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
