from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Float, Text, Date
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base


class ManagerEvaluation(Base):
    """ManagerEvaluation model - evaluation report for a restaurant manager."""

    __tablename__ = "manager_evaluations"

    id = Column(Integer, primary_key=True, index=True)

    # Foreign keys
    branch_id = Column(Integer, ForeignKey("branches.id"), nullable=False)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)

    # Manager info (manual entry, not linked to users)
    manager_name = Column(String, nullable=False)

    # Report metadata
    evaluation_date = Column(Date, nullable=False)
    general_comments = Column(Text, nullable=True)

    # AI-generated summary
    ai_summary = Column(Text, nullable=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    branch = relationship("Branch", back_populates="manager_evaluations")
    created_by_user = relationship("User", back_populates="manager_evaluations")
    categories = relationship("ManagerEvaluationCategory", back_populates="evaluation", cascade="all, delete-orphan")


class ManagerEvaluationCategory(Base):
    """Category within a manager evaluation (e.g., Operations, People Management, etc.)."""

    __tablename__ = "manager_evaluation_categories"

    id = Column(Integer, primary_key=True, index=True)
    evaluation_id = Column(Integer, ForeignKey("manager_evaluations.id"), nullable=False)

    # Category details
    category_name = Column(String, nullable=False)  # e.g., "תפעול", "ניהול אנשים"
    rating = Column(Float, nullable=False)  # Score for this category
    comments = Column(Text, nullable=True)  # Comments for this category

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    evaluation = relationship("ManagerEvaluation", back_populates="categories")
