"""
Pydantic schemas for Sanitation Audits

These schemas validate data coming from the frontend and structure API responses.
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from app.models.sanitation_audit import AuditStatus


# ===== Category Schemas =====

class SanitationAuditCategoryBase(BaseModel):
    """Base schema for a single category in the audit."""
    category_name: str = Field(..., description="Display name of the category")
    category_key: str = Field(..., description="Programmatic key for the category")
    status: str = Field(default="תקין", description="Status of the category")
    notes: Optional[str] = Field(None, description="Detailed notes about findings")
    score_deduction: float = Field(default=0.0, ge=0, le=10, description="Points deducted (0-10)")
    check_performed: Optional[bool] = Field(None, description="Whether a specific check was performed")
    check_name: Optional[str] = Field(None, description="Name of the check if applicable")
    image_urls: Optional[List[str]] = Field(default=[], description="List of image URLs")


class SanitationAuditCategoryCreate(SanitationAuditCategoryBase):
    """Schema for creating a new category (part of audit creation)."""
    pass


class SanitationAuditCategoryUpdate(BaseModel):
    """Schema for updating a category."""
    status: Optional[str] = None
    notes: Optional[str] = None
    score_deduction: Optional[float] = Field(None, ge=0, le=10)
    check_performed: Optional[bool] = None
    check_name: Optional[str] = None
    image_urls: Optional[List[str]] = None


class SanitationAuditCategoryResponse(SanitationAuditCategoryBase):
    """Schema for category in API responses."""
    id: int
    audit_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ===== Audit Schemas =====

class SanitationAuditBase(BaseModel):
    """Base schema for sanitation audit."""
    branch_id: int
    audit_date: datetime
    start_time: datetime
    auditor_name: str = Field(..., description="Name of the HQ auditor")
    accompanist_name: Optional[str] = Field(None, description="Name of branch staff who accompanied")
    general_notes: Optional[str] = None
    equipment_issues: Optional[str] = None


class SanitationAuditCreate(SanitationAuditBase):
    """Schema for creating a new sanitation audit."""
    categories: List[SanitationAuditCategoryCreate] = Field(default=[], description="List of audit categories")


class SanitationAuditUpdate(BaseModel):
    """Schema for updating an existing audit."""
    end_time: Optional[datetime] = None
    accompanist_name: Optional[str] = None
    general_notes: Optional[str] = None
    equipment_issues: Optional[str] = None
    status: Optional[AuditStatus] = None
    signature_url: Optional[str] = None


class SanitationAuditResponse(SanitationAuditBase):
    """Schema for audit in API responses."""
    id: int
    auditor_id: int
    end_time: Optional[datetime] = None
    total_score: float
    total_deductions: float
    status: AuditStatus
    deficiencies_summary: Optional[str] = None
    signature_url: Optional[str] = None
    signed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    # Include categories in response
    categories: List[SanitationAuditCategoryResponse] = []

    class Config:
        from_attributes = True


class SanitationAuditSummary(BaseModel):
    """Simplified schema for audit list view."""
    id: int
    branch_id: int
    branch_name: str
    audit_date: datetime
    auditor_name: str
    total_score: float
    total_deductions: float
    status: AuditStatus
    created_at: datetime

    class Config:
        from_attributes = True


# ===== Analytics Schemas =====

class BranchAuditStats(BaseModel):
    """Statistics for a specific branch."""
    branch_id: int
    branch_name: str
    total_audits: int
    average_score: float
    latest_score: Optional[float] = None
    score_trend: str = Field(..., description="improving, declining, or stable")
    common_issues: List[str] = Field(default=[], description="Most common deficiencies")


class NetworkAuditStats(BaseModel):
    """Network-wide statistics for HQ dashboard."""
    total_audits: int
    network_average_score: float
    best_performing_branch: Optional[BranchAuditStats] = None
    worst_performing_branch: Optional[BranchAuditStats] = None
    branch_stats: List[BranchAuditStats] = []
    common_issues_network: List[str] = Field(default=[], description="Most common issues across network")


class AuditInsights(BaseModel):
    """AI-generated insights for an audit or branch."""
    audit_id: Optional[int] = None
    branch_id: int
    summary: str = Field(..., description="Brief summary of findings")
    critical_issues: List[str] = Field(default=[], description="Issues requiring immediate attention")
    recommendations: List[str] = Field(default=[], description="Actionable recommendations")
    comparison_to_network: Optional[str] = Field(None, description="How this branch compares to others")
    generated_at: datetime = Field(default_factory=datetime.utcnow)
