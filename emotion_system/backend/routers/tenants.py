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
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
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

class AdminCreate(BaseModel):
    username:  str
    full_name: str
    email:     str
    password:  str

class SubscriptionUpdate(BaseModel):
    plan:                    Optional[str]  = None   # trial/basic/pro/enterprise
    billing_status:          Optional[str]  = None   # trial/active/overdue/suspended
    expires_at:              Optional[str]  = None   # ISO date string
    face_recognition_enabled: Optional[bool] = None
    max_students:            Optional[int]  = None


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
    """List all registered universities. Auto-suspends expired subscriptions."""
    # Auto-suspend any tenant whose subscription has expired
    await db.execute("""
        UPDATE public.tenants
        SET active = FALSE, billing_status = 'suspended'
        WHERE billing_status = 'active'
          AND expires_at IS NOT NULL
          AND expires_at < NOW()
    """)
    rows = await db.fetch("""
        SELECT id, schema_name, name, domain, contact_email, active,
               plan, billing_status, expires_at, face_recognition_enabled,
               max_students, created_at
        FROM public.tenants
        ORDER BY created_at DESC
    """)
    # Attach live student count for each tenant
    result = []
    for row in rows:
        d = dict(row)
        sc = row["schema_name"]
        try:
            d["student_count"] = await db.fetchval(
                f'SELECT COUNT(*) FROM "{sc}".students'
            )
        except Exception:
            d["student_count"] = 0
        result.append(d)
    return result


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


# ── Create admin account for a tenant ──────────────────────────────────────────

@router.post("/{schema}/create-admin", status_code=201)
async def create_admin_user(
    schema: str,
    body: AdminCreate,
    _: dict = Depends(_require_superadmin),
    db=Depends(get_db),
):
    """Create an admin user inside the tenant's schema."""
    _validate_schema(schema)

    if len(body.password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")

    hashed = hash_password(body.password)
    try:
        uid = await db.fetchval(f"""
            INSERT INTO "{schema}".users (username, password, role, full_name, email)
            VALUES ($1, $2, 'admin', $3, $4)
            RETURNING id
        """, body.username, hashed, body.full_name, body.email)
    except Exception as e:
        if 'unique' in str(e).lower():
            raise HTTPException(status_code=409, detail="Username or email already exists in this university")
        raise HTTPException(status_code=400, detail=str(e))

    return {"ok": True, "user_id": uid, "username": body.username, "schema": schema}


# ── Subscription / billing management ──────────────────────────────────────────

@router.patch("/{schema}/subscription")
async def update_subscription(
    schema: str,
    body: SubscriptionUpdate,
    _: dict = Depends(_require_superadmin),
    db=Depends(get_db),
):
    """Update plan, billing status, expiry, feature flags."""
    existing = await db.fetchrow(
        "SELECT id FROM public.tenants WHERE schema_name=$1", schema
    )
    if not existing:
        raise HTTPException(status_code=404, detail="Tenant not found")

    updates, vals = [], []
    idx = 1

    if body.plan is not None:
        updates.append(f"plan=${idx}"); vals.append(body.plan); idx += 1

    if body.billing_status is not None:
        updates.append(f"billing_status=${idx}"); vals.append(body.billing_status); idx += 1
        # Automatically sync active flag with billing status
        if body.billing_status == 'suspended':
            updates.append(f"active=${idx}"); vals.append(False); idx += 1
        elif body.billing_status in ('active', 'trial'):
            updates.append(f"active=${idx}"); vals.append(True); idx += 1

    if body.expires_at is not None:
        try:
            exp = datetime.fromisoformat(body.expires_at.replace('Z', '+00:00'))
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid expires_at date format (use ISO 8601)")
        updates.append(f"expires_at=${idx}"); vals.append(exp); idx += 1

    if body.face_recognition_enabled is not None:
        updates.append(f"face_recognition_enabled=${idx}")
        vals.append(body.face_recognition_enabled); idx += 1

    if body.max_students is not None:
        updates.append(f"max_students=${idx}"); vals.append(body.max_students); idx += 1

    if not updates:
        return {"ok": True, "message": "Nothing to update"}

    vals.append(schema)
    await db.execute(
        f"UPDATE public.tenants SET {', '.join(updates)} WHERE schema_name=${idx}",
        *vals,
    )
    return {"ok": True, "schema": schema}


# ── Export tenant data as ZIP of CSVs ──────────────────────────────────────────

@router.get("/{schema}/export")
async def export_tenant_data(
    schema: str,
    _: dict = Depends(_require_superadmin),
    db=Depends(get_db),
):
    """Download all university data as a ZIP of CSV files."""
    _validate_schema(schema)

    EXPORTS = {
        "students": f"""
            SELECT s.student_id, u.full_name, u.email, s.department, s.year
            FROM "{schema}".students s JOIN "{schema}".users u ON u.id = s.user_id
        """,
        "doctors": f"""
            SELECT d.doctor_id, u.full_name, u.email, d.department, d.title
            FROM "{schema}".doctors d JOIN "{schema}".users u ON u.id = d.user_id
        """,
        "lectures": f"""
            SELECT lecture_id, course_name, course_code, doctor_id, room,
                   scheduled_at, semester, capacity, status
            FROM "{schema}".lectures
        """,
        "attendance": f"""
            SELECT student_id, lecture_id, date, status, method, week
            FROM "{schema}".attendance
        """,
        "grades": f"""
            SELECT student_id, course_code, course_name, grade, doctor_id
            FROM "{schema}".grades
        """,
        "emotion_records": f"""
            SELECT student_id, lecture_id, timestamp, emotion, confidence,
                   attention_score, engagement_score
            FROM "{schema}".emotion_records
        """,
    }

    zip_buf = io.BytesIO()
    with zipfile.ZipFile(zip_buf, 'w', zipfile.ZIP_DEFLATED) as zf:
        for table, query in EXPORTS.items():
            try:
                rows = await db.fetch(query)
                if rows:
                    buf = io.StringIO()
                    w   = csv.DictWriter(buf, fieldnames=list(rows[0].keys()))
                    w.writeheader()
                    w.writerows([dict(r) for r in rows])
                    zf.writestr(f"{schema}_{table}.csv", buf.getvalue())
            except Exception:
                pass  # skip tables that error (e.g. don't exist yet)

    zip_buf.seek(0)
    filename = f"{schema}_export_{datetime.now().strftime('%Y%m%d')}.zip"
    return StreamingResponse(
        iter([zip_buf.read()]),
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# ── Storage usage ───────────────────────────────────────────────────────────────

@router.get("/{schema}/storage")
async def tenant_storage(
    schema: str,
    _: dict = Depends(_require_superadmin),
    db=Depends(get_db),
):
    """Return DB row counts and photo disk usage for a tenant."""
    _validate_schema(schema)

    tables = [
        "users", "students", "emotion_records", "attendance",
        "course_resources", "assignments", "submissions",
    ]
    row_counts: dict = {}
    for table in tables:
        try:
            row_counts[table] = await db.fetchval(
                f'SELECT COUNT(*) FROM "{schema}"."{table}"'
            ) or 0
        except Exception:
            row_counts[table] = 0

    # Photos on disk
    photo_dir   = os.path.join(PHOTOS_BASE, schema)
    photo_count = 0
    photo_bytes = 0
    if os.path.isdir(photo_dir):
        for fname in os.listdir(photo_dir):
            fp = os.path.join(photo_dir, fname)
            if os.path.isfile(fp):
                photo_count += 1
                photo_bytes += os.path.getsize(fp)

    photo_mb = round(photo_bytes / 1_048_576, 1)
    total_rows = sum(row_counts.values())

    return {
        "schema":       schema,
        "row_counts":   row_counts,
        "total_rows":   total_rows,
        "photos":       {"count": photo_count, "size_mb": photo_mb},
        "total_size_mb": round(total_rows * 0.001 + photo_mb, 1),  # rough estimate
    }


# ── Onboarding checklist ────────────────────────────────────────────────────────

@router.get("/{schema}/onboarding")
async def tenant_onboarding(
    schema: str,
    _: dict = Depends(_require_superadmin),
    db=Depends(get_db),
):
    """Return onboarding progress for a tenant."""
    _validate_schema(schema)

    try:
        admin_count    = await db.fetchval(
            f"SELECT COUNT(*) FROM \"{schema}\".users WHERE role='admin'"
        ) or 0
        student_count  = await db.fetchval(
            f'SELECT COUNT(*) FROM "{schema}".students'
        ) or 0
        photos_count   = await db.fetchval(
            f"SELECT COUNT(*) FROM \"{schema}\".students WHERE photo_path IS NOT NULL"
        ) or 0
        login_count    = await db.fetchval(
            f"SELECT COUNT(*) FROM \"{schema}\".users WHERE role != 'superadmin'"
        ) or 0
        dns_ok         = True  # we assume DNS is configured if tenant exists
    except Exception:
        admin_count = student_count = photos_count = login_count = 0
        dns_ok = False

    steps = [
        {"key": "university_created", "label": "University created",        "done": True},
        {"key": "admin_created",      "label": "Admin account set up",      "done": admin_count > 0},
        {"key": "students_imported",  "label": "Students imported",         "done": student_count > 0},
        {"key": "photos_uploaded",    "label": "Photos uploaded",           "done": photos_count > 0},
        {"key": "first_login",        "label": "First user login happened", "done": login_count > 0},
    ]

    completed = sum(1 for s in steps if s["done"])
    return {
        "schema":    schema,
        "steps":     steps,
        "completed": completed,
        "total":     len(steps),
        "percent":   round(100 * completed / len(steps)),
    }
