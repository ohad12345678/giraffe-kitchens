#!/usr/bin/env python3
"""
Migrate data from SQLite to PostgreSQL
"""
import sqlite3
import psycopg2
from psycopg2.extras import execute_values
import json
from datetime import datetime
from pathlib import Path

def migrate_sqlite_to_postgres():
    """Migrate all data from SQLite to PostgreSQL"""

    # Database paths
    sqlite_path = Path(__file__).parent.parent / 'giraffe_kitchens.db'
    postgres_url = 'postgresql://postgres:XQsIeIDggVHLaulnNkBCcHLLFHnrvuVW@crossover.proxy.rlwy.net:37015/railway?sslmode=prefer'

    if not sqlite_path.exists():
        print(f"❌ SQLite database not found at {sqlite_path}")
        return False

    print("🔄 Starting migration from SQLite to PostgreSQL...")
    print(f"   📁 Source: {sqlite_path}")
    print(f"   🐘 Target: Railway PostgreSQL")

    # Connect to SQLite
    sqlite_conn = sqlite3.connect(str(sqlite_path))
    sqlite_conn.row_factory = sqlite3.Row
    sqlite_cursor = sqlite_conn.cursor()

    # Connect to PostgreSQL
    pg_conn = psycopg2.connect(postgres_url)
    pg_cursor = pg_conn.cursor()

    # Tables in correct order (respect foreign keys)
    tables_order = [
        'branches',      # No dependencies
        'users',         # Depends on branches
        'dishes',        # No dependencies
        'chefs',         # Depends on branches
        'dish_checks',   # Depends on dishes
        'sanitation_audits',           # Depends on branches, users
        'sanitation_audit_categories', # Depends on sanitation_audits
    ]

    # Skip these tables
    skip_tables = ['alembic_version', 'daily_tasks', 'task_assignments']

    success_count = 0
    error_count = 0
    total_rows = 0

    for table_name in tables_order:
        try:
            # Check if table exists in SQLite
            sqlite_cursor.execute(
                "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
                (table_name,)
            )
            if not sqlite_cursor.fetchone():
                print(f"⚠️  Table {table_name} not found in SQLite, skipping...")
                continue

            # Get data from SQLite
            sqlite_cursor.execute(f"SELECT * FROM {table_name}")
            rows = sqlite_cursor.fetchall()

            if not rows:
                print(f"📭 Table {table_name} is empty, skipping...")
                continue

            print(f"\n📋 Migrating {table_name}...", end="")

            # Get column names
            columns = list(rows[0].keys())

            # Clear existing data in PostgreSQL table (if migrating again)
            # pg_cursor.execute(f"TRUNCATE TABLE {table_name} CASCADE")

            # Prepare values for insertion
            values = []
            for row in rows:
                row_values = []
                for col in columns:
                    value = row[col]
                    # Handle special cases
                    if value == '' and col in ['dish_id']:  # Empty string to NULL
                        value = None
                    elif col == 'check_date' and value:
                        # Convert integer date to string format
                        if isinstance(value, int):
                            date_str = str(value)
                            if len(date_str) == 4:  # Just year (2025)
                                value = f"{date_str}-01-01"  # Default to January 1st
                            elif len(date_str) == 8:  # YYYYMMDD
                                value = f"{date_str[:4]}-{date_str[4:6]}-{date_str[6:8]}"
                            else:
                                value = "2025-01-01"  # Fallback
                        elif isinstance(value, str):
                            if value.isdigit():
                                if len(value) == 4:
                                    value = f"{value}-01-01"
                                elif len(value) == 8:
                                    value = f"{value[:4]}-{value[4:6]}-{value[6:8]}"
                                else:
                                    value = "2025-01-01"
                    elif isinstance(value, str) and col.endswith('_date'):
                        # Keep date strings as is
                        pass
                    row_values.append(value)
                values.append(tuple(row_values))

            # Insert data using execute_values for better performance
            placeholders = ','.join(['%s'] * len(columns))
            insert_query = f"""
                INSERT INTO {table_name} ({','.join(columns)})
                VALUES %s
                ON CONFLICT DO NOTHING
            """

            execute_values(pg_cursor, insert_query, values)
            rows_inserted = pg_cursor.rowcount

            pg_conn.commit()
            print(f" ✅ {rows_inserted} rows migrated")
            success_count += 1
            total_rows += rows_inserted

        except Exception as e:
            print(f" ❌ Error: {e}")
            error_count += 1
            pg_conn.rollback()
            continue

    # Reset sequences for auto-increment fields
    print("\n🔧 Resetting sequences for auto-increment columns...")
    sequence_tables = [
        ('branches', 'id'),
        ('users', 'id'),
        ('dishes', 'id'),
        ('chefs', 'id'),
        ('dish_checks', 'id'),
        ('sanitation_audits', 'id'),
        ('sanitation_audit_categories', 'id'),
    ]

    for table, id_column in sequence_tables:
        try:
            # Check if table has data
            pg_cursor.execute(f"SELECT COUNT(*) FROM {table}")
            count = pg_cursor.fetchone()[0]

            if count > 0:
                pg_cursor.execute(f"""
                    SELECT setval(
                        pg_get_serial_sequence('{table}', '{id_column}'),
                        (SELECT MAX({id_column}) FROM {table}),
                        true
                    );
                """)
                pg_conn.commit()
                print(f"   ✅ Reset sequence for {table}.{id_column}")
        except Exception as e:
            print(f"   ⚠️  Could not reset sequence for {table}.{id_column}: {e}")
            pg_conn.rollback()

    # Verify migration
    print("\n📊 Verification:")
    for table_name in tables_order:
        try:
            pg_cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
            count = pg_cursor.fetchone()[0]
            if count > 0:
                print(f"   {table_name}: {count} rows")
        except:
            pass

    # Close connections
    sqlite_conn.close()
    pg_conn.close()

    print(f"\n✅ Migration completed!")
    print(f"   Tables migrated: {success_count}")
    print(f"   Total rows: {total_rows}")
    if error_count > 0:
        print(f"   ⚠️  Tables with errors: {error_count}")

    return success_count > 0

if __name__ == "__main__":
    import sys
    success = migrate_sqlite_to_postgres()
    sys.exit(0 if success else 1)