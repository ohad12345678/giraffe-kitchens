"""Create 10 sample dish checks for testing."""
import sys
from datetime import datetime, timedelta
import random
from sqlalchemy.orm import Session
from app.db.base import SessionLocal, engine
from app.models.dish_check import DishCheck
from app.models.dish import Dish
from app.models.chef import Chef
from app.models.branch import Branch
from app.models.user import User


def create_sample_checks():
    """Create 10 sample dish checks with a mix of regular and manual entries."""
    db = SessionLocal()

    try:
        # Get existing data
        branches = db.query(Branch).all()
        dishes = db.query(Dish).all()
        chefs = db.query(Chef).all()
        users = db.query(User).all()

        if not branches or not users:
            print("❌ Error: No branches or users found. Please run seed_data.py first.")
            return

        print(f"📊 Found {len(branches)} branches, {len(dishes)} dishes, {len(chefs)} chefs")

        # Sample manual dishes and chefs
        manual_dishes = [
            "פסטה ארביאטה",
            "סלט יווני מיוחד",
            "מרק עוף ביתי",
            "שניצל פרגית",
            "בורקס גבינה"
        ]

        manual_chefs = [
            "יוסי כהן",
            "מירי לוי",
            "דני אברהם",
            "שרה גולן"
        ]

        # Create 10 diverse checks
        checks_created = 0
        today = datetime.now()

        for i in range(10):
            # Vary the check date (last 7 days)
            days_ago = random.randint(0, 7)
            check_date = today - timedelta(days=days_ago)

            # Randomly choose branch
            branch = random.choice(branches)

            # Randomly decide: regular dish or manual (60% regular, 40% manual)
            use_regular_dish = random.random() < 0.6 and len(dishes) > 0

            # Randomly decide: regular chef or manual (70% regular, 30% manual)
            use_regular_chef = random.random() < 0.7 and len(chefs) > 0

            # Prepare check data
            check_data = {
                "branch_id": branch.id,
                "created_by": users[0].id,  # Use first user (admin)
                "rating": round(random.uniform(5.0, 10.0), 1),  # Rating between 5-10
                "check_date": check_date,
            }

            # Add dish (regular or manual)
            if use_regular_dish:
                dish = random.choice(dishes)
                check_data["dish_id"] = dish.id
                dish_name = dish.name
            else:
                check_data["dish_id"] = None
                check_data["dish_name_manual"] = random.choice(manual_dishes)
                dish_name = check_data["dish_name_manual"]

            # Add chef (regular or manual)
            if use_regular_chef:
                # Filter chefs by branch if possible
                branch_chefs = [c for c in chefs if c.branch_id == branch.id]
                if branch_chefs:
                    chef = random.choice(branch_chefs)
                else:
                    chef = random.choice(chefs)
                check_data["chef_id"] = chef.id
                chef_name = chef.name
            else:
                check_data["chef_id"] = None
                check_data["chef_name_manual"] = random.choice(manual_chefs)
                chef_name = check_data["chef_name_manual"]

            # Add random comments (50% chance)
            if random.random() < 0.5:
                comments = [
                    "טעים מאוד!",
                    "צריך שיפור בתיבול",
                    "הצגה יפה אבל קצת קר",
                    "מושלם!",
                    "כמות קטנה מדי",
                    "איכותי ומוצג יפה",
                    "המלח עולה על הטעם",
                    "נהדר, ממשיכים ככה"
                ]
                check_data["comments"] = random.choice(comments)

            # Create the check
            new_check = DishCheck(**check_data)
            db.add(new_check)

            checks_created += 1
            print(f"✅ {checks_created}. בדיקה נוצרה: {dish_name} מאת {chef_name} - ציון {check_data['rating']} ({branch.name})")

        # Commit all checks
        db.commit()

        print(f"\n🎉 נוצרו {checks_created} בדיקות בהצלחה!")
        print(f"📅 בדיקות מפוזרות על פני 7 הימים האחרונים")

        # Print summary
        total_checks = db.query(DishCheck).count()
        print(f"\n📊 סה\"כ בדיקות במערכת: {total_checks}")

    except Exception as e:
        print(f"❌ Error: {e}")
        db.rollback()
        import traceback
        traceback.print_exc()
    finally:
        db.close()


if __name__ == "__main__":
    print("🔄 יוצר 10 בדיקות לדוגמה...")
    print("=" * 60)
    create_sample_checks()
