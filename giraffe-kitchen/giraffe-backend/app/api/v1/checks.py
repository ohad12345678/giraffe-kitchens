from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date, timedelta
from sqlalchemy import func
from app.db.base import get_db
from app.schemas.dish_check import DishCheckCreate, DishCheckResponse, DishCheckWithDetails
from app.models.dish_check import DishCheck
from app.models.user import User
from app.models.branch import Branch
from app.models.dish import Dish
from app.models.chef import Chef
from app.api.deps import get_current_user

router = APIRouter()


@router.get("/", response_model=List[DishCheckWithDetails])
def list_checks(
    branch_id: Optional[int] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List dish checks with filters."""
    query = db.query(DishCheck)

    # Branch managers can only see checks from their branch
    if current_user.role.value == "branch_manager":
        query = query.filter(DishCheck.branch_id == current_user.branch_id)
    elif branch_id:
        query = query.filter(DishCheck.branch_id == branch_id)

    # Date filters
    if start_date:
        query = query.filter(DishCheck.check_date >= start_date)
    if end_date:
        query = query.filter(DishCheck.check_date <= end_date)

    checks = query.all()

    # Enrich with details
    result = []
    for check in checks:
        branch = db.query(Branch).filter(Branch.id == check.branch_id).first()
        dish = db.query(Dish).filter(Dish.id == check.dish_id).first() if check.dish_id else None
        chef = db.query(Chef).filter(Chef.id == check.chef_id).first() if check.chef_id else None
        creator = db.query(User).filter(User.id == check.created_by).first()

        # Use manual name if no dish/chef ID provided
        dish_display_name = dish.name if dish else check.dish_name_manual
        chef_display_name = chef.name if chef else check.chef_name_manual

        result.append(DishCheckWithDetails(
            **check.__dict__,
            branch_name=branch.name if branch else None,
            dish_name=dish_display_name,
            chef_name=chef_display_name,
            created_by_name=creator.full_name if creator else None
        ))

    return result


@router.post("/", response_model=DishCheckResponse, status_code=status.HTTP_201_CREATED)
def create_check(
    check_data: DishCheckCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new dish check."""
    # Branch managers can only create checks for their own branch
    if current_user.role.value == "branch_manager" and check_data.branch_id != current_user.branch_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only create checks for your own branch"
        )

    # Validate that either chef_id or chef_name_manual is provided
    if not check_data.chef_id and not check_data.chef_name_manual:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either chef_id or chef_name_manual must be provided"
        )

    new_check = DishCheck(
        **check_data.dict(),
        created_by=current_user.id
    )

    db.add(new_check)
    db.commit()
    db.refresh(new_check)

    return new_check


@router.get("/weakest-dish")
def get_weakest_dish(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get the weakest dish of the week based on average score."""
    from datetime import datetime

    # Calculate date range for this week
    today = date.today()
    week_start = today - timedelta(days=today.weekday())  # Monday
    week_end = week_start + timedelta(days=6)  # Sunday

    # Build query based on user role - use COALESCE to handle manual dishes
    query = db.query(
        DishCheck.dish_id,
        func.coalesce(Dish.name, DishCheck.dish_name_manual).label('dish_name'),
        func.avg(DishCheck.rating).label('avg_score'),
        func.count(DishCheck.id).label('check_count')
    ).outerjoin(
        Dish, DishCheck.dish_id == Dish.id
    ).filter(
        DishCheck.check_date >= week_start,
        DishCheck.check_date <= week_end
    )

    # Branch managers see only their branch data
    if current_user.role.value == "branch_manager":
        query = query.filter(DishCheck.branch_id == current_user.branch_id)

    # Group by dish and order by average score (ascending = worst first)
    result = query.group_by(
        DishCheck.dish_id,
        func.coalesce(Dish.name, DishCheck.dish_name_manual)
    ).order_by(func.avg(DishCheck.rating).asc()).first()

    if not result:
        return {
            "dish_name": None,
            "avg_score": None,
            "check_count": 0,
            "message": "אין בדיקות השבוע"
        }

    return {
        "dish_id": result.dish_id,
        "dish_name": result.dish_name,
        "avg_score": round(float(result.avg_score), 1),
        "check_count": result.check_count
    }


@router.get("/analytics")
def get_analytics(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    branch_id: Optional[int] = None,
    dish_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get comprehensive analytics for reports page with filtering."""
    from datetime import datetime

    # Default to this week if no dates provided
    if not start_date or not end_date:
        today = date.today()
        week_start = today - timedelta(days=today.weekday())
        week_end = week_start + timedelta(days=6)
        start_date = start_date or week_start
        end_date = end_date or week_end

    # Base query with filters
    base_query = db.query(DishCheck).filter(
        DishCheck.check_date >= start_date,
        DishCheck.check_date <= end_date
    )

    # Branch managers see only their branch
    if current_user.role.value == "branch_manager":
        base_query = base_query.filter(DishCheck.branch_id == current_user.branch_id)
    elif branch_id:
        base_query = base_query.filter(DishCheck.branch_id == branch_id)

    # Filter by dish if specified
    if dish_id:
        base_query = base_query.filter(DishCheck.dish_id == dish_id)

    # 1. KPIs
    total_checks = base_query.count()
    avg_rating = db.query(func.avg(DishCheck.rating)).filter(
        DishCheck.id.in_([c.id for c in base_query.all()])
    ).scalar() or 0

    weak_dishes_count = db.query(func.count(func.distinct(DishCheck.dish_id))).filter(
        DishCheck.id.in_([c.id for c in base_query.all()]),
        DishCheck.rating < 7
    ).scalar() or 0

    # Top chef - include manual chef names
    top_chef_result = db.query(
        func.coalesce(Chef.name, DishCheck.chef_name_manual).label('name'),
        func.avg(DishCheck.rating).label('avg_score')
    ).outerjoin(
        Chef, DishCheck.chef_id == Chef.id
    ).filter(
        DishCheck.id.in_([c.id for c in base_query.all()])
    ).group_by(
        DishCheck.chef_id,
        func.coalesce(Chef.name, DishCheck.chef_name_manual)
    ).order_by(
        func.avg(DishCheck.rating).desc()
    ).first()

    # 2. Dish ratings with trends - include manual dishes
    dish_ratings = db.query(
        DishCheck.dish_id,
        func.coalesce(Dish.name, DishCheck.dish_name_manual).label('name'),
        Dish.category,
        func.avg(DishCheck.rating).label('avg_score'),
        func.count(DishCheck.id).label('check_count')
    ).outerjoin(
        Dish, DishCheck.dish_id == Dish.id
    ).filter(
        DishCheck.id.in_([c.id for c in base_query.all()])
    ).group_by(
        DishCheck.dish_id,
        func.coalesce(Dish.name, DishCheck.dish_name_manual),
        Dish.category
    ).order_by(
        func.avg(DishCheck.rating).desc()
    ).all()

    dish_ratings_list = [
        {
            "dish_id": d.dish_id,
            "name": d.name,
            "category": d.category,
            "rating": round(float(d.avg_score), 1),
            "check_count": d.check_count,
            "trend": "stable"  # Can be enhanced with historical comparison
        }
        for d in dish_ratings
    ]

    # 3. Chef performance - include manual chef names
    chef_performance = db.query(
        DishCheck.chef_id,
        func.coalesce(Chef.name, DishCheck.chef_name_manual).label('name'),
        Branch.name.label('branch_name'),
        func.avg(DishCheck.rating).label('avg_score'),
        func.count(DishCheck.id).label('check_count')
    ).outerjoin(
        Chef, DishCheck.chef_id == Chef.id
    ).outerjoin(
        Branch, Chef.branch_id == Branch.id
    ).filter(
        DishCheck.id.in_([c.id for c in base_query.all()])
    ).group_by(
        DishCheck.chef_id,
        func.coalesce(Chef.name, DishCheck.chef_name_manual),
        Branch.name
    ).order_by(
        func.avg(DishCheck.rating).desc()
    ).all()

    chef_performance_list = [
        {
            "chef_id": c.chef_id,
            "name": c.name,
            "branch": c.branch_name if c.branch_name else "לא מוגדר",
            "rating": round(float(c.avg_score), 1),
            "checks_count": c.check_count
        }
        for c in chef_performance
    ]

    # 4. Daily trend (for the date range)
    daily_data = db.query(
        DishCheck.check_date,
        func.count(DishCheck.id).label('checks'),
        func.avg(DishCheck.rating).label('avg_rating')
    ).filter(
        DishCheck.id.in_([c.id for c in base_query.all()])
    ).group_by(DishCheck.check_date).order_by(DishCheck.check_date).all()

    daily_trend = [
        {
            "date": d.check_date.isoformat(),
            "checks": d.checks,
            "avg_rating": round(float(d.avg_rating), 1)
        }
        for d in daily_data
    ]

    return {
        "kpis": {
            "total_checks": total_checks,
            "average_rating": round(float(avg_rating), 1) if avg_rating else 0,
            "weak_dishes": weak_dishes_count,
            "top_chef": top_chef_result.name if top_chef_result else None,
            "top_chef_rating": round(float(top_chef_result.avg_score), 1) if top_chef_result else None
        },
        "dish_ratings": dish_ratings_list,
        "chef_performance": chef_performance_list,
        "daily_trend": daily_trend
    }


@router.get("/{check_id}", response_model=DishCheckWithDetails)
def get_check(
    check_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific dish check."""
    check = db.query(DishCheck).filter(DishCheck.id == check_id).first()

    if not check:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Check not found"
        )

    # Branch managers can only access checks from their branch
    if current_user.role.value == "branch_manager" and check.branch_id != current_user.branch_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only access checks from your own branch"
        )

    # Enrich with details
    branch = db.query(Branch).filter(Branch.id == check.branch_id).first()
    dish = db.query(Dish).filter(Dish.id == check.dish_id).first() if check.dish_id else None
    chef = db.query(Chef).filter(Chef.id == check.chef_id).first() if check.chef_id else None
    creator = db.query(User).filter(User.id == check.created_by).first()

    # Use manual name if no dish/chef ID provided
    dish_display_name = dish.name if dish else check.dish_name_manual
    chef_display_name = chef.name if chef else check.chef_name_manual

    return DishCheckWithDetails(
        **check.__dict__,
        branch_name=branch.name if branch else None,
        dish_name=dish_display_name,
        chef_name=chef_display_name,
        created_by_name=creator.full_name if creator else None
    )
