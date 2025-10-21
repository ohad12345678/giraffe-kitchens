from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Float, Text, Date
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base


class DishCheck(Base):
    """DishCheck model - quality control check for a dish."""

    __tablename__ = "dish_checks"

    id = Column(Integer, primary_key=True, index=True)

    # Foreign keys
    branch_id = Column(Integer, ForeignKey("branches.id"), nullable=False)
    dish_id = Column(Integer, ForeignKey("dishes.id"), nullable=True)  # Optional if manual
    dish_name_manual = Column(String, nullable=True)  # Manual entry if dish not in list
    chef_id = Column(Integer, ForeignKey("chefs.id"), nullable=True)  # Optional if typed manually
    chef_name_manual = Column(String, nullable=True)  # Manual entry if chef not in list
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)

    # Check data
    rating = Column(Float, nullable=False)  # e.g., 1-10 or 1-5
    comments = Column(Text, nullable=True)

    # Timestamps
    check_date = Column(Date, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    branch = relationship("Branch", back_populates="dish_checks")
    dish = relationship("Dish", back_populates="dish_checks")
    chef = relationship("Chef", back_populates="dish_checks")
    created_by_user = relationship("User", back_populates="dish_checks")
