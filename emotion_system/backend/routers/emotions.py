"""Emotions router — protected by JWT auth."""
from fastapi import APIRouter, HTTPException, Body, Depends
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from database import get_db
from emotion_engine import get_engine
from auth_utils import require_auth, require_role
import aiosqlite, os

router = APIRouter()
DB_PATH = os.getenv("DB_PATH", "emotion_system.db")


class EmotionRecord(BaseModel):
    student_id: str
    lecture_id: str
    emotion: str
    confidence: float
    attention_score: Optional[float] = None
    engagement_score: Optional[float] = None


class FrameAnalysisRequest(BaseModel):
    frame_b64: str
    lecture_id: str
    enrolled_students: List[str] = []


@router.post("/analyze-frame")
async def analyze_frame(
    req: FrameAnalysisRequest,
    payload: dict = Depends(require_role("doctor", "admin")),
):
    """Analyze a webcam frame — doctors and admins only."""
    engine = get_engine()
    result = engine.process_frame(req.frame_b64, req.lecture_id, req.enrolled_students)
    if result.get("detections"):
        async with aiosqlite.connect(DB_PATH) as db:
            for det in result["detections"]:
                if not det["student_id"].startswith("Unknown"):
                    await db.execute(
                        """INSERT INTO emotion_records
                           (student_id,lecture_id,emotion,confidence,attention_score,engagement_score)
                           VALUES (?,?,?,?,?,?)""",
                        (det["student_id"], req.lecture_id, det["emotion"],
                         det["confidence"], det["attention_score"], det["engagement_score"]),
                    )
            await db.commit()
    return result


@router.post("/record")
async def record_emotion(
    rec: EmotionRecord,
    payload: dict = Depends(require_role("doctor", "admin")),
):
    """Record an emotion data point — doctors and admins only."""
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            """INSERT INTO emotion_records
               (student_id,lecture_id,emotion,confidence,attention_score,engagement_score)
               VALUES (?,?,?,?,?,?)""",
            (rec.student_id, rec.lecture_id, rec.emotion,
             rec.confidence, rec.attention_score, rec.engagement_score),
        )
        await db.commit()
    return {"message": "Emotion recorded"}


@router.get("/lecture/{lecture_id}")
async def get_lecture_emotions(
    lecture_id: str,
    payload: dict = Depends(require_role("doctor", "admin")),
):
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            """SELECT student_id, emotion, confidence, attention_score,
                      engagement_score, timestamp
               FROM emotion_records WHERE lecture_id=? ORDER BY timestamp DESC LIMIT 500""",
            (lecture_id,),
        )
        rows = await cursor.fetchall()
    return [dict(r) for r in rows]


@router.get("/distribution/{lecture_id}")
async def emotion_distribution(
    lecture_id: str,
    payload: dict = Depends(require_role("doctor", "admin")),
):
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            """SELECT emotion, COUNT(*) as count,
                      AVG(confidence) as avg_confidence,
                      AVG(engagement_score) as avg_engagement
               FROM emotion_records WHERE lecture_id=?
               GROUP BY emotion ORDER BY count DESC""",
            (lecture_id,),
        )
        rows = await cursor.fetchall()
    return [dict(r) for r in rows]


@router.get("/trends/{lecture_id}")
async def emotion_trends(
    lecture_id: str,
    payload: dict = Depends(require_role("doctor", "admin")),
):
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            """SELECT strftime('%H:%M', timestamp) as time_slot,
                      emotion, COUNT(*) as count,
                      AVG(engagement_score) as avg_engagement,
                      AVG(attention_score) as avg_attention
               FROM emotion_records WHERE lecture_id=?
               GROUP BY time_slot, emotion ORDER BY time_slot""",
            (lecture_id,),
        )
        rows = await cursor.fetchall()
    return [dict(r) for r in rows]


@router.get("/student/{student_id}")
async def student_emotions(
    student_id: str,
    limit: int = 100,
    payload: dict = Depends(require_auth),
):
    """Students can only see their own emotion data; doctors/admins can see any."""
    caller_role = payload.get("role")
    caller_id   = payload.get("sub")

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
            """SELECT er.*, l.course_name FROM emotion_records er
               LEFT JOIN lectures l ON er.lecture_id = l.lecture_id
               WHERE er.student_id=? ORDER BY er.timestamp DESC LIMIT ?""",
            (student_id, limit),
        )
        rows = await cursor.fetchall()
    return [dict(r) for r in rows]
