"""
migrate_public_to_aast.py
=========================
Copies ALL data from the 'public' schema into the 'aast' tenant schema.

Run ONCE after the 'aast' university has been created via the SuperAdmin UI:
    python migrate_public_to_aast.py

Safe to re-run — uses ON CONFLICT DO NOTHING so nothing is duplicated.
"""

import asyncio
import os
import sys

import asyncpg

sys.path.insert(0, os.path.dirname(__file__))

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://edusense:edusense123@localhost:5432/edusense",
)

TARGET = "aast"   # destination schema

# Tables in the order they must be inserted (respects FK dependencies)
TABLES = [
    "users",
    "students",
    "doctors",
    "face_encodings",
    "lectures",
    "course_enrollments",
    "attendance",
    "emotion_records",
    "grades",
    "messages",
    "excuses",
    "system_alerts",
    "alerts",
    "announcements",
    "exam_schedule",
    "course_resources",
    "assignments",
    "submissions",
    "complaints",
    "student_fees",
    "course_waitlist",
    "qr_sessions",
    "registration_status",
    "proctoring_sessions",
    "proctoring_events",
    "advisor_appointments",
    "advisor_student_notes",
    "degree_requirements",
    "at_risk_assessments",
    "office_hours_slots",
    "office_hours_bookings",
]


async def main():
    print("=" * 60)
    print(f"  Migrating public -> {TARGET}")
    print("=" * 60)

    conn = await asyncpg.connect(DATABASE_URL)

    try:
        # Verify target schema exists
        schema_exists = await conn.fetchval(
            "SELECT schema_name FROM information_schema.schemata WHERE schema_name=$1",
            TARGET,
        )
        if not schema_exists:
            print(f"\n  ERR Schema '{TARGET}' does not exist.")
            print(f"    Create the '{TARGET}' university from the SuperAdmin UI first.")
            return

        total_copied = 0

        for table in TABLES:
            # Check if the table exists in both schemas
            src_exists = await conn.fetchval(
                "SELECT to_regclass($1)",
                f"public.{table}",
            )
            dst_exists = await conn.fetchval(
                "SELECT to_regclass($1)",
                f'"{TARGET}".{table}',
            )

            if not src_exists:
                print(f"  — {table:<30} (not in public, skipping)")
                continue
            if not dst_exists:
                print(f"  — {table:<30} (not in {TARGET}, skipping)")
                continue

            # Get column names that exist in BOTH schemas (avoid missing cols)
            cols_src = await conn.fetch(
                """
                SELECT column_name FROM information_schema.columns
                WHERE table_schema='public' AND table_name=$1
                ORDER BY ordinal_position
                """,
                table,
            )
            cols_dst = await conn.fetch(
                """
                SELECT column_name FROM information_schema.columns
                WHERE table_schema=$1 AND table_name=$2
                ORDER BY ordinal_position
                """,
                TARGET, table,
            )

            src_set = {r["column_name"] for r in cols_src}
            dst_set = {r["column_name"] for r in cols_dst}
            common  = [r["column_name"] for r in cols_src if r["column_name"] in dst_set]

            if not common:
                print(f"  — {table:<30} (no common columns, skipping)")
                continue

            cols_sql = ", ".join(f'"{c}"' for c in common)

            try:
                result = await conn.execute(f"""
                    INSERT INTO "{TARGET}"."{table}" ({cols_sql})
                    SELECT {cols_sql} FROM public."{table}"
                    ON CONFLICT DO NOTHING
                """)
                # result is like "INSERT 0 N"
                n = int(result.split()[-1])
                total_copied += n
                if n > 0:
                    print(f"  OK {table:<30} {n:>6} rows")
                else:
                    print(f"  · {table:<30} already up to date")

            except Exception as e:
                print(f"  ERR {table:<30} ERROR: {e}")

        # Fix sequences so new inserts don't collide with copied IDs
        print("\n  Resetting sequences…")
        seq_tables = [
            ("users",               "id"),
            ("students",            "id"),
            ("doctors",             "id"),
            ("lectures",            "id"),
            ("attendance",          "id"),
            ("emotion_records",     "id"),
            ("grades",              "id"),
            ("messages",            "id"),
            ("excuses",             "id"),
            ("alerts",              "id"),
            ("proctoring_sessions", "id"),
            ("proctoring_events",   "id"),
            ("advisor_appointments","id"),
            ("advisor_student_notes","id"),
            ("degree_requirements", "id"),
            ("at_risk_assessments", "id"),
            ("course_waitlist",     "id"),
        ]
        for tbl, col in seq_tables:
            try:
                await conn.execute(f"""
                    SELECT setval(
                        pg_get_serial_sequence('"{TARGET}"."{tbl}"', '{col}'),
                        COALESCE((SELECT MAX("{col}") FROM "{TARGET}"."{tbl}"), 1)
                    )
                """)
            except Exception:
                pass   # table might not have a sequence

        print(f"\n  OK Done. {total_copied} rows copied into '{TARGET}' schema.")
        print("=" * 60)

    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(main())
