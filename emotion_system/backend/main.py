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

from routers import attendance, emotions, students, lectures, analytics, auth
from database import init_db
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
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
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
app.include_router(r_router)


@app.get("/")
async def root():
    return {"message": "Emotion Detection API", "status": "online", "version": "1.0.0"}


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