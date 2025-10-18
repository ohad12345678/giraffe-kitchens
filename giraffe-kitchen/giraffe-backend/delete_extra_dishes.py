from app.db.base import SessionLocal
from app.models.dish import Dish

# רשימת המנות שצריך לשמור
DISHES_TO_KEEP = [
    "סלט מלפפונים",
    "סלט תאילנדי", 
    "סלט דג לבן",
    "גיוזה",
    "וון טון",
    "צ'אזה",
    "סינטה נודלס",
    "אפגנית",
    "סצ'ואן",
    "פיליפינית",
    "מלאכית",
    "קארי דלעת"
]

db = SessionLocal()

try:
    # מחק את כל המנות שלא ברשימה
    deleted = db.query(Dish).filter(~Dish.name.in_(DISHES_TO_KEEP)).delete(synchronize_session=False)
    db.commit()
    print(f"✅ נמחקו {deleted} מנות מיותרות")
    
    # הצג את המנות שנשארו
    remaining = db.query(Dish).all()
    print(f"\n📋 נשארו {len(remaining)} מנות:")
    for dish in remaining:
        print(f"  - {dish.name}")
        
finally:
    db.close()
