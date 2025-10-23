#!/bin/bash

set -e  # Exit on error

echo "🧪 Giraffe Kitchen - Local Testing Script"
echo "=========================================="
echo ""

cd /Users/ohadbanay/Desktop/giraffe11/giraffe-kitchen/giraffe-backend

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Clean start
echo -e "${YELLOW}Step 1: Clean Database${NC}"
if [ -f "giraffe_kitchens.db" ]; then
    echo "  Removing old database..."
    rm giraffe_kitchens.db
fi
echo -e "${GREEN}  ✅ Clean slate${NC}"
echo ""

# Step 2: Create database with migrations
echo -e "${YELLOW}Step 2: Create Database & Run Migrations${NC}"

# Initialize database with SQLAlchemy (creates tables)
echo "  Creating initial tables with SQLAlchemy..."
python3 << 'PYEOF'
import sys
import os
sys.path.insert(0, os.getcwd())

from app.db.base import Base, engine
from app.core.config import settings

# Create all tables from models
Base.metadata.create_all(bind=engine)
print("  ✅ Tables created from models")
PYEOF

if [ $? -ne 0 ]; then
    echo -e "${RED}  ❌ Failed to create tables${NC}"
    exit 1
fi

# Now run Alembic to add manager_name column
echo "  Running Alembic migrations..."
python3 << 'PYEOF'
import sys
import os
sys.path.insert(0, os.getcwd())

from alembic.config import Config
from alembic import command

alembic_cfg = Config("alembic.ini")
command.stamp(alembic_cfg, "8f9a3b2c1d4e")  # Stamp to the revision before manager_name
command.upgrade(alembic_cfg, "head")  # Upgrade to head (adds manager_name)
print("  ✅ Migrations applied")
PYEOF

if [ $? -ne 0 ]; then
    echo -e "${RED}  ❌ Migration failed${NC}"
    exit 1
fi

echo -e "${GREEN}  ✅ Database ready${NC}"
echo ""

# Step 3: Verify schema
echo -e "${YELLOW}Step 3: Verify Database Schema${NC}"
python3 << 'PYEOF'
import sqlite3

conn = sqlite3.connect('giraffe_kitchens.db')
cursor = conn.cursor()

# Check manager_reviews columns
cursor.execute('PRAGMA table_info(manager_reviews)')
columns = cursor.fetchall()
column_names = [col[1] for col in columns]

print(f"  Found {len(columns)} columns in manager_reviews")

if 'manager_name' in column_names:
    print("  ✅ manager_name column exists")
else:
    print("  ❌ manager_name column MISSING!")
    exit(1)

if 'manager_id' in column_names:
    print("  ✅ manager_id column exists")

conn.close()
PYEOF

if [ $? -ne 0 ]; then
    echo -e "${RED}  ❌ Schema verification failed${NC}"
    exit 1
fi

echo -e "${GREEN}  ✅ Schema verified${NC}"
echo ""

# Step 4: Seed data
echo -e "${YELLOW}Step 4: Seed Test Data${NC}"
python3 seed_data.py
if [ $? -ne 0 ]; then
    echo -e "${RED}  ❌ Seeding failed${NC}"
    exit 1
fi
echo -e "${GREEN}  ✅ Data seeded${NC}"
echo ""

# Step 5: Start server
echo -e "${YELLOW}Step 5: Starting Development Server${NC}"
echo -e "${GREEN}  🚀 Server starting on http://localhost:8000${NC}"
echo ""
echo "  Test endpoints:"
echo "    http://localhost:8000/health"
echo "    http://localhost:8000/api/v1/manager-reviews/"
echo ""
echo "  Press Ctrl+C to stop"
echo ""

python3 -m uvicorn app.main:app --reload --port 8000
