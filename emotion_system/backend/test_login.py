"""Test login directly against the DB — run this to diagnose login issues."""
import sqlite3, os

DB = os.path.join(os.path.dirname(__file__), "emotion_system.db")

def try_login(username, password):
    db = sqlite3.connect(DB)
    db.row_factory = sqlite3.Row
    uname = username.strip().lower()
    pwd = password.strip()

    row = db.execute(
        "SELECT * FROM users WHERE LOWER(username)=? OR LOWER(email)=?",
        (uname, uname)
    ).fetchone()

    if not row:
        print(f"  [FAIL] User '{username}' not found in DB")
        db.close()
        return

    row = dict(row)
    stored = row.get("password","")
    print(f"  Found: username={row['username']} role={row['role']} stored_pw={stored!r}")
    if pwd == stored:
        print(f"  [OK] Login SUCCESS for {username}")
    else:
        print(f"  [FAIL] Password mismatch: got {pwd!r} expected {stored!r}")
    db.close()

tests = [
    ("admin",        "admin"),
    ("parent",       "parent"),
    ("dr.ahmed",     "Ahmed@2024"),
    ("dr.laila",     "Laila@2024"),
    ("dr.smith",     "pass123"),
    ("231014184.0",  "WGaub52Z"),
    ("231006367.0",  "gAC72qFl"),
]

for u, p in tests:
    print(f"\nTesting {u} / {p}:")
    try_login(u, p)
