"""Course enrollment router."""
from fastapi import APIRouter, Depends, HTTPException
from database import get_db
from auth_utils import require_auth, require_role
import json, re

# ── Schedule conflict helpers (duplicated from enrollment_requests to keep routers independent) ──
_DAY_MAP = {
    'sun':0,'sunday':0,'0':0,
    'mon':1,'monday':1,'1':1,
    'tue':2,'tuesday':2,'2':2,
    'wed':3,'wednesday':3,'3':3,
    'thu':4,'thursday':4,'4':4,
}

def _parse_days(val):
    if not val:
        return set()
    lst = json.loads(val) if isinstance(val, str) else (val if isinstance(val, list) else [])
    out = set()
    for d in lst:
        if isinstance(d, int) and 0 <= d <= 4:
            out.add(d)
        elif isinstance(d, str):
            idx = _DAY_MAP.get(d.lower().strip())
            if idx is not None:
                out.add(idx)
    return out

def _parse_minutes(scheduled_at):
    if not scheduled_at:
        return None
    s = str(scheduled_at)
    m = re.search(r'[T ](\d{2}):(\d{2})', s)
    if m:
        return int(m.group(1)) * 60 + int(m.group(2))
    m = re.match(r'^(\d{1,2}):(\d{2})', s)
    if m:
        return int(m.group(1)) * 60 + int(m.group(2))
    return None

def _schedules_overlap(c1: dict, c2: dict) -> bool:
    if not (_parse_days(c1.get('days')) & _parse_days(c2.get('days'))):
        return False
    s1 = _parse_minutes(c1.get('scheduled_at'))
    s2 = _parse_minutes(c2.get('scheduled_at'))
    if s1 is None or s2 is None:
        return False
    e1 = s1 + (c1.get('duration_min') or 90)
    e2 = s2 + (c2.get('duration_min') or 90)
    return s1 < e2 and s2 < e1

from datetime import datetime

def _current_semester() -> str:
    month = datetime.utcnow().month
    year  = datetime.utcnow().year
    return f"{year}-S1" if month >= 9 else f"{year}-S2"

router = APIRouter()


@router.get("/")
async def get_enrollments(payload: dict = Depends(require_auth), db=Depends(get_db)):
    """Return enrollment map. Students see only their own; doctors/admins see all."""
    role = payload.get("role")
    uid  = payload.get("sub")
    if role == "student":
        rows = await db.fetch(
            """SELECT ce.course_id, ce.student_id FROM course_enrollments ce
               JOIN students s ON s.student_id = ce.student_id
               WHERE s.user_id = $1""",
            int(uid)
        )
    else:
        rows = await db.fetch("SELECT course_id, student_id FROM course_enrollments")
    return [{"course_id": r["course_id"], "student_id": r["student_id"]} for r in rows]


@router.get("/students/{course_code}")
async def get_course_students(
    course_code: str,
    semester: str = None,
    payload: dict = Depends(require_role("doctor", "admin")),
    db=Depends(get_db),
):
    """Return enrolled and available students for a given course_code."""
    sem = semester or _current_semester()
    enrolled_rows = await db.fetch(
        """SELECT s.student_id, u.full_name AS name, u.photo,
                  s.photo_path, s.department, u.email, s.year,
                  COALESCE(
                    (SELECT ROUND(AVG(g2.grade)::numeric,1) FROM grades g2
                     WHERE g2.student_id=s.student_id AND g2.semester=$2),
                    ROUND(AVG(g.grade)::numeric, 1)
                  ) AS gpa,
                  ROUND(
                    CAST(100.0 * SUM(CASE WHEN a.status='present' THEN 1 ELSE 0 END) AS numeric) /
                    GREATEST(1, COUNT(a.id)), 1
                  ) AS attendance_rate
           FROM course_enrollments ce
           JOIN students s ON s.student_id = ce.student_id
           JOIN users u ON u.id = s.user_id
           LEFT JOIN grades g ON g.student_id = s.student_id
           LEFT JOIN attendance a ON a.student_id = s.student_id
           WHERE ce.course_id = $1
           GROUP BY s.student_id, u.full_name, u.photo, s.photo_path, s.department, u.email, s.year
           ORDER BY u.full_name""",
        course_code, sem,
    )
    available_rows = await db.fetch(
        """SELECT s.student_id, u.full_name AS name, u.photo,
                  s.photo_path, s.department, u.email, s.year
           FROM students s
           JOIN users u ON u.id = s.user_id
           WHERE s.student_id NOT IN (
               SELECT student_id FROM course_enrollments WHERE course_id = $1
           )
           ORDER BY u.full_name""",
        course_code,
    )
    return {
        "enrolled":   [dict(r) for r in enrolled_rows],
        "available":  [dict(r) for r in available_rows],
    }


@router.post("/bulk")
async def bulk_sync(data: dict, payload: dict = Depends(require_role("doctor","admin")), db=Depends(get_db)):
    """Sync the full enrollment map from the dataStore."""
    async with db.transaction():
        await db.execute("DELETE FROM course_enrollments")
        for course_id, student_ids in data.items():
            for sid in student_ids:
                await db.execute(
                    "INSERT INTO course_enrollments (course_id, student_id) VALUES ($1,$2) ON CONFLICT DO NOTHING",
                    course_id, sid
                )
    return {"ok": True}


@router.post("/{course_id}/{student_id}")
async def enroll(course_id: str, student_id: str, payload: dict = Depends(require_role("doctor","admin")), db=Depends(get_db)):
    # Schedule conflict check
    new_course = await db.fetchrow(
        "SELECT days, scheduled_at, duration_min, course_name FROM lectures WHERE course_code=$1",
        course_id,
    )
    if new_course:
        enrolled_courses = await db.fetch(
            """SELECT l.days, l.scheduled_at, l.duration_min, l.course_name
               FROM course_enrollments ce
               JOIN lectures l ON l.course_code = ce.course_id
               WHERE ce.student_id = $1""",
            student_id,
        )
        for ec in enrolled_courses:
            if _schedules_overlap(dict(new_course), dict(ec)):
                raise HTTPException(
                    status_code=409,
                    detail=f"Schedule conflict: '{new_course['course_name']}' overlaps with '{ec['course_name']}' — cannot enroll."
                )
    await db.execute(
        "INSERT INTO course_enrollments (course_id, student_id) VALUES ($1,$2) ON CONFLICT DO NOTHING",
        course_id, student_id
    )
    return {"ok": True}


@router.delete("/{course_id}/{student_id}")
async def unenroll(course_id: str, student_id: str, payload: dict = Depends(require_role("doctor","admin")), db=Depends(get_db)):
    await db.execute(
        "DELETE FROM course_enrollments WHERE course_id=$1 AND student_id=$2",
        course_id, student_id
    )
    return {"ok": True}
