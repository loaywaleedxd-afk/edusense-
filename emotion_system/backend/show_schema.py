import sqlite3
conn = sqlite3.connect('emotion_system.db')
c = conn.cursor()
for row in c.execute("SELECT sql FROM sqlite_master WHERE type='table'").fetchall():
    print(row[0])
    print()
conn.close()
