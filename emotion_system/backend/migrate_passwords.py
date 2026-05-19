"""
migrate_passwords.py
────────────────────
One-time script: hashes all plain-text passwords in the users table with bcrypt.
Run once after updating the backend:

    cd emotion_system/backend
    python migrate_passwords.py

Safe to run multiple times — already-hashed passwords are skipped.
"""
import asyncio, os, sys
sys.path.insert(0, os.path.dirname(__file__))

import aiosqlite
from auth_utils import hash_password

DB = os.getenv("DB_PATH", "emotion_system.db")


async def migrate():
    async with aiosqlite.connect(DB) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("SELECT id, username, password FROM users") as cur:
            users = await cur.fetchall()

        updated = 0
        skipped = 0
        for u in users:
            pw = u["password"] or ""
            if pw.startswith("$2b$") or pw.startswith("$2a$"):
                skipped += 1
                continue
            # Skip dummy seed hashes that look like "$2b$12$hashed_..."
            if "hashed_" in pw:
                new_hash = hash_password(u["username"])   # use username as initial password
                print(f"  [seed reset] {u['username']} → password set to username")
            else:
                new_hash = hash_password(pw)
                print(f"  [hashed]     {u['username']}")
            await db.execute("UPDATE users SET password=? WHERE id=?", (new_hash, u["id"]))
            updated += 1

        await db.commit()
        print(f"\nDone: {updated} passwords hashed, {skipped} already bcrypt (skipped).")


if __name__ == "__main__":
    asyncio.run(migrate())
