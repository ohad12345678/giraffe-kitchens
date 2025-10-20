"""
AI Analysis endpoint using Claude API
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from anthropic import Anthropic
from datetime import date, timedelta
from sqlalchemy import func

from app.api import deps
from app.models.user import User
from app.models.dish_check import DishCheck
from app.models.dish import Dish
from app.models.chef import Chef
from app.models.branch import Branch
from app.core.config import settings

router = APIRouter()


class AIQueryRequest(BaseModel):
    """Request model for AI query"""
    question: str
    branch_id: Optional[int] = None
    date_range: Optional[str] = "week"


class AIQueryResponse(BaseModel):
    """Response model for AI query"""
    answer: str
    context_used: dict


@router.post("/ask", response_model=AIQueryResponse)
def ask_ai_analysis(
    request: AIQueryRequest,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """
    Ask AI to analyze quality check data

    - For HQ users: can query all branches
    - For Branch Managers: only their branch data
    """

    # Authorization check
    if current_user.role.value == "BRANCH_MANAGER" and request.branch_id != current_user.branch_id:
        raise HTTPException(status_code=403, detail="Not authorized to access this branch data")

    # Get API key from settings
    api_key = settings.ANTHROPIC_API_KEY
    if not api_key:
        raise HTTPException(
            status_code=500,
            detail="Claude API key not configured. Please set ANTHROPIC_API_KEY environment variable."
        )

    # Fetch actual data from database based on filters
    # Calculate date range
    today = date.today()
    if request.date_range == "week":
        start_date = today - timedelta(days=7)
    elif request.date_range == "month":
        start_date = today - timedelta(days=30)
    elif request.date_range == "quarter":
        start_date = today - timedelta(days=90)
    else:
        start_date = today - timedelta(days=7)

    end_date = today

    # Build query based on user permissions
    query = db.query(DishCheck).filter(
        DishCheck.check_date >= start_date,
        DishCheck.check_date <= end_date
    )

    # Branch managers see only their branch
    if current_user.role.value == "BRANCH_MANAGER":
        query = query.filter(DishCheck.branch_id == current_user.branch_id)
    elif request.branch_id:
        query = query.filter(DishCheck.branch_id == request.branch_id)

    # Get total checks
    total_checks = query.count()

    # Get average rating
    avg_rating = db.query(func.avg(DishCheck.rating)).filter(
        DishCheck.id.in_([c.id for c in query.all()])
    ).scalar() or 0

    # Get weak dishes (rating < 7)
    weak_dishes_query = db.query(
        func.coalesce(Dish.name, DishCheck.dish_name_manual).label('name'),
        func.avg(DishCheck.rating).label('avg_score')
    ).outerjoin(
        Dish, DishCheck.dish_id == Dish.id
    ).filter(
        DishCheck.id.in_([c.id for c in query.all()])
    ).group_by(
        DishCheck.dish_id,
        func.coalesce(Dish.name, DishCheck.dish_name_manual)
    ).having(
        func.avg(DishCheck.rating) < 7
    ).order_by(
        func.avg(DishCheck.rating).asc()
    ).limit(3).all()

    weak_dishes_list = [f"{d.name} ({round(float(d.avg_score), 1)})" for d in weak_dishes_query]

    # Get top chefs
    top_chefs_query = db.query(
        func.coalesce(Chef.name, DishCheck.chef_name_manual).label('name'),
        func.avg(DishCheck.rating).label('avg_score')
    ).outerjoin(
        Chef, DishCheck.chef_id == Chef.id
    ).filter(
        DishCheck.id.in_([c.id for c in query.all()])
    ).group_by(
        DishCheck.chef_id,
        func.coalesce(Chef.name, DishCheck.chef_name_manual)
    ).order_by(
        func.avg(DishCheck.rating).desc()
    ).limit(3).all()

    top_chefs_list = [f"{c.name} ({round(float(c.avg_score), 1)})" for c in top_chefs_query]

    # Calculate trend (compare to previous period)
    previous_start = start_date - (end_date - start_date)
    previous_query = db.query(DishCheck).filter(
        DishCheck.check_date >= previous_start,
        DishCheck.check_date < start_date
    )

    if current_user.role.value == "BRANCH_MANAGER":
        previous_query = previous_query.filter(DishCheck.branch_id == current_user.branch_id)
    elif request.branch_id:
        previous_query = previous_query.filter(DishCheck.branch_id == request.branch_id)

    previous_avg = db.query(func.avg(DishCheck.rating)).filter(
        DishCheck.id.in_([c.id for c in previous_query.all()])
    ).scalar() or 0

    if previous_avg > 0:
        trend_diff = round(float(avg_rating - previous_avg), 1)
        if trend_diff > 0:
            trend = f"שיפור של {trend_diff} נקודות לעומת התקופה הקודמת"
        elif trend_diff < 0:
            trend = f"ירידה של {abs(trend_diff)} נקודות לעומת התקופה הקודמת"
        else:
            trend = "יציב ללא שינוי משמעותי"
    else:
        trend = "אין נתונים מהתקופה הקודמת להשוואה"

    # Build context with real data
    real_context = {
        "total_checks": total_checks,
        "average_rating": round(float(avg_rating), 1) if avg_rating else 0,
        "weak_dishes": weak_dishes_list if weak_dishes_list else ["אין מנות חלשות"],
        "top_chefs": top_chefs_list if top_chefs_list else ["אין נתונים"],
        "trend": trend,
        "date_range": f"{start_date.strftime('%d/%m/%Y')} - {end_date.strftime('%d/%m/%Y')}"
    }

    # Create Claude client
    try:
        client = Anthropic(api_key=api_key)

        # Build context-aware prompt with real data
        system_prompt = f"""אתה מומחה לניתוח נתוני בקרת איכות במסעדות.

הנתונים הנוכחיים (תקופה: {real_context['date_range']}):
- סך בדיקות: {real_context['total_checks']}
- ממוצע ציונים: {real_context['average_rating']}
- מנות חלשות: {', '.join(real_context['weak_dishes'])}
- טבחים מובילים: {', '.join(real_context['top_chefs'])}
- מגמה: {real_context['trend']}

תן תשובות תמציתיות, מקצועיות ומעשיות בעברית.
התמקד בתובנות ממשיות והמלצות לפעולה.
אם אין מספיק נתונים, אמר זאת בבהירות."""

        # Call Claude API
        message = client.messages.create(
            model="claude-3-5-sonnet-20240620",
            max_tokens=1024,
            system=system_prompt,
            messages=[
                {"role": "user", "content": request.question}
            ]
        )

        # Extract answer
        answer = message.content[0].text

        return AIQueryResponse(
            answer=answer,
            context_used=real_context
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error calling Claude API: {str(e)}"
        )
