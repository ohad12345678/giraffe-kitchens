"""
AI Analysis endpoint using Claude API
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from anthropic import Anthropic

from app.api import deps
from app.models.user import User
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

    # TODO: Fetch actual data from database based on filters
    # For now, using mock data context
    mock_context = {
        "total_checks": 156,
        "average_rating": 8.2,
        "weak_dishes": ["צ'אזה (6.8)", "סלט דג לבן (6.5)"],
        "top_chefs": ["דוד (9.1)", "שרה (8.9)"],
        "trend": "שיפור של 0.3 נקודות בשבוע האחרון"
    }

    # Create Claude client
    try:
        client = Anthropic(api_key=api_key)

        # Build context-aware prompt
        system_prompt = f"""אתה מומחה לניתוח נתוני בקרת איכות במסעדות.

הנתונים הנוכחיים:
- סך בדיקות: {mock_context['total_checks']}
- ממוצע ציונים: {mock_context['average_rating']}
- מנות חלשות: {', '.join(mock_context['weak_dishes'])}
- טבחים מובילים: {', '.join(mock_context['top_chefs'])}
- מגמה: {mock_context['trend']}

תן תשובות תמציתיות, מקצועיות ומעשיות בעברית.
התמקד בתובנות ממשיות והמלצות לפעולה."""

        # Call Claude API
        message = client.messages.create(
            model="claude-3-5-sonnet-20241022",
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
            context_used=mock_context
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error calling Claude API: {str(e)}"
        )
