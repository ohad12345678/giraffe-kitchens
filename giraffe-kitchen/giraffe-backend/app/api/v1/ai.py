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
import os

from app.api import deps
from app.models.user import User
from app.models.dish_check import DishCheck
from app.models.dish import Dish
from app.models.chef import Chef
from app.models.branch import Branch
from app.models.sanitation_audit import SanitationAudit, SanitationAuditCategory
from app.models.manager_evaluation import ManagerEvaluation, ManagerEvaluationCategory
from app.core.config import settings

router = APIRouter()


def load_prompt_template(prompt_name: str) -> str:
    """Load a prompt template from the prompts directory."""
    prompts_dir = os.path.join(os.path.dirname(__file__), '..', '..', 'prompts')
    prompt_path = os.path.join(prompts_dir, f"{prompt_name}.txt")

    try:
        with open(prompt_path, 'r', encoding='utf-8') as f:
            return f.read()
    except FileNotFoundError:
        print(f"⚠️  Prompt file not found: {prompt_path}")
        return None


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

    # Get average rating - use subquery instead of .all()
    avg_rating = query.with_entities(func.avg(DishCheck.rating)).scalar() or 0

    # Get weak dishes (rating < 7) - no need to fetch all checks
    weak_dishes_query = db.query(
        func.coalesce(Dish.name, DishCheck.dish_name_manual).label('name'),
        func.avg(DishCheck.rating).label('avg_score')
    ).select_from(DishCheck).outerjoin(
        Dish, DishCheck.dish_id == Dish.id
    ).filter(
        DishCheck.check_date >= start_date,
        DishCheck.check_date <= end_date
    ).group_by(
        DishCheck.dish_id,
        func.coalesce(Dish.name, DishCheck.dish_name_manual)
    ).having(
        func.avg(DishCheck.rating) < 7
    ).order_by(
        func.avg(DishCheck.rating).asc()
    ).limit(3).all()

    weak_dishes_list = [f"{d.name} ({round(float(d.avg_score), 1)})" for d in weak_dishes_query]

    # Get ALL dishes with ratings (not just weak ones)
    all_dishes_query = db.query(
        func.coalesce(Dish.name, DishCheck.dish_name_manual).label('name'),
        func.avg(DishCheck.rating).label('avg_score'),
        func.count(DishCheck.id).label('check_count')
    ).select_from(DishCheck).outerjoin(
        Dish, DishCheck.dish_id == Dish.id
    ).filter(
        DishCheck.check_date >= start_date,
        DishCheck.check_date <= end_date
    ).group_by(
        DishCheck.dish_id,
        func.coalesce(Dish.name, DishCheck.dish_name_manual)
    ).order_by(
        func.avg(DishCheck.rating).desc()
    ).all()

    all_dishes_list = [f"{d.name} ({round(float(d.avg_score), 1)}, {d.check_count} בדיקות)" for d in all_dishes_query]

    # Get top chefs - no need to fetch all checks
    top_chefs_query = db.query(
        func.coalesce(Chef.name, DishCheck.chef_name_manual).label('name'),
        func.avg(DishCheck.rating).label('avg_score')
    ).select_from(DishCheck).outerjoin(
        Chef, DishCheck.chef_id == Chef.id
    ).filter(
        DishCheck.check_date >= start_date,
        DishCheck.check_date <= end_date
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

    previous_avg = previous_query.with_entities(func.avg(DishCheck.rating)).scalar() or 0

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
        "all_dishes": all_dishes_list if all_dishes_list else ["אין נתונים"],
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
- כל המנות (מסודרות לפי ציון): {', '.join(real_context['all_dishes'][:10])}
- מנות חלשות (מתחת ל-7): {', '.join(real_context['weak_dishes'])}
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

        # Simple prompt for open-ended chat questions
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

@router.post("/ask-manager-evaluations", response_model=AIQueryResponse)
def ask_manager_evaluations_analysis(
    request: AIQueryRequest,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """
    Ask AI to analyze manager evaluation data

    Only accessible to specific HQ users: nofar, aviv, ohad, avital
    """

    # Authorized emails for manager evaluations
    AUTHORIZED_EMAILS = [
        "nofar@giraffe.co.il",
        "aviv@giraffe.co.il",
        "ohadb@giraffe.co.il",
        "avital@giraffe.co.il"
    ]

    # Authorization check - must be HQ user with authorized email
    if current_user.role.value != "HQ":
        raise HTTPException(status_code=403, detail="Only HQ users can access manager evaluations")

    if current_user.email not in AUTHORIZED_EMAILS:
        raise HTTPException(status_code=403, detail="Not authorized to access manager evaluations")

    # Get API key from settings
    api_key = settings.ANTHROPIC_API_KEY
    if not api_key:
        raise HTTPException(
            status_code=500,
            detail="Claude API key not configured. Please set ANTHROPIC_API_KEY environment variable."
        )

    # Fetch manager evaluation data from database
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

    # Build query
    query = db.query(ManagerEvaluation).filter(
        ManagerEvaluation.evaluation_date >= start_date,
        ManagerEvaluation.evaluation_date <= end_date
    )

    if request.branch_id:
        query = query.filter(ManagerEvaluation.branch_id == request.branch_id)

    # Get evaluations
    evaluations = query.all()
    total_evaluations = len(evaluations)

    if total_evaluations == 0:
        return AIQueryResponse(
            answer="אין הערכות מנהלים בתקופה זו.",
            context_used={"total_evaluations": 0, "date_range": f"{start_date.strftime('%d/%m/%Y')} - {end_date.strftime('%d/%m/%Y')}"}
        )

    # Calculate statistics
    # Get all categories for all evaluations
    all_categories = []
    for evaluation in evaluations:
        categories = db.query(ManagerEvaluationCategory).filter(
            ManagerEvaluationCategory.evaluation_id == evaluation.id
        ).all()
        all_categories.extend(categories)

    # Calculate average by category
    category_stats = {}
    for cat in all_categories:
        if cat.category_name not in category_stats:
            category_stats[cat.category_name] = {"ratings": [], "count": 0}
        category_stats[cat.category_name]["ratings"].append(cat.rating)
        category_stats[cat.category_name]["count"] += 1

    # Calculate averages
    category_averages = {
        name: {
            "avg": round(sum(data["ratings"]) / len(data["ratings"]), 1),
            "count": data["count"]
        }
        for name, data in category_stats.items()
    }

    # Sort categories by average (lowest first - areas needing improvement)
    sorted_categories = sorted(
        category_averages.items(),
        key=lambda x: x[1]["avg"]
    )

    weak_categories = [
        f"{name} (ממוצע: {data['avg']}, {data['count']} הערכות)"
        for name, data in sorted_categories[:3]
    ]

    strong_categories = [
        f"{name} (ממוצע: {data['avg']}, {data['count']} הערכות)"
        for name, data in sorted_categories[-3:]
    ]

    # Calculate overall weighted average
    WEIGHTS = {
        "תפעול": 0.30,
        "ניהול אנשים": 0.35,
        "ביצועים עסקיים": 0.25,
        "מנהיגות": 0.10
    }

    weighted_scores = []
    for evaluation in evaluations:
        categories = db.query(ManagerEvaluationCategory).filter(
            ManagerEvaluationCategory.evaluation_id == evaluation.id
        ).all()

        weighted_sum = 0
        total_weight = 0
        for cat in categories:
            weight = WEIGHTS.get(cat.category_name, 0.25)
            weighted_sum += cat.rating * weight
            total_weight += weight

        if total_weight > 0:
            weighted_scores.append(weighted_sum / total_weight)

    avg_weighted_score = round(sum(weighted_scores) / len(weighted_scores), 1) if weighted_scores else 0

    # Get manager names
    manager_names = [eval.manager_name for eval in evaluations]
    unique_managers = list(set(manager_names))

    # Build context
    real_context = {
        "total_evaluations": total_evaluations,
        "unique_managers": len(unique_managers),
        "average_weighted_score": avg_weighted_score,
        "weak_categories": weak_categories if weak_categories else ["אין נקודות חולשה משמעותיות"],
        "strong_categories": strong_categories if strong_categories else ["אין נתונים"],
        "managers_evaluated": ", ".join(unique_managers[:5]) + ("..." if len(unique_managers) > 5 else ""),
        "date_range": f"{start_date.strftime('%d/%m/%Y')} - {end_date.strftime('%d/%m/%Y')}"
    }

    # Create Claude client with timeout
    try:
        client = Anthropic(api_key=api_key, timeout=30.0)

        # Build prompt
        system_prompt = f"""אתה יועץ ארגוני מומחה להערכת מנהלים ברשתות מזון.

הנתונים הנוכחיים (תקופה: {real_context['date_range']}):
- סך הערכות מנהלים: {real_context['total_evaluations']}
- מנהלים שהוערכו: {real_context['unique_managers']}
- ציון משוקלל ממוצע: {real_context['average_weighted_score']}/10
- קטגוריות חזקות: {', '.join(real_context['strong_categories'])}
- קטגוריות לשיפור: {', '.join(real_context['weak_categories'])}
- מנהלים: {real_context['managers_evaluated']}

משקלות הקטגוריות:
- תפעול: 30%
- ניהול אנשים: 35%
- ביצועים עסקיים: 25%
- מנהיגות: 10%

תן תשובות תמציתיות, מקצועיות וממוקדות בעברית.
התמקד בתובנות ממשיות והמלצות מעשיות לפיתוח מנהלים.
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
                print(f"🤖 Trying Claude model for manager evaluations: {model_name}")
                message = client.messages.create(
                    model=model_name,
                    max_tokens=1024,
                    system=system_prompt,
                    messages=[
                        {"role": "user", "content": request.question}
                    ]
                )

                answer = message.content[0].text
                print(f"✅ Claude responded successfully for manager evaluations with {model_name}")

                return AIQueryResponse(
                    answer=answer,
                    context_used=real_context
                )
            except Exception as model_error:
                print(f"❌ Model {model_name} failed for manager evaluations: {str(model_error)}")
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
