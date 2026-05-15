"""
gui/email_service.py
====================
EduSense Email Notification System
Sends welcome emails to new students, doctors, and parents
when they are registered through the admin panel.

Usage:
    from gui.email_service import send_welcome_email

    send_welcome_email(
        to_email  = "student@example.com",
        to_name   = "Sara Johnson",
        username  = "sara.johnson",
        password  = "demo123",
        role      = "student",          # "student" | "doctor" | "parent"
        student_id= "S001",             # optional — for students/parents
    )
"""

import smtplib
import threading
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime

# ── Sender credentials ────────────────────────────────────────────────
SENDER_EMAIL    = "edusense.system@gmail.com"
SENDER_PASSWORD = "ujwc libl drso dysz"
SENDER_NAME     = "EduSense System"


# ══════════════════════════════════════════════════════════════════════
#  HTML EMAIL TEMPLATES
# ══════════════════════════════════════════════════════════════════════

def _build_html(to_name: str, username: str, password: str,
                role: str, student_id: str = "") -> str:

    role_display = {"student": "Student", "doctor": "Lecturer / Doctor",
                    "parent": "Parent"}.get(role, role.title())

    role_color   = {"student": "#3B82F6", "doctor": "#10B981",
                    "parent":  "#8B5CF6"}.get(role, "#3B82F6")

    role_icon    = {"student": "🎓", "doctor": "👨‍🏫",
                    "parent":  "👨‍👧"}.get(role, "👤")

    role_tips = {
        "student": """
            <li>📊 View your Dashboard to see your engagement and attendance stats</li>
            <li>📝 Check My Grades to see your exam results</li>
            <li>🎓 Generate your Academic Portfolio PDF from the Portfolio tab</li>
            <li>💬 Join your course Community Chat to communicate with your lecturer</li>
            <li>📅 View your Schedule to see all upcoming lectures</li>
        """,
        "doctor": """
            <li>📚 Go to My Lectures to see all your assigned courses</li>
            <li>📷 Use Live Session to auto-detect and mark student attendance</li>
            <li>📝 Enter exam grades in the Exam Results tab</li>
            <li>💬 Post announcements to students via Community Chat</li>
            <li>📊 Run R Analysis reports from the Analytics tab</li>
        """,
        "parent": """
            <li>📊 View your child's Overview to see attendance and engagement</li>
            <li>📝 Check Child Grades to monitor exam performance</li>
            <li>😊 View the Emotions tab to see how your child feels during lectures</li>
            <li>📅 Check the Schedule to see your child's upcoming lectures</li>
        """,
    }.get(role, "")

    id_row = f"""
        <tr>
            <td style="padding:10px 16px;background:#EFF6FF;font-weight:bold;
                       color:#1E3A8A;border-bottom:1px solid #CBD5E1;width:140px;">
                Student ID
            </td>
            <td style="padding:10px 16px;background:#F8FAFC;
                       border-bottom:1px solid #CBD5E1;font-family:monospace;
                       font-size:15px;color:#1E3A8A;font-weight:bold;">
                {student_id}
            </td>
        </tr>
    """ if student_id else ""

    year = datetime.now().year

    return f"""
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#0C172A;font-family:Arial,sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0C172A;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0"
               style="background:#0F2240;border-radius:16px;
                      border:1px solid #1E3A8A;overflow:hidden;max-width:600px;">

          <!-- ── HEADER ── -->
          <tr>
            <td style="background:linear-gradient(135deg,#1E3A8A,#2563EB);
                       padding:36px 40px;text-align:center;">
              <div style="font-size:38px;font-weight:900;color:#ffffff;
                          letter-spacing:2px;margin-bottom:6px;">
                EduSense
              </div>
              <div style="font-size:13px;color:#BFDBFE;letter-spacing:1px;">
                CLASSROOM EMOTION &amp; ATTENDANCE AI SYSTEM
              </div>
            </td>
          </tr>

          <!-- ── WELCOME BANNER ── -->
          <tr>
            <td style="background:{role_color};padding:18px 40px;text-align:center;">
              <div style="font-size:28px;margin-bottom:4px;">{role_icon}</div>
              <div style="font-size:18px;font-weight:bold;color:#ffffff;">
                Welcome, {to_name}!
              </div>
              <div style="font-size:13px;color:rgba(255,255,255,0.85);margin-top:4px;">
                Your {role_display} account has been created
              </div>
            </td>
          </tr>

          <!-- ── BODY ── -->
          <tr>
            <td style="padding:36px 40px;">

              <p style="color:#CBD5E1;font-size:15px;line-height:1.7;margin:0 0 24px;">
                Your EduSense account is ready. Use the credentials below to log in
                to the desktop application.
              </p>

              <!-- credentials box -->
              <table width="100%" cellpadding="0" cellspacing="0"
                     style="border-radius:12px;overflow:hidden;
                            border:1px solid #1E3A8A;margin-bottom:28px;">
                <tr>
                  <td colspan="2"
                      style="background:#1E3A8A;padding:12px 16px;
                             font-weight:bold;color:#ffffff;font-size:13px;
                             letter-spacing:1px;">
                    🔐  LOGIN CREDENTIALS
                  </td>
                </tr>
                <tr>
                  <td style="padding:10px 16px;background:#EFF6FF;font-weight:bold;
                             color:#1E3A8A;border-bottom:1px solid #CBD5E1;width:140px;">
                    Username
                  </td>
                  <td style="padding:10px 16px;background:#F8FAFC;
                             border-bottom:1px solid #CBD5E1;font-family:monospace;
                             font-size:15px;color:#1E3A8A;font-weight:bold;">
                    {username}
                  </td>
                </tr>
                <tr>
                  <td style="padding:10px 16px;background:#EFF6FF;font-weight:bold;
                             color:#1E3A8A;border-bottom:1px solid #CBD5E1;">
                    Password
                  </td>
                  <td style="padding:10px 16px;background:#F8FAFC;
                             border-bottom:1px solid #CBD5E1;font-family:monospace;
                             font-size:15px;color:#065F46;font-weight:bold;">
                    {password}
                  </td>
                </tr>
                <tr>
                  <td style="padding:10px 16px;background:#EFF6FF;font-weight:bold;
                             color:#1E3A8A;border-bottom:1px solid #CBD5E1;">
                    Role
                  </td>
                  <td style="padding:10px 16px;background:#F8FAFC;
                             border-bottom:1px solid #CBD5E1;
                             color:{role_color};font-weight:bold;">
                    {role_icon}  {role_display}
                  </td>
                </tr>
                {id_row}
              </table>

              <!-- tips -->
              <div style="background:#0C2340;border-radius:12px;
                          border-left:4px solid {role_color};
                          padding:20px 24px;margin-bottom:28px;">
                <div style="color:{role_color};font-weight:bold;
                            font-size:14px;margin-bottom:12px;">
                  ✅  Getting Started
                </div>
                <ul style="color:#CBD5E1;font-size:13px;
                           line-height:1.9;margin:0;padding-left:16px;">
                  {role_tips}
                </ul>
              </div>

              <!-- warning -->
              <div style="background:#1C1300;border-radius:10px;
                          border:1px solid #B45309;
                          padding:14px 18px;margin-bottom:28px;">
                <div style="color:#F59E0B;font-size:13px;line-height:1.7;">
                  ⚠️  <strong>Security Notice:</strong>
                  Please change your password after your first login.
                  Never share your credentials with anyone.
                </div>
              </div>

              <p style="color:#64748B;font-size:12px;text-align:center;margin:0;">
                This email was sent automatically by EduSense.<br>
                If you did not expect this email, please contact your administrator.
              </p>

            </td>
          </tr>

          <!-- ── FOOTER ── -->
          <tr>
            <td style="background:#0A1628;padding:20px 40px;
                       text-align:center;border-top:1px solid #1E3A8A;">
              <div style="color:#3B82F6;font-size:14px;font-weight:bold;
                          margin-bottom:4px;">
                EduSense
              </div>
              <div style="color:#475569;font-size:11px;">
                Classroom Emotion &amp; Attendance AI System &nbsp;·&nbsp; {year}
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>
"""


# ══════════════════════════════════════════════════════════════════════
#  PLAIN TEXT FALLBACK
# ══════════════════════════════════════════════════════════════════════

def _build_text(to_name, username, password, role, student_id="") -> str:
    role_display = {"student":"Student","doctor":"Doctor","parent":"Parent"}.get(role,role.title())
    sid_line = f"Student ID : {student_id}\n" if student_id else ""
    return f"""
Welcome to EduSense, {to_name}!

Your {role_display} account has been created.

LOGIN CREDENTIALS
─────────────────
Username   : {username}
Password   : {password}
Role       : {role_display}
{sid_line}
Please change your password after first login.

EduSense — Classroom Emotion & Attendance AI System
"""


# ══════════════════════════════════════════════════════════════════════
#  MAIN SEND FUNCTION
# ══════════════════════════════════════════════════════════════════════

def send_welcome_email(
        to_email:   str,
        to_name:    str,
        username:   str,
        password:   str,
        role:       str,
        student_id: str = "",
        on_success=None,
        on_error=None) -> None:
    """
    Send a welcome email to a newly registered user.
    Runs in a background thread so it never blocks the GUI.

    Parameters
    ----------
    to_email   : recipient email address
    to_name    : recipient full name
    username   : login username
    password   : login password
    role       : 'student' | 'doctor' | 'parent'
    student_id : optional student ID (shown in email for students/parents)
    on_success : optional callback() called on success
    on_error   : optional callback(error_msg) called on failure
    """
    def _send():
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = f"Welcome to EduSense — Your {role.title()} Account"
            msg["From"]    = f"{SENDER_NAME} <{SENDER_EMAIL}>"
            msg["To"]      = to_email

            text_part = MIMEText(
                _build_text(to_name, username, password, role, student_id),
                "plain", "utf-8")
            html_part = MIMEText(
                _build_html(to_name, username, password, role, student_id),
                "html", "utf-8")

            msg.attach(text_part)
            msg.attach(html_part)  # HTML shown if supported, text as fallback

            with smtplib.SMTP("smtp.gmail.com", 587) as server:
                server.ehlo()
                server.starttls()
                server.login(SENDER_EMAIL, SENDER_PASSWORD)
                server.sendmail(SENDER_EMAIL, to_email, msg.as_string())

            print(f"[EduSense Email] ✅ Sent to {to_email}")
            if on_success:
                on_success()

        except Exception as e:
            print(f"[EduSense Email] ❌ Failed: {e}")
            if on_error:
                on_error(str(e))

    # run in background thread — never blocks the GUI
    threading.Thread(target=_send, daemon=True).start()


# ══════════════════════════════════════════════════════════════════════
#  TEST — run this file directly to send a test email
#  python gui/email_service.py
# ══════════════════════════════════════════════════════════════════════
if __name__ == "__main__":
    import time

    print("Sending test emails...")

    send_welcome_email(
        to_email   = "edusense.system@gmail.com",  # sends to itself for testing
        to_name    = "Sara Johnson",
        username   = "sara.johnson",
        password   = "demo123",
        role       = "student",
        student_id = "S001",
    )

    send_welcome_email(
        to_email   = "edusense.system@gmail.com",
        to_name    = "Dr. Ahmed Smith",
        username   = "dr.smith",
        password   = "demo123",
        role       = "doctor",
    )

    send_welcome_email(
        to_email   = "edusense.system@gmail.com",
        to_name    = "Parent User",
        username   = "parent1",
        password   = "demo123",
        role       = "parent",
        student_id = "S001",
    )

    time.sleep(6)  # wait for background threads
    print("Done.")
