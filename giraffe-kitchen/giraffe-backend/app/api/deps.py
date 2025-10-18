from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.db.base import get_db
from app.core.security import decode_access_token
from app.models.user import User, UserRole
from app.schemas.user import TokenData

security = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """Get current authenticated user from JWT token."""
    print(f"🔑 Backend: Received credentials: {credentials}")
    token = credentials.credentials
    print(f"🔑 Backend: Token (first 20 chars): {token[:20]}...")
    payload = decode_access_token(token)
    print(f"🔑 Backend: Decoded payload: {payload}")

    if payload is None:
        print("❌ Backend: Token decode failed!")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )

    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload"
        )

    # Convert user_id from string to int
    user = db.query(User).filter(User.id == int(user_id)).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )

    return user


def require_hq_role(current_user: User = Depends(get_current_user)) -> User:
    """Require HQ role for the current user."""
    if current_user.role != UserRole.HQ:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This action requires HQ role"
        )
    return current_user


def get_accessible_branch_ids(current_user: User = Depends(get_current_user)):
    """Get list of branch IDs that the current user can access."""
    if current_user.role == UserRole.HQ:
        return None  # HQ can access all branches
    return [current_user.branch_id]  # Branch manager can only access their branch
