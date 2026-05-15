"""
EduSense GUI Components  v3
Stunning professional design — works in both dark and light mode.
"""
import customtkinter as ctk
import tkinter as tk
from tkinter import ttk
import math
from gui.theme import COLORS, EMOTION_ICONS, toggle_mode, current_mode


# ══════════════════════════════════════════════════════════
#  SIDEBAR  — glass-morphism navy panel
# ══════════════════════════════════════════════════════════
class Sidebar(ctk.CTkFrame):
    W = 230

    def __init__(self, parent, nav_items: list, on_nav, **kw):
        super().__init__(parent,
                         fg_color=COLORS["sidebar"],
                         corner_radius=0,
                         width=self.W, **kw)
        self.pack_propagate(False)
        self._on_nav    = on_nav
        self._buttons   = {}
        self._active_id = None

        # ── Logo area ────────────────────────────────────
        logo = ctk.CTkFrame(self, fg_color="transparent", height=80)
        logo.pack(fill="x")
        logo.pack_propagate(False)

        ctk.CTkLabel(logo,
                     text="⚡ EduSense",
                     font=ctk.CTkFont("Segoe UI", 19, "bold"),
                     text_color=COLORS["blue2"]).place(x=20, y=22)
        ctk.CTkLabel(logo,
                     text="Emotion & Attendance AI",
                     font=ctk.CTkFont("Segoe UI", 9),
                     text_color=COLORS["text3"]).place(x=20, y=48)

        # thin accent line under logo
        ctk.CTkFrame(self, fg_color=COLORS["blue3"],
                     height=2, corner_radius=0).pack(fill="x")

        # ── Nav items ────────────────────────────────────
        scroll = ctk.CTkScrollableFrame(
            self, fg_color="transparent",
            scrollbar_button_color=COLORS["sidebar"],
            scrollbar_fg_color=COLORS["sidebar"])
        scroll.pack(fill="both", expand=True, padx=0, pady=8)

        for item in nav_items:
            if item.get("section"):
                lbl = ctk.CTkLabel(scroll,
                                   text=item["section"].upper(),
                                   font=ctk.CTkFont("Segoe UI", 9, "bold"),
                                   text_color=COLORS["text3"])
                lbl.pack(anchor="w", padx=18, pady=(14, 4))
                continue
            btn = _NavBtn(scroll, item, lambda i=item["id"]: self._click(i))
            btn.pack(fill="x", padx=8, pady=2)
            self._buttons[item["id"]] = btn

        first = next((i["id"] for i in nav_items if not i.get("section")), None)
        if first:
            self.set_active(first)

        # ── Bottom: version ──────────────────────────────
        ctk.CTkLabel(self,
                     text="v 3.0 · EduSense",
                     font=ctk.CTkFont("Segoe UI", 9),
                     text_color=COLORS["text3"]).pack(pady=12)

    def _click(self, iid):
        self.set_active(iid)
        self._on_nav(iid)

    def set_active(self, iid):
        if self._active_id and self._active_id in self._buttons:
            self._buttons[self._active_id].set_active(False)
        self._active_id = iid
        if iid in self._buttons:
            self._buttons[iid].set_active(True)


class _NavBtn(ctk.CTkFrame):
    def __init__(self, parent, item, command, **kw):
        super().__init__(parent, fg_color="transparent",
                         corner_radius=10, cursor="hand2", **kw)
        self._cmd    = command
        self._active = False

        # left accent bar
        self._bar = ctk.CTkFrame(self, fg_color="transparent",
                                  width=4, corner_radius=2)
        self._bar.pack(side="left", fill="y", padx=(4, 0), pady=6)

        inner = ctk.CTkFrame(self, fg_color="transparent")
        inner.pack(side="left", fill="both", expand=True)

        self._icon = ctk.CTkLabel(inner, text=item.get("icon", "•"),
                                   font=ctk.CTkFont("Segoe UI", 15),
                                   width=28, text_color=COLORS["text3"])
        self._icon.pack(side="left", padx=(8, 6), pady=11)

        self._lbl = ctk.CTkLabel(inner, text=item["label"],
                                  font=ctk.CTkFont("Segoe UI", 12),
                                  text_color=COLORS["text3"])
        self._lbl.pack(side="left", pady=11)

        if item.get("badge"):
            ctk.CTkLabel(inner, text=str(item["badge"]),
                         font=ctk.CTkFont("Segoe UI", 9, "bold"),
                         fg_color=COLORS["red"], text_color="white",
                         corner_radius=10, width=22, height=18
                         ).pack(side="right", padx=10)

        if item.get("live"):
            live = ctk.CTkLabel(inner, text="●",
                                 font=ctk.CTkFont("Segoe UI", 10),
                                 text_color=COLORS["red"])
            live.pack(side="right", padx=4)

        for w in [self, inner, self._icon, self._lbl]:
            w.bind("<Button-1>", lambda e: self._cmd())
            w.bind("<Enter>",    lambda e: self._hover(True))
            w.bind("<Leave>",    lambda e: self._hover(False))

    def set_active(self, on: bool):
        self._active = on
        if on:
            self.configure(fg_color=COLORS["blue_dim"])
            self._bar.configure(fg_color=COLORS["blue2"])
            self._lbl.configure(text_color=COLORS["blue2"],
                                 font=ctk.CTkFont("Segoe UI", 12, "bold"))
            self._icon.configure(text_color=COLORS["blue2"])
        else:
            self.configure(fg_color="transparent")
            self._bar.configure(fg_color="transparent")
            self._lbl.configure(text_color=COLORS["text3"],
                                 font=ctk.CTkFont("Segoe UI", 12))
            self._icon.configure(text_color=COLORS["text3"])

    def _hover(self, on):
        if not self._active:
            self.configure(fg_color=COLORS["hover"] if on else "transparent")


# ══════════════════════════════════════════════════════════
#  TOPBAR  — with working dark/light toggle
# ══════════════════════════════════════════════════════════
class Topbar(ctk.CTkFrame):
    ROLE_COLORS = {
        "doctor": "#8b5cf6", "admin": "#10b981",
        "student": "#3b82f6", "parent": "#f59e0b",
    }

    def __init__(self, parent, user: dict, on_logout, **kw):
        super().__init__(parent,
                         fg_color=COLORS["card"],
                         corner_radius=0, height=64, **kw)
        self.pack_propagate(False)
        self.configure(border_width=0)

        # ── Left: breadcrumb ────────────────────────────
        left = ctk.CTkFrame(self, fg_color="transparent")
        left.pack(side="left", fill="y", padx=24)

        self.page_label = ctk.CTkLabel(
            left, text="Dashboard",
            font=ctk.CTkFont("Segoe UI", 15, "bold"),
            text_color=COLORS["text"])
        self.page_label.pack(side="left", pady=22)

        # ── Right controls ───────────────────────────────
        right = ctk.CTkFrame(self, fg_color="transparent")
        right.pack(side="right", fill="y", padx=16)

        # Mode toggle button
        self._mode_icon = "☀️" if current_mode() == "dark" else "🌙"
        self._mode_btn = ctk.CTkButton(
            right,
            text=f"{self._mode_icon}  {'Light' if current_mode()=='dark' else 'Dark'}",
            width=100, height=34,
            font=ctk.CTkFont("Segoe UI", 11, "bold"),
            fg_color=COLORS["bg3"],
            hover_color=COLORS["hover"],
            text_color=COLORS["text2"],
            border_width=1,
            border_color=COLORS["border"],
            corner_radius=20,
            command=self._do_toggle)
        self._mode_btn.pack(side="left", padx=(0, 12), pady=15)

        # Divider
        Separator(right, COLORS["border"], vertical=True).pack(
            side="left", fill="y", pady=14)

        # Avatar
        av_color = self.ROLE_COLORS.get(user.get("role", ""), "#3b82f6")
        initials = user.get("initials", user.get("name", "??")[:2]).upper()

        av = ctk.CTkLabel(right, text=initials,
                           font=ctk.CTkFont("Segoe UI", 13, "bold"),
                           fg_color=av_color,
                           text_color="white",
                           corner_radius=20,
                           width=38, height=38)
        av.pack(side="left", padx=(12, 8))

        # Name + role
        info = ctk.CTkFrame(right, fg_color="transparent")
        info.pack(side="left", padx=(0, 16))
        ctk.CTkLabel(info, text=user.get("name", "User"),
                     font=ctk.CTkFont("Segoe UI", 12, "bold"),
                     text_color=COLORS["text"]).pack(anchor="w")
        ctk.CTkLabel(info, text=user.get("role", "").title(),
                     font=ctk.CTkFont("Segoe UI", 10),
                     text_color=COLORS["text3"]).pack(anchor="w")

        # Sign out
        ctk.CTkButton(
            right, text="Sign Out", width=86, height=34,
            font=ctk.CTkFont("Segoe UI", 11),
            fg_color=COLORS["red_dim"],
            hover_color=COLORS["red"],
            text_color=COLORS["red2"],
            border_width=1,
            border_color=COLORS["red"],
            corner_radius=8,
            command=on_logout).pack(side="left")

        # Bottom border
        Separator(self, COLORS["border"]).pack(side="bottom", fill="x")

    def _do_toggle(self):
        toggle_mode()   # this calls _REBUILD_CB → app._rebuild → page rebuilt


# ══════════════════════════════════════════════════════════
#  STAT CARD  — large number + coloured accent
# ══════════════════════════════════════════════════════════
class StatCard(ctk.CTkFrame):
    _ACCENTS = {
        "blue":   ("#3b82f6", "#06b6d4"),
        "green":  ("#10b981", "#34d399"),
        "amber":  ("#f59e0b", "#ef4444"),
        "purple": ("#8b5cf6", "#ec4899"),
        "red":    ("#ef4444", "#f97316"),
        "cyan":   ("#06b6d4", "#3b82f6"),
    }

    def __init__(self, parent, label, value, sub="", icon="",
                 accent="blue", **kw):
        c1, c2 = self._ACCENTS.get(accent, self._ACCENTS["blue"])
        super().__init__(parent,
                         fg_color=COLORS["card"],
                         corner_radius=16,
                         border_width=1,
                         border_color=COLORS["border"], **kw)

        # Top accent bar
        bar = ctk.CTkFrame(self, fg_color=c1, height=4, corner_radius=0)
        bar.pack(fill="x")
        # rounded left corner
        ctk.CTkFrame(bar, fg_color=c2, height=4, width=80,
                     corner_radius=0).place(x=0, y=0)

        body = ctk.CTkFrame(self, fg_color="transparent")
        body.pack(fill="both", expand=True, padx=20, pady=16)

        # Icon bubble — use safe dim colors from COLORS dict
        _DIM_MAP = {
            "blue": "blue_dim", "green": "green_dim",
            "amber": "amber_dim", "red": "red_dim",
            "purple": "purple_dim", "cyan": "blue_dim",
        }
        if icon:
            ib_color = COLORS.get(_DIM_MAP.get(accent, "bg3"), COLORS["bg3"])
            ib = ctk.CTkFrame(body, fg_color=ib_color,
                               corner_radius=10, width=40, height=40)
            ib.pack(anchor="w")
            ib.pack_propagate(False)
            ctk.CTkLabel(ib, text=icon,
                         font=ctk.CTkFont("Segoe UI", 20)).place(
                relx=0.5, rely=0.5, anchor="center")

        # Label
        ctk.CTkLabel(body, text=label,
                     font=ctk.CTkFont("Segoe UI", 11),
                     text_color=COLORS["text3"]).pack(anchor="w",
                                                       pady=(6 if icon else 0, 2))

        # Value
        ctk.CTkLabel(body, text=str(value),
                     font=ctk.CTkFont("Segoe UI", 32, "bold"),
                     text_color=c1).pack(anchor="w")

        # Sub
        if sub:
            ctk.CTkLabel(body, text=sub,
                         font=ctk.CTkFont("Segoe UI", 11),
                         text_color=COLORS["text3"]).pack(anchor="w",
                                                           pady=(2, 0))


# ══════════════════════════════════════════════════════════
#  CARD  — content container with optional title
# ══════════════════════════════════════════════════════════
class Card(ctk.CTkFrame):
    def __init__(self, parent, title="", accent_color=None, **kw):
        super().__init__(parent,
                         fg_color=COLORS["card"],
                         corner_radius=16,
                         border_width=1,
                         border_color=COLORS["border"], **kw)
        if title:
            hdr = ctk.CTkFrame(self, fg_color="transparent")
            hdr.pack(fill="x", padx=18, pady=(16, 0))
            if accent_color:
                ctk.CTkFrame(hdr, fg_color=accent_color,
                             width=4, corner_radius=2
                             ).pack(side="left", fill="y", padx=(0, 10))
            ctk.CTkLabel(hdr, text=title,
                         font=ctk.CTkFont("Segoe UI", 13, "bold"),
                         text_color=COLORS["text"]).pack(side="left")


# ══════════════════════════════════════════════════════════
#  BADGE
# ══════════════════════════════════════════════════════════
class Badge(ctk.CTkLabel):
    _P = {
        "green":  ("#052e1a", "#34d399"),
        "red":    ("#2d0808", "#f87171"),
        "amber":  ("#2d1a00", "#fbbf24"),
        "blue":   ("#172a50", "#60a5fa"),
        "purple": ("#1e0d3d", "#a78bfa"),
        "gray":   ("#1e293b", "#94a3b8"),
    }

    def __init__(self, parent, text, color="blue", **kw):
        bg, fg = self._P.get(color, self._P["blue"])
        super().__init__(parent, text=f"  {text}  ",
                         font=ctk.CTkFont("Segoe UI", 10, "bold"),
                         fg_color=bg, text_color=fg,
                         corner_radius=12, padx=4, pady=2, **kw)


# ══════════════════════════════════════════════════════════
#  SEPARATOR
# ══════════════════════════════════════════════════════════
class Separator(tk.Canvas):
    def __init__(self, parent, color=None, vertical=False, **kw):
        c = color or COLORS["border"]
        if vertical:
            super().__init__(parent, width=1, bd=0,
                             highlightthickness=0, bg=c, **kw)
        else:
            super().__init__(parent, height=1, bd=0,
                             highlightthickness=0, bg=c, **kw)


# ══════════════════════════════════════════════════════════
#  DATA TABLE
# ══════════════════════════════════════════════════════════
class DataTable(ctk.CTkFrame):
    def __init__(self, parent, columns: list, **kw):
        super().__init__(parent, fg_color=COLORS["bg3"],
                         corner_radius=12, **kw)
        style = ttk.Style()
        style.theme_use("default")
        bg = COLORS["bg3"]; card = COLORS["card2"]
        txt = COLORS["text"]; txt2 = COLORS["text2"]
        style.configure("ES.Treeview",
                         background=bg, foreground=txt,
                         fieldbackground=bg, rowheight=42,
                         borderwidth=0, font=("Segoe UI", 11))
        style.configure("ES.Treeview.Heading",
                         background=card, foreground=txt2,
                         relief="flat", font=("Segoe UI", 10, "bold"))
        style.map("ES.Treeview",
                  background=[("selected", COLORS["blue_dim"])],
                  foreground=[("selected", COLORS["blue2"])])
        style.layout("ES.Treeview",
                     [("ES.Treeview.treearea", {"sticky": "nswe"})])

        self._tree = ttk.Treeview(
            self, columns=[c["key"] for c in columns],
            show="headings", style="ES.Treeview")

        for col in columns:
            self._tree.heading(col["key"], text=col["label"])
            self._tree.column(col["key"],
                              width=col.get("width", 120),
                              anchor=col.get("anchor", "w"),
                              stretch=col.get("stretch", True))

        vsb = ctk.CTkScrollbar(self, command=self._tree.yview,
                                fg_color=COLORS["bg3"],
                                button_color=COLORS["border2"])
        self._tree.configure(yscrollcommand=vsb.set)
        self._tree.pack(side="left", fill="both", expand=True,
                        padx=(2, 0), pady=2)
        vsb.pack(side="right", fill="y", pady=2)

        self._tree.tag_configure("even", background=COLORS["bg3"])
        self._tree.tag_configure("odd",  background=COLORS["card"])

    def load(self, rows):
        self._tree.delete(*self._tree.get_children())
        for i, r in enumerate(rows):
            self._tree.insert("", "end", values=r,
                              tags=("even" if i % 2 == 0 else "odd",))

    def bind_select(self, cb):
        self._tree.bind("<<TreeviewSelect>>", cb)


# ══════════════════════════════════════════════════════════
#  BAR CHART
# ══════════════════════════════════════════════════════════
class BarChart(tk.Canvas):
    def __init__(self, parent, data: list, height=180, **kw):
        super().__init__(parent, height=height, bd=0,
                         highlightthickness=0,
                         bg=COLORS["card"], **kw)
        self._data = data; self._h = height
        self.bind("<Configure>", self._draw)

    def update_data(self, data):
        self._data = data; self._draw()

    def _draw(self, event=None):
        self.delete("all")
        if not self._data: return
        W = self.winfo_width(); H = self._h
        if W < 10: return
        pl, pr, pt, pb = 14, 14, 20, 38
        cw = W - pl - pr; ch = H - pt - pb
        mx = max(d["value"] for d in self._data) or 1
        n  = len(self._data)
        gap = max(4, cw // (n * 5))
        bw  = max(8, (cw - gap * (n-1)) // n)

        for i, d in enumerate(self._data):
            x0 = pl + i * (bw + gap)
            bh = int(d["value"] / mx * ch)
            y0 = pt + ch - bh; y1 = pt + ch
            self.create_rectangle(x0+2, y0+3, x0+bw+2, y1+3,
                                   fill=COLORS["bg3"], outline="")
            self.create_rectangle(x0, y0, x0+bw, y1,
                                   fill=d["color"], outline="")
            self.create_oval(x0, y0-4, x0+bw, y0+4,
                              fill=d["color"], outline="")
            self.create_text(x0+bw//2, y0-8,
                              text=str(int(d["value"])),
                              fill=COLORS["text2"],
                              font=("Segoe UI", 8, "bold"), anchor="s")
            lbl = d["label"][:7]+"…" if len(d["label"])>8 else d["label"]
            self.create_text(x0+bw//2, H-10,
                              text=lbl, fill=COLORS["text3"],
                              font=("Segoe UI", 8))


# ══════════════════════════════════════════════════════════
#  LINE CHART
# ══════════════════════════════════════════════════════════
class LineChart(tk.Canvas):
    def __init__(self, parent, series, labels, height=180, y_max=100, **kw):
        super().__init__(parent, height=height, bd=0,
                         highlightthickness=0,
                         bg=COLORS["card"], **kw)
        self._s = series; self._l = labels
        self._h = height; self._ym = y_max
        self.bind("<Configure>", self._draw)

    def update(self, series, labels):
        self._s = series; self._l = labels; self._draw()

    def _draw(self, event=None):
        self.delete("all")
        W = self.winfo_width(); H = self._h
        if W < 10 or not self._s: return
        pl, pr, pt, pb = 44, 16, 20, 36
        cw = W - pl - pr; ch = H - pt - pb
        n  = len(self._l)
        if n < 2: return
        for i in range(5):
            y = pt + int(ch * i / 4)
            self.create_line(pl, y, W-pr, y,
                              fill=COLORS["border"], dash=(3, 6))
            self.create_text(pl-6, y,
                              text=str(int(self._ym*(1-i/4))),
                              fill=COLORS["text3"],
                              font=("Segoe UI", 8), anchor="e")
        for i, lbl in enumerate(self._l):
            x = pl + int(i/(n-1)*cw)
            self.create_text(x, H-10, text=lbl,
                              fill=COLORS["text3"], font=("Segoe UI", 8))
        for s in self._s:
            pts = []
            for i, v in enumerate(s["data"][:n]):
                x = pl + int(i/(n-1)*cw)
                y = pt + int((1 - v/self._ym)*ch)
                pts.append((x, y))
            if len(pts) >= 2:
                poly = [pl, pt+ch]
                for x,y in pts: poly += [x, y]
                poly += [pts[-1][0], pt+ch]
                self.create_polygon(poly, fill=s["color"],
                                     outline="", smooth=True)
                for i in range(len(pts)-1):
                    self.create_line(pts[i][0], pts[i][1],
                                      pts[i+1][0], pts[i+1][1],
                                      fill=s["color"], width=2.5, smooth=True)
            for x,y in pts:
                self.create_oval(x-4, y-4, x+4, y+4,
                                  fill=s["color"],
                                  outline=COLORS["card"], width=2)
        lx = pl
        for s in self._s:
            self.create_rectangle(lx, 5, lx+14, 12,
                                   fill=s["color"], outline="")
            self.create_text(lx+18, 8, text=s["label"],
                              fill=COLORS["text2"],
                              font=("Segoe UI", 8), anchor="w")
            lx += len(s["label"])*6 + 30


# ══════════════════════════════════════════════════════════
#  DONUT CHART
# ══════════════════════════════════════════════════════════
class DonutChart(tk.Canvas):
    def __init__(self, parent, data, size=180, **kw):
        super().__init__(parent, width=size, height=size,
                         bd=0, highlightthickness=0,
                         bg=COLORS["card"], **kw)
        self._data = data; self._sz = size
        self.bind("<Configure>", self._draw)
        self.after(60, self._draw)

    def update_data(self, data):
        self._data = data; self._draw()

    def _draw(self, event=None):
        self.delete("all")
        if not self._data: return
        S = self._sz; m = 14
        total = sum(d["value"] for d in self._data) or 1
        start = -90.0
        for d in self._data:
            ext = d["value"]/total*360
            self.create_arc(m, m, S-m, S-m,
                             start=start, extent=ext,
                             fill=d["color"],
                             outline=COLORS["card"], width=3,
                             style=tk.ARC)
            im = m+32
            self.create_arc(im, im, S-im, S-im,
                             start=start, extent=ext,
                             fill=COLORS["card"], outline="",
                             style=tk.PIE)
            start += ext
        im = m+32
        self.create_oval(im, im, S-im, S-im,
                          fill=COLORS["card"], outline="")


# ══════════════════════════════════════════════════════════
#  ATTENTION RING
# ══════════════════════════════════════════════════════════
class AttentionRing(tk.Canvas):
    def __init__(self, parent, value=0, size=130, color=None, **kw):
        super().__init__(parent, width=size, height=size,
                         bd=0, highlightthickness=0,
                         bg=COLORS["card"], **kw)
        self._sz = size; self._val = value
        self._col = color or COLORS["blue"]
        self.after(60, self._draw)

    def set_value(self, v):
        self._val = v; self._draw()

    def _draw(self, event=None):
        self.delete("all")
        S = self._sz; m = 14
        ext = self._val/100*270
        self.create_arc(m, m, S-m, S-m,
                         start=135, extent=270,
                         outline=COLORS["bg3"], width=14, style=tk.ARC)
        if ext > 0:
            self.create_arc(m, m, S-m, S-m,
                             start=135, extent=ext,
                             outline=self._col, width=14, style=tk.ARC)
        cx, cy = S//2, S//2
        self.create_text(cx, cy-6,
                          text=f"{int(self._val)}%",
                          fill=COLORS["text"],
                          font=("Segoe UI", 16, "bold"))
        self.create_text(cx, cy+12, text="attention",
                          fill=COLORS["text2"], font=("Segoe UI", 9))


# ══════════════════════════════════════════════════════════
#  STUDENT FACE CARD
# ══════════════════════════════════════════════════════════
class StudentFaceCard(ctk.CTkFrame):
    _SC = {"attentive": "#10b981","moderate": "#f59e0b",
           "distracted": "#ef4444","absent": "#475569"}

    def __init__(self, parent, student, on_click=None, **kw):
        sc = self._SC.get(student.get("attention","moderate"), COLORS["border"])
        super().__init__(parent, fg_color=COLORS["card2"],
                         corner_radius=14, border_width=2,
                         border_color=sc, width=112, **kw)
        self.pack_propagate(False)
        s = student
        body = ctk.CTkFrame(self, fg_color="transparent")
        body.pack(padx=8, pady=10)

        av = ctk.CTkFrame(body, fg_color=s.get("color","#3b82f6"),
                           width=52, height=52, corner_radius=26)
        av.pack(); av.pack_propagate(False)
        ctk.CTkLabel(av, text=s.get("emoji","👤"),
                     font=ctk.CTkFont("Segoe UI", 26)).pack(expand=True)

        dot = tk.Canvas(body, width=14, height=14,
                        bd=0, highlightthickness=0, bg=COLORS["card2"])
        dot.create_oval(0,0,14,14, fill=sc,
                        outline="white", width=2)
        dot.place(in_=av, relx=0.7, rely=0.7)

        ctk.CTkLabel(body, text=s["name"].split()[0][:9],
                     font=ctk.CTkFont("Segoe UI", 10, "bold"),
                     text_color=COLORS["text"]).pack()

        emo = s.get("emotion","neutral")
        ctk.CTkLabel(body,
                     text=f"{EMOTION_ICONS.get(emo,'😐')} {emo}",
                     font=ctk.CTkFont("Segoe UI", 9),
                     text_color=COLORS["text2"]).pack()

        bg = ctk.CTkFrame(body, fg_color=COLORS["bg3"],
                           height=5, corner_radius=5, width=80)
        bg.pack(pady=(4, 0)); bg.pack_propagate(False)
        eng = s.get("engagement", 50)
        col = "#10b981" if eng>65 else "#f59e0b" if eng>40 else "#ef4444"
        ctk.CTkFrame(bg, fg_color=col, height=5, corner_radius=5,
                     width=int(80*eng/100)).place(x=0, y=0)

        if on_click:
            for w in [self, body, av]:
                w.bind("<Button-1>", lambda e, sid=s["id"]: on_click(sid))
                w.configure(cursor="hand2")


# ══════════════════════════════════════════════════════════
#  ALERT ITEM
# ══════════════════════════════════════════════════════════
class AlertItem(ctk.CTkFrame):
    _TC = {"critical": "#ef4444","warning": "#f59e0b","info": "#3b82f6"}

    def __init__(self, parent, alert, **kw):
        color = self._TC.get(alert.get("type","info"), "#3b82f6")
        super().__init__(parent, fg_color=COLORS["card"],
                         corner_radius=12, border_width=1,
                         border_color=color, **kw)
        # left accent bar
        ctk.CTkFrame(self, fg_color=color, width=5,
                     corner_radius=0).place(x=0, y=0, relheight=1)
        row = ctk.CTkFrame(self, fg_color="transparent")
        row.pack(fill="x", padx=(16, 12), pady=12)
        icon = {"critical":"🚨","warning":"⚠️","info":"ℹ️"
                }.get(alert.get("type","info"), "ℹ️")
        ctk.CTkLabel(row, text=icon,
                     font=ctk.CTkFont("Segoe UI", 16)).pack(side="left", padx=(0,10))
        mf = ctk.CTkFrame(row, fg_color="transparent")
        mf.pack(side="left", fill="x", expand=True)
        ctk.CTkLabel(mf, text=alert.get("msg",""),
                     font=ctk.CTkFont("Segoe UI", 11),
                     text_color=COLORS["text"],
                     wraplength=460, justify="left").pack(anchor="w")
        ctk.CTkLabel(mf, text=alert.get("time",""),
                     font=ctk.CTkFont("Segoe UI", 10),
                     text_color=COLORS["text3"]).pack(anchor="w")


# ══════════════════════════════════════════════════════════
#  SCHEDULE ITEM
# ══════════════════════════════════════════════════════════
class ScheduleItem(ctk.CTkFrame):
    def __init__(self, parent, lecture, on_click=None, **kw):
        super().__init__(parent, fg_color=COLORS["card2"],
                         corner_radius=12, **kw)
        acc = tk.Frame(self, bg=lecture.get("color", COLORS["blue"]), width=5)
        acc.pack(side="left", fill="y")
        body = ctk.CTkFrame(self, fg_color="transparent")
        body.pack(side="left", fill="both", expand=True, padx=14, pady=12)
        ctk.CTkLabel(body,
                     text=f"{lecture['time']}  ·  {lecture['duration']} min",
                     font=ctk.CTkFont("Segoe UI", 10),
                     text_color=COLORS["text3"]).pack(anchor="w")
        ctk.CTkLabel(body, text=lecture["name"],
                     font=ctk.CTkFont("Segoe UI", 12, "bold"),
                     text_color=COLORS["text"]).pack(anchor="w")
        ctk.CTkLabel(body,
                     text=f"{lecture['room']}  ·  {lecture.get('doctor','')}",
                     font=ctk.CTkFont("Segoe UI", 10),
                     text_color=COLORS["text2"]).pack(anchor="w")
        sc = {"active":"green","scheduled":"amber","ended":"gray"
              }.get(lecture.get("status","scheduled"), "gray")
        Badge(body, lecture.get("status","scheduled").title(),
              color=sc).pack(anchor="w", pady=(4,0))
        if on_click:
            self.configure(cursor="hand2")
            self.bind("<Button-1>", lambda e: on_click(lecture["id"]))


# ══════════════════════════════════════════════════════════
#  EMOTION BARS WIDGET
# ══════════════════════════════════════════════════════════
class EmotionBarsWidget(ctk.CTkFrame):
    def __init__(self, parent, emotion_data, **kw):
        super().__init__(parent, fg_color="transparent", **kw)
        for d in emotion_data:
            row = ctk.CTkFrame(self, fg_color="transparent")
            row.pack(fill="x", pady=4)
            icon = EMOTION_ICONS.get(d["emotion"], "😐")
            ctk.CTkLabel(row, text=f"{icon} {d['emotion']}",
                         font=ctk.CTkFont("Segoe UI", 11),
                         text_color=COLORS["text2"],
                         width=116, anchor="w").pack(side="left")
            bf = ctk.CTkFrame(row, fg_color=COLORS["bg3"],
                               height=8, corner_radius=4)
            bf.pack(side="left", fill="x", expand=True, padx=8)
            bf.pack_propagate(False)
            pct = d.get("pct", 0)
            ctk.CTkFrame(bf,
                          fg_color=d.get("color", COLORS["blue"]),
                          height=8, corner_radius=4
                          ).place(relx=0, rely=0,
                                   relwidth=pct/100, relheight=1)
            ctk.CTkLabel(row, text=f"{pct}%",
                         font=ctk.CTkFont("Segoe UI", 10),
                         text_color=COLORS["text3"],
                         width=36).pack(side="right")