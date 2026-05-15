"""
EduSense GUI — Main Entry Point  v3
Dark / Light mode toggle rebuilds the current page instantly.
"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import customtkinter as ctk
from gui.theme      import COLORS, setup_theme, toggle_mode, current_mode
from gui.data_store import DataStore


class EduSenseApp(ctk.CTk):
    def __init__(self):
        super().__init__()
        self.state("zoomed")
        # ── setup theme first (registers rebuild callback) ──
        setup_theme("dark", rebuild_cb=self._rebuild)

        self.title("EduSense — Classroom Emotion & Attendance System")
       
        self.minsize(1100, 750)
        self.after(0, lambda: self.state("zoomed"))

        self.store        = DataStore()
        self.current_user = None
        self._page_frame  = None

        self._show_login()

    # ── page management ────────────────────────────────────
    def _clear(self):
        if self._page_frame:
            self._page_frame.destroy()
            self._page_frame = None

    def _show_login(self):
        from gui.pages.login_page import LoginPage
        self._clear()
        self._page_frame = LoginPage(self, self._on_login)
        self._page_frame.pack(fill="both", expand=True)

    def _on_login(self, user: dict):
        self.current_user = user
        self._load_role_page(user)

    def _load_role_page(self, user: dict):
        from gui.pages.student_page import StudentPage
        from gui.pages.doctor_page  import DoctorPage
        from gui.pages.admin_page   import AdminPage
        from gui.pages.parent_page  import ParentPage
        self._clear()
        role = user.get("role", "")
        page_cls = {
            "student": StudentPage,
            "doctor":  DoctorPage,
            "admin":   AdminPage,
            "parent":  ParentPage,
        }.get(role, AdminPage)
        self._page_frame = page_cls(self, user, self._logout)
        self._page_frame.pack(fill="both", expand=True)

    def _logout(self):
        self.current_user = None
        self._show_login()

    def _rebuild(self):
        """Called by toggle_mode() — re-renders the current page with new colours."""
        self.configure(fg_color=COLORS["bg"])
        if self.current_user:
            self._load_role_page(self.current_user)
        else:
            self._show_login()


if __name__ == "__main__":
    app = EduSenseApp()
    app.mainloop()