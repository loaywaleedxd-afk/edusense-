"""Students router — protected by JWT auth."""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional

from database import get_db
from auth_utils import require_auth, require_role, hash_password

router = APIRouter()


class StudentCreate(BaseModel):
    student_id: str
    full_name: str
    email: str
    department: str
    year: int


@router.get("/")
async def list_students(payload: dict = Depends(require_role("doctor", "admin")), db=Depends(get_db)):
    """Full student list — doctors and admins only."""
    rows = await db.fetch(
        """SELECT
             s.student_id,
             u.full_name as name,
             u.email,
             s.department,
             s.year,
             s.photo_path,
             ROUND(
               CAST(100.0 * SUM(CASE WHEN a.status='present' THEN 1 ELSE 0 END) AS numeric) /
               GREATEST(1, COUNT(a.id)), 1
             ) as attendance_rate,
             COUNT(a.id) as total_lectures,
             SUM(CASE WHEN a.status='present' THEN 1 ELSE 0 END) as attended
           FROM students s
           JOIN users u ON s.user_id = u.id
           LEFT JOIN attendance a ON s.student_id = a.student_id
           GROUP BY s.student_id, u.full_name, u.email, s.department, s.year, s.photo_path
           ORDER BY u.full_name"""
    )
    return [dict(r) for r in rows]


@router.post("/")
async def create_student(
    data: dict,
    payload: dict = Depends(require_role("admin")),
    db=Depends(get_db),
):
    """Create a new student account — admin only."""
    sid   = data.get("student_id", "").strip().upper()
    name  = data.get("name", data.get("full_name", "")).strip()
    email = data.get("email", f"{sid.lower()}@university.edu").strip()
    plain = data.get("password", sid.lower()).strip()
    dept  = data.get("department", "General")
    year  = int(data.get("year", 1))

    if not sid or not name:
        raise HTTPException(status_code=400, detail="student_id and name are required")
    if len(plain) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    hashed = hash_password(plain)

    try:
        async with db.transaction():
            row = await db.fetchrow(
                "INSERT INTO users (username, full_name, email, role, password) VALUES ($1, $2, $3, 'student', $4) RETURNING id",
                sid.lower(), name, email, hashed,
            )
            user_id = row["id"]
            await db.execute(
                "INSERT INTO students (student_id, user_id, department, year) VALUES ($1, $2, $3, $4)",
                sid, user_id, dept, year,
            )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {"message": "Student created", "student_id": sid}


@router.get("/{student_id}")
async def get_student(
    student_id: str,
    payload: dict = Depends(require_auth),
    db=Depends(get_db),
):
    """Fetch a single student. Students can only fetch their own profile."""
    caller_role = payload.get("role")
    caller_id   = payload.get("sub")

    if caller_role == "student":
        row = await db.fetchrow(
            "SELECT student_id FROM students WHERE user_id=$1", int(caller_id)
        )
        if not row or row["student_id"].upper() != student_id.upper():
            raise HTTPException(status_code=403, detail="Access denied")

    row = await db.fetchrow(
        """SELECT s.*, u.full_name as name, u.email FROM students s
           JOIN users u ON s.user_id = u.id WHERE s.student_id=$1""",
        student_id,
    )
    if not row:
        raise HTTPException(404, "Student not found")
    return dict(row)


@router.patch("/{student_id}/year")
async def update_student_year(
    student_id: str,
    data: dict,
    payload: dict = Depends(require_role("admin")),
    db=Depends(get_db),
):
    """Update a student's academic year (1–4) — admin only."""
    year = int(data.get("year", 1))
    if year < 1 or year > 4:
        raise HTTPException(status_code=400, detail="Year must be between 1 and 4")
    result = await db.execute(
        "UPDATE students SET year=$1 WHERE student_id=$2",
        year, student_id,
    )
    if result == "UPDATE 0":
        raise HTTPException(status_code=404, detail="Student not found")
    return {"ok": True, "student_id": student_id, "year": year}


@router.delete("/{student_id}")
async def delete_student(
    student_id: str,
    payload: dict = Depends(require_role("admin")),
    db=Depends(get_db),
):
    """Delete a student and their user account — admin only."""
    row = await db.fetchrow(
        "SELECT user_id FROM students WHERE student_id=$1", student_id
    )
    if not row:
        raise HTTPException(404, "Student not found")
    user_id = row["user_id"]

    async with db.transaction():
        # Remove all dependent rows first to avoid FK violations
        await db.execute("DELETE FROM attendance              WHERE student_id=$1", student_id)
        await db.execute("DELETE FROM emotion_records         WHERE student_id=$1", student_id)
        await db.execute("DELETE FROM course_enrollments      WHERE student_id=$1", student_id)
        await db.execute("DELETE FROM grades                  WHERE student_id=$1", student_id)
        await db.execute("DELETE FROM excuses                 WHERE student_id=$1", student_id)
        await db.execute("DELETE FROM submissions             WHERE student_id=$1", student_id)
        await db.execute("DELETE FROM complaints              WHERE student_id=$1", student_id)
        await db.execute("DELETE FROM system_alerts           WHERE student_id=$1", student_id)
        await db.execute("DELETE FROM student_fees            WHERE student_id=$1", student_id)
        await db.execute("DELETE FROM face_encodings          WHERE student_id=$1", student_id)
        await db.execute("DELETE FROM at_risk_assessments     WHERE student_id=$1", student_id)
        await db.execute("DELETE FROM enrollment_requests     WHERE student_id=$1", student_id)
        await db.execute("DELETE FROM course_waitlist         WHERE student_id=$1", student_id)
        await db.execute("DELETE FROM poll_votes              WHERE student_id=$1", student_id)
        await db.execute("DELETE FROM advisor_appointments    WHERE student_id=$1", student_id)
        await db.execute("DELETE FROM advisor_student_notes   WHERE student_id=$1", student_id)
        await db.execute("DELETE FROM office_hours_bookings   WHERE student_id=$1", student_id)
        await db.execute("DELETE FROM parent_students         WHERE student_id=$1", student_id)
        await db.execute(
            "DELETE FROM direct_messages WHERE sender_id=$1 OR receiver_id=$1",
            str(user_id) if user_id else "0",
        )
        await db.execute("DELETE FROM proctoring_events       WHERE student_id=$1", student_id)
        await db.execute("DELETE FROM proctoring_sessions     WHERE student_id=$1", student_id)
        await db.execute("DELETE FROM students                WHERE student_id=$1", student_id)
        if user_id:
            await db.execute("DELETE FROM users WHERE id=$1", user_id)

    return {"ok": True, "deleted": student_id}


@router.get("/{student_id}/engagement-summary")
async def student_engagement(
    student_id: str,
    payload: dict = Depends(require_auth),
    db=Depends(get_db),
):
    """Engagement summary — student sees own data; doctor/admin see any."""
    caller_role = payload.get("role")
    caller_id   = payload.get("sub")

    if caller_role == "student":
        row = await db.fetchrow(
            "SELECT student_id FROM students WHERE user_id=$1", int(caller_id)
        )
        if not row or row["student_id"].upper() != student_id.upper():
            raise HTTPException(status_code=403, detail="Access denied")

    rows = await db.fetch(
        """SELECT
             emotion,
             COUNT(emotion) as emotion_count,
             AVG(engagement_score)*100 as avg_engagement,
             AVG(attention_score)*100  as avg_attention
           FROM emotion_records WHERE student_id=$1
           GROUP BY emotion ORDER BY emotion_count DESC""",
        student_id,
    )
    att = await db.fetchrow(
        """SELECT
             SUM(CASE WHEN status='present' THEN 1 ELSE 0 END) as attended,
             COUNT(*) as total
           FROM attendance WHERE student_id=$1""",
        student_id,
    )
    return {
        "emotion_breakdown": [dict(r) for r in rows],
        "attendance": dict(att) if att else {"attended": 0, "total": 0},
    }
