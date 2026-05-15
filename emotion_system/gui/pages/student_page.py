"""
Student Dashboard — all student views + Grades + Portfolio + Community Chat + Moodle
"""
import customtkinter as ctk
import tkinter as tk
from tkinter import messagebox
import random, os, threading
from datetime import datetime
from gui.theme     import COLORS, EMOTION_ICONS
from gui.components import (Sidebar, Topbar, StatCard, Card, Badge,
                              Separator, DataTable, LineChart, BarChart,
                              DonutChart, EmotionBarsWidget, ScheduleItem)
from gui.photo_helper import async_photo, get_photo


def _letter_grade(g: float) -> str:
    if g >= 90: return "A+"
    if g >= 85: return "A"
    if g >= 80: return "B+"
    if g >= 75: return "B"
    if g >= 70: return "C+"
    if g >= 65: return "C"
    if g >= 60: return "D+"
    if g >= 50: return "D"
    return "F"

def _grade_color(g: float) -> str:
    if g >= 75: return COLORS.get("green",  "#10b981")
    if g >= 50: return COLORS.get("amber",  "#f59e0b")
    return COLORS.get("red", "#ef4444")


class StudentPage(ctk.CTkFrame):
    NAV = [
        {"id": "dashboard",  "icon": "📊", "label": "Dashboard"},
        {"id": "attendance", "icon": "✅", "label": "My Attendance"},
        {"id": "emotions",   "icon": "😊", "label": "My Emotions"},
        {"id": "schedule",   "icon": "📅", "label": "Schedule"},
        {"id": "performance","icon": "📈", "label": "Performance"},
        {"id": "grades",     "icon": "📝", "label": "My Grades"},
        {"id": "portfolio",  "icon": "🎓", "label": "My Portfolio"},
        {"id": "chat",       "icon": "💬", "label": "Community"},
        {"id": "moodle",     "icon": "🌐", "label": "Moodle"},
    ]

    def __init__(self, parent, user: dict, on_logout, **kw):
        super().__init__(parent, fg_color=COLORS["bg"], corner_radius=0, **kw)
        self._user  = user
        self._store = parent.store

        sid = user.get("student_id", "") or user.get("id", "")
        self._stu = self._store.get_student(sid) or self._store.students[0]

        if not hasattr(self._store, "exam_results"):
            self._store.exam_results = {}
        if not hasattr(self._store, "chat_messages"):
            self._store.chat_messages = {}

        self._sidebar = Sidebar(self, self.NAV, self._on_nav)
        self._sidebar.pack(side="left", fill="y")

        right = ctk.CTkFrame(self, fg_color="transparent", corner_radius=0)
        right.pack(side="left", fill="both", expand=True)

        self._topbar = Topbar(right, user, on_logout)
        self._topbar.pack(fill="x")
        Separator(right, COLORS["border"]).pack(fill="x")

        self._content = ctk.CTkScrollableFrame(
            right, fg_color=COLORS["bg"], corner_radius=0,
            scrollbar_button_color=COLORS["border2"])
        self._content.pack(fill="both", expand=True)

        self._on_nav("dashboard")

    def _on_nav(self, page_id: str):
        for w in self._content.winfo_children():
            w.destroy()
        self._topbar.page_label.configure(text={
            "dashboard":   "Dashboard",
            "attendance":  "My Attendance",
            "emotions":    "My Emotions",
            "schedule":    "Schedule",
            "performance": "Performance",
            "grades":      "My Grades",
            "portfolio":   "My Portfolio",
            "chat":        "Community Chat",
            "moodle":      "Moodle",
        }.get(page_id, page_id.title()))
        fn = getattr(self, f"_page_{page_id}", None)
        if fn:
            fn(self._content)

    # ══════════════════════════════════════════════════════
    #  MOODLE
    # ══════════════════════════════════════════════════════
    def _page_moodle(self, parent):
        f = ctk.CTkFrame(parent, fg_color="transparent")
        f.place(relx=0.5, rely=0.5, anchor="center")
        logo = ctk.CTkFrame(f, fg_color="#F98012", corner_radius=60,
                             width=120, height=120)
        logo.pack(pady=(0, 16))
        logo.pack_propagate(False)
        ctk.CTkLabel(logo, text="M",
                     font=ctk.CTkFont("Segoe UI", 64, "bold"),
                     text_color="white").place(relx=0.5, rely=0.5, anchor="center")
        ctk.CTkLabel(f, text="Moodle",
                     font=ctk.CTkFont("Segoe UI", 28, "bold"),
                     text_color=COLORS["text"]).pack()
        ctk.CTkLabel(f, text="University Learning Management System",
                     font=ctk.CTkFont("Segoe UI", 13),
                     text_color=COLORS["text2"]).pack(pady=(4, 20))
        ctk.CTkButton(f, text="🌐  Open Moodle",
                      font=ctk.CTkFont("Segoe UI", 14, "bold"),
                      fg_color="#F98012", hover_color="#e07000",
                      text_color="white", width=220, height=46,
                      corner_radius=12,
                      command=lambda: messagebox.showinfo(
                          "Moodle",
                          "Moodle integration coming soon!\n\n"
                          "This feature will connect to your\n"
                          "university's Moodle portal.")
                      ).pack(pady=4)
        ctk.CTkLabel(f, text="⚠️  Prototype — not connected",
                     font=ctk.CTkFont("Segoe UI", 11),
                     text_color=COLORS["text3"]).pack(pady=(12, 0))

    # ══════════════════════════════════════════════════════
    #  MY GRADES
    # ══════════════════════════════════════════════════════
    def _page_grades(self, parent):
        ctk.CTkLabel(parent, text="📝  My Exam Results",
                     font=ctk.CTkFont("Segoe UI", 22, "bold"),
                     text_color=COLORS["text"]).pack(anchor="w", padx=24, pady=(18, 10))
        sid     = self._stu.get("id", "")
        results = self._store.exam_results.get(sid, {})
        if not results:
            f = ctk.CTkFrame(parent, fg_color="transparent")
            f.pack(expand=True)
            ctk.CTkLabel(f, text="📝", font=ctk.CTkFont("Segoe UI", 48)).pack(pady=(60, 8))
            ctk.CTkLabel(f, text="No grades available yet.",
                         font=ctk.CTkFont("Segoe UI", 16, "bold"),
                         text_color=COLORS["text"]).pack()
            ctk.CTkLabel(f, text="Your lecturer has not entered grades yet.",
                         font=ctk.CTkFont("Segoe UI", 12),
                         text_color=COLORS["text3"]).pack(pady=6)
            return
        grades  = [v["grade"] for v in results.values()]
        avg     = round(sum(grades) / len(grades), 1)
        passed  = sum(1 for g in grades if g >= 50)
        highest = max(grades)
        stats_row = ctk.CTkFrame(parent, fg_color="transparent")
        stats_row.pack(fill="x", padx=24, pady=8)
        for lbl, val, col in [
            ("Subjects Graded", len(grades),  COLORS["blue"]),
            ("Average",         f"{avg}%",     COLORS["amber"]),
            ("Passed",          passed,         COLORS["green"]),
            ("Highest",         f"{highest}%", COLORS["purple"]),
        ]:
            c = ctk.CTkFrame(stats_row, fg_color=COLORS["card"],
                             corner_radius=12, border_width=1,
                             border_color=COLORS["border"])
            c.pack(side="left", expand=True, fill="both", padx=8)
            ctk.CTkLabel(c, text=str(val),
                         font=ctk.CTkFont("Segoe UI", 24, "bold"),
                         text_color=col).pack(pady=(14, 2))
            ctk.CTkLabel(c, text=lbl,
                         font=ctk.CTkFont("Segoe UI", 11),
                         text_color=COLORS["text2"]).pack(pady=(0, 12))
        sc = ctk.CTkScrollableFrame(parent, fg_color="transparent",
                                     scrollbar_button_color=COLORS["border2"])
        sc.pack(fill="both", expand=True, padx=16, pady=8)
        for cid, rec in results.items():
            grade  = rec.get("grade", 0)
            date   = rec.get("date", "")
            course = next((c for c in self._store.courses if c["id"] == cid), None)
            cname  = course["name"] if course else cid
            ccode  = course["code"] if course else cid
            gc     = _grade_color(grade)
            card   = ctk.CTkFrame(sc, fg_color=COLORS["card"],
                                  corner_radius=12, border_width=1,
                                  border_color=COLORS["border"])
            card.pack(fill="x", padx=4, pady=6)
            ctk.CTkFrame(card, fg_color=gc, corner_radius=8,
                          width=6).pack(side="left", fill="y")
            info = ctk.CTkFrame(card, fg_color="transparent")
            info.pack(side="left", fill="both", expand=True, padx=14, pady=14)
            ctk.CTkLabel(info, text=f"{cname}  ({ccode})",
                         font=ctk.CTkFont("Segoe UI", 14, "bold"),
                         text_color=COLORS["text"]).pack(anchor="w")
            if date:
                ctk.CTkLabel(info, text=f"Date: {date}",
                             font=ctk.CTkFont("Segoe UI", 10),
                             text_color=COLORS["text3"]).pack(anchor="w")
            gr = ctk.CTkFrame(card, fg_color="transparent")
            gr.pack(side="right", padx=20, pady=10)
            ctk.CTkLabel(gr, text=f"{grade}%",
                         font=ctk.CTkFont("Segoe UI", 28, "bold"),
                         text_color=gc).pack()
            ctk.CTkLabel(gr, text=_letter_grade(grade),
                         font=ctk.CTkFont("Segoe UI", 16, "bold"),
                         text_color=gc).pack()
            sc_col = COLORS.get("green","#10b981") if grade>=50 else COLORS.get("red","#ef4444")
            ctk.CTkLabel(gr, text="✅ Pass" if grade >= 50 else "❌ Fail",
                         font=ctk.CTkFont("Segoe UI", 11),
                         text_color=sc_col).pack()

    # ══════════════════════════════════════════════════════
    #  PORTFOLIO
    # ══════════════════════════════════════════════════════
    def _page_portfolio(self, parent):
        s   = self._stu
        sid = s.get("id", "")

        ctk.CTkLabel(parent, text="🎓  My Academic Portfolio",
                     font=ctk.CTkFont("Segoe UI", 22, "bold"),
                     text_color=COLORS["text"]).pack(anchor="w", padx=24, pady=(18, 4))
        ctk.CTkLabel(parent, text="Your complete academic year summary",
                     font=ctk.CTkFont("Segoe UI", 12),
                     text_color=COLORS["text2"]).pack(anchor="w", padx=24)

        # preview card
        preview = ctk.CTkFrame(parent, fg_color=COLORS["card"],
                               corner_radius=16, border_width=1,
                               border_color=COLORS["border"])
        preview.pack(fill="x", padx=24, pady=16)

        hrow = ctk.CTkFrame(preview, fg_color=COLORS["blue3"], corner_radius=12)
        hrow.pack(fill="x", padx=16, pady=(16, 8))
        ph = ctk.CTkFrame(hrow, fg_color="transparent")
        ph.pack(padx=20, pady=16, anchor="w")
        pl = ctk.CTkLabel(ph, text="", width=80, height=80)
        pl.pack(side="left", padx=(0, 16))
        async_photo(pl, sid, s.get("emoji","👤"), s.get("color", COLORS["blue"]), (80, 80))
        info = ctk.CTkFrame(ph, fg_color="transparent")
        info.pack(side="left")
        ctk.CTkLabel(info, text=s.get("name",""),
                     font=ctk.CTkFont("Segoe UI", 20, "bold"),
                     text_color="white").pack(anchor="w")
        ctk.CTkLabel(info,
                     text=f"{sid}  ·  {s.get('dept','')}  ·  Year {s.get('year','')}",
                     font=ctk.CTkFont("Segoe UI", 12),
                     text_color="#bfdbfe").pack(anchor="w")
        ctk.CTkLabel(info, text=f"GPA: {s.get('gpa',0.0)}  ·  {s.get('email','')}",
                     font=ctk.CTkFont("Segoe UI", 11),
                     text_color="#bfdbfe").pack(anchor="w")

        results = self._store.exam_results.get(sid, {})
        grades  = [v["grade"] for v in results.values()]
        avg_g   = round(sum(grades)/len(grades), 1) if grades else 0
        att_recs= self._store.get_student_attendance(sid)

        srow = ctk.CTkFrame(preview, fg_color="transparent")
        srow.pack(fill="x", padx=16, pady=8)
        for lbl, val, col in [
            ("Attendance",     f"{s.get('attendance_rate',0)}%", COLORS["green"]),
            ("Avg Grade",      f"{avg_g}%",                      COLORS["blue"]),
            ("Engagement",     f"{s.get('engagement',0)}%",      COLORS["amber"]),
            ("Courses Graded", str(len(grades)),                  COLORS["purple"]),
        ]:
            b = ctk.CTkFrame(srow, fg_color=COLORS["bg3"], corner_radius=10)
            b.pack(side="left", expand=True, fill="both", padx=6)
            ctk.CTkLabel(b, text=str(val),
                         font=ctk.CTkFont("Segoe UI", 22, "bold"),
                         text_color=col).pack(pady=(12, 2))
            ctk.CTkLabel(b, text=lbl,
                         font=ctk.CTkFont("Segoe UI", 10),
                         text_color=COLORS["text2"]).pack(pady=(0, 10))

        if results:
            ctk.CTkLabel(preview, text="Exam Results",
                         font=ctk.CTkFont("Segoe UI", 13, "bold"),
                         text_color=COLORS["text"]).pack(anchor="w", padx=16, pady=(8, 4))
            for cid, rec in list(results.items())[:4]:
                g      = rec.get("grade", 0)
                course = next((c for c in self._store.courses if c["id"] == cid), None)
                cname  = course["name"] if course else cid
                gc     = _grade_color(g)
                gr     = ctk.CTkFrame(preview, fg_color=COLORS["bg3"], corner_radius=8)
                gr.pack(fill="x", padx=16, pady=2)
                ctk.CTkLabel(gr, text=cname,
                             font=ctk.CTkFont("Segoe UI", 11),
                             text_color=COLORS["text"]).pack(side="left", padx=12, pady=6)
                ctk.CTkLabel(gr, text=f"{g}%  {_letter_grade(g)}",
                             font=ctk.CTkFont("Segoe UI", 11, "bold"),
                             text_color=gc).pack(side="right", padx=12)

        ctk.CTkFrame(preview, fg_color="transparent", height=12).pack()

        ctk.CTkButton(parent, text="📄  Generate Portfolio PDF",
                      font=ctk.CTkFont("Segoe UI", 14, "bold"),
                      fg_color=COLORS["blue3"], hover_color="#1e40af",
                      text_color="white", height=50, corner_radius=12,
                      command=lambda: self._generate_portfolio(s)
                      ).pack(fill="x", padx=24, pady=8)
        ctk.CTkLabel(parent,
                     text="PDF will be saved to your Desktop automatically",
                     font=ctk.CTkFont("Segoe UI", 11),
                     text_color=COLORS["text3"]).pack(pady=(0, 8))

    def _generate_portfolio(self, s: dict):
        try:
            from reportlab.lib.pagesizes import A4
            from reportlab.lib import colors as rl
            from reportlab.lib.units import cm
            from reportlab.platypus import (SimpleDocTemplate, Paragraph,
                                             Spacer, Table, TableStyle,
                                             HRFlowable)
            from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
            from reportlab.lib.enums import TA_CENTER, TA_RIGHT
            from reportlab.pdfbase import pdfmetrics
            from reportlab.pdfbase.ttfonts import TTFont
        except ImportError:
            messagebox.showerror("Missing Library", "Run:  pip install reportlab")
            return

        FONT = "Helvetica"
        for fp in [r"C:\Windows\Fonts\Arial.ttf",
                   r"C:\Windows\Fonts\calibri.ttf",
                   r"C:\Windows\Fonts\tahoma.ttf"]:
            if os.path.exists(fp):
                try:
                    fn = os.path.splitext(os.path.basename(fp))[0]
                    pdfmetrics.registerFont(TTFont(fn, fp))
                    FONT = fn
                    break
                except Exception:
                    pass

        # safe style builder — never passes fontName twice
        styles = getSampleStyleSheet()
        def ps(name, **kw):
            kw.setdefault("fontName", FONT)
            return ParagraphStyle(name, parent=styles["Normal"], **kw)

        sid      = s.get("id", "")
        results  = self._store.exam_results.get(sid, {})
        grades   = [v["grade"] for v in results.values()]
        avg_g    = round(sum(grades)/len(grades), 1) if grades else 0
        att      = s.get("attendance_rate", 0)
        eng      = s.get("engagement", 0)
        att_recs = self._store.get_student_attendance(sid)
        passed   = sum(1 for g in grades if g >= 50)

        desktop  = os.path.join(os.path.expanduser("~"), "Desktop")
        if not os.path.exists(desktop):
            desktop = os.path.expanduser("~")
        filename = f"Portfolio_{sid}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
        path     = os.path.join(desktop, filename)

        try:
            doc   = SimpleDocTemplate(path, pagesize=A4,
                                       leftMargin=1.8*cm, rightMargin=1.8*cm,
                                       topMargin=1.5*cm, bottomMargin=1.5*cm)
            story = []

            # ── header band ──────────────────────────────
            hdr_data = [[
                Paragraph("EduSense", ps("brand", fontSize=10,
                           textColor=rl.white)),
                Paragraph("<b>ACADEMIC PORTFOLIO</b>", ps("ptitle", fontSize=16,
                           textColor=rl.white, alignment=TA_CENTER)),
                Paragraph(datetime.now().strftime("%Y-%m-%d"),
                          ps("pdate", fontSize=10,
                             textColor=rl.HexColor("#bfdbfe"),
                             alignment=TA_RIGHT)),
            ]]
            hdr_tbl = Table(hdr_data, colWidths=[4*cm, 9.4*cm, 4*cm])
            hdr_tbl.setStyle(TableStyle([
                ("BACKGROUND",   (0,0),(-1,-1), rl.HexColor("#1E3A8A")),
                ("TOPPADDING",   (0,0),(-1,-1), 14),
                ("BOTTOMPADDING",(0,0),(-1,-1), 14),
                ("LEFTPADDING",  (0,0),(-1,-1), 10),
                ("RIGHTPADDING", (0,0),(-1,-1), 10),
                ("VALIGN",       (0,0),(-1,-1), "MIDDLE"),
            ]))
            story.append(hdr_tbl)
            story.append(Spacer(1, 0.3*cm))

            # ── student info ─────────────────────────────
            info_data = [[
                Paragraph(f"<b>{s.get('name','')}</b>",
                          ps("sname", fontSize=18,
                             textColor=rl.HexColor("#1E3A8A"))),
                Paragraph(
                    f"ID: {sid}  ·  {s.get('dept','')}  ·  Year {s.get('year','')}<br/>"
                    f"Email: {s.get('email','')}  ·  GPA: {s.get('gpa',0.0)}",
                    ps("sinfo", fontSize=10,
                       textColor=rl.HexColor("#374151"))),
            ]]
            info_tbl = Table(info_data, colWidths=[8*cm, 9.4*cm])
            info_tbl.setStyle(TableStyle([
                ("BACKGROUND",   (0,0),(-1,-1), rl.HexColor("#EFF6FF")),
                ("TOPPADDING",   (0,0),(-1,-1), 10),
                ("BOTTOMPADDING",(0,0),(-1,-1), 10),
                ("LEFTPADDING",  (0,0),(-1,-1), 12),
                ("VALIGN",       (0,0),(-1,-1), "MIDDLE"),
                ("GRID",         (0,0),(-1,-1), 0.3, rl.HexColor("#BFDBFE")),
            ]))
            story.append(info_tbl)
            story.append(Spacer(1, 0.4*cm))

            # ── stats row ────────────────────────────────
            stats_data = [[
                Paragraph(f"<b>{att}%</b><br/>Attendance",
                          ps("sc0", fontSize=11,
                             textColor=rl.HexColor("#065F46"), alignment=TA_CENTER)),
                Paragraph(f"<b>{avg_g}%</b><br/>Avg Grade",
                          ps("sc1", fontSize=11,
                             textColor=rl.HexColor("#1E3A8A"), alignment=TA_CENTER)),
                Paragraph(f"<b>{eng}%</b><br/>Engagement",
                          ps("sc2", fontSize=11,
                             textColor=rl.HexColor("#78350F"), alignment=TA_CENTER)),
                Paragraph(f"<b>{passed}/{len(grades)}</b><br/>Passed",
                          ps("sc3", fontSize=11,
                             textColor=rl.HexColor("#4C1D95"), alignment=TA_CENTER)),
                Paragraph(f"<b>{len(att_recs)}</b><br/>Sessions",
                          ps("sc4", fontSize=11,
                             textColor=rl.HexColor("#064E3B"), alignment=TA_CENTER)),
            ]]
            stats_tbl = Table(stats_data, colWidths=[3.44*cm]*5)
            stats_tbl.setStyle(TableStyle([
                ("BACKGROUND", (0,0),(0,-1), rl.HexColor("#D1FAE5")),
                ("BACKGROUND", (1,0),(1,-1), rl.HexColor("#DBEAFE")),
                ("BACKGROUND", (2,0),(2,-1), rl.HexColor("#FEF3C7")),
                ("BACKGROUND", (3,0),(3,-1), rl.HexColor("#EDE9FE")),
                ("BACKGROUND", (4,0),(4,-1), rl.HexColor("#D1FAE5")),
                ("TOPPADDING",    (0,0),(-1,-1), 10),
                ("BOTTOMPADDING", (0,0),(-1,-1), 10),
                ("GRID",          (0,0),(-1,-1), 0.5, rl.white),
                ("ALIGN",         (0,0),(-1,-1), "CENTER"),
                ("VALIGN",        (0,0),(-1,-1), "MIDDLE"),
            ]))
            story.append(stats_tbl)
            story.append(Spacer(1, 0.4*cm))

            # ── exam results ─────────────────────────────
            story.append(Paragraph("<b>Exam Results</b>",
                          ps("sec", fontSize=13,
                             textColor=rl.HexColor("#1E3A8A"), spaceAfter=6)))
            if results:
                th = ps("th", fontSize=9, textColor=rl.white)
                td = ps("td", fontSize=9, textColor=rl.HexColor("#111827"))
                g_data = [[Paragraph(f"<b>{h}</b>", th) for h in
                           ["#","Course","Code","Grade","Letter","Status"]]]
                for i,(cid,rec) in enumerate(results.items()):
                    g    = rec.get("grade", 0)
                    cobj = next((c for c in self._store.courses if c["id"]==cid), None)
                    ac   = "#10B981" if g>=75 else "#F59E0B" if g>=50 else "#EF4444"
                    g_data.append([
                        Paragraph(str(i+1), td),
                        Paragraph(cobj["name"] if cobj else cid, td),
                        Paragraph(cid, td),
                        Paragraph(f"<font color='{ac}'><b>{g}%</b></font>", td),
                        Paragraph(f"<font color='{ac}'>{_letter_grade(g)}</font>", td),
                        Paragraph("Pass" if g>=50 else "Fail", td),
                    ])
                g_tbl = Table(g_data,
                              colWidths=[0.6*cm,5.5*cm,1.8*cm,1.8*cm,1.5*cm,1.5*cm],
                              repeatRows=1)
                g_tbl.setStyle(TableStyle([
                    ("BACKGROUND",    (0,0),(-1,0), rl.HexColor("#1E3A8A")),
                    ("ROWBACKGROUNDS",(0,1),(-1,-1),
                     [rl.HexColor("#F8FAFC"), rl.HexColor("#EFF6FF")]),
                    ("GRID",          (0,0),(-1,-1), 0.4, rl.HexColor("#CBD5E1")),
                    ("TOPPADDING",    (0,0),(-1,-1), 5),
                    ("BOTTOMPADDING", (0,0),(-1,-1), 5),
                    ("LEFTPADDING",   (0,0),(-1,-1), 6),
                    ("VALIGN",        (0,0),(-1,-1), "MIDDLE"),
                ]))
                story.append(g_tbl)
            else:
                story.append(Paragraph("No grades recorded yet.",
                              ps("ng", fontSize=10,
                                 textColor=rl.HexColor("#94A3B8"))))

            story.append(Spacer(1, 0.4*cm))

            # ── emotion profile ───────────────────────────
            story.append(Paragraph("<b>Emotion Profile</b>",
                          ps("sec2", fontSize=13,
                             textColor=rl.HexColor("#1E3A8A"), spaceAfter=6)))
            emo_rows = [[
                Paragraph(e["emotion"].title(),
                          ps(f"em{i}", fontSize=9, textColor=rl.HexColor("#374151"))),
                Paragraph(f"{e['pct']}%",
                          ps(f"ep{i}", fontSize=9,
                             textColor=rl.HexColor("#374151"), alignment=TA_RIGHT))
            ] for i,e in enumerate(self._store.emotion_dist[:6])]
            emo_tbl = Table(emo_rows, colWidths=[4*cm, 2*cm])
            emo_tbl.setStyle(TableStyle([
                ("ROWBACKGROUNDS",(0,0),(-1,-1),
                 [rl.HexColor("#F8FAFC"), rl.HexColor("#EFF6FF")]),
                ("GRID",(0,0),(-1,-1),0.3,rl.HexColor("#CBD5E1")),
                ("TOPPADDING",(0,0),(-1,-1),4),
                ("BOTTOMPADDING",(0,0),(-1,-1),4),
                ("LEFTPADDING",(0,0),(-1,-1),8),
            ]))

            # engagement trend
            trend = self._store.trend_data
            eng_rows = [[
                Paragraph(lbl, ps(f"tl{j}", fontSize=8,
                          textColor=rl.HexColor("#6B7280"), alignment=TA_CENTER)),
                Paragraph(f"{val}%", ps(f"tv{j}", fontSize=8,
                          textColor=rl.HexColor("#1E3A8A"), alignment=TA_CENTER))
            ] for j,(lbl,val) in enumerate(
                zip(trend["labels"][:8], trend["engagement"][:8]))]
            eng_tbl = Table(eng_rows, colWidths=[1.5*cm, 1.5*cm])
            eng_tbl.setStyle(TableStyle([
                ("ROWBACKGROUNDS",(0,0),(-1,-1),
                 [rl.HexColor("#F8FAFC"), rl.HexColor("#EFF6FF")]),
                ("GRID",(0,0),(-1,-1),0.3,rl.HexColor("#CBD5E1")),
                ("TOPPADDING",(0,0),(-1,-1),3),
                ("BOTTOMPADDING",(0,0),(-1,-1),3),
            ]))

            combined = Table([[
                Table([[Paragraph("<b>Emotion Distribution</b>",
                        ps("esh", fontSize=10, textColor=rl.HexColor("#374151")))],
                       [emo_tbl]], colWidths=[6*cm]),
                Table([[Paragraph("<b>Engagement by Week</b>",
                        ps("esh2", fontSize=10, textColor=rl.HexColor("#374151")))],
                       [eng_tbl]], colWidths=[3*cm]),
            ]], colWidths=[9*cm, 8.4*cm])
            story.append(combined)
            story.append(Spacer(1, 0.4*cm))

            # ── footer ────────────────────────────────────
            story.append(HRFlowable(width="100%", thickness=1,
                          color=rl.HexColor("#3B82F6")))
            story.append(Spacer(1, 0.2*cm))
            story.append(Paragraph(
                f"Generated by EduSense — Classroom Emotion &amp; Attendance AI System  ·  "
                f"{datetime.now().strftime('%Y-%m-%d %H:%M')}",
                ps("foot", fontSize=8,
                   textColor=rl.HexColor("#94A3B8"), alignment=TA_CENTER)))

            doc.build(story)
            messagebox.showinfo("Portfolio Generated",
                f"✅ Portfolio saved to Desktop!\n\nFile: {filename}")
            os.startfile(desktop)

        except Exception as e:
            messagebox.showerror("Error", f"Failed to generate portfolio:\n{e}")

    # ══════════════════════════════════════════════════════
    #  COMMUNITY CHAT
    # ══════════════════════════════════════════════════════
    def _page_chat(self, parent):
        sid   = self._stu.get("id", "")
        name  = self._stu.get("name", "Student")
        role  = "student"

        my_courses = self._store.get_student_courses(sid)
        if not my_courses:
            f = ctk.CTkFrame(parent, fg_color="transparent")
            f.pack(expand=True)
            ctk.CTkLabel(f, text="💬",
                         font=ctk.CTkFont("Segoe UI", 48)).pack(pady=(60, 8))
            ctk.CTkLabel(f, text="Not enrolled in any courses yet.",
                         font=ctk.CTkFont("Segoe UI", 14),
                         text_color=COLORS["text3"]).pack()
            return

        hdr = ctk.CTkFrame(parent, fg_color="transparent")
        hdr.pack(fill="x", padx=24, pady=(18, 8))
        ctk.CTkLabel(hdr, text="💬  Community Chat",
                     font=ctk.CTkFont("Segoe UI", 22, "bold"),
                     text_color=COLORS["text"]).pack(side="left")

        cnames = [f"{c['name']} ({c['code']})" for c in my_courses]
        self._chat_course_var = ctk.StringVar(value=cnames[0])
        ctk.CTkComboBox(hdr, values=cnames, variable=self._chat_course_var,
                        fg_color=COLORS["card"], border_color=COLORS["border"],
                        button_color=COLORS["blue_dim"], text_color=COLORS["text"],
                        width=280, height=34,
                        command=lambda _: self._reload_chat(my_courses, sid, name, role)
                        ).pack(side="right")

        Separator(parent, COLORS["border"]).pack(fill="x", padx=24)

        self._chat_scroll = ctk.CTkScrollableFrame(
            parent, fg_color="transparent",
            scrollbar_button_color=COLORS["border2"])
        self._chat_scroll.pack(fill="both", expand=True, padx=16, pady=8)

        inp = ctk.CTkFrame(parent, fg_color=COLORS["card"],
                           corner_radius=12, border_width=1,
                           border_color=COLORS["border"])
        inp.pack(fill="x", padx=24, pady=(0, 12))
        irow = ctk.CTkFrame(inp, fg_color="transparent")
        irow.pack(fill="x", padx=12, pady=10)

        msg_entry = ctk.CTkEntry(irow,
                                  placeholder_text="Write a message...",
                                  height=38, fg_color=COLORS["bg3"],
                                  border_color=COLORS["border"],
                                  text_color=COLORS["text"])
        msg_entry.pack(side="left", fill="x", expand=True, padx=(0, 8))
        msg_entry.bind("<Return>", lambda e: self._send_chat(
            my_courses, sid, name, role, msg_entry))

        ctk.CTkButton(irow, text="Send ➤",
                      width=90, height=38,
                      fg_color=COLORS["blue3"], hover_color="#1e40af",
                      text_color="white",
                      font=ctk.CTkFont("Segoe UI", 12, "bold"),
                      corner_radius=8,
                      command=lambda: self._send_chat(
                          my_courses, sid, name, role, msg_entry)
                      ).pack(side="left")

        self._chat_courses = my_courses
        self._chat_sid     = sid
        self._chat_name    = name
        self._chat_entry   = msg_entry
        self._reload_chat(my_courses, sid, name, role)

    def _get_selected_course(self, courses):
        cnames = [f"{c['name']} ({c['code']})" for c in courses]
        sel    = getattr(self, "_chat_course_var", None)
        if sel and sel.get() in cnames:
            return courses[cnames.index(sel.get())]
        return courses[0] if courses else None

    def _reload_chat(self, courses, sid, name, role):
        for w in self._chat_scroll.winfo_children():
            w.destroy()
        course   = self._get_selected_course(courses)
        if not course:
            return
        messages = self._store.get_messages(course["id"])
        if not messages:
            ctk.CTkLabel(self._chat_scroll,
                         text="No messages yet. Be the first to say something!",
                         font=ctk.CTkFont("Segoe UI", 12),
                         text_color=COLORS["text3"]).pack(pady=40)
        else:
            for msg in messages:
                self._render_message(msg, sid, role, course)
        self._chat_scroll.after(
            100, lambda: self._chat_scroll._parent_canvas.yview_moveto(1.0))

    def _render_message(self, msg, my_sid, my_role, course):
        is_mine     = msg.get("sender_id") == my_sid
        is_announce = msg.get("type") == "announcement"
        sender      = msg.get("sender", "")
        text        = msg.get("text", "")
        timestamp   = msg.get("timestamp", "")
        reactions   = msg.get("reactions", {})

        if is_announce:
            af = ctk.CTkFrame(self._chat_scroll,
                              fg_color="#2d1a00", corner_radius=10,
                              border_width=1,
                              border_color=COLORS.get("amber","#f59e0b"))
            af.pack(fill="x", padx=8, pady=4)
            ctk.CTkLabel(af, text=f"📢  {sender}  ·  {timestamp}",
                         font=ctk.CTkFont("Segoe UI", 10, "bold"),
                         text_color=COLORS.get("amber","#f59e0b")
                         ).pack(anchor="w", padx=12, pady=(8,2))
            ctk.CTkLabel(af, text=text,
                         font=ctk.CTkFont("Segoe UI", 12),
                         text_color=COLORS["text"],
                         wraplength=700, justify="left"
                         ).pack(anchor="w", padx=12, pady=(0,8))
            return

        row = ctk.CTkFrame(self._chat_scroll, fg_color="transparent")
        row.pack(fill="x", padx=8, pady=2,
                 anchor="e" if is_mine else "w")

        bubble = ctk.CTkFrame(row,
                              fg_color=COLORS["blue3"] if is_mine else COLORS["card"],
                              corner_radius=14)
        bubble.pack(side="right" if is_mine else "left", padx=8)

        if not is_mine:
            ctk.CTkLabel(bubble, text=sender,
                         font=ctk.CTkFont("Segoe UI", 9, "bold"),
                         text_color=COLORS["blue2"]
                         ).pack(anchor="w", padx=10, pady=(6,0))

        ctk.CTkLabel(bubble, text=text,
                     font=ctk.CTkFont("Segoe UI", 12),
                     text_color="white" if is_mine else COLORS["text"],
                     wraplength=400, justify="left"
                     ).pack(padx=12, pady=(2,4))
        ctk.CTkLabel(bubble, text=timestamp,
                     font=ctk.CTkFont("Segoe UI", 8),
                     text_color=COLORS["text3"]
                     ).pack(anchor="e" if is_mine else "w", padx=10, pady=(0,4))

        if reactions:
            rrow = ctk.CTkFrame(row, fg_color="transparent")
            rrow.pack(side="right" if is_mine else "left", padx=4)
            for emoji, reactors in reactions.items():
                if reactors:
                    ctk.CTkLabel(rrow, text=f"{emoji} {len(reactors)}",
                                 font=ctk.CTkFont("Segoe UI", 11),
                                 fg_color=COLORS["bg3"], corner_radius=8,
                                 text_color=COLORS["text2"]
                                 ).pack(side="left", padx=2)

        react_row = ctk.CTkFrame(row, fg_color="transparent")
        react_row.pack(side="right" if is_mine else "left", padx=4)
        courses = getattr(self, "_chat_courses", [])
        for emoji in ["👍","❤️","😂","🎉"]:
            ctk.CTkButton(react_row, text=emoji,
                          width=28, height=24,
                          fg_color="transparent", hover_color=COLORS["bg3"],
                          font=ctk.CTkFont("Segoe UI", 12),
                          command=lambda e=emoji, m=msg, c=course: (
                              self._store.add_reaction(c["id"], m["id"], e, my_sid),
                              self._reload_chat(courses, my_sid,
                                  getattr(self,"_chat_name",""),
                                  "student"))
                          ).pack(side="left")

    def _send_chat(self, courses, sid, name, role, entry):
        text = entry.get().strip()
        if not text:
            return
        course = self._get_selected_course(courses)
        if not course:
            return
        entry.delete(0, "end")
        self._store.post_message(course["id"], name, sid, role, text, "message")
        self._reload_chat(courses, sid, name, role)

    # ══════════════════════════════════════════════════════
    #  DASHBOARD
    # ══════════════════════════════════════════════════════
    def _page_dashboard(self, parent):
        pad = {"padx": 20, "pady": 6}
        s   = self._stu
        hdr = ctk.CTkFrame(parent, fg_color=COLORS["card"],
                           corner_radius=16, border_width=1,
                           border_color=COLORS["border"])
        hdr.pack(fill="x", **pad)
        hdr_inner = ctk.CTkFrame(hdr, fg_color="transparent")
        hdr_inner.pack(fill="x", padx=20, pady=16)
        photo_lbl = ctk.CTkLabel(hdr_inner, text="", width=90, height=90)
        photo_lbl.pack(side="left", padx=(0,16))
        async_photo(photo_lbl, s["id"], s.get("name",""),
                    s.get("color", COLORS["blue"]), (90,90))
        info_col = ctk.CTkFrame(hdr_inner, fg_color="transparent")
        info_col.pack(side="left", fill="both", expand=True)
        ctk.CTkLabel(info_col,
                     text=f"Welcome back, {self._user['name'].split()[0]} 👋",
                     font=ctk.CTkFont("Segoe UI", 22, "bold"),
                     text_color=COLORS["text"]).pack(anchor="w")
        ctk.CTkLabel(info_col,
                     text=f"{s['id']}  ·  {s['dept']}  ·  Year {s['year']}",
                     font=ctk.CTkFont("Segoe UI", 12),
                     text_color=COLORS["text2"]).pack(anchor="w", pady=(2,0))
        ctk.CTkLabel(info_col,
                     text="Your academic overview for this semester",
                     font=ctk.CTkFont("Segoe UI", 11),
                     text_color=COLORS["text3"]).pack(anchor="w")

        stat_row = ctk.CTkFrame(parent, fg_color="transparent")
        stat_row.pack(fill="x", **pad)
        for i,(lbl,val,sub,icon,acc) in enumerate([
            ("Attendance Rate",  f"{s['attendance_rate']}%","12 of 14 lectures","✅","green"),
            ("Avg Engagement",   f"{s['engagement']}%",    "Above class average","🧠","blue"),
            ("Avg Attention",    f"{s['attention_score']}%","Good focus level",  "👁️","purple"),
            ("GPA",              f"{s['gpa']}",             "Current semester",  "📈","amber"),
        ]):
            StatCard(stat_row,lbl,val,sub,icon,acc).grid(
                row=0,column=i,padx=6,pady=0,sticky="nsew")
            stat_row.grid_columnconfigure(i,weight=1)

        chart_row = ctk.CTkFrame(parent, fg_color="transparent")
        chart_row.pack(fill="x", **pad)
        chart_row.grid_columnconfigure(0,weight=3)
        chart_row.grid_columnconfigure(1,weight=2)
        trend_card = Card(chart_row, title="Engagement Trend — Last 14 Lectures")
        trend_card.grid(row=0,column=0,padx=(0,8),sticky="nsew")
        LineChart(trend_card,
                  series=[
                      {"label":"Engagement","data":self._store.trend_data["engagement"],
                       "color":COLORS["blue"]},
                      {"label":"Attention","data":self._store.trend_data["attention"],
                       "color":COLORS["green"]},
                  ],
                  labels=self._store.trend_data["labels"],height=200
                  ).pack(fill="x",padx=12,pady=(0,12))
        emo_card = Card(chart_row, title="Emotion Distribution")
        emo_card.grid(row=0,column=1,sticky="nsew")
        d_row = ctk.CTkFrame(emo_card, fg_color="transparent")
        d_row.pack(fill="x",padx=12,pady=(0,12))
        DonutChart(d_row,data=[
            {"label":d["emotion"],"value":d["count"],"color":d["color"]}
            for d in self._store.emotion_dist[:5]],size=160).pack(side="left")
        legend = ctk.CTkFrame(d_row, fg_color="transparent")
        legend.pack(side="left",padx=12)
        for d in self._store.emotion_dist[:5]:
            r = ctk.CTkFrame(legend, fg_color="transparent")
            r.pack(anchor="w",pady=2)
            ctk.CTkLabel(r,text="●",text_color=d["color"],
                         font=ctk.CTkFont("Segoe UI",12)).pack(side="left")
            ctk.CTkLabel(r,text=f" {d['emotion']}  {d['pct']}%",
                         font=ctk.CTkFont("Segoe UI",10),
                         text_color=COLORS["text2"]).pack(side="left")

        bot_row = ctk.CTkFrame(parent, fg_color="transparent")
        bot_row.pack(fill="x",**pad)
        bot_row.grid_columnconfigure(0,weight=1)
        bot_row.grid_columnconfigure(1,weight=1)
        sched_card = Card(bot_row, title="Today's Schedule")
        sched_card.grid(row=0,column=0,padx=(0,8),sticky="nsew")
        for lec in self._store.lectures[:3]:
            ScheduleItem(sched_card,lec).pack(fill="x",padx=12,pady=(0,6))
        emo_bars_card = Card(bot_row, title="Emotion Log Today")
        emo_bars_card.grid(row=0,column=1,sticky="nsew")
        EmotionBarsWidget(emo_bars_card,self._store.emotion_dist
                          ).pack(fill="x",padx=14,pady=(4,14))

    # ══════════════════════════════════════════════════════
    #  ATTENDANCE
    # ══════════════════════════════════════════════════════
    def _page_attendance(self, parent):
        pad = {"padx": 20, "pady": 6}
        ctk.CTkLabel(parent,text="My Attendance",
                     font=ctk.CTkFont("Segoe UI",22,"bold"),
                     text_color=COLORS["text"]).pack(anchor="w",**pad)
        ctk.CTkLabel(parent,text="Track your presence across all lectures",
                     font=ctk.CTkFont("Segoe UI",12),
                     text_color=COLORS["text2"]).pack(anchor="w",padx=20)
        stat_row=ctk.CTkFrame(parent,fg_color="transparent")
        stat_row.pack(fill="x",**pad)
        for i,(l,v,s,ic,ac) in enumerate([
            ("Total Present","12","out of 14 lectures","✅","green"),
            ("Absent","2","Missed lectures","❌","red"),
            ("Rate","85.7%","Good standing","📊","blue"),
            ("Avg Duration","87 min","per lecture","⏱️","amber"),
        ]):
            StatCard(stat_row,l,v,s,ic,ac).grid(row=0,column=i,padx=6,sticky="nsew")
            stat_row.grid_columnconfigure(i,weight=1)
        tbl_card=Card(parent,title="Attendance Record")
        tbl_card.pack(fill="both",expand=True,**pad)
        cols=[{"key":"id","label":"Lecture","width":70},
              {"key":"course","label":"Course","width":200,"stretch":True},
              {"key":"date","label":"Date","width":100},
              {"key":"time","label":"Check-In","width":80},
              {"key":"dur","label":"Duration","width":90},
              {"key":"method","label":"Method","width":140},
              {"key":"status","label":"Status","width":90}]
        tbl=DataTable(tbl_card,cols)
        tbl.pack(fill="both",expand=True,padx=12,pady=(4,12))
        rows=[]
        for i,lec in enumerate(self._store.lectures):
            rows.append((lec["id"],lec["name"],f"2025-01-{15+i}",
                         lec["time"],f"{random.randint(75,90)} min",
                         "👤 Face Recognition",
                         "✓ Present" if i<4 else "✗ Absent"))
        tbl.load(rows)

    # ══════════════════════════════════════════════════════
    #  EMOTIONS
    # ══════════════════════════════════════════════════════
    def _page_emotions(self, parent):
        pad = {"padx": 20, "pady": 6}
        ctk.CTkLabel(parent,text="My Emotion Profile",
                     font=ctk.CTkFont("Segoe UI",22,"bold"),
                     text_color=COLORS["text"]).pack(anchor="w",**pad)
        chart_row=ctk.CTkFrame(parent,fg_color="transparent")
        chart_row.pack(fill="x",**pad)
        chart_row.grid_columnconfigure(0,weight=1)
        chart_row.grid_columnconfigure(1,weight=1)
        bc=Card(chart_row,title="Emotion Frequency")
        bc.grid(row=0,column=0,padx=(0,8),sticky="nsew")
        BarChart(bc,data=[{"label":d["emotion"],"value":d["count"],"color":d["color"]}
                          for d in self._store.emotion_dist],height=200
                 ).pack(fill="x",padx=12,pady=(4,12))
        ec=Card(chart_row,title="Engagement per Lecture")
        ec.grid(row=0,column=1,sticky="nsew")
        BarChart(ec,data=[{"label":lec["id"],"value":lec["avg_engagement"],"color":lec["color"]}
                          for lec in self._store.lectures],height=200
                 ).pack(fill="x",padx=12,pady=(4,12))
        log_card=Card(parent,title="Emotion Log (last 20 detections)")
        log_card.pack(fill="both",expand=True,**pad)
        cols=[{"key":"time","label":"Time","width":70},
              {"key":"lecture","label":"Lecture","width":180,"stretch":True},
              {"key":"emotion","label":"Emotion","width":100},
              {"key":"conf","label":"Confidence","width":100},
              {"key":"eng","label":"Engagement","width":100},
              {"key":"att","label":"Attention","width":100}]
        tbl=DataTable(log_card,cols)
        tbl.pack(fill="both",expand=True,padx=12,pady=(4,12))
        emos=self._store.emotion_dist; lecs=self._store.lectures; rows=[]
        for i in range(20):
            emo=emos[i%len(emos)]; lec=lecs[i%len(lecs)]
            rows.append((f"10:{5+i*3:02d}",f"{lec['id']} — {lec['name']}",
                         f"{EMOTION_ICONS.get(emo['emotion'],'😐')} {emo['emotion']}",
                         f"{random.randint(65,97)}%",f"{random.randint(40,92)}%",
                         f"{random.randint(35,88)}%"))
        tbl.load(rows)

    # ══════════════════════════════════════════════════════
    #  SCHEDULE
    # ══════════════════════════════════════════════════════
    def _page_schedule(self, parent):
        pad = {"padx": 20, "pady": 6}
        ctk.CTkLabel(parent,text="My Schedule",
                     font=ctk.CTkFont("Segoe UI",22,"bold"),
                     text_color=COLORS["text"]).pack(anchor="w",**pad)
        sched_card=Card(parent,title="This Week's Lectures")
        sched_card.pack(fill="both",expand=True,**pad)
        for lec in self._store.lectures:
            row=ctk.CTkFrame(sched_card,fg_color=COLORS["bg3"],corner_radius=10)
            row.pack(fill="x",padx=14,pady=4)
            tk.Frame(row,bg=lec["color"],width=5).pack(side="left",fill="y")
            info=ctk.CTkFrame(row,fg_color="transparent")
            info.pack(side="left",fill="both",expand=True,padx=14,pady=12)
            ctk.CTkLabel(info,text=f"{lec['time']}  ·  {lec['duration']} min",
                         font=ctk.CTkFont("Segoe UI",10),text_color=COLORS["text3"]).pack(anchor="w")
            ctk.CTkLabel(info,text=lec["name"],
                         font=ctk.CTkFont("Segoe UI",13,"bold"),
                         text_color=COLORS["text"]).pack(anchor="w")
            ctk.CTkLabel(info,text=f"{lec['room']}  ·  {lec['code']}  ·  {lec['doctor']}",
                         font=ctk.CTkFont("Segoe UI",10),text_color=COLORS["text2"]).pack(anchor="w")
            sc={"active":"green","scheduled":"amber","ended":"gray"}.get(lec["status"],"gray")
            Badge(row,lec["status"].title(),sc).pack(side="right",padx=14)

    # ══════════════════════════════════════════════════════
    #  PERFORMANCE
    # ══════════════════════════════════════════════════════
    def _page_performance(self, parent):
        pad = {"padx": 20, "pady": 6}
        ctk.CTkLabel(parent,text="Performance Analytics",
                     font=ctk.CTkFont("Segoe UI",22,"bold"),
                     text_color=COLORS["text"]).pack(anchor="w",**pad)
        stat_row=ctk.CTkFrame(parent,fg_color="transparent")
        stat_row.pack(fill="x",**pad)
        for i,(l,v,s,ic,ac) in enumerate([
            ("GPA","3.4","↑ 0.2 from last semester","📈","blue"),
            ("Avg Engagement","72%","Top 30% of class","🧠","green"),
            ("Courses Passed","4/5","Current semester","🎯","purple"),
            ("Class Rank","#7","Out of 48 students","🏆","amber"),
        ]):
            StatCard(stat_row,l,v,s,ic,ac).grid(row=0,column=i,padx=6,sticky="nsew")
            stat_row.grid_columnconfigure(i,weight=1)
        tbl_card=Card(parent,title="Performance per Course")
        tbl_card.pack(fill="both",expand=True,**pad)
        cols=[{"key":"course","label":"Course","width":200,"stretch":True},
              {"key":"attendance","label":"Attendance","width":100},
              {"key":"engagement","label":"Engagement","width":100},
              {"key":"attention","label":"Attention","width":100},
              {"key":"grade","label":"Grade","width":80}]
        tbl=DataTable(tbl_card,cols)
        tbl.pack(fill="both",expand=True,padx=12,pady=(4,12))
        grades=["A","B+","A-","B","A"]; rows=[]
        for i,lec in enumerate(self._store.lectures):
            rows.append((f"{lec['name']} ({lec['code']})",
                         f"{random.randint(70,100)}%",
                         f"{random.randint(55,95)}%",
                         f"{random.randint(50,90)}%",
                         grades[i%len(grades)]))
        tbl.load(rows)