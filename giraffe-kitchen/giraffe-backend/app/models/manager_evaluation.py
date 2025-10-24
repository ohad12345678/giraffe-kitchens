"""
Manager Evaluation Models

These models represent performance evaluations for restaurant managers in the Giraffe chain.
Each evaluation assesses multiple aspects of management performance including operations,
people management, business results, and leadership.
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Float, Boolean, Enum, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.db.base import Base


class EvaluationStatus(str, enum.Enum):
    """Status of the evaluation."""
    DRAFT = "draft"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    REVIEWED = "reviewed"
    APPROVED = "approved"


class PerformanceLevel(str, enum.Enum):
    """Performance level categories."""
    OUTSTANDING = "outstanding"  # 90-100
    EXCEEDS_EXPECTATIONS = "exceeds_expectations"  # 80-89
    MEETS_EXPECTATIONS = "meets_expectations"  # 70-79
    NEEDS_IMPROVEMENT = "needs_improvement"  # 60-69
    DOES_NOT_MEET = "does_not_meet"  # Below 60


class ManagerEvaluation(Base):
    """
    Main manager evaluation report.

    Contains comprehensive assessment of manager performance across multiple dimensions.
    """
    __tablename__ = "manager_evaluations"

    id = Column(Integer, primary_key=True, index=True)

    # Relationships
    branch_id = Column(Integer, ForeignKey("branches.id"), nullable=False)
    manager_id = Column(Integer, ForeignKey("users.id"), nullable=False)  # Manager being evaluated
    evaluator_id = Column(Integer, ForeignKey("users.id"), nullable=False)  # HQ user conducting evaluation

    # Evaluation period
    evaluation_period_start = Column(DateTime, nullable=False)
    evaluation_period_end = Column(DateTime, nullable=False)
    evaluation_date = Column(DateTime, nullable=False, default=datetime.utcnow)

    # People involved
    manager_name = Column(String(200), nullable=False)
    evaluator_name = Column(String(200), nullable=False)
    evaluator_role = Column(String(100), nullable=False)  # e.g., "Area Manager", "Operations Director"

    # Overall scoring (weighted average)
    total_score = Column(Float, nullable=False, default=0.0)  # 0-100
    performance_level = Column(
        Enum(PerformanceLevel, name='performancelevel', native_enum=True,
             values_callable=lambda x: [e.value for e in x]),
        nullable=True
    )

    # Category scores (each out of 100)
    operational_management_score = Column(Float, nullable=True)  # 35% weight
    people_management_score = Column(Float, nullable=True)  # 30% weight
    business_performance_score = Column(Float, nullable=True)  # 25% weight
    leadership_score = Column(Float, nullable=True)  # 10% weight

    # Detailed subcategory scores (stored as JSON for flexibility)
    detailed_scores = Column(JSON, nullable=True)
    """
    Example structure:
    {
        "operational": {
            "sanitation_safety": 85,
            "inventory_costs": 72,
            "product_quality": 88,
            "maintenance": 90
        },
        "people": {
            "recruitment_training": 75,
            "scheduling": 80,
            "retention_climate": 65
        },
        "business": {
            "sales_profitability": 92,
            "operational_efficiency": 78
        },
        "leadership": {
            "initiative": 85,
            "problem_solving": 80,
            "communication": 88,
            "development": 75,
            "values_alignment": 90
        }
    }
    """

    # Network comparison
    network_average_comparison = Column(JSON, nullable=True)  # Comparison to chain averages

    # Written assessments
    executive_summary = Column(Text, nullable=True)
    strengths_summary = Column(Text, nullable=True)
    improvement_areas_summary = Column(Text, nullable=True)

    # Development plan (IDP)
    development_goals = Column(JSON, nullable=True)  # Array of goals with timelines
    required_training = Column(JSON, nullable=True)  # List of recommended training programs

    # Management recommendations
    promotion_potential = Column(String(50), nullable=True)  # "ready_now", "1_year", "2_years", "not_ready"
    management_notes = Column(Text, nullable=True)  # Confidential notes for senior management

    # Next period goals
    next_period_goals = Column(JSON, nullable=True)

    # AI Analysis
    ai_analysis = Column(Text, nullable=True)  # AI-generated comprehensive analysis
    ai_analysis_generated_at = Column(DateTime, nullable=True)

    # Status
    status = Column(
        Enum(EvaluationStatus, name='evaluationstatus', native_enum=True,
             values_callable=lambda x: [e.value for e in x]),
        default=EvaluationStatus.DRAFT
    )

    # Signatures and approvals
    manager_acknowledged = Column(Boolean, default=False)
    manager_acknowledged_at = Column(DateTime, nullable=True)
    manager_comments = Column(Text, nullable=True)

    approved_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    approved_at = Column(DateTime, nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    branch = relationship("Branch", back_populates="manager_evaluations")
    manager = relationship("User", foreign_keys=[manager_id], back_populates="evaluations_received")
    evaluator = relationship("User", foreign_keys=[evaluator_id], back_populates="evaluations_conducted")
    approved_by = relationship("User", foreign_keys=[approved_by_id])
    categories = relationship("EvaluationCategory", back_populates="evaluation", cascade="all, delete-orphan")


class EvaluationCategory(Base):
    """
    Individual category details within a manager evaluation.

    Stores detailed assessment for each evaluation category with specific metrics and notes.
    """
    __tablename__ = "evaluation_categories"

    id = Column(Integer, primary_key=True, index=True)

    # Relationship
    evaluation_id = Column(Integer, ForeignKey("manager_evaluations.id"), nullable=False)

    # Category identification
    category_name = Column(String(200), nullable=False)  # e.g., "ניהול תפעולי"
    category_key = Column(String(100), nullable=False)  # e.g., "operational_management"
    subcategory_name = Column(String(200), nullable=True)  # e.g., "תברואה ובטיחות מזון"
    subcategory_key = Column(String(100), nullable=True)  # e.g., "sanitation_safety"

    # Scoring
    score = Column(Float, nullable=False)  # 0-100
    weight = Column(Float, nullable=False)  # Weight in category (e.g., 0.10 for 10%)

    # Assessment details
    specific_achievements = Column(Text, nullable=True)  # What was done well
    improvement_areas = Column(Text, nullable=True)  # What needs improvement

    # Metrics and evidence
    metrics = Column(JSON, nullable=True)  # Specific KPIs and their values
    """
    Example:
    {
        "waste_percentage": 2.8,
        "sanitation_scores": [85, 88, 92, 87],
        "customer_complaints": 3,
        "mystery_shopper_score": 88
    }
    """

    # Action items
    action_items = Column(JSON, nullable=True)  # Specific actions to take

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    evaluation = relationship("ManagerEvaluation", back_populates="categories")