"""
Manager Reviews API
Separate module for manager performance reviews
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from typing import List, Optional
from datetime import datetime, date, timedelta
from pydantic import BaseModel, Field
import anthropic

from app.db.base import get_db
from app.core.config import settings
from app.models.manager_review import ManagerReview, ReviewStatus, ReviewQuarter
from app.models.user import User
from app.models.branch import Branch
from app.models.sanitation_audit import SanitationAudit, AuditStatus
from app.models.dish_check import DishCheck
from app.api.deps import get_current_user

router = APIRouter(prefix="/manager-reviews", tags=["manager-reviews"])

# Authorized users for manager reviews - SPECIFIC HQ USERS ONLY
# Only these 4 users can access manager performance reviews
AUTHORIZED_EMAILS = [
    "ohadb@giraffe.co.il",
    "nofar@giraffe.co.il",
    "aviv@giraffe.co.il",
    "avital@giraffe.co.il"
]

def check_manager_review_permission(current_user: User):
    """Check if user has permission to access manager reviews"""
    if current_user.email not in AUTHORIZED_EMAILS:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to access manager reviews"
        )
    return True


# ===== PYDANTIC SCHEMAS =====

class ReviewScoreInput(BaseModel):
    """Score input for a review category"""
    score: Optional[float] = Field(None, ge=0, le=100)
    comments: Optional[str] = None


class DevelopmentGoal(BaseModel):
    """Development goal for IDP"""
    goal: str
    actions: List[str]
    timeline: str
    support: str


class CreateReviewRequest(BaseModel):
    """Request to create a new manager review"""
    manager_name: str  # Free text manager name
    branch_id: int
    year: int
    quarter: ReviewQuarter
    status: Optional[str] = "draft"  # Allow setting status on creation

    # All score fields (optional on creation)
    sanitation_score: Optional[float] = None
    sanitation_comments: Optional[str] = None
    inventory_score: Optional[float] = None
    inventory_comments: Optional[str] = None
    quality_score: Optional[float] = None
    quality_comments: Optional[str] = None
    maintenance_score: Optional[float] = None
    maintenance_comments: Optional[str] = None

    recruitment_score: Optional[float] = None
    recruitment_comments: Optional[str] = None
    scheduling_score: Optional[float] = None
    scheduling_comments: Optional[str] = None
    retention_score: Optional[float] = None
    retention_comments: Optional[str] = None

    sales_score: Optional[float] = None
    sales_comments: Optional[str] = None
    efficiency_score: Optional[float] = None
    efficiency_comments: Optional[str] = None

    leadership_score: Optional[float] = None
    leadership_comments: Optional[str] = None

    ai_summary: Optional[str] = None


class UpdateReviewRequest(BaseModel):
    """Request to update review scores"""
    # Operational (35%)
    sanitation: Optional[ReviewScoreInput] = None
    inventory: Optional[ReviewScoreInput] = None
    quality: Optional[ReviewScoreInput] = None
    maintenance: Optional[ReviewScoreInput] = None

    # People (30%)
    recruitment: Optional[ReviewScoreInput] = None
    scheduling: Optional[ReviewScoreInput] = None
    retention: Optional[ReviewScoreInput] = None

    # Business (25%)
    sales: Optional[ReviewScoreInput] = None
    efficiency: Optional[ReviewScoreInput] = None

    # Leadership (10%)
    leadership: Optional[ReviewScoreInput] = None

    # IDP
    development_goals: Optional[List[DevelopmentGoal]] = None
    next_review_targets: Optional[dict] = None


class ReviewResponse(BaseModel):
    """Response model for a review"""
    id: int
    manager_id: int
    manager_name: str
    branch_id: int
    branch_name: str
    reviewer_id: int
    reviewer_name: str
    year: int
    quarter: str
    review_date: date
    status: str

    # Scores
    operational_score: Optional[float]
    people_score: Optional[float]
    business_score: Optional[float]
    leadership_score: Optional[float]
    overall_score: Optional[float]

    # Auto data
    auto_sanitation_avg: Optional[float]
    auto_dish_checks_avg: Optional[float]
    auto_sanitation_count: Optional[int]
    auto_dish_checks_count: Optional[int]

    # AI
    ai_summary: Optional[str]

    # Timestamps
    created_at: datetime
    updated_at: datetime
    submitted_at: Optional[datetime]
    completed_at: Optional[datetime]

    class Config:
        from_attributes = True


# ===== HELPER FUNCTIONS =====

def calculate_weighted_score(review: ManagerReview) -> float:
    """
    Calculate overall weighted score based on category weights:
    - Operational: 35%
    - People: 30%
    - Business: 25%
    - Leadership: 10%
    """
    scores = []
    weights = []

    # Operational (35%)
    if review.operational_score is not None:
        scores.append(review.operational_score)
        weights.append(0.35)

    # People (30%)
    if review.people_score is not None:
        scores.append(review.people_score)
        weights.append(0.30)

    # Business (25%)
    if review.business_score is not None:
        scores.append(review.business_score)
        weights.append(0.25)

    # Leadership (10%)
    if review.leadership_score is not None:
        scores.append(review.leadership_score)
        weights.append(0.10)

    if not scores:
        return 0.0

    # Calculate weighted average
    total_weight = sum(weights)
    weighted_sum = sum(s * w for s, w in zip(scores, weights))

    return round(weighted_sum / total_weight, 2) if total_weight > 0 else 0.0


def calculate_category_score(scores: List[Optional[float]], weights: List[float]) -> Optional[float]:
    """Calculate weighted average for a category"""
    valid_scores = [(s, w) for s, w in zip(scores, weights) if s is not None]

    if not valid_scores:
        return None

    total_weight = sum(w for _, w in valid_scores)
    weighted_sum = sum(s * w for s, w in valid_scores)

    return round(weighted_sum / total_weight, 2) if total_weight > 0 else None


def get_quarter_date_range(year: int, quarter: ReviewQuarter) -> tuple[date, date]:
    """Get start and end dates for a quarter"""
    quarter_map = {
        ReviewQuarter.Q1: (1, 3),
        ReviewQuarter.Q2: (4, 6),
        ReviewQuarter.Q3: (7, 9),
        ReviewQuarter.Q4: (10, 12)
    }

    start_month, end_month = quarter_map[quarter]
    start_date = date(year, start_month, 1)

    # Get last day of end month
    if end_month == 12:
        end_date = date(year, 12, 31)
    else:
        end_date = date(year, end_month + 1, 1) - timedelta(days=1)

    return start_date, end_date


def fetch_auto_data(branch_id: int, year: int, quarter: ReviewQuarter, db: Session) -> dict:
    """
    Fetch automatic data from system for the review period:
    - Average sanitation audit scores
    - Average dish check scores
    """
    start_date, end_date = get_quarter_date_range(year, quarter)

    # Get sanitation audit data
    sanitation_data = db.query(
        func.avg(SanitationAudit.total_score).label('avg_score'),
        func.count(SanitationAudit.id).label('count')
    ).filter(
        SanitationAudit.branch_id == branch_id,
        SanitationAudit.audit_date >= start_date,
        SanitationAudit.audit_date <= end_date,
        SanitationAudit.status == AuditStatus.COMPLETED
    ).first()

    # Get dish check data
    dish_check_data = db.query(
        func.avg(DishCheck.rating).label('avg_score'),
        func.count(DishCheck.id).label('count')
    ).filter(
        DishCheck.branch_id == branch_id,
        DishCheck.check_date >= start_date,
        DishCheck.check_date <= end_date
    ).first()

    return {
        'auto_sanitation_avg': round(float(sanitation_data.avg_score), 2) if sanitation_data.avg_score else None,
        'auto_sanitation_count': sanitation_data.count or 0,
        'auto_dish_checks_avg': round(float(dish_check_data.avg_score), 2) if dish_check_data.avg_score else None,
        'auto_dish_checks_count': dish_check_data.count or 0
    }


# ===== API ENDPOINTS =====

@router.post("/", response_model=ReviewResponse, status_code=status.HTTP_201_CREATED)
def create_review(
    request: CreateReviewRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new manager review - AUTHORIZED USERS ONLY"""

    # Check permissions
    check_manager_review_permission(current_user)

    # Validate branch exists
    branch = db.query(Branch).filter(Branch.id == request.branch_id).first()
    if not branch:
        raise HTTPException(status_code=404, detail="Branch not found")

    # Check if review already exists for this period (check by manager_name + branch)
    existing = db.query(ManagerReview).filter(
        ManagerReview.manager_name == request.manager_name,
        ManagerReview.branch_id == request.branch_id,
        ManagerReview.year == request.year,
        ManagerReview.quarter == request.quarter
    ).first()

    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Review already exists for {request.manager_name} - {request.quarter} {request.year}"
        )

    # Fetch auto data from system
    auto_data = fetch_auto_data(request.branch_id, request.year, request.quarter, db)

    # Calculate category scores
    operational_scores = [request.sanitation_score, request.inventory_score, request.quality_score, request.maintenance_score]
    operational_weights = [10, 10, 10, 5]
    operational_score = calculate_category_score(operational_scores, operational_weights)

    people_scores = [request.recruitment_score, request.scheduling_score, request.retention_score]
    people_weights = [10, 10, 10]
    people_score = calculate_category_score(people_scores, people_weights)

    business_scores = [request.sales_score, request.efficiency_score]
    business_weights = [15, 10]
    business_score = calculate_category_score(business_scores, business_weights)

    leadership_score = request.leadership_score

    # Create review
    review = ManagerReview(
        manager_id=None,  # No manager_id when using free text
        manager_name=request.manager_name,
        branch_id=request.branch_id,
        reviewer_id=current_user.id,
        year=request.year,
        quarter=request.quarter,
        review_date=date.today(),
        status=ReviewStatus(request.status) if request.status else ReviewStatus.DRAFT,

        # Scores
        sanitation_score=request.sanitation_score,
        sanitation_comments=request.sanitation_comments,
        inventory_score=request.inventory_score,
        inventory_comments=request.inventory_comments,
        quality_score=request.quality_score,
        quality_comments=request.quality_comments,
        maintenance_score=request.maintenance_score,
        maintenance_comments=request.maintenance_comments,

        recruitment_score=request.recruitment_score,
        recruitment_comments=request.recruitment_comments,
        scheduling_score=request.scheduling_score,
        scheduling_comments=request.scheduling_comments,
        retention_score=request.retention_score,
        retention_comments=request.retention_comments,

        sales_score=request.sales_score,
        sales_comments=request.sales_comments,
        efficiency_score=request.efficiency_score,
        efficiency_comments=request.efficiency_comments,

        leadership_score=request.leadership_score,
        leadership_comments=request.leadership_comments,

        # Category scores
        operational_score=operational_score,
        people_score=people_score,
        business_score=business_score,

        # AI summary
        ai_summary=request.ai_summary,

        **auto_data
    )

    # Calculate overall score
    review.overall_score = calculate_weighted_score(review)

    db.add(review)
    db.commit()
    db.refresh(review)

    # Prepare response
    return ReviewResponse(
        id=review.id,
        manager_id=review.manager_id if review.manager_id else 0,  # Return 0 if None
        manager_name=review.manager_name,
        branch_id=review.branch_id,
        branch_name=branch.name,
        reviewer_id=review.reviewer_id,
        reviewer_name=current_user.full_name,
        year=review.year,
        quarter=review.quarter.value,
        review_date=review.review_date,
        status=review.status.value,
        operational_score=review.operational_score,
        people_score=review.people_score,
        business_score=review.business_score,
        leadership_score=review.leadership_score,
        overall_score=review.overall_score,
        auto_sanitation_avg=review.auto_sanitation_avg,
        auto_dish_checks_avg=review.auto_dish_checks_avg,
        auto_sanitation_count=review.auto_sanitation_count,
        auto_dish_checks_count=review.auto_dish_checks_count
    )


@router.get("/", response_model=List[ReviewResponse])
def list_reviews(
    branch_id: Optional[int] = None,
    manager_id: Optional[int] = None,
    year: Optional[int] = None,
    quarter: Optional[ReviewQuarter] = None,
    status: Optional[ReviewStatus] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List manager reviews with optional filters - AUTHORIZED USERS ONLY"""

    # Check permissions
    check_manager_review_permission(current_user)

    query = db.query(ManagerReview)

    # Apply filters
    if branch_id:
        query = query.filter(ManagerReview.branch_id == branch_id)

    if manager_id:
        query = query.filter(ManagerReview.manager_id == manager_id)

    if year:
        query = query.filter(ManagerReview.year == year)

    if quarter:
        query = query.filter(ManagerReview.quarter == quarter)

    if status:
        query = query.filter(ManagerReview.status == status)

    # Branch managers can only see their own branch
    if current_user.role.value == "branch_manager":
        query = query.filter(ManagerReview.branch_id == current_user.branch_id)

    reviews = query.order_by(ManagerReview.created_at.desc()).all()

    # Format responses
    responses = []
    for review in reviews:
        # Use manager_name if available, otherwise try to get from User table
        if review.manager_name:
            manager_name = review.manager_name
        elif review.manager_id:
            manager = db.query(User).filter(User.id == review.manager_id).first()
            manager_name = manager.full_name if manager else "Unknown"
        else:
            manager_name = "Unknown"

        branch = db.query(Branch).filter(Branch.id == review.branch_id).first()
        reviewer = db.query(User).filter(User.id == review.reviewer_id).first()

        responses.append(ReviewResponse(
            id=review.id,
            manager_id=review.manager_id if review.manager_id else 0,
            manager_name=manager_name,
            branch_id=review.branch_id,
            branch_name=branch.name if branch else "Unknown",
            reviewer_id=review.reviewer_id,
            reviewer_name=reviewer.full_name if reviewer else "Unknown",
            year=review.year,
            quarter=review.quarter.value,
            review_date=review.review_date,
            status=review.status.value,
            operational_score=review.operational_score,
            people_score=review.people_score,
            business_score=review.business_score,
            leadership_score=review.leadership_score,
            overall_score=review.overall_score,
            auto_sanitation_avg=review.auto_sanitation_avg,
            auto_dish_checks_avg=review.auto_dish_checks_avg,
            auto_sanitation_count=review.auto_sanitation_count,
            auto_dish_checks_count=review.auto_dish_checks_count,
            ai_summary=review.ai_summary,
            created_at=review.created_at,
            updated_at=review.updated_at,
            submitted_at=review.submitted_at,
            completed_at=review.completed_at
        ))

    return responses


@router.get("/{review_id}", response_model=dict)
def get_review(
    review_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get detailed review by ID - HQ ONLY"""

    # Check permissions
    check_manager_review_permission(current_user)

    review = db.query(ManagerReview).filter(ManagerReview.id == review_id).first()

    if not review:
        raise HTTPException(status_code=404, detail="Review not found")

    # Check permissions
    if current_user.role.value == "branch_manager" and review.branch_id != current_user.branch_id:
        raise HTTPException(status_code=403, detail="Access denied")

    # Get related entities
    branch = db.query(Branch).filter(Branch.id == review.branch_id).first()
    reviewer = db.query(User).filter(User.id == review.reviewer_id).first()

    # Handle manager - could be either manager_id or manager_name
    if review.manager_name:
        manager_info = {"id": review.manager_id if review.manager_id else 0, "name": review.manager_name}
    elif review.manager_id:
        manager = db.query(User).filter(User.id == review.manager_id).first()
        manager_info = {"id": manager.id, "name": manager.full_name} if manager else None
    else:
        manager_info = None

    return {
        "id": review.id,
        "manager": manager_info,
        "branch": {"id": branch.id, "name": branch.name} if branch else None,
        "reviewer": {"id": reviewer.id, "name": reviewer.full_name} if reviewer else None,
        "year": review.year,
        "quarter": review.quarter.value,
        "review_date": review.review_date,
        "status": review.status.value,

        # Operational scores (35%)
        "operational": {
            "score": review.operational_score,
            "sanitation": {"score": review.sanitation_score, "comments": review.sanitation_comments},
            "inventory": {"score": review.inventory_score, "comments": review.inventory_comments},
            "quality": {"score": review.quality_score, "comments": review.quality_comments},
            "maintenance": {"score": review.maintenance_score, "comments": review.maintenance_comments},
        },

        # People scores (30%)
        "people": {
            "score": review.people_score,
            "recruitment": {"score": review.recruitment_score, "comments": review.recruitment_comments},
            "scheduling": {"score": review.scheduling_score, "comments": review.scheduling_comments},
            "retention": {"score": review.retention_score, "comments": review.retention_comments},
        },

        # Business scores (25%)
        "business": {
            "score": review.business_score,
            "sales": {"score": review.sales_score, "comments": review.sales_comments},
            "efficiency": {"score": review.efficiency_score, "comments": review.efficiency_comments},
        },

        # Leadership (10%)
        "leadership": {
            "score": review.leadership_score,
            "comments": review.leadership_comments,
        },

        "overall_score": review.overall_score,

        # Auto data
        "auto_data": {
            "sanitation_avg": review.auto_sanitation_avg,
            "sanitation_count": review.auto_sanitation_count,
            "dish_checks_avg": review.auto_dish_checks_avg,
            "dish_checks_count": review.auto_dish_checks_count,
        },

        # IDP
        "development_goals": review.development_goals,
        "next_review_targets": review.next_review_targets,

        # AI
        "ai_analysis": review.ai_analysis,
        "ai_summary": review.ai_summary,

        # Timestamps
        "created_at": review.created_at,
        "updated_at": review.updated_at,
        "submitted_at": review.submitted_at,
        "completed_at": review.completed_at,
    }


@router.put("/{review_id}")
def update_review(
    review_id: int,
    request: UpdateReviewRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update review scores and comments - HQ ONLY"""

    # Check permissions
    check_manager_review_permission(current_user)

    review = db.query(ManagerReview).filter(ManagerReview.id == review_id).first()

    if not review:
        raise HTTPException(status_code=404, detail="Review not found")

    # Check permissions
    if current_user.role.value == "branch_manager" and review.branch_id != current_user.branch_id:
        raise HTTPException(status_code=403, detail="Access denied")

    # Update operational scores
    if request.sanitation:
        review.sanitation_score = request.sanitation.score
        review.sanitation_comments = request.sanitation.comments

    if request.inventory:
        review.inventory_score = request.inventory.score
        review.inventory_comments = request.inventory.comments

    if request.quality:
        review.quality_score = request.quality.score
        review.quality_comments = request.quality.comments

    if request.maintenance:
        review.maintenance_score = request.maintenance.score
        review.maintenance_comments = request.maintenance.comments

    # Calculate operational category score (weighted)
    review.operational_score = calculate_category_score(
        [review.sanitation_score, review.inventory_score, review.quality_score, review.maintenance_score],
        [10, 10, 10, 5]  # weights
    )

    # Update people scores
    if request.recruitment:
        review.recruitment_score = request.recruitment.score
        review.recruitment_comments = request.recruitment.comments

    if request.scheduling:
        review.scheduling_score = request.scheduling.score
        review.scheduling_comments = request.scheduling.comments

    if request.retention:
        review.retention_score = request.retention.score
        review.retention_comments = request.retention.comments

    # Calculate people category score
    review.people_score = calculate_category_score(
        [review.recruitment_score, review.scheduling_score, review.retention_score],
        [10, 10, 10]
    )

    # Update business scores
    if request.sales:
        review.sales_score = request.sales.score
        review.sales_comments = request.sales.comments

    if request.efficiency:
        review.efficiency_score = request.efficiency.score
        review.efficiency_comments = request.efficiency.comments

    # Calculate business category score
    review.business_score = calculate_category_score(
        [review.sales_score, review.efficiency_score],
        [15, 10]
    )

    # Update leadership
    if request.leadership:
        review.leadership_score = request.leadership.score
        review.leadership_comments = request.leadership.comments

    # Update IDP
    if request.development_goals:
        review.development_goals = [goal.dict() for goal in request.development_goals]

    if request.next_review_targets:
        review.next_review_targets = request.next_review_targets

    # Calculate overall weighted score
    review.overall_score = calculate_weighted_score(review)

    db.commit()
    db.refresh(review)

    return {"message": "Review updated successfully", "overall_score": review.overall_score}


@router.post("/{review_id}/submit")
def submit_review(
    review_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Submit review (change status to SUBMITTED) - HQ ONLY"""

    # Check permissions
    check_manager_review_permission(current_user)

    review = db.query(ManagerReview).filter(ManagerReview.id == review_id).first()

    if not review:
        raise HTTPException(status_code=404, detail="Review not found")

    if review.status != ReviewStatus.DRAFT:
        raise HTTPException(status_code=400, detail="Only draft reviews can be submitted")

    review.status = ReviewStatus.SUBMITTED
    review.submitted_at = datetime.now()

    db.commit()

    return {"message": "Review submitted successfully"}


@router.post("/{review_id}/complete")
def complete_review(
    review_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Complete review (change status to COMPLETED) - HQ ONLY"""

    # Check permissions
    check_manager_review_permission(current_user)

    review = db.query(ManagerReview).filter(ManagerReview.id == review_id).first()

    if not review:
        raise HTTPException(status_code=404, detail="Review not found")

    if review.status != ReviewStatus.SUBMITTED:
        raise HTTPException(status_code=400, detail="Only submitted reviews can be completed")

    review.status = ReviewStatus.COMPLETED
    review.completed_at = datetime.now()

    db.commit()

    return {"message": "Review completed successfully"}


@router.delete("/{review_id}")
def delete_review(
    review_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a review (only drafts) - HQ ONLY"""

    # Check permissions
    check_manager_review_permission(current_user)

    review = db.query(ManagerReview).filter(ManagerReview.id == review_id).first()

    if not review:
        raise HTTPException(status_code=404, detail="Review not found")

    if review.status != ReviewStatus.DRAFT:
        raise HTTPException(status_code=400, detail="Only draft reviews can be deleted")

    db.delete(review)
    db.commit()

    return {"message": "Review deleted successfully"}


@router.get("/manager/{manager_id}/history")
def get_manager_review_history(
    manager_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get review history for a specific manager (for trend charts) - HQ ONLY"""

    # Check permissions
    check_manager_review_permission(current_user)

    reviews = db.query(ManagerReview).filter(
        ManagerReview.manager_id == manager_id,
        ManagerReview.overall_score.isnot(None)  # Only completed reviews with scores
    ).order_by(ManagerReview.year, ManagerReview.quarter).all()

    history = []
    for review in reviews:
        # Format quarter label
        quarter_labels = {
            ReviewQuarter.Q1: "Q1",
            ReviewQuarter.Q2: "Q2",
            ReviewQuarter.Q3: "Q3",
            ReviewQuarter.Q4: "Q4"
        }

        history.append({
            "id": review.id,
            "period": f"{quarter_labels.get(review.quarter, review.quarter)} {review.year}",
            "year": review.year,
            "quarter": review.quarter,
            "overall_score": review.overall_score,
            "operational_score": review.operational_score,
            "people_score": review.people_score,
            "business_score": review.business_score,
            "leadership_score": review.leadership_score,
            "auto_sanitation_avg": review.auto_sanitation_avg,
            "auto_dish_checks_avg": review.auto_dish_checks_avg
        })

    return {
        "manager_id": manager_id,
        "manager_name": reviews[0].manager.name if reviews else None,
        "history": history
    }


@router.get("/notifications")
def get_review_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get notifications for pending reviews and reviews due - HQ ONLY"""

    # Check permissions
    check_manager_review_permission(current_user)

    # Determine current quarter and year
    today = date.today()
    current_year = today.year
    current_month = today.month

    # Map month to quarter
    if current_month <= 3:
        current_quarter = ReviewQuarter.Q1
    elif current_month <= 6:
        current_quarter = ReviewQuarter.Q2
    elif current_month <= 9:
        current_quarter = ReviewQuarter.Q3
    else:
        current_quarter = ReviewQuarter.Q4

    # Get all branch managers - using correct role name
    from app.models.user import UserRole
    managers = db.query(User).filter(User.role == UserRole.BRANCH_MANAGER).all()

    notifications = {
        "pending_reviews": [],  # Reviews in draft/submitted status
        "missing_reviews": [],  # Managers without review for current quarter
        "total_count": 0
    }

    # Check for pending reviews (draft or submitted)
    pending = db.query(ManagerReview).filter(
        ManagerReview.status.in_([ReviewStatus.DRAFT, ReviewStatus.SUBMITTED])
    ).all()

    for review in pending:
        # Get manager name - handle both manager_name and manager relationship
        if review.manager_name:
            manager_name = review.manager_name
        elif review.manager_id and review.manager:
            manager_name = review.manager.full_name
        else:
            manager_name = "לא ידוע"

        notifications["pending_reviews"].append({
            "id": review.id,
            "manager_name": manager_name,
            "branch_name": review.branch.name if review.branch else "N/A",
            "status": review.status.value if hasattr(review.status, 'value') else review.status,
            "year": review.year,
            "quarter": review.quarter.value if hasattr(review.quarter, 'value') else review.quarter,
            "days_since_created": (today - review.created_at.date()).days if review.created_at else 0
        })

    # Check for missing reviews for current quarter
    for manager in managers:
        # Check if review exists for current quarter (by manager_id OR manager_name)
        existing_review = db.query(ManagerReview).filter(
            ManagerReview.manager_id == manager.id,
            ManagerReview.year == current_year,
            ManagerReview.quarter == current_quarter
        ).first()

        if not existing_review:
            notifications["missing_reviews"].append({
                "manager_id": manager.id,
                "manager_name": manager.full_name,
                "branch_id": manager.branch_id,
                "branch_name": manager.branch.name if manager.branch else "N/A",
                "quarter": current_quarter.value if hasattr(current_quarter, 'value') else current_quarter,
                "year": current_year
            })

    notifications["total_count"] = len(notifications["pending_reviews"]) + len(notifications["missing_reviews"])

    return notifications


class AIChatRequest(BaseModel):
    """Request for AI chat about a review"""
    messages: List[dict]


@router.post("/{review_id}/ai-chat")
def chat_with_ai_about_review(
    review_id: int,
    request: AIChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Chat with AI about a specific manager review - HQ ONLY"""

    # Check permissions
    check_manager_review_permission(current_user)

    # Get review
    review = db.query(ManagerReview).filter(ManagerReview.id == review_id).first()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")

    # Get API key
    api_key = settings.ANTHROPIC_API_KEY
    if not api_key:
        raise HTTPException(status_code=500, detail="AI service not configured")

    # Build context about the review
    # Get manager name - handle both manager_name and manager relationship
    if review.manager_name:
        manager_name = review.manager_name
    elif review.manager_id and review.manager:
        manager_name = review.manager.full_name
    else:
        manager_name = "לא ידוע"

    context = f"""
הנה מידע על הערכת הביצועים:

**מנהל:** {manager_name}
**סניף:** {review.branch.name}
**תקופה:** {review.quarter} {review.year}
**סטטוס:** {review.status}

**ציונים:**
- ציון כולל: {review.overall_score if review.overall_score else 'טרם הוערך'}
- תפעול (35%): {review.operational_score if review.operational_score else 'טרם הוערך'}
- אנשים (30%): {review.people_score if review.people_score else 'טרם הוערך'}
- עסקי (25%): {review.business_score if review.business_score else 'טרם הוערך'}
- מנהיגות (10%): {review.leadership_score if review.leadership_score else 'טרם הוערך'}

**נתונים אוטומטיים מהמערכת:**
- ממוצע תברואה: {review.auto_sanitation_avg if review.auto_sanitation_avg else 'אין נתונים'} ({review.auto_sanitation_count or 0} ביקורות)
- ממוצע בדיקות מנות: {review.auto_dish_checks_avg if review.auto_dish_checks_avg else 'אין נתונים'} ({review.auto_dish_checks_count or 0} בדיקות)

**פירוט ציוני תפעול:**
- תברואה: {review.sanitation_score or '-'}
- מלאי: {review.inventory_score or '-'}
- איכות מוצרים: {review.quality_score or '-'}
- תחזוקה: {review.maintenance_score or '-'}

**פירוט ציוני אנשים:**
- גיוס: {review.recruitment_score or '-'}
- שיבוץ: {review.scheduling_score or '-'}
- שימור עובדים: {review.retention_score or '-'}

**פירוט ציוני עסקי:**
- מכירות: {review.sales_score or '-'}
- יעילות: {review.efficiency_score or '-'}

**ציון מנהיגות:** {review.leadership_score or '-'}
"""

    # Create system prompt
    system_prompt = """אתה יועץ ארגוני מומחה המתמחה בהערכות ביצועים ופיתוח מנהלים בתחום המזון והמסעדנות.

תפקידך:
1. לנתח הערכות ביצועים של מנהלי סניפים
2. לזהות נקודות חוזק וחולשה
3. לתת המלצות ממוקדות לשיפור
4. לעזור בבניית תוכנית התפתחות אישית (IDP)
5. להציע דרכי פעולה קונקרטיות

כללים:
- תמיד ענה בעברית
- היה ממוקד ומעשי
- תן דוגמאות קונקרטיות מעולם המסעדנות
- התמקד בנושאים הרלוונטיים להערכה הספציפית
- השתמש בנתונים האוטומטיים מהמערכת לתמיכה בניתוח שלך
- כאשר הציונים נמוכים (מתחת ל-70), הצע צעדים ממשיים לשיפור
- כאשר הציונים גבוהים (מעל 85), הדגש חשיבות שמירה על הרמה והמשך התפתחות"""

    # Call Claude API
    try:
        client = anthropic.Anthropic(api_key=api_key)

        # Add context as first user message if this is the first message
        messages = request.messages.copy()
        if len(messages) == 1:
            messages[0]["content"] = f"{context}\n\n{messages[0]['content']}"

        response = client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=2000,
            system=system_prompt,
            messages=messages
        )

        return {
            "response": response.content[0].text,
            "model": response.model,
            "usage": {
                "input_tokens": response.usage.input_tokens,
                "output_tokens": response.usage.output_tokens
            }
        }

    except Exception as e:
        print(f"AI Error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"AI service error: {str(e)}")


@router.post("/{review_id}/generate-summary")
def generate_ai_summary(
    review_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Generate automatic AI summary for a review - HQ ONLY
    Creates a structured summary with: strengths, areas for improvement, recommendations, overall summary
    """
    # Check permissions
    check_manager_review_permission(current_user)

    # Get review
    review = db.query(ManagerReview).filter(ManagerReview.id == review_id).first()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")

    # Check if review has scores
    if not review.overall_score:
        raise HTTPException(status_code=400, detail="Cannot generate summary for review without scores. Please complete the review first.")

    # Get manager and branch info
    manager = db.query(User).filter(User.id == review.manager_id).first()
    branch = db.query(Branch).filter(Branch.id == review.branch_id).first()

    # Build context from review data
    context = f"""אתה מנהל אזור/מנהל תפעול ברשת מסעדות ג'ירף. עליך לנתח את הערכת הביצועים של {manager.full_name} - מנהל סניף {branch.name} לתקופה {review.quarter} {review.year}.

## נתוני ההערכה:

**ציון כולל משוקלל:** {review.overall_score:.1f}/100

### 1. ניהול תפעולי (35%) - ציון: {review.operational_score if review.operational_score else 'לא הוזן'}/100
- תברואה ובטיחות מזון ({review.sanitation_score if review.sanitation_score else 'לא הוזן'}): {review.sanitation_comments or 'אין הערות'}
- ניהול מלאי ושליטה בעלויות ({review.inventory_score if review.inventory_score else 'לא הוזן'}): {review.inventory_comments or 'אין הערות'}
- איכות מוצר ושירות ({review.quality_score if review.quality_score else 'לא הוזן'}): {review.quality_comments or 'אין הערות'}
- תחזוקה וסדר ({review.maintenance_score if review.maintenance_score else 'לא הוזן'}): {review.maintenance_comments or 'אין הערות'}

### 2. ניהול אנשים (30%) - ציון: {review.people_score if review.people_score else 'לא הוזן'}/100
- גיוס והכשרה ({review.recruitment_score if review.recruitment_score else 'לא הוזן'}): {review.recruitment_comments or 'אין הערות'}
- ניהול משמרות ({review.scheduling_score if review.scheduling_score else 'לא הוזן'}): {review.scheduling_comments or 'אין הערות'}
- אקלים ושימור עובדים ({review.retention_score if review.retention_score else 'לא הוזן'}): {review.retention_comments or 'אין הערות'}

### 3. ביצועים עסקיים (25%) - ציון: {review.business_score if review.business_score else 'לא הוזן'}/100
- מכירות ורווחיות ({review.sales_score if review.sales_score else 'לא הוזן'}): {review.sales_comments or 'אין הערות'}
- יעילות תפעולית ({review.efficiency_score if review.efficiency_score else 'לא הוזן'}): {review.efficiency_comments or 'אין הערות'}

### 4. מנהיגות (10%) - ציון: {review.leadership_score if review.leadership_score else 'לא הוזן'}/100
- הערות: {review.leadership_comments or 'אין הערות'}

**נתונים אוטומטיים מהמערכת:**
- ממוצע תברואה: {review.auto_sanitation_avg:.1f if review.auto_sanitation_avg else 'לא זמין'} ({review.auto_sanitation_count or 0} ביקורות)
- ממוצע בדיקות מנות: {review.auto_dish_checks_avg:.1f if review.auto_dish_checks_avg else 'לא זמין'} ({review.auto_dish_checks_count or 0} בדיקות)

---

צור סיכום מקיף עם 4 חלקים:

## 🟢 נקודות חוזק
[רשום 2-3 תחומים בהם המנהל מצטיין, עם דוגמאות ספציפיות]

## 🟡 הזדמנויות לצמיחה
[רשום 2-3 תחומים לשיפור, בצורה חיובית ובונה]

## 💡 המלצות לפיתוח
[רשום 2-3 צעדים ממשיים שהמנהל יכול לעשות כדי לשפר]

## 📝 סיכום כללי
[פיסקה אחת - סיכום מקיף ומאזן של הביצועים והפוטנציאל]

חשוב:
- היה ספציפי - השתמש בנתונים ובציונים
- שמור על טון חיובי ובונה
- הצע פתרונות מעשיים
- דבר על "הזדמנויות" ולא "בעיות"
"""

    # Call Claude API
    api_key = settings.ANTHROPIC_API_KEY
    if not api_key:
        raise HTTPException(status_code=500, detail="AI service not configured")

    try:
        client = anthropic.Anthropic(api_key=api_key)

        response = client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=2000,
            temperature=0.7,
            messages=[
                {
                    "role": "user",
                    "content": context
                }
            ]
        )

        summary = response.content[0].text

        # Save summary to database
        review.ai_summary = summary
        db.commit()

        return {
            "message": "הסיכום נוצר בהצלחה!",
            "summary": summary
        }

    except Exception as e:
        print(f"AI Summary Error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"AI service error: {str(e)}")
