"""
Update manager names to Hebrew in the database
"""
from app.db.base import SessionLocal
from app.models.user import User

def update_manager_names():
    """Update manager full names to Hebrew"""
    db = SessionLocal()

    name_updates = {
        "harel@giraffe.co.il": "הראל",
        "hemi@giraffe.co.il": "המי",
        "pini@giraffe.co.il": "פיני",
        "ella@giraffe.co.il": "אלה",
        "ori@giraffe.co.il": "אורי",
        "chen@giraffe.co.il": "חן",
    }

    for email, new_name in name_updates.items():
        user = db.query(User).filter(User.email == email).first()
        if user:
            old_name = user.full_name
            user.full_name = new_name
            print(f"✅ Updated {email}: '{old_name}' → '{new_name}'")
        else:
            print(f"⚠️  User not found: {email}")

    db.commit()
    db.close()
    print("\n✅ All manager names updated!")

if __name__ == "__main__":
    update_manager_names()
