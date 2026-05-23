"""Course enrollment router."""
from fastapi import APIRouter, Depends
from database import get_db
from auth_utils import require_auth, require_role

router = APIRouter()


@router.get("/")
async def get_enrollments(payload: dict = Depends(require_role("doctor","admin")), db=Depends(get_db)):
    """Return full enrollment map: { courseId: [studentId, ...] }"""
    rows = await db.fetch("SELECT course_id, student_id FROM course_enrollments")
    result = {}
    for r in rows:
        result.setdefault(r["course_id"], []).append(r["student_id"])
    return result


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
