"""System alerts / notifications router."""
from fastapi import APIRouter, Depends
import aiosqlite, os
from auth_utils import require_auth, require_role

router = APIRouter()
DB = os.getenv("DB_PATH", "emotion_system.db")


@router.get("/")
async def get_notifications(payload: dict = Depends(require_auth)):
    async with aiosqlite.connect(DB) as db:
        db.row_factory = aiosqlite.Row
        role = payload.get("role")
        uid  = payload.get("sub")
        if role == "student":
            async with db.execute(
                """SELECT sa.* FROM system_alerts sa
                   JOIN students s ON s.student_id = sa.student_id
                   WHERE s.user_id = ? ORDER BY sa.created_at DESC LIMIT 100""",
                (int(uid),)
            ) as cur:
                rows = await cur.fetchall()
        elif role == "doctor":
            async with db.execute(
                """SELECT sa.* FROM system_alerts sa
                   JOIN doctors d ON d.doctor_id = sa.doctor_id
                   WHERE d.user_id = ? ORDER BY sa.created_at DESC LIMIT 100""",
                (int(uid),)
            ) as cur:
                rows = await cur.fetchall()
        else:
            async with db.execute(
                "SELECT * FROM system_alerts ORDER BY created_at DESC LIMIT 200"
            ) as cur:
                rows = await cur.fetchall()
    return [dict(r) for r in rows]


@router.post("/")
async def add_notification(data: dict, payload: dict = Depends(require_auth)):
    """Upsert an alert — used by the frontend dataStore to sync writes."""
    async with aiosqlite.connect(DB) as db:
        await db.execute(
            """INSERT OR REPLACE INTO system_alerts
               (id, type, title, message, student_id, doctor_id, course_id, alert_kind, is_read, created_at)
               VALUES (?,?,?,?,?,?,?,?,?,?)""",
            (data["id"], data.get("type","info"), data.get("title",""),
             data.get("message",""), data.get("studentId"),
             data.get("doctorId"), data.get("courseId"),
             data.get("alertKind"), 0, data.get("createdAt",""))
        )
        await db.commit()
    return {"ok": True}


@router.post("/bulk")
async def bulk_upsert_notifications(items: list[dict], payload: dict = Depends(require_auth)):
    """Sync a batch of alert objects in one call."""
    async with aiosqlite.connect(DB) as db:
        for data in items:
            await db.execute(
                """INSERT OR REPLACE INTO system_alerts
                   (id, type, title, message, student_id, doctor_id, course_id, alert_kind, is_read, created_at)
                   VALUES (?,?,?,?,?,?,?,?,?,?)""",
                (data["id"], data.get("type","info"), data.get("title",""),
                 data.get("message",""), data.get("studentId"),
                 data.get("doctorId"), data.get("courseId"),
                 data.get("alertKind"), 1 if data.get("read") else 0,
                 data.get("createdAt",""))
            )
        await db.commit()
    return {"ok": True, "count": len(items)}


@router.put("/{alert_id}/read")
async def mark_read(alert_id: str, payload: dict = Depends(require_auth)):
    async with aiosqlite.connect(DB) as db:
        await db.execute("UPDATE system_alerts SET is_read=1 WHERE id=?", (alert_id,))
        await db.commit()
    return {"ok": True}


@router.put("/read-all")
async def mark_all_read(payload: dict = Depends(require_auth)):
    uid  = payload.get("sub")
    role = payload.get("role")
    async with aiosqlite.connect(DB) as db:
        if role == "student":
            await db.execute(
                """UPDATE system_alerts SET is_read=1
                   WHERE student_id IN (SELECT student_id FROM students WHERE user_id=?)""",
                (int(uid),)
            )
        elif role == "doctor":
            await db.execute(
                """UPDATE system_alerts SET is_read=1
                   WHERE doctor_id IN (SELECT doctor_id FROM doctors WHERE user_id=?)""",
                (int(uid),)
            )
        else:
            await db.execute("UPDATE system_alerts SET is_read=1")
        await db.commit()
    return {"ok": True}
