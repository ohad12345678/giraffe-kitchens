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

    # Create HQ user - Simple credentials
    hq_user = User(
        email="giraffe",
        password_hash=get_password_hash("giraffe123"),
        full_name="Ohad Banay (HQ)",
        role=UserRole.HQ,
        branch_id=None
    )

    existing = db.query(User).filter(User.email == hq_user.email).first()
    if not existing:
        db.add(hq_user)

    # Create one branch manager per branch - Simple credentials
    for branch in branches:
        branch_short = branch.name.lower().replace('giraffe ', '').replace(' ', '')
        manager = User(
            email=f"{branch_short}",
            password_hash=get_password_hash("giraffe123"),
            full_name=f"Manager - {branch.name}",
            role=UserRole.BRANCH_MANAGER,
            branch_id=branch.id
        )

        existing = db.query(User).filter(User.email == manager.email).first()
        if not existing:
            db.add(manager)

    db.commit()
    print("✅ Users seeded")


def seed_dishes(db):
    """Seed common dishes."""
    dishes = [
        # מנות - הקטגוריות יוגדרו מאוחר יותר
        Dish(name="סלט מלפפונים", category=None),
        Dish(name="סלט תאילנדי", category=None),
        Dish(name="סלט דג לבן", category=None),
        Dish(name="גיוזה", category=None),
        Dish(name="וון טון", category=None),
        Dish(name="צ'אזה", category=None),
        Dish(name="סינטה נודלס", category=None),
        Dish(name="אפגנית", category=None),
        Dish(name="סצ'ואן", category=None),
        Dish(name="פיליפינית", category=None),
        Dish(name="מלאכית", category=None),
        Dish(name="קארי דלעת", category=None),
    ]

    for dish in dishes:
        existing = db.query(Dish).filter(Dish.name == dish.name).first()
        if not existing:
            db.add(dish)

    db.commit()
    print("✅ Dishes seeded")


def seed_chefs(db):
    """Seed sample chefs for each branch."""
    branches = db.query(Branch).all()

    chef_names = ["David", "Sarah", "Michael", "Rachel", "Yossi"]

    for branch in branches:
        for name in chef_names:
            chef = Chef(
                name=name,
                branch_id=branch.id
            )
            db.add(chef)

    db.commit()
    print("✅ Chefs seeded")


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
        print("HQ User: giraffe / giraffe123")
        print("Branch Manager examples:")
        print("  - חיפה / giraffe123")
        print("  - הרצליה / giraffe123")
        print("  - לנדמרק / giraffe123")

    except Exception as e:
        print(f"❌ Error seeding database: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    main()
