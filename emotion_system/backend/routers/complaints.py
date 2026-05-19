"""Complaints / Appeals router."""
from fastapi import APIRouter, Depends
import aiosqlite, os
from auth_utils import require_auth, require_role

router = APIRouter()
DB = os.getenv("DB_PATH", "emotion_system.db")


@router.get("/")
async def get_complaints(payload: dict = Depends(require_auth)):
    async with aiosqlite.connect(DB) as db:
        db.row_factory = aiosqlite.Row
        role = payload.get("role")
        uid  = payload.get("sub")
        if role == "student":
            async with db.execute(
                """SELECT c.* FROM complaints c
                   JOIN students s ON s.student_id = c.student_id
                   WHERE s.user_id = ? ORDER BY c.created_at DESC""",
                (int(uid),)
            ) as cur:
                rows = await cur.fetchall()
        elif role == "doctor":
            async with db.execute(
                """SELECT c.* FROM complaints c
                   JOIN doctors d ON d.doctor_id = c.doctor_id
                   WHERE d.user_id = ? ORDER BY c.created_at DESC""",
                (int(uid),)
            ) as cur:
                rows = await cur.fetchall()
        else:
            async with db.execute("SELECT * FROM complaints ORDER BY created_at DESC") as cur:
                rows = await cur.fetchall()
    return [dict(r) for r in rows]


@router.post("/")
async def upsert_complaint(data: dict, payload: dict = Depends(require_auth)):
    async with aiosqlite.connect(DB) as db:
        await db.execute(
            """INSERT OR REPLACE INTO complaints
               (id, student_id, student_name, type, course_id, course_name,
                description, status, doctor_id, doctor_response, admin_response,
                created_at, updated_at)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (data["id"], data.get("studentId",""), data.get("studentName",""),
             data.get("type","general"), data.get("courseId",""), data.get("courseName",""),
             data.get("description",""), data.get("status","pending"),
             data.get("doctorId",""), data.get("doctorResponse",""),
             data.get("adminResponse",""),
             data.get("createdAt",""), data.get("updatedAt",""))
        )
        await db.commit()
    return {"ok": True}


@router.put("/{complaint_id}")
async def update_complaint(complaint_id: str, data: dict,
                           payload: dict = Depends(require_role("doctor", "admin"))):
    async with aiosqlite.connect(DB) as db:
        await db.execute(
            """UPDATE complaints
               SET status=?, doctor_response=?, admin_response=?, updated_at=date('now')
               WHERE id=?""",
            (data.get("status","pending"), data.get("doctorResponse",""),
             data.get("adminResponse",""), complaint_id)
        )
        await db.commit()
    return {"ok": True}
