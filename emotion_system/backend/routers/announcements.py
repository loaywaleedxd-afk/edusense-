"""Announcements router."""
from fastapi import APIRouter, Depends, Request
from database import get_db
from auth_utils import require_auth, require_role
from notifier import manager
from utils import parse_dt
import uuid

router = APIRouter()


@router.get("/")
async def get_announcements(payload: dict = Depends(require_auth), db=Depends(get_db)):
    role = payload.get("role")
    uid  = payload.get("sub")
    if role == "student":
        rows = await db.fetch(
            """SELECT a.* FROM announcements a
               JOIN course_enrollments ce ON ce.course_id = a.course_id
               JOIN students s ON s.student_id = ce.student_id
               WHERE s.user_id = $1 ORDER BY a.created_at DESC""",
            int(uid)
        )
    elif role == "doctor":
        rows = await db.fetch(
            """SELECT a.* FROM announcements a
               JOIN doctors d ON d.doctor_id = a.doctor_id
               WHERE d.user_id = $1 ORDER BY a.created_at DESC""",
            int(uid)
        )
    else:
        rows = await db.fetch("SELECT * FROM announcements ORDER BY created_at DESC")
    return [dict(r) for r in rows]


@router.post("/")
async def add_announcement(
    data: dict,
    request: Request,
    payload: dict = Depends(require_role("doctor", "admin")),
    db=Depends(get_db),
):
    await db.execute(
        """INSERT INTO announcements
           (id, course_id, course_name, doctor_id, doctor_name, title, body, created_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
           ON CONFLICT (id) DO UPDATE SET
             course_id=EXCLUDED.course_id, course_name=EXCLUDED.course_name,
             doctor_id=EXCLUDED.doctor_id, doctor_name=EXCLUDED.doctor_name,
             title=EXCLUDED.title, body=EXCLUDED.body, created_at=EXCLUDED.created_at""",
        data.get("id") or str(uuid.uuid4()), data.get("courseId",""), data.get("courseName",""),
        data.get("doctorId",""), data.get("doctorName",""),
        data.get("title",""), data.get("body",""), parse_dt(data.get("createdAt"))
    )
    # Push to all enrolled students in real-time
    course_id = data.get("courseId","")
    if course_id:
        rows = await db.fetch(
            """SELECT s.user_id FROM students s
               JOIN course_enrollments ce ON ce.student_id = s.student_id
               WHERE ce.course_id = $1""",
            course_id,
        )
        notification = {
            "type": "announcement",
            "title": f"📢 {data.get('courseName', 'Course')}",
            "message": data.get("title", "New announcement"),
            "icon": "📢",
            "color": "#3b82f6",
        }
        for row in rows:
            if row["user_id"]:
                await manager.notify_user(str(row["user_id"]), notification)
    return {"ok": True}


@router.delete("/{ann_id}")
async def delete_announcement(ann_id: str, payload: dict = Depends(require_role("doctor", "admin")), db=Depends(get_db)):
    await db.execute("DELETE FROM announcements WHERE id=$1", ann_id)
    return {"ok": True}
