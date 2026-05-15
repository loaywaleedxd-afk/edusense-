"""
gui/pages/doctor_page.py  — COMPLETE VERSION
✅ My Lectures + Export PDF
✅ Exam Results — add/edit/delete grades + WITHDRAW subject for student
✅ Community Chat — announcements + messages per course
✅ Portfolio PDF generator for any student
✅ Moodle prototype icon
✅ Analytics — R Reports
✅ Students, Attendance (FIXED — no freeze, saves correctly), Dashboard, Alerts, Live Session
"""
import customtkinter as ctk
import json
import tkinter as tk
from tkinter import messagebox
import os, csv, threading, subprocess, time, webbrowser
from datetime import datetime
from PIL import Image, ImageDraw

from gui.theme      import COLORS, FONTS
from gui.components import Sidebar, Topbar, Separator

RSCRIPT    = r"C:\Program Files\R\R-4.6.0\bin\Rscript.exe"
SHINY_PORT = 7760

# ═══════════════════════════════════════════════════════════
#  PHOTO SYSTEM
# ═══════════════════════════════════════════════════════════
_PHOTOS_DIR = os.path.normpath(
    os.path.join(os.path.dirname(__file__), "..", "..", "student_photos"))
_CSV_PATH   = os.path.normpath(
    os.path.join(os.path.dirname(__file__), "..", "..", "StudentPicsDataset.csv"))
_CACHE:       dict = {}
_SID_TO_LINK: dict = {}
_MAP_BUILT:   bool = False


def _build_photo_map(students):
    global _MAP_BUILT
    if _MAP_BUILT: return
    _MAP_BUILT = True
    json_path = os.path.normpath(
        os.path.join(os.path.dirname(__file__), "..", "..", "student_photo_links.json"))
    if os.path.exists(json_path):
        try:
            with open(json_path, encoding="utf-8") as f:
                _SID_TO_LINK.update(json.load(f))
            return
        except Exception: pass
    num_to_sid = {}
    for s in students:
        num = s.get("email","").split("@")[0].replace(".0","").strip()
        if num: num_to_sid[num] = s["id"]
    if not os.path.exists(_CSV_PATH): return
    try:
        with open(_CSV_PATH, encoding="utf-8-sig") as f:
            for row in csv.DictReader(f):
                uid  = str(row.get("Student ID","")).strip()
                link = str(row.get("Photo Link","")).strip()
                sid  = num_to_sid.get(uid)
                if sid and link: _SID_TO_LINK[sid] = link
    except Exception: pass


def _gdrive_direct(url):
    if "id=" in url:   fid = url.split("id=")[1].split("&")[0]
    elif "/d/" in url: fid = url.split("/d/")[1].split("/")[0]
    else: return url
    return f"https://drive.google.com/uc?export=download&id={fid}"


def _load_pil(sid, size):
    for ext in ("jpg","jpeg","png"):
        p = os.path.join(_PHOTOS_DIR, f"{sid}.{ext}")
        if os.path.exists(p):
            try: return _square(Image.open(p).convert("RGB"), size)
            except Exception: pass
    url = _SID_TO_LINK.get(sid,"")
    if url:
        try:
            import requests; from io import BytesIO
            r = requests.get(_gdrive_direct(url), timeout=8)
            if r.status_code==200 and len(r.content)>500:
                return _square(Image.open(BytesIO(r.content)).convert("RGB"), size)
        except Exception: pass
    return None


def _square(img, size):
    w,h = img.size; m = min(w,h)
    img = img.crop(((w-m)//2,(h-m)//2,(w+m)//2,(h+m)//2))
    return img.resize(size, Image.LANCZOS)


def _avatar(color, size):
    try: r,g,b = int(color[1:3],16),int(color[3:5],16),int(color[5:7],16)
    except: r,g,b = 59,130,246
    base=Image.new("RGB",(size,size),(12,23,42))
    circle=Image.new("RGB",(size,size),(r,g,b))
    mask=Image.new("L",(size,size),0)
    ImageDraw.Draw(mask).ellipse([0,0,size,size],fill=255)
    base.paste(circle,mask=mask); return base


def _get_photo(sid, emoji, color, size=(96,96)):
    key = f"{sid}_{size[0]}"
    if key in _CACHE: return _CACHE[key]
    pil  = _load_pil(sid,size) or _avatar(color,size[0])
    mask = Image.new("L",pil.size,0)
    ImageDraw.Draw(mask).ellipse([0,0,pil.width,pil.height],fill=255)
    out  = Image.new("RGB",pil.size,(12,23,42)); out.paste(pil,mask=mask)
    tk_img = ctk.CTkImage(light_image=out,dark_image=out,size=size)
    _CACHE[key]=tk_img; return tk_img


def _async_photo(widget, sid, emoji, color, size):
    def _work():
        img = _get_photo(sid,emoji,color,size)
        def _apply():
            try: widget.configure(image=img,text="")
            except: pass
        try: widget.after(0,_apply)
        except: pass
    threading.Thread(target=_work,daemon=True).start()


def _letter_grade(g):
    if g>=90: return "A+"
    if g>=85: return "A"
    if g>=80: return "B+"
    if g>=75: return "B"
    if g>=70: return "C+"
    if g>=65: return "C"
    if g>=60: return "D+"
    if g>=50: return "D"
    return "F"

def _grade_color(g):
    if g>=75: return COLORS.get("green","#10b981")
    if g>=50: return COLORS.get("amber","#f59e0b")
    return COLORS.get("red","#ef4444")


# ═══════════════════════════════════════════════════════════
#  DOCTOR PAGE
# ═══════════════════════════════════════════════════════════
class DoctorPage(ctk.CTkFrame):

    NAV = [
        {"id":"dashboard",  "icon":"🏠",  "label":"Dashboard"},
        {"id":"live",       "icon":"📷",  "label":"Live Session","live":True},
        {"id":"attendance", "icon":"✅",  "label":"Attendance"},
        {"id":"lectures",   "icon":"📚",  "label":"My Lectures"},
        {"id":"students",   "icon":"👥",  "label":"Students"},
        {"id":"grades",     "icon":"📝",  "label":"Exam Results"},
        {"id":"chat",       "icon":"💬",  "label":"Community"},
        {"id":"analytics",  "icon":"📊",  "label":"Analytics"},
        {"id":"alerts",     "icon":"🔔",  "label":"Alerts","badge":3},
        {"id":"moodle",     "icon":"🌐",  "label":"Moodle"},
    ]

    def __init__(self, parent, user, logout_cb):
        super().__init__(parent, fg_color=COLORS["bg"], corner_radius=0)
        self.user      = user
        self.logout_cb = logout_cb
        self.store     = parent.store
        self.doctor    = self.store.get_doctor(user.get("doctor_id","")) or {}
        _build_photo_map(self.store.students)
        if not hasattr(self.store,"exam_results"):  self.store.exam_results  = {}
        if not hasattr(self.store,"chat_messages"): self.store.chat_messages = {}

        self._sidebar = Sidebar(self,self.NAV,self._on_nav)
        self._sidebar.pack(side="left",fill="y")
        right = ctk.CTkFrame(self,fg_color=COLORS["bg2"],corner_radius=0)
        right.pack(side="left",fill="both",expand=True)
        self._topbar = Topbar(right,user,logout_cb); self._topbar.pack(fill="x")
        self._content = ctk.CTkFrame(right,fg_color=COLORS["bg2"],corner_radius=0)
        self._content.pack(fill="both",expand=True)
        self._on_nav("dashboard")

    def _on_nav(self, tab):
        for w in self._content.winfo_children(): w.destroy()
        self._sidebar.set_active(tab)
        {"dashboard":self._tab_dashboard,"live":self._tab_live,
         "attendance":self._tab_attendance,"lectures":self._tab_lectures,
         "students":self._tab_students,"grades":self._tab_grades,
         "chat":self._tab_chat,"analytics":self._tab_analytics,
         "alerts":self._tab_alerts,"moodle":self._tab_moodle,
        }.get(tab,self._tab_dashboard)(self._content)

    def _my_courses(self):
        did = self.user.get("doctor_id","")
        courses = self.store.get_doctor_courses(did)
        return courses if courses else self.store.courses

    def _resolve_cid(self, course: dict) -> str:
        """Return the course ID key that actually has enrollments in store."""
        cid_id   = course.get("id","")
        cid_code = course.get("code","")
        n_id   = len(self.store.course_enrollments.get(cid_id,   []))
        n_code = len(self.store.course_enrollments.get(cid_code, []))
        return cid_code if n_code > n_id else cid_id

    # ═══════════════════════════════════════════════════
    #  MOODLE
    # ═══════════════════════════════════════════════════
    def _tab_moodle(self, parent):
        f = ctk.CTkFrame(parent,fg_color="transparent")
        f.place(relx=0.5,rely=0.5,anchor="center")
        logo = ctk.CTkFrame(f,fg_color="#F98012",corner_radius=60,width=120,height=120)
        logo.pack(pady=(0,16)); logo.pack_propagate(False)
        ctk.CTkLabel(logo,text="M",font=ctk.CTkFont("Segoe UI",64,"bold"),
                     text_color="white").place(relx=0.5,rely=0.5,anchor="center")
        ctk.CTkLabel(f,text="Moodle",font=ctk.CTkFont("Segoe UI",28,"bold"),
                     text_color=COLORS["text"]).pack()
        ctk.CTkLabel(f,text="University Learning Management System",
                     font=ctk.CTkFont("Segoe UI",13),
                     text_color=COLORS["text2"]).pack(pady=(4,20))
        ctk.CTkButton(f,text="🌐  Open Moodle",
                      font=ctk.CTkFont("Segoe UI",14,"bold"),
                      fg_color="#F98012",hover_color="#e07000",
                      text_color="white",width=220,height=46,corner_radius=12,
                      command=lambda:messagebox.showinfo("Moodle",
                          "Moodle integration coming soon!\n\nThis feature will connect to your\nuniversity's Moodle portal.")
                      ).pack(pady=4)
        ctk.CTkLabel(f,text="⚠️  Prototype — not connected",
                     font=ctk.CTkFont("Segoe UI",11),
                     text_color=COLORS["text3"]).pack(pady=(12,0))

    # ═══════════════════════════════════════════════════
    #  DASHBOARD
    # ═══════════════════════════════════════════════════
    def _tab_dashboard(self, parent):
        ctk.CTkLabel(parent,text="🏠  Dashboard",
                     font=ctk.CTkFont("Segoe UI",22,"bold"),
                     text_color=COLORS["text"]).pack(anchor="w",padx=24,pady=(18,10))
        courses=self._my_courses()
        all_sids=set()
        for c in courses: all_sids.update(self.store.course_enrollments.get(c["id"],[]))
        enrolled=[s for s in self.store.students if s["id"] in all_sids]
        present=sum(1 for s in self.store.students if s.get("present"))
        avg_eng=round(sum(s.get("engagement",0) for s in enrolled)/max(len(enrolled),1))
        stats_row=ctk.CTkFrame(parent,fg_color="transparent"); stats_row.pack(fill="x",padx=24,pady=8)
        for icon,label,val,col in [
            ("📚","My Courses",len(courses),COLORS["blue"]),
            ("👥","My Students",len(all_sids),COLORS["purple"]),
            ("✅","Present Today",present,COLORS["green"]),
            ("📊","Avg Engagement",f"{avg_eng}%",COLORS["amber"]),
        ]:
            c=ctk.CTkFrame(stats_row,fg_color=COLORS["card"],corner_radius=12,
                           border_width=1,border_color=COLORS["border"])
            c.pack(side="left",expand=True,fill="both",padx=8)
            ctk.CTkLabel(c,text=icon,font=ctk.CTkFont("Segoe UI",26)).pack(pady=(16,4))
            ctk.CTkLabel(c,text=str(val),font=ctk.CTkFont("Segoe UI",26,"bold"),
                         text_color=col).pack()
            ctk.CTkLabel(c,text=label,font=ctk.CTkFont("Segoe UI",11),
                         text_color=COLORS["text2"]).pack(pady=(0,14))
        ctk.CTkLabel(parent,text="My Courses",font=ctk.CTkFont("Segoe UI",14,"bold"),
                     text_color=COLORS["text"]).pack(anchor="w",padx=24,pady=(16,6))
        for c in courses:
            enrolled=len(self.store.course_enrollments.get(c["id"],[]))
            cf=ctk.CTkFrame(parent,fg_color=COLORS["card"],corner_radius=10,
                            border_width=1,border_color=COLORS["border"])
            cf.pack(fill="x",padx=24,pady=4)
            ctk.CTkLabel(cf,text=f"  {c['name']}  ({c['code']})  ·  👥 {enrolled}  ·  🏛 {c.get('room','')}",
                         font=ctk.CTkFont("Segoe UI",12),text_color=COLORS["text"]
                         ).pack(side="left",padx=12,pady=10)
            ctk.CTkLabel(cf,text=c.get("time",""),font=ctk.CTkFont("Segoe UI",11),
                         text_color=COLORS["text2"]).pack(side="right",padx=12)

    # ═══════════════════════════════════════════════════
    #  MY LECTURES
    # ═══════════════════════════════════════════════════
    def _tab_lectures(self, parent):
        ctk.CTkLabel(parent,text="📚  My Lectures",
                     font=ctk.CTkFont("Segoe UI",22,"bold"),
                     text_color=COLORS["text"]).pack(anchor="w",padx=24,pady=(18,10))
        courses=self._my_courses()
        if not courses:
            f=ctk.CTkFrame(parent,fg_color="transparent"); f.pack(expand=True)
            ctk.CTkLabel(f,text="📚",font=ctk.CTkFont("Segoe UI",48)).pack(pady=(60,8))
            ctk.CTkLabel(f,text="No lectures assigned yet.",
                         font=ctk.CTkFont("Segoe UI",16,"bold"),
                         text_color=COLORS["text"]).pack()
            ctk.CTkLabel(f,text=f"Your doctor ID: {self.user.get('doctor_id','not set')}",
                         font=ctk.CTkFont("Segoe UI",12),
                         text_color=COLORS["text3"]).pack(pady=6)
            return
        sc=ctk.CTkScrollableFrame(parent,fg_color="transparent",
                                   scrollbar_button_color=COLORS["border2"])
        sc.pack(fill="both",expand=True,padx=16,pady=8)
        for c in courses:
            enrolled=len(self.store.course_enrollments.get(c["id"],[]))
            att=len(self.store.get_attendance(c["id"]))
            cf=ctk.CTkFrame(sc,fg_color=COLORS["card"],corner_radius=12,
                            border_width=1,border_color=COLORS["border"])
            cf.pack(fill="x",padx=8,pady=6)
            ctk.CTkFrame(cf,fg_color=c.get("color",COLORS["blue"]),
                          corner_radius=8,width=6).pack(side="left",fill="y")
            info=ctk.CTkFrame(cf,fg_color="transparent")
            info.pack(side="left",fill="both",expand=True,padx=12,pady=12)
            ctk.CTkLabel(info,text=f"{c['name']}  ({c['code']})",
                         font=ctk.CTkFont("Segoe UI",14,"bold"),
                         text_color=COLORS["text"]).pack(anchor="w")
            ctk.CTkLabel(info,
                         text=f"🏛 {c.get('room','')}   ⏰ {c.get('time','')}   "
                              f"👥 {enrolled} enrolled   ✅ {att} attended",
                         font=ctk.CTkFont("Segoe UI",11),
                         text_color=COLORS["text2"]).pack(anchor="w",pady=2)
            ctk.CTkLabel(info,
                         text=f"📅 {len(c.get('weeks',list(range(1,17))))} weeks  ·  "
                              f"🕐 {c.get('duration',90)} min",
                         font=ctk.CTkFont("Segoe UI",10),
                         text_color=COLORS["text3"]).pack(anchor="w")
            btn_frame=ctk.CTkFrame(cf,fg_color="transparent")
            btn_frame.pack(side="right",padx=12,pady=10)
            ctk.CTkButton(btn_frame,text="📄 Export PDF",width=130,height=34,
                          fg_color=COLORS["blue3"],hover_color="#1e40af",
                          text_color="white",font=ctk.CTkFont("Segoe UI",11,"bold"),
                          corner_radius=8,
                          command=lambda course=c:self._export_students_pdf(course)
                          ).pack(pady=(0,6))
            ctk.CTkButton(btn_frame,text="✅ Attendance",width=130,height=34,
                          fg_color=COLORS["green_dim"],hover_color=COLORS["green"],
                          text_color=COLORS["text"],font=ctk.CTkFont("Segoe UI",11),
                          corner_radius=8,
                          command=lambda cid=c["id"]:self._quick_att(cid)
                          ).pack()

    def _quick_att(self, course_id):
        self._on_nav("attendance")

    # ═══════════════════════════════════════════════════
    #  EXAM RESULTS — with Withdraw Subject feature
    # ═══════════════════════════════════════════════════
    def _tab_grades(self, parent):
        # ── fixed top controls ────────────────────────────
        top = ctk.CTkFrame(parent, fg_color="transparent")
        top.pack(fill="x")

        hdr = ctk.CTkFrame(top, fg_color="transparent")
        hdr.pack(fill="x", padx=24, pady=(14,4))
        ctk.CTkLabel(hdr, text="📝  Exam Results",
                     font=ctk.CTkFont("Segoe UI",22,"bold"),
                     text_color=COLORS["text"]).pack(side="left")
        ctk.CTkLabel(hdr, text="🚫 Withdraw  |  ↩ Restore",
                     font=ctk.CTkFont("Segoe UI",10),
                     text_color=COLORS["text3"]).pack(side="right",padx=8)

        courses = self._my_courses()
        cnames  = [f"{c['name']} ({c['code']})" for c in courses]

        ctrl = ctk.CTkFrame(top, fg_color=COLORS["card"], corner_radius=12,
                            border_width=1, border_color=COLORS["border"])
        ctrl.pack(fill="x", padx=24, pady=(0,4))

        crow = ctk.CTkFrame(ctrl, fg_color="transparent")
        crow.pack(fill="x", padx=16, pady=(10,4))
        ctk.CTkLabel(crow, text="Course:", width=70,
                     font=ctk.CTkFont("Segoe UI",12,"bold"),
                     text_color=COLORS["text2"]).pack(side="left")
        self._gc = ctk.StringVar(value=cnames[0] if cnames else "")
        self._grade_search_var = ctk.StringVar()
        ctk.CTkComboBox(crow, values=cnames, variable=self._gc,
                        fg_color=COLORS["bg3"], border_color=COLORS["border"],
                        button_color=COLORS["blue_dim"], text_color=COLORS["text"],
                        width=320, height=34,
                        command=lambda _: (self._grade_search_var.set(""),
                                           self._reload_grades())
                        ).pack(side="left", padx=8)
        ctk.CTkButton(crow, text="Load", width=70, height=34,
                      fg_color=COLORS["blue_dim"], hover_color=COLORS["blue3"],
                      text_color=COLORS["text"],
                      command=self._reload_grades).pack(side="left", padx=4)

        srow = ctk.CTkFrame(ctrl, fg_color="transparent")
        srow.pack(fill="x", padx=16, pady=(0,8))
        ctk.CTkLabel(srow, text="Search:", width=70,
                     font=ctk.CTkFont("Segoe UI",12,"bold"),
                     text_color=COLORS["text2"]).pack(side="left")
        ctk.CTkEntry(srow, textvariable=self._grade_search_var,
                     placeholder_text="🔍  Search by name or ID...",
                     height=34, fg_color=COLORS["bg3"],
                     border_color=COLORS["border"],
                     text_color=COLORS["text"], corner_radius=9
                     ).pack(side="left", padx=8, fill="x", expand=True)
        self._grade_search_var.trace_add("write", lambda *_: self._reload_grades())
        ctk.CTkButton(srow, text="✕", width=34, height=34,
                      fg_color="transparent", border_width=1,
                      border_color=COLORS["border2"],
                      text_color=COLORS["text3"], hover_color=COLORS["bg3"],
                      corner_radius=9,
                      command=lambda: self._grade_search_var.set("")
                      ).pack(side="left", padx=4)

        self._grade_status = ctk.CTkLabel(ctrl, text="",
                                          font=ctk.CTkFont("Segoe UI",11),
                                          text_color=COLORS["green"])
        self._grade_status.pack(pady=(0,4))

        Separator(top, COLORS["border"]).pack(fill="x", padx=24, pady=(2,0))

        # ── scrollable list — gets ALL remaining space ────
        self._grades_scroll = ctk.CTkScrollableFrame(
            parent, fg_color="transparent",
            scrollbar_button_color=COLORS["border2"])
        self._grades_scroll.pack(fill="both", expand=True, padx=16, pady=(4,8))

        self._grade_courses = courses
        self._reload_grades()

    def _reload_grades(self):
        for w in self._grades_scroll.winfo_children(): w.destroy()

        if not hasattr(self,"_grade_courses") or not self._grade_courses:
            self._grade_courses = self._my_courses()
        cnames = [f"{c['name']} ({c['code']})" for c in self._grade_courses]
        if not cnames or self._gc.get() not in cnames:
            ctk.CTkLabel(self._grades_scroll, text="No courses available.",
                         text_color=COLORS["text3"]).pack(pady=40)
            return

        idx    = cnames.index(self._gc.get())
        course = self._grade_courses[idx]
        did    = self.user.get("doctor_id","")

        # ── resolve course ID — try both id and code ─────
        cid_a = course.get("id","")
        cid_b = course.get("code","")
        ids_a = self.store.course_enrollments.get(cid_a, [])
        ids_b = self.store.course_enrollments.get(cid_b, [])
        cid   = cid_b if len(ids_b) > len(ids_a) else cid_a
        enroll_ids = self.store.course_enrollments.get(cid, [])

        # debug print — remove when confirmed working
        print(f"[GRADES] cid={cid!r} enrolled_ids={len(enroll_ids)} "
              f"store_keys={list(self.store.course_enrollments.keys())[:8]}")

        # ── build full enrolled list ──────────────────────
        # Use a set for O(1) lookup
        enroll_set  = set(enroll_ids)
        all_students = [s for s in self.store.students if s["id"] in enroll_set]
        # If nothing found (enrollment empty / id mismatch) show all students
        if not all_students:
            all_students = self.store.students

        # ── apply search filter ───────────────────────────
        q = getattr(self,"_grade_search_var",None)
        q = q.get().lower().strip() if q else ""
        students = ([s for s in all_students
                     if q in s.get("name","").lower()
                     or q in s.get("id","").lower()
                     or q in s.get("dept","").lower()]
                    if q else all_students)

        existing = (self.store.get_course_results(cid)
                    if hasattr(self.store,"get_course_results") else {})

        # ── summary stats (always full list, not filtered) ─
        active_v  = [v for v in existing.values()
                     if v.get("status","active") != "withdrawn"]
        avg       = round(sum(v["grade"] for v in active_v) / max(len(active_v),1), 1)
        passed    = sum(1 for v in active_v if v.get("grade",0) >= 50)
        withdrawn = sum(1 for v in existing.values()
                        if v.get("status","") == "withdrawn")
        graded    = len(existing)

        sbar = ctk.CTkFrame(self._grades_scroll, fg_color=COLORS["card2"],
                            corner_radius=10, border_width=1,
                            border_color=COLORS["border"])
        sbar.pack(fill="x", padx=4, pady=(0,6))
        if q:
            ctk.CTkLabel(sbar,
                         text=f"🔍  Showing {len(students)} of {len(all_students)} students",
                         font=ctk.CTkFont("Segoe UI",10),
                         text_color=COLORS["blue2"]).pack(anchor="w",padx=14,pady=(6,0))
        srow2 = ctk.CTkFrame(sbar, fg_color="transparent")
        srow2.pack(padx=16, pady=8)
        for lbl,val,col in [
            ("Enrolled", len(all_students), COLORS["blue"]),
            ("Graded",   graded,            COLORS["purple"]),
            ("Avg",      f"{avg}%",         COLORS["amber"]),
            ("Passed",   passed,            COLORS["green"]),
            ("Withdrawn",withdrawn,         COLORS["red"]),
        ]:
            b = ctk.CTkFrame(srow2, fg_color=COLORS["bg3"], corner_radius=8)
            b.pack(side="left", padx=6, ipadx=10, ipady=6)
            ctk.CTkLabel(b, text=str(val),
                         font=ctk.CTkFont("Segoe UI",18,"bold"),
                         text_color=col).pack()
            ctk.CTkLabel(b, text=lbl,
                         font=ctk.CTkFont("Segoe UI",10),
                         text_color=COLORS["text3"]).pack()

        # ── table header ──────────────────────────────────
        hdr2 = ctk.CTkFrame(self._grades_scroll, fg_color=COLORS["card2"],
                            corner_radius=8)
        hdr2.pack(fill="x", padx=4, pady=(0,4))
        for col,(txt,w_) in enumerate([
                ("#",36),("ID",70),("Name",190),
                ("Grade",80),("Letter",60),("Status",80),("Actions",170)]):
            ctk.CTkLabel(hdr2, text=txt, width=w_,
                         font=ctk.CTkFont("Segoe UI",11,"bold"),
                         text_color=COLORS["text2"]
                         ).grid(row=0, column=col, padx=4, pady=8)

        # ── student rows ──────────────────────────────────
        for i, student in enumerate(students):
            sid  = student.get("id","")
            name = student.get("name","")
            rec  = existing.get(sid)
            grade_val = rec.get("grade") if rec else None
            is_withdrawn = (rec.get("status","") == "withdrawn") if rec else False

            rf = ctk.CTkFrame(self._grades_scroll,
                              fg_color=COLORS["card"] if i%2==0 else COLORS["card2"],
                              corner_radius=8)
            rf.pack(fill="x", padx=4, pady=2)

            ctk.CTkLabel(rf, text=str(i+1), width=36,
                         font=ctk.CTkFont("Segoe UI",11),
                         text_color=COLORS["text3"]
                         ).grid(row=0,column=0,padx=4,pady=8)
            ctk.CTkLabel(rf, text=sid, width=70,
                         font=ctk.CTkFont("Segoe UI",11),
                         text_color=COLORS["text2"]
                         ).grid(row=0,column=1,padx=4)
            ctk.CTkLabel(rf, text=name, width=190,
                         font=ctk.CTkFont("Segoe UI",12,"bold"),
                         text_color=COLORS["text3"] if is_withdrawn else COLORS["text"],
                         anchor="w"
                         ).grid(row=0,column=2,padx=4)

            if is_withdrawn:
                ctk.CTkLabel(rf,text="—",width=80,font=ctk.CTkFont("Segoe UI",11),
                             text_color=COLORS["text3"]).grid(row=0,column=3,padx=4)
                ctk.CTkLabel(rf,text="—",width=60,font=ctk.CTkFont("Segoe UI",11),
                             text_color=COLORS["text3"]).grid(row=0,column=4,padx=4)
                ctk.CTkLabel(rf,text="🚫 Withdrawn",width=80,
                             font=ctk.CTkFont("Segoe UI",10,"bold"),
                             text_color=COLORS["red"]).grid(row=0,column=5,padx=4)
                ctk.CTkButton(rf,text="↩ Restore",width=100,height=28,
                              fg_color=COLORS["blue_dim"],hover_color=COLORS["blue3"],
                              text_color=COLORS["text"],
                              font=ctk.CTkFont("Segoe UI",10),corner_radius=6,
                              command=lambda s=student,c=course:self._restore_student(s,c)
                              ).grid(row=0,column=6,padx=8,pady=4)

            elif grade_val is not None:
                gc = _grade_color(grade_val)
                ctk.CTkLabel(rf,text=f"{grade_val}%",width=80,
                             font=ctk.CTkFont("Segoe UI",12,"bold"),
                             text_color=gc).grid(row=0,column=3,padx=4)
                ctk.CTkLabel(rf,text=_letter_grade(grade_val),width=60,
                             font=ctk.CTkFont("Segoe UI",11,"bold"),
                             text_color=gc).grid(row=0,column=4,padx=4)
                sc = COLORS["green"] if grade_val>=50 else COLORS["red"]
                ctk.CTkLabel(rf,text="✅ Pass" if grade_val>=50 else "❌ Fail",width=80,
                             font=ctk.CTkFont("Segoe UI",11),
                             text_color=sc).grid(row=0,column=5,padx=4)
                ab = ctk.CTkFrame(rf,fg_color="transparent")
                ab.grid(row=0,column=6,padx=4,pady=4)
                ctk.CTkButton(ab,text="✏️",width=36,height=28,
                              fg_color=COLORS["blue_dim"],hover_color=COLORS["blue3"],
                              text_color=COLORS["text"],corner_radius=6,
                              command=lambda s=student,c=course:self._grade_dialog(s,c)
                              ).pack(side="left",padx=2)
                ctk.CTkButton(ab,text="🗑",width=36,height=28,
                              fg_color=COLORS["red_dim"],hover_color=COLORS["red"],
                              text_color=COLORS["red2"],corner_radius=6,
                              command=lambda sid_=sid,cid_=cid:self._delete_grade(sid_,cid_)
                              ).pack(side="left",padx=2)
                ctk.CTkButton(ab,text="🚫",width=36,height=28,
                              fg_color=COLORS["red_dim"],hover_color=COLORS["red"],
                              text_color=COLORS["red"],corner_radius=6,
                              command=lambda s=student,c=course:self._withdraw_student(s,c)
                              ).pack(side="left",padx=2)
            else:
                for col_,(w__) in [(3,80),(4,60),(5,80)]:
                    ctk.CTkLabel(rf,text="—",width=w__,
                                 font=ctk.CTkFont("Segoe UI",11),
                                 text_color=COLORS["text3"]
                                 ).grid(row=0,column=col_,padx=4)
                ab = ctk.CTkFrame(rf,fg_color="transparent")
                ab.grid(row=0,column=6,padx=4,pady=4)
                ctk.CTkButton(ab,text="➕ Grade",width=80,height=28,
                              fg_color=COLORS["green_dim"],hover_color=COLORS["green"],
                              text_color=COLORS["text"],
                              font=ctk.CTkFont("Segoe UI",10,"bold"),corner_radius=6,
                              command=lambda s=student,c=course:self._grade_dialog(s,c)
                              ).pack(side="left",padx=2)
                ctk.CTkButton(ab,text="🚫",width=36,height=28,
                              fg_color=COLORS["red_dim"],hover_color=COLORS["red"],
                              text_color=COLORS["red"],corner_radius=6,
                              command=lambda s=student,c=course:self._withdraw_student(s,c)
                              ).pack(side="left",padx=2)


    def _withdraw_student(self, student: dict, course: dict):
        """Withdraw a student from a subject — marks status as withdrawn."""
        sid  = student.get("id","")
        name = student.get("name","")
        cid  = self._resolve_cid(course)
        did  = self.user.get("doctor_id","")

        if not messagebox.askyesno(
                "Withdraw Student",
                f"Withdraw {name} from {course['name']}?\n\n"
                f"The student will be marked as WITHDRAWN from this subject.\n"
                f"Their grade (if any) will be hidden.\n\n"
                f"You can restore them later using the ↩ Restore button.",
                icon="warning"):
            return

        # store the withdrawal — keep grade but mark status=withdrawn
        if not hasattr(self.store,"exam_results"):
            self.store.exam_results = {}
        if sid not in self.store.exam_results:
            self.store.exam_results[sid] = {}
        if cid not in self.store.exam_results[sid]:
            self.store.exam_results[sid][cid] = {}

        self.store.exam_results[sid][cid]["status"]     = "withdrawn"
        self.store.exam_results[sid][cid]["withdrawn_by"]= did
        self.store.exam_results[sid][cid]["withdrawn_at"]= datetime.now().strftime("%Y-%m-%d")

        try: self.store._persist()
        except: pass

        self._reload_grades()
        self._grade_status.configure(
            text=f"🚫 {name} withdrawn from {course['name']}",
            text_color=COLORS["red"])

    def _restore_student(self, student: dict, course: dict):
        """Restore a withdrawn student back to active status."""
        sid  = student.get("id","")
        name = student.get("name","")
        cid  = self._resolve_cid(course)

        if not messagebox.askyesno(
                "Restore Student",
                f"Restore {name} back to {course['name']}?\n\n"
                f"The student will be active again in this subject."):
            return

        if (hasattr(self.store,"exam_results") and
                sid in self.store.exam_results and
                cid in self.store.exam_results[sid]):
            rec = self.store.exam_results[sid][cid]
            rec.pop("status",       None)
            rec.pop("withdrawn_by", None)
            rec.pop("withdrawn_at", None)
            # if grade was there, keep it; if only withdrawal marker, remove empty record
            if not rec:
                del self.store.exam_results[sid][cid]

        try: self.store._persist()
        except: pass

        self._reload_grades()
        self._grade_status.configure(
            text=f"✅ {name} restored to {course['name']}",
            text_color=COLORS["green"])

    def _grade_dialog(self, student, course):
        sid=student.get("id",""); name=student.get("name","")
        cid=self._resolve_cid(course); did=self.user.get("doctor_id","")
        existing={}
        if hasattr(self.store,"get_course_results"):
            existing=self.store.get_course_results(cid).get(sid,{})
        win=ctk.CTkToplevel(self)
        win.title("Add / Edit Grade"); win.geometry("400x340")
        win.resizable(False,False); win.configure(fg_color=COLORS["bg2"])
        win.grab_set(); win.lift(); win.focus_force()
        hbar=ctk.CTkFrame(win,fg_color=COLORS["blue_dim"],corner_radius=0,height=52)
        hbar.pack(fill="x"); hbar.pack_propagate(False)
        ctk.CTkLabel(hbar,text="📝  Enter Grade",font=ctk.CTkFont("Segoe UI",14,"bold"),
                     text_color="white").pack(side="left",padx=20,pady=14)
        body=ctk.CTkFrame(win,fg_color="transparent"); body.pack(fill="x",padx=28,pady=20)
        ctk.CTkLabel(body,text=f"Student:  {name}  ({sid})",
                     font=ctk.CTkFont("Segoe UI",13,"bold"),
                     text_color=COLORS["text"]).pack(anchor="w",pady=(0,4))
        ctk.CTkLabel(body,text=f"Course:   {course['name']} ({course['code']})",
                     font=ctk.CTkFont("Segoe UI",12),
                     text_color=COLORS["text2"]).pack(anchor="w",pady=(0,16))
        ctk.CTkLabel(body,text="GRADE (0 – 100)",font=ctk.CTkFont("Segoe UI",9,"bold"),
                     text_color=COLORS["text3"]).pack(anchor="w")
        grade_var=ctk.StringVar(value=str(existing.get("grade","")))
        grade_entry=ctk.CTkEntry(body,textvariable=grade_var,placeholder_text="e.g. 87.5",
                                  height=42,fg_color=COLORS["bg3"],border_color=COLORS["border"],
                                  text_color=COLORS["text"],font=ctk.CTkFont("Segoe UI",16),
                                  corner_radius=9)
        grade_entry.pack(fill="x",pady=(4,8)); grade_entry.focus()
        preview=ctk.CTkLabel(body,text="",font=ctk.CTkFont("Segoe UI",12),
                              text_color=COLORS["text2"]); preview.pack(anchor="w")
        def update_preview(*_):
            try:
                g=float(grade_var.get())
                if 0<=g<=100:
                    preview.configure(text=f"→  {_letter_grade(g)}  ·  {'Pass' if g>=50 else 'Fail'}",
                                      text_color=_grade_color(g))
                else: preview.configure(text="Grade must be 0–100",text_color=COLORS["red"])
            except: preview.configure(text="",text_color=COLORS["text2"])
        grade_var.trace_add("write",update_preview)
        err=ctk.CTkLabel(body,text="",font=ctk.CTkFont("Segoe UI",11),
                          text_color=COLORS["red"]); err.pack(anchor="w",pady=(4,0))
        def save():
            try: g=float(grade_var.get())
            except: err.configure(text="⚠️ Please enter a valid number"); return
            if not (0<=g<=100): err.configure(text="⚠️ Grade must be 0–100"); return
            if hasattr(self.store,"add_exam_result"):
                self.store.add_exam_result(sid,cid,g,did)
            else:
                if not hasattr(self.store,"exam_results"): self.store.exam_results={}
                if sid not in self.store.exam_results: self.store.exam_results[sid]={}
                self.store.exam_results[sid][cid]={"grade":round(g,1),"added_by":did,
                    "date":datetime.now().strftime("%Y-%m-%d")}
                try: self.store._persist()
                except: pass
            win.destroy(); self._reload_grades()
            self._grade_status.configure(text=f"✅ Grade saved for {name}",
                                          text_color=COLORS["green"])
        br=ctk.CTkFrame(win,fg_color="transparent"); br.pack(pady=8)
        ctk.CTkButton(br,text="💾  Save Grade",font=ctk.CTkFont("Segoe UI",13,"bold"),
                      fg_color=COLORS["blue3"],hover_color="#1e40af",text_color="white",
                      width=150,height=40,command=save).pack(side="left",padx=8)
        ctk.CTkButton(br,text="Cancel",font=ctk.CTkFont("Segoe UI",13),
                      fg_color=COLORS["card2"],hover_color=COLORS["border2"],
                      text_color=COLORS["text2"],width=100,height=40,
                      command=win.destroy).pack(side="left",padx=8)

    def _delete_grade(self, student_id, course_id):
        if not messagebox.askyesno("Delete Grade","Delete this grade? Cannot be undone."): return
        if hasattr(self.store,"delete_exam_result"):
            self.store.delete_exam_result(student_id,course_id)
        else:
            if hasattr(self.store,"exam_results"):
                self.store.exam_results.get(student_id,{}).pop(course_id,None)
                try: self.store._persist()
                except: pass
        self._reload_grades()
        self._grade_status.configure(text="🗑 Grade deleted",text_color=COLORS["amber"])

    # ═══════════════════════════════════════════════════
    #  ATTENDANCE TAB — FIXED (no freeze, saves correctly)
    # ═══════════════════════════════════════════════════
    def _tab_attendance(self, parent):
        ctk.CTkLabel(parent,text="✅  Manual Attendance",
                     font=ctk.CTkFont("Segoe UI",22,"bold"),
                     text_color=COLORS["text"]).pack(anchor="w",padx=24,pady=(18,0))
        ctrl=ctk.CTkFrame(parent,fg_color=COLORS["card"],corner_radius=12,
                          border_width=1,border_color=COLORS["border"])
        ctrl.pack(fill="x",padx=24,pady=12)
        courses=self._my_courses()
        cnames=[f"{c['name']} ({c['code']})" for c in courses]
        row=ctk.CTkFrame(ctrl,fg_color="transparent"); row.pack(fill="x",padx=16,pady=12)
        ctk.CTkLabel(row,text="Course:",width=70,font=ctk.CTkFont("Segoe UI",12,"bold"),
                     text_color=COLORS["text2"]).pack(side="left")
        self._ac=ctk.StringVar(value=cnames[0] if cnames else "")
        ctk.CTkComboBox(row,values=cnames,variable=self._ac,fg_color=COLORS["bg3"],
                        border_color=COLORS["border"],button_color=COLORS["blue_dim"],
                        text_color=COLORS["text"],width=300,height=36,
                        command=lambda _:self._reload_att()).pack(side="left",padx=8)
        ctk.CTkLabel(row,text="Week:",width=50,font=ctk.CTkFont("Segoe UI",12,"bold"),
                     text_color=COLORS["text2"]).pack(side="left",padx=(12,0))
        self._aw=ctk.StringVar(value=str(self.store.current_week))
        ctk.CTkComboBox(row,values=[str(w) for w in range(1,17)],variable=self._aw,
                        fg_color=COLORS["bg3"],border_color=COLORS["border"],
                        button_color=COLORS["blue_dim"],text_color=COLORS["text"],
                        width=80,height=36,command=lambda _:self._reload_att()
                        ).pack(side="left",padx=8)
        ctk.CTkButton(row,text="Load",width=80,height=36,fg_color=COLORS["blue_dim"],
                      hover_color=COLORS["blue3"],text_color=COLORS["text"],
                      command=self._reload_att).pack(side="left",padx=8)
        self._att_st=ctk.CTkLabel(ctrl,text="",font=ctk.CTkFont("Segoe UI",11),
                                   text_color=COLORS["green"])
        self._att_st.pack(pady=(0,8))
        Separator(parent,COLORS["border"]).pack(fill="x",padx=24)
        self._att_scroll=ctk.CTkScrollableFrame(parent,fg_color="transparent",
                                                 scrollbar_button_color=COLORS["border2"])
        self._att_scroll.pack(fill="both",expand=True,padx=16,pady=8)
        self._att_courses=courses
        self._att_checks={}
        self._reload_att()

    def _reload_att(self):
        """Reload attendance list — photos load async one by one to prevent freezing."""
        for w in self._att_scroll.winfo_children(): w.destroy()
        self._att_checks.clear()
        cnames=[f"{c['name']} ({c['code']})" for c in self._att_courses]
        if not cnames or self._ac.get() not in cnames:
            ctk.CTkLabel(self._att_scroll,text="No courses available.",
                         text_color=COLORS["text3"]).pack(pady=40); return
        idx    = cnames.index(self._ac.get())
        course = self._att_courses[idx]
        week   = int(self._aw.get())
        cid    = course["id"]
        students = self.store.get_enrolled_students(cid) or self.store.students
        existing = self.store.get_attendance(cid, week)

        # ── header row ────────────────────────────────
        hdr=ctk.CTkFrame(self._att_scroll,fg_color=COLORS["card2"],corner_radius=8)
        hdr.pack(fill="x",padx=4,pady=(0,4))
        for col,(txt,w_) in enumerate([
                ("#",36),("Photo",52),("Name",200),("ID",80),("Dept",120),("Present",90)]):
            ctk.CTkLabel(hdr,text=txt,width=w_,
                         font=ctk.CTkFont("Segoe UI",11,"bold"),
                         text_color=COLORS["text2"]
                         ).grid(row=0,column=col,padx=4,pady=8)

        # ── bulk actions ──────────────────────────────
        bulk=ctk.CTkFrame(self._att_scroll,fg_color="transparent")
        bulk.pack(fill="x",padx=4,pady=4)
        ctk.CTkButton(bulk,text="✅ Select All",width=120,height=30,
                      fg_color=COLORS["green_dim"],hover_color="#065f46",
                      text_color=COLORS["green2"],font=ctk.CTkFont("Segoe UI",11),
                      command=lambda:[v.set(True) for v in self._att_checks.values()]
                      ).pack(side="left",padx=4)
        ctk.CTkButton(bulk,text="❌ Clear All",width=120,height=30,
                      fg_color=COLORS["red_dim"],hover_color="#7f1d1d",
                      text_color=COLORS["red2"],font=ctk.CTkFont("Segoe UI",11),
                      command=lambda:[v.set(False) for v in self._att_checks.values()]
                      ).pack(side="left",padx=4)
        ctk.CTkButton(bulk,text="💾 Save Attendance",width=160,height=30,
                      fg_color=COLORS["blue3"],hover_color="#1e40af",
                      text_color="white",font=ctk.CTkFont("Segoe UI",11,"bold"),
                      command=lambda c=cid,wk=week:self._save_att(c,wk)
                      ).pack(side="right",padx=4)

        # ── student rows — photos load async one by one ──
        for i,student in enumerate(students):
            sid   = student.get("id","")
            name  = student.get("name","")
            dept  = student.get("dept","")
            emoji = student.get("emoji","👤")
            color = student.get("color", COLORS["blue"])
            already = sid in existing
            var = tk.BooleanVar(value=already)
            self._att_checks[sid] = var

            rf=ctk.CTkFrame(self._att_scroll,
                            fg_color=COLORS["card"] if i%2==0 else COLORS["card2"],
                            corner_radius=8)
            rf.pack(fill="x",padx=4,pady=2)

            # number
            ctk.CTkLabel(rf,text=str(i+1),width=36,
                         font=ctk.CTkFont("Segoe UI",11),
                         text_color=COLORS["text3"]
                         ).grid(row=0,column=0,padx=4,pady=6)

            # ── photo — async load, starts as emoji placeholder ──
            photo_lbl = ctk.CTkLabel(rf, text=emoji, width=44, height=44,
                                      font=ctk.CTkFont("Segoe UI",20))
            photo_lbl.grid(row=0,column=1,padx=4,pady=4)
            # load real photo in background — never blocks UI
            _async_photo(photo_lbl, sid, emoji, color, (44,44))

            # name
            ctk.CTkLabel(rf,text=name,width=200,
                         font=ctk.CTkFont("Segoe UI",12,"bold"),
                         text_color=COLORS["text"],anchor="w"
                         ).grid(row=0,column=2,padx=4)
            # ID
            ctk.CTkLabel(rf,text=sid,width=80,
                         font=ctk.CTkFont("Segoe UI",11),
                         text_color=COLORS["text2"]
                         ).grid(row=0,column=3,padx=4)
            # dept
            ctk.CTkLabel(rf,text=dept,width=120,
                         font=ctk.CTkFont("Segoe UI",10),
                         text_color=COLORS["text3"],anchor="w"
                         ).grid(row=0,column=4,padx=4)

            # present — label if already marked, checkbox if not
            if already:
                ctk.CTkLabel(rf,text="✅ Present",width=90,
                             font=ctk.CTkFont("Segoe UI",11,"bold"),
                             text_color=COLORS["green"]
                             ).grid(row=0,column=5,padx=8)
            else:
                ctk.CTkCheckBox(rf,text="Present",
                                 font=ctk.CTkFont("Segoe UI",11),
                                 text_color=COLORS["text2"],
                                 fg_color=COLORS["green"],
                                 hover_color=COLORS["green2"],
                                 checkmark_color="white",
                                 variable=var
                                 ).grid(row=0,column=5,padx=8)

    def _save_att(self, cid: str, week: int):
        """Save attendance — runs in a thread to prevent any UI freeze."""
        def _do_save():
            n = 0
            for sid, var in self._att_checks.items():
                if var.get():
                    ok = self.store.mark_attendance(cid, sid, 1.0, "manual", week)
                    if ok:
                        n += 1
            # update UI from main thread
            def _update():
                self._att_st.configure(
                    text=f"✅ Saved {n} student(s) — Week {week}",
                    text_color=COLORS["green"])
                self._reload_att()
            try:
                self.after(0, _update)
            except Exception:
                pass
        threading.Thread(target=_do_save, daemon=True).start()
        self._att_st.configure(text="💾 Saving...", text_color=COLORS["text2"])

    # ═══════════════════════════════════════════════════
    #  COMMUNITY CHAT
    # ═══════════════════════════════════════════════════
    def _tab_chat(self, parent):
        did=self.user.get("doctor_id","")
        dname=self.doctor.get("name",self.user.get("name","Doctor"))
        courses=self._my_courses()
        if not courses:
            ctk.CTkLabel(parent,text="No courses assigned.",
                         font=ctk.CTkFont("Segoe UI",14),
                         text_color=COLORS["text3"]).pack(pady=60); return
        hdr=ctk.CTkFrame(parent,fg_color="transparent")
        hdr.pack(fill="x",padx=24,pady=(18,8))
        ctk.CTkLabel(hdr,text="💬  Community Chat",
                     font=ctk.CTkFont("Segoe UI",22,"bold"),
                     text_color=COLORS["text"]).pack(side="left")
        cnames=[f"{c['name']} ({c['code']})" for c in courses]
        self._dchat_cv=ctk.StringVar(value=cnames[0])
        ctk.CTkComboBox(hdr,values=cnames,variable=self._dchat_cv,
                        fg_color=COLORS["card"],border_color=COLORS["border"],
                        button_color=COLORS["blue_dim"],text_color=COLORS["text"],
                        width=280,height=34,
                        command=lambda _:self._dreload(courses,did,dname)
                        ).pack(side="right")
        Separator(parent,COLORS["border"]).pack(fill="x",padx=24)
        self._dcs=ctk.CTkScrollableFrame(parent,fg_color="transparent",
                                          scrollbar_button_color=COLORS["border2"])
        self._dcs.pack(fill="both",expand=True,padx=16,pady=8)
        inp=ctk.CTkFrame(parent,fg_color=COLORS["card"],corner_radius=12,
                         border_width=1,border_color=COLORS["border"])
        inp.pack(fill="x",padx=24,pady=(0,12))
        ann_row=ctk.CTkFrame(inp,fg_color="#2d1a00",corner_radius=8)
        ann_row.pack(fill="x",padx=10,pady=(10,4))
        ctk.CTkLabel(ann_row,text="📢 Announcement:",
                     font=ctk.CTkFont("Segoe UI",11,"bold"),
                     text_color=COLORS.get("amber","#f59e0b")).pack(side="left",padx=8,pady=6)
        ann_e=ctk.CTkEntry(ann_row,placeholder_text="Write an announcement...",
                           height=34,fg_color=COLORS["bg3"],border_color=COLORS["border"],
                           text_color=COLORS["text"])
        ann_e.pack(side="left",fill="x",expand=True,padx=(0,6))
        ann_e.bind("<Return>",lambda e:self._dsend(courses,did,dname,ann_e,None,"announcement"))
        ctk.CTkButton(ann_row,text="📢 Post",width=80,height=34,
                      fg_color=COLORS.get("amber","#f59e0b"),hover_color="#b45309",
                      text_color="white",font=ctk.CTkFont("Segoe UI",11,"bold"),corner_radius=8,
                      command=lambda:self._dsend(courses,did,dname,ann_e,None,"announcement")
                      ).pack(side="left",padx=(0,6))
        msg_row=ctk.CTkFrame(inp,fg_color="transparent"); msg_row.pack(fill="x",padx=10,pady=(4,10))
        msg_e=ctk.CTkEntry(msg_row,placeholder_text="Write a message to students...",
                           height=38,fg_color=COLORS["bg3"],border_color=COLORS["border"],
                           text_color=COLORS["text"])
        msg_e.pack(side="left",fill="x",expand=True,padx=(0,8))
        msg_e.bind("<Return>",lambda e:self._dsend(courses,did,dname,None,msg_e,"message"))
        ctk.CTkButton(msg_row,text="Send ➤",width=90,height=38,
                      fg_color=COLORS["blue3"],hover_color="#1e40af",text_color="white",
                      font=ctk.CTkFont("Segoe UI",12,"bold"),corner_radius=8,
                      command=lambda:self._dsend(courses,did,dname,None,msg_e,"message")
                      ).pack(side="left")
        self._dchat_courses=courses; self._dchat_did=did; self._dchat_dname=dname
        self._dchat_ann_e=ann_e; self._dchat_msg_e=msg_e
        self._dreload(courses,did,dname)

    def _dget_course(self, courses):
        cnames=[f"{c['name']} ({c['code']})" for c in courses]
        sel=getattr(self,"_dchat_cv",None)
        if sel and sel.get() in cnames: return courses[cnames.index(sel.get())]
        return courses[0] if courses else None

    def _dreload(self, courses, did, dname):
        for w in self._dcs.winfo_children(): w.destroy()
        course=self._dget_course(courses)
        if not course: return
        messages=self.store.get_messages(course["id"])
        if not messages:
            ctk.CTkLabel(self._dcs,
                         text="No messages yet. Post an announcement to get started!",
                         font=ctk.CTkFont("Segoe UI",12),
                         text_color=COLORS["text3"]).pack(pady=40)
        else:
            for msg in messages:
                self._drender(msg,did,course,courses,dname)
        self._dcs.after(100,lambda:self._dcs._parent_canvas.yview_moveto(1.0))

    def _drender(self, msg, did, course, courses, dname):
        is_mine=msg.get("sender_id")==did
        is_announce=msg.get("type")=="announcement"
        sender=msg.get("sender",""); text=msg.get("text",""); ts=msg.get("timestamp","")
        reactions=msg.get("reactions",{})
        if is_announce:
            af=ctk.CTkFrame(self._dcs,fg_color="#2d1a00",corner_radius=10,
                            border_width=1,border_color=COLORS.get("amber","#f59e0b"))
            af.pack(fill="x",padx=8,pady=4)
            top=ctk.CTkFrame(af,fg_color="transparent"); top.pack(fill="x",padx=12,pady=(8,2))
            ctk.CTkLabel(top,text=f"📢  {sender}  ·  {ts}",
                         font=ctk.CTkFont("Segoe UI",10,"bold"),
                         text_color=COLORS.get("amber","#f59e0b")).pack(side="left")
            if is_mine:
                ctk.CTkButton(top,text="🗑",width=28,height=22,fg_color="transparent",
                              hover_color=COLORS["red_dim"],text_color=COLORS["red2"],
                              command=lambda m=msg,c=course:(
                                  self.store.delete_message(c["id"],m["id"]),
                                  self._dreload(courses,did,dname))
                              ).pack(side="right")
            ctk.CTkLabel(af,text=text,font=ctk.CTkFont("Segoe UI",12),
                         text_color=COLORS["text"],wraplength=700,justify="left"
                         ).pack(anchor="w",padx=12,pady=(0,8))
            return
        row=ctk.CTkFrame(self._dcs,fg_color="transparent")
        row.pack(fill="x",padx=8,pady=2,anchor="e" if is_mine else "w")
        bubble=ctk.CTkFrame(row,fg_color=COLORS["blue3"] if is_mine else COLORS["card"],
                             corner_radius=14)
        bubble.pack(side="right" if is_mine else "left",padx=8)
        if not is_mine:
            ctk.CTkLabel(bubble,text=sender,font=ctk.CTkFont("Segoe UI",9,"bold"),
                         text_color=COLORS["blue2"]).pack(anchor="w",padx=10,pady=(6,0))
        ctk.CTkLabel(bubble,text=text,font=ctk.CTkFont("Segoe UI",12),
                     text_color="white" if is_mine else COLORS["text"],
                     wraplength=400,justify="left").pack(padx=12,pady=(2,4))
        ctk.CTkLabel(bubble,text=ts,font=ctk.CTkFont("Segoe UI",8),
                     text_color=COLORS["text3"]
                     ).pack(anchor="e" if is_mine else "w",padx=10,pady=(0,4))
        if is_mine:
            ctk.CTkButton(row,text="🗑",width=28,height=24,fg_color="transparent",
                          hover_color=COLORS["red_dim"],text_color=COLORS["red2"],
                          command=lambda m=msg,c=course:(
                              self.store.delete_message(c["id"],m["id"]),
                              self._dreload(courses,did,dname))
                          ).pack(side="right" if is_mine else "left",padx=4)
        if reactions:
            rrow=ctk.CTkFrame(row,fg_color="transparent")
            rrow.pack(side="right" if is_mine else "left",padx=4)
            for emoji,reactors in reactions.items():
                if reactors:
                    ctk.CTkLabel(rrow,text=f"{emoji} {len(reactors)}",
                                 font=ctk.CTkFont("Segoe UI",11),fg_color=COLORS["bg3"],
                                 corner_radius=8,text_color=COLORS["text2"]).pack(side="left",padx=2)

    def _dsend(self, courses, did, dname, ann_e, msg_e, msg_type):
        entry=ann_e if msg_type=="announcement" else msg_e
        if not entry: return
        text=entry.get().strip()
        if not text: return
        course=self._dget_course(courses)
        if not course: return
        entry.delete(0,"end")
        self.store.post_message(course["id"],dname,did,"doctor",text,msg_type)
        self._dreload(courses,did,dname)

    # ═══════════════════════════════════════════════════
    #  PORTFOLIO GENERATOR (for any student)
    # ═══════════════════════════════════════════════════
    def _generate_student_portfolio(self, s: dict):
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
            messagebox.showerror("Missing Library","Run:  pip install reportlab"); return

        FONT = "Helvetica"
        for fp in [r"C:\Windows\Fonts\Arial.ttf",
                   r"C:\Windows\Fonts\calibri.ttf",
                   r"C:\Windows\Fonts\tahoma.ttf"]:
            if os.path.exists(fp):
                try:
                    fn=os.path.splitext(os.path.basename(fp))[0]
                    pdfmetrics.registerFont(TTFont(fn,fp)); FONT=fn; break
                except: pass

        styles=getSampleStyleSheet()
        def ps(name, **kw):
            kw.setdefault("fontName", FONT)
            return ParagraphStyle(name, parent=styles["Normal"], **kw)

        sid=s.get("id",""); results=self.store.exam_results.get(sid,{})
        # exclude withdrawn subjects from portfolio stats
        active_results = {k:v for k,v in results.items() if v.get("status","active")!="withdrawn"}
        grades=[v["grade"] for v in active_results.values()]
        avg_g=round(sum(grades)/len(grades),1) if grades else 0
        att=s.get("attendance_rate",0); eng=s.get("engagement",0)
        att_recs=self.store.get_student_attendance(sid)
        passed=sum(1 for g in grades if g>=50)
        desktop=os.path.join(os.path.expanduser("~"),"Desktop")
        if not os.path.exists(desktop): desktop=os.path.expanduser("~")
        filename=f"Portfolio_{sid}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
        path=os.path.join(desktop,filename)
        try:
            doc=SimpleDocTemplate(path,pagesize=A4,leftMargin=1.8*cm,rightMargin=1.8*cm,
                                   topMargin=1.5*cm,bottomMargin=1.5*cm)
            story=[]
            hdr_data=[[
                Paragraph("EduSense",ps("brand",fontSize=10,textColor=rl.white)),
                Paragraph("<b>ACADEMIC PORTFOLIO</b>",ps("ptitle",fontSize=16,
                           textColor=rl.white,alignment=TA_CENTER)),
                Paragraph(datetime.now().strftime("%Y-%m-%d"),
                          ps("pdate",fontSize=10,textColor=rl.HexColor("#bfdbfe"),
                             alignment=TA_RIGHT)),
            ]]
            hdr_tbl=Table(hdr_data,colWidths=[4*cm,9.4*cm,4*cm])
            hdr_tbl.setStyle(TableStyle([
                ("BACKGROUND",(0,0),(-1,-1),rl.HexColor("#1E3A8A")),
                ("TOPPADDING",(0,0),(-1,-1),14),("BOTTOMPADDING",(0,0),(-1,-1),14),
                ("LEFTPADDING",(0,0),(-1,-1),10),("VALIGN",(0,0),(-1,-1),"MIDDLE"),
            ]))
            story.append(hdr_tbl); story.append(Spacer(1,0.3*cm))
            info_data=[[
                Paragraph(f"<b>{s.get('name','')}</b>",
                          ps("sname",fontSize=18,textColor=rl.HexColor("#1E3A8A"))),
                Paragraph(f"ID: {sid}  ·  {s.get('dept','')}  ·  Year {s.get('year','')}<br/>"
                           f"Email: {s.get('email','')}  ·  GPA: {s.get('gpa',0.0)}",
                          ps("sinfo",fontSize=10,textColor=rl.HexColor("#374151"))),
            ]]
            info_tbl=Table(info_data,colWidths=[8*cm,9.4*cm])
            info_tbl.setStyle(TableStyle([
                ("BACKGROUND",(0,0),(-1,-1),rl.HexColor("#EFF6FF")),
                ("TOPPADDING",(0,0),(-1,-1),10),("BOTTOMPADDING",(0,0),(-1,-1),10),
                ("LEFTPADDING",(0,0),(-1,-1),12),("VALIGN",(0,0),(-1,-1),"MIDDLE"),
                ("GRID",(0,0),(-1,-1),0.3,rl.HexColor("#BFDBFE")),
            ]))
            story.append(info_tbl); story.append(Spacer(1,0.4*cm))
            stats_data=[[
                Paragraph(f"<b>{att}%</b><br/>Attendance",
                          ps("sc0",fontSize=11,textColor=rl.HexColor("#065F46"),alignment=TA_CENTER)),
                Paragraph(f"<b>{avg_g}%</b><br/>Avg Grade",
                          ps("sc1",fontSize=11,textColor=rl.HexColor("#1E3A8A"),alignment=TA_CENTER)),
                Paragraph(f"<b>{eng}%</b><br/>Engagement",
                          ps("sc2",fontSize=11,textColor=rl.HexColor("#78350F"),alignment=TA_CENTER)),
                Paragraph(f"<b>{passed}/{len(grades)}</b><br/>Passed",
                          ps("sc3",fontSize=11,textColor=rl.HexColor("#4C1D95"),alignment=TA_CENTER)),
                Paragraph(f"<b>{len(att_recs)}</b><br/>Sessions",
                          ps("sc4",fontSize=11,textColor=rl.HexColor("#064E3B"),alignment=TA_CENTER)),
            ]]
            stats_tbl=Table(stats_data,colWidths=[3.44*cm]*5)
            stats_tbl.setStyle(TableStyle([
                ("BACKGROUND",(0,0),(0,-1),rl.HexColor("#D1FAE5")),
                ("BACKGROUND",(1,0),(1,-1),rl.HexColor("#DBEAFE")),
                ("BACKGROUND",(2,0),(2,-1),rl.HexColor("#FEF3C7")),
                ("BACKGROUND",(3,0),(3,-1),rl.HexColor("#EDE9FE")),
                ("BACKGROUND",(4,0),(4,-1),rl.HexColor("#D1FAE5")),
                ("TOPPADDING",(0,0),(-1,-1),10),("BOTTOMPADDING",(0,0),(-1,-1),10),
                ("GRID",(0,0),(-1,-1),0.5,rl.white),
                ("ALIGN",(0,0),(-1,-1),"CENTER"),("VALIGN",(0,0),(-1,-1),"MIDDLE"),
            ]))
            story.append(stats_tbl); story.append(Spacer(1,0.4*cm))
            story.append(Paragraph("<b>Exam Results</b>",
                          ps("sec",fontSize=13,textColor=rl.HexColor("#1E3A8A"),spaceAfter=6)))
            if active_results:
                th=ps("th",fontSize=9,textColor=rl.white)
                td=ps("td",fontSize=9,textColor=rl.HexColor("#111827"))
                g_data=[[Paragraph(f"<b>{h}</b>",th) for h in
                          ["#","Course","Code","Grade","Letter","Status"]]]
                for i,(cid,rec) in enumerate(active_results.items()):
                    g=rec.get("grade",0)
                    cobj=next((c for c in self.store.courses if c["id"]==cid),None)
                    ac="#10B981" if g>=75 else "#F59E0B" if g>=50 else "#EF4444"
                    g_data.append([
                        Paragraph(str(i+1),td),
                        Paragraph(cobj["name"] if cobj else cid,td),
                        Paragraph(cid,td),
                        Paragraph(f"<font color='{ac}'><b>{g}%</b></font>",td),
                        Paragraph(f"<font color='{ac}'>{_letter_grade(g)}</font>",td),
                        Paragraph("Pass" if g>=50 else "Fail",td),
                    ])
                g_tbl=Table(g_data,colWidths=[0.6*cm,5.5*cm,1.8*cm,1.8*cm,1.5*cm,1.5*cm],
                             repeatRows=1)
                g_tbl.setStyle(TableStyle([
                    ("BACKGROUND",(0,0),(-1,0),rl.HexColor("#1E3A8A")),
                    ("ROWBACKGROUNDS",(0,1),(-1,-1),
                     [rl.HexColor("#F8FAFC"),rl.HexColor("#EFF6FF")]),
                    ("GRID",(0,0),(-1,-1),0.4,rl.HexColor("#CBD5E1")),
                    ("TOPPADDING",(0,0),(-1,-1),5),("BOTTOMPADDING",(0,0),(-1,-1),5),
                    ("LEFTPADDING",(0,0),(-1,-1),6),("VALIGN",(0,0),(-1,-1),"MIDDLE"),
                ]))
                story.append(g_tbl)
            else:
                story.append(Paragraph("No active grades recorded.",
                              ps("ng",fontSize=10,textColor=rl.HexColor("#94A3B8"))))
            story.append(Spacer(1,0.4*cm))
            story.append(HRFlowable(width="100%",thickness=1,color=rl.HexColor("#3B82F6")))
            story.append(Spacer(1,0.2*cm))
            story.append(Paragraph(
                f"Generated by EduSense  ·  {datetime.now().strftime('%Y-%m-%d %H:%M')}",
                ps("foot",fontSize=8,textColor=rl.HexColor("#94A3B8"),alignment=TA_CENTER)))
            doc.build(story)
            messagebox.showinfo("Portfolio Generated",f"✅ Saved to Desktop!\n\nFile: {filename}")
            os.startfile(desktop)
        except Exception as e:
            messagebox.showerror("Error",f"Failed:\n{e}")

    # ═══════════════════════════════════════════════════
    #  STUDENTS TAB
    # ═══════════════════════════════════════════════════
    def _tab_students(self, parent):
        hdr=ctk.CTkFrame(parent,fg_color="transparent")
        hdr.pack(fill="x",padx=24,pady=(18,0))
        ctk.CTkLabel(hdr,text="👥  Students",font=ctk.CTkFont("Segoe UI",22,"bold"),
                     text_color=COLORS["text"]).pack(side="left")
        ctk.CTkLabel(hdr,text=f"{len(self.store.students)} total",
                     font=ctk.CTkFont("Segoe UI",12),
                     text_color=COLORS["text2"]).pack(side="right",padx=(0,8))
        self._sv=tk.StringVar(); self._sv.trace_add("write",lambda *_:self._redraw_cards())
        ctk.CTkEntry(hdr,textvariable=self._sv,placeholder_text="🔍  Search name / ID / dept…",
                     width=280,height=36,fg_color=COLORS["card"],border_color=COLORS["border"],
                     text_color=COLORS["text"]).pack(side="right",padx=8)
        Separator(parent,COLORS["border"]).pack(fill="x",padx=24,pady=8)
        self._grid_frame=ctk.CTkScrollableFrame(parent,fg_color="transparent",
                                                 scrollbar_button_color=COLORS["border2"],
                                                 scrollbar_button_hover_color=COLORS["border3"])
        self._grid_frame.pack(fill="both",expand=True,padx=16,pady=(0,12))
        self._redraw_cards()

    def _redraw_cards(self):
        q=getattr(self,"_sv",None); q=q.get().lower().strip() if q else ""
        students=self.store.students if not q else [
            s for s in self.store.students
            if q in s.get("name","").lower() or q in s.get("id","").lower()
            or q in s.get("dept","").lower() or q in s.get("email","").lower()]
        for w in self._grid_frame.winfo_children(): w.destroy()
        if not students:
            ctk.CTkLabel(self._grid_frame,text="No students match your search.",
                         font=ctk.CTkFont("Segoe UI",14),
                         text_color=COLORS["text3"]).pack(pady=60); return
        COLS=4; self._grid_frame.grid_columnconfigure(list(range(COLS)),weight=1)
        for i,s in enumerate(students):
            r,c=divmod(i,COLS)
            self._make_card(self._grid_frame,s).grid(row=r,column=c,padx=8,pady=8,sticky="nsew")

    def _make_card(self, parent, s):
        sid=s.get("id",""); name=s.get("name","Unknown"); dept=s.get("dept","")
        year=s.get("year",""); emoji=s.get("emoji","👤"); color=s.get("color",COLORS["blue"])
        present=s.get("present",False); att=s.get("attendance_rate",0); emotion=s.get("emotion","neutral")
        card=ctk.CTkFrame(parent,fg_color=COLORS["card"],corner_radius=14,
                           border_width=1,border_color=COLORS["border"])
        pl=ctk.CTkLabel(card,text="",width=96,height=96); pl.pack(pady=(14,2))
        _async_photo(pl,sid,emoji,color,(96,96))
        ctk.CTkLabel(card,text="🟢 Present" if present else "⚪ Absent",
                     font=ctk.CTkFont("Segoe UI",10),
                     text_color=COLORS["green"] if present else COLORS["text3"]).pack()
        ctk.CTkLabel(card,text=name,font=ctk.CTkFont("Segoe UI",12,"bold"),
                     text_color=COLORS["text"],wraplength=170).pack(padx=8)
        ctk.CTkLabel(card,text=f"{dept}  ·  Yr {year}",font=ctk.CTkFont("Segoe UI",10),
                     text_color=COLORS["text2"]).pack()
        ctk.CTkLabel(card,text=sid,font=ctk.CTkFont("Segoe UI",10),
                     text_color=COLORS["text3"]).pack()
        ec=COLORS.get(emotion,"#475569") or "#475569"
        ec=ec if (ec.startswith("#") and len(ec)==7) else "#475569"
        ctk.CTkLabel(card,text=f"  {emotion}  ",font=ctk.CTkFont("Segoe UI",10,"bold"),
                     fg_color="transparent",text_color=ec,corner_radius=6).pack(pady=(3,2))
        bg=ctk.CTkFrame(card,fg_color=COLORS["bg3"],corner_radius=4,height=5,width=140)
        bg.pack(padx=14,pady=(4,1)); bg.pack_propagate(False)
        if att>0:
            bc=COLORS["green"] if att>=75 else COLORS["amber"] if att>=50 else COLORS["red"]
            ctk.CTkFrame(bg,fg_color=bc,corner_radius=4,
                         height=5,width=max(4,int(140*att/100))).place(x=0,y=0)
        ctk.CTkLabel(card,text=f"Attendance  {att}%",font=ctk.CTkFont("Segoe UI",10),
                     text_color=COLORS["text3"]).pack(pady=(0,4))
        ctk.CTkButton(card,text="✅  Mark Attendance",font=ctk.CTkFont("Segoe UI",11,"bold"),
                      fg_color=COLORS["blue_dim"],hover_color=COLORS["blue3"],
                      text_color=COLORS["text"],height=32,corner_radius=8,
                      command=lambda st=s:self._modal(st)
                      ).pack(fill="x",padx=12,pady=(2,4))
        ctk.CTkButton(card,text="🎓 Portfolio PDF",font=ctk.CTkFont("Segoe UI",10),
                      fg_color=COLORS["bg3"],hover_color=COLORS["blue3"],
                      text_color=COLORS["text"],height=28,corner_radius=8,
                      command=lambda st=s:self._generate_student_portfolio(st)
                      ).pack(fill="x",padx=12,pady=(0,10))
        return card

    # ═══════════════════════════════════════════════════
    #  ATTENDANCE MODAL (single student)
    # ═══════════════════════════════════════════════════
    def _modal(self, s):
        sid=s.get("id",""); name=s.get("name","Unknown")
        dept=s.get("dept",""); year=s.get("year","")
        emoji=s.get("emoji","👤"); color=s.get("color",COLORS["blue"])
        win=ctk.CTkToplevel(self); win.title("Mark Attendance"); win.geometry("480x540")
        win.resizable(False,False); win.configure(fg_color=COLORS["bg2"])
        win.grab_set(); win.lift(); win.focus_force()
        hbar=ctk.CTkFrame(win,fg_color=COLORS["blue_dim"],corner_radius=0,height=54)
        hbar.pack(fill="x"); hbar.pack_propagate(False)
        ctk.CTkLabel(hbar,text="✅  Mark Attendance",font=ctk.CTkFont("Segoe UI",15,"bold"),
                     text_color="white").pack(side="left",padx=20,pady=14)
        pl=ctk.CTkLabel(win,text="",width=100,height=100); pl.pack(pady=(16,4))
        _async_photo(pl,sid,emoji,color,(100,100))
        ctk.CTkLabel(win,text=name,font=ctk.CTkFont("Segoe UI",16,"bold"),
                     text_color=COLORS["text"]).pack()
        ctk.CTkLabel(win,text=f"{dept}  ·  Year {year}  ·  {sid}",
                     font=ctk.CTkFont("Segoe UI",11),text_color=COLORS["text2"]).pack(pady=(2,4))
        Separator(win,COLORS["border"]).pack(fill="x",padx=24,pady=10)
        courses=self._my_courses(); cnames=[f"{c['name']} ({c['code']})" for c in courses]
        cv=ctk.StringVar(value=cnames[0] if cnames else "")
        wv=ctk.StringVar(value=str(self.store.current_week))
        r1=ctk.CTkFrame(win,fg_color="transparent"); r1.pack(fill="x",padx=24,pady=4)
        ctk.CTkLabel(r1,text="Course:",width=60,font=ctk.CTkFont("Segoe UI",12),
                     text_color=COLORS["text2"]).pack(side="left")
        ctk.CTkComboBox(r1,values=cnames,variable=cv,fg_color=COLORS["card"],
                        border_color=COLORS["border"],button_color=COLORS["blue_dim"],
                        text_color=COLORS["text"],width=330,height=36).pack(side="left",padx=6)
        r2=ctk.CTkFrame(win,fg_color="transparent"); r2.pack(fill="x",padx=24,pady=4)
        ctk.CTkLabel(r2,text="Week:",width=60,font=ctk.CTkFont("Segoe UI",12),
                     text_color=COLORS["text2"]).pack(side="left")
        ctk.CTkComboBox(r2,values=[str(w) for w in range(1,17)],variable=wv,
                        fg_color=COLORS["card"],border_color=COLORS["border"],
                        button_color=COLORS["blue_dim"],text_color=COLORS["text"],
                        width=100,height=36).pack(side="left",padx=6)
        st_lbl=ctk.CTkLabel(win,text="",font=ctk.CTkFont("Segoe UI",12),
                             text_color=COLORS["green"]); st_lbl.pack(pady=6)
        def do_mark():
            if not cv.get() or cv.get() not in cnames: return
            idx=cnames.index(cv.get()); cid=courses[idx]["id"]; week=int(wv.get())
            ok=self.store.mark_attendance(cid,sid,1.0,"manual",week)
            if ok:
                st_lbl.configure(text=f"✅ {name} marked present — Week {week}",
                                  text_color=COLORS["green"])
                for st in self.store.students:
                    if st["id"]==sid: st["present"]=True; break
            else:
                st_lbl.configure(text="⚠️  Already marked this week",text_color=COLORS["amber"])
        br=ctk.CTkFrame(win,fg_color="transparent"); br.pack(pady=12)
        ctk.CTkButton(br,text="✅  Mark Present",font=ctk.CTkFont("Segoe UI",13,"bold"),
                      fg_color=COLORS["green"],hover_color="#059669",text_color="white",
                      width=160,height=42,command=do_mark).pack(side="left",padx=8)
        ctk.CTkButton(br,text="Close",font=ctk.CTkFont("Segoe UI",13),
                      fg_color=COLORS["card2"],hover_color=COLORS["border2"],
                      text_color=COLORS["text2"],width=100,height=42,
                      command=win.destroy).pack(side="left",padx=8)

    # ═══════════════════════════════════════════════════
    #  ANALYTICS
    # ═══════════════════════════════════════════════════
    def _tab_analytics(self, parent):
        pad={"padx":20,"pady":6}
        ctk.CTkLabel(parent,text="📊  R Analysis Reports",
                     font=ctk.CTkFont("Segoe UI",22,"bold"),
                     text_color=COLORS["text"]).pack(anchor="w",**pad)
        ctk.CTkLabel(parent,text="Run R scripts directly — no need to open R manually",
                     font=ctk.CTkFont("Segoe UI",11),text_color=COLORS["text2"]).pack(anchor="w",padx=20)
        r_ok=os.path.exists(RSCRIPT)
        info=ctk.CTkFrame(parent,fg_color=COLORS.get("green_dim","#052e1a"),corner_radius=10,
                          border_width=1,border_color=COLORS.get("green","#10b981") if r_ok else COLORS.get("red","#ef4444"))
        info.pack(fill="x",**pad)
        ctk.CTkLabel(info,text=f"✅  R detected at {RSCRIPT}" if r_ok
                     else "❌  R not found. Check RSCRIPT path at top of doctor_page.py",
                     font=ctk.CTkFont("Segoe UI",11),
                     text_color=COLORS.get("green2","#34d399") if r_ok else COLORS.get("red2","#f87171")
                     ).pack(padx=14,pady=10)
        sf=ctk.CTkFrame(parent,fg_color="transparent"); sf.pack(fill="x",**pad)
        for i in range(3): sf.grid_columnconfigure(i,weight=1)
        SCRIPTS=[
            ("📦","Install Packages","install_packages.R","Install all R packages · Run once first",COLORS.get("amber","#f59e0b")),
            ("📊","Full Analysis","analysis.R","Emotion distribution · Clustering · Charts",COLORS.get("blue","#3b82f6")),
            ("✨","Shiny Dashboard","shiny_dashboard.R",f"Interactive dashboard · localhost:{SHINY_PORT}",COLORS.get("green","#10b981")),
        ]
        out_card=ctk.CTkFrame(parent,fg_color=COLORS["card"],corner_radius=12,
                              border_width=1,border_color=COLORS["border"])
        out_card.pack(fill="x",**pad)
        ctk.CTkLabel(out_card,text="R Script Output",font=ctk.CTkFont("Segoe UI",12,"bold"),
                     text_color=COLORS["text2"]).pack(anchor="w",padx=12,pady=(10,4))
        self._r_out=ctk.CTkTextbox(out_card,height=160,font=ctk.CTkFont("Consolas",11),
                                    fg_color=COLORS["bg"],text_color=COLORS.get("green2","#34d399"),
                                    corner_radius=10)
        self._r_out.pack(fill="x",padx=12,pady=(0,12))
        self._r_out.insert("end","# R output will appear here...\n")
        self._r_out.configure(state="disabled")
        for col,(icon,name,file,desc,color) in enumerate(SCRIPTS):
            card=ctk.CTkFrame(sf,fg_color=COLORS["card"],corner_radius=12,
                              border_width=1,border_color=COLORS["border"])
            card.grid(row=0,column=col,padx=8,pady=8,sticky="nsew")
            ctk.CTkLabel(card,text=icon,font=ctk.CTkFont("Segoe UI",32)).pack(pady=(18,4))
            ctk.CTkLabel(card,text=name,font=ctk.CTkFont("Segoe UI",13,"bold"),
                         text_color=COLORS["text"]).pack()
            ctk.CTkLabel(card,text=file,font=ctk.CTkFont("Consoles",10) if False else ctk.CTkFont("Consolas",10),
                         text_color=COLORS["text3"]).pack(pady=(2,4))
            ctk.CTkLabel(card,text=desc,font=ctk.CTkFont("Segoe UI",10),
                         text_color=COLORS["text2"],wraplength=180,justify="center").pack(padx=10)
            ctk.CTkButton(card,text="▶  Run",font=ctk.CTkFont("Segoe UI",12,"bold"),
                          fg_color=color,hover_color=COLORS["blue3"],text_color="#fff",
                          height=36,corner_radius=8,command=lambda f=file:self._run_r(f)
                          ).pack(fill="x",padx=14,pady=(10,16))

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

    # ═══════════════════════════════════════════════════
    #  PDF EXPORT (student roster)
    # ═══════════════════════════════════════════════════
    def _export_students_pdf(self, course):
        try:
            from reportlab.lib.pagesizes import A4
            from reportlab.lib import colors as rl
            from reportlab.lib.units import cm
            from reportlab.platypus import (SimpleDocTemplate,Paragraph,Spacer,Table,TableStyle)
            from reportlab.lib.styles import getSampleStyleSheet,ParagraphStyle
            from reportlab.lib.enums import TA_CENTER
            from reportlab.pdfbase import pdfmetrics
            from reportlab.pdfbase.ttfonts import TTFont
        except ImportError:
            messagebox.showerror("Missing Library","Run:  pip install reportlab"); return
        FONT="Helvetica"
        for fp in [r"C:\Windows\Fonts\Arial.ttf",r"C:\Windows\Fonts\calibri.ttf"]:
            if os.path.exists(fp):
                try:
                    fn=os.path.splitext(os.path.basename(fp))[0]
                    pdfmetrics.registerFont(TTFont(fn,fp)); FONT=fn; break
                except: pass
        styles=getSampleStyleSheet()
        def ps(name,**kw):
            kw.setdefault("fontName",FONT)
            return ParagraphStyle(name,parent=styles["Normal"],**kw)
        cid=self._resolve_cid(course)
        students=self.store.get_enrolled_students(cid) or self.store.students
        if not students:
            messagebox.showwarning("No Students","No students found."); return
        desktop=os.path.join(os.path.expanduser("~"),"Desktop")
        if not os.path.exists(desktop): desktop=os.path.expanduser("~")
        filename=f"{course.get('code','COURSE')}_students_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
        path=os.path.join(desktop,filename)
        try:
            doc=SimpleDocTemplate(path,pagesize=A4,leftMargin=2*cm,rightMargin=2*cm,
                                   topMargin=2*cm,bottomMargin=2*cm)
            doctor=self.store.get_doctor(course.get("doctor_id",""))
            doc_name=doctor["name"] if doctor else "—"
            story=[
                Paragraph(f"<b>{course.get('name','Course')} — Student Roster</b>",
                          ps("title",fontSize=18,textColor=rl.HexColor("#1E3A8A"),spaceAfter=4)),
                Paragraph(f"Code: {course.get('code','')}  ·  Room: {course.get('room','')}  ·  "
                           f"Lecturer: {doc_name}  ·  Total: {len(students)}  ·  "
                           f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M')}",
                          ps("sub",fontSize=10,textColor=rl.HexColor("#64748B"),spaceAfter=8)),
                Spacer(1,0.3*cm),
                Table([[""]], colWidths=[17*cm],
                       style=TableStyle([("LINEBELOW",(0,0),(-1,-1),2,rl.HexColor("#3B82F6"))])),
                Spacer(1,0.4*cm),
            ]
            th=ps("th",fontSize=9,textColor=rl.white)
            td=ps("td",fontSize=9,textColor=rl.HexColor("#111827"))
            col_w=[0.8*cm,2.2*cm,4.6*cm,3.6*cm,1.4*cm,2.0*cm,2.2*cm]
            data=[[Paragraph(f"<b>{h}</b>",th) for h in
                   ["#","ID","Full Name","Department","Year","Attendance","Engagement"]]]
            for i,s in enumerate(students):
                av=s.get("attendance_rate",0); ev=s.get("engagement",0)
                ac="#10B981" if av>=75 else "#F59E0B" if av>=50 else "#EF4444"
                data.append([Paragraph(str(i+1),td),Paragraph(str(s.get("id","")),td),
                              Paragraph(str(s.get("name","")),td),Paragraph(str(s.get("dept","")),td),
                              Paragraph(f"Year {s.get('year','')}",td),
                              Paragraph(f"<font color='{ac}'><b>{av}%</b></font>",td),
                              Paragraph(f"{ev}%",td)])
            tbl=Table(data,colWidths=col_w,repeatRows=1)
            tbl.setStyle(TableStyle([
                ("BACKGROUND",(0,0),(-1,0),rl.HexColor("#1E3A8A")),
                ("ROWBACKGROUNDS",(0,1),(-1,-1),[rl.HexColor("#F8FAFC"),rl.HexColor("#EFF6FF")]),
                ("GRID",(0,0),(-1,-1),0.4,rl.HexColor("#CBD5E1")),
                ("TOPPADDING",(0,0),(-1,-1),6),("BOTTOMPADDING",(0,0),(-1,-1),6),
                ("LEFTPADDING",(0,0),(-1,-1),6),("VALIGN",(0,0),(-1,-1),"MIDDLE"),
            ]))
            story.append(tbl); story.append(Spacer(1,0.6*cm))
            story.append(Paragraph("Generated by EduSense — Classroom Emotion &amp; Attendance AI System.",
                          ps("foot",fontSize=8,textColor=rl.HexColor("#94A3B8"),alignment=TA_CENTER)))
            doc.build(story)
            messagebox.showinfo("PDF Exported",f"Saved to Desktop:\n{filename}\n\n{len(students)} students.")
            os.startfile(desktop)
        except Exception as e:
            messagebox.showerror("Export Failed",f"Error:\n{e}")

    # ═══════════════════════════════════════════════════
    #  ALERTS
    # ═══════════════════════════════════════════════════
    def _tab_alerts(self, parent):
        ctk.CTkLabel(parent,text="🔔  Alerts",font=ctk.CTkFont("Segoe UI",22,"bold"),
                     text_color=COLORS["text"]).pack(anchor="w",padx=24,pady=(18,10))
        alerts=getattr(self.store,"alerts",[])
        if not alerts:
            ctk.CTkLabel(parent,text="No alerts.",text_color=COLORS["text3"]).pack(pady=40); return
        sc=ctk.CTkScrollableFrame(parent,fg_color="transparent",scrollbar_button_color=COLORS["border2"])
        sc.pack(fill="both",expand=True,padx=16,pady=8)
        for a in alerts:
            sev=a.get("severity","Info")
            sc_color=COLORS["red"] if sev=="Critical" else COLORS["amber"] if sev=="Warning" else COLORS["blue"]
            af=ctk.CTkFrame(sc,fg_color=COLORS["card"],corner_radius=10,border_width=1,border_color=COLORS["border"])
            af.pack(fill="x",padx=8,pady=4)
            ctk.CTkLabel(af,text=f"  ⚠  {a.get('type','')}  —  {a.get('student','')}",
                         font=ctk.CTkFont("Segoe UI",12,"bold"),text_color=sc_color
                         ).pack(anchor="w",padx=12,pady=(8,2))
            ctk.CTkLabel(af,text=f"  {a.get('msg','')}",font=ctk.CTkFont("Segoe UI",11),
                         text_color=COLORS["text2"]).pack(anchor="w",padx=12,pady=(0,8))

    # ═══════════════════════════════════════════════════
    #  LIVE SESSION
    # ═══════════════════════════════════════════════════
    def _tab_live(self, parent):
        import cv2
        self._live_running=False; self._live_cap=None
        ctk.CTkLabel(parent,text="📷  Live Session",font=ctk.CTkFont("Segoe UI",22,"bold"),
                     text_color=COLORS["text"]).pack(anchor="w",padx=24,pady=(18,0))
        ctrl=ctk.CTkFrame(parent,fg_color=COLORS["card"],corner_radius=12,border_width=1,border_color=COLORS["border"])
        ctrl.pack(fill="x",padx=24,pady=12)
        crow=ctk.CTkFrame(ctrl,fg_color="transparent"); crow.pack(fill="x",padx=16,pady=12)
        ctk.CTkLabel(crow,text="Course:",width=70,font=ctk.CTkFont("Segoe UI",12,"bold"),
                     text_color=COLORS["text2"]).pack(side="left")
        courses=self._my_courses(); cnames=[f"{c['name']} ({c['code']})" for c in courses]
        self._live_course_var=ctk.StringVar(value=cnames[0] if cnames else "")
        ctk.CTkComboBox(crow,values=cnames,variable=self._live_course_var,
                        fg_color=COLORS["bg3"],border_color=COLORS["border"],
                        button_color=COLORS["blue_dim"],text_color=COLORS["text"],
                        width=300,height=36).pack(side="left",padx=8)
        ctk.CTkLabel(crow,text="Week:",width=50,font=ctk.CTkFont("Segoe UI",12,"bold"),
                     text_color=COLORS["text2"]).pack(side="left",padx=(12,0))
        self._live_week_var=ctk.StringVar(value=str(self.store.current_week))
        ctk.CTkComboBox(crow,values=[str(w) for w in range(1,17)],variable=self._live_week_var,
                        fg_color=COLORS["bg3"],border_color=COLORS["border"],
                        button_color=COLORS["blue_dim"],text_color=COLORS["text"],
                        width=80,height=36).pack(side="left",padx=8)
        cam_outer=ctk.CTkFrame(parent,fg_color=COLORS["card"],corner_radius=12,border_width=1,border_color=COLORS["border"])
        cam_outer.pack(fill="both",expand=True,padx=24,pady=(0,8))
        self._cam_label=ctk.CTkLabel(cam_outer,text="📷  Camera not started",
                                      font=ctk.CTkFont("Segoe UI",16),text_color=COLORS["text3"])
        self._cam_label.pack(expand=True,fill="both",padx=8,pady=8)
        self._live_status=ctk.CTkLabel(parent,text="",font=ctk.CTkFont("Segoe UI",11),
                                        text_color=COLORS["green"]); self._live_status.pack()
        btn_row=ctk.CTkFrame(parent,fg_color="transparent"); btn_row.pack(pady=8)
        self._start_btn=ctk.CTkButton(btn_row,text="▶  Start Session",
                                       font=ctk.CTkFont("Segoe UI",13,"bold"),
                                       fg_color=COLORS["green"],hover_color="#059669",
                                       text_color="white",width=160,height=44,command=self._live_start)
        self._start_btn.pack(side="left",padx=8)
        self._stop_btn=ctk.CTkButton(btn_row,text="⏹  Stop Session",
                                      font=ctk.CTkFont("Segoe UI",13,"bold"),
                                      fg_color=COLORS["red"],hover_color="#b91c1c",
                                      text_color="white",width=160,height=44,state="disabled",command=self._live_stop)
        self._stop_btn.pack(side="left",padx=8)
        ctk.CTkButton(btn_row,text="📸  Snapshot",font=ctk.CTkFont("Segoe UI",13),
                      fg_color=COLORS["blue_dim"],hover_color=COLORS["blue3"],
                      text_color="white",width=160,height=44,command=self._live_snapshot).pack(side="left",padx=8)

    def _live_start(self):
        import cv2
        try:
            self._live_cap=cv2.VideoCapture(0)
            if not self._live_cap.isOpened():
                self._live_status.configure(text="❌ Cannot open camera.",text_color=COLORS["red"]); return
            self._live_running=True; self._start_btn.configure(state="disabled")
            self._stop_btn.configure(state="normal")
            self._live_status.configure(text="🟢 Session running…",text_color=COLORS["green"])
            self._live_loop()
        except Exception as e:
            self._live_status.configure(text=f"❌ Camera error: {e}",text_color=COLORS["red"])

    def _live_stop(self):
        self._live_running=False
        if self._live_cap: self._live_cap.release(); self._live_cap=None
        self._cam_label.configure(image=None,text="📷  Session stopped")
        self._start_btn.configure(state="normal"); self._stop_btn.configure(state="disabled")
        self._live_status.configure(text="⏹ Session stopped.",text_color=COLORS["text2"])

    def _live_loop(self):
        import cv2
        from gui import face_engine as fe
        if not self._live_running or self._live_cap is None: return
        ret,frame=self._live_cap.read()
        if not ret: self.after(500,self._live_loop); return
        faces=fe.detect_faces(frame); att_count=0
        for box in faces:
            x,y,w,h=[int(v) for v in box]
            sid,conf=fe.identify_face(frame,box); face_crop=frame[y:y+h,x:x+w]
            emo_data=fe.analyze_emotion(face_crop)
            label_str=f"{sid or 'Unknown'}  {emo_data['emotion']}  {int(emo_data['engagement_score']*100)}%"
            if sid and conf>0.82:
                courses=self._my_courses(); cnames=[f"{c['name']} ({c['code']})" for c in courses]
                if hasattr(self,"_live_course_var") and self._live_course_var.get() in cnames:
                    idx=cnames.index(self._live_course_var.get())
                    cid=courses[idx]["id"]; week=int(self._live_week_var.get())
                    self.store.mark_attendance(cid,sid,conf,"face",week)
            att_label=emo_data.get("attention_label","unknown")
            color_map={"attentive":(52,211,153),"moderate":(59,162,245),"distracted":(239,68,68),"unknown":(128,128,128)}
            color_bgr=color_map.get(att_label,(128,128,128))
            cv2.rectangle(frame,(x,y),(x+w,y+h),color_bgr,2)
            cv2.putText(frame,label_str,(x,y-8),cv2.FONT_HERSHEY_SIMPLEX,0.45,color_bgr,1)
            if att_label=="attentive": att_count+=1
        try:
            from PIL import Image as PILImage
            rgb=cv2.cvtColor(frame,cv2.COLOR_BGR2RGB); pil=PILImage.fromarray(rgb)
            lw=self._cam_label.winfo_width() or 640; lh=self._cam_label.winfo_height() or 480
            pil.thumbnail((lw,lh),PILImage.LANCZOS)
            ctk_img=ctk.CTkImage(light_image=pil,dark_image=pil,size=(pil.width,pil.height))
            self._cam_label.configure(image=ctk_img,text=""); self._cam_label._ctk_image=ctk_img
        except: pass
        self._live_status.configure(
            text=f"🟢 Running  |  Faces: {len(faces)}  |  Attentive: {att_count}",
            text_color=COLORS["green"])
        self.after(33,self._live_loop)

    def _live_snapshot(self):
        if not self._live_running or self._live_cap is None:
            self._live_status.configure(text="⚠️ Start session first",text_color=COLORS["amber"]); return
        import cv2
        ret,frame=self._live_cap.read()
        if ret:
            ts=datetime.now().strftime("%Y%m%d_%H%M%S")
            path=os.path.join(os.path.dirname(__file__),"..","..","f snapshot_{ts}.jpg")
            cv2.imwrite(path,frame)
            self._live_status.configure(text=f"📸 Saved: snapshot_{ts}.jpg",text_color=COLORS["green"])