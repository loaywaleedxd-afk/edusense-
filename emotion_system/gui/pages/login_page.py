"""
Login Page — Role selection + credential form
"""
import customtkinter as ctk
import tkinter as tk
from gui.theme import COLORS
from gui.data_store import DataStore


class LoginPage(ctk.CTkFrame):
    ROLES = [
        {"role": "student", "emoji": "🎓", "label": "Student",
         "desc": "View attendance & emotions",
         "color": COLORS["blue"], "user": "s001"},
        {"role": "doctor",  "emoji": "👨‍🏫", "label": "Doctor / Lecturer",
         "desc": "Manage lectures & live sessions",
         "color": COLORS["purple"], "user": "dr.smith"},
        {"role": "admin",   "emoji": "🏛️", "label": "Admin",
         "desc": "System management & reports",
         "color": COLORS["green"], "user": "admin"},
        {"role": "parent",  "emoji": "👨‍👩‍👧", "label": "Parent",
         "desc": "Monitor child performance",
         "color": COLORS["amber"], "user": "parent1"},
    ]

    def __init__(self, parent, on_login, **kw):
        super().__init__(parent, fg_color=COLORS["bg"], corner_radius=0, **kw)
        self._on_login      = on_login
        self._selected_role = None
        self._store         = parent.store
        self._center_widget = None
        self._show_role_select()

    def _show_role_select(self):
        self._clear_center()

        # Main container centered
        center = ctk.CTkFrame(self, fg_color="transparent")
        center.place(relx=0.5, rely=0.5, anchor="center")
        self._center_widget = center

        # Logo
        ctk.CTkLabel(center,
                     text="⚡ EduSense",
                     font=ctk.CTkFont("Segoe UI", 42, "bold"),
                     text_color=COLORS["blue2"]).pack()

        ctk.CTkLabel(center,
                     text="Classroom Emotion Detection & Attendance System",
                     font=ctk.CTkFont("Segoe UI", 12),
                     text_color=COLORS["text3"]).pack(pady=(0, 40))

        ctk.CTkLabel(center,
                     text="Choose your role to continue",
                     font=ctk.CTkFont("Segoe UI", 13),
                     text_color=COLORS["text2"]).pack(pady=(0, 16))

        # Role grid — 2 columns x 2 rows
        grid = ctk.CTkFrame(center, fg_color="transparent")
        grid.pack()

        for i, r in enumerate(self.ROLES):
            col = i % 2
            row = i // 2
            card = self._make_role_card(grid, r)
            card.grid(row=row, column=col, padx=10, pady=10)

    def _make_role_card(self, parent, role_info):
        card = ctk.CTkFrame(parent,
                             fg_color=COLORS["card"],
                             corner_radius=14,
                             border_width=1,
                             border_color=COLORS["border"],
                             width=220, height=130,
                             cursor="hand2")
        card.pack_propagate(False)

        inner = ctk.CTkFrame(card, fg_color="transparent")
        inner.place(relx=0.5, rely=0.5, anchor="center")

        ctk.CTkLabel(inner, text=role_info["emoji"],
                     font=ctk.CTkFont("Segoe UI", 30)).pack()
        ctk.CTkLabel(inner, text=role_info["label"],
                     font=ctk.CTkFont("Segoe UI", 13, "bold"),
                     text_color=COLORS["text"]).pack(pady=(3, 0))
        ctk.CTkLabel(inner, text=role_info["desc"],
                     font=ctk.CTkFont("Segoe UI", 10),
                     text_color=COLORS["text2"],
                     wraplength=180).pack()

        def on_enter(e, c=card, r=role_info):
            c.configure(border_color=r["color"], fg_color=COLORS["hover"])
        def on_leave(e, c=card):
            c.configure(border_color=COLORS["border"], fg_color=COLORS["card"])
        def on_click(e, r=role_info):
            self._show_login_form(r)

        for w in [card, inner]:
            w.bind("<Enter>",    on_enter)
            w.bind("<Leave>",    on_leave)
            w.bind("<Button-1>", on_click)

        return card

    def _show_login_form(self, role_info):
        self._clear_center()

        # Outer box
        box = ctk.CTkFrame(self,
                            fg_color=COLORS["card"],
                            corner_radius=18,
                            border_width=1,
                            border_color=COLORS["border2"])
        box.place(relx=0.5, rely=0.5, anchor="center")
        self._center_widget = box

        inner = ctk.CTkFrame(box, fg_color="transparent")
        inner.pack(padx=36, pady=24)

        # Header
        ctk.CTkLabel(inner, text=role_info["emoji"],
                     font=ctk.CTkFont("Segoe UI", 30)).pack()
        ctk.CTkLabel(inner,
                     text=f"{role_info['label']} Login",
                     font=ctk.CTkFont("Segoe UI", 18, "bold"),
                     text_color=COLORS["text"]).pack(pady=(4, 2))
        ctk.CTkLabel(inner,
                     text="Enter your credentials to continue",
                     font=ctk.CTkFont("Segoe UI", 11),
                     text_color=COLORS["text2"]).pack(pady=(0, 16))

        # Username
        ctk.CTkLabel(inner, text="USERNAME",
                     font=ctk.CTkFont("Segoe UI", 10, "bold"),
                     text_color=COLORS["text3"]).pack(anchor="w")
        self._username = ctk.CTkEntry(inner,
                                       width=320, height=38,
                                       font=ctk.CTkFont("Segoe UI", 12),
                                       fg_color=COLORS["bg3"],
                                       border_color=COLORS["border"],
                                       text_color=COLORS["text"],
                                       placeholder_text="Enter username",
                                       corner_radius=9)
        self._username.pack(pady=(4, 10))
        self._username.insert(0, role_info["user"])

        # Password
        ctk.CTkLabel(inner, text="PASSWORD",
                     font=ctk.CTkFont("Segoe UI", 10, "bold"),
                     text_color=COLORS["text3"]).pack(anchor="w")
        self._password = ctk.CTkEntry(inner,
                                       width=320, height=38,
                                       font=ctk.CTkFont("Segoe UI", 12),
                                       fg_color=COLORS["bg3"],
                                       border_color=COLORS["border"],
                                       text_color=COLORS["text"],
                                       placeholder_text="Password",
                                       show="•",
                                       corner_radius=9)
        self._password.pack(pady=(4, 6))
        self._password.insert(0, "demo123")

        # Error label
        self._err_lbl = ctk.CTkLabel(inner, text="",
                                      font=ctk.CTkFont("Segoe UI", 11),
                                      text_color=COLORS["red2"])
        self._err_lbl.pack()

        # Sign In button
        ctk.CTkButton(inner,
                       text="Sign In  →",
                       width=320, height=40,
                       font=ctk.CTkFont("Segoe UI", 13, "bold"),
                       fg_color=role_info["color"],
                       hover_color=role_info["color"],
                       corner_radius=10,
                       command=self._do_login).pack(pady=(8, 0))

        # Demo hint
        hint = ctk.CTkFrame(inner,
                             fg_color=COLORS["blue_dim"],
                             corner_radius=8)
        hint.pack(fill="x", pady=(12, 0))
        ctk.CTkLabel(hint,
                     text=f"Demo: {role_info['user']} / demo123",
                     font=ctk.CTkFont("Segoe UI", 10),
                     text_color=COLORS["blue2"]).pack(pady=7)

        # Back link
        ctk.CTkButton(inner,
                       text="← Choose different role",
                       width=320,
                       fg_color="transparent",
                       hover_color=COLORS["bg3"],
                       text_color=COLORS["text3"],
                       font=ctk.CTkFont("Segoe UI", 11),
                       height=30,
                       command=self._show_role_select).pack(pady=(8, 0))

        # Bind Enter key
        self._password.bind("<Return>", lambda e: self._do_login())
        self._username.bind("<Return>", lambda e: self._do_login())

    def _do_login(self):
        uname = self._username.get().strip()
        pwd   = self._password.get().strip()
        user  = self._store.authenticate(uname, pwd)
        if user:
            self._on_login(user)
        else:
            self._err_lbl.configure(text="⚠  Invalid username or password")

    def _clear_center(self):
        if self._center_widget:
            self._center_widget.destroy()
            self._center_widget = None