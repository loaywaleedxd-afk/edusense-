"""System alerts / notifications router."""
from fastapi import APIRouter, Depends
from database import get_db
from auth_utils import require_auth, require_role
from datetime import datetime, timezone
import uuid

router = APIRouter()


def _parse_dt(val):
    """Convert ISO string or None to datetime; fall back to now."""
    if val is None:
        return datetime.now(timezone.utc)
    if isinstance(val, datetime):
        return val
    try:
        return datetime.fromisoformat(str(val).replace("Z", "+00:00"))
    except Exception:
        return datetime.now(timezone.utc)


@router.get("/")
async def get_notifications(payload: dict = Depends(require_auth), db=Depends(get_db)):
    role = payload.get("role")
    uid  = payload.get("sub")
    if role == "student":
        rows = await db.fetch(
            """SELECT sa.* FROM system_alerts sa
               JOIN students s ON s.student_id = sa.student_id
               WHERE s.user_id = $1 ORDER BY sa.created_at DESC LIMIT 100""",
            int(uid)
        )
    elif role == "doctor":
        rows = await db.fetch(
            """SELECT sa.* FROM system_alerts sa
               JOIN doctors d ON d.doctor_id = sa.doctor_id
               WHERE d.user_id = $1 ORDER BY sa.created_at DESC LIMIT 100""",
            int(uid)
        )
    else:
        rows = await db.fetch(
            "SELECT * FROM system_alerts ORDER BY created_at DESC LIMIT 200"
        )
    return [dict(r) for r in rows]


@router.post("/")
async def add_notification(data: dict, payload: dict = Depends(require_auth), db=Depends(get_db)):
    """Upsert an alert — used by the frontend dataStore to sync writes."""
    await db.execute(
        """INSERT INTO system_alerts
           (id, type, title, message, student_id, doctor_id, course_id, alert_kind, is_read, created_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
           ON CONFLICT (id) DO UPDATE SET
             type=EXCLUDED.type, title=EXCLUDED.title, message=EXCLUDED.message,
             student_id=EXCLUDED.student_id, doctor_id=EXCLUDED.doctor_id,
             course_id=EXCLUDED.course_id, alert_kind=EXCLUDED.alert_kind,
             is_read=EXCLUDED.is_read, created_at=EXCLUDED.created_at""",
        data.get("id") or str(uuid.uuid4()), data.get("type","info"), data.get("title",""),
        data.get("message",""), data.get("studentId"),
        data.get("doctorId"), data.get("courseId"),
        data.get("alertKind"), False, _parse_dt(data.get("createdAt"))
    )
    return {"ok": True}


@router.put("/{alert_id}/read")
async def mark_read(alert_id: str, payload: dict = Depends(require_auth), db=Depends(get_db)):
    await db.execute("UPDATE system_alerts SET is_read=TRUE WHERE id=$1", alert_id)
    return {"ok": True}


@router.post("/bulk")
async def bulk_upsert_notifications(items: list[dict], payload: dict = Depends(require_auth), db=Depends(get_db)):
    """Sync a batch of alert objects in one call."""
    async with db.transaction():
        for data in items:
            await db.execute(
                """INSERT INTO system_alerts
                   (id, type, title, message, student_id, doctor_id, course_id, alert_kind, is_read, created_at)
                   VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
                   ON CONFLICT (id) DO UPDATE SET
                     type=EXCLUDED.type, title=EXCLUDED.title, message=EXCLUDED.message,
                     student_id=EXCLUDED.student_id, doctor_id=EXCLUDED.doctor_id,
                     course_id=EXCLUDED.course_id, alert_kind=EXCLUDED.alert_kind,
                     is_read=EXCLUDED.is_read, created_at=EXCLUDED.created_at""",
                data.get("id") or str(uuid.uuid4()), data.get("type","info"), data.get("title",""),
                data.get("message",""), data.get("studentId"),
                data.get("doctorId"), data.get("courseId"),
                data.get("alertKind"), bool(data.get("read")),
                _parse_dt(data.get("createdAt"))
            )
    return {"ok": True, "count": len(items)}


@router.put("/read-all")
async def mark_all_read(payload: dict = Depends(require_auth), db=Depends(get_db)):
    uid  = payload.get("sub")
    role = payload.get("role")
    if role == "student":
        await db.execute(
            """UPDATE system_alerts SET is_read=TRUE
               WHERE student_id IN (SELECT student_id FROM students WHERE user_id=$1)""",
            int(uid)
        )
    elif role == "doctor":
        await db.execute(
            """UPDATE system_alerts SET is_read=TRUE
               WHERE doctor_id IN (SELECT doctor_id FROM doctors WHERE user_id=$1)""",
            int(uid)
        )
    else:
        await db.execute("UPDATE system_alerts SET is_read=TRUE")
    return {"ok": True}
