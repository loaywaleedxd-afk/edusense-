"""Course enrollment router."""
from fastapi import APIRouter, Depends
import aiosqlite, os
from auth_utils import require_auth, require_role

router = APIRouter()
DB = os.getenv("DB_PATH", "emotion_system.db")


@router.get("/")
async def get_enrollments(payload: dict = Depends(require_role("doctor","admin"))):
    """Return full enrollment map: { courseId: [studentId, ...] }"""
    async with aiosqlite.connect(DB) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("SELECT course_id, student_id FROM course_enrollments") as cur:
            rows = await cur.fetchall()
    result = {}
    for r in rows:
        result.setdefault(r["course_id"], []).append(r["student_id"])
    return result


@router.post("/bulk")
async def bulk_sync(data: dict, payload: dict = Depends(require_role("doctor","admin"))):
    """Sync the full enrollment map from the dataStore."""
    async with aiosqlite.connect(DB) as db:
        await db.execute("DELETE FROM course_enrollments")
        for course_id, student_ids in data.items():
            for sid in student_ids:
                await db.execute(
                    "INSERT OR IGNORE INTO course_enrollments (course_id, student_id) VALUES (?,?)",
                    (course_id, sid)
                )
        await db.commit()
    return {"ok": True}


@router.post("/{course_id}/{student_id}")
async def enroll(course_id: str, student_id: str, payload: dict = Depends(require_role("doctor","admin"))):
    async with aiosqlite.connect(DB) as db:
        await db.execute(
            "INSERT OR IGNORE INTO course_enrollments (course_id, student_id) VALUES (?,?)",
            (course_id, student_id)
        )
        await db.commit()
    return {"ok": True}


@router.delete("/{course_id}/{student_id}")
async def unenroll(course_id: str, student_id: str, payload: dict = Depends(require_role("doctor","admin"))):
    async with aiosqlite.connect(DB) as db:
        await db.execute(
            "DELETE FROM course_enrollments WHERE course_id=? AND student_id=?",
            (course_id, student_id)
        )
        await db.commit()
    return {"ok": True}
