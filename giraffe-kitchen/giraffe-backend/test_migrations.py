#!/usr/bin/env python3
"""
Test script to verify migrations work correctly
"""
import os
import sys
import sqlite3

# Add current directory to path
sys.path.insert(0, os.path.dirname(__file__))

def main():
    print("🧪 Testing Database Migrations")
    print("=" * 50)
    print()

    # Step 1: Clean slate
    db_path = "giraffe_kitchens.db"
    if os.path.exists(db_path):
        print(f"📁 Removing old database: {db_path}")
        os.remove(db_path)

    print("✅ Clean slate")
    print()

    # Step 2: Create database with SQLAlchemy models
    print("🔨 Creating tables with SQLAlchemy...")
    from app.db.base import Base, engine
    Base.metadata.create_all(bind=engine)
    print("✅ Tables created")
    print()

    # Step 3: Check initial schema
    print("🔍 Checking initial schema...")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    cursor.execute("PRAGMA table_info(manager_reviews)")
    columns_before = cursor.fetchall()
    column_names_before = [col[1] for col in columns_before]

    print(f"   Found {len(columns_before)} columns:")
    for col in columns_before[:5]:  # Show first 5
        print(f"      - {col[1]} ({col[2]})")
    print(f"      ... and {len(columns_before) - 5} more")
    print()

    has_manager_name_before = 'manager_name' in column_names_before
    print(f"   manager_name exists: {has_manager_name_before}")
    conn.close()
    print()

    # Step 4: Run Alembic migrations if manager_name doesn't exist
    if not has_manager_name_before:
        print("🔄 Running Alembic migration to add manager_name...")
        from alembic.config import Config
        from alembic import command

        alembic_cfg = Config("alembic.ini")

        # Stamp to revision before manager_name
        command.stamp(alembic_cfg, "8f9a3b2c1d4e")
        print("   Stamped to revision 8f9a3b2c1d4e")

        # Upgrade to head (adds manager_name)
        command.upgrade(alembic_cfg, "head")
        print("✅ Migration completed")
        print()

    # Step 5: Verify final schema
    print("🔍 Verifying final schema...")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    cursor.execute("PRAGMA table_info(manager_reviews)")
    columns_after = cursor.fetchall()
    column_names_after = [col[1] for col in columns_after]

    print(f"   Total columns: {len(columns_after)}")

    # Check critical columns
    checks = {
        'id': 'id' in column_names_after,
        'manager_id': 'manager_id' in column_names_after,
        'manager_name': 'manager_name' in column_names_after,
        'branch_id': 'branch_id' in column_names_after,
    }

    print("   Critical columns:")
    for col_name, exists in checks.items():
        status = "✅" if exists else "❌"
        print(f"      {status} {col_name}")

    conn.close()
    print()

    # Final result
    if all(checks.values()):
        print("🎉 SUCCESS! Database schema is correct")
        print()
        print("Next steps:")
        print("  1. Run: python3 seed_data.py")
        print("  2. Run: python3 -m uvicorn app.main:app --reload")
        print("  3. Test endpoints")
        return 0
    else:
        print("❌ FAILED! Some columns are missing")
        return 1

if __name__ == "__main__":
    sys.exit(main())
