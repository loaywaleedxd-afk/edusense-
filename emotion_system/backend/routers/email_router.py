"""Email router — SMTP attendance reports and config management."""
from fastapi import APIRouter, HTTPException, Depends
from auth_utils import require_role
from pydantic import BaseModel
import smtplib, ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os, json
from datetime import datetime

from database import get_db

router = APIRouter()
CONFIG_FILE = os.path.join(os.path.dirname(__file__), "..", "email_config.json")


class EmailConfig(BaseModel):
    smtp_host:       str = "smtp.gmail.com"
    smtp_port:       int = 587
    sender_email:    str
    sender_password: str
    sender_name:     str = "EduSense"


class AttendanceEmailRequest(BaseModel):
    lecture_id:      str
    recipient_email: str


def _load_cfg():
    # Prefer environment variables — never stores password on disk that way
    env_user = os.getenv("SMTP_USER") or os.getenv("SMTP_EMAIL")
    env_pass = os.getenv("SMTP_PASS") or os.getenv("SMTP_PASSWORD")
    if env_user and env_pass:
        return {
            "smtp_host":       os.getenv("SMTP_HOST", "smtp.gmail.com"),
            "smtp_port":       int(os.getenv("SMTP_PORT", "587")),
            "sender_email":    env_user,
            "sender_password": env_pass,
            "sender_name":     os.getenv("SMTP_NAME", "EduSense"),
        }
    # Fall back to config file (legacy)
    if os.path.exists(CONFIG_FILE):
        with open(CONFIG_FILE) as f:
            return json.load(f)
    return None


@router.post("/config")
async def save_config(config: EmailConfig, payload: dict = Depends(require_role("admin"))):
    with open(CONFIG_FILE, "w") as f:
        json.dump(config.dict(), f, indent=2)
    return {"message": "Email configuration saved"}


@router.get("/config")
async def get_config(payload: dict = Depends(require_role("admin"))):
    cfg = _load_cfg()
    if not cfg:
        return {"configured": False}
    return {
        "configured":   True,
        "sender_email": cfg.get("sender_email"),
        "sender_name":  cfg.get("sender_name"),
        "smtp_host":    cfg.get("smtp_host"),
        "smtp_port":    cfg.get("smtp_port"),
    }


@router.post("/send-attendance")
async def send_attendance_email(
    req: AttendanceEmailRequest,
    payload: dict = Depends(require_role("doctor", "admin")),
    db=Depends(get_db)
):
    cfg = _load_cfg()
    if not cfg:
        raise HTTPException(400, "Email not configured. Go to Admin -> Settings -> Email Setup first.")

    lec = await db.fetchrow(
        """SELECT l.*, u.full_name as doctor_name
           FROM lectures l
           LEFT JOIN doctors d ON l.doctor_id = d.doctor_id
           LEFT JOIN users u   ON d.user_id   = u.id
           WHERE l.lecture_id = $1""",
        req.lecture_id
    )
    if not lec:
        raise HTTPException(404, "Lecture not found")
    lec = dict(lec)

    records = await db.fetch(
        """SELECT a.student_id, u.full_name as name, a.status, a.check_in_time
           FROM attendance a
           JOIN students s ON a.student_id = s.student_id
           JOIN users u    ON s.user_id    = u.id
           WHERE a.lecture_id = $1
           ORDER BY u.full_name""",
        req.lecture_id
    )
    records = [dict(r) for r in records]

    present = [r for r in records if r["status"] == "present"]
    absent  = [r for r in records if r["status"] != "present"]
    rate    = round(len(present) / max(1, len(records)) * 100, 1)

    rows_html = "".join(
        f"<tr>"
        f"<td style='padding:8px'>{r['name'] or r['student_id']}</td>"
        f"<td style='padding:8px'>{r['student_id']}</td>"
        f"<td style='padding:8px;color:{'#16a34a' if r['status']=='present' else '#dc2626'};font-weight:700'>"
        f"{'Present' if r['status']=='present' else 'Absent'}</td>"
        f"<td style='padding:8px'>{(str(r['check_in_time']) or '-')[:19]}</td>"
        f"</tr>"
        for r in records
    )

    date_str = (lec.get("scheduled_at") or "")[:10] or datetime.utcnow().strftime("%Y-%m-%d")
    html = f"""<html><body style="font-family:Arial,sans-serif;max-width:720px;margin:auto;color:#1e293b">
<div style="background:#1e293b;padding:20px 24px;border-radius:12px 12px 0 0">
  <h2 style="color:#fff;margin:0">EduSense Attendance Report</h2>
  <p style="color:#94a3b8;margin:4px 0 0">{lec['course_name']} &mdash; {lec['course_code']}</p>
</div>
<div style="background:#f8fafc;padding:20px 24px;border-radius:0 0 12px 12px;border:1px solid #e2e8f0">
  <p><b>Lecture:</b> {lec['lecture_id']} &nbsp;|&nbsp; <b>Room:</b> {lec.get('room','-')} &nbsp;|&nbsp; <b>Date:</b> {date_str}</p>
  <p><b>Instructor:</b> {lec.get('doctor_name') or 'N/A'}</p>
  <div style="display:flex;gap:12px;margin:16px 0">
    <div style="background:#dcfce7;padding:12px 20px;border-radius:8px;text-align:center;flex:1">
      <div style="font-size:28px;font-weight:900;color:#16a34a">{len(present)}</div>
      <div style="color:#16a34a;font-size:12px">Present</div>
    </div>
    <div style="background:#fee2e2;padding:12px 20px;border-radius:8px;text-align:center;flex:1">
      <div style="font-size:28px;font-weight:900;color:#dc2626">{len(absent)}</div>
      <div style="color:#dc2626;font-size:12px">Absent</div>
    </div>
    <div style="background:#dbeafe;padding:12px 20px;border-radius:8px;text-align:center;flex:1">
      <div style="font-size:28px;font-weight:900;color:#2563eb">{rate}%</div>
      <div style="color:#2563eb;font-size:12px">Rate</div>
    </div>
  </div>
  <table style="width:100%;border-collapse:collapse;background:#fff;border-radius:8px;overflow:hidden;border:1px solid #e2e8f0">
    <thead style="background:#1e293b;color:#fff">
      <tr><th style="padding:10px;text-align:left">Name</th><th style="padding:10px;text-align:left">Student ID</th><th style="padding:10px">Status</th><th style="padding:10px;text-align:left">Check-in</th></tr>
    </thead>
    <tbody>{rows_html}</tbody>
  </table>
  <p style="color:#94a3b8;font-size:11px;margin-top:16px">Generated by EduSense &middot; {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}</p>
</div>
</body></html>"""

    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"[EduSense] Attendance: {lec['course_name']} ({date_str}) - {rate}% present"
    msg["From"]    = f"{cfg['sender_name']} <{cfg['sender_email']}>"
    msg["To"]      = req.recipient_email
    msg.attach(MIMEText(html, "html"))

    try:
        ctx = ssl.create_default_context()
        with smtplib.SMTP(cfg["smtp_host"], cfg["smtp_port"]) as srv:
            srv.starttls(context=ctx)
            srv.login(cfg["sender_email"], cfg["sender_password"])
            srv.sendmail(cfg["sender_email"], req.recipient_email, msg.as_string())
    except Exception as e:
        raise HTTPException(500, f"SMTP error: {e}")

    return {
        "message": f"Report sent to {req.recipient_email}",
        "present": len(present),
        "absent":  len(absent),
        "rate":    rate,
    }
