#!/usr/bin/env python3
"""
Test exact analytics endpoint error - simulate the exact request
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

print("🔍 Testing EXACT analytics endpoint query sequence...")

from app.db.base import SessionLocal
from app.models.dish_check import DishCheck
from app.models.dish import Dish
from app.models.chef import Chef
from app.models.branch import Branch
from app.models.user import User

db = SessionLocal()

try:
    # Simulate the exact analytics endpoint logic
    today = date.today()
    week_start = today - timedelta(days=today.weekday())
    week_end = week_start + timedelta(days=6)
    start_date = week_start
    end_date = week_end

    print(f"📅 Date range: {start_date} to {end_date}")

    # Base query with filters (exactly as in analytics endpoint)
    base_query = db.query(DishCheck).filter(
        DishCheck.check_date >= start_date,
        DishCheck.check_date <= end_date
    )

    # Get all checks (this is the problematic line 197 in checks.py!)
    print("\n⚠️ Getting all checks to use in subqueries...")
    all_checks = base_query.all()
    print(f"✅ Found {len(all_checks)} checks")

    # This is the issue - the endpoint uses [c.id for c in base_query.all()] multiple times!
    # Each time it calls base_query.all(), it executes the query again

    # 1. Test KPIs
    print("\n📊 Testing KPIs section...")
    total_checks = base_query.count()
    print(f"   Total checks: {total_checks}")

    # Average rating - this uses base_query.all() again!
    print("\n⚠️ Testing average rating query (uses base_query.all())...")
    try:
        avg_rating = db.query(func.avg(DishCheck.rating)).filter(
            DishCheck.id.in_([c.id for c in base_query.all()])
        ).scalar() or 0
        print(f"   ✅ Average rating: {round(float(avg_rating), 1)}")
    except Exception as e:
        print(f"   ❌ FAILED: {e}")
        traceback.print_exc()

    # Weak dishes count - uses base_query.all() again!
    print("\n⚠️ Testing weak dishes count (uses base_query.all())...")
    try:
        weak_dishes_count = db.query(func.count(func.distinct(DishCheck.dish_id))).filter(
            DishCheck.id.in_([c.id for c in base_query.all()]),
            DishCheck.rating < 7
        ).scalar() or 0
        print(f"   ✅ Weak dishes: {weak_dishes_count}")
    except Exception as e:
        print(f"   ❌ FAILED: {e}")
        traceback.print_exc()

    # Top chef - PROBLEM: uses base_query.all() AGAIN!
    print("\n❌ Testing top chef query (line 206-219 - uses base_query.all())...")
    try:
        top_chef_result = db.query(
            func.coalesce(Chef.name, DishCheck.chef_name_manual).label('name'),
            func.avg(DishCheck.rating).label('avg_score')
        ).outerjoin(
            Chef, DishCheck.chef_id == Chef.id
        ).filter(
            DishCheck.id.in_([c.id for c in base_query.all()])  # Another base_query.all()!
        ).group_by(
            DishCheck.chef_id,
            Chef.name,
            DishCheck.chef_name_manual
        ).order_by(
            func.avg(DishCheck.rating).desc()
        ).first()

        if top_chef_result:
            print(f"   ✅ Top chef: {top_chef_result.name}")
        else:
            print("   ⚠️ No top chef found")
    except Exception as e:
        print(f"   ❌ FAILED: {e}")
        traceback.print_exc()

    # Dish ratings - uses base_query.all() AGAIN!
    print("\n❌ Testing dish ratings query (line 222-239 - uses base_query.all())...")
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
            DishCheck.id.in_([c.id for c in base_query.all()])  # Another base_query.all()!
        ).group_by(
            DishCheck.dish_id,
            Dish.name,
            DishCheck.dish_name_manual,
            Dish.category
        ).order_by(
            func.avg(DishCheck.rating).desc()
        ).all()

        print(f"   ✅ Found {len(dish_ratings)} dish ratings")
    except Exception as e:
        print(f"   ❌ FAILED: {e}")
        traceback.print_exc()

    # Chef performance - uses base_query.all() AGAIN!
    print("\n❌ Testing chef performance query (line 254-273 - uses base_query.all())...")
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
            DishCheck.id.in_([c.id for c in base_query.all()])  # Another base_query.all()!
        ).group_by(
            DishCheck.chef_id,
            Chef.name,
            DishCheck.chef_name_manual,
            Branch.name
        ).order_by(
            func.avg(DishCheck.rating).desc()
        ).all()

        print(f"   ✅ Found {len(chef_performance)} chef performance records")
    except Exception as e:
        print(f"   ❌ FAILED: {e}")
        traceback.print_exc()

    # Daily trend - uses base_query.all() AGAIN!
    print("\n❌ Testing daily trend query (line 287-293 - uses base_query.all())...")
    try:
        daily_data = db.query(
            DishCheck.check_date,
            func.count(DishCheck.id).label('checks'),
            func.avg(DishCheck.rating).label('avg_rating')
        ).filter(
            DishCheck.id.in_([c.id for c in base_query.all()])  # Another base_query.all()!
        ).group_by(DishCheck.check_date).order_by(DishCheck.check_date).all()

        print(f"   ✅ Found {len(daily_data)} daily data points")
    except Exception as e:
        print(f"   ❌ FAILED: {e}")
        traceback.print_exc()

    print("\n" + "="*60)
    print("🔍 ANALYSIS:")
    print("="*60)
    print("\nThe analytics endpoint calls base_query.all() SEVEN TIMES!")
    print("Each call executes the query again, which:")
    print("1. Is inefficient (multiple DB round trips)")
    print("2. May hit query size limits on Railway")
    print("3. Could cause timeout issues")
    print("\n✅ SOLUTION:")
    print("Cache the check IDs once at the beginning:")
    print("   check_ids = [c.id for c in base_query.all()]")
    print("Then reuse check_ids in all the filter clauses")

except Exception as e:
    print(f"\n❌ Unexpected error: {e}")
    traceback.print_exc()
finally:
    db.close()

print("\n✅ Analysis complete!")