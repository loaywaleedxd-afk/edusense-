"""
routers/tenants.py — Tenant (University) Management
====================================================
SECRET ROLE: superadmin only.
No normal user (student / doctor / admin) can reach these routes.

Endpoints:
  GET    /api/super/tenants          — list all universities
  POST   /api/super/tenants          — create a new university
  PATCH  /api/super/tenants/{schema} — update name / domain
  DELETE /api/super/tenants/{schema} — deactivate (soft delete)
  GET    /api/super/tenants/{schema}/stats — student/user counts
"""

from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel
from typing import Optional
from database import get_db, init_tenant_schema
from auth_utils import require_role

router = APIRouter()

_require_superadmin = require_role("superadmin")


# ── Models ─────────────────────────────────────────────────────────────────────

class TenantCreate(BaseModel):
    schema_name: str          # e.g. "harvard"  — lowercase, no spaces
    name: str                 # e.g. "Harvard University"
    domain: str               # e.g. "harvard.edusense.com"
    contact_email: Optional[str] = None

class TenantUpdate(BaseModel):
    name: Optional[str] = None
    domain: Optional[str] = None
    contact_email: Optional[str] = None
    active: Optional[bool] = None


# ── Helpers ────────────────────────────────────────────────────────────────────

def _validate_schema(schema: str):
    import re
    if not re.match(r'^[a-z][a-z0-9_]{1,62}$', schema):
        raise HTTPException(
            status_code=400,
            detail="schema_name must be lowercase letters/numbers/underscores, 2-63 chars, start with a letter",
        )
    if schema in ("public", "pg_catalog", "information_schema", "superadmin"):
        raise HTTPException(status_code=400, detail=f"'{schema}' is a reserved schema name")


# ── Routes ─────────────────────────────────────────────────────────────────────

@router.get("")
async def list_tenants(
    _: dict = Depends(_require_superadmin),
    db=Depends(get_db),
):
    """List all registered universities."""
    rows = await db.fetch("""
        SELECT id, schema_name, name, domain, contact_email, active, created_at
        FROM public.tenants
        ORDER BY created_at DESC
    """)
    return [dict(r) for r in rows]


@router.post("", status_code=201)
async def create_tenant(
    body: TenantCreate,
    request: Request,
    _: dict = Depends(_require_superadmin),
    db=Depends(get_db),
):
    """Register a new university and initialise its schema."""
    schema = body.schema_name.lower().strip()
    _validate_schema(schema)

    # Check for duplicate
    existing = await db.fetchrow(
        "SELECT id FROM public.tenants WHERE schema_name=$1 OR domain=$2",
        schema, body.domain,
    )
    if existing:
        raise HTTPException(status_code=409, detail="Schema or domain already registered")

    # Insert into tenants registry
    await db.execute("""
        INSERT INTO public.tenants (schema_name, name, domain, contact_email, active)
        VALUES ($1, $2, $3, $4, TRUE)
    """, schema, body.name, body.domain, body.contact_email)

    # Create all tables in the new schema
    pool = request.app.state.pool
    await init_tenant_schema(pool, schema)

    return {
        "ok": True,
        "schema": schema,
        "name": body.name,
        "domain": body.domain,
        "message": f"University created. Point DNS: {body.domain} → your server IP",
    }


@router.get("/{schema}/stats")
async def tenant_stats(
    schema: str,
    _: dict = Depends(_require_superadmin),
    db=Depends(get_db),
):
    """Return student/user/course counts for a tenant schema."""
    _validate_schema(schema)

    # Check schema exists
    exists = await db.fetchrow(
        "SELECT id FROM public.tenants WHERE schema_name=$1", schema
    )
    if not exists:
        raise HTTPException(status_code=404, detail="Tenant not found")

    try:
        users    = await db.fetchval(f'SELECT COUNT(*) FROM "{schema}".users')
        students = await db.fetchval(f'SELECT COUNT(*) FROM "{schema}".students')
        lectures = await db.fetchval(f'SELECT COUNT(*) FROM "{schema}".lectures')
        emotions = await db.fetchval(f'SELECT COUNT(*) FROM "{schema}".emotion_records')
        attendance = await db.fetchval(
            f"SELECT COUNT(*) FROM \"{schema}\".attendance WHERE status='present'"
        )
    except Exception:
        users = students = lectures = emotions = attendance = 0

    return {
        "schema": schema,
        "users": users,
        "students": students,
        "lectures": lectures,
        "emotion_records": emotions,
        "attendance_present": attendance,
    }


@router.patch("/{schema}")
async def update_tenant(
    schema: str,
    body: TenantUpdate,
    _: dict = Depends(_require_superadmin),
    db=Depends(get_db),
):
    """Update university name, domain, or active status."""
    existing = await db.fetchrow(
        "SELECT id FROM public.tenants WHERE schema_name=$1", schema
    )
    if not existing:
        raise HTTPException(status_code=404, detail="Tenant not found")

    updates, vals = [], []
    idx = 1
    if body.name is not None:
        updates.append(f"name=${idx}"); vals.append(body.name); idx += 1
    if body.domain is not None:
        updates.append(f"domain=${idx}"); vals.append(body.domain); idx += 1
    if body.contact_email is not None:
        updates.append(f"contact_email=${idx}"); vals.append(body.contact_email); idx += 1
    if body.active is not None:
        updates.append(f"active=${idx}"); vals.append(body.active); idx += 1

    if not updates:
        return {"ok": True, "message": "Nothing to update"}

    vals.append(schema)
    await db.execute(
        f"UPDATE public.tenants SET {', '.join(updates)} WHERE schema_name=${idx}",
        *vals,
    )
    return {"ok": True, "schema": schema}


@router.delete("/{schema}")
async def deactivate_tenant(
    schema: str,
    _: dict = Depends(_require_superadmin),
    db=Depends(get_db),
):
    """Soft-delete: marks university as inactive. Schema is NOT dropped."""
    existing = await db.fetchrow(
        "SELECT id FROM public.tenants WHERE schema_name=$1", schema
    )
    if not existing:
        raise HTTPException(status_code=404, detail="Tenant not found")

    await db.execute(
        "UPDATE public.tenants SET active=FALSE WHERE schema_name=$1", schema
    )
    return {"ok": True, "message": f"'{schema}' deactivated. Data preserved."}
