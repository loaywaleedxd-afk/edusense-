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
             ROUND(
               CAST(100.0 * SUM(CASE WHEN a.status='present' THEN 1 ELSE 0 END) AS numeric) /
               GREATEST(1, COUNT(a.id)), 1
             ) as attendance_rate,
             COUNT(a.id) as total_lectures,
             SUM(CASE WHEN a.status='present' THEN 1 ELSE 0 END) as attended
           FROM students s
           JOIN users u ON s.user_id = u.id
           LEFT JOIN attendance a ON s.student_id = a.student_id
           GROUP BY s.student_id, u.full_name, u.email, s.department, s.year
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
