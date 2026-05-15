"""
ADD THESE TWO THINGS TO YOUR doctor_page.py:

1. Add this import at the top (with the other imports):
   from tkinter import messagebox

2. Replace your _tab_lectures method with the one below.

3. Add the _export_students_pdf method below _tab_lectures.
"""

# ═══════════════════════════════════════════════════
#  MY LECTURES  ← with Export PDF button per course
# ═══════════════════════════════════════════════════
def _tab_lectures(self, parent):
    ctk.CTkLabel(parent, text="📚  My Lectures",
                 font=ctk.CTkFont("Segoe UI", 22, "bold"),
                 text_color=COLORS["text"]).pack(anchor="w", padx=24, pady=(18, 10))

    courses = self._my_courses()

    if not courses:
        f = ctk.CTkFrame(parent, fg_color="transparent")
        f.pack(expand=True)
        ctk.CTkLabel(f, text="📚",
                     font=ctk.CTkFont("Segoe UI", 48)).pack(pady=(60, 8))
        ctk.CTkLabel(f, text="No lectures assigned yet.",
                     font=ctk.CTkFont("Segoe UI", 16, "bold"),
                     text_color=COLORS["text"]).pack()
        ctk.CTkLabel(f,
                     text="Ask your admin to assign courses to your account.\n"
                          f"Your doctor ID: {self.user.get('doctor_id', 'not set')}",
                     font=ctk.CTkFont("Segoe UI", 12),
                     text_color=COLORS["text3"],
                     justify="center").pack(pady=6)
        return

    sc = ctk.CTkScrollableFrame(parent, fg_color="transparent",
                                 scrollbar_button_color=COLORS["border2"])
    sc.pack(fill="both", expand=True, padx=16, pady=8)

    for c in courses:
        enrolled = len(self.store.course_enrollments.get(c["id"], []))
        att      = len(self.store.get_attendance(c["id"]))

        cf = ctk.CTkFrame(sc, fg_color=COLORS["card"],
                          corner_radius=12, border_width=1,
                          border_color=COLORS["border"])
        cf.pack(fill="x", padx=8, pady=6)

        # color accent bar
        accent = ctk.CTkFrame(cf, fg_color=c.get("color", COLORS["blue"]),
                               corner_radius=8, width=6)
        accent.pack(side="left", fill="y")

        info = ctk.CTkFrame(cf, fg_color="transparent")
        info.pack(side="left", fill="both", expand=True, padx=12, pady=12)

        ctk.CTkLabel(info,
                     text=f"{c['name']}  ({c['code']})",
                     font=ctk.CTkFont("Segoe UI", 14, "bold"),
                     text_color=COLORS["text"]).pack(anchor="w")
        ctk.CTkLabel(info,
                     text=f"🏛 {c.get('room','')}   ⏰ {c.get('time','')}   "
                          f"👥 {enrolled} enrolled   ✅ {att} attended",
                     font=ctk.CTkFont("Segoe UI", 11),
                     text_color=COLORS["text2"]).pack(anchor="w", pady=2)
        ctk.CTkLabel(info,
                     text=f"📅 {len(c.get('weeks', list(range(1,17))))} weeks  ·  "
                          f"🕐 {c.get('duration', 90)} min",
                     font=ctk.CTkFont("Segoe UI", 10),
                     text_color=COLORS["text3"]).pack(anchor="w")

        # buttons on the right
        btn_frame = ctk.CTkFrame(cf, fg_color="transparent")
        btn_frame.pack(side="right", padx=12, pady=8)

        ctk.CTkButton(btn_frame, text="📄 Export PDF",
                      width=130, height=34,
                      fg_color=COLORS["blue3"],
                      hover_color="#1e40af",
                      text_color="white",
                      font=ctk.CTkFont("Segoe UI", 11, "bold"),
                      corner_radius=8,
                      command=lambda course=c: self._export_students_pdf(course)
                      ).pack(pady=(0, 6))

        ctk.CTkButton(btn_frame, text="✅ Attendance",
                      width=130, height=34,
                      fg_color=COLORS["green_dim"],
                      hover_color=COLORS["green"],
                      text_color=COLORS["text"],
                      font=ctk.CTkFont("Segoe UI", 11),
                      corner_radius=8,
                      command=lambda cid=c["id"]: self._quick_att(cid)
                      ).pack()


# ═══════════════════════════════════════════════════
#  PDF EXPORT — Students enrolled in a course
# ═══════════════════════════════════════════════════
def _export_students_pdf(self, course: dict):
    """Generate a PDF with all students enrolled in this course."""
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.lib import colors
        from reportlab.lib.units import cm
        from reportlab.platypus import (SimpleDocTemplate, Paragraph, Spacer,
                                         Table, TableStyle)
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.enums import TA_CENTER, TA_LEFT
    except ImportError:
        from tkinter import messagebox
        messagebox.showerror(
            "Missing Library",
            "reportlab is not installed.\n\nRun:\n  pip install reportlab")
        return

    from tkinter import messagebox

    cid      = course["id"]
    students = self.store.get_enrolled_students(cid)
    if not students:
        messagebox.showwarning("No Students",
            f"No students enrolled in {course['name']}.")
        return

    # save path — Desktop
    desktop  = os.path.join(os.path.expanduser("~"), "Desktop")
    if not os.path.exists(desktop):
        desktop = os.path.expanduser("~")
    filename = f"{course['code']}_students_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
    path     = os.path.join(desktop, filename)

    # ── Build PDF ────────────────────────────────────
    doc  = SimpleDocTemplate(
        path, pagesize=A4,
        leftMargin=2*cm, rightMargin=2*cm,
        topMargin=2*cm,  bottomMargin=2*cm)

    styles = getSampleStyleSheet()
    story  = []

    # title style
    title_style = ParagraphStyle(
        "title", parent=styles["Title"],
        fontSize=20, textColor=colors.HexColor("#1E3A8A"),
        spaceAfter=6)
    sub_style = ParagraphStyle(
        "sub", parent=styles["Normal"],
        fontSize=11, textColor=colors.HexColor("#64748B"),
        spaceAfter=4)
    info_style = ParagraphStyle(
        "info", parent=styles["Normal"],
        fontSize=10, textColor=colors.HexColor("#374151"))

    # ── Header ───────────────────────────────────────
    story.append(Paragraph("EduSense", ParagraphStyle(
        "brand", parent=styles["Normal"],
        fontSize=11, textColor=colors.HexColor("#3B82F6"),
        spaceAfter=2)))
    story.append(Paragraph(f"{course['name']}  —  Student Roster", title_style))
    story.append(Paragraph(f"Course Code: {course['code']}  ·  "
                            f"Room: {course.get('room','')}  ·  "
                            f"Time: {course.get('time','')}",  sub_style))

    doctor = self.store.get_doctor(course.get("doctor_id", ""))
    doc_name = doctor["name"] if doctor else "—"
    story.append(Paragraph(f"Lecturer: {doc_name}  ·  "
                            f"Total Students: {len(students)}  ·  "
                            f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M')}",
                            sub_style))
    story.append(Spacer(1, 0.4*cm))

    # divider line via table
    story.append(Table([[""]], colWidths=[17*cm],
                        style=TableStyle([
                            ("LINEBELOW", (0,0), (-1,-1), 2,
                             colors.HexColor("#3B82F6"))])))
    story.append(Spacer(1, 0.4*cm))

    # ── Table ────────────────────────────────────────
    header = ["#", "Student ID", "Full Name", "Department",
              "Year", "Attendance", "Engagement"]
    col_w  = [1*cm, 2.4*cm, 4.8*cm, 3.8*cm, 1.4*cm, 2.2*cm, 2.2*cm]

    header_style = ParagraphStyle(
        "th", parent=styles["Normal"],
        fontSize=9, textColor=colors.white, fontName="Helvetica-Bold")
    cell_style = ParagraphStyle(
        "td", parent=styles["Normal"],
        fontSize=9, textColor=colors.HexColor("#111827"))

    data = [[Paragraph(h, header_style) for h in header]]

    for i, s in enumerate(students):
        att_val = s.get("attendance_rate", 0)
        eng_val = s.get("engagement", 0)
        # color-code attendance
        att_color = "#10B981" if att_val >= 75 else \
                    "#F59E0B" if att_val >= 50 else "#EF4444"
        row = [
            Paragraph(str(i + 1),          cell_style),
            Paragraph(s.get("id", ""),      cell_style),
            Paragraph(s.get("name", ""),    cell_style),
            Paragraph(s.get("dept", ""),    cell_style),
            Paragraph(f"Year {s.get('year','')}",  cell_style),
            Paragraph(f"<font color='{att_color}'><b>{att_val}%</b></font>",
                      cell_style),
            Paragraph(f"{eng_val}%",        cell_style),
        ]
        data.append(row)

    tbl = Table(data, colWidths=col_w, repeatRows=1)
    tbl.setStyle(TableStyle([
        # header row
        ("BACKGROUND",  (0, 0), (-1, 0), colors.HexColor("#1E3A8A")),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1),
         [colors.HexColor("#F8FAFC"), colors.HexColor("#EFF6FF")]),
        ("GRID",        (0, 0), (-1, -1), 0.4, colors.HexColor("#CBD5E1")),
        ("TOPPADDING",  (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING",(0,0), (-1, -1), 6),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING",(0, 0), (-1, -1), 6),
        ("VALIGN",      (0, 0), (-1, -1), "MIDDLE"),
        ("ROUNDEDCORNERS", [4]),
    ]))
    story.append(tbl)
    story.append(Spacer(1, 0.6*cm))

    # ── Footer note ──────────────────────────────────
    story.append(Paragraph(
        f"This report was generated automatically by EduSense — "
        f"Classroom Emotion & Attendance AI System.",
        ParagraphStyle("footer", parent=styles["Normal"],
                       fontSize=8, textColor=colors.HexColor("#94A3B8"),
                       alignment=TA_CENTER)))

    doc.build(story)

    messagebox.showinfo("PDF Exported",
        f"✅ PDF saved to Desktop:\n{filename}\n\n"
        f"{len(students)} students exported.")
