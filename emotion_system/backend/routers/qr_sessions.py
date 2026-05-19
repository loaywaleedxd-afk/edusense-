"""QR attendance sessions router."""
from fastapi import APIRouter, Depends, HTTPException
import aiosqlite, os, json, random, string
from datetime import datetime, timezone
from auth_utils import require_auth, require_role

router = APIRouter()
DB = os.getenv("DB_PATH", "emotion_system.db")


@router.post("/create")
async def create_qr(data: dict, payload: dict = Depends(require_role("doctor","admin"))):
    token = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
    async with aiosqlite.connect(DB) as db:
        await db.execute(
            "INSERT INTO qr_sessions (token, course_id, week, created_at, used_by) VALUES (?,?,?,?,?)",
            (token, data.get("courseId",""), int(data.get("week",1)),
             datetime.now(timezone.utc).isoformat(), "[]")
        )
        await db.commit()
    return {"token": token}


@router.post("/use")
async def use_qr(data: dict, payload: dict = Depends(require_auth)):
    token     = (data.get("token") or "").upper()
    student_id = data.get("studentId","")
    async with aiosqlite.connect(DB) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("SELECT * FROM qr_sessions WHERE token=?", (token,)) as cur:
            row = await cur.fetchone()
        if not row:
            raise HTTPException(400, "Invalid code")
        row = dict(row)
        age = (datetime.now(timezone.utc) - datetime.fromisoformat(
            row["created_at"].replace("Z","").split("+")[0]
        ).replace(tzinfo=timezone.utc)).total_seconds() / 60
        if age > 90:
            raise HTTPException(400, "Code expired (valid 90 min)")
        used = json.loads(row["used_by"] or "[]")
        if student_id in used:
            raise HTTPException(400, "Already checked in")
        used.append(student_id)
        await db.execute(
            "UPDATE qr_sessions SET used_by=? WHERE token=?",
            (json.dumps(used), token)
        )
        await db.execute(
            """INSERT OR IGNORE INTO attendance
               (student_id, lecture_id, week, status, method, confidence, date)
               VALUES (?,?,?,?,?,?,?)""",
            (student_id, row["course_id"], row["week"],
             "present", "qr", 1.0, datetime.now().strftime("%Y-%m-%d"))
        )
        await db.commit()
    return {"ok": True, "courseId": row["course_id"], "week": row["week"]}
