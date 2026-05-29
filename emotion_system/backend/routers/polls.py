"""Live Poll router — doctors create/end polls, students vote."""
from fastapi import APIRouter, HTTPException, Depends
from database import get_db
from auth_utils import require_auth, require_role
import uuid
import json

router = APIRouter()


@router.get("/active")
async def get_active_poll(
    payload: dict = Depends(require_auth),
    db=Depends(get_db),
):
    """Return the currently active poll with live vote counts, or null."""
    row = await db.fetchrow(
        "SELECT * FROM polls WHERE active=TRUE ORDER BY created_at DESC LIMIT 1"
    )
    if not row:
        return {}
    try:
        return await _enrich(db, dict(row))
    except Exception:
        return {}


@router.get("/")
async def list_polls(
    payload: dict = Depends(require_role("doctor", "admin")),
    db=Depends(get_db),
):
    rows = await db.fetch("SELECT * FROM polls ORDER BY created_at DESC LIMIT 50")
    result = []
    for r in rows:
        result.append(await _enrich(db, dict(r)))
    return result


@router.post("/")
async def create_poll(
    data: dict,
    payload: dict = Depends(require_role("doctor", "admin")),
    db=Depends(get_db),
):
    """Create a new poll (deactivates any currently active poll first)."""
    await db.execute("UPDATE polls SET active=FALSE WHERE active=TRUE")
    poll_id = str(uuid.uuid4())
    choices_raw = data.get("choices", [])
    choices_json = json.dumps([
        {"text": c if isinstance(c, str) else c.get("text", ""), "votes": 0}
        for c in choices_raw
    ])
    await db.execute(
        """INSERT INTO polls (id, question, choices, active, created_by)
           VALUES ($1, $2, $3, TRUE, $4)""",
        poll_id,
        data.get("question", "").strip(),
        choices_json,
        payload.get("sub"),
    )
    row = await db.fetchrow("SELECT * FROM polls WHERE id=$1", poll_id)
    return await _enrich(db, dict(row))


@router.put("/{poll_id}/end")
async def end_poll(
    poll_id: str,
    payload: dict = Depends(require_role("doctor", "admin")),
    db=Depends(get_db),
):
    await db.execute("UPDATE polls SET active=FALSE WHERE id=$1", poll_id)
    return {"ok": True}


@router.delete("/{poll_id}")
async def delete_poll(
    poll_id: str,
    payload: dict = Depends(require_role("doctor", "admin")),
    db=Depends(get_db),
):
    await db.execute("DELETE FROM poll_votes WHERE poll_id=$1", poll_id)
    await db.execute("DELETE FROM polls WHERE id=$1", poll_id)
    return {"ok": True}


@router.post("/{poll_id}/vote")
async def cast_vote(
    poll_id: str,
    data: dict,
    payload: dict = Depends(require_role("student")),
    db=Depends(get_db),
):
    """Student casts or changes their vote (one vote per poll)."""
    uid = payload.get("sub")
    stu_row = await db.fetchrow(
        "SELECT student_id FROM students WHERE user_id=$1", int(uid)
    )
    if not stu_row:
        raise HTTPException(status_code=403, detail="Student not found")
    student_id = stu_row["student_id"]

    poll = await db.fetchrow("SELECT active FROM polls WHERE id=$1", poll_id)
    if not poll or not poll["active"]:
        raise HTTPException(status_code=400, detail="Poll is not active")

    choice_idx = data.get("choice_idx")
    if choice_idx is None:
        raise HTTPException(status_code=400, detail="choice_idx required")

    await db.execute(
        """INSERT INTO poll_votes (poll_id, student_id, choice_idx)
           VALUES ($1, $2, $3)
           ON CONFLICT (poll_id, student_id) DO UPDATE SET choice_idx=$3, voted_at=NOW()""",
        poll_id, student_id, int(choice_idx),
    )
    return {"ok": True}


@router.get("/{poll_id}/my-vote")
async def my_vote(
    poll_id: str,
    payload: dict = Depends(require_auth),
    db=Depends(get_db),
):
    uid = payload.get("sub")
    stu_row = await db.fetchrow(
        "SELECT student_id FROM students WHERE user_id=$1", int(uid)
    )
    if not stu_row:
        return {"choice_idx": None}
    vote = await db.fetchrow(
        "SELECT choice_idx FROM poll_votes WHERE poll_id=$1 AND student_id=$2",
        poll_id, stu_row["student_id"],
    )
    return {"choice_idx": vote["choice_idx"] if vote else None}


async def _enrich(db, poll: dict) -> dict:
    """Attach live vote counts to each choice."""
    choices = json.loads(poll.get("choices") or "[]")
    vote_rows = await db.fetch(
        "SELECT choice_idx, COUNT(*) as cnt FROM poll_votes WHERE poll_id=$1 GROUP BY choice_idx",
        poll["id"],
    )
    vote_map = {r["choice_idx"]: r["cnt"] for r in vote_rows}
    for i, c in enumerate(choices):
        c["votes"] = vote_map.get(i, 0)
    poll["choices"] = choices
    poll["totalVotes"] = sum(c["votes"] for c in choices)
    return poll
