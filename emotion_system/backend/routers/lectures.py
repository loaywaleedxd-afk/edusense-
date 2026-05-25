"""Lectures router — protected by JWT auth."""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import uuid
from auth_utils import require_auth, require_role
from database import get_db

router = APIRouter()


class LectureCreate(BaseModel):
    course_name: str
    course_code: str
    doctor_id: Optional[str] = None
    room: Optional[str] = ""
    scheduled_at: Optional[str] = ""
    duration_min: int = 90
    capacity: int = 300
    color: Optional[str] = "#3b82f6"
    days: Optional[str] = ""
    days_label: Optional[str] = ""
    semester: Optional[str] = ""


class LectureStatusUpdate(BaseModel):
    status: str


@router.get("/doctors")
async def list_doctors(payload: dict = Depends(require_auth), db=Depends(get_db)):
    """Return all doctors — used by admin doctor list and course assignment dropdown."""
    rows = await db.fetch(
        """SELECT d.doctor_id, d.title, d.department, u.full_name AS name,
                  u.email, u.phone, u.id AS user_id
           FROM doctors d
           JOIN users u ON u.id = d.user_id
           ORDER BY u.full_name"""
    )
    return [dict(r) for r in rows]


@router.post("/doctors")
async def create_doctor(
    data: dict,
    payload: dict = Depends(require_role("admin")),
    db=Depends(get_db),
):
    """Admin creates a new doctor: inserts a user row + a doctors row."""
    import bcrypt as _bcrypt

    name     = str(data.get("name",     "")).strip()
    username = str(data.get("username", "")).strip()
    password = str(data.get("password", "")).strip()
    title    = str(data.get("title",    ""))
    dept     = str(data.get("department",""))
    email    = str(data.get("email",    ""))
    phone    = str(data.get("phone",    ""))

    if not name or not username or not password:
        raise HTTPException(400, "name, username, and password are required")

    # Check username not taken
    existing = await db.fetchrow("SELECT 1 FROM users WHERE username=$1", username)
    if existing:
        raise HTTPException(400, f"Username '{username}' is already taken")

    hashed = _bcrypt.hashpw(password.encode(), _bcrypt.gensalt()).decode()

    try:
        # Insert user
        user_row = await db.fetchrow(
            """INSERT INTO users (username, password, full_name, email, phone, role)
               VALUES ($1,$2,$3,$4,$5,'doctor') RETURNING id""",
            username, hashed, name, email, phone,
        )
        user_id = user_row["id"]

        # Generate next doctor_id like D005, D006…
        max_row = await db.fetchrow(
            "SELECT doctor_id FROM doctors ORDER BY doctor_id DESC LIMIT 1"
        )
        if max_row and max_row["doctor_id"] and max_row["doctor_id"][1:].isdigit():
            next_num = int(max_row["doctor_id"][1:]) + 1
        else:
            count = await db.fetchval("SELECT COUNT(*) FROM doctors")
            next_num = (count or 0) + 1
        doctor_id = f"D{next_num:03d}"

        await db.execute(
            "INSERT INTO doctors (doctor_id, user_id, title, department) VALUES ($1,$2,$3,$4)",
            doctor_id, user_id, title, dept,
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(400, str(e))

    return {"doctor_id": doctor_id, "user_id": user_id, "username": username, "name": name}


@router.delete("/doctors/{doctor_id}")
async def delete_doctor(
    doctor_id: str,
    payload: dict = Depends(require_role("admin")),
    db=Depends(get_db),
):
    """Admin removes a doctor and their user account."""
    row = await db.fetchrow("SELECT user_id FROM doctors WHERE doctor_id=$1", doctor_id)
    if not row:
        raise HTTPException(404, "Doctor not found")
    user_id = row["user_id"]
    await db.execute("DELETE FROM doctors WHERE doctor_id=$1", doctor_id)
    await db.execute("DELETE FROM users WHERE id=$1", user_id)
    return {"ok": True}


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
    """Create a course/lecture — doctors and admins only. Saves to PostgreSQL."""
    # Generate a unique lecture_id from course_code + short uuid
    short_id = uuid.uuid4().hex[:6].upper()
    lecture_id = f"{lec.course_code}-{short_id}"

    # Validate doctor_id if provided
    if lec.doctor_id:
        doc = await db.fetchrow("SELECT 1 FROM doctors WHERE doctor_id=$1", lec.doctor_id)
        if not doc:
            raise HTTPException(status_code=400, detail=f"Doctor '{lec.doctor_id}' not found")

    try:
        await db.execute(
            """INSERT INTO lectures
               (lecture_id, doctor_id, course_name, course_code, room,
                scheduled_at, duration_min, capacity, color, days, days_label, semester)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)""",
            lecture_id,
            lec.doctor_id or None,
            lec.course_name,
            lec.course_code,
            lec.room,
            lec.scheduled_at,
            lec.duration_min,
            lec.capacity,
            lec.color,
            lec.days,
            lec.days_label,
            lec.semester,
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    return {"message": "Course created", "lecture_id": lecture_id, "course_code": lec.course_code}


@router.delete("/by-course/{course_code}")
async def delete_course(
    course_code: str,
    payload: dict = Depends(require_role("admin")),
    db=Depends(get_db),
):
    """Admin deletes all lecture rows for a course_code."""
    result = await db.execute(
        "DELETE FROM lectures WHERE course_code=$1", course_code
    )
    return {"ok": True, "deleted": result}


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
