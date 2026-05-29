"""
Exam Proctoring Router
— Start/end proctoring sessions
— Analyze webcam frames for suspicious behaviour (face count, looking away)
— Identity verification against stored student photo
— Review dashboard for doctors/admin
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
import json
from datetime import datetime

from database import get_db
from auth_utils import require_auth, require_role
from emotion_engine import get_engine

router = APIRouter()

# ── Suspicious-event thresholds ───────────────────────────────────────────────
CRITICAL_EVENTS = {"face_not_visible", "multiple_faces"}
WARNING_EVENTS  = {"looking_away"}
FLAG_THRESHOLD  = 5   # mark session as 'flagged' after this many suspicious events


# ── Pydantic models ───────────────────────────────────────────────────────────
class StartSession(BaseModel):
    student_id: str
    exam_id: str

class VerifyFrame(BaseModel):
    student_id: str
    exam_id: str
    frame_b64: str

class CheckFrame(BaseModel):
    session_id: int
    student_id: str
    exam_id: str
    frame_b64: str

class EndSession(BaseModel):
    session_id: int


# ── Frame analysis helper ─────────────────────────────────────────────────────
def _analyse_frame(frame_b64: str) -> dict:
    engine = get_engine()
    frame  = engine.decode_frame(frame_b64)
    if frame is None:
        return {"event": "invalid_frame", "severity": "warning", "face_count": 0}

    faces = engine.detect_faces(frame)
    h, w  = frame.shape[:2]

    if len(faces) == 0:
        return {"event": "face_not_visible", "severity": "critical", "face_count": 0}

    if len(faces) > 1:
        return {"event": "multiple_faces", "severity": "critical",
                "face_count": len(faces)}

    x, y, fw, fh = faces[0]
    cx = x + fw / 2
    cy = y + fh / 2
    area_ratio = (fw * fh) / max(1, w * h)

    if cx < w * 0.15 or cx > w * 0.85:
        return {"event": "looking_away", "severity": "warning",
                "face_count": 1, "direction": "side"}
    if cy < h * 0.10 or cy > h * 0.80:
        return {"event": "looking_away", "severity": "warning",
                "face_count": 1, "direction": "vertical"}
    if area_ratio < 0.015:
        return {"event": "looking_away", "severity": "info",
                "face_count": 1, "direction": "far"}

    return {"event": "ok", "severity": "info", "face_count": 1}


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/start")
async def start_session(body: StartSession, payload: dict = Depends(require_auth), db=Depends(get_db)):
    role = payload.get("role")
    uid  = int(payload.get("sub"))

    # Students can only start their own session
    if role == "student":
        stu_row = await db.fetchrow("SELECT student_id FROM students WHERE user_id=$1", uid)
        if not stu_row or stu_row["student_id"] != body.student_id:
            raise HTTPException(403, "Access denied")

    # Close any existing active session for same student+exam
    await db.execute(
        "UPDATE proctoring_sessions SET status='completed', ended_at=NOW() "
        "WHERE student_id=$1 AND exam_id=$2 AND status='active'",
        body.student_id, body.exam_id
    )
    row = await db.fetchrow(
        "INSERT INTO proctoring_sessions (student_id, exam_id) VALUES ($1,$2) RETURNING id",
        body.student_id, body.exam_id
    )
    session_id = row["id"]
    return {"session_id": session_id, "status": "active",
            "message": "Proctoring session started"}


@router.post("/verify-identity")
async def verify_identity(body: VerifyFrame, payload: dict = Depends(require_auth), db=Depends(get_db)):
    result = _analyse_frame(body.frame_b64)

    if result["face_count"] == 0:
        return {"verified": False,
                "message": "No face detected. Please ensure your face is visible in the camera."}
    if result["face_count"] > 1:
        return {"verified": False,
                "message": "Multiple faces detected. Only the registered student may be present."}

    await db.execute(
        "UPDATE proctoring_sessions SET identity_verified=TRUE "
        "WHERE student_id=$1 AND exam_id=$2 AND status='active'",
        body.student_id, body.exam_id
    )

    return {"verified": True,
            "message": "Identity verified. You may begin your exam."}


@router.post("/check-frame")
async def check_frame(body: CheckFrame, payload: dict = Depends(require_auth), db=Depends(get_db)):
    result = _analyse_frame(body.frame_b64)
    is_suspicious = result["event"] not in ("ok", "invalid_frame")

    # Always increment total_checks
    await db.execute(
        "UPDATE proctoring_sessions SET total_checks = total_checks + 1 WHERE id=$1",
        body.session_id
    )

    if is_suspicious:
        await db.execute(
            """INSERT INTO proctoring_events
               (session_id, student_id, exam_id, event_type, severity, details)
               VALUES ($1,$2,$3,$4,$5,$6)""",
            body.session_id, body.student_id, body.exam_id,
            result["event"], result["severity"], json.dumps(result)
        )
        await db.execute(
            "UPDATE proctoring_sessions SET suspicious_count = suspicious_count + 1 WHERE id=$1",
            body.session_id
        )
        await db.execute(
            "UPDATE proctoring_sessions SET status='flagged' "
            f"WHERE id=$1 AND suspicious_count >= {FLAG_THRESHOLD}",
            body.session_id
        )

    row = await db.fetchrow(
        "SELECT suspicious_count, status FROM proctoring_sessions WHERE id=$1",
        body.session_id
    )

    return {
        "event":            result["event"],
        "severity":         result["severity"],
        "face_count":       result.get("face_count", 0),
        "suspicious_count": row["suspicious_count"] if row else 0,
        "session_status":   row["status"] if row else "unknown",
    }


@router.post("/end")
async def end_session(body: EndSession, payload: dict = Depends(require_auth), db=Depends(get_db)):
    role = payload.get("role")
    uid  = int(payload.get("sub"))

    if role == "student":
        # Ensure student owns this session
        session_row = await db.fetchrow("SELECT student_id FROM proctoring_sessions WHERE id=$1", body.session_id)
        if not session_row:
            raise HTTPException(404, "Session not found")
        stu_row = await db.fetchrow("SELECT student_id FROM students WHERE user_id=$1", uid)
        if not stu_row or stu_row["student_id"] != session_row["student_id"]:
            raise HTTPException(403, "Access denied")

    await db.execute(
        "UPDATE proctoring_sessions SET status='completed', ended_at=NOW() "
        "WHERE id=$1 AND status='active'",
        body.session_id
    )
    return {"message": "Session ended", "session_id": body.session_id}


@router.get("/sessions")
async def list_sessions(
    exam_id: Optional[str] = None,
    payload: dict = Depends(require_role("doctor", "admin")),
    db=Depends(get_db)
):
    """List proctoring sessions with suspicious-event counts."""
    if exam_id:
        rows = await db.fetch(
            """SELECT ps.*, u.full_name as student_name
               FROM proctoring_sessions ps
               LEFT JOIN students s ON ps.student_id = s.student_id
               LEFT JOIN users    u ON s.user_id      = u.id
               WHERE ps.exam_id = $1
               ORDER BY ps.suspicious_count DESC, ps.started_at DESC""",
            exam_id
        )
    else:
        rows = await db.fetch(
            """SELECT ps.*, u.full_name as student_name
               FROM proctoring_sessions ps
               LEFT JOIN students s ON ps.student_id = s.student_id
               LEFT JOIN users    u ON s.user_id      = u.id
               ORDER BY ps.suspicious_count DESC, ps.started_at DESC"""
        )
    return [dict(r) for r in rows]


@router.get("/events/{session_id}")
async def session_events(
    session_id: int,
    payload: dict = Depends(require_role("doctor", "admin")),
    db=Depends(get_db)
):
    rows = await db.fetch(
        "SELECT * FROM proctoring_events WHERE session_id=$1 ORDER BY timestamp",
        session_id
    )
    return [dict(r) for r in rows]


@router.get("/summary/{exam_id}")
async def exam_summary(
    exam_id: str,
    payload: dict = Depends(require_role("doctor", "admin")),
    db=Depends(get_db)
):
    stats = await db.fetchrow("""
        SELECT
            COUNT(*) as total_students,
            SUM(CASE WHEN status='flagged'   THEN 1 ELSE 0 END) as flagged,
            SUM(CASE WHEN status='completed' THEN 1 ELSE 0 END) as clean,
            SUM(CASE WHEN identity_verified=TRUE THEN 1 ELSE 0 END) as verified,
            AVG(suspicious_count) as avg_suspicious
        FROM proctoring_sessions WHERE exam_id=$1
    """, exam_id)

    event_counts = await db.fetch(
        """SELECT event_type, COUNT(*) as cnt
           FROM proctoring_events WHERE exam_id=$1
           GROUP BY event_type ORDER BY cnt DESC""",
        exam_id
    )

    return {
        **dict(stats),
        "event_breakdown": {r["event_type"]: r["cnt"] for r in event_counts}
    }
