"""Course enrollment router."""
from fastapi import APIRouter, Depends
from database import get_db
from auth_utils import require_auth, require_role

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
    result = {}
    for r in rows:
        result.setdefault(r["course_id"], []).append(r["student_id"])
    return result


@router.get("/students/{course_code}")
async def get_course_students(
    course_code: str,
    payload: dict = Depends(require_role("doctor", "admin")),
    db=Depends(get_db),
):
    """Return enrolled and available students for a given course_code."""
    enrolled_rows = await db.fetch(
        """SELECT s.student_id, u.full_name AS name, u.photo
           FROM course_enrollments ce
           JOIN students s ON s.student_id = ce.student_id
           JOIN users u ON u.id = s.user_id
           WHERE ce.course_id = $1
           ORDER BY u.full_name""",
        course_code,
    )
    available_rows = await db.fetch(
        """SELECT s.student_id, u.full_name AS name, u.photo
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
