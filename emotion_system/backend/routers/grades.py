"""Grades router — protected by JWT auth."""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
import aiosqlite, os

from auth_utils import require_auth, require_role

router = APIRouter()
DB_PATH = os.getenv("DB_PATH", "emotion_system.db")


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
):
    """Students can only read their own grades; doctors/admins can read any."""
    caller_role = payload.get("role")
    caller_id   = payload.get("sub")

    # Students may only fetch their own record
    if caller_role == "student":
        async with aiosqlite.connect(DB_PATH) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute(
                "SELECT student_id FROM students WHERE user_id=?", (int(caller_id),)
            ) as cur:
                row = await cur.fetchone()
        if not row or row["student_id"].upper() != student_id.upper():
            raise HTTPException(status_code=403, detail="Access denied")

    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            "SELECT * FROM grades WHERE student_id=? ORDER BY created_at DESC",
            (student_id,),
        )
        rows = await cursor.fetchall()
    return [dict(r) for r in rows]


@router.get("/course/{course_code}")
async def get_course_grades(
    course_code: str,
    payload: dict = Depends(require_role("doctor", "admin")),
):
    """Only doctors and admins can view full course grade lists."""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            """SELECT g.*, u.full_name FROM grades g
               LEFT JOIN students s ON g.student_id = s.student_id
               LEFT JOIN users u ON s.user_id = u.id
               WHERE g.course_code=? ORDER BY g.grade DESC""",
            (course_code,),
        )
        rows = await cursor.fetchall()
    return [dict(r) for r in rows]


@router.post("/")
async def save_grade(
    entry: GradeEntry,
    payload: dict = Depends(require_role("doctor", "admin")),
):
    """Only doctors and admins can post/update grades."""
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            """INSERT INTO grades (student_id, course_code, course_name, grade, doctor_id)
               VALUES (?,?,?,?,?)
               ON CONFLICT(student_id, course_code) DO UPDATE SET grade=excluded.grade""",
            (entry.student_id, entry.course_code, entry.course_name, entry.grade, entry.doctor_id),
        )
        await db.commit()
    return {"message": "Grade saved"}
