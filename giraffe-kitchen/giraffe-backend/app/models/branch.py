from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base


class Branch(Base):
    """Branch model representing each restaurant location."""

    __tablename__ = "branches"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, unique=True)  # e.g., "Giraffe Tel Aviv"
    location = Column(String, nullable=True)  # e.g., "Dizengoff Center"
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    users = relationship("User", back_populates="branch")
    chefs = relationship("Chef", back_populates="branch")
    dish_checks = relationship("DishCheck", back_populates="branch")
    sanitation_audits = relationship("SanitationAudit", back_populates="branch")
    manager_evaluations = relationship("ManagerEvaluation", back_populates="branch")
