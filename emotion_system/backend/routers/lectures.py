"""Lectures router — protected by JWT auth."""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from auth_utils import require_auth, require_role
from database import get_db

router = APIRouter()


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
async def list_lectures(payload: dict = Depends(require_auth), db=Depends(get_db)):
    """All authenticated users can list lectures."""
    rows = await db.fetch(
        """SELECT l.*, u.full_name as doctor_name
           FROM lectures l
           LEFT JOIN doctors d ON l.doctor_id = d.doctor_id
           LEFT JOIN users u ON d.user_id = u.id
           ORDER BY l.scheduled_at DESC"""
    )
    return [dict(r) for r in rows]


@router.post("/")
async def create_lecture(
    lec: LectureCreate,
    payload: dict = Depends(require_role("doctor", "admin")),
    db=Depends(get_db),
):
    """Create a lecture — doctors and admins only."""
    await db.execute(
        """INSERT INTO lectures (lecture_id,doctor_id,course_name,course_code,room,scheduled_at,duration_min)
           VALUES ($1,$2,$3,$4,$5,$6,$7)""",
        lec.lecture_id, lec.doctor_id, lec.course_name, lec.course_code,
        lec.room, lec.scheduled_at, lec.duration_min,
    )
    return {"message": "Lecture created", "lecture_id": lec.lecture_id}


@router.get("/{lecture_id}")
async def get_lecture(
    lecture_id: str,
    payload: dict = Depends(require_auth),
    db=Depends(get_db),
):
    row = await db.fetchrow(
        """SELECT l.*, u.full_name as doctor_name FROM lectures l
           LEFT JOIN doctors d ON l.doctor_id = d.doctor_id
           LEFT JOIN users u ON d.user_id = u.id
           WHERE l.lecture_id=$1""",
        lecture_id,
    )
    if not row:
        raise HTTPException(404, "Lecture not found")
    return dict(row)


@router.patch("/{lecture_id}/status")
async def update_status(
    lecture_id: str,
    update: LectureStatusUpdate,
    payload: dict = Depends(require_role("doctor", "admin")),
    db=Depends(get_db),
):
    await db.execute(
        "UPDATE lectures SET status=$1 WHERE lecture_id=$2",
        update.status, lecture_id,
    )
    return {"message": f"Lecture {lecture_id} status → {update.status}"}


@router.get("/{lecture_id}/live-summary")
async def live_summary(
    lecture_id: str,
    payload: dict = Depends(require_role("doctor", "admin")),
    db=Depends(get_db),
):
    att_row = await db.fetchrow(
        "SELECT COUNT(*) as present FROM attendance WHERE lecture_id=$1 AND status='present'",
        lecture_id,
    )
    present = att_row["present"] if att_row else 0

    eng = await db.fetchrow(
        """SELECT AVG(engagement_score) as avg_eng, AVG(attention_score) as avg_att,
                  COUNT(DISTINCT student_id) as active_students
           FROM emotion_records
           WHERE lecture_id=$1 AND timestamp > NOW() - INTERVAL '5 minutes'""",
        lecture_id,
    )
    dom = await db.fetchrow(
        """SELECT emotion, COUNT(*) as cnt FROM emotion_records
           WHERE lecture_id=$1 AND timestamp > NOW() - INTERVAL '5 minutes'
           GROUP BY emotion ORDER BY cnt DESC LIMIT 1""",
        lecture_id,
    )
    alert_row = await db.fetchrow(
        "SELECT COUNT(*) as cnt FROM alerts WHERE lecture_id=$1 AND is_read=FALSE",
        lecture_id,
    )
    alerts = alert_row["cnt"] if alert_row else 0

    return {
        "lecture_id": lecture_id,
        "present_count": present,
        "avg_engagement": round(((eng["avg_eng"] or 0) if eng else 0) * 100, 1),
        "avg_attention": round(((eng["avg_att"] or 0) if eng else 0) * 100, 1),
        "active_students": (eng["active_students"] or 0) if eng else 0,
        "dominant_emotion": dom["emotion"] if dom else "neutral",
        "unread_alerts": alerts,
    }
