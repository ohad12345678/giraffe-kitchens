#!/usr/bin/env python3
"""
Export SQLite database to JSON for backup and migration purposes.
"""
import sqlite3
import json
import os
from datetime import datetime
from pathlib import Path

def export_sqlite_to_json():
    """Export all SQLite data to JSON for backup"""

    # Define paths
    project_root = Path(__file__).parent.parent.parent.parent
    db_path = project_root / 'giraffe-kitchen' / 'giraffe-backend' / 'giraffe_kitchens.db'
    backup_dir = project_root / 'backups'

    if not db_path.exists():
        print(f"❌ Database not found at {db_path}")
        return None

    print(f"📂 Connecting to database: {db_path}")
    conn = sqlite3.connect(str(db_path))
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    # Get all tables
    cursor.execute("""
        SELECT name FROM sqlite_master
        WHERE type='table'
        AND name NOT LIKE 'sqlite_%'
        ORDER BY name;
    """)
    tables = cursor.fetchall()

    backup_data = {
        'metadata': {
            'exported_at': datetime.now().isoformat(),
            'source_db': str(db_path),
            'tables_count': len(tables)
        },
        'tables': {}
    }

    print(f"📊 Found {len(tables)} tables to export")

    for table in tables:
        table_name = table['name']
        print(f"  📋 Exporting table: {table_name}", end="")

        # Get table schema
        cursor.execute(f"PRAGMA table_info({table_name})")
        schema = cursor.fetchall()

        # Get table data
        cursor.execute(f"SELECT * FROM {table_name}")
        rows = cursor.fetchall()

        # Convert rows to list of dicts
        table_data = []
        for row in rows:
            row_dict = {}
            for key in row.keys():
                value = row[key]
                # Handle special types
                if isinstance(value, bytes):
                    value = value.hex()  # Convert bytes to hex string
                elif value is None:
                    value = None
                else:
                    value = str(value) if not isinstance(value, (int, float, bool)) else value
                row_dict[key] = value
            table_data.append(row_dict)

        backup_data['tables'][table_name] = {
            'schema': [dict(col) for col in schema],
            'row_count': len(table_data),
            'data': table_data
        }

        print(f" - {len(table_data)} rows")

    # Save backup
    backup_dir.mkdir(exist_ok=True)
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    backup_file = backup_dir / f'sqlite_backup_{timestamp}.json'

    print(f"\n💾 Saving backup to: {backup_file}")
    with open(backup_file, 'w', encoding='utf-8') as f:
        json.dump(backup_data, f, indent=2, ensure_ascii=False)

    # Print summary
    print(f"\n✅ Backup completed successfully!")
    print(f"   📁 File: {backup_file}")
    print(f"   📊 Tables: {len(backup_data['tables'])}")

    total_rows = sum(table['row_count'] for table in backup_data['tables'].values())
    print(f"   📝 Total rows: {total_rows}")

    file_size = backup_file.stat().st_size
    print(f"   💾 File size: {file_size / 1024:.2f} KB")

    conn.close()
    return str(backup_file)

if __name__ == "__main__":
    export_sqlite_to_json()