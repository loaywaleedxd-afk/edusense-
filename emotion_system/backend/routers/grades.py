"""Grades router"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import aiosqlite, os

router = APIRouter()
DB_PATH = os.getenv("DB_PATH", "emotion_system.db")

class GradeEntry(BaseModel):
    student_id: str
    course_code: str
    course_name: str
    grade: float
    doctor_id: Optional[str] = "D001"

@router.get("/student/{student_id}")
async def get_student_grades(student_id: str):
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            "SELECT * FROM grades WHERE student_id=? ORDER BY created_at DESC",
            (student_id,)
        )
        rows = await cursor.fetchall()
    return [dict(r) for r in rows]

@router.get("/course/{course_code}")
async def get_course_grades(course_code: str):
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            """SELECT g.*, u.full_name FROM grades g
               LEFT JOIN students s ON g.student_id=s.student_id
               LEFT JOIN users u ON s.user_id=u.id
               WHERE g.course_code=? ORDER BY g.grade DESC""",
            (course_code,)
        )
        rows = await cursor.fetchall()
    return [dict(r) for r in rows]

@router.post("/")
async def save_grade(entry: GradeEntry):
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            """INSERT INTO grades (student_id, course_code, course_name, grade, doctor_id)
               VALUES (?,?,?,?,?)
               ON CONFLICT(student_id, course_code) DO UPDATE SET grade=excluded.grade""",
            (entry.student_id, entry.course_code, entry.course_name, entry.grade, entry.doctor_id)
        )
        await db.commit()
    return {"message": "Grade saved"}
