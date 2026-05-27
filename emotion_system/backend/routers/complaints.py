"""Complaints / Appeals router."""
from fastapi import APIRouter, Depends
from database import get_db
from auth_utils import require_auth, require_role
from utils import parse_dt

router = APIRouter()


@router.get("/")
async def get_complaints(payload: dict = Depends(require_auth), db=Depends(get_db)):
    role = payload.get("role")
    uid  = payload.get("sub")
    if role == "student":
        rows = await db.fetch(
            """SELECT c.* FROM complaints c
               JOIN students s ON s.student_id = c.student_id
               WHERE s.user_id = $1 ORDER BY c.created_at DESC""",
            int(uid)
        )
    elif role == "doctor":
        # Match by explicit doctor_id OR by course (complaint's course_id taught by this doctor)
        rows = await db.fetch(
            """SELECT DISTINCT c.* FROM complaints c
               LEFT JOIN doctors d  ON d.doctor_id = c.doctor_id
               LEFT JOIN lectures l ON l.course_code = c.course_id
               LEFT JOIN doctors d2 ON d2.doctor_id = l.doctor_id
               WHERE d.user_id = $1 OR d2.user_id = $1
               ORDER BY c.created_at DESC""",
            int(uid)
        )
    else:
        rows = await db.fetch("SELECT * FROM complaints ORDER BY created_at DESC")
    return [dict(r) for r in rows]


@router.post("/")
async def upsert_complaint(data: dict, payload: dict = Depends(require_auth), db=Depends(get_db)):
    await db.execute(
        """INSERT INTO complaints
           (id, student_id, student_name, type, course_id, course_name,
            description, status, doctor_id, doctor_response, admin_response,
            created_at, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
           ON CONFLICT (id) DO UPDATE SET
             student_id=EXCLUDED.student_id, student_name=EXCLUDED.student_name,
             type=EXCLUDED.type, course_id=EXCLUDED.course_id,
             course_name=EXCLUDED.course_name, description=EXCLUDED.description,
             status=EXCLUDED.status, doctor_id=EXCLUDED.doctor_id,
             doctor_response=EXCLUDED.doctor_response, admin_response=EXCLUDED.admin_response,
             created_at=EXCLUDED.created_at, updated_at=EXCLUDED.updated_at""",
        data["id"], data.get("studentId",""), data.get("studentName",""),
        data.get("type","general"), data.get("courseId",""), data.get("courseName",""),
        data.get("description",""), data.get("status","pending"),
        data.get("doctorId",""), data.get("doctorResponse",""),
        data.get("adminResponse",""),
        parse_dt(data.get("createdAt")), parse_dt(data.get("updatedAt"))
    )
    return {"ok": True}


@router.put("/{complaint_id}")
async def update_complaint(complaint_id: str, data: dict,
                           payload: dict = Depends(require_role("doctor", "admin")),
                           db=Depends(get_db)):
    await db.execute(
        """UPDATE complaints
           SET status=$1, doctor_response=$2, admin_response=$3, updated_at=CURRENT_DATE
           WHERE id=$4""",
        data.get("status","pending"), data.get("doctorResponse",""),
        data.get("adminResponse",""), complaint_id
    )
    return {"ok": True}
