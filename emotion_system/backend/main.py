"""
Classroom Emotion Detection & Attendance System
FastAPI Backend — main entry point
"""
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
import asyncio
import json
import logging
import os
from datetime import datetime
from contextlib import asynccontextmanager

from routers import (
    attendance, emotions, students, lectures, analytics, auth,
    grades, messages, excuses, users, email_router,
    announcements, exam_schedule, resources, assignments,
    notifications, complaints, fees, registration, waitlist,
    qr_sessions, enrollments, init_data,
)
from database import init_db
import aiosqlite
from websocket_manager import ConnectionManager
from r_runner import r_router
from auth_utils import require_auth, require_role

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

manager = ConnectionManager()


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting Emotion Detection System...")
    await init_db()
    yield
    logger.info("Shutting down...")


app = FastAPI(
    title="Classroom Emotion Detection System",
    description="AI-powered student emotion & attendance tracking",
    version="1.0.0",
    lifespan=lifespan
)

# ── CORS ──────────────────────────────────────────────────────────────────────
# List the exact origins that should be allowed. Override via env var in prod.
_RAW_ORIGINS = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173"
)
ALLOWED_ORIGINS = [o.strip() for o in _RAW_ORIGINS.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
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
app.include_router(excuses.router,       prefix="/api/excuses",       tags=["Excuses"])
app.include_router(users.router,         prefix="/api/users",         tags=["Users"])
app.include_router(email_router.router,  prefix="/api/email",         tags=["Email"])
app.include_router(announcements.router, prefix="/api/announcements", tags=["Announcements"])
app.include_router(exam_schedule.router, prefix="/api/exams",         tags=["ExamSchedule"])
app.include_router(resources.router,     prefix="/api/resources",     tags=["Resources"])
app.include_router(assignments.router,   prefix="/api/assignments",   tags=["Assignments"])
app.include_router(notifications.router, prefix="/api/notifications", tags=["Notifications"])
app.include_router(complaints.router,    prefix="/api/complaints",    tags=["Complaints"])
app.include_router(fees.router,          prefix="/api/fees",          tags=["Fees"])
app.include_router(registration.router,  prefix="/api/registration",  tags=["Registration"])
app.include_router(waitlist.router,      prefix="/api/waitlist",      tags=["Waitlist"])
app.include_router(qr_sessions.router,   prefix="/api/qr",            tags=["QR"])
app.include_router(enrollments.router,   prefix="/api/enrollments",   tags=["Enrollments"])
app.include_router(init_data.router,     prefix="/api/init",          tags=["Init"])
app.include_router(r_router)

# Serve student photos as static files
_PHOTOS_DIR = os.path.join(os.path.dirname(__file__), "..", "student_photos")
if os.path.isdir(_PHOTOS_DIR):
    app.mount("/photos", StaticFiles(directory=_PHOTOS_DIR), name="photos")


@app.get("/")
async def root():
    return {"message": "Emotion Detection API", "status": "online", "version": "1.0.0"}


@app.get("/api/analytics")
async def analytics_summary(payload: dict = Depends(require_role("doctor", "admin"))):
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