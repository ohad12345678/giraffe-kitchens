#!/bin/bash
# Script to fix the missing manager_name column in Railway database
# Run this in Railway Shell

echo "🔧 Fixing database schema..."

python3 << 'PYEOF'
import sqlite3
import os

db_path = '/data/giraffe_kitchens.db'

print(f"📁 Connecting to database: {db_path}")

if not os.path.exists(db_path):
    print(f"❌ ERROR: Database file not found at {db_path}")
    print("Available files in /data:")
    if os.path.exists('/data'):
        for f in os.listdir('/data'):
            print(f"  - {f}")
    exit(1)

try:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Check if column already exists
    cursor.execute("PRAGMA table_info(manager_reviews)")
    columns = [row[1] for row in cursor.fetchall()]

    if 'manager_name' in columns:
        print("✅ Column 'manager_name' already exists!")
    else:
        print("➕ Adding 'manager_name' column...")
        cursor.execute("ALTER TABLE manager_reviews ADD COLUMN manager_name VARCHAR(255)")
        conn.commit()
        print("✅ Column 'manager_name' added successfully!")

    # Verify the column was added
    cursor.execute("PRAGMA table_info(manager_reviews)")
    columns = [row[1] for row in cursor.fetchall()]
    print(f"\n📋 Current columns in manager_reviews table:")
    for col in columns:
        print(f"  - {col}")

    conn.close()
    print("\n✅ Database fix completed!")

except Exception as e:
    print(f"❌ Error: {e}")
    exit(1)
PYEOF

echo ""
echo "✅ Done! Now restart the Railway service (not redeploy):"
echo "   1. Go to Railway Dashboard"
echo "   2. Click on your service"
echo "   3. Click 'Restart' (NOT Redeploy)"
