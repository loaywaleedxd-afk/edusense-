"""Fix seed user passwords and add parent role support."""
import sqlite3

db = sqlite3.connect('emotion_system.db')

# Fix the seed users — they have fake bcrypt hashes, set plain pass123
db.execute("UPDATE users SET password='pass123' WHERE username IN ('admin','dr.smith','s001')")
db.commit()

# Check if parent role is allowed
try:
    db.execute("INSERT INTO users (username,password,role,full_name,email) VALUES ('_test_parent','x','parent','x','_x@x.com')")
    db.rollback()
    print("parent role: already allowed")
except Exception as e:
    print("parent role NOT allowed by CHECK constraint:", e)
    # Recreate users table without the role constraint restriction
    # SQLite doesn't support ALTER COLUMN, so we need to recreate
    db.executescript("""
        CREATE TABLE IF NOT EXISTS users_new (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            username    TEXT UNIQUE NOT NULL,
            password    TEXT NOT NULL,
            role        TEXT NOT NULL,
            full_name   TEXT NOT NULL,
            email       TEXT UNIQUE NOT NULL,
            created_at  TEXT DEFAULT (datetime('now'))
        );
        INSERT OR IGNORE INTO users_new SELECT * FROM users;
        DROP TABLE users;
        ALTER TABLE users_new RENAME TO users;
    """)
    db.commit()
    print("Recreated users table without role CHECK constraint")

# Add a parent demo user (links to student s001)
try:
    db.execute("""
        INSERT OR IGNORE INTO users (username, password, role, full_name, email)
        VALUES ('parent001', 'pass123', 'parent', 'Parent of Sara Johnson', 'parent001@university.edu')
    """)
    db.commit()
    print("Added parent001 user")
except Exception as e:
    print("Parent user:", e)

# Verify
rows = db.execute("SELECT username, role, password FROM users WHERE username IN ('admin','dr.smith','s001','parent001')").fetchall()
for r in rows:
    print(r)

db.close()
print("Done.")
