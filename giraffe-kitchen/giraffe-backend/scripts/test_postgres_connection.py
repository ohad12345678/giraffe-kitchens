#!/usr/bin/env python3
"""
Test PostgreSQL connection
"""
import os
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

def test_connection():
    """Test PostgreSQL connection"""
    print("🔄 Testing PostgreSQL connection...")

    try:
        # Import after path is set
        from app.db.base import engine, SessionLocal
        from sqlalchemy import text

        # Test basic connection
        with engine.connect() as conn:
            result = conn.execute(text("SELECT version()"))
            version = result.scalar()
            print(f"✅ Connected to PostgreSQL!")
            print(f"📊 Database version: {version[:50]}...")

            # Test database name
            result = conn.execute(text("SELECT current_database()"))
            db_name = result.scalar()
            print(f"📁 Database name: {db_name}")

            # Test SSL
            result = conn.execute(text("SELECT ssl_is_used()"))
            ssl_used = result.scalar()
            print(f"🔐 SSL enabled: {ssl_used}")

            # Test creating a session
            db = SessionLocal()
            db.execute(text("SELECT 1"))
            db.close()
            print(f"✅ Session creation successful!")

        return True

    except Exception as e:
        print(f"❌ Connection failed: {e}")
        return False

if __name__ == "__main__":
    success = test_connection()
    sys.exit(0 if success else 1)