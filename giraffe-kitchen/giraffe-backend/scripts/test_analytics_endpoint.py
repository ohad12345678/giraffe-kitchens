#!/usr/bin/env python3
"""
Test analytics endpoint GROUP BY issues
"""
import sys
import os
from pathlib import Path
from datetime import date, timedelta
from sqlalchemy import func
import traceback

# Setup path
backend_path = Path(__file__).parent.parent
sys.path.insert(0, str(backend_path))

# Set environment
os.environ['DATABASE_URL'] = 'postgresql://postgres:XQsIeIDggVHLaulnNkBCcHLLFHnrvuVW@crossover.proxy.rlwy.net:37015/railway?sslmode=prefer'

print("🔍 Testing analytics endpoint GROUP BY queries...")

from app.db.base import SessionLocal
from app.models.dish_check import DishCheck
from app.models.dish import Dish
from app.models.chef import Chef
from app.models.branch import Branch

db = SessionLocal()

try:
    # Setup date range (last 7 days)
    today = date.today()
    start_date = today - timedelta(days=7)
    end_date = today

    print(f"📅 Date range: {start_date} to {end_date}")

    # Base query
    base_query = db.query(DishCheck).filter(
        DishCheck.check_date >= start_date,
        DishCheck.check_date <= end_date
    )

    all_checks = base_query.all()
    check_ids = [c.id for c in all_checks]
    print(f"📊 Found {len(check_ids)} checks in date range")

    # Test 1: Weakest dish query (line 137 in checks.py)
    print("\n❌ Test 1: PROBLEMATIC weakest-dish query (uses coalesce in GROUP BY):")
    try:
        query = db.query(
            DishCheck.dish_id,
            func.coalesce(Dish.name, DishCheck.dish_name_manual).label('dish_name'),
            func.avg(DishCheck.rating).label('avg_score'),
            func.count(DishCheck.id).label('check_count')
        ).outerjoin(
            Dish, DishCheck.dish_id == Dish.id
        ).filter(
            DishCheck.check_date >= start_date,
            DishCheck.check_date <= end_date
        ).group_by(
            DishCheck.dish_id,
            func.coalesce(Dish.name, DishCheck.dish_name_manual)  # ❌ PROBLEM: coalesce in GROUP BY
        ).order_by(func.avg(DishCheck.rating).asc()).first()

        print("   ⚠️ Query executed (might work locally but fails on Railway)")
    except Exception as e:
        print(f"   ❌ FAILED: {e}")
        traceback.print_exc()

    # Test 2: Top chef query from analytics (line 213 in checks.py)
    print("\n✅ Test 2: Top chef query (FIXED version):")
    try:
        top_chef_result = db.query(
            func.coalesce(Chef.name, DishCheck.chef_name_manual).label('name'),
            func.avg(DishCheck.rating).label('avg_score')
        ).outerjoin(
            Chef, DishCheck.chef_id == Chef.id
        ).filter(
            DishCheck.id.in_(check_ids) if check_ids else False
        ).group_by(
            DishCheck.chef_id,
            Chef.name,
            DishCheck.chef_name_manual  # ✅ FIXED: All columns listed separately
        ).order_by(
            func.avg(DishCheck.rating).desc()
        ).first()

        if top_chef_result:
            print(f"   ✅ Success: Top chef is {top_chef_result.name} with rating {round(float(top_chef_result.avg_score), 1)}")
        else:
            print("   ⚠️ No results found")
    except Exception as e:
        print(f"   ❌ FAILED: {e}")
        traceback.print_exc()

    # Test 3: Dish ratings query from analytics (line 232 in checks.py)
    print("\n✅ Test 3: Dish ratings query (FIXED version):")
    try:
        dish_ratings = db.query(
            DishCheck.dish_id,
            func.coalesce(Dish.name, DishCheck.dish_name_manual).label('name'),
            Dish.category,
            func.avg(DishCheck.rating).label('avg_score'),
            func.count(DishCheck.id).label('check_count')
        ).outerjoin(
            Dish, DishCheck.dish_id == Dish.id
        ).filter(
            DishCheck.id.in_(check_ids) if check_ids else False
        ).group_by(
            DishCheck.dish_id,
            Dish.name,
            DishCheck.dish_name_manual,
            Dish.category  # ✅ FIXED: All columns listed separately
        ).order_by(
            func.avg(DishCheck.rating).desc()
        ).limit(5).all()

        print(f"   ✅ Success: Found {len(dish_ratings)} dish ratings")
        for d in dish_ratings[:3]:
            print(f"      - {d.name}: {round(float(d.avg_score), 1)}")
    except Exception as e:
        print(f"   ❌ FAILED: {e}")
        traceback.print_exc()

    # Test 4: Chef performance query from analytics (line 266 in checks.py)
    print("\n✅ Test 4: Chef performance query (FIXED version):")
    try:
        chef_performance = db.query(
            DishCheck.chef_id,
            func.coalesce(Chef.name, DishCheck.chef_name_manual).label('name'),
            Branch.name.label('branch_name'),
            func.avg(DishCheck.rating).label('avg_score'),
            func.count(DishCheck.id).label('check_count')
        ).outerjoin(
            Chef, DishCheck.chef_id == Chef.id
        ).outerjoin(
            Branch, Chef.branch_id == Branch.id
        ).filter(
            DishCheck.id.in_(check_ids) if check_ids else False
        ).group_by(
            DishCheck.chef_id,
            Chef.name,
            DishCheck.chef_name_manual,
            Branch.name  # ✅ FIXED: All columns listed separately
        ).order_by(
            func.avg(DishCheck.rating).desc()
        ).limit(5).all()

        print(f"   ✅ Success: Found {len(chef_performance)} chef performance records")
        for c in chef_performance[:3]:
            print(f"      - {c.name}: {round(float(c.avg_score), 1)}")
    except Exception as e:
        print(f"   ❌ FAILED: {e}")
        traceback.print_exc()

    print("\n" + "="*60)
    print("📝 SUMMARY OF PROBLEMS FOUND:")
    print("="*60)
    print("\n1. ❌ /api/v1/checks/weakest-dish (line 137-140):")
    print("   Problem: Uses func.coalesce() in GROUP BY clause")
    print("   Fix: Change GROUP BY to list columns separately")
    print("\n2. ✅ /api/v1/checks/analytics - Top chef query (line 213-217):")
    print("   Status: Already fixed")
    print("\n3. ✅ /api/v1/checks/analytics - Dish ratings (line 232-236):")
    print("   Status: Already fixed")
    print("\n4. ✅ /api/v1/checks/analytics - Chef performance (line 266-270):")
    print("   Status: Already fixed")

except Exception as e:
    print(f"\n❌ Unexpected error: {e}")
    traceback.print_exc()
finally:
    db.close()

print("\n✅ Diagnostic complete!")