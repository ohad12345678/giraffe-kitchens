from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base


class Dish(Base):
    """Dish model - master list of all dishes in the menu."""

    __tablename__ = "dishes"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, unique=True)  # e.g., "Hamburger", "Caesar Salad"
    category = Column(String, nullable=True)  # e.g., "Main", "Appetizer", "Dessert"
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    dish_checks = relationship("DishCheck", back_populates="dish")
