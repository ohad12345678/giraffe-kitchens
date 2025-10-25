#!/usr/bin/env python3
"""
Simple PostgreSQL connection test without dependencies
"""
import psycopg2
import os

def test_simple_connection():
    """Test PostgreSQL connection with psycopg2 directly"""
    DATABASE_URL = "postgresql://postgres:XQsIeIDggVHLaulnNkBCcHLLFHnrvuVW@crossover.proxy.rlwy.net:37015/railway?sslmode=prefer"

    print("🔄 Testing direct PostgreSQL connection...")

    try:
        # Connect
        conn = psycopg2.connect(DATABASE_URL)
        cursor = conn.cursor()

        # Test queries
        cursor.execute("SELECT version()")
        version = cursor.fetchone()[0]
        print(f"✅ Connected to PostgreSQL!")
        print(f"📊 Database version: {version[:80]}...")

        cursor.execute("SELECT current_database()")
        db_name = cursor.fetchone()[0]
        print(f"📁 Database name: {db_name}")

        # Check SSL status (different method for Railway PostgreSQL)
        cursor.execute("SELECT current_setting('ssl', true) IS NOT NULL")
        ssl_info = cursor.fetchone()[0]
        print(f"🔐 SSL configuration: {ssl_info}")

        # Check existing tables
        cursor.execute("""
            SELECT tablename FROM pg_tables
            WHERE schemaname = 'public'
            ORDER BY tablename;
        """)
        tables = cursor.fetchall()
        print(f"\n📋 Existing tables in database:")
        if tables:
            for table in tables:
                print(f"   - {table[0]}")
        else:
            print(f"   (No tables found - database is empty)")

        cursor.close()
        conn.close()

        print(f"\n✅ Connection test successful!")
        return True

    except Exception as e:
        print(f"❌ Connection failed: {e}")
        return False

if __name__ == "__main__":
    import sys
    success = test_simple_connection()
    sys.exit(0 if success else 1)