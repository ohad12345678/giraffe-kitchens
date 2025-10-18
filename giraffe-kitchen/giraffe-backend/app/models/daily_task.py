"""
Daily Task Model - משימות יומיות
"""
from sqlalchemy import Column, Integer, String, Date, Boolean, ForeignKey, DateTime, Text, Enum as SQLEnum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum

from app.db.base import Base


class TaskType(str, enum.Enum):
    """סוג משימה"""
    DISH_CHECK = "DISH_CHECK"  # בדיקת מנה
    RECIPE_REVIEW = "RECIPE_REVIEW"  # עבור על מתכון


class TaskFrequency(str, enum.Enum):
    """תדירות משימה"""
    ONCE = "ONCE"  # חד פעמי
    DAILY = "DAILY"  # יומי
    WEEKLY = "WEEKLY"  # שבועי


class DailyTask(Base):
    """
    משימה יומית שנוצרת על ידי HQ
    """
    __tablename__ = "daily_tasks"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)  # כותרת המשימה
    description = Column(Text, nullable=True)  # תיאור מפורט
    task_type = Column(SQLEnum(TaskType), nullable=False)  # סוג משימה

    # קישור למנה (אופציונלי)
    dish_id = Column(Integer, ForeignKey("dishes.id"), nullable=True)
    dish = relationship("Dish")

    # תדירות
    frequency = Column(SQLEnum(TaskFrequency), nullable=False, default=TaskFrequency.ONCE)

    # תאריכים
    start_date = Column(Date, nullable=False)  # תאריך התחלה
    end_date = Column(Date, nullable=True)  # תאריך סיום (לחד פעמי או משימות מוגבלות בזמן)

    # האם המשימה פעילה
    is_active = Column(Boolean, default=True)

    # מטא-דאטה
    created_at = Column(DateTime, default=datetime.utcnow)
    created_by_user_id = Column(Integer, ForeignKey("users.id"))
    created_by = relationship("User")

    def __repr__(self):
        return f"<DailyTask {self.title} ({self.task_type.value})>"


class TaskAssignment(Base):
    """
    הקצאת משימה לסניף - מייצג השלמה של משימה ע"י סניף ספציפי ביום ספציפי
    """
    __tablename__ = "task_assignments"

    id = Column(Integer, primary_key=True, index=True)

    # קישור למשימה ולסניף
    task_id = Column(Integer, ForeignKey("daily_tasks.id"), nullable=False)
    task = relationship("DailyTask")

    branch_id = Column(Integer, ForeignKey("branches.id"), nullable=False)
    branch = relationship("Branch")

    # תאריך המשימה הספציפי (למשימות חוזרות יהיו מספר assignments)
    task_date = Column(Date, nullable=False)

    # סטטוס השלמה
    is_completed = Column(Boolean, default=False)
    completed_at = Column(DateTime, nullable=True)
    completed_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    completed_by = relationship("User")

    # הערות
    notes = Column(Text, nullable=True)

    # אם המשימה קשורה לבדיקה ספציפית
    check_id = Column(Integer, ForeignKey("dish_checks.id"), nullable=True)
    check = relationship("DishCheck")

    created_at = Column(DateTime, default=datetime.utcnow)

    def __repr__(self):
        status = "✓" if self.is_completed else "○"
        return f"<TaskAssignment {status} Task#{self.task_id} Branch#{self.branch_id} {self.task_date}>"
