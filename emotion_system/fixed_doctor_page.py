"""
gui/pages/doctor_page.py
========================
Doctor Page — Students tab with photos + Manual Attendance
FIXED: Students now appear with photos, manual attendance marking works.
"""
import customtkinter as ctk
import tkinter as tk
from tkinter import ttk
import os, sys
from datetime import datetime
from PIL import Image, ImageTk, ImageDraw

from gui.theme      import COLORS, FONTS
from gui.components import Sidebar, TopBar, Separator

# ── photo helper (graceful if folder missing) ─────────────
PHOTOS_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "student_photos")

def _load_student_photo(student_id: str, size=(80, 80)):
    """Load student photo, return CTkImage or None."""
    for ext in ("jpg", "jpeg", "png"):
        path = os.path.join(PHOTOS_DIR, f"{student_id}.{ext}")
        if os.path.exists(path):
            try:
                img = Image.open(path).convert("RGB")
                img.thumbnail(size, Image.LANCZOS)
                # crop to square
                w, h = img.size
                m = min(w, h)
                img = img.crop(((w-m)//2, (h-m)//2, (w+m)//2, (h+m)//2))
                img = img.resize(size, Image.LANCZOS)
                return ImageTk.PhotoImage(img)
            except Exception:
                pass
    return None


def _make_avatar(emoji: str, color: str, size=80):
    """Fallback coloured circle avatar with emoji."""
    try:
        img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        draw = ImageDraw.Draw(img)
        draw.ellipse([0, 0, size, size], fill=color)
        return ImageTk.PhotoImage(img)
    except Exception:
        return None


# ══════════════════════════════════════════════════════════
#  DOCTOR PAGE
# ══════════════════════════════════════════════════════════
class DoctorPage(ctk.CTkFrame):

    NAV = [
        {"id": "dashboard",  "icon": "🏠", "label": "Dashboard"},
        {"id": "live",       "icon": "📷", "label": "Live Session", "live": True},
        {"id": "attendance", "icon": "✅", "label": "Attendance"},
        {"id": "lectures",   "icon": "📚", "label": "My Lectures"},
        {"id": "students",   "icon": "👥", "label": "Students"},
        {"id": "analytics",  "icon": "📊", "label": "Analytics"},
        {"id": "alerts",     "icon": "🔔", "label": "Alerts", "badge": 3},
    ]

    def __init__(self, parent, user: dict, logout_cb):
        super().__init__(parent, fg_color=COLORS["bg"], corner_radius=0)
        self.user      = user
        self.logout_cb = logout_cb
        self.store     = parent.store

        # resolve doctor record
        self.doctor = self.store.get_doctor(user.get("doctor_id", "")) or {}

        # layout
        self._sidebar = Sidebar(self, self.NAV, self._on_nav)
        self._sidebar.pack(side="left", fill="y")

        right = ctk.CTkFrame(self, fg_color=COLORS["bg2"], corner_radius=0)
        right.pack(side="left", fill="both", expand=True)

        self._topbar = TopBar(right, user, logout_cb)
        self._topbar.pack(fill="x")

        self._content = ctk.CTkFrame(right, fg_color=COLORS["bg2"], corner_radius=0)
        self._content.pack(fill="both", expand=True)

        # start on students tab (the one that was blank)
        self._on_nav("students")

    # ── navigation ───────────────────────────────────────
    def _on_nav(self, tab_id: str):
        for w in self._content.winfo_children():
            w.destroy()
        self._sidebar.set_active(tab_id)
        {
            "dashboard":  self._build_dashboard,
            "live":       self._build_live,
            "attendance": self._build_attendance,
            "lectures":   self._build_lectures,
            "students":   self._build_students,
            "analytics":  self._build_analytics,
            "alerts":     self._build_alerts,
        }.get(tab_id, self._build_students)(self._content)

    # ══════════════════════════════════════════════════════
    #  STUDENTS TAB  ← MAIN FIX
    # ══════════════════════════════════════════════════════
    def _build_students(self, parent):
        """Show all students with photos."""

        # ── header row ─────────────────────────────────
        hdr = ctk.CTkFrame(parent, fg_color="transparent")
        hdr.pack(fill="x", padx=24, pady=(20, 0))

        ctk.CTkLabel(hdr, text="👥  Students",
                     font=ctk.CTkFont("Segoe UI", 22, "bold"),
                     text_color=COLORS["text"]).pack(side="left")

        # search box
        self._search_var = tk.StringVar()
        self._search_var.trace_add("write", lambda *_: self._filter_students())
        search = ctk.CTkEntry(hdr, textvariable=self._search_var,
                              placeholder_text="🔍  Search students…",
                              width=260, height=36,
                              fg_color=COLORS["card"], border_color=COLORS["border"],
                              text_color=COLORS["text"])
        search.pack(side="right")

        # count label
        total = len(self.store.students)
        ctk.CTkLabel(hdr, text=f"{total} students",
                     font=ctk.CTkFont("Segoe UI", 12),
                     text_color=COLORS["text2"]).pack(side="right", padx=16)

        Separator(parent, COLORS["border"]).pack(fill="x", padx=24, pady=10)

        # ── scrollable grid ────────────────────────────
        self._students_scroll = ctk.CTkScrollableFrame(
            parent, fg_color="transparent", corner_radius=0)
        self._students_scroll.configure(scrollbar_button_color=COLORS["border2"])
        self._students_scroll.pack(fill="both", expand=True, padx=16, pady=(0, 16))

        self._student_cards = []
        self._render_student_cards(self.store.students)

    def _render_student_cards(self, students):
        """Render student cards in a responsive grid."""
        frame = self._students_scroll

        # clear old cards
        for w in frame.winfo_children():
            w.destroy()
        self._student_cards.clear()

        if not students:
            ctk.CTkLabel(frame, text="No students found",
                         font=ctk.CTkFont("Segoe UI", 15),
                         text_color=COLORS["text3"]).pack(pady=60)
            return

        COLS = 4
        for i, student in enumerate(students):
            row, col = divmod(i, COLS)
            card = self._make_student_card(frame, student)
            card.grid(row=row, column=col, padx=8, pady=8, sticky="nsew")
            frame.grid_columnconfigure(col, weight=1)
            self._student_cards.append(card)

    def _make_student_card(self, parent, student: dict) -> ctk.CTkFrame:
        """Create a single student card with photo."""
        sid   = student.get("id", "")
        name  = student.get("name", "Unknown")
        dept  = student.get("dept", "")
        year  = student.get("year", "")
        emoji = student.get("emoji", "👤")
        color = student.get("color", COLORS["blue"])
        email = student.get("email", "")
        present = student.get("present", False)
        att_rate = student.get("attendance_rate", 0)

        card = ctk.CTkFrame(parent, fg_color=COLORS["card"],
                            corner_radius=14, border_width=1,
                            border_color=COLORS["border"])

        # ── photo / avatar ─────────────────────────────
        photo_frame = ctk.CTkFrame(card, fg_color=COLORS["card2"],
                                   corner_radius=10, width=120, height=120)
        photo_frame.pack(padx=12, pady=(14, 8))
        photo_frame.pack_propagate(False)

        photo_img = _load_student_photo(sid, (100, 100))

        if photo_img:
            photo_lbl = ctk.CTkLabel(photo_frame, image=photo_img, text="")
            photo_lbl.image = photo_img  # keep reference
            photo_lbl.place(relx=0.5, rely=0.5, anchor="center")
        else:
            # emoji avatar
            ctk.CTkLabel(photo_frame, text=emoji,
                         font=ctk.CTkFont("Segoe UI", 38),
                         fg_color=color, corner_radius=10,
                         width=100, height=100).place(
                relx=0.5, rely=0.5, anchor="center")

        # present dot
        dot_color = COLORS["green"] if present else COLORS["text3"]
        ctk.CTkLabel(card, text="●",
                     font=ctk.CTkFont("Segoe UI", 10),
                     text_color=dot_color).pack()

        # ── info ────────────────────────────────────────
        ctk.CTkLabel(card, text=name,
                     font=ctk.CTkFont("Segoe UI", 12, "bold"),
                     text_color=COLORS["text"],
                     wraplength=160).pack(padx=10)

        ctk.CTkLabel(card, text=f"{dept} · Year {year}",
                     font=ctk.CTkFont("Segoe UI", 10),
                     text_color=COLORS["text2"]).pack()

        ctk.CTkLabel(card, text=f"ID: {sid}",
                     font=ctk.CTkFont("Segoe UI", 10),
                     text_color=COLORS["text3"]).pack()

        # attendance rate bar
        bar_frame = ctk.CTkFrame(card, fg_color=COLORS["bg3"],
                                 corner_radius=4, height=6, width=140)
        bar_frame.pack(padx=14, pady=(6, 2))
        bar_frame.pack_propagate(False)
        if att_rate > 0:
            bar_color = COLORS["green"] if att_rate >= 75 else COLORS["amber"] if att_rate >= 50 else COLORS["red"]
            fill_w = max(4, int(140 * att_rate / 100))
            fill = ctk.CTkFrame(bar_frame, fg_color=bar_color,
                                corner_radius=4, height=6, width=fill_w)
            fill.place(x=0, y=0)

        ctk.CTkLabel(card, text=f"Attendance: {att_rate}%",
                     font=ctk.CTkFont("Segoe UI", 10),
                     text_color=COLORS["text3"]).pack(pady=(0, 6))

        # mark attendance button
        btn = ctk.CTkButton(
            card, text="Mark Attendance",
            font=ctk.CTkFont("Segoe UI", 11, "bold"),
            fg_color=COLORS["blue_dim"], hover_color=COLORS["blue3"],
            text_color=COLORS["text"],
            height=32, corner_radius=8,
            command=lambda s=student: self._open_attendance_modal(s))
        btn.pack(fill="x", padx=12, pady=(4, 12))

        return card

    def _filter_students(self):
        """Filter students by search query."""
        query = self._search_var.get().lower().strip()
        if not query:
            filtered = self.store.students
        else:
            filtered = [s for s in self.store.students
                        if query in s.get("name", "").lower()
                        or query in s.get("id", "").lower()
                        or query in s.get("dept", "").lower()
                        or query in s.get("email", "").lower()]
        self._render_student_cards(filtered)

    # ══════════════════════════════════════════════════════
    #  ATTENDANCE MODAL
    # ══════════════════════════════════════════════════════
    def _open_attendance_modal(self, student: dict):
        """Pop-up modal for marking a student's attendance."""
        modal = ctk.CTkToplevel(self)
        modal.title("Mark Attendance")
        modal.geometry("460x560")
        modal.resizable(False, False)
        modal.grab_set()
        modal.configure(fg_color=COLORS["bg2"])

        # ── header ──
        hdr = ctk.CTkFrame(modal, fg_color=COLORS["blue_dim"], corner_radius=0)
        hdr.pack(fill="x")
        ctk.CTkLabel(hdr, text="✅  Mark Attendance",
                     font=ctk.CTkFont("Segoe UI", 16, "bold"),
                     text_color="white").pack(padx=20, pady=14)

        # ── student photo ──
        photo_frame = ctk.CTkFrame(modal, fg_color=COLORS["card"],
                                   corner_radius=12, width=140, height=140)
        photo_frame.pack(pady=(20, 8))
        photo_frame.pack_propagate(False)

        sid   = student.get("id", "")
        name  = student.get("name", "Unknown")
        dept  = student.get("dept", "")
        year  = student.get("year", "")
        emoji = student.get("emoji", "👤")
        color = student.get("color", COLORS["blue"])

        photo_img = _load_student_photo(sid, (120, 120))
        if photo_img:
            lbl = ctk.CTkLabel(photo_frame, image=photo_img, text="")
            lbl.image = photo_img
            lbl.place(relx=0.5, rely=0.5, anchor="center")
        else:
            ctk.CTkLabel(photo_frame, text=emoji,
                         font=ctk.CTkFont("Segoe UI", 52),
                         fg_color=color, corner_radius=12,
                         width=140, height=140).place(
                relx=0.5, rely=0.5, anchor="center")

        # ── student info ──
        ctk.CTkLabel(modal, text=name,
                     font=ctk.CTkFont("Segoe UI", 16, "bold"),
                     text_color=COLORS["text"]).pack(pady=(4, 2))
        ctk.CTkLabel(modal, text=f"{dept}  ·  Year {year}  ·  {sid}",
                     font=ctk.CTkFont("Segoe UI", 11),
                     text_color=COLORS["text2"]).pack()

        Separator(modal, COLORS["border"]).pack(fill="x", padx=24, pady=14)

        # ── course selector ──
        doctor_id = self.user.get("doctor_id", "")
        courses   = self.store.get_doctor_courses(doctor_id)

        if not courses:
            ctk.CTkLabel(modal, text="No courses assigned to you.",
                         text_color=COLORS["text3"]).pack(pady=10)
        else:
            ctk.CTkLabel(modal, text="Select Course:",
                         font=ctk.CTkFont("Segoe UI", 12, "bold"),
                         text_color=COLORS["text2"]).pack(anchor="w", padx=24)

            course_names = [f"{c['name']} ({c['code']})" for c in courses]
            course_var   = ctk.StringVar(value=course_names[0])
            ctk.CTkComboBox(modal, values=course_names,
                            variable=course_var,
                            fg_color=COLORS["card"],
                            border_color=COLORS["border"],
                            button_color=COLORS["blue_dim"],
                            text_color=COLORS["text"],
                            width=380, height=38).pack(padx=24, pady=(4, 16))

            # ── week selector ──
            ctk.CTkLabel(modal, text="Week:",
                         font=ctk.CTkFont("Segoe UI", 12, "bold"),
                         text_color=COLORS["text2"]).pack(anchor="w", padx=24)

            week_var = ctk.StringVar(value=str(self.store.current_week))
            ctk.CTkComboBox(modal,
                            values=[str(w) for w in range(1, 17)],
                            variable=week_var,
                            fg_color=COLORS["card"],
                            border_color=COLORS["border"],
                            button_color=COLORS["blue_dim"],
                            text_color=COLORS["text"],
                            width=380, height=38).pack(padx=24, pady=(4, 16))

            # ── status label ──
            status_lbl = ctk.CTkLabel(modal, text="",
                                      font=ctk.CTkFont("Segoe UI", 12),
                                      text_color=COLORS["green"])
            status_lbl.pack(pady=4)

            # ── buttons ──
            btn_row = ctk.CTkFrame(modal, fg_color="transparent")
            btn_row.pack(pady=10)

            def do_mark():
                idx  = course_names.index(course_var.get())
                cid  = courses[idx]["id"]
                week = int(week_var.get())
                ok   = self.store.mark_attendance(
                    cid, sid, confidence=1.0, method="manual", week=week)
                if ok:
                    status_lbl.configure(text=f"✅ {name} marked present — Week {week}",
                                         text_color=COLORS["green"])
                    # update card dot
                    for s in self.store.students:
                        if s["id"] == sid:
                            s["present"] = True
                            break
                else:
                    status_lbl.configure(
                        text=f"⚠️ Already marked present this week",
                        text_color=COLORS["amber"])

            ctk.CTkButton(btn_row, text="✅  Mark Present",
                          font=ctk.CTkFont("Segoe UI", 13, "bold"),
                          fg_color=COLORS["green"], hover_color="#059669",
                          text_color="white", width=160, height=42,
                          command=do_mark).pack(side="left", padx=8)

            ctk.CTkButton(btn_row, text="Close",
                          font=ctk.CTkFont("Segoe UI", 13),
                          fg_color=COLORS["card2"], hover_color=COLORS["border2"],
                          text_color=COLORS["text2"], width=100, height=42,
                          command=modal.destroy).pack(side="left", padx=8)

    # ══════════════════════════════════════════════════════
    #  ATTENDANCE TAB — full class list with bulk marking
    # ══════════════════════════════════════════════════════
    def _build_attendance(self, parent):
        """Bulk manual attendance for a full course/week."""

        ctk.CTkLabel(parent, text="✅  Manual Attendance",
                     font=ctk.CTkFont("Segoe UI", 22, "bold"),
                     text_color=COLORS["text"]).pack(anchor="w", padx=24, pady=(20, 0))

        # ── top controls ─────────────────────────────
        ctrl = ctk.CTkFrame(parent, fg_color=COLORS["card"],
                            corner_radius=12, border_width=1,
                            border_color=COLORS["border"])
        ctrl.pack(fill="x", padx=24, pady=14)

        doctor_id = self.user.get("doctor_id", "")
        courses   = self.store.get_doctor_courses(doctor_id)

        if not courses:
            ctk.CTkLabel(ctrl, text="No courses assigned.",
                         text_color=COLORS["text3"]).pack(pady=20)
            return

        row1 = ctk.CTkFrame(ctrl, fg_color="transparent")
        row1.pack(fill="x", padx=16, pady=14)

        # course
        ctk.CTkLabel(row1, text="Course:",
                     font=ctk.CTkFont("Segoe UI", 12, "bold"),
                     text_color=COLORS["text2"],
                     width=70).pack(side="left")
        course_names = [f"{c['name']} ({c['code']})" for c in courses]
        self._att_course_var = ctk.StringVar(value=course_names[0])
        ctk.CTkComboBox(row1, values=course_names,
                        variable=self._att_course_var,
                        fg_color=COLORS["bg3"],
                        border_color=COLORS["border"],
                        button_color=COLORS["blue_dim"],
                        text_color=COLORS["text"],
                        width=280, height=36,
                        command=lambda _: self._load_att_students()).pack(side="left", padx=8)

        # week
        ctk.CTkLabel(row1, text="Week:",
                     font=ctk.CTkFont("Segoe UI", 12, "bold"),
                     text_color=COLORS["text2"],
                     width=50).pack(side="left", padx=(16, 0))
        self._att_week_var = ctk.StringVar(value=str(self.store.current_week))
        ctk.CTkComboBox(row1, values=[str(w) for w in range(1, 17)],
                        variable=self._att_week_var,
                        fg_color=COLORS["bg3"],
                        border_color=COLORS["border"],
                        button_color=COLORS["blue_dim"],
                        text_color=COLORS["text"],
                        width=80, height=36,
                        command=lambda _: self._load_att_students()).pack(side="left", padx=8)

        ctk.CTkButton(row1, text="Load",
                      font=ctk.CTkFont("Segoe UI", 12),
                      fg_color=COLORS["blue_dim"], hover_color=COLORS["blue3"],
                      text_color=COLORS["text"],
                      width=80, height=36,
                      command=self._load_att_students).pack(side="left", padx=8)

        # save status
        self._att_status_lbl = ctk.CTkLabel(ctrl, text="",
                                             font=ctk.CTkFont("Segoe UI", 11),
                                             text_color=COLORS["green"])
        self._att_status_lbl.pack(pady=(0, 8))

        Separator(parent, COLORS["border"]).pack(fill="x", padx=24)

        # ── student list ──────────────────────────────
        self._att_scroll = ctk.CTkScrollableFrame(
            parent, fg_color="transparent", corner_radius=0)
        self._att_scroll.pack(fill="both", expand=True, padx=16, pady=8)

        # store reference to courses list
        self._att_courses = courses
        self._att_checks  = {}   # {student_id: BooleanVar}

        self._load_att_students()

    def _load_att_students(self):
        """Load students for selected course into attendance list."""
        for w in self._att_scroll.winfo_children():
            w.destroy()
        self._att_checks.clear()

        idx     = [f"{c['name']} ({c['code']})" for c in self._att_courses].index(
                      self._att_course_var.get())
        course  = self._att_courses[idx]
        week    = int(self._att_week_var.get())
        cid     = course["id"]

        students  = self.store.get_enrolled_students(cid)
        existing  = self.store.get_attendance(cid, week)   # already marked

        if not students:
            ctk.CTkLabel(self._att_scroll,
                         text="No students enrolled in this course.",
                         font=ctk.CTkFont("Segoe UI", 13),
                         text_color=COLORS["text3"]).pack(pady=40)
            return

        # ── header row ──
        hdr = ctk.CTkFrame(self._att_scroll, fg_color=COLORS["card2"],
                           corner_radius=10)
        hdr.pack(fill="x", padx=8, pady=(0, 4))
        for col, (txt, w_) in enumerate([
            ("#", 40), ("Photo", 70), ("Name", 220),
            ("ID", 80), ("Present", 80)]):
            ctk.CTkLabel(hdr, text=txt,
                         font=ctk.CTkFont("Segoe UI", 11, "bold"),
                         text_color=COLORS["text2"],
                         width=w_).grid(row=0, column=col, padx=6, pady=8)

        # ── bulk buttons ──
        bulk = ctk.CTkFrame(self._att_scroll, fg_color="transparent")
        bulk.pack(fill="x", padx=8, pady=4)
        ctk.CTkButton(bulk, text="✅ Select All",
                      font=ctk.CTkFont("Segoe UI", 11),
                      fg_color=COLORS["green_dim"], hover_color="#065f46",
                      text_color=COLORS["green2"],
                      width=120, height=30,
                      command=lambda: [v.set(True) for v in self._att_checks.values()]
                      ).pack(side="left", padx=4)
        ctk.CTkButton(bulk, text="❌ Clear All",
                      font=ctk.CTkFont("Segoe UI", 11),
                      fg_color=COLORS["red_dim"], hover_color="#7f1d1d",
                      text_color=COLORS["red2"],
                      width=120, height=30,
                      command=lambda: [v.set(False) for v in self._att_checks.values()]
                      ).pack(side="left", padx=4)
        ctk.CTkButton(bulk, text="💾 Save Attendance",
                      font=ctk.CTkFont("Segoe UI", 11, "bold"),
                      fg_color=COLORS["blue3"], hover_color="#1e40af",
                      text_color="white",
                      width=160, height=30,
                      command=lambda c=cid, wk=week: self._save_bulk_attendance(c, wk)
                      ).pack(side="right", padx=4)

        # ── student rows ──
        for i, student in enumerate(students):
            sid      = student.get("id", "")
            already  = sid in existing
            var      = tk.BooleanVar(value=already)
            self._att_checks[sid] = var

            row_color = COLORS["card"] if i % 2 == 0 else COLORS["card2"]
            row = ctk.CTkFrame(self._att_scroll, fg_color=row_color,
                               corner_radius=8)
            row.pack(fill="x", padx=8, pady=2)

            # number
            ctk.CTkLabel(row, text=str(i+1),
                         font=ctk.CTkFont("Segoe UI", 11),
                         text_color=COLORS["text3"],
                         width=40).grid(row=0, column=0, padx=6, pady=8)

            # mini photo
            photo_frame = ctk.CTkFrame(row, fg_color=COLORS["bg3"],
                                       corner_radius=6, width=48, height=48)
            photo_frame.grid(row=0, column=1, padx=6, pady=6)
            photo_frame.grid_propagate(False)

            thumb = _load_student_photo(sid, (44, 44))
            if thumb:
                lbl = ctk.CTkLabel(photo_frame, image=thumb, text="")
                lbl.image = thumb
                lbl.place(relx=0.5, rely=0.5, anchor="center")
            else:
                ctk.CTkLabel(photo_frame,
                             text=student.get("emoji", "👤"),
                             font=ctk.CTkFont("Segoe UI", 22),
                             fg_color=student.get("color", COLORS["blue"]),
                             corner_radius=6,
                             width=48, height=48).place(
                    relx=0.5, rely=0.5, anchor="center")

            # name
            ctk.CTkLabel(row, text=student.get("name", "Unknown"),
                         font=ctk.CTkFont("Segoe UI", 12, "bold"),
                         text_color=COLORS["text"],
                         anchor="w", width=220).grid(row=0, column=2, padx=6)

            # id
            ctk.CTkLabel(row, text=sid,
                         font=ctk.CTkFont("Segoe UI", 11),
                         text_color=COLORS["text2"],
                         width=80).grid(row=0, column=3, padx=6)

            # checkbox
            bg = COLORS["green_dim"] if already else COLORS["bg3"]
            chk = ctk.CTkCheckBox(row, text="Present",
                                   font=ctk.CTkFont("Segoe UI", 11),
                                   text_color=COLORS["text2"],
                                   fg_color=COLORS["green"],
                                   hover_color=COLORS["green2"],
                                   checkmark_color="white",
                                   variable=var,
                                   state="disabled" if already else "normal")
            chk.grid(row=0, column=4, padx=12)

    def _save_bulk_attendance(self, course_id: str, week: int):
        """Save all checked students as present."""
        saved = 0
        for sid, var in self._att_checks.items():
            if var.get():
                ok = self.store.mark_attendance(
                    course_id, sid, confidence=1.0, method="manual", week=week)
                if ok:
                    saved += 1

        self._att_status_lbl.configure(
            text=f"✅ Saved attendance for {saved} student(s) — Week {week}",
            text_color=COLORS["green"])
        # reload to reflect disabled state
        self._load_att_students()

    # ══════════════════════════════════════════════════════
    #  OTHER TABS (stub — keep your originals or expand)
    # ══════════════════════════════════════════════════════
    def _build_dashboard(self, parent):
        _stub(parent, "🏠", "Dashboard", COLORS["blue"])

    def _build_live(self, parent):
        _stub(parent, "📷", "Live Session", COLORS["cyan"])

    def _build_lectures(self, parent):
        _stub(parent, "📚", "My Lectures", COLORS["purple"])

    def _build_analytics(self, parent):
        _stub(parent, "📊", "Analytics", COLORS["amber"])

    def _build_alerts(self, parent):
        _stub(parent, "🔔", "Alerts", COLORS["red"])


# ── simple stub for tabs not yet implemented ─────────────
def _stub(parent, icon, label, color):
    ctk.CTkLabel(parent, text=f"{icon}  {label}",
                 font=ctk.CTkFont("Segoe UI", 28, "bold"),
                 text_color=color).pack(expand=True)
