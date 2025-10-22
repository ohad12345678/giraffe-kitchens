from sqlalchemy import Column, Integer, String, Float, Date, DateTime, ForeignKey, Text, Enum as SQLEnum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.db.base import Base


class ReviewStatus(str, enum.Enum):
    DRAFT = "draft"
    SUBMITTED = "submitted"
    COMPLETED = "completed"


class ReviewQuarter(str, enum.Enum):
    Q1 = "Q1"  # Jan-Mar
    Q2 = "Q2"  # Apr-Jun
    Q3 = "Q3"  # Jul-Sep
    Q4 = "Q4"  # Oct-Dec


class ManagerReview(Base):
    """
    Manager Performance Review - הערכת ביצועים למנהלי סניפים
    Reviews are conducted quarterly by HQ, Area Managers, or Branch Managers
    """
    __tablename__ = "manager_reviews"

    id = Column(Integer, primary_key=True, index=True)

    # Who is being reviewed
    manager_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # Optional - can be null if using manager_name
    manager_name = Column(String(255), nullable=True)  # Free text manager name - alternative to manager_id
    branch_id = Column(Integer, ForeignKey("branches.id"), nullable=False)

    # Who is conducting the review
    reviewer_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    # Review period
    year = Column(Integer, nullable=False)  # e.g., 2025
    quarter = Column(SQLEnum(ReviewQuarter), nullable=False)  # Q1, Q2, Q3, Q4
    review_date = Column(Date, nullable=False, default=datetime.now().date)

    # Status
    status = Column(SQLEnum(ReviewStatus), default=ReviewStatus.DRAFT, nullable=False)

    # ===== SCORES (0-100) =====

    # 1. Operational Management (35%)
    operational_score = Column(Float, nullable=True)  # Calculated weighted average
    sanitation_score = Column(Float, nullable=True)  # 10% - תברואה ובטיחות מזון
    sanitation_comments = Column(Text, nullable=True)
    inventory_score = Column(Float, nullable=True)  # 10% - ניהול מלאי ושליטה בעלויות
    inventory_comments = Column(Text, nullable=True)
    quality_score = Column(Float, nullable=True)  # 10% - איכות מוצר ושירות
    quality_comments = Column(Text, nullable=True)
    maintenance_score = Column(Float, nullable=True)  # 5% - תחזוקה וסדר
    maintenance_comments = Column(Text, nullable=True)

    # 2. People Management (30%)
    people_score = Column(Float, nullable=True)  # Calculated weighted average
    recruitment_score = Column(Float, nullable=True)  # 10% - גיוס והכשרה
    recruitment_comments = Column(Text, nullable=True)
    scheduling_score = Column(Float, nullable=True)  # 10% - ניהול משמרות ותזמון
    scheduling_comments = Column(Text, nullable=True)
    retention_score = Column(Float, nullable=True)  # 10% - אקלים ושימור עובדים
    retention_comments = Column(Text, nullable=True)

    # 3. Business Performance (25%)
    business_score = Column(Float, nullable=True)  # Calculated weighted average
    sales_score = Column(Float, nullable=True)  # 15% - מכירות ורווחיות
    sales_comments = Column(Text, nullable=True)
    efficiency_score = Column(Float, nullable=True)  # 10% - יעילות תפעולית
    efficiency_comments = Column(Text, nullable=True)

    # 4. Leadership & Personal Development (10%)
    leadership_score = Column(Float, nullable=True)  # 10% - מנהיגות והתפתחות אישית
    leadership_comments = Column(Text, nullable=True)

    # Overall weighted score (calculated from above)
    overall_score = Column(Float, nullable=True)

    # ===== AUTO-POPULATED DATA FROM SYSTEM =====
    auto_sanitation_avg = Column(Float, nullable=True)  # ממוצע ציוני תברואה מהמערכת
    auto_dish_checks_avg = Column(Float, nullable=True)  # ממוצע ציוני בדיקות מנות
    auto_sanitation_count = Column(Integer, nullable=True)  # מספר ביקורות תברואה בתקופה
    auto_dish_checks_count = Column(Integer, nullable=True)  # מספר בדיקות מנות בתקופה

    # ===== DEVELOPMENT PLAN (IDP) =====
    development_goals = Column(Text, nullable=True)  # JSON as text for SQLite: [{goal, actions, timeline, support}, ...]
    next_review_targets = Column(Text, nullable=True)  # JSON as text for SQLite: יעדים לתקופה הבאה

    # ===== AI ANALYSIS =====
    ai_analysis = Column(Text, nullable=True)  # JSON as text for SQLite: הדוח המלא שה-AI מייצר
    ai_summary = Column(Text, nullable=True)  # סיכום קצר

    # ===== METADATA =====
    created_at = Column(DateTime, default=datetime.now, nullable=False)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now, nullable=False)
    submitted_at = Column(DateTime, nullable=True)  # When status changed to SUBMITTED
    completed_at = Column(DateTime, nullable=True)  # When status changed to COMPLETED

    # ===== RELATIONSHIPS =====
    manager = relationship("User", foreign_keys=[manager_id], back_populates="reviews_received")
    reviewer = relationship("User", foreign_keys=[reviewer_id], back_populates="reviews_conducted")
    branch = relationship("Branch", back_populates="manager_reviews")


# Add to User model (will need to update user.py)
# reviews_received = relationship("ManagerReview", foreign_keys="ManagerReview.manager_id", back_populates="manager")
# reviews_conducted = relationship("ManagerReview", foreign_keys="ManagerReview.reviewer_id", back_populates="reviewer")

# Add to Branch model (will need to update branch.py)
# manager_reviews = relationship("ManagerReview", back_populates="branch")
