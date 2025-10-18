from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base


class Chef(Base):
    """Chef model - list of chefs per branch."""

    __tablename__ = "chefs"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    branch_id = Column(Integer, ForeignKey("branches.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    branch = relationship("Branch", back_populates="chefs")
    dish_checks = relationship("DishCheck", back_populates="chef")
