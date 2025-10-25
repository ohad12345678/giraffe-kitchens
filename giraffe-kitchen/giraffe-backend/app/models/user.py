from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.db.base import Base


class UserRole(str, enum.Enum):
    """User role enumeration."""
    HQ = "hq"  # HQ user - access to all branches
    BRANCH_MANAGER = "branch_manager"  # Branch manager - access to own branch only


class User(Base):
    """User model for authentication and authorization."""

    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    role = Column(Enum(UserRole), nullable=False, default=UserRole.BRANCH_MANAGER)
    branch_id = Column(Integer, ForeignKey("branches.id"), nullable=True)  # NULL for HQ users
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    branch = relationship("Branch", back_populates="users")
    dish_checks = relationship("DishCheck", back_populates="created_by_user")
    manager_evaluations = relationship("ManagerEvaluation", back_populates="created_by_user")
