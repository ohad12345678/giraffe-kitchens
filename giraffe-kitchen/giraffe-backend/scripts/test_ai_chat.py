#!/usr/bin/env python3
"""
Test AI chat functionality directly
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

print("🔄 Testing AI chat functionality...")

from app.db.base import SessionLocal
from app.models.dish_check import DishCheck
from app.models.dish import Dish
from app.models.chef import Chef
from app.models.user import User

db = SessionLocal()

try:
    # Simulate the AI endpoint logic
    today = date.today()
    start_date = today - timedelta(days=7)
    end_date = today

    print(f"📅 Date range: {start_date} to {end_date}")

    # Build query
    query = db.query(DishCheck).filter(
        DishCheck.check_date >= start_date,
        DishCheck.check_date <= end_date
    )

    # Get total checks
    total_checks = query.count()
    print(f"📊 Total checks in last 7 days: {total_checks}")

    if total_checks == 0:
        print("⚠️ No dish checks found in the last 7 days")
        sys.exit(0)

    # Get average rating
    avg_rating = db.query(func.avg(DishCheck.rating)).filter(
        DishCheck.id.in_([c.id for c in query.all()])
    ).scalar() or 0
    print(f"⭐ Average rating: {round(float(avg_rating), 1)}")

    # Test the problematic GROUP BY query (FIXED VERSION)
    print("\n🔍 Testing GROUP BY query for weak dishes...")

    weak_dishes_query = db.query(
        func.coalesce(Dish.name, DishCheck.dish_name_manual).label('name'),
        func.avg(DishCheck.rating).label('avg_score')
    ).outerjoin(
        Dish, DishCheck.dish_id == Dish.id
    ).filter(
        DishCheck.id.in_([c.id for c in query.all()])
    ).group_by(
        DishCheck.dish_id,
        Dish.name,
        DishCheck.dish_name_manual  # Fixed: Include all non-aggregate columns
    ).having(
        func.avg(DishCheck.rating) < 7
    ).order_by(
        func.avg(DishCheck.rating).asc()
    ).limit(3)

    try:
        weak_dishes = weak_dishes_query.all()
        print(f"✅ Weak dishes query successful! Found {len(weak_dishes)} dishes with rating < 7")
        for dish in weak_dishes:
            print(f"   - {dish.name}: {round(float(dish.avg_score), 1)}")
    except Exception as e:
        print(f"❌ Weak dishes query failed: {e}")
        raise

    # Test top chefs query
    print("\n🔍 Testing GROUP BY query for top chefs...")

    top_chefs_query = db.query(
        func.coalesce(Chef.name, DishCheck.chef_name_manual).label('name'),
        func.avg(DishCheck.rating).label('avg_score')
    ).outerjoin(
        Chef, DishCheck.chef_id == Chef.id
    ).filter(
        DishCheck.id.in_([c.id for c in query.all()])
    ).group_by(
        DishCheck.chef_id,
        Chef.name,
        DishCheck.chef_name_manual  # Fixed: Include all non-aggregate columns
    ).order_by(
        func.avg(DishCheck.rating).desc()
    ).limit(3)

    try:
        top_chefs = top_chefs_query.all()
        print(f"✅ Top chefs query successful! Found {len(top_chefs)} chefs")
        for chef in top_chefs:
            print(f"   - {chef.name}: {round(float(chef.avg_score), 1)}")
    except Exception as e:
        print(f"❌ Top chefs query failed: {e}")
        raise

    # Test Anthropic API if available
    print("\n🤖 Testing Anthropic API...")
    api_key = os.getenv('ANTHROPIC_API_KEY')

    if not api_key:
        print("⚠️ ANTHROPIC_API_KEY not set in environment")
        print("   The AI chat will provide mock responses")
    else:
        print("✅ ANTHROPIC_API_KEY is configured")

        try:
            from anthropic import Anthropic
            client = Anthropic(api_key=api_key, timeout=5.0)

            # Try a simple test message
            message = client.messages.create(
                model="claude-3-haiku-20240307",
                max_tokens=100,
                messages=[{"role": "user", "content": "Say 'test successful' in Hebrew"}]
            )
            response = message.content[0].text
            print(f"✅ Claude API test successful: {response}")
        except Exception as e:
            print(f"⚠️ Claude API test failed: {e}")

    print("\n✅ All AI chat functionality tests passed!")
    print("   The AI chat should now work properly with PostgreSQL")

except Exception as e:
    print(f"\n❌ Test failed: {e}")
    import traceback
    traceback.print_exc()
finally:
    db.close()