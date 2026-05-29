"""QR attendance sessions router."""
from fastapi import APIRouter, Depends, HTTPException
import os, json, random, string, time
from collections import defaultdict
from datetime import datetime, timezone, date as date_type
from database import get_db
from auth_utils import require_auth, require_role

router = APIRouter()

# Simple in-memory rate limit: max 10 QR uses per IP per minute (brute-force protection)
_qr_attempts: dict = defaultdict(list)
_QR_MAX = 10
_QR_WINDOW = 60  # seconds

def _check_qr_rate(ip: str):
    now = time.time()
    hits = [t for t in _qr_attempts[ip] if now - t < _QR_WINDOW]
    _qr_attempts[ip] = hits
    if len(hits) >= _QR_MAX:
        raise HTTPException(status_code=429, detail="Too many QR attempts. Please wait.")
    _qr_attempts[ip].append(now)


@router.post("/create")
async def create_qr(data: dict, payload: dict = Depends(require_role("doctor","admin")), db=Depends(get_db)):
    token = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
    try:
        # Don't insert created_at — let the DB DEFAULT NOW() handle it
        await db.execute(
            "INSERT INTO qr_sessions (token, course_id, lecture_id, week) VALUES ($1,$2,$3,$4)"
            " ON CONFLICT (token) DO UPDATE SET course_id=EXCLUDED.course_id, lecture_id=EXCLUDED.lecture_id, week=EXCLUDED.week",
            token, data.get("courseId",""), data.get("lectureId",""), int(data.get("week",1))
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DB error creating QR: {str(e)}")
    return {"token": token}


@router.post("/use")
async def use_qr(data: dict, payload: dict = Depends(require_auth), db=Depends(get_db)):
    token = (data.get("token") or "").upper()

    # Rate limit per user — prevents brute-forcing the 6-char token space
    _check_qr_rate(str(payload.get("sub", "unknown")))

    # Always derive student_id from the authenticated token — never trust the body
    caller_role = payload.get("role")
    caller_uid  = int(payload.get("sub"))
    if caller_role == "student":
        stu_row = await db.fetchrow(
            "SELECT student_id FROM students WHERE user_id=$1", caller_uid
        )
        if not stu_row:
            raise HTTPException(403, "Student record not found")
        student_id = stu_row["student_id"]
    else:
        # Doctors/admins may pass an explicit studentId (for manual QR entry)
        student_id = data.get("studentId", "")
        if not student_id:
            raise HTTPException(400, "studentId required for non-student users")
    row = await db.fetchrow("SELECT * FROM qr_sessions WHERE token=$1", token)
    if not row:
        raise HTTPException(400, "Invalid code")
    row = dict(row)
    # created_at is a timezone-aware datetime from asyncpg (or None for older rows)
    created = row.get("created_at")
    if created is not None:
        if hasattr(created, 'tzinfo') and created.tzinfo is None:
            created = created.replace(tzinfo=timezone.utc)
        age = (datetime.now(timezone.utc) - created).total_seconds() / 60
        if age > 90:
            raise HTTPException(400, "Code expired (valid 90 min)")
    # skip age check if created_at is missing (legacy row)
    used_raw = row.get("used_by") or "[]"
    used = json.loads(used_raw)
    if student_id in used:
        # Already used this exact token — still return ok (idempotent)
        return {"ok": True, "courseId": row["course_id"], "week": row["week"]}
    used.append(student_id)
    await db.execute(
        "UPDATE qr_sessions SET used_by=$1 WHERE token=$2",
        json.dumps(used), token
    )
    # Use the lecture_id baked into the QR session (same one the doctor's view queries)
    lecture_id = row.get("lecture_id") or row.get("course_id") or ""
    # Fallback: look up from course_code if lecture_id wasn't stored (old sessions)
    if not lecture_id:
        lec_row = await db.fetchrow(
            "SELECT lecture_id FROM lectures WHERE course_code=$1 ORDER BY created_at DESC LIMIT 1",
            row["course_id"]
        )
        lecture_id = lec_row["lecture_id"] if lec_row else row["course_id"]

    # Upsert attendance: update to present if record exists, insert if not
    existing_att = await db.fetchrow(
        "SELECT id FROM attendance WHERE student_id=$1 AND lecture_id=$2 AND week=$3",
        student_id, lecture_id, row["week"]
    )
    try:
        if existing_att:
            # Student may have been pre-marked absent — override to present via QR
            await db.execute(
                "UPDATE attendance SET status='present', method='qr', confidence=1.0, check_in_time=NOW() WHERE id=$1",
                existing_att["id"]
            )
        else:
            await db.execute(
                """INSERT INTO attendance
                   (student_id, lecture_id, week, status, method, confidence, date)
                   VALUES ($1,$2,$3,$4,$5,$6,$7)""",
                student_id, lecture_id, row["week"],
                "present", "qr", 1.0, date_type.today()
            )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save attendance: {str(e)}")
    return {"ok": True, "courseId": row["course_id"], "week": row["week"]}
