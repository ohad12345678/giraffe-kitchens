"""
Script to update the HQ user email from giraffe@giraffe.com to ohadb@giraffe.co.il
"""
from app.db.base import SessionLocal
from app.models.user import User, UserRole
from app.core.security import get_password_hash


def update_hq_user():
    """Update HQ user email"""
    db = SessionLocal()
    try:
        # Find the old HQ user
        old_hq = db.query(User).filter(User.email == "giraffe@giraffe.com").first()

        if old_hq:
            print(f"Found old HQ user: {old_hq.email}")
            old_hq.email = "ohadb@giraffe.co.il"
            old_hq.password_hash = get_password_hash("123")
            db.commit()
            print(f"✅ Updated HQ user email to: ohadb@giraffe.co.il")
        else:
            # Create new HQ user if old one doesn't exist
            print("Old HQ user not found, creating new one...")
            new_hq = User(
                email="ohadb@giraffe.co.il",
                password_hash=get_password_hash("123"),
                full_name="Ohad Banay (HQ)",
                role=UserRole.HQ,
                branch_id=None
            )
            db.add(new_hq)
            db.commit()
            print(f"✅ Created new HQ user: ohadb@giraffe.co.il")

        print("\n📝 New Login Credentials:")
        print("HQ User: ohadb@giraffe.co.il / 123")

    except Exception as e:
        print(f"❌ Error: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    update_hq_user()
