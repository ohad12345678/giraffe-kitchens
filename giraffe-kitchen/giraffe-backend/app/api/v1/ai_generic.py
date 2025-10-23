"""
Generic AI analysis endpoint
Provides AI analysis and chat capabilities for all system data
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
import anthropic

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.core.config import settings
from app.models.dish_check import DishCheck
from app.models.branch import Branch
from app.models.dish import Dish
from app.models.chef import Chef
from app.models.sanitation_audit import SanitationAudit
from app.models.manager_review import ManagerReview

router = APIRouter()


class AIAnalysisRequest(BaseModel):
    context: str


class AIChatRequest(BaseModel):
    question: str
    context_type: Optional[str] = "all"  # all, checks, sanitation, reviews


@router.post("/analyze")
def ai_analyze(
    request: AIAnalysisRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Generic AI analysis endpoint
    Takes any context and returns AI analysis
    """
    api_key = settings.ANTHROPIC_API_KEY
    if not api_key:
        raise HTTPException(status_code=500, detail="ANTHROPIC_API_KEY not configured")

    try:
        client = anthropic.Anthropic(api_key=api_key)

        response = client.messages.create(
            model="claude-3-5-sonnet-20240620",
            max_tokens=2000,
            temperature=0.7,
            messages=[{"role": "user", "content": request.context}]
        )

        summary = response.content[0].text

        return {"summary": summary}

    except Exception as e:
        print(f"❌ AI Analysis error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/chat")
def ai_chat(
    request: AIChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Unified AI chat endpoint
    Provides access to all system data for intelligent responses
    """
    api_key = settings.ANTHROPIC_API_KEY
    if not api_key:
        raise HTTPException(status_code=500, detail="ANTHROPIC_API_KEY not configured")

    try:
        # Build comprehensive context based on request type
        context_data = build_context(db, current_user, request.context_type)

        # Construct full prompt
        full_prompt = f"""אתה עוזר AI למערכת ניהול מטבחים של רשת מסעדות ג'ירף.
יש לך גישה למידע מלא על המערכת.

## מידע זמין במערכת:
{context_data}

## שאלת המשתמש:
{request.question}

ענה בצורה מקיפה ומקצועית, תוך שימוש בנתונים הרלוונטיים מהמערכת.
אם אין מספיק נתונים לתת תשובה מדויקת, ציין זאת בבירור."""

        client = anthropic.Anthropic(api_key=api_key)

        response = client.messages.create(
            model="claude-3-5-sonnet-20240620",
            max_tokens=2000,
            temperature=0.7,
            messages=[{"role": "user", "content": full_prompt}]
        )

        answer = response.content[0].text

        return {"answer": answer}

    except Exception as e:
        print(f"❌ AI Chat error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


def build_context(db: Session, user: User, context_type: str) -> str:
    """Build comprehensive context from all system data"""
    context_parts = []

    # DishChecks data
    if context_type in ["all", "checks"]:
        checks_count = db.query(DishCheck).count()
        recent_checks = db.query(DishCheck).order_by(DishCheck.check_date.desc()).limit(10).all()

        checks_info = f"\n### בדיקות איכות מזון\n"
        checks_info += f"- סה\"כ בדיקות במערכת: {checks_count}\n"
        checks_info += f"- 10 הבדיקות האחרונות:\n"
        for check in recent_checks:
            dish_name = check.dish.name if check.dish else check.dish_name_manual
            chef_name = check.chef.name if check.chef else check.chef_name_manual
            checks_info += f"  * {dish_name} ({chef_name}): ציון {check.rating}/10 בתאריך {check.check_date}\n"

        context_parts.append(checks_info)

    # Sanitation audits data
    if context_type in ["all", "sanitation"]:
        audits_count = db.query(SanitationAudit).count()
        recent_audits = db.query(SanitationAudit).order_by(SanitationAudit.audit_date.desc()).limit(5).all()

        audits_info = f"\n### ביקורות תברואה\n"
        audits_info += f"- סה\"כ ביקורות תברואה: {audits_count}\n"
        audits_info += f"- 5 הביקורות האחרונות:\n"
        for audit in recent_audits:
            branch_name = audit.branch.name if audit.branch else "לא ידוע"
            audits_info += f"  * סניף {branch_name}: ציון {audit.total_score:.1f} בתאריך {audit.audit_date}\n"
            audits_info += f"    - ליקויים: {audit.total_deductions:.1f} נקודות\n"

        context_parts.append(audits_info)

    # Manager reviews data
    if context_type in ["all", "reviews"]:
        reviews_count = db.query(ManagerReview).count()
        recent_reviews = db.query(ManagerReview).order_by(ManagerReview.updated_at.desc()).limit(5).all()

        reviews_info = f"\n### הערכות מנהלים\n"
        reviews_info += f"- סה\"כ הערכות מנהלים: {reviews_count}\n"
        reviews_info += f"- 5 ההערכות האחרונות:\n"
        for review in recent_reviews:
            # Handle both manager_name and manager relationship
            if review.manager_name:
                manager_name = review.manager_name
            elif review.manager_id and review.manager:
                manager_name = review.manager.full_name
            else:
                manager_name = "לא ידוע"

            branch_name = review.branch.name if review.branch else "לא ידוע"
            score = review.overall_score if review.overall_score else "טרם הוערך"
            reviews_info += f"  * {manager_name} (סניף {branch_name}): ציון {score} - {review.quarter} {review.year}\n"

        context_parts.append(reviews_info)

    # Branches summary
    branches = db.query(Branch).all()
    branches_info = f"\n### סניפים\n"
    branches_info += f"- סה\"כ סניפים: {len(branches)}\n"
    branches_info += f"- רשימת סניפים: {', '.join([b.name for b in branches])}\n"
    context_parts.append(branches_info)

    # Dishes summary
    dishes_count = db.query(Dish).count()
    dishes_info = f"\n### מנות\n"
    dishes_info += f"- סה\"כ מנות במערכת: {dishes_count}\n"
    context_parts.append(dishes_info)

    return "\n".join(context_parts)
