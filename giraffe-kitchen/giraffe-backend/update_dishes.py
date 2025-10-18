"""
Script to update all dishes in the database with the new menu
"""
from app.db.base import SessionLocal
from app.models.dish import Dish

# New dishes from the menu
NEW_DISHES = [
    # ראשונות
    {"name": "סלט אילנדי", "category": "ראשונות"},
    {"name": "סלט בריאות", "category": "ראשונות"},
    {"name": "סלט מלפפונים", "category": "ראשונות"},
    {"name": "בריוש טרטר ים", "category": "ראשונות"},
    {"name": "טרטר מיזו", "category": "ראשונות"},
    {"name": "סשימי סלמון", "category": "ראשונות"},
    {"name": "טוקיו סביצ'ה", "category": "ראשונות"},
    {"name": "סלט דג לבן", "category": "ראשונות"},
    {"name": "סלט מיסו סיזר", "category": "ראשונות"},

    # ראשונות חמות
    {"name": "קריספי שרימפס", "category": "ראשונות חמות"},
    {"name": "באן דג", "category": "ראשונות חמות"},
    {"name": "באן בשר", "category": "ראשונות חמות"},
    {"name": "באן עוף", "category": "ראשונות חמות"},
    {"name": "גיוזה", "category": "ראשונות חמות"},
    {"name": "בייבי דאמפלינג", "category": "ראשונות חמות"},
    {"name": "קלמרי מטוגן", "category": "ראשונות חמות"},
    {"name": "אגרול", "category": "ראשונות חמות"},

    # סושי
    {"name": "אוקינאווה הנד רול", "category": "סושי"},
    {"name": "ווג'י רול", "category": "סושי"},
    {"name": "ווג'י גרנדה", "category": "סושי"},
    {"name": "מאקי סלמון", "category": "סושי"},
    {"name": "דרגון קראנץ'", "category": "סושי"},
    {"name": "סלמון מאודה", "category": "סושי"},
    {"name": "שרימפס טמפורה", "category": "סושי"},
    {"name": "מאקי טונה", "category": "סושי"},
    {"name": "סלמון גרנדה", "category": "סושי"},
    {"name": "ספיישל ספייסי סלמון", "category": "סושי"},
    {"name": "ספייסי טונה", "category": "סושי"},
    {"name": "צ'יזו רול", "category": "סושי"},

    # אורז
    {"name": "צ'אזה", "category": "אורז"},
    {"name": "סינטה סצ'ואן", "category": "אורז"},
    {"name": "עוף בלימון", "category": "אורז"},
    {"name": "אפגנית", "category": "אורז"},
    {"name": "קארי כתום", "category": "אורז"},
    {"name": "אורז מטוגן", "category": "אורז"},
    {"name": "פילה סלמון", "category": "אורז"},

    # צ'יראשי
    {"name": "צ'יראשי סלמון מאודה", "category": "צ'יראשי"},
    {"name": "צ'יראשי סלמון", "category": "צ'יראשי"},
    {"name": "צ'יראשי טופו", "category": "צ'יראשי"},

    # ווק
    {"name": "המנה החריפה", "category": "ווק"},
    {"name": "סינטה נודלס", "category": "ווק"},
    {"name": "הקיסרית החדשה", "category": "ווק"},
    {"name": "פיליפינית", "category": "ווק"},
    {"name": "באטר נודלס", "category": "ווק"},
    {"name": "סלמון אודון", "category": "ווק"},
    {"name": "מלאזית", "category": "ווק"},
    {"name": "ביף רייס", "category": "ווק"},
    {"name": "פאד תאי קלאסי", "category": "ווק"},
    {"name": "פאד תאי חריף", "category": "ווק"},
    {"name": "אטריות שחורות", "category": "ווק"},

    # מרקים
    {"name": "מרק עדשים", "category": "מרקים"},
    {"name": "מרק תירס", "category": "מרקים"},
    {"name": "מרק תאילנדי", "category": "מרקים"},
]

def update_dishes():
    """Delete all existing dishes and add new ones"""
    db = SessionLocal()
    try:
        # Delete all existing dishes
        deleted_count = db.query(Dish).delete()
        print(f"🗑️  נמחקו {deleted_count} מנות ישנות")

        # Add new dishes
        for dish_data in NEW_DISHES:
            dish = Dish(**dish_data)
            db.add(dish)

        db.commit()
        print(f"✅ נוספו {len(NEW_DISHES)} מנות חדשות")

        # Print summary by category
        print("\n📊 סיכום לפי קטגוריות:")
        categories = {}
        for dish in NEW_DISHES:
            cat = dish['category']
            if cat not in categories:
                categories[cat] = 0
            categories[cat] += 1

        for cat, count in categories.items():
            print(f"   {cat}: {count} מנות")

        print(f"\n✅ סה\"כ: {len(NEW_DISHES)} מנות")

    except Exception as e:
        print(f"❌ שגיאה: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    update_dishes()
