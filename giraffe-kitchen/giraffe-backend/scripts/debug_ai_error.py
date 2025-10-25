#!/usr/bin/env python3
"""
Debug script to find the exact error in AI and analytics endpoints
"""
import sys
import os
from pathlib import Path

# Setup path
backend_path = Path(__file__).parent.parent
sys.path.insert(0, str(backend_path))

# Set environment
os.environ['DATABASE_URL'] = 'postgresql://postgres:XQsIeIDggVHLaulnNkBCcHLLFHnrvuVW@crossover.proxy.rlwy.net:37015/railway?sslmode=prefer'

print("=" * 60)
print("🔍 AI ENDPOINT ERROR DIAGNOSIS")
print("=" * 60)

# Import after path setup
from datetime import date, timedelta
from app.db.base import SessionLocal, engine
from app.models.user import User
from app.models.dish_check import DishCheck
from app.models.dish import Dish
from app.models.chef import Chef
from sqlalchemy import func, text
from app.core.config import settings

db = SessionLocal()

# Step 1: Check database connection
print("\n1️⃣ Database Connection Test:")
try:
    result = db.execute(text("SELECT current_database(), version()")).fetchone()
    print(f"   ✅ Connected to: {result[0]}")
    print(f"   ✅ PostgreSQL version: {result[1][:50]}...")
except Exception as e:
    print(f"   ❌ Database error: {e}")
    sys.exit(1)

# Step 2: Check data exists
print("\n2️⃣ Data Availability Test:")
try:
    checks_count = db.query(DishCheck).count()
    dishes_count = db.query(Dish).count()
    chefs_count = db.query(Chef).count()
    users_count = db.query(User).count()

    print(f"   ✅ DishChecks: {checks_count} records")
    print(f"   ✅ Dishes: {dishes_count} records")
    print(f"   ✅ Chefs: {chefs_count} records")
    print(f"   ✅ Users: {users_count} records")

    # Get recent checks
    recent_checks = db.query(DishCheck).order_by(DishCheck.check_date.desc()).limit(3).all()
    if recent_checks:
        print(f"   📅 Latest check dates: {[c.check_date.isoformat() if c.check_date else 'None' for c in recent_checks]}")
except Exception as e:
    print(f"   ❌ Error checking data: {e}")

# Step 3: Test the problematic query from ai.py
print("\n3️⃣ Testing AI Query Pattern:")
try:
    # Simulate the query from ai.py line 91-94
    start_date = date.today() - timedelta(days=7)
    end_date = date.today()

    query = db.query(DishCheck).filter(
        DishCheck.check_date >= start_date,
        DishCheck.check_date <= end_date
    )

    total_checks = query.count()
    print(f"   ✅ Checks in last 7 days: {total_checks}")

    # Test the problematic pattern - line 106-108 in ai.py
    if total_checks > 0:
        check_ids = [c.id for c in query.all()]
        print(f"   ✅ Got {len(check_ids)} check IDs")

        # Test avg with IN clause
        avg_rating = db.query(func.avg(DishCheck.rating)).filter(
            DishCheck.id.in_(check_ids)
        ).scalar()
        print(f"   ✅ Average rating: {avg_rating}")
    else:
        print(f"   ⚠️  No checks in date range")

except Exception as e:
    print(f"   ❌ Query pattern error: {e}")
    import traceback
    traceback.print_exc()

# Step 4: Test empty IN clause (potential PostgreSQL issue)
print("\n4️⃣ Testing Empty IN Clause:")
try:
    # Test with empty list
    empty_list = []
    if not empty_list:
        print("   ✅ Correctly avoiding empty IN clause")
    else:
        result = db.query(DishCheck).filter(DishCheck.id.in_(empty_list)).count()
        print(f"   Result with empty IN: {result}")
except Exception as e:
    print(f"   ❌ Empty IN clause error: {e}")

# Step 5: Test coalesce function (line 112 in ai.py)
print("\n5️⃣ Testing COALESCE Function:")
try:
    # Test the coalesce pattern from weak_dishes_query
    result = db.query(
        func.coalesce(Dish.name, DishCheck.dish_name_manual).label('name'),
        func.avg(DishCheck.rating).label('avg_score')
    ).outerjoin(
        Dish, DishCheck.dish_id == Dish.id
    ).limit(1).first()

    if result:
        print(f"   ✅ COALESCE works: {result.name if result else 'No result'}")
    else:
        print(f"   ⚠️  No data for COALESCE test")

except Exception as e:
    print(f"   ❌ COALESCE error: {e}")
    import traceback
    traceback.print_exc()

# Step 6: Check ANTHROPIC_API_KEY
print("\n6️⃣ API Key Configuration Test:")
try:
    # Check from settings
    from app.core.config import settings
    api_key_from_settings = settings.ANTHROPIC_API_KEY
    api_key_from_env = os.getenv('ANTHROPIC_API_KEY')

    print(f"   📍 From settings (.env): {'✅ Set' if api_key_from_settings else '❌ Empty'}")
    if api_key_from_settings:
        print(f"      Length: {len(api_key_from_settings)}")
        print(f"      Starts with: {api_key_from_settings[:10]}..." if len(api_key_from_settings) > 10 else api_key_from_settings)

    print(f"   📍 From environment: {'✅ Set' if api_key_from_env else '❌ Not set'}")
    if api_key_from_env:
        print(f"      Length: {len(api_key_from_env)}")

    # Final key that would be used
    final_key = api_key_from_settings or api_key_from_env
    print(f"   📍 Final API key: {'✅ Available' if final_key else '❌ MISSING!'}")

except Exception as e:
    print(f"   ❌ Error checking API key: {e}")

# Step 7: Test the actual AI endpoint logic
print("\n7️⃣ Simulating AI Endpoint Logic:")
try:
    # Get a test user
    user = db.query(User).filter(User.email == "ohadb@giraffe.co.il").first()
    if not user:
        print("   ❌ Test user not found")
    else:
        print(f"   ✅ Using user: {user.email} (role: {user.role})")

        # Simulate the query building
        query = db.query(DishCheck).filter(
            DishCheck.check_date >= date.today() - timedelta(days=7),
            DishCheck.check_date <= date.today()
        )

        # Test query execution
        checks = query.all()
        print(f"   ✅ Query executed: {len(checks)} results")

        if checks:
            # Test the analytics calculations
            check_ids = [c.id for c in checks]

            # Test avg rating
            avg_rating = db.query(func.avg(DishCheck.rating)).filter(
                DishCheck.id.in_(check_ids)
            ).scalar() or 0
            print(f"   ✅ Avg rating calculated: {avg_rating}")

            # Test weak dishes query (simplified)
            weak_dishes = db.query(
                func.coalesce(Dish.name, DishCheck.dish_name_manual).label('name'),
                func.avg(DishCheck.rating).label('avg_score')
            ).outerjoin(
                Dish, DishCheck.dish_id == Dish.id
            ).filter(
                DishCheck.id.in_(check_ids)
            ).group_by(
                DishCheck.dish_id,
                func.coalesce(Dish.name, DishCheck.dish_name_manual)
            ).having(
                func.avg(DishCheck.rating) < 7
            ).limit(3).all()

            print(f"   ✅ Weak dishes query: {len(weak_dishes)} results")

except Exception as e:
    print(f"   ❌ AI logic simulation error: {e}")
    import traceback
    traceback.print_exc()

print("\n" + "=" * 60)
print("📊 DIAGNOSIS COMPLETE")
print("=" * 60)

db.close()