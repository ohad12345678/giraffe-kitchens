"""
Pydantic schemas for Manager Evaluation API endpoints.
"""
from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any
from datetime import datetime, date
from enum import Enum


class EvaluationStatus(str, Enum):
    """Evaluation status options."""
    DRAFT = "draft"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    REVIEWED = "reviewed"
    APPROVED = "approved"


class PerformanceLevel(str, Enum):
    """Performance level categories."""
    OUTSTANDING = "outstanding"  # 90-100
    EXCEEDS_EXPECTATIONS = "exceeds_expectations"  # 80-89
    MEETS_EXPECTATIONS = "meets_expectations"  # 70-79
    NEEDS_IMPROVEMENT = "needs_improvement"  # 60-69
    DOES_NOT_MEET = "does_not_meet"  # Below 60


class EvaluationCategoryBase(BaseModel):
    """Base schema for evaluation category."""
    category_name: str = Field(..., description="Category name in Hebrew")
    category_key: str = Field(..., description="Category key for programmatic access")
    subcategory_name: Optional[str] = Field(None, description="Subcategory name")
    subcategory_key: Optional[str] = Field(None, description="Subcategory key")
    score: float = Field(..., ge=0, le=100, description="Score from 0 to 100")
    weight: float = Field(..., ge=0, le=1, description="Weight in category")
    specific_achievements: Optional[str] = None
    improvement_areas: Optional[str] = None
    metrics: Optional[Dict[str, Any]] = None
    action_items: Optional[List[str]] = None


class EvaluationCategoryCreate(EvaluationCategoryBase):
    """Schema for creating evaluation category."""
    pass


class EvaluationCategoryUpdate(BaseModel):
    """Schema for updating evaluation category."""
    score: Optional[float] = Field(None, ge=0, le=100)
    specific_achievements: Optional[str] = None
    improvement_areas: Optional[str] = None
    metrics: Optional[Dict[str, Any]] = None
    action_items: Optional[List[str]] = None


class EvaluationCategoryInDB(EvaluationCategoryBase):
    """Schema for evaluation category from database."""
    id: int
    evaluation_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ManagerEvaluationBase(BaseModel):
    """Base schema for manager evaluation."""
    branch_id: int
    manager_id: int
    evaluation_period_start: date
    evaluation_period_end: date
    manager_name: str
    evaluator_name: str
    evaluator_role: str


class DetailedScores(BaseModel):
    """Detailed scores structure."""
    operational: Dict[str, float] = Field(default_factory=dict)
    people: Dict[str, float] = Field(default_factory=dict)
    business: Dict[str, float] = Field(default_factory=dict)
    leadership: Dict[str, float] = Field(default_factory=dict)


class DevelopmentGoal(BaseModel):
    """Development goal structure."""
    goal: str
    measurable: str
    actions: List[str]
    support_needed: str
    deadline: date
    milestone_date: Optional[date] = None


class ManagerEvaluationCreate(ManagerEvaluationBase):
    """Schema for creating manager evaluation."""
    operational_management_score: Optional[float] = Field(None, ge=0, le=100)
    people_management_score: Optional[float] = Field(None, ge=0, le=100)
    business_performance_score: Optional[float] = Field(None, ge=0, le=100)
    leadership_score: Optional[float] = Field(None, ge=0, le=100)

    detailed_scores: Optional[DetailedScores] = None

    executive_summary: Optional[str] = None
    strengths_summary: Optional[str] = None
    improvement_areas_summary: Optional[str] = None

    development_goals: Optional[List[DevelopmentGoal]] = None
    required_training: Optional[List[str]] = None

    promotion_potential: Optional[str] = Field(None, pattern="^(ready_now|1_year|2_years|not_ready)$")
    management_notes: Optional[str] = None

    next_period_goals: Optional[Dict[str, Any]] = None

    status: Optional[EvaluationStatus] = Field(default=EvaluationStatus.DRAFT)

    categories: Optional[List[EvaluationCategoryCreate]] = None


class ManagerEvaluationUpdate(BaseModel):
    """Schema for updating manager evaluation."""
    operational_management_score: Optional[float] = Field(None, ge=0, le=100)
    people_management_score: Optional[float] = Field(None, ge=0, le=100)
    business_performance_score: Optional[float] = Field(None, ge=0, le=100)
    leadership_score: Optional[float] = Field(None, ge=0, le=100)

    detailed_scores: Optional[DetailedScores] = None

    executive_summary: Optional[str] = None
    strengths_summary: Optional[str] = None
    improvement_areas_summary: Optional[str] = None

    development_goals: Optional[List[DevelopmentGoal]] = None
    required_training: Optional[List[str]] = None

    promotion_potential: Optional[str] = Field(None, pattern="^(ready_now|1_year|2_years|not_ready)$")
    management_notes: Optional[str] = None

    next_period_goals: Optional[Dict[str, Any]] = None

    status: Optional[EvaluationStatus] = None

    manager_comments: Optional[str] = None


class ManagerEvaluationInDB(ManagerEvaluationBase):
    """Schema for manager evaluation from database."""
    id: int
    evaluator_id: int
    evaluation_date: datetime

    total_score: float
    performance_level: Optional[PerformanceLevel]

    operational_management_score: Optional[float]
    people_management_score: Optional[float]
    business_performance_score: Optional[float]
    leadership_score: Optional[float]

    detailed_scores: Optional[Dict[str, Any]]
    network_average_comparison: Optional[Dict[str, Any]]

    executive_summary: Optional[str]
    strengths_summary: Optional[str]
    improvement_areas_summary: Optional[str]

    development_goals: Optional[List[Dict[str, Any]]]
    required_training: Optional[List[str]]

    promotion_potential: Optional[str]
    management_notes: Optional[str]

    next_period_goals: Optional[Dict[str, Any]]

    ai_analysis: Optional[str]
    ai_analysis_generated_at: Optional[datetime]

    status: EvaluationStatus

    manager_acknowledged: bool
    manager_acknowledged_at: Optional[datetime]
    manager_comments: Optional[str]

    approved_by_id: Optional[int]
    approved_at: Optional[datetime]

    created_at: datetime
    updated_at: datetime

    categories: Optional[List[EvaluationCategoryInDB]] = []

    class Config:
        from_attributes = True


class ManagerEvaluationList(BaseModel):
    """Schema for listing evaluations."""
    id: int
    branch_id: int
    branch_name: str
    manager_id: int
    manager_name: str
    evaluator_name: str
    evaluation_date: datetime
    evaluation_period_start: date
    evaluation_period_end: date
    total_score: float
    performance_level: Optional[PerformanceLevel]
    status: EvaluationStatus
    created_at: datetime

    class Config:
        from_attributes = True


class GenerateAIAnalysisRequest(BaseModel):
    """Request schema for generating AI analysis."""
    evaluation_id: int
    regenerate: bool = Field(default=False, description="Force regenerate even if analysis exists")


class GenerateAIAnalysisResponse(BaseModel):
    """Response schema for AI analysis generation."""
    evaluation_id: int
    ai_analysis: str
    generated_at: datetime
    status: str = Field(default="success")


class EvaluationFormData(BaseModel):
    """Schema for the evaluation form submission."""
    # Manager info
    manager_id: int
    manager_name: str
    branch_id: int

    # Evaluation period
    evaluation_period_start: date
    evaluation_period_end: date

    # Operational Management (35%)
    sanitation_safety_score: float = Field(..., ge=0, le=100)
    sanitation_notes: Optional[str] = None

    inventory_costs_score: float = Field(..., ge=0, le=100)
    waste_percentage: Optional[float] = None
    inventory_notes: Optional[str] = None

    product_quality_score: float = Field(..., ge=0, le=100)
    mystery_shopper_score: Optional[float] = None
    quality_notes: Optional[str] = None

    maintenance_score: float = Field(..., ge=0, le=100)
    maintenance_notes: Optional[str] = None

    # People Management (30%)
    recruitment_training_score: float = Field(..., ge=0, le=100)
    recruitment_notes: Optional[str] = None

    scheduling_score: float = Field(..., ge=0, le=100)
    scheduling_notes: Optional[str] = None

    retention_climate_score: float = Field(..., ge=0, le=100)
    turnover_rate: Optional[float] = None
    retention_notes: Optional[str] = None

    # Business Performance (25%)
    sales_profitability_score: float = Field(..., ge=0, le=100)
    sales_growth: Optional[float] = None
    sales_notes: Optional[str] = None

    operational_efficiency_score: float = Field(..., ge=0, le=100)
    labor_cost_percentage: Optional[float] = None
    efficiency_notes: Optional[str] = None

    # Leadership (10%)
    initiative_score: float = Field(..., ge=0, le=100)
    problem_solving_score: float = Field(..., ge=0, le=100)
    communication_score: float = Field(..., ge=0, le=100)
    development_score: float = Field(..., ge=0, le=100)
    values_alignment_score: float = Field(..., ge=0, le=100)
    leadership_notes: Optional[str] = None

    # Overall assessment
    strengths_summary: Optional[str] = None
    improvement_areas_summary: Optional[str] = None
    development_goals: Optional[List[DevelopmentGoal]] = None

    # Management recommendations
    promotion_potential: Optional[str] = Field(None, pattern="^(ready_now|1_year|2_years|not_ready)$")
    management_notes: Optional[str] = None

    @validator('evaluation_period_end')
    def validate_period(cls, v, values):
        """Ensure end date is after start date."""
        if 'evaluation_period_start' in values and v <= values['evaluation_period_start']:
            raise ValueError('תקופת ההערכה חייבת להסתיים אחרי תאריך ההתחלה')
        return v