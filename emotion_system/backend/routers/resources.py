"""Course resources router."""
from fastapi import APIRouter, Depends
from database import get_db
from auth_utils import require_auth, require_role
from utils import parse_dt

router = APIRouter()


@router.get("/")
async def get_resources(payload: dict = Depends(require_auth), db=Depends(get_db)):
    role = payload.get("role")
    uid  = payload.get("sub")
    if role == "student":
        rows = await db.fetch(
            """SELECT r.* FROM course_resources r
               JOIN course_enrollments ce ON ce.course_id = r.course_id
               JOIN students s ON s.student_id = ce.student_id
               WHERE s.user_id = $1 ORDER BY r.created_at DESC""",
            int(uid)
        )
    elif role == "doctor":
        rows = await db.fetch(
            """SELECT r.* FROM course_resources r
               JOIN doctors d ON d.doctor_id = r.doctor_id
               WHERE d.user_id = $1 ORDER BY r.created_at DESC""",
            int(uid)
        )
    else:
        rows = await db.fetch("SELECT * FROM course_resources ORDER BY created_at DESC")
    return [dict(r) for r in rows]


@router.post("/")
async def add_resource(data: dict, payload: dict = Depends(require_role("doctor", "admin")), db=Depends(get_db)):
    await db.execute(
        """INSERT INTO course_resources
           (id, course_id, week, title, url, type, description, doctor_id,
            file_name, file_size, file_data, created_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
           ON CONFLICT (id) DO UPDATE SET
             course_id=EXCLUDED.course_id, week=EXCLUDED.week, title=EXCLUDED.title,
             url=EXCLUDED.url, type=EXCLUDED.type, description=EXCLUDED.description,
             doctor_id=EXCLUDED.doctor_id, file_name=EXCLUDED.file_name,
             file_size=EXCLUDED.file_size, file_data=EXCLUDED.file_data,
             created_at=EXCLUDED.created_at""",
        data["id"], data.get("courseId",""), int(data.get("week",1)),
        data.get("title",""), data.get("url",""), data.get("type","link"),
        data.get("description",""), data.get("doctorId",""),
        data.get("fileName",""), int(data.get("fileSize",0)),
        data.get("fileData"), parse_dt(data.get("createdAt"))
    )
    return {"ok": True}


@router.delete("/{res_id}")
async def delete_resource(res_id: str, payload: dict = Depends(require_role("doctor", "admin")), db=Depends(get_db)):
    await db.execute("DELETE FROM course_resources WHERE id=$1", res_id)
    return {"ok": True}
