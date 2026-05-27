"""QR attendance sessions router."""
from fastapi import APIRouter, Depends, HTTPException
import os, json, random, string
from datetime import datetime, timezone, date as date_type
from database import get_db
from auth_utils import require_auth, require_role

router = APIRouter()


@router.post("/create")
async def create_qr(data: dict, payload: dict = Depends(require_role("doctor","admin")), db=Depends(get_db)):
    token = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
    await db.execute(
        "INSERT INTO qr_sessions (token, course_id, week, created_at, used_by) VALUES ($1,$2,$3,$4,$5)",
        token, data.get("courseId",""), int(data.get("week",1)),
        datetime.now(timezone.utc), "[]"   # asyncpg needs datetime object, not isoformat string
    )
    return {"token": token}


@router.post("/use")
async def use_qr(data: dict, payload: dict = Depends(require_auth), db=Depends(get_db)):
    token      = (data.get("token") or "").upper()
    student_id = data.get("studentId","")
    row = await db.fetchrow("SELECT * FROM qr_sessions WHERE token=$1", token)
    if not row:
        raise HTTPException(400, "Invalid code")
    row = dict(row)
    # created_at is a timezone-aware datetime from asyncpg — compute age directly
    created = row["created_at"]
    if hasattr(created, 'tzinfo') and created.tzinfo is None:
        created = created.replace(tzinfo=timezone.utc)
    age = (datetime.now(timezone.utc) - created).total_seconds() / 60
    if age > 90:
        raise HTTPException(400, "Code expired (valid 90 min)")
    used = json.loads(row["used_by"] or "[]")
    if student_id in used:
        raise HTTPException(400, "Already checked in")
    used.append(student_id)
    await db.execute(
        "UPDATE qr_sessions SET used_by=$1 WHERE token=$2",
        json.dumps(used), token
    )
    # Resolve the actual lecture_id from course_code (QR stores course_code, attendance needs lecture_id)
    lec_row = await db.fetchrow(
        "SELECT lecture_id FROM lectures WHERE course_code=$1 ORDER BY created_at DESC LIMIT 1",
        row["course_id"]
    )
    lecture_id = lec_row["lecture_id"] if lec_row else row["course_id"]

    # Check for duplicate attendance record first
    existing_att = await db.fetchrow(
        "SELECT id FROM attendance WHERE student_id=$1 AND lecture_id=$2 AND week=$3",
        student_id, lecture_id, row["week"]
    )
    if not existing_att:
        await db.execute(
            """INSERT INTO attendance
               (student_id, lecture_id, week, status, method, confidence, date)
               VALUES ($1,$2,$3,$4,$5,$6,$7)""",
            student_id, lecture_id, row["week"],
            "present", "qr", 1.0, date_type.today()
        )
    return {"ok": True, "courseId": row["course_id"], "week": row["week"]}
