"""
Sanitation Audit Models

These models represent sanitation audit reports conducted by HQ staff at branches.
Each audit contains multiple categories that are inspected and scored.
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Float, Boolean, Enum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.db.base import Base


class AuditStatus(str, enum.Enum):
    """Status of the audit."""
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    REVIEWED = "reviewed"


class SanitationAudit(Base):
    """
    Main sanitation audit report.

    One audit = one visit to a branch by HQ staff.
    Contains header information and final score.
    """
    __tablename__ = "sanitation_audits"

    id = Column(Integer, primary_key=True, index=True)

    # Relationships
    branch_id = Column(Integer, ForeignKey("branches.id"), nullable=False)
    auditor_id = Column(Integer, ForeignKey("users.id"), nullable=False)  # HQ user who filled the report

    # Header information
    audit_date = Column(DateTime, nullable=False, default=datetime.utcnow)
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=True)

    # People involved
    auditor_name = Column(String(200), nullable=False)  # Name of HQ auditor
    accompanist_name = Column(String(200), nullable=True)  # Branch staff who accompanied

    # Scoring
    total_score = Column(Float, default=100.0)  # Starts at 100, deductions are made
    total_deductions = Column(Float, default=0.0)  # Sum of all deductions

    # Status
    status = Column(Enum(AuditStatus, name='auditstatus', native_enum=True, values_callable=lambda x: [e.value for e in x]), default=AuditStatus.IN_PROGRESS)

    # Summary
    general_notes = Column(Text, nullable=True)
    equipment_issues = Column(Text, nullable=True)
    deficiencies_summary = Column(Text, nullable=True)  # Auto-generated list of issues

    # Signature
    signature_url = Column(String(500), nullable=True)  # URL to signature image
    signed_at = Column(DateTime, nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    branch = relationship("Branch", back_populates="sanitation_audits")
    auditor = relationship("User", foreign_keys=[auditor_id])
    categories = relationship("SanitationAuditCategory", back_populates="audit", cascade="all, delete-orphan")


class SanitationAuditCategory(Base):
    """
    Individual category within a sanitation audit.

    Each audit has ~40 categories (e.g., "Meat Station", "Cold Room", "Dishwashing Area").
    Each category has notes, score deduction, and optional images.
    """
    __tablename__ = "sanitation_audit_categories"

    id = Column(Integer, primary_key=True, index=True)

    # Relationship
    audit_id = Column(Integer, ForeignKey("sanitation_audits.id"), nullable=False)

    # Category identification
    category_name = Column(String(200), nullable=False)  # e.g., "עמדת בשר" (Meat Station)
    category_key = Column(String(100), nullable=False)  # e.g., "meat_station" for programmatic access

    # Status
    status = Column(String(50), default="תקין")  # תקין (OK) or other status

    # Notes and findings
    notes = Column(Text, nullable=True)  # Detailed notes about findings

    # Scoring
    score_deduction = Column(Float, default=0.0)  # Points deducted (0-10)

    # Additional checks (for categories that require them)
    check_performed = Column(Boolean, default=None, nullable=True)  # e.g., "בדיקת טמפ מבוצע"
    check_name = Column(String(200), nullable=True)  # Name of the check

    # Images
    image_urls = Column(Text, nullable=True)  # JSON array of image URLs

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    audit = relationship("SanitationAudit", back_populates="categories")
