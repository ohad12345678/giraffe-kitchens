"""
Script to create dummy dish checks for testing reports
"""
from datetime import date, timedelta
import random
from app.db.base import SessionLocal
from app.models.dish_check import DishCheck
from app.models.dish import Dish
from app.models.chef import Chef
from app.models.branch import Branch
from app.models.user import User

def create_dummy_checks():
    """Create dummy dish checks for the last 2 weeks"""
    db = SessionLocal()
    try:
        # Get all entities
        dishes = db.query(Dish).all()
        chefs = db.query(Chef).all()
        branches = db.query(Branch).all()
        users = db.query(User).all()

        if not dishes or not chefs or not branches or not users:
            print("❌ חסרים נתונים בסיסיים (מנות, שפים, סניפים או משתמשים)")
            return

        print(f"📊 נמצאו: {len(dishes)} מנות, {len(chefs)} שפים, {len(branches)} סניפים")

        # Delete existing checks
        deleted_count = db.query(DishCheck).delete()
        print(f"🗑️  נמחקו {deleted_count} בדיקות ישנות")

        # Create checks for the last 14 days
        today = date.today()
        checks_created = 0

        for days_ago in range(14):
            check_date = today - timedelta(days=days_ago)

            # Create 5-15 checks per day
            num_checks = random.randint(5, 15)

            for _ in range(num_checks):
                # Random selections
                dish = random.choice(dishes)
                chef = random.choice(chefs)
                branch = random.choice(branches)
                user = random.choice(users)

                # Rating score:
                # - 70% chance of good score (7-10)
                # - 20% chance of medium score (5-6)
                # - 10% chance of low score (3-4)
                rand = random.random()
                if rand < 0.7:
                    rating = random.randint(7, 10)
                elif rand < 0.9:
                    rating = random.randint(5, 6)
                else:
                    rating = random.randint(3, 4)

                # Random comments based on score
                comments_options = {
                    'high': ['מעולה!', 'איכות גבוהה', 'טעים מאוד', 'הכנה מושלמת', ''],
                    'medium': ['בסדר', 'טעים אבל יכול להיות טוב יותר', 'צריך שיפור קל', ''],
                    'low': ['לא טעים', 'איכות נמוכה', 'צריך שיפור דחוף', 'יותר מדי מלוח', 'לא טרי']
                }

                if rating >= 7:
                    comments = random.choice(comments_options['high'])
                elif rating >= 5:
                    comments = random.choice(comments_options['medium'])
                else:
                    comments = random.choice(comments_options['low'])

                check = DishCheck(
                    branch_id=branch.id,
                    dish_id=dish.id,
                    chef_id=chef.id,
                    check_date=check_date,
                    rating=rating,
                    comments=comments if comments else None,
                    created_by=user.id
                )

                db.add(check)
                checks_created += 1

        db.commit()
        print(f"✅ נוצרו {checks_created} בדיקות דמה")

        # Show summary
        print("\n📊 סיכום:")

        # This week vs last week
        week_start = today - timedelta(days=today.weekday())
        this_week = db.query(DishCheck).filter(DishCheck.check_date >= week_start).count()
        last_week = db.query(DishCheck).filter(
            DishCheck.check_date >= week_start - timedelta(days=7),
            DishCheck.check_date < week_start
        ).count()

        print(f"   השבוע: {this_week} בדיקות")
        print(f"   שבוע שעבר: {last_week} בדיקות")

        # Average scores
        from sqlalchemy import func
        avg_score = db.query(func.avg(DishCheck.rating)).scalar()
        print(f"   ממוצע איכות כללי: {round(float(avg_score), 1)}")

        # Weakest dish this week
        weakest = db.query(
            Dish.name,
            func.avg(DishCheck.rating).label('avg_score')
        ).join(
            DishCheck, DishCheck.dish_id == Dish.id
        ).filter(
            DishCheck.check_date >= week_start
        ).group_by(Dish.id, Dish.name).order_by(
            func.avg(DishCheck.rating).asc()
        ).first()

        if weakest:
            print(f"   מנה חלשה השבוע: {weakest.name} (ממוצע: {round(float(weakest.avg_score), 1)})")

        print("\n✅ הושלם בהצלחה!")

    except Exception as e:
        print(f"❌ שגיאה: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_dummy_checks()
