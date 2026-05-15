"""Students router"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import aiosqlite, os

router = APIRouter()
DB_PATH = os.getenv("DB_PATH", "emotion_system.db")

class StudentCreate(BaseModel):
    student_id: str
    full_name: str
    email: str
    department: str
    year: int

@router.get("/")
async def list_students():
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            """SELECT s.student_id, u.full_name, u.email, s.department, s.year
               FROM students s JOIN users u ON s.user_id=u.id"""
        )
        rows = await cursor.fetchall()
    return [dict(r) for r in rows]

@router.get("/{student_id}")
async def get_student(student_id: str):
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            """SELECT s.*, u.full_name, u.email FROM students s
               JOIN users u ON s.user_id=u.id WHERE s.student_id=?""",
            (student_id,)
        )
        row = await cursor.fetchone()
    if not row:
        raise HTTPException(404, "Student not found")
    return dict(row)

@router.get("/{student_id}/engagement-summary")
async def student_engagement(student_id: str):
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            """SELECT
                 AVG(engagement_score) as avg_engagement,
                 AVG(attention_score) as avg_attention,
                 COUNT(*) as total_records,
                 emotion, COUNT(emotion) as emotion_count
               FROM emotion_records WHERE student_id=?
               GROUP BY emotion ORDER BY emotion_count DESC""",
            (student_id,)
        )
        rows = await cursor.fetchall()
        att_cursor = await db.execute(
            """SELECT COUNT(*) as attended,
                 (SELECT COUNT(*) FROM lectures) as total
               FROM attendance WHERE student_id=? AND status='present'""",
            (student_id,)
        )
        att = await att_cursor.fetchone()
    return {
        "emotion_breakdown": [dict(r) for r in rows],
        "attendance": dict(att) if att else {},
    }
