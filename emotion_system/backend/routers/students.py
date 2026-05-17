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
            """SELECT
                 s.student_id,
                 u.full_name as name,
                 u.email,
                 s.department,
                 s.year,
                 ROUND(
                   100.0 * SUM(CASE WHEN a.status='present' THEN 1 ELSE 0 END) /
                   MAX(1, COUNT(a.id)), 1
                 ) as attendance_rate,
                 COUNT(a.id) as total_lectures,
                 SUM(CASE WHEN a.status='present' THEN 1 ELSE 0 END) as attended
               FROM students s
               JOIN users u ON s.user_id=u.id
               LEFT JOIN attendance a ON s.student_id=a.student_id
               GROUP BY s.student_id
               ORDER BY u.full_name"""
        )
        rows = await cursor.fetchall()
    return [dict(r) for r in rows]

@router.post("/")
async def create_student(data: dict):
    sid   = data.get("student_id", "").strip().upper()
    name  = data.get("name", data.get("full_name", "")).strip()
    email = data.get("email", f"{sid.lower()}@university.edu").strip()
    pwd   = data.get("password", sid.lower()).strip()
    dept  = data.get("department", "General")
    year  = int(data.get("year", 1))

    if not sid or not name:
        raise HTTPException(status_code=400, detail="student_id and name are required")

    async with aiosqlite.connect(DB_PATH) as db:
        try:
            cur = await db.execute(
                "INSERT INTO users (username, full_name, email, role, password) VALUES (?, ?, ?, 'student', ?)",
                (sid.lower(), name, email, pwd)
            )
            user_id = cur.lastrowid
            await db.execute(
                "INSERT INTO students (student_id, user_id, department, year) VALUES (?, ?, ?, ?)",
                (sid, user_id, dept, year)
            )
            await db.commit()
        except Exception as e:
            raise HTTPException(status_code=400, detail=str(e))
    return {"message": "Student created", "student_id": sid}

@router.get("/{student_id}")
async def get_student(student_id: str):
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            """SELECT s.*, u.full_name as name, u.email FROM students s
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
                 emotion,
                 COUNT(emotion) as emotion_count,
                 AVG(engagement_score)*100 as avg_engagement,
                 AVG(attention_score)*100  as avg_attention
               FROM emotion_records WHERE student_id=?
               GROUP BY emotion ORDER BY emotion_count DESC""",
            (student_id,)
        )
        rows = await cursor.fetchall()
        att_cursor = await db.execute(
            """SELECT
                 SUM(CASE WHEN status='present' THEN 1 ELSE 0 END) as attended,
                 COUNT(*) as total
               FROM attendance WHERE student_id=?""",
            (student_id,)
        )
        att = await att_cursor.fetchone()
    return {
        "emotion_breakdown": [dict(r) for r in rows],
        "attendance": dict(att) if att else {"attended": 0, "total": 0},
    }
