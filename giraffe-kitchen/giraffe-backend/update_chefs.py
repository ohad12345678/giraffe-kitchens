"""
Script to delete all generic chef names and add real Chinese chef names.
"""
from app.db.base import SessionLocal
from app.models.chef import Chef
from app.models.branch import Branch
from chefs_data import CHEFS_BY_BRANCH


def update_chefs():
    """Delete all existing chefs and add new Chinese chefs"""
    db = SessionLocal()
    try:
        # Delete ALL existing chefs
        deleted_count = db.query(Chef).delete()
        db.commit()
        print(f"🗑️  Deleted {deleted_count} old chef records")

        # Add real Chinese chef names from chefs_data.py
        branches = db.query(Branch).all()
        total_chefs = 0

        for branch in branches:
            if branch.name in CHEFS_BY_BRANCH:
                chef_names = CHEFS_BY_BRANCH[branch.name]
                print(f"\n📍 {branch.name}: Adding {len(chef_names)} chefs")

                for name in chef_names:
                    chef = Chef(
                        name=name,
                        branch_id=branch.id
                    )
                    db.add(chef)
                    total_chefs += 1
                    print(f"   ✓ {name}")
            else:
                print(f"\n⚠️  Warning: No chefs defined for {branch.name}")

        db.commit()
        print(f"\n✅ Successfully added {total_chefs} Chinese chefs across all branches")

        # Print summary by branch
        print("\n📊 Summary by branch:")
        for branch_name, chefs in CHEFS_BY_BRANCH.items():
            print(f"   {branch_name}: {len(chefs)} chefs")

    except Exception as e:
        print(f"❌ Error: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    update_chefs()
