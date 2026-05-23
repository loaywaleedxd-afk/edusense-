"""
create_superadmin.py
====================
One-time CLI script to create the superadmin account.

Run ONCE on your server after PostgreSQL is set up:
    python create_superadmin.py

The superadmin account lives in the 'public' schema and has access to
tenant management routes at /api/super/tenants.
It is NEVER visible to normal users and cannot be created from the UI.
"""

import asyncio
import getpass
import os
import sys

import asyncpg

sys.path.insert(0, os.path.dirname(__file__))
from auth_utils import hash_password

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:password@localhost:5432/edusense",
)


async def main():
    print("=" * 55)
    print("  EduSense — Superadmin Account Setup")
    print("=" * 55)
    print()

    username = input("  Username : ").strip()
    if not username:
        print("  ✗ Username cannot be empty."); return

    password = getpass.getpass("  Password : ")
    if len(password) < 8:
        print("  ✗ Password must be at least 8 characters."); return

    confirm = getpass.getpass("  Confirm  : ")
    if password != confirm:
        print("  ✗ Passwords do not match."); return

    full_name = input("  Full name: ").strip() or "Super Admin"
    email     = input("  Email    : ").strip() or f"{username}@edusense.internal"

    hashed = hash_password(password)

    conn = await asyncpg.connect(DATABASE_URL)
    try:
        # Ensure users table exists in public schema
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS public.users (
                id         SERIAL PRIMARY KEY,
                username   TEXT UNIQUE NOT NULL,
                password   TEXT NOT NULL,
                role       TEXT NOT NULL CHECK(role IN
                           ('student','doctor','admin','parent','superadmin')),
                full_name  TEXT NOT NULL,
                email      TEXT UNIQUE NOT NULL,
                created_at TIMESTAMPTZ DEFAULT NOW()
            )
        """)

        existing = await conn.fetchrow(
            "SELECT id FROM public.users WHERE username=$1", username
        )
        if existing:
            print(f"\n  ✗ Username '{username}' already exists in public schema.")
            return

        await conn.execute(
            """INSERT INTO public.users (username, password, role, full_name, email)
               VALUES ($1, $2, 'superadmin', $3, $4)""",
            username, hashed, full_name, email,
        )
        print()
        print(f"  ✓ Superadmin '{username}' created successfully.")
        print()
        print("  Login at: POST /api/auth/login")
        print(f"  Username : {username}")
        print("  Password : (the one you entered)")
        print()
        print("  Dashboard: https://your-domain.com/super")
        print("=" * 55)
    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(main())
