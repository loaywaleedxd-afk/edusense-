import sqlite3
db = sqlite3.connect('emotion_system.db')
names = ['admin','parent','dr.ahmed','231014184.0','231006367.0']
for n in names:
    row = db.execute("SELECT username, password, role FROM users WHERE username=?", (n,)).fetchone()
    print(row)
total = db.execute("SELECT COUNT(*) FROM users").fetchone()[0]
print("Total users:", total)
