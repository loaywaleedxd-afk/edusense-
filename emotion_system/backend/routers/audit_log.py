"""Audit Log router — persists key admin/doctor actions to the DB."""
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional
from database import get_db
from auth_utils import require_auth, require_role

router = APIRouter()


class AuditEntry(BaseModel):
    action:  str
    details: Optional[str] = ""


@router.get("/")
async def get_audit_log(
    payload: dict = Depends(require_role("admin", "superadmin")),
    db=Depends(get_db),
):
    rows = await db.fetch(
        "SELECT * FROM audit_log ORDER BY created_at DESC LIMIT 500"
    )
    return [dict(r) for r in rows]


@router.post("/")
async def add_audit_entry(
    body: AuditEntry,
    payload: dict = Depends(require_role("admin", "doctor", "superadmin")),
    db=Depends(get_db),
):
    # Derive actor identity from JWT — never trust client-supplied name/role
    caller_id   = int(payload.get("sub"))
    caller_role = payload.get("role", "")
    user_row = await db.fetchrow(
        "SELECT full_name FROM users WHERE id=$1", caller_id
    )
    actor_name = user_row["full_name"] if user_row else "Unknown"

    await db.execute(
        """INSERT INTO audit_log (action, actor_role, actor_name, details)
           VALUES ($1, $2, $3, $4)""",
        body.action, caller_role, actor_name, body.details or ""
    )
    return {"ok": True}
