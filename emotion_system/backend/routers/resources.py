"""Course resources router."""
from fastapi import APIRouter, Depends
import aiosqlite, os
from auth_utils import require_auth, require_role

router = APIRouter()
DB = os.getenv("DB_PATH", "emotion_system.db")


@router.get("/")
async def get_resources(payload: dict = Depends(require_auth)):
    async with aiosqlite.connect(DB) as db:
        db.row_factory = aiosqlite.Row
        role = payload.get("role")
        uid  = payload.get("sub")
        if role == "student":
            async with db.execute(
                """SELECT r.* FROM course_resources r
                   JOIN course_enrollments ce ON ce.course_id = r.course_id
                   JOIN students s ON s.student_id = ce.student_id
                   WHERE s.user_id = ? ORDER BY r.created_at DESC""",
                (int(uid),)
            ) as cur:
                rows = await cur.fetchall()
        elif role == "doctor":
            async with db.execute(
                """SELECT r.* FROM course_resources r
                   JOIN doctors d ON d.doctor_id = r.doctor_id
                   WHERE d.user_id = ? ORDER BY r.created_at DESC""",
                (int(uid),)
            ) as cur:
                rows = await cur.fetchall()
        else:
            async with db.execute("SELECT * FROM course_resources ORDER BY created_at DESC") as cur:
                rows = await cur.fetchall()
    return [dict(r) for r in rows]


@router.post("/")
async def add_resource(data: dict, payload: dict = Depends(require_role("doctor", "admin"))):
    async with aiosqlite.connect(DB) as db:
        await db.execute(
            """INSERT OR REPLACE INTO course_resources
               (id, course_id, week, title, url, type, description, doctor_id,
                file_name, file_size, file_data, created_at)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?)""",
            (data["id"], data.get("courseId",""), int(data.get("week",1)),
             data.get("title",""), data.get("url",""), data.get("type","link"),
             data.get("description",""), data.get("doctorId",""),
             data.get("fileName",""), int(data.get("fileSize",0)),
             data.get("fileData"), data.get("createdAt",""))
        )
        await db.commit()
    return {"ok": True}


@router.delete("/{res_id}")
async def delete_resource(res_id: str, payload: dict = Depends(require_role("doctor", "admin"))):
    async with aiosqlite.connect(DB) as db:
        await db.execute("DELETE FROM course_resources WHERE id=?", (res_id,))
        await db.commit()
    return {"ok": True}
