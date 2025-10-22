"""
Seed script to populate initial data for Giraffe Kitchens.
Run this after creating the database schema.
"""
from app.db.base import SessionLocal
from app.models.user import User, UserRole
from app.models.branch import Branch
from app.models.dish import Dish
from app.models.chef import Chef
from app.core.security import get_password_hash
from chefs_data import CHEFS_BY_BRANCH


def seed_branches(db):
    """Seed 9 branches."""
    branches = [
        Branch(name="Giraffe חיפה", location="חיפה"),
        Branch(name="Giraffe הרצליה", location="הרצליה"),
        Branch(name="Giraffe לנדמרק", location="תל אביב - לנדמרק"),
        Branch(name="Giraffe רמת החייל", location="תל אביב - רמת החייל"),
        Branch(name="Giraffe נס ציונה", location="נס ציונה"),
        Branch(name="Giraffe סביון", location="סביון"),
        Branch(name="Giraffe ראשון לציון", location="ראשון לציון"),
        Branch(name="Giraffe מודיעין", location="מודיעין"),
        Branch(name="Giraffe פתח תקווה", location="פתח תקווה"),
    ]

    for branch in branches:
        existing = db.query(Branch).filter(Branch.name == branch.name).first()
        if not existing:
            db.add(branch)

    db.commit()
    print("✅ Branches seeded")


def seed_users(db):
    """Seed HQ users and branch managers."""
    # Get all branches
    branches = db.query(Branch).all()
    branch_map = {branch.name: branch for branch in branches}

    # Create HQ users with real emails
    hq_users = [
        {"email": "ohadb@giraffe.co.il", "name": "Ohad Banay"},
        {"email": "nofar@giraffe.co.il", "name": "Nofar"},
        {"email": "aviv@giraffe.co.il", "name": "Aviv"},
        {"email": "alma@giraffe.co.il", "name": "Almog"},
        {"email": "talz@giraffe.co.il", "name": "Talz"},
        {"email": "avital@giraffe.co.il", "name": "Avital"},
    ]

    for user_data in hq_users:
        existing = db.query(User).filter(User.email == user_data["email"]).first()
        if not existing:
            hq_user = User(
                email=user_data["email"],
                password_hash=get_password_hash("123"),
                full_name=f"{user_data['name']} (HQ)",
                role=UserRole.HQ,
                branch_id=None
            )
            db.add(hq_user)

    # Create branch managers with real emails
    branch_managers = [
        {"email": "harel@giraffe.co.il", "name": "הראל", "branch": "Giraffe חיפה"},
        {"email": "hemi@giraffe.co.il", "name": "המי", "branch": "Giraffe רמת החייל"},
        {"email": "pini@giraffe.co.il", "name": "פיני", "branch": "Giraffe לנדמרק"},
        {"email": "ella@giraffe.co.il", "name": "אלה", "branch": "Giraffe נס ציונה"},
        {"email": "ori@giraffe.co.il", "name": "אורי", "branch": "Giraffe פתח תקווה"},
        {"email": "chen@giraffe.co.il", "name": "חן", "branch": "Giraffe פתח תקווה"},
    ]

    for manager_data in branch_managers:
        existing = db.query(User).filter(User.email == manager_data["email"]).first()
        if not existing:
            branch = branch_map.get(manager_data["branch"])
            if branch:
                manager = User(
                    email=manager_data["email"],
                    password_hash=get_password_hash("123"),
                    full_name=manager_data["name"],
                    role=UserRole.BRANCH_MANAGER,
                    branch_id=branch.id
                )
                db.add(manager)
            else:
                print(f"⚠️  Warning: Branch '{manager_data['branch']}' not found for {manager_data['name']}")

    # Create generic managers for branches without real users
    for branch in branches:
        has_manager = db.query(User).filter(
            User.branch_id == branch.id,
            User.role == UserRole.BRANCH_MANAGER
        ).first()

        if not has_manager:
            branch_short = branch.name.lower().replace('giraffe ', '').replace(' ', '')
            generic_manager = User(
                email=f"{branch_short}@giraffe.com",
                password_hash=get_password_hash("123"),
                full_name=f"Manager - {branch.name}",
                role=UserRole.BRANCH_MANAGER,
                branch_id=branch.id
            )
            existing = db.query(User).filter(User.email == generic_manager.email).first()
            if not existing:
                db.add(generic_manager)

    db.commit()
    print("✅ Users seeded")


def seed_dishes(db):
    """Seed common dishes."""
    dishes = [
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

    for dish_data in dishes:
        existing = db.query(Dish).filter(Dish.name == dish_data["name"]).first()
        if not existing:
            db.add(Dish(**dish_data))

    db.commit()
    print("✅ Dishes seeded")


def seed_chefs(db):
    """Seed real Chinese chefs for each branch from chefs_data.py"""
    branches = db.query(Branch).all()

    # First, delete all existing generic chefs
    deleted_count = db.query(Chef).delete()
    if deleted_count > 0:
        print(f"🗑️  Deleted {deleted_count} old generic chef names")

    # Add real Chinese chef names from chefs_data.py
    total_chefs = 0
    for branch in branches:
        if branch.name in CHEFS_BY_BRANCH:
            chef_names = CHEFS_BY_BRANCH[branch.name]
            for name in chef_names:
                existing = db.query(Chef).filter(
                    Chef.name == name,
                    Chef.branch_id == branch.id
                ).first()

                if not existing:
                    chef = Chef(
                        name=name,
                        branch_id=branch.id
                    )
                    db.add(chef)
                    total_chefs += 1
        else:
            print(f"⚠️  Warning: No chefs defined for {branch.name}")

    db.commit()
    print(f"✅ Seeded {total_chefs} Chinese chefs across all branches")


def main():
    """Run all seed functions."""
    db = SessionLocal()

    try:
        print("🌱 Starting database seeding...")
        seed_branches(db)
        seed_users(db)
        seed_dishes(db)
        seed_chefs(db)
        print("✅ Database seeding complete!")

        # Print login credentials
        print("\n📝 Login Credentials:")
        print("\n👔 HQ Users (all password: 123):")
        print("  - ohadb@giraffe.co.il")
        print("  - nofar@giraffe.co.il")
        print("  - aviv@giraffe.co.il")
        print("  - alma@giraffe.co.il")
        print("  - talz@giraffe.co.il")
        print("\n🏢 Branch Managers (all password: 123):")
        print("  - harel@giraffe.co.il (חיפה)")
        print("  - hemi@giraffe.co.il (רמת החייל)")
        print("  - pini@giraffe.co.il (לנדמרק)")
        print("  - ella@giraffe.co.il (נס ציונה)")
        print("  - ori@giraffe.co.il (פתח תקווה)")
        print("  - chen@giraffe.co.il (פתח תקווה)")

    except Exception as e:
        print(f"❌ Error seeding database: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    main()
