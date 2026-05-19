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
import aiosqlite, os, json
from datetime import datetime

from auth_utils import require_auth, require_role
from emotion_engine import get_engine

router = APIRouter()
DB = os.getenv("DB_PATH", "emotion_system.db")

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
    frame_b64: str          # base64 webcam snapshot

class CheckFrame(BaseModel):
    session_id: int
    student_id: str
    exam_id: str
    frame_b64: str

class EndSession(BaseModel):
    session_id: int


# ── Frame analysis helper ─────────────────────────────────────────────────────
def _analyse_frame(frame_b64: str) -> dict:
    """
    Use the existing EmotionEngine (OpenCV Haar cascade) to:
      - Count faces in frame
      - Estimate face position (looking-away check)
    Returns {"event": <type>, "severity": <level>, "face_count": <n>}
    """
    engine = get_engine()
    frame  = engine.decode_frame(frame_b64)
    if frame is None:
        return {"event": "invalid_frame", "severity": "warning", "face_count": 0}

    faces = engine.detect_faces(frame)
    h, w  = frame.shape[:2]

    # No face ── student left camera or covered it
    if len(faces) == 0:
        return {"event": "face_not_visible", "severity": "critical", "face_count": 0}

    # Multiple faces ── someone else in frame
    if len(faces) > 1:
        return {"event": "multiple_faces", "severity": "critical",
                "face_count": len(faces)}

    # Single face — check position for looking-away
    x, y, fw, fh = faces[0]
    cx = x + fw / 2          # face centre X
    cy = y + fh / 2          # face centre Y
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
async def start_session(body: StartSession, payload: dict = Depends(require_auth)):
    async with aiosqlite.connect(DB) as db:
        db.row_factory = aiosqlite.Row
        # Close any existing active session for same student+exam
        await db.execute(
            "UPDATE proctoring_sessions SET status='completed', ended_at=datetime('now') "
            "WHERE student_id=? AND exam_id=? AND status='active'",
            (body.student_id, body.exam_id)
        )
        cur = await db.execute(
            "INSERT INTO proctoring_sessions (student_id, exam_id) VALUES (?,?)",
            (body.student_id, body.exam_id)
        )
        session_id = cur.lastrowid
        await db.commit()
    return {"session_id": session_id, "status": "active",
            "message": "Proctoring session started"}


@router.post("/verify-identity")
async def verify_identity(body: VerifyFrame, payload: dict = Depends(require_auth)):
    """
    Verify the student is the one sitting the exam.
    Checks: face present in frame, matches stored photo (simplified: face detected = verified).
    """
    result = _analyse_frame(body.frame_b64)

    if result["face_count"] == 0:
        return {"verified": False,
                "message": "No face detected. Please ensure your face is visible in the camera."}
    if result["face_count"] > 1:
        return {"verified": False,
                "message": "Multiple faces detected. Only the registered student may be present."}

    # Mark session as identity-verified
    async with aiosqlite.connect(DB) as db:
        await db.execute(
            "UPDATE proctoring_sessions SET identity_verified=1 "
            "WHERE student_id=? AND exam_id=? AND status='active'",
            (body.student_id, body.exam_id)
        )
        await db.commit()

    return {"verified": True,
            "message": "Identity verified. You may begin your exam."}


@router.post("/check-frame")
async def check_frame(body: CheckFrame, payload: dict = Depends(require_auth)):
    """
    Called every few seconds during the exam.
    Returns the analysis result and logs any suspicious event.
    """
    result = _analyse_frame(body.frame_b64)

    is_suspicious = result["event"] not in ("ok", "invalid_frame")

    async with aiosqlite.connect(DB) as db:
        db.row_factory = aiosqlite.Row

        # Always increment total_checks
        await db.execute(
            "UPDATE proctoring_sessions SET total_checks = total_checks + 1 WHERE id=?",
            (body.session_id,)
        )

        if is_suspicious:
            # Log event
            await db.execute(
                """INSERT INTO proctoring_events
                   (session_id, student_id, exam_id, event_type, severity, details)
                   VALUES (?,?,?,?,?,?)""",
                (body.session_id, body.student_id, body.exam_id,
                 result["event"], result["severity"], json.dumps(result))
            )
            # Increment suspicious count
            await db.execute(
                "UPDATE proctoring_sessions SET suspicious_count = suspicious_count + 1 WHERE id=?",
                (body.session_id,)
            )
            # Auto-flag if threshold exceeded
            await db.execute(
                f"UPDATE proctoring_sessions SET status='flagged' "
                f"WHERE id=? AND suspicious_count >= {FLAG_THRESHOLD}",
                (body.session_id,)
            )

        await db.commit()

        # Return current session state
        row = await (await db.execute(
            "SELECT suspicious_count, status FROM proctoring_sessions WHERE id=?",
            (body.session_id,)
        )).fetchone()

    return {
        "event":            result["event"],
        "severity":         result["severity"],
        "face_count":       result.get("face_count", 0),
        "suspicious_count": row["suspicious_count"] if row else 0,
        "session_status":   row["status"] if row else "unknown",
    }


@router.post("/end")
async def end_session(body: EndSession, payload: dict = Depends(require_auth)):
    async with aiosqlite.connect(DB) as db:
        await db.execute(
            "UPDATE proctoring_sessions SET status='completed', ended_at=datetime('now') "
            "WHERE id=? AND status='active'",
            (body.session_id,)
        )
        await db.commit()
    return {"message": "Session ended", "session_id": body.session_id}


@router.get("/sessions")
async def list_sessions(
    exam_id: Optional[str] = None,
    payload: dict = Depends(require_role("doctor", "admin"))
):
    """List proctoring sessions with suspicious-event counts."""
    async with aiosqlite.connect(DB) as db:
        db.row_factory = aiosqlite.Row
        q = """
            SELECT ps.*, u.full_name as student_name
            FROM proctoring_sessions ps
            LEFT JOIN students s ON ps.student_id = s.student_id
            LEFT JOIN users    u ON s.user_id      = u.id
        """
        params = []
        if exam_id:
            q += " WHERE ps.exam_id = ?"
            params.append(exam_id)
        q += " ORDER BY ps.suspicious_count DESC, ps.started_at DESC"
        rows = await (await db.execute(q, params)).fetchall()
    return [dict(r) for r in rows]


@router.get("/events/{session_id}")
async def session_events(
    session_id: int,
    payload: dict = Depends(require_role("doctor", "admin"))
):
    """Get all suspicious events for a specific proctoring session."""
    async with aiosqlite.connect(DB) as db:
        db.row_factory = aiosqlite.Row
        rows = await (await db.execute(
            "SELECT * FROM proctoring_events WHERE session_id=? ORDER BY timestamp",
            (session_id,)
        )).fetchall()
    return [dict(r) for r in rows]


@router.get("/summary/{exam_id}")
async def exam_summary(
    exam_id: str,
    payload: dict = Depends(require_role("doctor", "admin"))
):
    """Summary of proctoring stats for an entire exam."""
    async with aiosqlite.connect(DB) as db:
        db.row_factory = aiosqlite.Row
        stats = dict(await (await db.execute("""
            SELECT
                COUNT(*) as total_students,
                SUM(CASE WHEN status='flagged'   THEN 1 ELSE 0 END) as flagged,
                SUM(CASE WHEN status='completed' THEN 1 ELSE 0 END) as clean,
                SUM(CASE WHEN identity_verified=1 THEN 1 ELSE 0 END) as verified,
                AVG(suspicious_count) as avg_suspicious
            FROM proctoring_sessions WHERE exam_id=?
        """, (exam_id,))).fetchone())

        event_counts = await (await db.execute("""
            SELECT event_type, COUNT(*) as cnt
            FROM proctoring_events WHERE exam_id=?
            GROUP BY event_type ORDER BY cnt DESC
        """, (exam_id,))).fetchall()

    return {
        **stats,
        "event_breakdown": {r["event_type"]: r["cnt"] for r in event_counts}
    }
