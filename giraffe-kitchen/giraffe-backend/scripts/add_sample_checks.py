#!/usr/bin/env python3
"""
Add sample dish checks data for testing
"""
import sys
import os
from pathlib import Path
from datetime import date, timedelta
import random

# Setup path
backend_path = Path(__file__).parent.parent
sys.path.insert(0, str(backend_path))

# Set environment
os.environ['DATABASE_URL'] = 'postgresql://postgres:XQsIeIDggVHLaulnNkBCcHLLFHnrvuVW@crossover.proxy.rlwy.net:37015/railway?sslmode=prefer'

print("🔄 Adding sample dish checks...")

from app.db.base import SessionLocal
from app.models.dish_check import DishCheck
from app.models.dish import Dish
from app.models.chef import Chef
from app.models.branch import Branch
from app.models.user import User

db = SessionLocal()

try:
    # Get existing data
    dishes = db.query(Dish).all()
    chefs = db.query(Chef).all()
    branches = db.query(Branch).all()
    users = db.query(User).filter(User.role == 'HQ').all()

    if not dishes or not chefs or not branches:
        print("❌ Missing required data. Run seed_data.py first.")
        sys.exit(1)

    # Create sample checks
    comments = [
        "מצוין",
        "טעים מאוד",
        "בסדר",
        "צריך שיפור",
        "מושלם",
        "טוב",
        "ממוצע",
        "מעולה",
    ]

    checks_created = 0
    today = date.today()

    for days_ago in range(30):  # Last 30 days
        check_date = today - timedelta(days=days_ago)

        # Create 3-5 checks per day
        for _ in range(random.randint(3, 5)):
            check = DishCheck(
                branch_id=random.choice(branches).id,
                dish_id=random.choice(dishes).id,
                chef_id=random.choice(chefs).id,
                created_by=random.choice(users).id,
                rating=round(random.uniform(6.0, 10.0), 1),
                comments=random.choice(comments),
                check_date=check_date
            )
            db.add(check)
            checks_created += 1

    db.commit()
    print(f"✅ Added {checks_created} sample dish checks")

    # Verify
    total = db.query(DishCheck).count()
    recent = db.query(DishCheck).filter(
        DishCheck.check_date >= today - timedelta(days=7)
    ).count()

    print(f"📊 Total checks in database: {total}")
    print(f"📊 Checks in last 7 days: {recent}")

except Exception as e:
    print(f"❌ Error: {e}")
    db.rollback()
    import traceback
    traceback.print_exc()
finally:
    db.close()

print("✅ Done!")