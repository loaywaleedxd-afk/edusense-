import sqlite3
db = sqlite3.connect('emotion_system.db')

# Try inserting one student manually and see the error
try:
    db.execute("INSERT INTO users (username,password,role,full_name,email) VALUES ('231014184.0','WGaub52Z','student','Test','231014184.0@university.edu')")
    db.commit()
    print("Insert succeeded!")
except Exception as e:
    print("Insert failed:", e)

# Check what username format exists
rows = db.execute("SELECT username, email FROM users WHERE username LIKE '231%' OR username LIKE '211%' OR username LIKE '241%' OR username LIKE '232%' LIMIT 5").fetchall()
print("Sample student usernames:", rows)

# Check total
print("Total:", db.execute("SELECT COUNT(*) FROM users").fetchone()[0])

# Check if the email conflicts with anything
row = db.execute("SELECT username, email FROM users WHERE email='231014184.0@university.edu'").fetchone()
print("Email conflict:", row)

# Check if username exists
row = db.execute("SELECT username FROM users WHERE username='231014184.0'").fetchone()
print("Username exists:", row)
