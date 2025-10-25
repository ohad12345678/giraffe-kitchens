"""
User management endpoints - Admin only (ohadb@giraffe.co.il)
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel, EmailStr
from app.api import deps
from app.models.user import User, UserRole
from app.core.security import get_password_hash

router = APIRouter()


# Check if user is admin (only ohadb@giraffe.co.il)
def require_admin(current_user: User = Depends(deps.get_current_user)):
    if current_user.email != "ohadb@giraffe.co.il":
        raise HTTPException(status_code=403, detail="Only admin can access this endpoint")
    return current_user


class UserResponse(BaseModel):
    id: int
    email: str
    role: str
    branch_id: int | None
    created_at: str | None

    class Config:
        from_attributes = True


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    role: str  # "hq" or "branch_manager"
    branch_id: int | None = None


class UserUpdate(BaseModel):
    email: EmailStr | None = None
    role: str | None = None
    branch_id: int | None = None


class PasswordChange(BaseModel):
    new_password: str


@router.get("/", response_model=List[UserResponse])
def list_users(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(require_admin)
):
    """List all users - Admin only"""
    users = db.query(User).all()
    return [
        UserResponse(
            id=user.id,
            email=user.email,
            role=user.role.value,
            branch_id=user.branch_id,
            created_at=user.created_at.isoformat() if hasattr(user, 'created_at') and user.created_at else None
        )
        for user in users
    ]


@router.post("/", response_model=UserResponse)
def create_user(
    user_data: UserCreate,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(require_admin)
):
    """Create new user - Admin only"""

    # Check if user already exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="User with this email already exists")

    # Validate role
    if user_data.role not in ["hq", "branch_manager"]:
        raise HTTPException(status_code=400, detail="Invalid role. Must be 'hq' or 'branch_manager'")

    # Branch manager must have branch_id
    if user_data.role == "branch_manager" and not user_data.branch_id:
        raise HTTPException(status_code=400, detail="Branch manager must have a branch_id")

    # Create user
    new_user = User(
        email=user_data.email,
        password_hash=get_password_hash(user_data.password),
        role=UserRole.HQ if user_data.role == "hq" else UserRole.BRANCH_MANAGER,
        branch_id=user_data.branch_id
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return UserResponse(
        id=new_user.id,
        email=new_user.email,
        role=new_user.role.value,
        branch_id=new_user.branch_id,
        created_at=new_user.created_at.isoformat() if hasattr(new_user, 'created_at') and new_user.created_at else None
    )


@router.put("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    user_data: UserUpdate,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(require_admin)
):
    """Update user - Admin only"""

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Update fields
    if user_data.email:
        # Check if email is already taken by another user
        existing = db.query(User).filter(User.email == user_data.email, User.id != user_id).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email already taken")
        user.email = user_data.email

    if user_data.role:
        if user_data.role not in ["hq", "branch_manager"]:
            raise HTTPException(status_code=400, detail="Invalid role")
        user.role = UserRole.HQ if user_data.role == "hq" else UserRole.BRANCH_MANAGER

    if user_data.branch_id is not None:
        user.branch_id = user_data.branch_id

    db.commit()
    db.refresh(user)

    return UserResponse(
        id=user.id,
        email=user.email,
        role=user.role.value,
        branch_id=user.branch_id,
        created_at=user.created_at.isoformat() if hasattr(user, 'created_at') and user.created_at else None
    )


@router.put("/{user_id}/password")
def change_password(
    user_id: int,
    password_data: PasswordChange,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(require_admin)
):
    """Change user password - Admin only"""

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.password_hash = get_password_hash(password_data.new_password)
    db.commit()

    return {"status": "success", "message": "Password updated successfully"}


@router.delete("/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(require_admin)
):
    """Delete user - Admin only"""

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Prevent deleting yourself
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")

    db.delete(user)
    db.commit()

    return {"status": "success", "message": f"User {user.email} deleted successfully"}
