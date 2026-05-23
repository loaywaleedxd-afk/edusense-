"""QR attendance sessions router."""
from fastapi import APIRouter, Depends, HTTPException
import os, json, random, string
from datetime import datetime, timezone
from database import get_db
from auth_utils import require_auth, require_role

router = APIRouter()


@router.post("/create")
async def create_qr(data: dict, payload: dict = Depends(require_role("doctor","admin")), db=Depends(get_db)):
    token = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
    await db.execute(
        "INSERT INTO qr_sessions (token, course_id, week, created_at, used_by) VALUES ($1,$2,$3,$4,$5)",
        token, data.get("courseId",""), int(data.get("week",1)),
        datetime.now(timezone.utc).isoformat(), "[]"
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
    age = (datetime.now(timezone.utc) - datetime.fromisoformat(
        str(row["created_at"]).replace("Z","").split("+")[0]
    ).replace(tzinfo=timezone.utc)).total_seconds() / 60
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
    await db.execute(
        """INSERT INTO attendance
           (student_id, lecture_id, week, status, method, confidence, date)
           VALUES ($1,$2,$3,$4,$5,$6,$7)
           ON CONFLICT DO NOTHING""",
        student_id, row["course_id"], row["week"],
        "present", "qr", 1.0, datetime.now().strftime("%Y-%m-%d")
    )
    return {"ok": True, "courseId": row["course_id"], "week": row["week"]}
