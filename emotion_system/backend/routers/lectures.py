"""Lectures router"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import aiosqlite, os

router = APIRouter()
DB_PATH = os.getenv("DB_PATH", "emotion_system.db")

class LectureCreate(BaseModel):
    lecture_id: str
    doctor_id: str
    course_name: str
    course_code: str
    room: str
    scheduled_at: str
    duration_min: int = 90

class LectureStatusUpdate(BaseModel):
    status: str

@router.get("/")
async def list_lectures():
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            """SELECT l.*, u.full_name as doctor_name
               FROM lectures l
               LEFT JOIN doctors d ON l.doctor_id=d.doctor_id
               LEFT JOIN users u ON d.user_id=u.id
               ORDER BY l.scheduled_at DESC"""
        )
        rows = await cursor.fetchall()
    return [dict(r) for r in rows]

@router.post("/")
async def create_lecture(lec: LectureCreate):
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            """INSERT INTO lectures (lecture_id,doctor_id,course_name,course_code,room,scheduled_at,duration_min)
               VALUES (?,?,?,?,?,?,?)""",
            (lec.lecture_id, lec.doctor_id, lec.course_name, lec.course_code,
             lec.room, lec.scheduled_at, lec.duration_min)
        )
        await db.commit()
    return {"message": "Lecture created", "lecture_id": lec.lecture_id}

@router.get("/{lecture_id}")
async def get_lecture(lecture_id: str):
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            """SELECT l.*, u.full_name as doctor_name FROM lectures l
               LEFT JOIN doctors d ON l.doctor_id=d.doctor_id
               LEFT JOIN users u ON d.user_id=u.id
               WHERE l.lecture_id=?""",
            (lecture_id,)
        )
        row = await cursor.fetchone()
    if not row:
        raise HTTPException(404, "Lecture not found")
    return dict(row)

@router.patch("/{lecture_id}/status")
async def update_status(lecture_id: str, update: LectureStatusUpdate):
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "UPDATE lectures SET status=? WHERE lecture_id=?",
            (update.status, lecture_id)
        )
        await db.commit()
    return {"message": f"Lecture {lecture_id} status → {update.status}"}

@router.get("/{lecture_id}/live-summary")
async def live_summary(lecture_id: str):
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        # Attendance
        att_cursor = await db.execute(
            "SELECT COUNT(*) as present FROM attendance WHERE lecture_id=? AND status='present'",
            (lecture_id,)
        )
        present = (await att_cursor.fetchone())["present"]
        # Avg engagement last 5 min
        eng_cursor = await db.execute(
            """SELECT AVG(engagement_score) as avg_eng, AVG(attention_score) as avg_att,
                      COUNT(DISTINCT student_id) as active_students
               FROM emotion_records
               WHERE lecture_id=? AND timestamp > datetime('now','-5 minutes')""",
            (lecture_id,)
        )
        eng = await eng_cursor.fetchone()
        # Dominant emotion
        dom_cursor = await db.execute(
            """SELECT emotion, COUNT(*) as cnt FROM emotion_records
               WHERE lecture_id=? AND timestamp > datetime('now','-5 minutes')
               GROUP BY emotion ORDER BY cnt DESC LIMIT 1""",
            (lecture_id,)
        )
        dom = await dom_cursor.fetchone()
        # Alerts
        alert_cursor = await db.execute(
            "SELECT COUNT(*) as cnt FROM alerts WHERE lecture_id=? AND is_read=0",
            (lecture_id,)
        )
        alerts = (await alert_cursor.fetchone())["cnt"]
    return {
        "lecture_id": lecture_id,
        "present_count": present,
        "avg_engagement": round((eng["avg_eng"] or 0) * 100, 1),
        "avg_attention": round((eng["avg_att"] or 0) * 100, 1),
        "active_students": eng["active_students"] or 0,
        "dominant_emotion": dom["emotion"] if dom else "neutral",
        "unread_alerts": alerts,
    }
