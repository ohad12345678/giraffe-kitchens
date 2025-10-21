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
from app.models.sanitation_audit import SanitationAudit, SanitationAuditCategory
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

    # Create Claude client with timeout
    try:
        client = Anthropic(api_key=api_key, timeout=30.0)  # 30 second timeout

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
        # Try multiple models in case some are not available for this API key
        models_to_try = [
            "claude-3-5-sonnet-latest",
            "claude-3-opus-latest",
            "claude-3-sonnet-20240229",
            "claude-3-haiku-20240307"
        ]

        last_error = None
        for model_name in models_to_try:
            try:
                print(f"🤖 Trying Claude model: {model_name}")
                message = client.messages.create(
                    model=model_name,
                    max_tokens=1024,
                    system=system_prompt,
                    messages=[
                        {"role": "user", "content": request.question}
                    ]
                )

                # Extract answer
                answer = message.content[0].text
                print(f"✅ Claude responded successfully with {model_name}")

                return AIQueryResponse(
                    answer=answer,
                    context_used=real_context
                )
            except Exception as model_error:
                print(f"❌ Model {model_name} failed: {str(model_error)}")
                last_error = model_error
                continue

        # If all models failed, raise the last error
        if last_error:
            raise last_error

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error calling Claude API: {str(e)}"
        )


@router.post("/ask-sanitation", response_model=AIQueryResponse)
def ask_sanitation_analysis(
    request: AIQueryRequest,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """
    Ask AI to analyze sanitation audit data

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

    # Fetch sanitation audit data from database
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
    query = db.query(SanitationAudit).filter(
        SanitationAudit.audit_date >= start_date,
        SanitationAudit.audit_date <= end_date
    )

    # Branch managers see only their branch
    if current_user.role.value == "BRANCH_MANAGER":
        query = query.filter(SanitationAudit.branch_id == current_user.branch_id)
    elif request.branch_id:
        query = query.filter(SanitationAudit.branch_id == request.branch_id)

    # Get audits
    audits = query.all()
    total_audits = len(audits)

    if total_audits == 0:
        return AIQueryResponse(
            answer="אין ביקורות תברואה בתקופה זו.",
            context_used={"total_audits": 0, "date_range": f"{start_date.strftime('%d/%m/%Y')} - {end_date.strftime('%d/%m/%Y')}"}
        )

    # Calculate statistics
    avg_score = sum(audit.total_score for audit in audits) / total_audits if total_audits > 0 else 0
    avg_deductions = sum(audit.total_deductions for audit in audits) / total_audits if total_audits > 0 else 0

    # Find most common issues across all audits
    all_categories = []
    for audit in audits:
        categories = db.query(SanitationAuditCategory).filter(
            SanitationAuditCategory.audit_id == audit.id,
            SanitationAuditCategory.score_deduction > 0
        ).all()
        all_categories.extend(categories)

    # Group by category name and sum deductions
    category_issues = {}
    for cat in all_categories:
        if cat.category_name not in category_issues:
            category_issues[cat.category_name] = {
                "total_deductions": 0,
                "count": 0,
                "notes": []
            }
        category_issues[cat.category_name]["total_deductions"] += cat.score_deduction
        category_issues[cat.category_name]["count"] += 1
        if cat.notes:
            category_issues[cat.category_name]["notes"].append(cat.notes)

    # Sort by total deductions (worst first)
    top_issues = sorted(
        category_issues.items(),
        key=lambda x: x[1]["total_deductions"],
        reverse=True
    )[:5]

    top_issues_list = [
        f"{name} ({data['total_deductions']:.1f} נקודות, {data['count']} מקרים)"
        for name, data in top_issues
    ]

    # Find best and worst audits
    best_audit = max(audits, key=lambda a: a.total_score) if audits else None
    worst_audit = min(audits, key=lambda a: a.total_score) if audits else None

    # Build context
    real_context = {
        "total_audits": total_audits,
        "average_score": round(avg_score, 1),
        "average_deductions": round(avg_deductions, 1),
        "top_issues": top_issues_list if top_issues_list else ["אין בעיות משמעותיות"],
        "best_score": round(best_audit.total_score, 1) if best_audit else 0,
        "worst_score": round(worst_audit.total_score, 1) if worst_audit else 0,
        "date_range": f"{start_date.strftime('%d/%m/%Y')} - {end_date.strftime('%d/%m/%Y')}"
    }

    # Create Claude client with timeout
    try:
        client = Anthropic(api_key=api_key, timeout=30.0)

        # Build context-aware prompt
        system_prompt = f"""אתה מומחה לתברואה ובטיחות מזון במסעדות.

הנתונים הנוכחיים (תקופה: {real_context['date_range']}):
- סך ביקורות: {real_context['total_audits']}
- ציון ממוצע: {real_context['average_score']} (מתוך 100)
- ניכויים ממוצעים: {real_context['average_deductions']} נקודות
- הבעיות השכיחות: {', '.join(real_context['top_issues'])}
- הציון הגבוה ביותר: {real_context['best_score']}
- הציון הנמוך ביותר: {real_context['worst_score']}

תן תשובות תמציתיות, מקצועיות וממוקדות בעברית.
התמקד בהמלצות מעשיות לשיפור התברואה והבטיחות.
אם אין מספיק נתונים, אמר זאת בבהירות."""

        # Try multiple models
        models_to_try = [
            "claude-3-5-sonnet-latest",
            "claude-3-opus-latest",
            "claude-3-sonnet-20240229",
            "claude-3-haiku-20240307"
        ]

        last_error = None
        for model_name in models_to_try:
            try:
                print(f"🤖 Trying Claude model for sanitation: {model_name}")
                message = client.messages.create(
                    model=model_name,
                    max_tokens=1024,
                    system=system_prompt,
                    messages=[
                        {"role": "user", "content": request.question}
                    ]
                )

                answer = message.content[0].text
                print(f"✅ Claude responded successfully for sanitation with {model_name}")

                return AIQueryResponse(
                    answer=answer,
                    context_used=real_context
                )
            except Exception as model_error:
                print(f"❌ Model {model_name} failed for sanitation: {str(model_error)}")
                last_error = model_error
                continue

        # If all models failed, raise the last error
        if last_error:
            raise last_error

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error calling Claude API: {str(e)}"
        )
