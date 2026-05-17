"""
Classroom Emotion Detection & Attendance System
FastAPI Backend — main entry point
"""
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import asyncio
import json
import logging
from datetime import datetime
from contextlib import asynccontextmanager

from routers import attendance, emotions, students, lectures, analytics, auth, grades, messages, excuses, users
from database import init_db
import aiosqlite
from websocket_manager import ConnectionManager
from r_runner import r_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

manager = ConnectionManager()


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("🚀 Starting Emotion Detection System...")
    await init_db()
    yield
    logger.info("🛑 Shutting down...")


app = FastAPI(
    title="Classroom Emotion Detection System",
    description="AI-powered student emotion & attendance tracking",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router,       prefix="/api/auth",       tags=["Authentication"])
app.include_router(students.router,   prefix="/api/students",   tags=["Students"])
app.include_router(lectures.router,   prefix="/api/lectures",   tags=["Lectures"])
app.include_router(attendance.router, prefix="/api/attendance", tags=["Attendance"])
app.include_router(emotions.router,   prefix="/api/emotions",   tags=["Emotions"])
app.include_router(analytics.router,  prefix="/api/analytics",  tags=["Analytics"])
app.include_router(grades.router,     prefix="/api/grades",     tags=["Grades"])
app.include_router(messages.router,   prefix="/api/messages",   tags=["Messages"])
app.include_router(excuses.router,    prefix="/api/excuses",    tags=["Excuses"])
app.include_router(users.router,      prefix="/api/users",      tags=["Users"])
app.include_router(r_router)


@app.get("/")
async def root():
    return {"message": "Emotion Detection API", "status": "online", "version": "1.0.0"}


@app.get("/api/analytics")
async def analytics_summary():
    """Mobile-friendly analytics summary."""
    DB_PATH = "emotion_system.db"
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        overview = dict(await (await db.execute(
            """SELECT
                 COUNT(DISTINCT s.student_id) as total_students,
                 COUNT(DISTINCT l.lecture_id) as total_lectures,
                 AVG(er.engagement_score)*100 as avg_engagement_rate
               FROM students s
               LEFT JOIN emotion_records er ON s.student_id=er.student_id
               LEFT JOIN lectures l ON er.lecture_id=l.lecture_id"""
        )).fetchone())

        att_row = dict(await (await db.execute(
            """SELECT
                 ROUND(100.0*SUM(CASE WHEN status='present' THEN 1 ELSE 0 END)/MAX(1,COUNT(*)),1) as avg_attendance_rate
               FROM attendance"""
        )).fetchone())

        emotions_rows = await (await db.execute(
            """SELECT emotion, COUNT(*) as count
               FROM emotion_records GROUP BY emotion ORDER BY count DESC"""
        )).fetchall()
        emotion_dist = {r['emotion']: r['count'] for r in emotions_rows}

    return {
        "total_students":    overview.get("total_students") or 0,
        "total_lectures":    overview.get("total_lectures") or 0,
        "avg_attendance_rate": att_row.get("avg_attendance_rate") or 0,
        "avg_engagement_rate": overview.get("avg_engagement_rate") or 0,
        "emotion_distribution": emotion_dist,
    }


@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "services": {"database": "ok", "face_recognition": "ok", "emotion_engine": "ok"}
    }


@app.websocket("/ws/{lecture_id}")
async def websocket_endpoint(websocket: WebSocket, lecture_id: str):
    """Real-time WebSocket for live emotion & attendance streaming."""
    await manager.connect(websocket, lecture_id)
    try:
        while True:
            data = await websocket.receive_text()
            payload = json.loads(data)
            await manager.broadcast(lecture_id, json.dumps({
                "type": "emotion_update",
                "lecture_id": lecture_id,
                "data": payload,
                "timestamp": datetime.utcnow().isoformat()
            }))
    except WebSocketDisconnect:
        manager.disconnect(websocket, lecture_id)