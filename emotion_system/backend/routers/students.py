"""Students router — protected by JWT auth."""
from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from database import get_db
from auth_utils import require_auth, require_role, hash_password

def _current_semester() -> str:
    month = datetime.utcnow().month
    year  = datetime.utcnow().year
    return f"{year}-S1" if month >= 9 else f"{year}-S2"

router = APIRouter()


class StudentCreate(BaseModel):
    student_id: str
    full_name: str
    email: str
    department: str
    year: int


@router.get("/")
async def list_students(
    semester: Optional[str] = Query(None),
    limit:    int            = Query(500, le=1000),
    offset:   int            = Query(0,   ge=0),
    payload: dict = Depends(require_role("doctor", "admin")),
    db=Depends(get_db),
):
    """Full student list — doctors and admins only.
       Optional ?semester=2025-S1 to filter GPA by semester.
       Defaults to current semester; falls back to all-time average if no semester grades exist.
    """
    sem = semester or _current_semester()
    rows = await db.fetch(
        """SELECT
             s.student_id                              AS id,
             u.full_name                               AS name,
             u.email,
             s.department                              AS dept,
             s.year,
             s.photo_path,
             ROUND(
               CAST(100.0 * SUM(CASE WHEN a.status='present' THEN 1 ELSE 0 END) AS numeric) /
               GREATEST(1, COUNT(a.id)), 1
             )                                         AS attendance_rate,
             COUNT(a.id)                               AS total_lectures,
             SUM(CASE WHEN a.status='present' THEN 1 ELSE 0 END) AS attended,
             COALESCE(
               (SELECT ROUND(AVG(g2.grade)::numeric,1) FROM grades g2
                WHERE g2.student_id=s.student_id AND g2.semester=$1),
               ROUND(AVG(g.grade)::numeric, 1)
             )                                         AS gpa,
             $1                                        AS gpa_semester
           FROM students s
           JOIN users u ON s.user_id = u.id
           LEFT JOIN attendance a ON s.student_id = a.student_id
           LEFT JOIN grades g ON g.student_id = s.student_id
           GROUP BY s.student_id, u.full_name, u.email, s.department, s.year, s.photo_path
           ORDER BY u.full_name
           LIMIT $2 OFFSET $3""",
        sem, limit, offset,
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
    plain = data.get("password", "").strip()
    dept  = data.get("department", "General")
    year  = int(data.get("year", 1))

    if not sid or not name:
        raise HTTPException(status_code=400, detail="student_id and name are required")
    if not plain:
        raise HTTPException(status_code=400, detail="Password is required when creating a student account")
    if len(plain) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")

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


@router.post("/bulk-year")
async def bulk_update_year(
    data: dict,
    payload: dict = Depends(require_role("admin")),
    db=Depends(get_db),
):
    """Promote all students currently in from_year → to_year — admin only."""
    from_year = int(data.get("from_year", 1))
    to_year   = int(data.get("to_year",   2))
    if from_year == to_year:
        raise HTTPException(status_code=400, detail="from_year and to_year must be different")
    result = await db.execute(
        "UPDATE students SET year=$1 WHERE year=$2", to_year, from_year
    )
    count = int(result.split()[-1]) if result else 0
    return {"ok": True, "updated": count, "from_year": from_year, "to_year": to_year}


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
