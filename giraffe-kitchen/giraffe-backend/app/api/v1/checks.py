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
from app.models.sanitation_audit import SanitationAudit, AuditStatus
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
    # DEBUG: Print what we received
    print(f"🔍 CREATE CHECK - Received date: {check_data.check_date}")
    print(f"🔍 CREATE CHECK - Full data: {check_data.dict()}")

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

    print(f"🔍 CREATE CHECK - Saved to DB with date: {new_check.check_date}")
    print(f"🔍 CREATE CHECK - Saved to DB, ID: {new_check.id}")

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


@router.delete("/{check_id}")
def delete_check(
    check_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a specific dish check. Only accessible to ohadb@giraffe.co.il"""
    # Only allow ohadb@giraffe.co.il to delete checks
    if current_user.email != "ohadb@giraffe.co.il":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only ohadb@giraffe.co.il can delete checks"
        )

    check = db.query(DishCheck).filter(DishCheck.id == check_id).first()

    if not check:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Check not found"
        )

    db.delete(check)
    db.commit()

    return {"status": "success", "message": f"Check {check_id} deleted successfully"}


@router.delete("/bulk/delete")
def bulk_delete_checks(
    start_date: Optional[date] = Query(None, description="Delete checks from this date onwards"),
    end_date: Optional[date] = Query(None, description="Delete checks up to this date"),
    branch_id: Optional[int] = Query(None, description="Delete checks only from this branch"),
    delete_all: bool = Query(False, description="Delete ALL checks (use with caution)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Bulk delete dish checks. Only accessible to ohadb@giraffe.co.il"""
    # Only allow ohadb@giraffe.co.il to delete checks
    if current_user.email != "ohadb@giraffe.co.il":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only ohadb@giraffe.co.il can delete checks"
        )

    # Build delete query
    query = db.query(DishCheck)

    if not delete_all:
        # Apply filters
        if start_date:
            query = query.filter(DishCheck.check_date >= start_date)
        if end_date:
            query = query.filter(DishCheck.check_date <= end_date)
        if branch_id:
            query = query.filter(DishCheck.branch_id == branch_id)

    # Count before delete
    count = query.count()

    if count == 0:
        return {"status": "success", "message": "No checks found matching the criteria", "deleted_count": 0}

    # Delete
    query.delete(synchronize_session=False)
    db.commit()

    return {
        "status": "success",
        "message": f"Successfully deleted {count} check(s)",
        "deleted_count": count
    }


@router.get("/dashboard/stats")
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get comprehensive dashboard statistics:
    1. Daily dish checks + average score (compared to same day last week)
    2. Weekly sanitation audits (compared to same week last month)
    3. Strongest and weakest dishes
    4. Best and worst branches for sanitation
    """
    from datetime import datetime

    today = date.today()

    # === 1. Daily Dish Checks & Average Score ===
    # Today's data
    today_checks = db.query(DishCheck).filter(
        DishCheck.check_date == today
    )

    # Branch managers see only their branch
    if current_user.role.value == "branch_manager":
        today_checks = today_checks.filter(DishCheck.branch_id == current_user.branch_id)

    today_count = today_checks.count()
    today_avg = db.query(func.avg(DishCheck.rating)).filter(
        DishCheck.id.in_([c.id for c in today_checks.all()])
    ).scalar() or 0

    # Last week same day
    last_week_same_day = today - timedelta(days=7)
    last_week_checks = db.query(DishCheck).filter(
        DishCheck.check_date == last_week_same_day
    )

    if current_user.role.value == "branch_manager":
        last_week_checks = last_week_checks.filter(DishCheck.branch_id == current_user.branch_id)

    last_week_count = last_week_checks.count()
    last_week_avg = db.query(func.avg(DishCheck.rating)).filter(
        DishCheck.id.in_([c.id for c in last_week_checks.all()])
    ).scalar() or 0

    # Calculate changes
    count_change = today_count - last_week_count
    count_change_percent = ((today_count - last_week_count) / last_week_count * 100) if last_week_count > 0 else 0
    avg_change = today_avg - last_week_avg
    avg_change_percent = ((today_avg - last_week_avg) / last_week_avg * 100) if last_week_avg > 0 else 0

    # === 2. Weekly Sanitation Audits ===
    # This week (last 7 days)
    week_start = today - timedelta(days=7)
    this_week_audits = db.query(SanitationAudit).filter(
        SanitationAudit.audit_date >= week_start,
        SanitationAudit.audit_date <= today,
        SanitationAudit.status == AuditStatus.COMPLETED
    )

    if current_user.role.value == "branch_manager":
        this_week_audits = this_week_audits.filter(SanitationAudit.branch_id == current_user.branch_id)

    this_week_count = this_week_audits.count()

    # Same week last month (~30 days ago)
    last_month_week_start = today - timedelta(days=37)  # 30 + 7
    last_month_week_end = today - timedelta(days=30)
    last_month_audits = db.query(SanitationAudit).filter(
        SanitationAudit.audit_date >= last_month_week_start,
        SanitationAudit.audit_date <= last_month_week_end,
        SanitationAudit.status == AuditStatus.COMPLETED
    )

    if current_user.role.value == "branch_manager":
        last_month_audits = last_month_audits.filter(SanitationAudit.branch_id == current_user.branch_id)

    last_month_count = last_month_audits.count()
    audits_change = this_week_count - last_month_count
    audits_change_percent = ((this_week_count - last_month_count) / last_month_count * 100) if last_month_count > 0 else 0

    # === 3. Strongest and Weakest Dishes (last 30 days) ===
    month_ago = today - timedelta(days=30)
    dish_stats_query = db.query(
        DishCheck.dish_id,
        func.coalesce(Dish.name, DishCheck.dish_name_manual).label('name'),
        func.avg(DishCheck.rating).label('avg_score'),
        func.count(DishCheck.id).label('check_count')
    ).outerjoin(
        Dish, DishCheck.dish_id == Dish.id
    ).filter(
        DishCheck.check_date >= month_ago,
        DishCheck.check_date <= today
    )

    if current_user.role.value == "branch_manager":
        dish_stats_query = dish_stats_query.filter(DishCheck.branch_id == current_user.branch_id)

    dish_stats = dish_stats_query.group_by(
        DishCheck.dish_id,
        func.coalesce(Dish.name, DishCheck.dish_name_manual)
    ).having(
        func.count(DishCheck.id) >= 3  # At least 3 checks
    ).all()

    strongest_dish = None
    weakest_dish = None

    if dish_stats:
        sorted_dishes = sorted(dish_stats, key=lambda x: x.avg_score)
        weakest = sorted_dishes[0]
        strongest = sorted_dishes[-1]

        weakest_dish = {
            "name": weakest.name,
            "score": round(float(weakest.avg_score), 1),
            "check_count": weakest.check_count
        }

        strongest_dish = {
            "name": strongest.name,
            "score": round(float(strongest.avg_score), 1),
            "check_count": strongest.check_count
        }

    # === 4. Best and Worst Branches for Sanitation (last 90 days) ===
    three_months_ago = today - timedelta(days=90)
    branch_stats_query = db.query(
        SanitationAudit.branch_id,
        Branch.name.label('branch_name'),
        func.avg(SanitationAudit.total_score).label('avg_score'),
        func.count(SanitationAudit.id).label('audit_count')
    ).join(
        Branch, SanitationAudit.branch_id == Branch.id
    ).filter(
        SanitationAudit.audit_date >= three_months_ago,
        SanitationAudit.audit_date <= today,
        SanitationAudit.status == AuditStatus.COMPLETED
    )

    # Branch managers only see their own branch
    if current_user.role.value == "branch_manager":
        branch_stats_query = branch_stats_query.filter(SanitationAudit.branch_id == current_user.branch_id)

    branch_stats = branch_stats_query.group_by(
        SanitationAudit.branch_id,
        Branch.name
    ).having(
        func.count(SanitationAudit.id) >= 2  # At least 2 audits
    ).all()

    best_branch = None
    worst_branch = None

    if branch_stats and current_user.role.value != "branch_manager":  # Only show if HQ
        sorted_branches = sorted(branch_stats, key=lambda x: x.avg_score)
        worst = sorted_branches[0]
        best = sorted_branches[-1]

        worst_branch = {
            "name": worst.branch_name,
            "score": round(float(worst.avg_score), 1),
            "audit_count": worst.audit_count
        }

        best_branch = {
            "name": best.branch_name,
            "score": round(float(best.avg_score), 1),
            "audit_count": best.audit_count
        }

    return {
        "daily_checks": {
            "today_count": today_count,
            "today_avg_score": round(float(today_avg), 1) if today_avg else 0,
            "last_week_count": last_week_count,
            "last_week_avg_score": round(float(last_week_avg), 1) if last_week_avg else 0,
            "count_change": count_change,
            "count_change_percent": round(count_change_percent, 1),
            "avg_change": round(avg_change, 2),
            "avg_change_percent": round(avg_change_percent, 1)
        },
        "weekly_audits": {
            "this_week_count": this_week_count,
            "last_month_count": last_month_count,
            "change": audits_change,
            "change_percent": round(audits_change_percent, 1)
        },
        "dishes": {
            "strongest": strongest_dish,
            "weakest": weakest_dish
        },
        "branches": {
            "best": best_branch,
            "worst": worst_branch
        }
    }
