#!/bin/bash

echo "🔧 Giraffe Kitchen - Database Fix Script"
echo "========================================"
echo ""

cd /Users/ohadbanay/Desktop/giraffe11/giraffe-kitchen/giraffe-backend

# Check if we're in the right directory
if [ ! -f "alembic.ini" ]; then
    echo "❌ Error: Not in the correct directory"
    exit 1
fi

echo "📍 Current directory: $(pwd)"
echo ""

# Step 1: Backup existing database
if [ -f "giraffe_kitchens.db" ]; then
    echo "💾 Backing up existing database..."
    cp giraffe_kitchens.db giraffe_kitchens.db.backup.$(date +%Y%m%d_%H%M%S)
    echo "✅ Backup created"
    echo ""
fi

# Step 2: Run migrations
echo "🔄 Running Alembic migrations..."
export PYTHONPATH=$(pwd):$PYTHONPATH

# Check current revision
echo "Current revision:"
python3 -m alembic current

echo ""
echo "Running upgrade to head..."
python3 -m alembic upgrade head

if [ $? -eq 0 ]; then
    echo "✅ Migrations completed successfully"
else
    echo "❌ Migration failed"
    exit 1
fi

echo ""

# Step 3: Verify manager_name column exists
echo "🔍 Verifying database schema..."
python3 << 'PYEOF'
import sqlite3

conn = sqlite3.connect('giraffe_kitchens.db')
cursor = conn.cursor()

cursor.execute('PRAGMA table_info(manager_reviews)')
columns = cursor.fetchall()
column_names = [col[1] for col in columns]

if 'manager_name' in column_names:
    print("✅ manager_name column exists")
else:
    print("❌ manager_name column missing!")
    exit(1)

# Check for date format issues in dish_checks
cursor.execute("SELECT COUNT(*) FROM dish_checks WHERE check_date LIKE '%:%'")
bad_dates = cursor.fetchone()[0]
if bad_dates > 0:
    print(f"⚠️  Found {bad_dates} records with datetime format in check_date")
    print("   Fixing...")
    cursor.execute("""
        UPDATE dish_checks
        SET check_date = DATE(check_date)
        WHERE check_date LIKE '%:%'
    """)
    conn.commit()
    print("✅ Date formats fixed")

conn.close()
PYEOF

if [ $? -ne 0 ]; then
    echo "❌ Verification failed"
    exit 1
fi

echo ""
echo "✅ Database is ready!"
echo ""
echo "📝 Next steps:"
echo "   1. Test locally: python3 seed_data.py"
echo "   2. Test the app: uvicorn app.main:app --reload"
echo "   3. If all works, push to Railway"
echo ""
