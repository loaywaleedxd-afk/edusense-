"""
Parent Dashboard — View child's performance (read-only) + Child Grades tab
"""
import customtkinter as ctk
import tkinter as tk
import random, os, threading
from datetime import datetime
from PIL import Image, ImageDraw

from gui.theme import COLORS, EMOTION_ICONS
from gui.components import (Sidebar, Topbar, StatCard, Card, Badge, Separator,
                             DataTable, LineChart, BarChart, DonutChart)

# ── Photo helper ────────────────────────────────────────────────────
_PHOTOS_DIR = os.path.normpath(
    os.path.join(os.path.dirname(__file__), "..", "..", "student_photos"))
_CSV_PATH = os.path.normpath(
    os.path.join(os.path.dirname(__file__), "..", "..", "StudentPicsDataset.csv"))
_PHOTO_CACHE: dict = {}
_SID_LINK:    dict = {}
_MAP_DONE:    bool = False

def _build_map(students):
    global _MAP_DONE
    if _MAP_DONE: return
    _MAP_DONE = True
    import csv
    num_to_sid = {}
    for s in students:
        num = s.get("email","").split("@")[0].replace(".0","").strip()
        if num: num_to_sid[num] = s["id"]
    if os.path.exists(_CSV_PATH):
        try:
            with open(_CSV_PATH, encoding="utf-8-sig") as f:
                for row in csv.DictReader(f):
                    uid  = str(row.get("Student ID","")).strip()
                    link = str(row.get("Photo Link","")).strip()
                    sid  = num_to_sid.get(uid)
                    if sid and link: _SID_LINK[sid] = link
        except Exception: pass

def _gdrive(url):
    if "id=" in url: fid = url.split("id=")[1].split("&")[0]
    elif "/d/" in url: fid = url.split("/d/")[1].split("/")[0]
    else: return url
    return f"https://drive.google.com/uc?export=download&id={fid}"

def _load_pil(sid, size):
    for ext in ("jpg","jpeg","png"):
        p = os.path.join(_PHOTOS_DIR, f"{sid}.{ext}")
        if os.path.exists(p):
            try:
                img = Image.open(p).convert("RGB")
                w,h = img.size; m = min(w,h)
                img = img.crop(((w-m)//2,(h-m)//2,(w+m)//2,(h+m)//2))
                return img.resize(size, Image.LANCZOS)
            except Exception: pass
    url = _SID_LINK.get(sid,"")
    if url:
        try:
            import requests
            from io import BytesIO
            r = requests.get(_gdrive(url), timeout=8)
            if r.status_code==200 and len(r.content)>500:
                img = Image.open(BytesIO(r.content)).convert("RGB")
                w,h = img.size; m = min(w,h)
                img = img.crop(((w-m)//2,(h-m)//2,(w+m)//2,(h+m)//2))
                return img.resize(size, Image.LANCZOS)
        except Exception: pass
    return None

def _avatar(color, size):
    try: r,g,b = int(color[1:3],16),int(color[3:5],16),int(color[5:7],16)
    except Exception: r,g,b = 59,130,246
    base = Image.new("RGB",(size,size),(12,23,42))
    circle = Image.new("RGB",(size,size),(r,g,b))
    mask = Image.new("L",(size,size),0)
    ImageDraw.Draw(mask).ellipse([0,0,size,size],fill=255)
    base.paste(circle, mask=mask)
    return base

def get_photo(sid, emoji, color, size=(120,120)):
    key = f"{sid}_{size[0]}"
    if key in _PHOTO_CACHE: return _PHOTO_CACHE[key]
    pil = _load_pil(sid, size) or _avatar(color, size[0])
    mask = Image.new("L", pil.size, 0)
    ImageDraw.Draw(mask).ellipse([0,0,pil.width,pil.height],fill=255)
    out = Image.new("RGB", pil.size, (12,23,42))
    out.paste(pil, mask=mask)
    import customtkinter as _ctk
    tk_img = _ctk.CTkImage(light_image=out, dark_image=out, size=size)
    _PHOTO_CACHE[key] = tk_img
    return tk_img

def async_photo(widget, sid, emoji, color, size=(120,120)):
    def _work():
        img = get_photo(sid, emoji, color, size)
        def _apply():
            try: widget.configure(image=img, text="")
            except Exception: pass
        try: widget.after(0, _apply)
        except Exception: pass
    threading.Thread(target=_work, daemon=True).start()


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


class ParentPage(ctk.CTkFrame):
    NAV = [
        {"id":"overview",    "icon":"📊", "label":"Overview"},
        {"id":"attendance",  "icon":"✅", "label":"Attendance"},
        {"id":"emotions",    "icon":"😊", "label":"Emotions"},
        {"id":"performance", "icon":"📈", "label":"Performance"},
        {"id":"grades",      "icon":"📝", "label":"Child Grades"},
        {"id":"schedule",    "icon":"📅", "label":"Schedule"},
    ]

    def __init__(self, parent, user, on_logout, **kw):
        super().__init__(parent, fg_color=COLORS["bg"], corner_radius=0, **kw)
        self._user = user
        self._store = parent.store

        student_id = user.get("student_id", "") or user.get("id", "")
        linked = self._store.get_student(student_id)

        if not linked:
            parent_user = self._store.get_user(user.get("username", ""))
            if parent_user:
                sid = parent_user.get("student_id", "")
                if sid:
                    linked = self._store.get_student(sid)

        if not linked and user.get("student_name"):
            for s in self._store.students:
                if s["name"] == user.get("student_name"):
                    linked = s
                    break

        self._child = linked if linked else self._store.students[0]

        # ensure exam_results exists
        if not hasattr(self._store, "exam_results"):
            self._store.exam_results = {}

        _build_map(self._store.students)

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

        self._on_nav("overview")

    def _on_nav(self, page_id):
        for w in self._content.winfo_children():
            w.destroy()
        self._topbar.page_label.configure(text={
            "overview":    "Child Overview",
            "attendance":  "Attendance Records",
            "emotions":    "Emotional Analysis",
            "performance": "Academic Performance",
            "grades":      "Child Exam Results",
            "schedule":    "Class Schedule",
        }.get(page_id, page_id.title()))
        fn = getattr(self, f"_page_{page_id}", None)
        if fn:
            fn(self._content)

    # ══════════════════════════════════════════════════════
    #  CHILD GRADES
    # ══════════════════════════════════════════════════════
    def _page_grades(self, parent):
        ctk.CTkLabel(parent, text="📝  Child Exam Results",
                     font=ctk.CTkFont("Segoe UI", 22, "bold"),
                     text_color=COLORS["text"]).pack(anchor="w", padx=24, pady=(18, 10))

        # child info banner
        info_bar = ctk.CTkFrame(parent, fg_color=COLORS["card"],
                                 corner_radius=12, border_width=1,
                                 border_color=COLORS["border"])
        info_bar.pack(fill="x", padx=24, pady=(0, 8))
        ctk.CTkLabel(info_bar,
                     text=f"👤  {self._child.get('emoji','')} {self._child.get('name','')}  "
                          f"·  {self._child.get('dept','')}  ·  Year {self._child.get('year','')}  "
                          f"·  ID: {self._child.get('id','')}",
                     font=ctk.CTkFont("Segoe UI", 12),
                     text_color=COLORS["text"]).pack(padx=16, pady=12)

        sid     = self._child.get("id", "")
        results = self._store.exam_results.get(sid, {})

        if not results:
            f = ctk.CTkFrame(parent, fg_color="transparent")
            f.pack(expand=True)
            ctk.CTkLabel(f, text="📝",
                         font=ctk.CTkFont("Segoe UI", 48)).pack(pady=(40, 8))
            ctk.CTkLabel(f, text="No grades available yet.",
                         font=ctk.CTkFont("Segoe UI", 16, "bold"),
                         text_color=COLORS["text"]).pack()
            ctk.CTkLabel(f, text="The lecturer has not entered grades yet.",
                         font=ctk.CTkFont("Segoe UI", 12),
                         text_color=COLORS["text3"]).pack(pady=6)
            return

        # summary stats
        grades  = [v["grade"] for v in results.values()]
        avg     = round(sum(grades) / len(grades), 1)
        passed  = sum(1 for g in grades if g >= 50)

        stats_row = ctk.CTkFrame(parent, fg_color="transparent")
        stats_row.pack(fill="x", padx=24, pady=8)
        for lbl, val, col in [
            ("Subjects",  len(grades),          COLORS["blue"]),
            ("Average",   f"{avg}%",             COLORS["amber"]),
            ("Passed",    passed,                 COLORS["green"]),
            ("Failed",    len(grades) - passed,  COLORS["red"]),
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

        # grade cards (read-only)
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

            card = ctk.CTkFrame(sc, fg_color=COLORS["card"],
                                corner_radius=12, border_width=1,
                                border_color=COLORS["border"])
            card.pack(fill="x", padx=4, pady=6)

            ctk.CTkFrame(card, fg_color=gc, corner_radius=8, width=6
                         ).pack(side="left", fill="y")

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
            status = "✅ Pass" if grade >= 50 else "❌ Fail"
            sc_col = COLORS.get("green","#10b981") if grade >= 50 else COLORS.get("red","#ef4444")
            ctk.CTkLabel(gr, text=status,
                         font=ctk.CTkFont("Segoe UI", 11),
                         text_color=sc_col).pack()

    # ══════════════════════════════════════════════════════
    #  OVERVIEW
    # ══════════════════════════════════════════════════════
    def _page_overview(self, parent):
        pad = {"padx": 20, "pady": 6}
        hdr = ctk.CTkFrame(parent, fg_color="transparent")
        hdr.pack(fill="x", **pad)
        info_card = ctk.CTkFrame(hdr, fg_color=COLORS["card"],
                                  corner_radius=16, border_width=1,
                                  border_color=COLORS["border"])
        info_card.pack(fill="x")
        inner = ctk.CTkFrame(info_card, fg_color="transparent")
        inner.pack(padx=20, pady=16)
        left = ctk.CTkFrame(inner, fg_color="transparent")
        left.pack(side="left", fill="y")
        photo_lbl = ctk.CTkLabel(left, text="", width=110, height=110)
        photo_lbl.pack(side="left", padx=(0, 18))
        async_photo(photo_lbl,
                    self._child["id"],
                    self._child.get("emoji","👤"),
                    self._child.get("color", COLORS["blue"]),
                    (110, 110))
        details = ctk.CTkFrame(left, fg_color="transparent")
        details.pack(side="left")
        ctk.CTkLabel(details, text=self._child["name"],
                     font=ctk.CTkFont("Segoe UI", 20, "bold"),
                     text_color=COLORS["text"]).pack(anchor="w")
        ctk.CTkLabel(details,
                     text=f"{self._child['id']} · {self._child['dept']} · Year {self._child['year']}",
                     font=ctk.CTkFont("Segoe UI", 12),
                     text_color=COLORS["text2"]).pack(anchor="w")
        emo   = self._child.get("emotion","neutral")
        emo_c = COLORS.get(emo, COLORS["text3"])
        ctk.CTkLabel(details,
                     text=f"  {EMOTION_ICONS.get(emo,'😐')} {emo.title()}  ",
                     font=ctk.CTkFont("Segoe UI", 11, "bold"),
                     text_color=emo_c, fg_color="transparent",
                     corner_radius=6).pack(anchor="w", pady=(4,0))
        stats = ctk.CTkFrame(inner, fg_color="transparent")
        stats.pack(side="right")
        for label, value, color in [
            ("GPA", f"{self._child['gpa']}", COLORS["blue2"]),
            ("Attendance", f"{self._child['attendance_rate']}%", COLORS["green2"]),
        ]:
            cell = ctk.CTkFrame(stats, fg_color=COLORS["bg3"],
                                corner_radius=10, width=100)
            cell.pack(side="left", padx=6)
            cell.pack_propagate(False)
            ctk.CTkLabel(cell, text=label,
                         font=ctk.CTkFont("Segoe UI", 9),
                         text_color=COLORS["text2"]).pack(pady=(8, 0))
            ctk.CTkLabel(cell, text=value,
                         font=ctk.CTkFont("Segoe UI", 18, "bold"),
                         text_color=color).pack(pady=(0, 8))

        stat_row = ctk.CTkFrame(parent, fg_color="transparent")
        stat_row.pack(fill="x", **pad)
        for i, (l, v, s, ic, ac) in enumerate([
            ("Attendance Rate", f"{self._child['attendance_rate']}%",
             "This semester", "✅", "green"),
            ("Avg Engagement", f"{self._child['engagement']}%",
             "In lectures", "🧠", "blue"),
            ("Attention Score", f"{self._child['attention_score']}%",
             "Class focus", "👁️", "purple"),
            ("Current Emotion", self._child["emotion"].title(),
             f"Status: {self._child['attention']}", EMOTION_ICONS.get(self._child["emotion"], "😊"), "amber"),
        ]):
            StatCard(stat_row, l, v, s, ic, ac).grid(
                row=0, column=i, padx=6, sticky="nsew")
            stat_row.grid_columnconfigure(i, weight=1)

        mid = ctk.CTkFrame(parent, fg_color="transparent")
        mid.pack(fill="x", **pad)
        mid.grid_columnconfigure(0, weight=1)
        mid.grid_columnconfigure(1, weight=1)
        eng_c = Card(mid, title="Engagement Trend (Last 14 Lectures)")
        eng_c.grid(row=0, column=0, padx=(0, 8), sticky="nsew")
        trend = self._store.trend_data
        LineChart(eng_c, series=[
            {"label": "Engagement", "data": trend["engagement"], "color": COLORS["blue"]},
            {"label": "Attention",  "data": trend["attention"],  "color": COLORS["green"]},
        ], labels=trend["labels"], height=200).pack(fill="x", padx=12, pady=(4, 12))
        emo_c = Card(mid, title="Emotion Distribution")
        emo_c.grid(row=0, column=1, sticky="nsew")
        DonutChart(emo_c, data=[
            {"label": d["emotion"], "value": d["count"], "color": d["color"]}
            for d in self._store.emotion_dist[:6]
        ], size=180).pack(pady=(8, 12))

        if hasattr(self._store, 'alerts') and self._store.alerts:
            alert_c = Card(parent, title="Recent Alerts")
            alert_c.pack(fill="x", **pad)
            try:
                from gui.components import AlertItem
                for alert in self._store.alerts[:3]:
                    AlertItem(alert_c, alert).pack(fill="x", padx=12, pady=(0, 6))
            except Exception:
                pass

    # ══════════════════════════════════════════════════════
    #  ATTENDANCE
    # ══════════════════════════════════════════════════════
    def _page_attendance(self, parent):
        pad = {"padx": 20, "pady": 6}
        ctk.CTkLabel(parent, text=f"Attendance Records — {self._child['name']}",
                     font=ctk.CTkFont("Segoe UI", 22, "bold"),
                     text_color=COLORS["text"]).pack(anchor="w", **pad)
        att_records = self._store.get_student_attendance(self._child["id"])
        stat_row = ctk.CTkFrame(parent, fg_color="transparent")
        stat_row.pack(fill="x", **pad)
        total_lectures = len(self._store.lectures)
        attended = len(att_records)
        rate = int((attended / max(total_lectures, 1)) * 100)
        for i, (l, v, s, ic, ac) in enumerate([
            ("Total Lectures", str(total_lectures), "This semester", "📚", "blue"),
            ("Attended", str(attended), "Classes present", "✅", "green"),
            ("Attendance Rate", f"{rate}%", f"{total_lectures - attended} absences", "📊", "purple"),
        ]):
            StatCard(stat_row, l, v, s, ic, ac).grid(
                row=0, column=i, padx=6, sticky="nsew")
            stat_row.grid_columnconfigure(i, weight=1)
        tbl_card = Card(parent, title="Detailed Attendance Log")
        tbl_card.pack(fill="both", expand=True, **pad)
        cols = [
            {"key": "lec",    "label": "Lecture", "width": 100},
            {"key": "course", "label": "Course",  "width": 200, "stretch": True},
            {"key": "date",   "label": "Date",    "width": 100},
            {"key": "time",   "label": "Time",    "width": 80},
            {"key": "method", "label": "Method",  "width": 140},
            {"key": "status", "label": "Status",  "width": 100},
        ]
        tbl = DataTable(tbl_card, cols)
        tbl.pack(fill="both", expand=True, padx=12, pady=(4, 12))
        rows = []
        for rec in att_records:
            lec = next((l for l in self._store.lectures if l["id"] == rec["lecture_id"]), None)
            rows.append((
                rec["lecture_id"],
                lec["name"] if lec else "Unknown",
                datetime.now().strftime("%Y-%m-%d"),
                rec.get("time", ""),
                rec.get("method", "manual"),
                "✅ Present"
            ))
        tbl.load(rows)

    # ══════════════════════════════════════════════════════
    #  EMOTIONS
    # ══════════════════════════════════════════════════════
    def _page_emotions(self, parent):
        pad = {"padx": 20, "pady": 6}
        ctk.CTkLabel(parent, text=f"Emotional Analysis — {self._child['name']}",
                     font=ctk.CTkFont("Segoe UI", 22, "bold"),
                     text_color=COLORS["text"]).pack(anchor="w", **pad)
        status_card = Card(parent, title="Current Status")
        status_card.pack(fill="x", **pad)
        inner = ctk.CTkFrame(status_card, fg_color="transparent")
        inner.pack(padx=20, pady=16)
        icon = EMOTION_ICONS.get(self._child["emotion"], "😊")
        ctk.CTkLabel(inner, text=icon,
                     font=ctk.CTkFont("Segoe UI", 64)).pack()
        ctk.CTkLabel(inner, text=self._child["emotion"].title(),
                     font=ctk.CTkFont("Segoe UI", 24, "bold"),
                     text_color=COLORS["text"]).pack(pady=(8, 4))
        ctk.CTkLabel(inner, text=f"Attention: {self._child['attention'].title()}",
                     font=ctk.CTkFont("Segoe UI", 14),
                     text_color=COLORS["text2"]).pack()
        mid = ctk.CTkFrame(parent, fg_color="transparent")
        mid.pack(fill="x", **pad)
        mid.grid_columnconfigure(0, weight=1)
        mid.grid_columnconfigure(1, weight=1)
        dist_c = Card(mid, title="Emotion Distribution (All Time)")
        dist_c.grid(row=0, column=0, padx=(0, 8), sticky="nsew")
        DonutChart(dist_c, data=[
            {"label": d["emotion"], "value": d["count"], "color": d["color"]}
            for d in self._store.emotion_dist[:6]
        ], size=180).pack(pady=(8, 12))
        trend_c = Card(mid, title="Engagement Over Time")
        trend_c.grid(row=0, column=1, sticky="nsew")
        trend = self._store.trend_data
        LineChart(trend_c, series=[
            {"label": "Engagement", "data": trend["engagement"], "color": COLORS["blue"]},
        ], labels=trend["labels"], height=180).pack(fill="x", padx=12, pady=(4, 12))

    # ══════════════════════════════════════════════════════
    #  PERFORMANCE
    # ══════════════════════════════════════════════════════
    def _page_performance(self, parent):
        pad = {"padx": 20, "pady": 6}
        ctk.CTkLabel(parent, text=f"Academic Performance — {self._child['name']}",
                     font=ctk.CTkFont("Segoe UI", 22, "bold"),
                     text_color=COLORS["text"]).pack(anchor="w", **pad)
        gpa_card = Card(parent, title="Grade Point Average")
        gpa_card.pack(fill="x", **pad)
        inner = ctk.CTkFrame(gpa_card, fg_color="transparent")
        inner.pack(padx=20, pady=20)
        ctk.CTkLabel(inner, text=str(self._child["gpa"]),
                     font=ctk.CTkFont("Segoe UI", 72, "bold"),
                     text_color=COLORS["blue2"]).pack()
        ctk.CTkLabel(inner, text="out of 4.0",
                     font=ctk.CTkFont("Segoe UI", 14),
                     text_color=COLORS["text2"]).pack()
        metrics = Card(parent, title="Performance Metrics")
        metrics.pack(fill="x", **pad)
        grid = ctk.CTkFrame(metrics, fg_color="transparent")
        grid.pack(padx=12, pady=12)
        for i, (label, value, color) in enumerate([
            ("Attendance", f"{self._child['attendance_rate']}%", COLORS["green"]),
            ("Engagement", f"{self._child['engagement']}%",      COLORS["blue"]),
            ("Attention",  f"{self._child['attention_score']}%", COLORS["purple"]),
        ]):
            cell = ctk.CTkFrame(grid, fg_color=COLORS["bg3"],
                                corner_radius=12, width=200, height=100)
            cell.grid(row=0, column=i, padx=8)
            cell.pack_propagate(False)
            ctk.CTkLabel(cell, text=label,
                         font=ctk.CTkFont("Segoe UI", 12),
                         text_color=COLORS["text2"]).pack(pady=(16, 4))
            ctk.CTkLabel(cell, text=value,
                         font=ctk.CTkFont("Segoe UI", 28, "bold"),
                         text_color=color).pack()

    # ══════════════════════════════════════════════════════
    #  SCHEDULE
    # ══════════════════════════════════════════════════════
    def _page_schedule(self, parent):
        pad = {"padx": 20, "pady": 6}
        ctk.CTkLabel(parent, text="Class Schedule",
                     font=ctk.CTkFont("Segoe UI", 22, "bold"),
                     text_color=COLORS["text"]).pack(anchor="w", **pad)
        schedule_card = Card(parent, title="This Week's Lectures")
        schedule_card.pack(fill="both", expand=True, **pad)
        for lec in self._store.lectures:
            row = ctk.CTkFrame(schedule_card, fg_color=COLORS["bg3"],
                               corner_radius=10, height=80)
            row.pack(fill="x", padx=12, pady=(0, 8))
            row.pack_propagate(False)
            tk.Frame(row, bg=lec["color"], width=6).pack(side="left", fill="y")
            content = ctk.CTkFrame(row, fg_color="transparent")
            content.pack(side="left", fill="both", expand=True, padx=16, pady=12)
            ctk.CTkLabel(content, text=lec["name"],
                         font=ctk.CTkFont("Segoe UI", 14, "bold"),
                         text_color=COLORS["text"]).pack(anchor="w")
            ctk.CTkLabel(content,
                         text=f"{lec['code']} · {lec['room']} · {lec['doctor']}",
                         font=ctk.CTkFont("Segoe UI", 11),
                         text_color=COLORS["text2"]).pack(anchor="w")
            time_frame = ctk.CTkFrame(row, fg_color="transparent")
            time_frame.pack(side="right", padx=16)
            ctk.CTkLabel(time_frame, text=lec["time"],
                         font=ctk.CTkFont("Segoe UI", 16, "bold"),
                         text_color=COLORS["text"]).pack()
            ctk.CTkLabel(time_frame, text=f"{lec['duration']} min",
                         font=ctk.CTkFont("Segoe UI", 10),
                         text_color=COLORS["text2"]).pack()