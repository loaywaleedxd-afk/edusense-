"""
Classroom Emotion Detection & Attendance System
FastAPI Backend — main entry point
"""
# Load .env file first so DATABASE_URL, JWT_SECRET, etc. are available
from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.middleware.base import BaseHTTPMiddleware
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
    proctoring, advising, at_risk, office_hours, payment,
    tenants,
)
from database import init_pool, init_tenant_schema, get_db
from websocket_manager import ConnectionManager
from r_runner import r_router
from auth_utils import require_auth, require_role

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

manager = ConnectionManager()


_DEFAULT_TENANT = os.getenv("DEFAULT_TENANT", "public")

class TenantMiddleware(BaseHTTPMiddleware):
    """
    Extract subdomain from the Host header and store it as request.state.tenant.
    e.g.  aast.edusense.com  →  aast
          localhost           →  value of DEFAULT_TENANT env var (default: public)

    In production, subdomains are detected automatically.
    In local dev, set DEFAULT_TENANT=aast in your .env to point at a specific schema.
    """
    async def dispatch(self, request: Request, call_next):
        host = request.headers.get("host", "localhost").split(":")[0]
        parts = host.split(".")
        # If there are 3+ parts (sub.domain.tld), the first is the tenant
        if len(parts) >= 3:
            request.state.tenant = parts[0]
        else:
            # Localhost / no subdomain — use the dev default from .env
            request.state.tenant = _DEFAULT_TENANT
        return await call_next(request)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting Emotion Detection System...")
    await init_pool(app)
    await init_tenant_schema(app.state.pool, "public")
    yield
    await app.state.pool.close()
    logger.info("Shutting down...")


app = FastAPI(
    title="Classroom Emotion Detection System",
    description="AI-powered student emotion & attendance tracking",
    version="1.0.0",
    lifespan=lifespan
)

# ── Tenant middleware (before CORS) ───────────────────────────────────────────
app.add_middleware(TenantMiddleware)

# ── CORS ──────────────────────────────────────────────────────────────────────
_RAW_ORIGINS = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173"
)
ALLOWED_ORIGINS = [o.strip() for o in _RAW_ORIGINS.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
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
app.include_router(proctoring.router,    prefix="/api/proctor",        tags=["Proctoring"])
app.include_router(advising.router,      prefix="/api/advising",       tags=["Advising"])
app.include_router(at_risk.router,       prefix="/api/at-risk",        tags=["AtRisk"])
app.include_router(office_hours.router,  prefix="/api/office-hours",   tags=["OfficeHours"])
app.include_router(payment.router,       prefix="/api/payment",         tags=["Payment"])
app.include_router(r_router)
# ── Superadmin-only: tenant (university) management ───────────────────────────
# Prefix is intentionally obscure. Not listed in public docs.
app.include_router(tenants.router, prefix="/api/super/tenants", include_in_schema=False)


# ── Per-user WebSocket notification endpoint ───────────────────────────────────
@app.websocket("/ws/notifications/{user_id}")
async def ws_notifications(websocket: WebSocket, user_id: str):
    """Real-time notification channel per user."""
    await manager.connect_user(websocket, user_id)
    try:
        await websocket.send_text(json.dumps({
            "type": "connected",
            "title": "Connected",
            "message": "Real-time notifications active",
            "icon": "connected",
            "color": "#10b981",
        }))
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        manager.disconnect_user(websocket, user_id)
    except Exception as e:
        logger.error(f"WS notification error for {user_id}: {e}")
        manager.disconnect_user(websocket, user_id)

# Serve student photos as static files
_PHOTOS_DIR = os.path.join(os.path.dirname(__file__), "..", "student_photos")
if os.path.isdir(_PHOTOS_DIR):
    app.mount("/photos", StaticFiles(directory=_PHOTOS_DIR), name="photos")


@app.get("/")
async def root():
    return {"message": "Emotion Detection API", "status": "online", "version": "1.0.0"}


@app.get("/api/analytics")
async def analytics_summary(
    request: Request,
    payload: dict = Depends(require_role("doctor", "admin")),
    db=Depends(get_db),
):
    """Mobile-friendly analytics summary."""
    overview = await db.fetchrow(
        """SELECT
             COUNT(DISTINCT s.student_id) as total_students,
             COUNT(DISTINCT l.lecture_id) as total_lectures,
             AVG(er.engagement_score)*100 as avg_engagement_rate
           FROM students s
           LEFT JOIN emotion_records er ON s.student_id=er.student_id
           LEFT JOIN lectures l ON er.lecture_id=l.lecture_id"""
    )

    att_row = await db.fetchrow(
        """SELECT
             ROUND(CAST(100.0*SUM(CASE WHEN status='present' THEN 1 ELSE 0 END) AS numeric)/GREATEST(1,COUNT(*)),1) as avg_attendance_rate
           FROM attendance"""
    )

    emotions_rows = await db.fetch(
        "SELECT emotion, COUNT(*) as count FROM emotion_records GROUP BY emotion ORDER BY count DESC"
    )
    emotion_dist = {r['emotion']: r['count'] for r in emotions_rows}

    return {
        "total_students":      (overview['total_students'] or 0) if overview else 0,
        "total_lectures":      (overview['total_lectures'] or 0) if overview else 0,
        "avg_attendance_rate": (att_row['avg_attendance_rate'] or 0) if att_row else 0,
        "avg_engagement_rate": (overview['avg_engagement_rate'] or 0) if overview else 0,
        "emotion_distribution": emotion_dist,
    }


@app.get("/api/branding")
async def get_branding(request: Request):
    """
    Public endpoint (no auth) — returns the current tenant's logo and primary color.
    Called by the frontend before login to apply university branding.
    """
    tenant = getattr(request.state, "tenant", "public")
    pool = request.app.state.pool
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT name, primary_color, logo_data FROM public.tenants WHERE schema_name=$1",
            tenant,
        )
    if not row:
        return {"name": "EduSense", "primary_color": "#3b82f6", "logo_data": None}
    return {
        "name":          row["name"],
        "primary_color": row["primary_color"] or "#3b82f6",
        "logo_data":     row["logo_data"],
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
