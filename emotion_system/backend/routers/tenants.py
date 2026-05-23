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

from fastapi import APIRouter, HTTPException, Depends, Request, File, UploadFile
from pydantic import BaseModel
from typing import Optional
import csv, io, zipfile, json, os
from database import get_db, init_tenant_schema
from auth_utils import require_role, hash_password

PHOTOS_BASE = os.path.abspath(
    os.path.join(os.path.dirname(__file__), '..', '..', 'student_photos')
)


def _try_encode_face(img_bytes: bytes):
    """Generate a Facenet512 face embedding. Returns list[float] or None."""
    try:
        import numpy as np
        import cv2
        from deepface import DeepFace
        nparr = np.frombuffer(img_bytes, np.uint8)
        img   = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            return None
        result = DeepFace.represent(
            img_path=img, model_name='Facenet512',
            enforce_detection=True, detector_backend='mtcnn',
        )
        if result:
            emb  = np.array(result[0]['embedding'])
            norm = np.linalg.norm(emb)
            return (emb / norm).tolist() if norm > 0 else emb.tolist()
    except Exception as e:
        print(f'[face] encoding error: {e}')
    return None

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


# ── Bulk student import ─────────────────────────────────────────────────────────

@router.post("/{schema}/import-students")
async def import_students_csv(
    schema: str,
    file: UploadFile = File(...),
    _: dict = Depends(_require_superadmin),
    db=Depends(get_db),
):
    """
    Bulk-create students from a CSV file.

    Required columns : student_id, full_name
    Optional columns : email, department, year, password
      - email    defaults to {student_id}@student.edu
      - year     defaults to 1
      - password defaults to {student_id}@EduSense2025
    """
    _validate_schema(schema)

    raw     = await file.read()
    content = raw.decode('utf-8-sig')   # strip BOM if present
    reader  = csv.DictReader(io.StringIO(content))

    created, skipped, errors = 0, 0, []

    for i, row in enumerate(reader, 1):
        sid   = (row.get('student_id') or '').strip()
        name  = (row.get('full_name')  or '').strip()
        email = (row.get('email')      or '').strip()
        dept  = (row.get('department') or '').strip()
        pwd   = (row.get('password')   or f'{sid}@EduSense2025').strip()

        try:
            year = int((row.get('year') or '1').strip())
        except ValueError:
            year = 1

        if not sid or not name:
            errors.append(f'Row {i}: student_id and full_name are required')
            continue

        if not email:
            email = f'{sid}@student.edu'

        hashed = hash_password(pwd)

        try:
            uid = await db.fetchval(f"""
                INSERT INTO "{schema}".users
                    (username, password, role, full_name, email)
                VALUES ($1, $2, 'student', $3, $4)
                ON CONFLICT DO NOTHING
                RETURNING id
            """, sid, hashed, name, email)

            if uid is None:
                skipped += 1
                continue

            await db.execute(f"""
                INSERT INTO "{schema}".students (student_id, user_id, department, year)
                VALUES ($1, $2, $3, $4)
                ON CONFLICT DO NOTHING
            """, sid, uid, dept, year)

            await db.execute(f"""
                INSERT INTO "{schema}".student_fees (student_id, paid, amount)
                VALUES ($1, TRUE, 1500)
                ON CONFLICT DO NOTHING
            """, sid)

            created += 1

        except Exception as e:
            errors.append(f'Row {i} ({sid}): {e}')

    return {
        'created': created,
        'skipped': skipped,
        'errors':  errors[:30],
    }


# ── Bulk photo import ───────────────────────────────────────────────────────────

@router.post("/{schema}/import-photos")
async def import_student_photos(
    schema: str,
    file: UploadFile = File(...),
    _: dict = Depends(_require_superadmin),
    db=Depends(get_db),
):
    """
    Extract a ZIP of student photos, save them, and generate face encodings.
    Each file inside the ZIP must be named {student_id}.jpg / .jpeg / .png
    Face encoding uses DeepFace Facenet512 if available on this server.
    Photos are saved regardless so the face engine can process them later.
    """
    _validate_schema(schema)

    content   = await file.read()
    photo_dir = os.path.join(PHOTOS_BASE, schema)
    os.makedirs(photo_dir, exist_ok=True)

    encoded, saved_only, failed, errors = 0, 0, 0, []

    try:
        with zipfile.ZipFile(io.BytesIO(content)) as zf:
            for name in zf.namelist():
                base = os.path.basename(name)
                if not base or not base.lower().endswith(('.jpg', '.jpeg', '.png')):
                    continue

                sid = os.path.splitext(base)[0].strip()
                if not sid:
                    continue

                img_bytes = zf.read(name)

                # 1. Save photo to disk
                try:
                    with open(os.path.join(photo_dir, f'{sid}.jpg'), 'wb') as fp:
                        fp.write(img_bytes)
                except Exception as e:
                    errors.append(f'{sid}: cannot save — {e}')
                    failed += 1
                    continue

                # 2. Update photo_path in students table
                await db.execute(f"""
                    UPDATE "{schema}".students
                    SET photo_path = $1
                    WHERE student_id = $2
                """, f'/photos/{schema}/{sid}.jpg', sid)

                # 3. Try to generate face encoding
                emb = _try_encode_face(img_bytes)
                if emb is not None:
                    await db.execute(f"""
                        INSERT INTO "{schema}".face_encodings (student_id, embedding)
                        VALUES ($1, $2)
                        ON CONFLICT (student_id)
                        DO UPDATE SET embedding = $2, updated_at = NOW()
                    """, sid, json.dumps(emb))
                    encoded += 1
                else:
                    saved_only += 1

    except zipfile.BadZipFile:
        raise HTTPException(status_code=400, detail='Invalid ZIP file')

    return {
        'encoded':    encoded,
        'saved_only': saved_only,
        'failed':     failed,
        'errors':     errors[:30],
        'note': (
            'All photos saved and face encodings generated.'
            if saved_only == 0 and failed == 0
            else f'{saved_only} photos saved (no face encoding — run bulk_register_faces.py on the server to generate them).'
            if failed == 0
            else f'{failed} photos failed to save.'
        ),
    }
