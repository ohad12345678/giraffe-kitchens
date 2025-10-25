"""
Pydantic schemas for Manager Evaluations

These schemas validate data coming from the frontend and structure API responses.
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, date
from enum import Enum


class EvaluationStatus(str, Enum):
    """Status of a manager evaluation."""
    DRAFT = "draft"
    COMPLETED = "completed"
    REVIEWED = "reviewed"


# ===== Category Schemas =====

class ManagerEvaluationCategoryBase(BaseModel):
    """Base schema for a single category in the evaluation."""
    category_name: str = Field(..., description="Name of the evaluation category (e.g., תפעול, ניהול אנשים)")
    rating: float = Field(..., ge=0, le=10, description="Rating for this category (0-10)")
    comments: Optional[str] = Field(None, description="Detailed comments about this category")


class ManagerEvaluationCategoryCreate(ManagerEvaluationCategoryBase):
    """Schema for creating a new category (part of evaluation creation)."""
    pass


class ManagerEvaluationCategoryResponse(ManagerEvaluationCategoryBase):
    """Schema for category in API responses."""
    id: int
    evaluation_id: int
    created_at: datetime

    class Config:
        from_attributes = True


# ===== Evaluation Schemas =====

class ManagerEvaluationBase(BaseModel):
    """Base schema for manager evaluation."""
    branch_id: int
    manager_name: str = Field(..., description="Name of the manager being evaluated (manual entry)")
    evaluation_date: datetime
    general_comments: Optional[str] = Field(None, description="General comments about the manager")


class ManagerEvaluationCreate(ManagerEvaluationBase):
    """Schema for creating a new manager evaluation."""
    categories: List[ManagerEvaluationCategoryCreate] = Field(default=[], description="List of evaluation categories")


class ManagerEvaluationUpdate(BaseModel):
    """Schema for updating an existing evaluation."""
    manager_name: Optional[str] = None
    evaluation_date: Optional[datetime] = None
    general_comments: Optional[str] = None
    ai_summary: Optional[str] = None
    status: Optional[EvaluationStatus] = None


class ManagerEvaluationResponse(ManagerEvaluationBase):
    """Schema for evaluation in API responses."""
    id: int
    created_by: int
    overall_score: Optional[float] = None
    status: EvaluationStatus
    ai_summary: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    # Include categories in response
    categories: List[ManagerEvaluationCategoryResponse] = []

    class Config:
        from_attributes = True


class ManagerEvaluationSummary(BaseModel):
    """Simplified schema for evaluation list view."""
    id: int
    branch_id: int
    branch_name: str
    manager_name: str
    evaluation_date: datetime
    overall_score: Optional[float] = None
    status: EvaluationStatus
    created_by_name: str
    created_at: datetime

    class Config:
        from_attributes = True


# ===== AI Analysis Schemas =====

class ManagerEvaluationAIRequest(BaseModel):
    """Schema for requesting AI analysis/summary."""
    evaluation_id: int


class ManagerEvaluationAIResponse(BaseModel):
    """Schema for AI-generated summary response."""
    evaluation_id: int
    ai_summary: str
    generated_at: datetime = Field(default_factory=datetime.utcnow)


class ManagerEvaluationChatRequest(BaseModel):
    """Schema for chatbox questions about evaluations."""
    evaluation_id: int
    question: str = Field(..., min_length=1, description="User's question about the evaluation")


class ManagerEvaluationChatResponse(BaseModel):
    """Schema for chatbox AI responses."""
    evaluation_id: int
    question: str
    answer: str
    generated_at: datetime = Field(default_factory=datetime.utcnow)
