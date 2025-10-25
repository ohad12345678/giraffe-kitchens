"""
API endpoints for Manager Evaluations

Only accessible to specific HQ users: nofar, aviv, ohad, avital
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from typing import List, Optional
from datetime import date, datetime

from app.db.base import get_db
from app.api.deps import get_current_user
from app.models.user import User, UserRole
from app.models.branch import Branch
from app.models.manager_evaluation import ManagerEvaluation, ManagerEvaluationCategory
from app.schemas.manager_evaluation import (
    ManagerEvaluationCreate,
    ManagerEvaluationUpdate,
    ManagerEvaluationResponse,
    ManagerEvaluationSummary,
    ManagerEvaluationChatRequest,
    ManagerEvaluationChatResponse
)

router = APIRouter()

# Authorized emails for manager evaluations
AUTHORIZED_EMAILS = [
    "nofar@giraffe.co.il",
    "aviv@giraffe.co.il",
    "ohadb@giraffe.co.il",
    "avital@giraffe.co.il"
]


def check_manager_evaluation_access(current_user: User):
    """Check if user has access to manager evaluations."""
    if current_user.role != UserRole.HQ:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only HQ users can access manager evaluations"
        )

    if current_user.email not in AUTHORIZED_EMAILS:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to access manager evaluations"
        )


@router.get("/", response_model=List[ManagerEvaluationSummary])
def list_manager_evaluations(
    branch_id: Optional[int] = Query(None, description="Filter by branch"),
    start_date: Optional[date] = Query(None, description="Filter evaluations from this date"),
    end_date: Optional[date] = Query(None, description="Filter evaluations until this date"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all manager evaluations with optional filters."""
    check_manager_evaluation_access(current_user)

    query = db.query(ManagerEvaluation)

    # Apply filters
    if branch_id:
        query = query.filter(ManagerEvaluation.branch_id == branch_id)
    if start_date:
        query = query.filter(ManagerEvaluation.evaluation_date >= start_date)
    if end_date:
        query = query.filter(ManagerEvaluation.evaluation_date <= end_date)

    # Order by most recent first
    query = query.order_by(desc(ManagerEvaluation.evaluation_date))

    evaluations = query.all()

    # Build summary response
    result = []
    for evaluation in evaluations:
        branch = db.query(Branch).filter(Branch.id == evaluation.branch_id).first()
        creator = db.query(User).filter(User.id == evaluation.created_by).first()

        result.append(ManagerEvaluationSummary(
            id=evaluation.id,
            branch_id=evaluation.branch_id,
            branch_name=branch.name if branch else "Unknown",
            manager_name=evaluation.manager_name,
            evaluation_date=evaluation.evaluation_date,
            overall_rating=evaluation.overall_rating,
            created_by_name=creator.full_name if creator else "Unknown",
            created_at=evaluation.created_at
        ))

    return result


@router.post("/", response_model=ManagerEvaluationResponse, status_code=status.HTTP_201_CREATED)
def create_manager_evaluation(
    evaluation_data: ManagerEvaluationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new manager evaluation."""
    check_manager_evaluation_access(current_user)

    # Validate branch exists
    branch = db.query(Branch).filter(Branch.id == evaluation_data.branch_id).first()
    if not branch:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Branch not found"
        )

    # Create evaluation
    new_evaluation = ManagerEvaluation(
        branch_id=evaluation_data.branch_id,
        manager_name=evaluation_data.manager_name,
        evaluation_date=evaluation_data.evaluation_date,
        overall_rating=evaluation_data.overall_rating,
        general_comments=evaluation_data.general_comments,
        created_by=current_user.id
    )

    db.add(new_evaluation)
    db.flush()  # Get the ID

    # Create categories
    for category_data in evaluation_data.categories:
        category = ManagerEvaluationCategory(
            evaluation_id=new_evaluation.id,
            category_name=category_data.category_name,
            rating=category_data.rating,
            comments=category_data.comments
        )
        db.add(category)

    db.commit()
    db.refresh(new_evaluation)

    return new_evaluation


@router.get("/{evaluation_id}", response_model=ManagerEvaluationResponse)
def get_manager_evaluation(
    evaluation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific manager evaluation by ID."""
    check_manager_evaluation_access(current_user)

    evaluation = db.query(ManagerEvaluation).filter(
        ManagerEvaluation.id == evaluation_id
    ).first()

    if not evaluation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Manager evaluation not found"
        )

    return evaluation


@router.put("/{evaluation_id}", response_model=ManagerEvaluationResponse)
def update_manager_evaluation(
    evaluation_id: int,
    evaluation_data: ManagerEvaluationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update an existing manager evaluation."""
    check_manager_evaluation_access(current_user)

    evaluation = db.query(ManagerEvaluation).filter(
        ManagerEvaluation.id == evaluation_id
    ).first()

    if not evaluation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Manager evaluation not found"
        )

    # Update fields if provided
    update_data = evaluation_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(evaluation, field, value)

    evaluation.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(evaluation)

    return evaluation


@router.delete("/{evaluation_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_manager_evaluation(
    evaluation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a manager evaluation."""
    check_manager_evaluation_access(current_user)

    evaluation = db.query(ManagerEvaluation).filter(
        ManagerEvaluation.id == evaluation_id
    ).first()

    if not evaluation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Manager evaluation not found"
        )

    db.delete(evaluation)
    db.commit()

    return None


@router.post("/{evaluation_id}/generate-summary", response_model=ManagerEvaluationResponse)
def generate_ai_summary(
    evaluation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Generate AI summary for a manager evaluation."""
    check_manager_evaluation_access(current_user)

    evaluation = db.query(ManagerEvaluation).filter(
        ManagerEvaluation.id == evaluation_id
    ).first()

    if not evaluation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Manager evaluation not found"
        )

    # Get branch info
    branch = db.query(Branch).filter(Branch.id == evaluation.branch_id).first()

    # Build context for AI
    categories_text = "\n".join([
        f"- {cat.category_name}: {cat.rating}/10{f' - {cat.comments}' if cat.comments else ''}"
        for cat in evaluation.categories
    ])

    context = f"""
דוח הערכת מנהל עבור {evaluation.manager_name} מסניף {branch.name if branch else 'לא ידוע'}
תאריך הערכה: {evaluation.evaluation_date.strftime('%d/%m/%Y')}
דירוג כללי: {evaluation.overall_rating}/10 if evaluation.overall_rating else 'לא צוין'}

קטגוריות הערכה:
{categories_text}

הערות כלליות: {evaluation.general_comments or 'אין'}
"""

    # Import AI service
    from app.services.ai_service import get_ai_response

    prompt = """
אתה יועץ ארגוני מנוסה המתמחה בהערכת מנהלי מסעדות. נא לספק סיכום מקצועי ומעמיק של ההערכה הבאה:

{context}

הנחיות לניתוח:

1. **סיכום ביצועים**: התחל בסיכום כללי של ביצועי המנהל, תוך התייחסות לנקודות החוזק העיקריות והתחומים הדורשים שיפור.

2. **ניתוח לפי קטגוריות**:
   - **תפעול**: האם המסעדה מנוהלת בצורה יעילה? איכות השירות, ניהול מלאי, תהליכים.
   - **ניהול אנשים**: יכולת ניהול צוות, מוטיבציה, פתרון קונפליקטים, פיתוח עובדים.
   - **ביצועים עסקיים**: עמידה ביעדים, ניהול תקציב, רווחיות.
   - **מנהיגות**: חזון, יוזמה, יכולת השפעה, קבלת החלטות.

3. **המלצות לפיתוח**: ספק 3-5 המלצות ממוקדות ומעשיות לשיפור, מסודרות לפי עדיפות.

4. **תוכנית פעולה**: הצע צעדים קונקרטיים שהמנהל יכול לנקוט ב-30, 60 ו-90 הימים הקרובים.

5. **סיכום**: סיים במשפט תמציתי המסכם את הפוטנציאל של המנהל ואת כיוון ההתפתחות המומלץ.

נא לכתוב בעברית ברורה ומקצועית, תוך שימוש בנקודות ומבנה ברור.
""".format(context=context)

    try:
        ai_summary = get_ai_response(prompt)

        # Save summary to database
        evaluation.ai_summary = ai_summary
        evaluation.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(evaluation)

        return evaluation

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate AI summary: {str(e)}"
        )


@router.post("/chat", response_model=ManagerEvaluationChatResponse)
def chat_about_evaluation(
    chat_request: ManagerEvaluationChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Ask questions about a specific manager evaluation using AI chatbox."""
    check_manager_evaluation_access(current_user)

    evaluation = db.query(ManagerEvaluation).filter(
        ManagerEvaluation.id == chat_request.evaluation_id
    ).first()

    if not evaluation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Manager evaluation not found"
        )

    # Get branch info
    branch = db.query(Branch).filter(Branch.id == evaluation.branch_id).first()

    # Build context for AI
    categories_text = "\n".join([
        f"- {cat.category_name}: {cat.rating}/10{f' - {cat.comments}' if cat.comments else ''}"
        for cat in evaluation.categories
    ])

    context = f"""
דוח הערכת מנהל עבור {evaluation.manager_name} מסניף {branch.name if branch else 'לא ידוע'}
תאריך הערכה: {evaluation.evaluation_date.strftime('%d/%m/%Y')}
דירוג כללי: {evaluation.overall_rating}/10 if evaluation.overall_rating else 'לא צוין'}

קטגוריות הערכה:
{categories_text}

הערות כלליות: {evaluation.general_comments or 'אין'}

{"סיכום AI: " + evaluation.ai_summary if evaluation.ai_summary else ""}
"""

    # Import AI service
    from app.services.ai_service import get_ai_response

    prompt = f"""
אתה יועץ ארגוני מנוסה המתמחה בהערכת מנהלי מסעדות.

להלן מידע על הערכת מנהל:
{context}

המשתמש שואל: {chat_request.question}

נא לענות על השאלה בצורה מקצועית, תמציתית וממוקדת, תוך התבססות על הנתונים שבדוח ההערכה.
אם השאלה דורשת המלצות - תן המלצות ספציפיות ומעשיות.
כתוב בעברית ברורה.
"""

    try:
        ai_answer = get_ai_response(prompt)

        return ManagerEvaluationChatResponse(
            evaluation_id=chat_request.evaluation_id,
            question=chat_request.question,
            answer=ai_answer,
            generated_at=datetime.utcnow()
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get AI response: {str(e)}"
        )
