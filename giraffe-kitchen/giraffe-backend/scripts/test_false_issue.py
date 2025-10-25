#!/usr/bin/env python3
"""
Test if 'False' in filter causes issues with PostgreSQL
"""
import sys
import os
from pathlib import Path
from datetime import date, timedelta
from sqlalchemy import func

# Setup path
backend_path = Path(__file__).parent.parent
sys.path.insert(0, str(backend_path))

# Set environment
os.environ['DATABASE_URL'] = 'postgresql://postgres:XQsIeIDggVHLaulnNkBCcHLLFHnrvuVW@crossover.proxy.rlwy.net:37015/railway?sslmode=prefer'

print("🔍 Testing FALSE in filter with PostgreSQL...")

from app.db.base import SessionLocal
from app.models.dish_check import DishCheck

db = SessionLocal()

try:
    # Test 1: Filter with empty list
    print("\n1️⃣ Test filter with empty list:")
    try:
        result1 = db.query(func.avg(DishCheck.rating)).filter(
            DishCheck.id.in_([])
        ).scalar()
        print(f"   ✅ Empty list works: result = {result1}")
    except Exception as e:
        print(f"   ❌ Empty list failed: {e}")

    # Test 2: Filter with False
    print("\n2️⃣ Test filter with False:")
    try:
        result2 = db.query(func.avg(DishCheck.rating)).filter(
            False
        ).scalar()
        print(f"   ✅ False works: result = {result2}")
    except Exception as e:
        print(f"   ❌ False failed: {e}")

    # Test 3: Filter with conditional False
    print("\n3️⃣ Test filter with conditional False:")
    try:
        check_ids = []
        result3 = db.query(func.avg(DishCheck.rating)).filter(
            DishCheck.id.in_(check_ids) if check_ids else False
        ).scalar()
        print(f"   ✅ Conditional False works: result = {result3}")
    except Exception as e:
        print(f"   ❌ Conditional False failed: {e}")

    # Test 4: The actual pattern from our code
    print("\n4️⃣ Test actual code pattern with empty data:")
    try:
        # Simulate no checks in date range
        future_date = date(2030, 1, 1)
        base_query = db.query(DishCheck).filter(
            DishCheck.check_date >= future_date
        )

        # This is exactly what we do in analytics
        check_ids = [c.id for c in base_query.all()] if base_query.count() > 0 else []
        print(f"   Found {len(check_ids)} checks (should be 0)")

        # Try the query
        avg_rating = db.query(func.avg(DishCheck.rating)).filter(
            DishCheck.id.in_(check_ids) if check_ids else False
        ).scalar() or 0

        print(f"   ✅ Query works with empty data: avg_rating = {avg_rating}")
    except Exception as e:
        print(f"   ❌ Query failed with empty data: {e}")
        import traceback
        traceback.print_exc()

except Exception as e:
    print(f"\n❌ Unexpected error: {e}")
    import traceback
    traceback.print_exc()
finally:
    db.close()

print("\n✅ Test complete!")