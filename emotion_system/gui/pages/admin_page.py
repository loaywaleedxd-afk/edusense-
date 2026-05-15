"""
Admin Dashboard — full management with real Add Student/Doctor + face registration
+ Email notifications on registration (student, doctor, parent)
+ Export individual student report PDF
"""
import customtkinter as ctk
import tkinter as tk
from tkinter import messagebox
import threading
import cv2
import numpy as np
from PIL import Image, ImageTk
import random, os, subprocess, webbrowser, time
from datetime import datetime
import arabic_reshaper
from bidi.algorithm import get_display

def fix_arabic(t): return get_display(arabic_reshaper.reshape(t)) if t else t

from gui.theme      import COLORS, EMOTION_ICONS, DEPARTMENTS, TITLES
from gui.components import (Sidebar, Topbar, StatCard, Card, Badge, Separator,
                             DataTable, LineChart, BarChart, DonutChart,
                             EmotionBarsWidget)
from gui import face_engine as fe

# ── Email service ──────────────────────────────────────────────────────
try:
    from gui.email_service import send_welcome_email
    EMAIL_AVAILABLE = True
except ImportError:
    EMAIL_AVAILABLE = False
    def send_welcome_email(*args, **kwargs): pass

try:
    from gui.theme import DEPARTMENTS, TITLES
except ImportError:
    DEPARTMENTS = ["Computer Science","Engineering","Mathematics","Physics","Data Science"]
    TITLES      = ["Professor","Associate Professor","Lecturer","Assistant Professor"]

RSCRIPT    = r"C:\Program Files\R\R-4.6.0\bin\Rscript.exe"
SHINY_PORT = 7760


def _letter_grade(g):
    if g >= 90: return "A+"
    if g >= 85: return "A"
    if g >= 80: return "B+"
    if g >= 75: return "B"
    if g >= 70: return "C+"
    if g >= 65: return "C"
    if g >= 60: return "D+"
    if g >= 50: return "D"
    return "F"


class AdminPage(ctk.CTkFrame):
    NAV = [
        {"section": "Overview"},
        {"id":"dashboard",   "icon":"📊", "label":"Dashboard"},
        {"id":"analytics",   "icon":"📉", "label":"System Analytics"},
        {"section": "Management"},
        {"id":"students",    "icon":"🎓", "label":"Students"},
        {"id":"doctors",     "icon":"👨‍🏫","label":"Lecturers"},
        {"id":"courses",     "icon":"📚", "label":"Courses"},
        {"id":"enrollments", "icon":"📋", "label":"Enrollments"},
        {"id":"parents",     "icon":"👨‍👩‍👧","label":"Parents"},
        {"section": "Reports"},
        {"id":"r_reports",   "icon":"📊", "label":"R Reports"},
        {"id":"settings",    "icon":"⚙️", "label":"Settings"},
    ]

    def __init__(self, parent, user, on_logout, **kw):
        super().__init__(parent, fg_color=COLORS["bg"], corner_radius=0, **kw)
        self._user  = user
        self._store = parent.store

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

    def _on_nav(self, page_id):
        for w in self._content.winfo_children():
            w.destroy()
        labels = {
            "dashboard":"Dashboard", "analytics":"System Analytics",
            "students":"Students", "doctors":"Lecturers",
            "courses":"Course Management", "enrollments":"Enrollment Management",
            "parents":"Parents Management", "lectures":"Lectures",
            "r_reports":"R Analysis Reports", "settings":"Settings",
        }
        self._topbar.page_label.configure(text=labels.get(page_id, page_id.title()))
        fn = getattr(self, f"_page_{page_id}", None)
        if fn: fn(self._content)

    # ══════════════════════════════════════════════════════
    #  DASHBOARD
    # ══════════════════════════════════════════════════════
    def _page_dashboard(self, parent):
        pad = {"padx":20,"pady":6}
        ctk.CTkLabel(parent, text="System Dashboard",
                     font=ctk.CTkFont("Segoe UI",24,"bold"),
                     text_color=COLORS["text"]).pack(anchor="w",**pad)
        ctk.CTkLabel(parent, text="University-wide overview",
                     font=ctk.CTkFont("Segoe UI",12),
                     text_color=COLORS["text2"]).pack(anchor="w",padx=20)

        stat_row = ctk.CTkFrame(parent, fg_color="transparent")
        stat_row.pack(fill="x",**pad)
        total_stu = len(self._store.students)
        total_doc = len(self._store.doctors)
        for i,(l,v,s,ic,ac) in enumerate([
            ("Total Students",  str(total_stu), "Enrolled",         "🎓","blue"),
            ("Lecturers",       str(total_doc), "Active faculty",   "👨‍🏫","purple"),
            ("Active Lectures", "24",           "Running right now","📚","green"),
            ("Avg Engagement",  "65%",          "↑ 3.2% this week","🧠","amber"),
        ]):
            StatCard(stat_row,l,v,s,ic,ac).grid(row=0,column=i,padx=6,sticky="nsew")
            stat_row.grid_columnconfigure(i,weight=1)

        row1 = ctk.CTkFrame(parent, fg_color="transparent")
        row1.pack(fill="x",**pad)
        row1.grid_columnconfigure(0,weight=3); row1.grid_columnconfigure(1,weight=2)

        dept_c = Card(row1, title="Engagement by Department")
        dept_c.grid(row=0,column=0,padx=(0,8),sticky="nsew")
        depts = ["CS","Engineering","Math","Physics","Data Sci"]
        BarChart(dept_c, data=[{"label":d,"value":random.randint(55,85),"color":c}
                               for d,c in zip(depts,[COLORS["blue"],COLORS["purple"],
                               COLORS["green"],COLORS["amber"],COLORS["cyan"]])],
                 height=210).pack(fill="x",padx=12,pady=(4,12))

        live_c = Card(row1, title="Lectures Now")
        live_c.grid(row=0,column=1,sticky="nsew")
        for lec in self._store.lectures[:3]:
            r = ctk.CTkFrame(live_c, fg_color=COLORS["bg3"], corner_radius=8)
            r.pack(fill="x",padx=12,pady=(0,6))
            tk.Frame(r,bg=lec["color"],width=4).pack(side="left",fill="y")
            b = ctk.CTkFrame(r,fg_color="transparent")
            b.pack(side="left",fill="x",expand=True,padx=10,pady=8)
            ctk.CTkLabel(b,text=lec["name"],
                         font=ctk.CTkFont("Segoe UI",11,"bold"),
                         text_color=COLORS["text"]).pack(anchor="w")
            ctk.CTkLabel(b,text=f"{lec['doctor']} · {lec['room']}",
                         font=ctk.CTkFont("Segoe UI",10),
                         text_color=COLORS["text2"]).pack(anchor="w")
            sc = {"active":"green","scheduled":"amber","ended":"gray"}.get(lec["status"],"gray")
            Badge(r,lec["status"].title(),sc).pack(side="right",padx=10)

    # ══════════════════════════════════════════════════════
    #  ANALYTICS
    # ══════════════════════════════════════════════════════
    def _page_analytics(self, parent):
        pad={"padx":20,"pady":6}
        ctk.CTkLabel(parent,text="System Analytics",
                     font=ctk.CTkFont("Segoe UI",22,"bold"),
                     text_color=COLORS["text"]).pack(anchor="w",**pad)
        row1=ctk.CTkFrame(parent,fg_color="transparent"); row1.pack(fill="x",**pad)
        row1.grid_columnconfigure(0,weight=1); row1.grid_columnconfigure(1,weight=1)
        ec=Card(row1,title="Emotion Distribution")
        ec.grid(row=0,column=0,padx=(0,8),sticky="nsew")
        BarChart(ec,data=[{"label":d["emotion"],"value":d["count"]*10,"color":d["color"]}
                          for d in self._store.emotion_dist],height=210).pack(
            fill="x",padx=12,pady=(4,12))
        rc=Card(row1,title="Dept Engagement")
        rc.grid(row=0,column=1,sticky="nsew")
        depts=["CS","Eng","Math","Phys","Data"]
        BarChart(rc,data=[{"label":d,"value":random.randint(55,88),"color":c}
                          for d,c in zip(depts,[COLORS["blue"],COLORS["purple"],
                          COLORS["green"],COLORS["amber"],COLORS["cyan"]])],
                 height=210).pack(fill="x",padx=12,pady=(4,12))
        tc=Card(parent,title="Weekly Attendance")
        tc.pack(fill="x",**pad)
        days=["Mon","Tue","Wed","Thu","Sun","Mon","Tue"]
        LineChart(tc,series=[{"label":"Attendance %",
                              "data":[random.randint(70,95) for _ in days],
                              "color":COLORS["green"]}],
                  labels=days,height=170,y_max=100).pack(fill="x",padx=12,pady=(4,12))

    # ══════════════════════════════════════════════════════
    #  STUDENTS — full list + add/delete + export report
    # ══════════════════════════════════════════════════════
    def _page_students(self, parent):
        pad={"padx":20,"pady":6}
        hdr=ctk.CTkFrame(parent,fg_color="transparent"); hdr.pack(fill="x",**pad)
        ctk.CTkLabel(hdr,text="Student Management",
                     font=ctk.CTkFont("Segoe UI",22,"bold"),
                     text_color=COLORS["text"]).pack(side="left")
        ctk.CTkButton(hdr,text="+ Add Student",
                      fg_color=COLORS["blue3"],hover_color=COLORS["blue"],
                      corner_radius=10,font=ctk.CTkFont("Segoe UI",12,"bold"),
                      command=lambda:self._open_add_person("student")).pack(side="right")

        sf=ctk.CTkFrame(parent,fg_color="transparent"); sf.pack(fill="x",**pad)
        self._stu_search=ctk.CTkEntry(sf,placeholder_text="🔍  Search name / ID...",
                                       height=38,width=260,fg_color=COLORS["bg3"],
                                       border_color=COLORS["border"],
                                       text_color=COLORS["text"],corner_radius=10)
        self._stu_search.pack(side="left",padx=(0,8))
        self._stu_search.bind("<KeyRelease>",lambda e:self._refresh_student_table())
        ctk.CTkButton(sf,text="📥 Export CSV",width=110,height=38,
                      fg_color="transparent",border_width=1,
                      border_color=COLORS["border2"],text_color=COLORS["text2"],
                      hover_color=COLORS["bg3"],corner_radius=10,
                      command=self._export_students_csv).pack(side="right")

        tbl_card=Card(parent,title="All Students")
        tbl_card.pack(fill="both",expand=True,**pad)
        cols=[
            {"key":"id",   "label":"ID",        "width":70},
            {"key":"name", "label":"Name",       "width":160,"stretch":True},
            {"key":"dept", "label":"Department", "width":150},
            {"key":"year", "label":"Year",       "width":55},
            {"key":"email","label":"Email",      "width":200},
            {"key":"att",  "label":"Attendance", "width":90},
            {"key":"eng",  "label":"Engagement", "width":90},
            {"key":"face", "label":"Face Reg.",  "width":90},
        ]
        self._stu_table=DataTable(tbl_card,cols)
        self._stu_table.pack(fill="both",expand=True,padx=12,pady=(4,4))
        self._stu_table.bind_select(self._on_student_select)

        act=ctk.CTkFrame(tbl_card,fg_color="transparent")
        act.pack(fill="x",padx=12,pady=(0,12))
        self._stu_sel_lbl=ctk.CTkLabel(act,text="Select a student to manage",
                                        font=ctk.CTkFont("Segoe UI",11),
                                        text_color=COLORS["text3"])
        self._stu_sel_lbl.pack(side="left")

        # action buttons right-to-left
        self._stu_del_btn=ctk.CTkButton(act,text="🗑  Delete",width=90,height=32,
                                         fg_color=COLORS["red_dim"],border_width=1,
                                         border_color=COLORS["red"],text_color=COLORS["red2"],
                                         hover_color=COLORS["red"],corner_radius=8,
                                         state="disabled",command=self._delete_selected_student)
        self._stu_del_btn.pack(side="right",padx=4)

        self._stu_reg_btn=ctk.CTkButton(act,text="📷  Register Face",width=120,height=32,
                                         fg_color=COLORS["green_dim"],border_width=1,
                                         border_color=COLORS["green"],text_color=COLORS["green2"],
                                         hover_color=COLORS["green"],corner_radius=8,
                                         state="disabled",command=self._register_face_for_selected)
        self._stu_reg_btn.pack(side="right",padx=4)

        self._stu_parent_btn=ctk.CTkButton(act,text="👨‍👩‍👧 Add Parent",width=120,height=32,
                                            fg_color=COLORS["amber_dim"],border_width=1,
                                            border_color=COLORS["amber"],text_color=COLORS["amber2"],
                                            hover_color=COLORS["amber"],corner_radius=8,
                                            state="disabled",command=self._add_parent_dialog)
        self._stu_parent_btn.pack(side="right",padx=4)

        self._stu_report_btn=ctk.CTkButton(act,text="📄 Export Report",width=130,height=32,
                                            fg_color=COLORS["blue_dim"],border_width=1,
                                            border_color=COLORS["blue"],text_color=COLORS["blue2"],
                                            hover_color=COLORS["blue3"],corner_radius=8,
                                            state="disabled",command=self._export_selected_student_report)
        self._stu_report_btn.pack(side="right",padx=4)

        self._selected_student_id = None
        self._refresh_student_table()

    def _refresh_student_table(self):
        q=(self._stu_search.get().lower() if hasattr(self,"_stu_search") else "")
        rows=[]
        for s in self._store.students:
            if q and q not in s["name"].lower() and q not in s["id"].lower():
                continue
            rows.append((
                s["id"], f"{s['emoji']} {s['name']}", s["dept"],
                f"Year {s['year']}", s.get("email",""),
                f"{s['attendance_rate']}%", f"{s['engagement']}%",
                "✅ Yes" if s.get("has_face") else "❌ No",
            ))
        if hasattr(self,"_stu_table"):
            self._stu_table.load(rows)

    def _on_student_select(self, event):
        sel=self._stu_table._tree.selection()
        if not sel: return
        vals=self._stu_table._tree.item(sel[0],"values")
        self._selected_student_id=vals[0]
        s=self._store.get_student(vals[0])
        if s:
            self._stu_sel_lbl.configure(text=f"Selected: {s['name']} ({s['id']})")
        for btn in [self._stu_del_btn, self._stu_reg_btn,
                    self._stu_parent_btn, self._stu_report_btn]:
            btn.configure(state="normal")

    def _delete_selected_student(self):
        sid=self._selected_student_id
        if not sid: return
        s=self._store.get_student(sid)
        if not s: return
        if messagebox.askyesno("Delete Student",
                f"Delete {s['name']} ({sid})?\nThis cannot be undone."):
            self._store.delete_student(sid)
            self._selected_student_id=None
            for btn in [self._stu_del_btn, self._stu_reg_btn,
                        self._stu_parent_btn, self._stu_report_btn]:
                btn.configure(state="disabled")
            self._stu_sel_lbl.configure(text="Select a student to manage")
            self._refresh_student_table()

    def _register_face_for_selected(self):
        sid=self._selected_student_id
        if not sid: return
        self._open_face_capture_dialog(sid,"student",callback=self._refresh_student_table)

    def _export_students_csv(self):
        path=os.path.join(os.path.expanduser("~"),"students_export.csv")
        try:
            with open(path,"w",encoding="utf-8-sig") as f:
                f.write("ID,Name,Department,Year,Email,Attendance,Engagement,Face Registered\n")
                for s in self._store.students:
                    f.write(f"{s['id']},{s['name']},{s['dept']},Year {s['year']},"
                            f"{s.get('email','')},{s['attendance_rate']}%,"
                            f"{s['engagement']}%,{'Yes' if s.get('has_face') else 'No'}\n")
            messagebox.showinfo("Export",f"CSV saved to:\n{path}")
        except Exception as e:
            messagebox.showerror("Export Error",str(e))

    # ── export report for selected student ────────────────
    def _export_selected_student_report(self):
        sid=self._selected_student_id
        if not sid: return
        s=self._store.get_student(sid)
        if not s: return
        self._generate_student_report_pdf(s)

    def _generate_student_report_pdf(self, s: dict):
        """Generate a full academic report PDF for any student (admin version)."""
        try:
            from reportlab.lib.pagesizes import A4
            from reportlab.lib import colors as rl
            from reportlab.lib.units import cm
            from reportlab.platypus import (SimpleDocTemplate, Paragraph,
                                            Spacer, Table, TableStyle, HRFlowable)
            from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
            from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT
            from reportlab.pdfbase import pdfmetrics
            from reportlab.pdfbase.ttfonts import TTFont
        except ImportError:
            messagebox.showerror("Missing Library",
                "reportlab is required.\n\nRun:  pip install reportlab")
            return

        # ── font ──────────────────────────────────────────
        FONT = "Helvetica"
        for fp in [r"C:\Windows\Fonts\Arial.ttf",
                   r"C:\Windows\Fonts\calibri.ttf",
                   r"C:\Windows\Fonts\tahoma.ttf"]:
            if os.path.exists(fp):
                try:
                    fn = os.path.splitext(os.path.basename(fp))[0]
                    pdfmetrics.registerFont(TTFont(fn, fp))
                    FONT = fn; break
                except: pass

        styles = getSampleStyleSheet()
        def ps(name, **kw):
            kw.setdefault("fontName", FONT)
            return ParagraphStyle(name, parent=styles["Normal"], **kw)

        # ── data ──────────────────────────────────────────
        sid      = s.get("id","")
        results  = getattr(self._store,"exam_results",{}).get(sid,{})
        active   = {k:v for k,v in results.items()
                    if v.get("status","active") != "withdrawn"}
        withdrawn= {k:v for k,v in results.items()
                    if v.get("status","") == "withdrawn"}
        grades   = [v["grade"] for v in active.values() if "grade" in v]
        avg_g    = round(sum(grades)/len(grades),1) if grades else 0
        passed   = sum(1 for g in grades if g >= 50)
        failed   = len(grades) - passed
        att      = s.get("attendance_rate", 0)
        eng      = s.get("engagement", 0)
        att_recs = self._store.get_student_attendance(sid) \
                   if hasattr(self._store,"get_student_attendance") else []

        # enrolled courses
        enrolled_courses = []
        for c in self._store.courses:
            cid = c.get("id","")
            enroll_ids = self._store.course_enrollments.get(cid,[])
            if sid in enroll_ids:
                enrolled_courses.append(c)

        # ── output path ───────────────────────────────────
        desktop = os.path.join(os.path.expanduser("~"),"Desktop")
        if not os.path.exists(desktop): desktop = os.path.expanduser("~")
        filename = (f"StudentReport_{sid}_"
                    f"{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf")
        path = os.path.join(desktop, filename)

        try:
            doc = SimpleDocTemplate(path, pagesize=A4,
                                    leftMargin=1.8*cm, rightMargin=1.8*cm,
                                    topMargin=1.5*cm,  bottomMargin=1.5*cm)
            story = []

            # ── header bar ───────────────────────────────
            hdr_data = [[
                Paragraph("EduSense",
                          ps("brand",fontSize=10,textColor=rl.white)),
                Paragraph("<b>STUDENT ACADEMIC REPORT</b>",
                          ps("ptitle",fontSize=16,textColor=rl.white,
                             alignment=TA_CENTER)),
                Paragraph(datetime.now().strftime("%Y-%m-%d"),
                          ps("pdate",fontSize=10,
                             textColor=rl.HexColor("#bfdbfe"),
                             alignment=TA_RIGHT)),
            ]]
            hdr_tbl = Table(hdr_data, colWidths=[4*cm,9.4*cm,4*cm])
            hdr_tbl.setStyle(TableStyle([
                ("BACKGROUND",(0,0),(-1,-1),rl.HexColor("#1E3A8A")),
                ("TOPPADDING",(0,0),(-1,-1),14),
                ("BOTTOMPADDING",(0,0),(-1,-1),14),
                ("LEFTPADDING",(0,0),(-1,-1),10),
                ("VALIGN",(0,0),(-1,-1),"MIDDLE"),
            ]))
            story.append(hdr_tbl)
            story.append(Spacer(1,0.3*cm))

            # ── student info ─────────────────────────────
            info_data = [[
                Paragraph(f"<b>{s.get('name','')}</b>",
                          ps("sname",fontSize=18,
                             textColor=rl.HexColor("#1E3A8A"))),
                Paragraph(
                    f"ID: {sid}  ·  {s.get('dept','')}  ·  Year {s.get('year','')}<br/>"
                    f"Email: {s.get('email','')}  ·  GPA: {s.get('gpa',0.0)}",
                    ps("sinfo",fontSize=10,textColor=rl.HexColor("#374151"))),
            ]]
            info_tbl = Table(info_data, colWidths=[8*cm,9.4*cm])
            info_tbl.setStyle(TableStyle([
                ("BACKGROUND",(0,0),(-1,-1),rl.HexColor("#EFF6FF")),
                ("TOPPADDING",(0,0),(-1,-1),10),
                ("BOTTOMPADDING",(0,0),(-1,-1),10),
                ("LEFTPADDING",(0,0),(-1,-1),12),
                ("VALIGN",(0,0),(-1,-1),"MIDDLE"),
                ("GRID",(0,0),(-1,-1),0.3,rl.HexColor("#BFDBFE")),
            ]))
            story.append(info_tbl)
            story.append(Spacer(1,0.4*cm))

            # ── summary stats ────────────────────────────
            stats_data = [[
                Paragraph(f"<b>{att}%</b><br/>Attendance",
                          ps("sc0",fontSize=11,
                             textColor=rl.HexColor("#065F46"),alignment=TA_CENTER)),
                Paragraph(f"<b>{avg_g}%</b><br/>Avg Grade",
                          ps("sc1",fontSize=11,
                             textColor=rl.HexColor("#1E3A8A"),alignment=TA_CENTER)),
                Paragraph(f"<b>{eng}%</b><br/>Engagement",
                          ps("sc2",fontSize=11,
                             textColor=rl.HexColor("#78350F"),alignment=TA_CENTER)),
                Paragraph(f"<b>{passed}/{len(grades)}</b><br/>Passed",
                          ps("sc3",fontSize=11,
                             textColor=rl.HexColor("#4C1D95"),alignment=TA_CENTER)),
                Paragraph(f"<b>{failed}</b><br/>Failed",
                          ps("sc4",fontSize=11,
                             textColor=rl.HexColor("#7F1D1D"),alignment=TA_CENTER)),
                Paragraph(f"<b>{len(withdrawn)}</b><br/>Withdrawn",
                          ps("sc5",fontSize=11,
                             textColor=rl.HexColor("#78350F"),alignment=TA_CENTER)),
                Paragraph(f"<b>{len(att_recs)}</b><br/>Sessions",
                          ps("sc6",fontSize=11,
                             textColor=rl.HexColor("#064E3B"),alignment=TA_CENTER)),
            ]]
            stats_tbl = Table(stats_data,
                              colWidths=[round(17.2/7,2)*cm]*7)
            stats_tbl.setStyle(TableStyle([
                ("BACKGROUND",(0,0),(0,-1),rl.HexColor("#D1FAE5")),
                ("BACKGROUND",(1,0),(1,-1),rl.HexColor("#DBEAFE")),
                ("BACKGROUND",(2,0),(2,-1),rl.HexColor("#FEF3C7")),
                ("BACKGROUND",(3,0),(3,-1),rl.HexColor("#EDE9FE")),
                ("BACKGROUND",(4,0),(4,-1),rl.HexColor("#FEE2E2")),
                ("BACKGROUND",(5,0),(5,-1),rl.HexColor("#FEF3C7")),
                ("BACKGROUND",(6,0),(6,-1),rl.HexColor("#D1FAE5")),
                ("TOPPADDING",(0,0),(-1,-1),10),
                ("BOTTOMPADDING",(0,0),(-1,-1),10),
                ("GRID",(0,0),(-1,-1),0.5,rl.white),
                ("ALIGN",(0,0),(-1,-1),"CENTER"),
                ("VALIGN",(0,0),(-1,-1),"MIDDLE"),
            ]))
            story.append(stats_tbl)
            story.append(Spacer(1,0.5*cm))

            # ── enrolled courses ─────────────────────────
            story.append(Paragraph("<b>Enrolled Courses</b>",
                          ps("sec",fontSize=13,
                             textColor=rl.HexColor("#1E3A8A"),spaceAfter=6)))
            if enrolled_courses:
                th = ps("th",fontSize=9,textColor=rl.white)
                td = ps("td",fontSize=9,textColor=rl.HexColor("#111827"))
                c_data = [[Paragraph(f"<b>{h}</b>",th)
                            for h in ["#","Code","Course Name","Room","Time","Doctor"]]]
                for i,c in enumerate(enrolled_courses):
                    doc_obj = self._store.get_doctor(c.get("doctor_id",""))
                    doc_name = doc_obj["name"] if doc_obj else "—"
                    c_data.append([
                        Paragraph(str(i+1),td),
                        Paragraph(c.get("code",""),td),
                        Paragraph(c.get("name",""),td),
                        Paragraph(c.get("room",""),td),
                        Paragraph(c.get("time",""),td),
                        Paragraph(doc_name,td),
                    ])
                c_tbl = Table(c_data,
                              colWidths=[0.6*cm,2*cm,5.5*cm,2*cm,2*cm,5.1*cm],
                              repeatRows=1)
                c_tbl.setStyle(TableStyle([
                    ("BACKGROUND",(0,0),(-1,0),rl.HexColor("#1E3A8A")),
                    ("ROWBACKGROUNDS",(0,1),(-1,-1),
                     [rl.HexColor("#F8FAFC"),rl.HexColor("#EFF6FF")]),
                    ("GRID",(0,0),(-1,-1),0.4,rl.HexColor("#CBD5E1")),
                    ("TOPPADDING",(0,0),(-1,-1),5),
                    ("BOTTOMPADDING",(0,0),(-1,-1),5),
                    ("LEFTPADDING",(0,0),(-1,-1),6),
                    ("VALIGN",(0,0),(-1,-1),"MIDDLE"),
                ]))
                story.append(c_tbl)
            else:
                story.append(Paragraph("Not enrolled in any course.",
                              ps("ng",fontSize=10,
                                 textColor=rl.HexColor("#94A3B8"))))
            story.append(Spacer(1,0.5*cm))

            # ── exam results ─────────────────────────────
            story.append(Paragraph("<b>Exam Results</b>",
                          ps("sec2",fontSize=13,
                             textColor=rl.HexColor("#1E3A8A"),spaceAfter=6)))
            if active:
                th = ps("th2",fontSize=9,textColor=rl.white)
                td = ps("td2",fontSize=9,textColor=rl.HexColor("#111827"))
                g_data = [[Paragraph(f"<b>{h}</b>",th)
                            for h in ["#","Course","Code","Grade","Letter","Status","Date"]]]
                for i,(cid,rec) in enumerate(active.items()):
                    g   = rec.get("grade",0)
                    cobj= next((c for c in self._store.courses
                                if c["id"]==cid),None)
                    ac  = "#10B981" if g>=75 else "#F59E0B" if g>=50 else "#EF4444"
                    g_data.append([
                        Paragraph(str(i+1),td),
                        Paragraph(cobj["name"] if cobj else cid,td),
                        Paragraph(cid,td),
                        Paragraph(f"<font color='{ac}'><b>{g}%</b></font>",td),
                        Paragraph(f"<font color='{ac}'>{_letter_grade(g)}</font>",td),
                        Paragraph("✓ Pass" if g>=50 else "✗ Fail",td),
                        Paragraph(rec.get("date","—"),td),
                    ])
                g_tbl = Table(g_data,
                              colWidths=[0.6*cm,4.5*cm,1.8*cm,1.6*cm,
                                         1.5*cm,1.4*cm,2.8*cm],
                              repeatRows=1)
                g_tbl.setStyle(TableStyle([
                    ("BACKGROUND",(0,0),(-1,0),rl.HexColor("#1E3A8A")),
                    ("ROWBACKGROUNDS",(0,1),(-1,-1),
                     [rl.HexColor("#F8FAFC"),rl.HexColor("#EFF6FF")]),
                    ("GRID",(0,0),(-1,-1),0.4,rl.HexColor("#CBD5E1")),
                    ("TOPPADDING",(0,0),(-1,-1),5),
                    ("BOTTOMPADDING",(0,0),(-1,-1),5),
                    ("LEFTPADDING",(0,0),(-1,-1),6),
                    ("VALIGN",(0,0),(-1,-1),"MIDDLE"),
                ]))
                story.append(g_tbl)
            else:
                story.append(Paragraph("No exam results recorded.",
                              ps("ng2",fontSize=10,
                                 textColor=rl.HexColor("#94A3B8"))))

            # ── withdrawn subjects ────────────────────────
            if withdrawn:
                story.append(Spacer(1,0.4*cm))
                story.append(Paragraph("<b>Withdrawn Subjects</b>",
                              ps("sec3",fontSize=13,
                                 textColor=rl.HexColor("#991B1B"),spaceAfter=6)))
                th = ps("th3",fontSize=9,textColor=rl.white)
                td = ps("td3",fontSize=9,textColor=rl.HexColor("#111827"))
                w_data = [[Paragraph(f"<b>{h}</b>",th)
                            for h in ["#","Course","Code","Withdrawn On","By"]]]
                for i,(cid,rec) in enumerate(withdrawn.items()):
                    cobj = next((c for c in self._store.courses
                                 if c["id"]==cid),None)
                    w_data.append([
                        Paragraph(str(i+1),td),
                        Paragraph(cobj["name"] if cobj else cid,td),
                        Paragraph(cid,td),
                        Paragraph(rec.get("withdrawn_at","—"),td),
                        Paragraph(rec.get("withdrawn_by","—"),td),
                    ])
                w_tbl = Table(w_data,
                              colWidths=[0.6*cm,5.5*cm,2*cm,3*cm,6.1*cm],
                              repeatRows=1)
                w_tbl.setStyle(TableStyle([
                    ("BACKGROUND",(0,0),(-1,0),rl.HexColor("#991B1B")),
                    ("ROWBACKGROUNDS",(0,1),(-1,-1),
                     [rl.HexColor("#FEF2F2"),rl.HexColor("#FFF5F5")]),
                    ("GRID",(0,0),(-1,-1),0.4,rl.HexColor("#FECACA")),
                    ("TOPPADDING",(0,0),(-1,-1),5),
                    ("BOTTOMPADDING",(0,0),(-1,-1),5),
                    ("LEFTPADDING",(0,0),(-1,-1),6),
                    ("VALIGN",(0,0),(-1,-1),"MIDDLE"),
                ]))
                story.append(w_tbl)

            # ── admin note ────────────────────────────────
            story.append(Spacer(1,0.5*cm))
            note_data = [[
                Paragraph(
                    f"<b>Generated by Admin:</b> {self._user.get('name','Admin')}  ·  "
                    f"Report Date: {datetime.now().strftime('%Y-%m-%d %H:%M')}  ·  "
                    f"This is an official EduSense system report.",
                    ps("note",fontSize=8,textColor=rl.HexColor("#1E3A8A"),
                       alignment=TA_CENTER)),
            ]]
            note_tbl = Table(note_data, colWidths=[17.2*cm])
            note_tbl.setStyle(TableStyle([
                ("BACKGROUND",(0,0),(-1,-1),rl.HexColor("#EFF6FF")),
                ("TOPPADDING",(0,0),(-1,-1),8),
                ("BOTTOMPADDING",(0,0),(-1,-1),8),
                ("LEFTPADDING",(0,0),(-1,-1),10),
                ("GRID",(0,0),(-1,-1),0.5,rl.HexColor("#BFDBFE")),
            ]))
            story.append(note_tbl)
            story.append(Spacer(1,0.2*cm))
            story.append(HRFlowable(width="100%",thickness=1,
                                     color=rl.HexColor("#3B82F6")))
            story.append(Spacer(1,0.2*cm))
            story.append(Paragraph(
                f"Generated by EduSense  ·  {datetime.now().strftime('%Y-%m-%d %H:%M')}",
                ps("foot",fontSize=8,textColor=rl.HexColor("#94A3B8"),
                   alignment=TA_CENTER)))

            doc.build(story)
            messagebox.showinfo("Report Exported",
                f"✅ Report saved to Desktop!\n\nFile: {filename}")
            os.startfile(desktop)

        except Exception as e:
            messagebox.showerror("Export Failed", f"Error generating report:\n{e}")

    # ══════════════════════════════════════════════════════
    #  DOCTORS
    # ══════════════════════════════════════════════════════
    def _page_doctors(self, parent):
        pad={"padx":20,"pady":6}
        hdr=ctk.CTkFrame(parent,fg_color="transparent"); hdr.pack(fill="x",**pad)
        ctk.CTkLabel(hdr,text="Lecturer Management",
                     font=ctk.CTkFont("Segoe UI",22,"bold"),
                     text_color=COLORS["text"]).pack(side="left")
        ctk.CTkButton(hdr,text="+ Add Lecturer",
                      fg_color=COLORS["blue3"],hover_color=COLORS["blue"],
                      corner_radius=10,font=ctk.CTkFont("Segoe UI",12,"bold"),
                      command=lambda:self._open_add_person("doctor")).pack(side="right")

        tbl_card=Card(parent,title="All Lecturers")
        tbl_card.pack(fill="both",expand=True,**pad)
        cols=[
            {"key":"id",    "label":"ID",        "width":70},
            {"key":"name",  "label":"Name",       "width":180,"stretch":True},
            {"key":"dept",  "label":"Department", "width":160},
            {"key":"title", "label":"Title",      "width":170},
            {"key":"email", "label":"Email",      "width":200},
            {"key":"crs",   "label":"Courses",    "width":70},
            {"key":"eng",   "label":"Avg Eng.",   "width":80},
            {"key":"face",  "label":"Face Reg.",  "width":90},
        ]
        self._doc_table=DataTable(tbl_card,cols)
        self._doc_table.pack(fill="both",expand=True,padx=12,pady=(4,4))
        self._doc_table.bind_select(self._on_doctor_select)

        act=ctk.CTkFrame(tbl_card,fg_color="transparent")
        act.pack(fill="x",padx=12,pady=(0,12))
        self._doc_sel_lbl=ctk.CTkLabel(act,text="Select a lecturer to manage",
                                        font=ctk.CTkFont("Segoe UI",11),
                                        text_color=COLORS["text3"])
        self._doc_sel_lbl.pack(side="left")
        self._doc_del_btn=ctk.CTkButton(act,text="🗑  Delete",width=90,height=32,
                                         fg_color=COLORS["red_dim"],border_width=1,
                                         border_color=COLORS["red"],text_color=COLORS["red2"],
                                         hover_color=COLORS["red"],corner_radius=8,
                                         state="disabled",command=self._delete_selected_doctor)
        self._doc_del_btn.pack(side="right",padx=4)
        self._doc_reg_btn=ctk.CTkButton(act,text="📷  Register Face",width=120,height=32,
                                         fg_color=COLORS["green_dim"],border_width=1,
                                         border_color=COLORS["green"],text_color=COLORS["green2"],
                                         hover_color=COLORS["green"],corner_radius=8,
                                         state="disabled",command=self._register_face_for_doctor)
        self._doc_reg_btn.pack(side="right",padx=4)

        self._selected_doctor_id=None
        self._refresh_doctor_table()

    def _refresh_doctor_table(self):
        rows=[(d["id"],f"{d['emoji']} {d['name']}",d["dept"],d["title"],
               d.get("email",""),str(d["courses"]),f"{d['engagement']}%",
               "✅ Yes" if d.get("has_face") else "❌ No")
              for d in self._store.doctors]
        if hasattr(self,"_doc_table"): self._doc_table.load(rows)

    def _on_doctor_select(self, event):
        sel=self._doc_table._tree.selection()
        if not sel: return
        vals=self._doc_table._tree.item(sel[0],"values")
        self._selected_doctor_id=vals[0]
        d=self._store.get_doctor(vals[0])
        if d: self._doc_sel_lbl.configure(text=f"Selected: {d['name']} ({d['id']})")
        self._doc_del_btn.configure(state="normal")
        self._doc_reg_btn.configure(state="normal")

    def _delete_selected_doctor(self):
        did=self._selected_doctor_id
        if not did: return
        d=self._store.get_doctor(did)
        if not d: return
        if messagebox.askyesno("Delete Lecturer",f"Delete {d['name']} ({did})?"):
            self._store.delete_doctor(did)
            self._selected_doctor_id=None
            self._doc_del_btn.configure(state="disabled")
            self._doc_reg_btn.configure(state="disabled")
            self._doc_sel_lbl.configure(text="Select a lecturer to manage")
            self._refresh_doctor_table()

    def _register_face_for_doctor(self):
        did=self._selected_doctor_id
        if not did: return
        self._open_face_capture_dialog(did,"doctor",callback=self._refresh_doctor_table)

    # ══════════════════════════════════════════════════════
    #  ADD PERSON DIALOG
    # ══════════════════════════════════════════════════════
    def _open_add_person(self, person_type: str):
        win=ctk.CTkToplevel(self)
        is_student=person_type=="student"
        win.title("Add New Student" if is_student else "Add New Lecturer")
        win.geometry("480x920")
        win.configure(fg_color=COLORS["card"])
        win.grab_set(); win.resizable(False,False)

        hdr=ctk.CTkFrame(win,fg_color=COLORS["bg3"],corner_radius=0,height=70)
        hdr.pack(fill="x"); hdr.pack_propagate(False)
        ctk.CTkLabel(hdr,
                     text="🎓 Add New Student" if is_student else "👨‍🏫 Add New Lecturer",
                     font=ctk.CTkFont("Segoe UI",18,"bold"),
                     text_color=COLORS["text"]).pack(side="left",padx=20)

        body=ctk.CTkScrollableFrame(win,fg_color="transparent",
                                     scrollbar_button_color=COLORS["border2"])
        body.pack(fill="both",expand=True,padx=24,pady=16)
        fields={}

        def labeled_entry(label,placeholder,key,parent=body,show=""):
            ctk.CTkLabel(parent,text=label.upper(),
                         font=ctk.CTkFont("Segoe UI",9,"bold"),
                         text_color=COLORS["text3"]).pack(anchor="w",pady=(8,0))
            e=ctk.CTkEntry(parent,height=40,placeholder_text=placeholder,
                           fg_color=COLORS["bg3"],border_color=COLORS["border"],
                           text_color=COLORS["text"],corner_radius=9,show=show)
            e.pack(fill="x",pady=(4,0)); fields[key]=e; return e

        def labeled_combo(label,options,key,parent=body):
            ctk.CTkLabel(parent,text=label.upper(),
                         font=ctk.CTkFont("Segoe UI",9,"bold"),
                         text_color=COLORS["text3"]).pack(anchor="w",pady=(8,0))
            v=ctk.StringVar(value=options[0])
            cb=ctk.CTkComboBox(parent,values=options,variable=v,
                               fg_color=COLORS["bg3"],border_color=COLORS["border"],
                               text_color=COLORS["text"],button_color=COLORS["blue3"],
                               dropdown_fg_color=COLORS["card"],corner_radius=9,height=40)
            cb.pack(fill="x",pady=(4,0)); fields[key]=v; return cb

        row2=ctk.CTkFrame(body,fg_color="transparent"); row2.pack(fill="x")
        row2.grid_columnconfigure(0,weight=3); row2.grid_columnconfigure(1,weight=1)
        nl=ctk.CTkFrame(row2,fg_color="transparent"); nl.grid(row=0,column=0,padx=(0,8),sticky="ew")
        ctk.CTkLabel(nl,text="FULL NAME",font=ctk.CTkFont("Segoe UI",9,"bold"),
                     text_color=COLORS["text3"]).pack(anchor="w",pady=(8,0))
        ne=ctk.CTkEntry(nl,height=40,placeholder_text="e.g. Sara Johnson",
                        fg_color=COLORS["bg3"],border_color=COLORS["border"],
                        text_color=COLORS["text"],corner_radius=9)
        ne.pack(fill="x",pady=(4,0)); fields["name"]=ne

        ir=ctk.CTkFrame(row2,fg_color="transparent"); ir.grid(row=0,column=1,sticky="ew")
        ctk.CTkLabel(ir,text="AUTO ID",font=ctk.CTkFont("Segoe UI",9,"bold"),
                     text_color=COLORS["text3"]).pack(anchor="w",pady=(8,0))
        next_id=(self._store.next_student_id() if is_student
                 else self._store.next_doctor_id())
        ctk.CTkLabel(ir,text=next_id,font=ctk.CTkFont("Segoe UI",14,"bold"),
                     text_color=COLORS["blue2"],fg_color=COLORS["blue_dim"],
                     corner_radius=8,height=40).pack(fill="x",pady=(4,0))

        labeled_entry("Email","name@university.edu","email")
        labeled_entry("Phone","+20-100000000","phone")
        labeled_combo("Department",DEPARTMENTS,"dept")
        if is_student: labeled_combo("Year",["1","2","3","4"],"year")
        else:          labeled_combo("Academic Title",TITLES,"title")

        if not is_student:
            cf=ctk.CTkFrame(body,fg_color=COLORS["bg3"],corner_radius=10,
                             border_width=1,border_color=COLORS["blue"])
            cf.pack(fill="x",pady=(12,0))
            ci=ctk.CTkFrame(cf,fg_color="transparent"); ci.pack(fill="x",padx=14,pady=10)
            ctk.CTkLabel(ci,text="🔐  Login Credentials",
                         font=ctk.CTkFont("Segoe UI",13,"bold"),
                         text_color=COLORS["blue2"]).pack(anchor="w")
            ctk.CTkLabel(ci,text="Set username and password for this doctor",
                         font=ctk.CTkFont("Segoe UI",10),
                         text_color=COLORS["text2"]).pack(anchor="w",pady=(2,8))
            ctk.CTkLabel(ci,text="USERNAME",font=ctk.CTkFont("Segoe UI",9,"bold"),
                         text_color=COLORS["text3"]).pack(anchor="w")
            ue=ctk.CTkEntry(ci,height=38,placeholder_text="e.g. dr.ahmed",
                            fg_color=COLORS["bg"],border_color=COLORS["blue"],
                            text_color=COLORS["text"],corner_radius=9)
            ue.pack(fill="x",pady=(4,8)); fields["username"]=ue
            ctk.CTkLabel(ci,text="PASSWORD",font=ctk.CTkFont("Segoe UI",9,"bold"),
                         text_color=COLORS["text3"]).pack(anchor="w")
            pe=ctk.CTkEntry(ci,height=38,placeholder_text="e.g. Doctor@2024",
                            fg_color=COLORS["bg"],border_color=COLORS["blue"],
                            text_color=COLORS["text"],corner_radius=9)
            pe.pack(fill="x",pady=(4,0)); fields["password"]=pe

        fs=ctk.CTkFrame(body,fg_color=COLORS["bg3"],corner_radius=10,
                         border_width=1,border_color=COLORS["border2"])
        fs.pack(fill="x",pady=(16,0))
        fi=ctk.CTkFrame(fs,fg_color="transparent"); fi.pack(fill="x",padx=14,pady=12)
        ctk.CTkLabel(fi,text="📷  Face Registration",
                     font=ctk.CTkFont("Segoe UI",13,"bold"),
                     text_color=COLORS["text"]).pack(anchor="w")
        ctk.CTkLabel(fi,text="Optionally capture face now for attendance recognition",
                     font=ctk.CTkFont("Segoe UI",10),
                     text_color=COLORS["text2"]).pack(anchor="w",pady=(2,8))
        face_status=ctk.CTkLabel(fi,text="⚪  No face captured",
                                  font=ctk.CTkFont("Segoe UI",11),
                                  text_color=COLORS["text3"])
        face_status.pack(anchor="w")
        face_captured=[False]; face_frame_data=[None]

        def do_capture():
            cw=ctk.CTkToplevel(win); cw.title("Capture Face")
            cw.geometry("500x440"); cw.configure(fg_color=COLORS["bg"]); cw.grab_set()
            ctk.CTkLabel(cw,text="Position face in frame, then click Capture",
                         font=ctk.CTkFont("Segoe UI",11),
                         text_color=COLORS["text2"]).pack(pady=8)
            cv_c=tk.Canvas(cw,width=460,height=340,bg=COLORS["bg3"],highlightthickness=0)
            cv_c.pack()
            sl=ctk.CTkLabel(cw,text="Opening camera...",font=ctk.CTkFont("Segoe UI",11),
                             text_color=COLORS["text2"]); sl.pack(pady=4)
            cap=cv2.VideoCapture(0); running=[True]; last_frame=[None]
            def stream():
                while running[0]:
                    ret,frame=cap.read()
                    if not ret: continue
                    last_frame[0]=frame.copy()
                    boxes=fe.detect_faces(frame)
                    rgb=cv2.cvtColor(frame,cv2.COLOR_BGR2RGB)
                    for (x,y,w,h) in boxes:
                        cv2.rectangle(rgb,(x,y),(x+w,y+h),(52,211,153),2)
                    img=Image.fromarray(rgb).resize((460,340))
                    photo=ImageTk.PhotoImage(img)
                    try:
                        cv_c.create_image(0,0,anchor="nw",image=photo)
                        cv_c.image=photo
                        n=len(boxes)
                        sl.configure(text=f"✅ {n} face(s) detected" if n else "No face detected")
                    except: break
            threading.Thread(target=stream,daemon=True).start()
            def capture():
                running[0]=False; cap.release()
                frame=last_frame[0]
                if frame is None: cw.destroy(); return
                box=fe.largest_face(frame)
                if box is None:
                    messagebox.showwarning("No Face","No face detected — try again.",parent=cw)
                    cw.destroy(); do_capture(); return
                face_captured[0]=True; face_frame_data[0]=(frame,box)
                face_status.configure(text="✅  Face captured successfully",
                                       text_color=COLORS["green2"])
                cw.destroy()
            def cancel(): running[0]=False; cap.release(); cw.destroy()
            br=ctk.CTkFrame(cw,fg_color="transparent"); br.pack(pady=8)
            ctk.CTkButton(br,text="📷 Capture",fg_color=COLORS["blue3"],
                           hover_color=COLORS["blue"],corner_radius=10,
                           command=capture).pack(side="left",padx=8)
            ctk.CTkButton(br,text="Cancel",fg_color=COLORS["bg3"],
                           border_width=1,border_color=COLORS["border"],
                           text_color=COLORS["text2"],corner_radius=10,
                           command=cancel).pack(side="left")

        br2=ctk.CTkFrame(fi,fg_color="transparent"); br2.pack(anchor="w",pady=(8,0))
        ctk.CTkButton(br2,text="📷  Open Camera",width=130,height=32,
                      fg_color=COLORS["blue_dim"],border_width=1,
                      border_color=COLORS["blue"],text_color=COLORS["blue2"],
                      hover_color=COLORS["blue3"],corner_radius=8,
                      command=do_capture).pack(side="left")
        ctk.CTkLabel(br2,text=" (optional)",font=ctk.CTkFont("Segoe UI",10),
                     text_color=COLORS["text3"]).pack(side="left")

        email_status=ctk.CTkLabel(body,text="",font=ctk.CTkFont("Segoe UI",11),
                                   text_color=COLORS["green2"])
        email_status.pack(pady=(8,0))

        def submit():
            name=fields["name"].get().strip(); email=fields["email"].get().strip()
            if not name:
                messagebox.showwarning("Required","Please enter a name.",parent=win); return
            data={"name":name,"email":email,"phone":fields["phone"].get().strip(),
                  "dept":fields["dept"].get(),"has_face":face_captured[0]}
            if is_student:
                data["year"]=fields["year"].get()
                new_obj=self._store.add_student(data)
                if face_captured[0] and face_frame_data[0]:
                    fe.register_face(new_obj["id"],*face_frame_data[0])
                parts=name.lower().split()
                username=f"{parts[0]}.{parts[-1]}" if len(parts)>1 else parts[0]
                password="demo123"
                self._store.add_user({"username":username,"password":password,
                                       "role":"student","name":name,"email":email,
                                       "student_id":new_obj["id"]})
                if email and EMAIL_AVAILABLE:
                    email_status.configure(text="📧 Sending welcome email...",
                                           text_color=COLORS["text2"]); win.update()
                    send_welcome_email(to_email=email,to_name=name,username=username,
                                       password=password,role="student",
                                       student_id=new_obj["id"],
                                       on_success=lambda:email_status.configure(
                                           text=f"✅ Welcome email sent to {email}",
                                           text_color=COLORS["green2"]),
                                       on_error=lambda err:email_status.configure(
                                           text=f"⚠️ Email failed: {err}",
                                           text_color=COLORS["amber"]))
                self._refresh_student_table()
                messagebox.showinfo("Success",
                    f"✅ Student registered!\n\nName: {new_obj['name']}\n"
                    f"ID: {new_obj['id']}\nUsername: {username}\nPassword: {password}\n\n"
                    f"{'📧 Welcome email sent!' if email else '⚠️ No email provided.'}",
                    parent=win)
            else:
                data["title"]=fields["title"].get()
                new_obj=self._store.add_doctor(data)
                if face_captured[0] and face_frame_data[0]:
                    fe.register_face(new_obj["id"],*face_frame_data[0])
                uname=fields.get("username",""); pword=fields.get("password","")
                uname=uname.get().strip() if hasattr(uname,"get") else ""
                pword=pword.get().strip() if hasattr(pword,"get") else ""
                cred_msg=""
                if uname and pword:
                    self._store.add_user({"username":uname,"password":pword,
                                           "role":"doctor","name":name,"email":email,
                                           "doctor_id":new_obj["id"]})
                    cred_msg=f"\nUsername: {uname}\nPassword: {pword}"
                    if email and EMAIL_AVAILABLE:
                        email_status.configure(text="📧 Sending welcome email...",
                                               text_color=COLORS["text2"]); win.update()
                        send_welcome_email(to_email=email,to_name=name,username=uname,
                                           password=pword,role="doctor",
                                           on_success=lambda:email_status.configure(
                                               text=f"✅ Welcome email sent to {email}",
                                               text_color=COLORS["green2"]),
                                           on_error=lambda err:email_status.configure(
                                               text=f"⚠️ Email failed: {err}",
                                               text_color=COLORS["amber"]))
                else:
                    cred_msg="\n⚠️ No credentials set"
                self._refresh_doctor_table()
                messagebox.showinfo("Success",
                    f"✅ Lecturer registered!\n\nName: {new_obj['name']}\n"
                    f"ID: {new_obj['id']}{cred_msg}\n\n"
                    f"{'📧 Welcome email sent!' if email else '⚠️ No email.'}",parent=win)
            win.destroy()

        ctk.CTkButton(body,
                      text=f"✅  {'Register Student' if is_student else 'Register Lecturer'}",
                      height=44,fg_color=COLORS["blue3"],hover_color=COLORS["blue"],
                      corner_radius=10,font=ctk.CTkFont("Segoe UI",13,"bold"),
                      command=submit).pack(fill="x",pady=(16,0))

    # ══════════════════════════════════════════════════════
    #  FACE CAPTURE DIALOG
    # ══════════════════════════════════════════════════════
    def _open_face_capture_dialog(self, person_id, person_type, callback=None):
        store=self._store
        obj=(store.get_student(person_id) if person_type=="student"
             else store.get_doctor(person_id))
        if not obj: return
        win=ctk.CTkToplevel(self)
        win.title(f"Register Face — {obj['name']}")
        win.geometry("520x480"); win.configure(fg_color=COLORS["bg"]); win.grab_set()
        ctk.CTkLabel(win,text="📷  Face Registration",
                     font=ctk.CTkFont("Segoe UI",18,"bold"),
                     text_color=COLORS["text"]).pack(pady=(18,4))
        ctk.CTkLabel(win,text=f"{obj['name']}  ·  {person_id}",
                     font=ctk.CTkFont("Segoe UI",12),
                     text_color=COLORS["text2"]).pack(pady=(0,12))
        cv_canvas=tk.Canvas(win,width=460,height=310,bg=COLORS["bg3"],highlightthickness=0)
        cv_canvas.pack()
        status_lbl=ctk.CTkLabel(win,text="Opening camera...",
                                 font=ctk.CTkFont("Segoe UI",11),
                                 text_color=COLORS["text2"]); status_lbl.pack(pady=6)
        cap=cv2.VideoCapture(0); running=[True]; last_frame=[None]
        def stream():
            while running[0]:
                ret,frame=cap.read()
                if not ret: continue
                last_frame[0]=frame.copy()
                boxes=fe.detect_faces(frame)
                rgb=cv2.cvtColor(frame,cv2.COLOR_BGR2RGB)
                for (x,y,w,h) in boxes:
                    cv2.rectangle(rgb,(x,y),(x+w,y+h),(52,211,153),2)
                    cv2.putText(rgb,"← Align face here",(x+w+4,y+h//2),
                                cv2.FONT_HERSHEY_SIMPLEX,0.5,(52,211,153),1)
                img=Image.fromarray(rgb).resize((460,310))
                photo=ImageTk.PhotoImage(img)
                try:
                    cv_canvas.create_image(0,0,anchor="nw",image=photo)
                    cv_canvas.image=photo
                    n=len(boxes)
                    status_lbl.configure(
                        text=f"✅  {n} face(s) detected — ready to capture" if n
                        else "⚠️  No face detected — move closer")
                except: break
        threading.Thread(target=stream,daemon=True).start()
        def capture():
            running[0]=False; cap.release()
            frame=last_frame[0]
            if frame is None:
                messagebox.showwarning("Error","No frame captured.",parent=win); return
            box=fe.largest_face(frame)
            if box is None:
                messagebox.showwarning("No Face","No face detected.",parent=win); return
            ok=fe.register_face(person_id,frame,box)
            if ok:
                if person_type=="student":
                    store.update_student(person_id,{"has_face":True,
                        "registered_at":datetime.now().strftime("%Y-%m-%d %H:%M")})
                else:
                    d=store.get_doctor(person_id)
                    if d: d["has_face"]=True; store._persist()
                messagebox.showinfo("Success",f"Face registered for {obj['name']}!",parent=win)
                if callback: callback()
                win.destroy()
            else:
                messagebox.showerror("Error","Failed to encode face.",parent=win)
        btn_r=ctk.CTkFrame(win,fg_color="transparent"); btn_r.pack(pady=4)
        ctk.CTkButton(btn_r,text="📷  Capture & Save",fg_color=COLORS["green"],
                       hover_color="#059669",corner_radius=10,
                       font=ctk.CTkFont("Segoe UI",12,"bold"),
                       command=capture).pack(side="left",padx=8)
        ctk.CTkButton(btn_r,text="Cancel",fg_color=COLORS["bg3"],
                       border_width=1,border_color=COLORS["border"],
                       text_color=COLORS["text2"],corner_radius=10,
                       command=lambda:(setattr(running,"__setitem__",(0,False)),
                                       cap.release(),win.destroy())).pack(side="left")
        def on_close():
            running[0]=False
            try: cap.release()
            except: pass
            win.destroy()
        win.protocol("WM_DELETE_WINDOW",on_close)

    # ══════════════════════════════════════════════════════
    #  LECTURES
    # ══════════════════════════════════════════════════════
    def _page_lectures(self, parent):
        pad={"padx":20,"pady":6}
        hdr=ctk.CTkFrame(parent,fg_color="transparent"); hdr.pack(fill="x",**pad)
        ctk.CTkLabel(hdr,text="Lectures",font=ctk.CTkFont("Segoe UI",22,"bold"),
                     text_color=COLORS["text"]).pack(side="left")
        tbl_card=Card(parent,title="All Lectures"); tbl_card.pack(fill="both",expand=True,**pad)
        cols=[{"key":"id","label":"ID","width":70},
              {"key":"name","label":"Course","width":200,"stretch":True},
              {"key":"room","label":"Room","width":80},
              {"key":"time","label":"Time","width":70},
              {"key":"doctor","label":"Lecturer","width":160},
              {"key":"present","label":"Present","width":80},
              {"key":"eng","label":"Engagement","width":100},
              {"key":"status","label":"Status","width":90}]
        tbl=DataTable(tbl_card,cols); tbl.pack(fill="both",expand=True,padx=12,pady=(4,12))
        tbl.load([(l["id"],l["name"],l["room"],l["time"],l["doctor"],
                   f"{l['present']}/{l['students']}",f"{l['avg_engagement']}%",
                   l["status"].title()) for l in self._store.lectures])

    # ══════════════════════════════════════════════════════
    #  R REPORTS
    # ══════════════════════════════════════════════════════
    def _page_r_reports(self, parent):
        pad={"padx":20,"pady":6}
        ctk.CTkLabel(parent,text="R Analysis Reports",
                     font=ctk.CTkFont("Segoe UI",22,"bold"),
                     text_color=COLORS["text"]).pack(anchor="w",**pad)
        r_ok=os.path.exists(RSCRIPT)
        info=ctk.CTkFrame(parent,
                           fg_color=COLORS["green_dim"] if r_ok else COLORS["red_dim"],
                           corner_radius=10,border_width=1,
                           border_color=COLORS["green"] if r_ok else COLORS["red"])
        info.pack(fill="x",**pad)
        ctk.CTkLabel(info,
                     text=f"✅  R detected at {RSCRIPT}" if r_ok
                          else "❌  R not found. Check RSCRIPT variable in admin_page.py",
                     font=ctk.CTkFont("Segoe UI",11),
                     text_color=COLORS["green2"] if r_ok else COLORS["red2"]
                     ).pack(padx=14,pady=10)
        row1=ctk.CTkFrame(parent,fg_color="transparent"); row1.pack(fill="x",**pad)
        row1.grid_columnconfigure(0,weight=1); row1.grid_columnconfigure(1,weight=1)
        sc=Card(row1,title="Available R Scripts"); sc.grid(row=0,column=0,padx=(0,8),sticky="nsew")
        for name,file,desc,color in [
            ("Install Packages","install_packages.R","One-time package installer · Run this first",COLORS["amber"]),
            ("Full Analysis","analysis.R","Emotion distribution, clustering, charts",COLORS["blue"]),
            ("Shiny Dashboard","shiny_dashboard.R",f"Launches interactive dashboard on localhost:{SHINY_PORT}",COLORS["green"]),
        ]:
            r=ctk.CTkFrame(sc,fg_color=COLORS["bg3"],corner_radius=8)
            r.pack(fill="x",padx=12,pady=(0,6))
            tk.Frame(r,bg=color,width=4).pack(side="left",fill="y")
            inf=ctk.CTkFrame(r,fg_color="transparent")
            inf.pack(side="left",fill="x",expand=True,padx=10,pady=10)
            ctk.CTkLabel(inf,text=name,font=ctk.CTkFont("Segoe UI",12,"bold"),
                         text_color=COLORS["text"]).pack(anchor="w")
            ctk.CTkLabel(inf,text=f"{file} · {desc}",font=ctk.CTkFont("Segoe UI",10),
                         text_color=COLORS["text2"]).pack(anchor="w")
            ctk.CTkButton(r,text="▶ Run",width=80,height=32,
                           fg_color=color,hover_color=COLORS["blue"],
                           text_color="#fff",corner_radius=8,
                           command=lambda f=file:self._run_r(f)).pack(side="right",padx=10)
        cmd_c=Card(row1,title="Terminal Commands"); cmd_c.grid(row=0,column=1,sticky="nsew")
        box=ctk.CTkFrame(cmd_c,fg_color=COLORS["bg"],corner_radius=10)
        box.pack(fill="x",padx=12,pady=(4,12))
        for cmt,cmd in [
            ("# Install R packages","Rscript r_analysis/install_packages.R"),
            ("# Run full analysis","Rscript r_analysis/analysis.R data/sample_emotion_data.csv results.json"),
            ("# Launch Shiny",f"Rscript -e \"shiny::runApp('r_analysis/shiny_dashboard.R',port={SHINY_PORT})\""),
            ("# Python backend","uvicorn backend.main:app --reload --port 5000"),
        ]:
            ctk.CTkLabel(box,text=cmt,font=ctk.CTkFont("Consolas",10),
                         text_color=COLORS["text3"]).pack(anchor="w",padx=12,pady=(8,0))
            ctk.CTkLabel(box,text=cmd,font=ctk.CTkFont("Consolas",10),
                         text_color=COLORS["green2"]).pack(anchor="w",padx=12,pady=(0,4))
        out_c=Card(parent,title="R Script Output"); out_c.pack(fill="x",**pad)
        self._r_out=ctk.CTkTextbox(out_c,height=160,font=ctk.CTkFont("Consolas",11),
                                    fg_color=COLORS["bg"],text_color=COLORS["green2"],
                                    corner_radius=10)
        self._r_out.pack(fill="x",padx=12,pady=(4,12))
        self._r_out.insert("end","# R output will appear here...\n")
        self._r_out.configure(state="disabled")

    def _run_r(self, script_file):
        base=os.path.normpath(os.path.join(os.path.dirname(__file__),"..","..","r_analysis"))
        sp=os.path.join(base,script_file)
        dp=os.path.normpath(os.path.join(base,"..","data","sample_emotion_data.csv"))
        self._r_out.configure(state="normal"); self._r_out.delete("1.0","end")
        self._r_out.insert("end",f"⟳ Running {script_file}...\n")
        self._r_out.configure(state="disabled"); self.update()
        if script_file=="shiny_dashboard.R":
            sp_posix=sp.replace("\\","/")
            def launch():
                try:
                    subprocess.Popen([RSCRIPT,"-e",
                        f"shiny::runApp('{sp_posix}',port={SHINY_PORT},launch.browser=FALSE)"],cwd=base)
                    time.sleep(3); webbrowser.open(f"http://localhost:{SHINY_PORT}")
                    self._r_out.configure(state="normal")
                    self._r_out.insert("end",f"✅ Shiny launched!\n🌐 http://localhost:{SHINY_PORT}\n")
                    self._r_out.configure(state="disabled")
                except Exception as e:
                    self._r_out.configure(state="normal")
                    self._r_out.insert("end",f"❌ {e}\n"); self._r_out.configure(state="disabled")
            threading.Thread(target=launch,daemon=True).start()
            self._r_out.configure(state="normal")
            self._r_out.insert("end","⟳ Starting Shiny... browser opens in 3 seconds.\n")
            self._r_out.configure(state="disabled"); return
        try:
            if script_file=="analysis.R":
                rp=os.path.join(base,"results.json")
                proc=subprocess.run([RSCRIPT,sp,dp,rp],capture_output=True,text=True,timeout=120,cwd=base)
            else:
                proc=subprocess.run([RSCRIPT,sp],capture_output=True,text=True,timeout=60,cwd=base)
            out=proc.stdout+(proc.stderr if proc.returncode!=0 else "")
            st="✅ Completed!" if proc.returncode==0 else "❌ Errors occurred"
        except FileNotFoundError: out,st="",f"❌ Rscript not found at:\n{RSCRIPT}"
        except subprocess.TimeoutExpired: out,st="","❌ Script timed out"
        except Exception as e: out,st="",f"❌ {e}"
        self._r_out.configure(state="normal")
        self._r_out.insert("end",f"{st}\n\n{out}"); self._r_out.configure(state="disabled")

    # ══════════════════════════════════════════════════════
    #  SETTINGS
    # ══════════════════════════════════════════════════════
    def _page_settings(self, parent):
        pad={"padx":20,"pady":6}
        ctk.CTkLabel(parent,text="System Settings",
                     font=ctk.CTkFont("Segoe UI",22,"bold"),
                     text_color=COLORS["text"]).pack(anchor="w",**pad)
        row1=ctk.CTkFrame(parent,fg_color="transparent"); row1.pack(fill="x",**pad)
        row1.grid_columnconfigure(0,weight=1); row1.grid_columnconfigure(1,weight=1)
        fr=Card(row1,title="Face Recognition"); fr.grid(row=0,column=0,padx=(0,8),sticky="nsew")
        for l,d in [("Enable face detection",True),("Auto-mark attendance",True),
                    ("Save face encodings",True),("Alert on unknown face",False)]:
            self._toggle_row(fr,l,d)
        ea=Card(row1,title="Emotion Analysis"); ea.grid(row=0,column=1,sticky="nsew")
        for l,d in [("Real-time emotion detection",True),("Low-engagement alerts",True),
                    ("Store emotion history",True)]:
            self._toggle_row(ea,l,d)
        ctk.CTkLabel(ea,text="Alert Threshold",font=ctk.CTkFont("Segoe UI",11),
                     text_color=COLORS["text2"]).pack(anchor="w",padx=14,pady=(10,0))
        sl=ctk.CTkSlider(ea,from_=10,to=60,number_of_steps=50,
                          progress_color=COLORS["blue"],button_color=COLORS["blue2"])
        sl.set(35); sl.pack(fill="x",padx=14,pady=(4,4))
        tl=ctk.CTkLabel(ea,text="35%",font=ctk.CTkFont("Segoe UI",10),
                         text_color=COLORS["text3"])
        tl.pack(anchor="w",padx=14,pady=(0,12))
        sl.configure(command=lambda v:tl.configure(text=f"{int(v)}%"))
        em=Card(parent,title="📧  Email Notifications"); em.pack(fill="x",**pad)
        em_inner=ctk.CTkFrame(em,fg_color="transparent"); em_inner.pack(fill="x",padx=14,pady=12)
        sc=COLORS["green2"] if EMAIL_AVAILABLE else COLORS["red2"]
        st=("✅  Email service is active — emails sent on registration"
            if EMAIL_AVAILABLE else
            "❌  Email service not found — place email_service.py in gui/")
        ctk.CTkLabel(em_inner,text=st,font=ctk.CTkFont("Segoe UI",11),
                     text_color=sc).pack(anchor="w")
        ctk.CTkLabel(em_inner,
                     text="Sender: edusense.system@gmail.com\n"
                          "Emails are sent automatically when a student, doctor, or parent is registered.",
                     font=ctk.CTkFont("Segoe UI",10),
                     text_color=COLORS["text2"],justify="left").pack(anchor="w",pady=(6,0))

    def _toggle_row(self, parent, label, default):
        row=ctk.CTkFrame(parent,fg_color="transparent"); row.pack(fill="x",padx=14,pady=5)
        ctk.CTkLabel(row,text=label,font=ctk.CTkFont("Segoe UI",11),
                     text_color=COLORS["text"]).pack(side="left")
        sw=ctk.CTkSwitch(row,text="",progress_color=COLORS["blue"],
                          button_color=COLORS["blue2"],width=44)
        if default: sw.select()
        sw.pack(side="right")

    # ══════════════════════════════════════════════════════
    #  COURSE MANAGEMENT
    # ══════════════════════════════════════════════════════
    def _page_courses(self, parent):
        pad={"padx":20,"pady":6}
        hdr=ctk.CTkFrame(parent,fg_color="transparent"); hdr.pack(fill="x",**pad)
        ctk.CTkLabel(hdr,text="Course Management",
                     font=ctk.CTkFont("Segoe UI",24,"bold"),
                     text_color=COLORS["text"]).pack(side="left",anchor="w")
        ctk.CTkButton(hdr,text="+ Add Course",width=140,height=38,
                       fg_color=COLORS["blue3"],hover_color=COLORS["blue"],
                       corner_radius=10,font=ctk.CTkFont("Segoe UI",12,"bold"),
                       command=self._add_course_dialog).pack(side="right")
        stat_row=ctk.CTkFrame(parent,fg_color="transparent"); stat_row.pack(fill="x",**pad)
        for i,(l,v,s,ic,ac) in enumerate([
            ("Total Courses",str(len(self._store.courses)),"This semester","📚","blue"),
            ("Total Doctors",str(len(self._store.doctors)),"Active lecturers","👨‍🏫","purple"),
            ("Total Students",str(len(self._store.students)),"Enrolled","🎓","green"),
            ("Semester","Fall 2024","16 Weeks","📅","amber"),
        ]):
            StatCard(stat_row,l,v,s,ic,ac).grid(row=0,column=i,padx=6,sticky="nsew")
            stat_row.grid_columnconfigure(i,weight=1)
        cards_frame=ctk.CTkScrollableFrame(parent,fg_color="transparent",
                                            scrollbar_button_color=COLORS["border2"])
        cards_frame.pack(fill="both",expand=True,**pad)
        for course in self._store.courses:
            self._render_course_card(cards_frame,course)

    def _render_course_card(self, parent, course):
        card=ctk.CTkFrame(parent,fg_color=COLORS["card"],corner_radius=14,
                           border_width=1,border_color=COLORS["border"])
        card.pack(fill="x",pady=6)
        tk.Frame(card,bg=course.get("color","#3b82f6"),width=6).pack(side="left",fill="y")
        content=ctk.CTkFrame(card,fg_color="transparent")
        content.pack(side="left",fill="both",expand=True,padx=16,pady=14)
        row1=ctk.CTkFrame(content,fg_color="transparent"); row1.pack(fill="x")
        ctk.CTkLabel(row1,text=f"📚 {course['name']}",
                     font=ctk.CTkFont("Segoe UI",15,"bold"),
                     text_color=COLORS["text"]).pack(side="left")
        Badge(row1,course["code"],COLORS["blue"]).pack(side="left",padx=8)
        row2=ctk.CTkFrame(content,fg_color="transparent"); row2.pack(fill="x",pady=(4,0))
        doctor=self._store.get_doctor(course.get("doctor_id",""))
        doc_name=doctor["name"] if doctor else "⚠️ Not assigned"
        enrolled=len(self._store.course_enrollments.get(course["id"],[]))
        weeks=course.get("weeks",list(range(1,17)))
        for text,color in [
            (f"👨‍🏫 {doc_name}",COLORS["text2"]),
            (f"🚪 {course.get('room','')}",COLORS["text2"]),
            (f"⏰ {course.get('time','')}",COLORS["text2"]),
            (f"👥 {enrolled} students",COLORS["green2"]),
            (f"📅 {len(weeks)} weeks",COLORS["blue2"]),
        ]:
            ctk.CTkLabel(row2,text=text,font=ctk.CTkFont("Segoe UI",11),
                         text_color=color).pack(side="left",padx=(0,16))
        btns=ctk.CTkFrame(card,fg_color="transparent"); btns.pack(side="right",padx=12)
        ctk.CTkButton(btns,text="👨‍🏫 Assign Doctor",width=130,height=30,
                       fg_color=COLORS["blue_dim"],border_width=1,border_color=COLORS["blue"],
                       text_color=COLORS["blue2"],hover_color=COLORS["blue3"],corner_radius=8,
                       font=ctk.CTkFont("Segoe UI",10,"bold"),
                       command=lambda c=course:self._assign_doctor_dialog(c)).pack(pady=3)
        ctk.CTkButton(btns,text="📋 Edit Weeks",width=130,height=30,
                       fg_color=COLORS["purple_dim"],border_width=1,border_color=COLORS["purple"],
                       text_color=COLORS["purple2"],hover_color=COLORS["purple"],corner_radius=8,
                       font=ctk.CTkFont("Segoe UI",10,"bold"),
                       command=lambda c=course:self._edit_weeks_dialog(c)).pack(pady=3)
        ctk.CTkButton(btns,text="🗑️ Delete",width=130,height=30,
                       fg_color=COLORS["red_dim"],border_width=1,border_color=COLORS["red"],
                       text_color=COLORS["red2"],hover_color=COLORS["red"],corner_radius=8,
                       font=ctk.CTkFont("Segoe UI",10,"bold"),
                       command=lambda c=course:self._delete_course(c)).pack(pady=3)

    def _add_course_dialog(self):
        win=ctk.CTkToplevel(self); win.title("Add New Course")
        win.geometry("500x620"); win.configure(fg_color=COLORS["card"]); win.grab_set()
        ctk.CTkLabel(win,text="📚  Add New Course",
                     font=ctk.CTkFont("Segoe UI",18,"bold"),
                     text_color=COLORS["text"]).pack(pady=(20,4))
        body=ctk.CTkFrame(win,fg_color="transparent"); body.pack(fill="x",padx=28)
        fields={}
        for label,key,placeholder in [
            ("COURSE CODE","code","e.g., CS301"),
            ("COURSE NAME","name","e.g., Introduction to AI"),
            ("ROOM","room","e.g., Hall A"),
            ("TIME","time","e.g., 09:00"),
        ]:
            ctk.CTkLabel(body,text=label,font=ctk.CTkFont("Segoe UI",9,"bold"),
                         text_color=COLORS["text3"]).pack(anchor="w",pady=(10,0))
            e=ctk.CTkEntry(body,height=38,placeholder_text=placeholder,
                           fg_color=COLORS["bg3"],border_color=COLORS["border"],
                           text_color=COLORS["text"],corner_radius=9)
            e.pack(fill="x",pady=(4,0)); fields[key]=e
        ctk.CTkLabel(body,text="ASSIGN DOCTOR",font=ctk.CTkFont("Segoe UI",9,"bold"),
                     text_color=COLORS["text3"]).pack(anchor="w",pady=(10,0))
        doc_names=[f"{d['id']} — {d['name']}" for d in self._store.doctors]
        doc_var=ctk.StringVar(value=doc_names[0] if doc_names else "")
        ctk.CTkComboBox(body,values=doc_names,variable=doc_var,height=38,
                         fg_color=COLORS["bg3"],border_color=COLORS["border"],
                         text_color=COLORS["text"],button_color=COLORS["blue3"],
                         dropdown_fg_color=COLORS["card"],corner_radius=9).pack(fill="x",pady=(4,0))
        ctk.CTkLabel(body,text="DURATION (MINUTES)",font=ctk.CTkFont("Segoe UI",9,"bold"),
                     text_color=COLORS["text3"]).pack(anchor="w",pady=(10,0))
        dur_var=ctk.StringVar(value="90")
        ctk.CTkComboBox(body,values=["45","60","90","120"],variable=dur_var,height=38,
                         fg_color=COLORS["bg3"],border_color=COLORS["border"],
                         text_color=COLORS["text"],button_color=COLORS["blue3"],
                         dropdown_fg_color=COLORS["card"],corner_radius=9).pack(fill="x",pady=(4,0))
        def create():
            code=fields["code"].get().strip(); name=fields["name"].get().strip()
            if not code or not name:
                messagebox.showerror("Error","Course code and name are required!",parent=win); return
            doc_id=doc_var.get().split(" — ")[0] if doc_var.get() else ""
            course=self._store.add_course({"code":code,"name":name,
                "room":fields["room"].get().strip(),"time":fields["time"].get().strip(),
                "doctor_id":doc_id,"duration":int(dur_var.get()),"weeks":list(range(1,17))})
            messagebox.showinfo("Success",f"✅ Course {course['code']} created!",parent=win)
            win.destroy(); self._on_nav("courses")
        ctk.CTkButton(body,text="Create Course",height=44,fg_color=COLORS["blue3"],
                       hover_color=COLORS["blue"],corner_radius=10,
                       font=ctk.CTkFont("Segoe UI",13,"bold"),command=create).pack(fill="x",pady=20)

    def _assign_doctor_dialog(self, course):
        win=ctk.CTkToplevel(self); win.title("Assign Doctor")
        win.geometry("400x280"); win.configure(fg_color=COLORS["card"]); win.grab_set()
        ctk.CTkLabel(win,text=f"👨‍🏫  Assign Doctor to {course['name']}",
                     font=ctk.CTkFont("Segoe UI",14,"bold"),
                     text_color=COLORS["text"]).pack(pady=(20,4),padx=20)
        body=ctk.CTkFrame(win,fg_color="transparent"); body.pack(fill="x",padx=28)
        ctk.CTkLabel(body,text="SELECT DOCTOR",font=ctk.CTkFont("Segoe UI",9,"bold"),
                     text_color=COLORS["text3"]).pack(anchor="w",pady=(12,0))
        doc_names=[f"{d['id']} — {d['name']}" for d in self._store.doctors]
        current=next((f"{d['id']} — {d['name']}" for d in self._store.doctors
                       if d["id"]==course.get("doctor_id","")),
                     doc_names[0] if doc_names else "")
        doc_var=ctk.StringVar(value=current)
        ctk.CTkComboBox(body,values=doc_names,variable=doc_var,height=38,
                         fg_color=COLORS["bg3"],border_color=COLORS["border"],
                         text_color=COLORS["text"],button_color=COLORS["blue3"],
                         dropdown_fg_color=COLORS["card"],corner_radius=9).pack(fill="x",pady=(4,0))
        def assign():
            doc_id=doc_var.get().split(" — ")[0]
            self._store.assign_doctor_to_course(course["id"],doc_id)
            messagebox.showinfo("Success","✅ Doctor assigned!",parent=win)
            win.destroy(); self._on_nav("courses")
        ctk.CTkButton(body,text="Assign Doctor",height=42,fg_color=COLORS["blue3"],
                       hover_color=COLORS["blue"],corner_radius=10,
                       font=ctk.CTkFont("Segoe UI",12,"bold"),command=assign).pack(fill="x",pady=20)

    def _edit_weeks_dialog(self, course):
        win=ctk.CTkToplevel(self); win.title("Edit Course Weeks")
        win.geometry("500x500"); win.configure(fg_color=COLORS["card"]); win.grab_set()
        ctk.CTkLabel(win,text=f"📅  Edit Weeks — {course['name']}",
                     font=ctk.CTkFont("Segoe UI",14,"bold"),
                     text_color=COLORS["text"]).pack(pady=(20,4),padx=20)
        ctk.CTkLabel(win,text="Select which weeks this course runs (Semester = 16 weeks)",
                     font=ctk.CTkFont("Segoe UI",11),
                     text_color=COLORS["text2"]).pack(pady=(0,12))
        body=ctk.CTkScrollableFrame(win,fg_color="transparent",height=280)
        body.pack(fill="x",padx=28)
        current_weeks=set(course.get("weeks",list(range(1,17))))
        week_vars={}
        for row in range(4):
            r=ctk.CTkFrame(body,fg_color="transparent"); r.pack(fill="x",pady=3)
            for col in range(4):
                week=(row*4)+col+1
                var=ctk.BooleanVar(value=week in current_weeks)
                ctk.CTkCheckBox(r,text=f"Week {week}",variable=var,
                                 text_color=COLORS["text"],fg_color=COLORS["blue3"],
                                 hover_color=COLORS["blue"]).pack(side="left",padx=8)
                week_vars[week]=var
        def save():
            weeks=[w for w,v in week_vars.items() if v.get()]
            if not weeks:
                messagebox.showerror("Error","Select at least one week!",parent=win); return
            self._store.update_course(course["id"],{"weeks":weeks})
            messagebox.showinfo("Success",f"✅ Updated to {len(weeks)} weeks!",parent=win)
            win.destroy(); self._on_nav("courses")
        footer=ctk.CTkFrame(win,fg_color="transparent"); footer.pack(fill="x",padx=28,pady=10)
        ctk.CTkButton(footer,text="Select All",width=100,height=36,
                       fg_color=COLORS["bg3"],text_color=COLORS["text2"],corner_radius=8,
                       command=lambda:[v.set(True) for v in week_vars.values()]).pack(side="left",padx=(0,8))
        ctk.CTkButton(footer,text="Clear All",width=100,height=36,
                       fg_color=COLORS["bg3"],text_color=COLORS["text2"],corner_radius=8,
                       command=lambda:[v.set(False) for v in week_vars.values()]).pack(side="left")
        ctk.CTkButton(footer,text="Save Changes",height=40,fg_color=COLORS["blue3"],
                       hover_color=COLORS["blue"],corner_radius=10,
                       font=ctk.CTkFont("Segoe UI",12,"bold"),command=save).pack(side="right")

    def _delete_course(self, course):
        if messagebox.askyesno("Delete Course",
                f"Delete '{course['name']}'?\nThis will remove all enrollment data!"):
            self._store.delete_course(course["id"]); self._on_nav("courses")

    # ══════════════════════════════════════════════════════
    #  ENROLLMENT MANAGEMENT  (with search + bulk actions)
    # ══════════════════════════════════════════════════════
    def _page_enrollments(self, parent):
        pad={"padx":20,"pady":6}
        ctk.CTkLabel(parent,text="Enrollment Management",
                     font=ctk.CTkFont("Segoe UI",24,"bold"),
                     text_color=COLORS["text"]).pack(anchor="w",**pad)
        ctk.CTkLabel(parent,text="Select a course to manage student enrollments",
                     font=ctk.CTkFont("Segoe UI",12),
                     text_color=COLORS["text2"]).pack(anchor="w",padx=20,pady=(0,6))

        # ── course selector ───────────────────────────────
        sel=ctk.CTkFrame(parent,fg_color=COLORS["bg3"],corner_radius=10)
        sel.pack(fill="x",padx=20,pady=(0,6))
        inner=ctk.CTkFrame(sel,fg_color="transparent"); inner.pack(padx=16,pady=12,fill="x")
        ctk.CTkLabel(inner,text="Select Course:",font=ctk.CTkFont("Segoe UI",12,"bold"),
                     text_color=COLORS["text2"]).pack(side="left",padx=(0,12))
        course_names=[f"{c['code']} — {c['name']}" for c in self._store.courses]
        self._enroll_course_var=ctk.StringVar(value=course_names[0] if course_names else "")
        self._enroll_search_var=ctk.StringVar()

        ctk.CTkComboBox(inner,values=course_names,variable=self._enroll_course_var,
                         width=350,height=38,fg_color=COLORS["bg"],
                         border_color=COLORS["border"],text_color=COLORS["text"],
                         button_color=COLORS["blue3"],dropdown_fg_color=COLORS["card"],
                         corner_radius=9,
                         command=lambda v:(
                             self._enroll_search_var.set(""),
                             self._refresh_enrollment_view(enroll_frame,unenroll_frame)
                         )).pack(side="left")

        # ── search bar ────────────────────────────────────
        search_row=ctk.CTkFrame(parent,fg_color="transparent")
        search_row.pack(fill="x",padx=20,pady=(0,6))
        ctk.CTkEntry(search_row,textvariable=self._enroll_search_var,
                     placeholder_text="🔍  Search student by name, ID, or department...",
                     height=38,fg_color=COLORS["bg3"],border_color=COLORS["border"],
                     text_color=COLORS["text"],corner_radius=10
                     ).pack(side="left",fill="x",expand=True,padx=(0,8))
        ctk.CTkButton(search_row,text="✕",width=38,height=38,
                      fg_color="transparent",border_width=1,
                      border_color=COLORS["border2"],text_color=COLORS["text3"],
                      hover_color=COLORS["bg3"],corner_radius=10,
                      command=lambda:self._enroll_search_var.set("")
                      ).pack(side="left")
        self._enroll_search_var.trace_add("write",
            lambda *_:self._refresh_enrollment_view(enroll_frame,unenroll_frame))

        # ── stats label ───────────────────────────────────
        self._enroll_stats_lbl=ctk.CTkLabel(parent,text="",
                                             font=ctk.CTkFont("Segoe UI",11),
                                             text_color=COLORS["text2"])
        self._enroll_stats_lbl.pack(anchor="w",padx=20,pady=(0,4))

        # ── two-column list ───────────────────────────────
        cols=ctk.CTkFrame(parent,fg_color="transparent")
        cols.pack(fill="both",expand=True,padx=20,pady=6)
        cols.grid_columnconfigure(0,weight=1); cols.grid_columnconfigure(1,weight=1)

        left_card =Card(cols,title="📋 Not Enrolled")
        left_card.grid(row=0,column=0,padx=(0,8),sticky="nsew")
        right_card=Card(cols,title="✅ Enrolled")
        right_card.grid(row=0,column=1,sticky="nsew")

        unenroll_frame=ctk.CTkScrollableFrame(left_card,fg_color="transparent",height=350,
                                               scrollbar_button_color=COLORS["border2"])
        unenroll_frame.pack(fill="both",expand=True,padx=8,pady=(4,8))
        enroll_frame  =ctk.CTkScrollableFrame(right_card,fg_color="transparent",height=350,
                                               scrollbar_button_color=COLORS["border2"])
        enroll_frame.pack(fill="both",expand=True,padx=8,pady=(4,8))

        # ── bulk actions ──────────────────────────────────
        bulk_row=ctk.CTkFrame(parent,fg_color="transparent")
        bulk_row.pack(fill="x",padx=20,pady=(0,8))
        ctk.CTkButton(bulk_row,text="✅ Enroll All Visible",width=160,height=34,
                      fg_color=COLORS["green_dim"],border_width=1,
                      border_color=COLORS["green"],text_color=COLORS["green2"],
                      hover_color=COLORS["green"],corner_radius=8,
                      font=ctk.CTkFont("Segoe UI",11,"bold"),
                      command=lambda:self._bulk_enroll(enroll_frame,unenroll_frame)
                      ).pack(side="left",padx=(0,8))
        ctk.CTkButton(bulk_row,text="🗑 Remove All Visible",width=160,height=34,
                      fg_color=COLORS["red_dim"],border_width=1,
                      border_color=COLORS["red"],text_color=COLORS["red2"],
                      hover_color=COLORS["red"],corner_radius=8,
                      font=ctk.CTkFont("Segoe UI",11,"bold"),
                      command=lambda:self._bulk_unenroll(enroll_frame,unenroll_frame)
                      ).pack(side="left")

        self._refresh_enrollment_view(enroll_frame,unenroll_frame)

    def _refresh_enrollment_view(self, enroll_frame, unenroll_frame):
        for w in enroll_frame.winfo_children():   w.destroy()
        for w in unenroll_frame.winfo_children(): w.destroy()

        val       =self._enroll_course_var.get()
        course_id =val.split(" — ")[0] if val else ""

        q=getattr(self,"_enroll_search_var",None)
        q=q.get().lower().strip() if q else ""

        enrolled     =self._store.get_enrolled_students(course_id)
        not_enrolled =self._store.get_unenrolled_students(course_id)

        # apply filter
        if q:
            enrolled    =[s for s in enrolled
                          if q in s["name"].lower() or q in s["id"].lower()
                          or q in s.get("dept","").lower()]
            not_enrolled=[s for s in not_enrolled
                          if q in s["name"].lower() or q in s["id"].lower()
                          or q in s.get("dept","").lower()]

        self._visible_enrolled     =enrolled
        self._visible_not_enrolled =not_enrolled

        # stats
        total_e=len(self._store.get_enrolled_students(course_id))
        total_n=len(self._store.get_unenrolled_students(course_id))
        if hasattr(self,"_enroll_stats_lbl"):
            self._enroll_stats_lbl.configure(
                text=(f"👥 {total_e} enrolled  ·  📋 {total_n} not enrolled"
                      f"  ·  🔍 Showing {len(enrolled)} + {len(not_enrolled)} results"
                      if q else
                      f"👥 {total_e} enrolled  ·  📋 {total_n} not enrolled"))

        # ── enrolled list ─────────────────────────────────
        if not enrolled:
            ctk.CTkLabel(enroll_frame,
                         text="No results." if q else "No students enrolled",
                         font=ctk.CTkFont("Segoe UI",11),
                         text_color=COLORS["text3"]).pack(pady=20)
        for s in enrolled:
            row=ctk.CTkFrame(enroll_frame,fg_color=COLORS["green_dim"],
                             corner_radius=8,border_width=1,border_color=COLORS["green"])
            row.pack(fill="x",pady=2)
            info=ctk.CTkFrame(row,fg_color="transparent")
            info.pack(side="left",fill="x",expand=True,padx=10,pady=8)
            ctk.CTkLabel(info,text=f"✅  {s['name']}",
                         font=ctk.CTkFont("Segoe UI",11,"bold"),
                         text_color=COLORS["text"]).pack(anchor="w")
            ctk.CTkLabel(info,text=f"{s['id']}  ·  {s.get('dept','')}",
                         font=ctk.CTkFont("Segoe UI",9),
                         text_color=COLORS["text2"]).pack(anchor="w")
            ctk.CTkButton(row,text="Remove",width=70,height=28,
                           fg_color=COLORS["red_dim"],border_width=1,
                           border_color=COLORS["red"],text_color=COLORS["red2"],
                           hover_color=COLORS["red"],corner_radius=6,
                           font=ctk.CTkFont("Segoe UI",9),
                           command=lambda sid=s["id"],cid=course_id:(
                               self._store.unenroll_student(cid,sid),
                               self._refresh_enrollment_view(enroll_frame,unenroll_frame)
                           )).pack(side="right",padx=8)

        # ── not enrolled list ─────────────────────────────
        if not not_enrolled:
            ctk.CTkLabel(unenroll_frame,
                         text="No results." if q else "All students enrolled!",
                         font=ctk.CTkFont("Segoe UI",11),
                         text_color=COLORS["text3"]).pack(pady=20)
        for s in not_enrolled:
            row=ctk.CTkFrame(unenroll_frame,fg_color=COLORS["bg3"],corner_radius=8)
            row.pack(fill="x",pady=2)
            info=ctk.CTkFrame(row,fg_color="transparent")
            info.pack(side="left",fill="x",expand=True,padx=10,pady=8)
            ctk.CTkLabel(info,text=f"👤  {s['name']}",
                         font=ctk.CTkFont("Segoe UI",11,"bold"),
                         text_color=COLORS["text"]).pack(anchor="w")
            ctk.CTkLabel(info,text=f"{s['id']}  ·  {s.get('dept','')}",
                         font=ctk.CTkFont("Segoe UI",9),
                         text_color=COLORS["text2"]).pack(anchor="w")
            ctk.CTkButton(row,text="Enroll",width=70,height=28,
                           fg_color=COLORS["blue_dim"],border_width=1,
                           border_color=COLORS["blue"],text_color=COLORS["blue2"],
                           hover_color=COLORS["blue3"],corner_radius=6,
                           font=ctk.CTkFont("Segoe UI",9),
                           command=lambda sid=s["id"],cid=course_id:(
                               self._store.enroll_student(cid,sid),
                               self._refresh_enrollment_view(enroll_frame,unenroll_frame)
                           )).pack(side="right",padx=8)

    def _bulk_enroll(self, enroll_frame, unenroll_frame):
        students=getattr(self,"_visible_not_enrolled",[])
        if not students:
            messagebox.showinfo("Bulk Enroll","No visible students to enroll."); return
        val=self._enroll_course_var.get()
        course_id=val.split(" — ")[0] if val else ""
        if not messagebox.askyesno("Bulk Enroll",
                f"Enroll {len(students)} visible student(s) into this course?"): return
        for s in students: self._store.enroll_student(course_id,s["id"])
        self._refresh_enrollment_view(enroll_frame,unenroll_frame)

    def _bulk_unenroll(self, enroll_frame, unenroll_frame):
        students=getattr(self,"_visible_enrolled",[])
        if not students:
            messagebox.showinfo("Bulk Remove","No visible students to remove."); return
        val=self._enroll_course_var.get()
        course_id=val.split(" — ")[0] if val else ""
        if not messagebox.askyesno("Bulk Remove",
                f"Remove {len(students)} visible student(s) from this course?"): return
        for s in students: self._store.unenroll_student(course_id,s["id"])
        self._refresh_enrollment_view(enroll_frame,unenroll_frame)

    # ══════════════════════════════════════════════════════
    #  ADD PARENT
    # ══════════════════════════════════════════════════════
    def _add_parent_dialog(self):
        sid=self._selected_student_id
        if not sid: return
        student=self._store.get_student(sid)
        if not student: return
        win=ctk.CTkToplevel(self); win.title("Add Parent")
        win.geometry("480x620"); win.configure(fg_color=COLORS["card"]); win.grab_set()
        ctk.CTkLabel(win,text="👨‍👩‍👧  Add Parent",
                     font=ctk.CTkFont("Segoe UI",18,"bold"),
                     text_color=COLORS["text"]).pack(pady=(20,4))
        info=ctk.CTkFrame(win,fg_color=COLORS["bg3"],corner_radius=10)
        info.pack(fill="x",padx=28,pady=(0,16))
        ctk.CTkLabel(info,
                     text=f"Linking parent to: {student['emoji']} {student['name']} ({sid})",
                     font=ctk.CTkFont("Segoe UI",12),
                     text_color=COLORS["blue2"]).pack(pady=10)
        body=ctk.CTkFrame(win,fg_color="transparent"); body.pack(fill="x",padx=28)
        fields={}
        for label,key,placeholder in [
            ("PARENT FULL NAME","name",    "e.g., Parent Name"),
            ("USERNAME",        "username","e.g., parent_ahmed"),
            ("PASSWORD",        "password","e.g., parent123"),
            ("EMAIL",           "email",   "e.g., parent@email.com"),
            ("PHONE (Optional)","phone",   "e.g., +20-1234567890"),
        ]:
            ctk.CTkLabel(body,text=label,font=ctk.CTkFont("Segoe UI",9,"bold"),
                         text_color=COLORS["text3"]).pack(anchor="w",pady=(10,0))
            e=ctk.CTkEntry(body,height=38,placeholder_text=placeholder,
                           fg_color=COLORS["bg3"],border_color=COLORS["border"],
                           text_color=COLORS["text"],corner_radius=9,
                           show="•" if key=="password" else "")
            e.pack(fill="x",pady=(4,0)); fields[key]=e

        err_lbl=ctk.CTkLabel(body,text="",font=ctk.CTkFont("Segoe UI",11),
                              text_color=COLORS["red2"]); err_lbl.pack(pady=(8,0))
        email_status=ctk.CTkLabel(body,text="",font=ctk.CTkFont("Segoe UI",11),
                                   text_color=COLORS["green2"]); email_status.pack(pady=(4,0))

        def save():
            name    =fields["name"].get().strip()
            username=fields["username"].get().strip()
            password=fields["password"].get().strip()
            email   =fields["email"].get().strip()
            phone   =fields["phone"].get().strip()
            if not name:     err_lbl.configure(text="⚠️  Please enter parent name"); return
            if not username: err_lbl.configure(text="⚠️  Please enter username");    return
            if not password: err_lbl.configure(text="⚠️  Please enter password");    return
            if self._store.get_user(username):
                err_lbl.configure(text=f"⚠️  Username '{username}' already exists!"); return
            self._store.add_user({"username":username,"password":password,"role":"parent",
                                   "name":name,"email":email,"phone":phone,
                                   "student_id":sid,"student_name":student["name"]})
            if email and EMAIL_AVAILABLE:
                email_status.configure(text="📧 Sending welcome email...",
                                       text_color=COLORS["text2"]); win.update()
                send_welcome_email(to_email=email,to_name=name,username=username,
                                   password=password,role="parent",student_id=sid,
                                   on_success=lambda:email_status.configure(
                                       text=f"✅ Welcome email sent to {email}",
                                       text_color=COLORS["green2"]),
                                   on_error=lambda err:email_status.configure(
                                       text=f"⚠️ Email failed: {err}",
                                       text_color=COLORS["amber"]))
            messagebox.showinfo("Success",
                f"✅ Parent added!\n\nParent: {name}\nUsername: {username}\n"
                f"Password: {password}\nLinked to: {student['name']} ({sid})\n\n"
                f"{'📧 Welcome email sent!' if email else '⚠️ No email.'}",parent=win)
            win.destroy()

        ctk.CTkButton(body,text="👨‍👩‍👧  Add Parent & Link to Student",height=44,
                      fg_color=COLORS["amber"],hover_color=COLORS["amber_dim"],
                      corner_radius=10,font=ctk.CTkFont("Segoe UI",13,"bold"),
                      command=save).pack(fill="x",pady=(16,0))
        ctk.CTkButton(body,text="Cancel",height=36,fg_color="transparent",
                      hover_color=COLORS["bg3"],text_color=COLORS["text3"],
                      corner_radius=10,command=win.destroy).pack(fill="x",pady=(8,20))

    def _page_parents(self, parent):
        pad={"padx":20,"pady":6}
        ctk.CTkLabel(parent,text="Parents Management",
                     font=ctk.CTkFont("Segoe UI",24,"bold"),
                     text_color=COLORS["text"]).pack(anchor="w",**pad)
        parents=[u for u in self._store.users if u.get("role")=="parent"]
        if not parents:
            ctk.CTkLabel(parent,
                         text="No parents added yet.\nGo to Students → Select a student → 👨‍👩‍👧 Add Parent",
                         font=ctk.CTkFont("Segoe UI",14),
                         text_color=COLORS["text2"]).pack(pady=40)
            return
        card=Card(parent,title=f"All Parents ({len(parents)})")
        card.pack(fill="both",expand=True,**pad)
        scroll=ctk.CTkScrollableFrame(card,fg_color="transparent",
                                       scrollbar_button_color=COLORS["border2"])
        scroll.pack(fill="both",expand=True,padx=8,pady=(4,8))
        for p in parents:
            row=ctk.CTkFrame(scroll,fg_color=COLORS["bg3"],corner_radius=10,
                             border_width=1,border_color=COLORS["border"])
            row.pack(fill="x",pady=4)
            left=ctk.CTkFrame(row,fg_color="transparent")
            left.pack(side="left",fill="both",expand=True,padx=16,pady=12)
            ctk.CTkLabel(left,text=f"👨‍👩‍👧 {p.get('name','')}",
                         font=ctk.CTkFont("Segoe UI",13,"bold"),
                         text_color=COLORS["text"]).pack(anchor="w")
            student=self._store.get_student(p.get("student_id",""))
            student_text=(f"{student['emoji']} {student['name']} ({student['id']})"
                          if student else "⚠️ No student linked")
            ctk.CTkLabel(left,text=f"👤 Student: {student_text}",
                         font=ctk.CTkFont("Segoe UI",11),
                         text_color=COLORS["blue2"]).pack(anchor="w")
            ctk.CTkLabel(left,
                         text=f"🔐 Login: {p.get('username','')} / {p.get('password','')}   "
                              f"📧 {p.get('email','')}",
                         font=ctk.CTkFont("Segoe UI",10),
                         text_color=COLORS["text2"]).pack(anchor="w")
            ctk.CTkButton(row,text="🗑️ Remove",width=90,height=30,
                           fg_color=COLORS["red_dim"],border_width=1,
                           border_color=COLORS["red"],text_color=COLORS["red2"],
                           hover_color=COLORS["red"],corner_radius=8,
                           font=ctk.CTkFont("Segoe UI",10),
                           command=lambda u=p:self._remove_parent(u)).pack(side="right",padx=12)

    def _remove_parent(self, parent_user):
        if messagebox.askyesno("Remove Parent",
                f"Remove parent '{parent_user.get('name')}'?\n"
                f"They will no longer be able to login."):
            self._store.users=[u for u in self._store.users
                                if u.get("username")!=parent_user.get("username")]
            self._store._persist()
            self._on_nav("parents")