"""
API endpoints for Manager Evaluations

Only accessible to specific HQ users: nofar, aviv, ohad, avital
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from typing import List, Optional
from datetime import date, datetime
import os

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


def load_prompt_template(prompt_name: str) -> Optional[str]:
    """Load a prompt template from the prompts directory."""
    prompts_dir = os.path.join(os.path.dirname(__file__), '..', '..', 'prompts')
    prompt_path = os.path.join(prompts_dir, f"{prompt_name}.txt")

    try:
        with open(prompt_path, 'r', encoding='utf-8') as f:
            return f.read()
    except FileNotFoundError:
        print(f"⚠️  Prompt file not found: {prompt_path}")
        return None


def calculate_evaluation_score(evaluation: ManagerEvaluation, db: Session) -> None:
    """
    Calculate weighted average score for an evaluation based on category ratings.
    Updates the evaluation's overall_score.
    """
    # Category weights (must sum to 1.0)
    WEIGHTS = {
        "תפעול": 0.30,
        "ניהול אנשים": 0.35,
        "ביצועים עסקיים": 0.25,
        "מנהיגות": 0.10
    }

    if not evaluation.categories:
        evaluation.overall_score = None
        return

    weighted_sum = 0.0
    total_weight = 0.0

    for category in evaluation.categories:
        weight = WEIGHTS.get(category.category_name, 0.25)  # Default weight if category not found
        weighted_sum += category.rating * weight
        total_weight += weight

    if total_weight > 0:
        evaluation.overall_score = round(weighted_sum / total_weight, 2)
    else:
        evaluation.overall_score = None

    db.commit()


def generate_ai_summary(evaluation: ManagerEvaluation, db: Session) -> None:
    """
    Generate AI summary for a manager evaluation.
    Similar to sanitation audits - called automatically on creation.
    """
    from anthropic import Anthropic
    from app.core.config import settings

    # Get branch info
    branch = db.query(Branch).filter(Branch.id == evaluation.branch_id).first()

    # Load prompt template
    prompt_template = load_prompt_template("manager_evaluation_analysis")
    if not prompt_template:
        print("⚠️  Could not load prompt template, skipping AI summary")
        return

    # Build context
    categories_text = "\n".join([
        f"- {cat.category_name}: {cat.rating}/10{f' - {cat.comments}' if cat.comments else ''}"
        for cat in evaluation.categories
    ])

    context = f"""
דוח הערכת מנהל עבור {evaluation.manager_name} מסניף {branch.name if branch else 'לא ידוע'}
תאריך הערכה: {evaluation.evaluation_date.strftime('%d/%m/%Y')}

קטגוריות הערכה:
{categories_text}

הערות כלליות: {evaluation.general_comments or 'אין'}
"""

    # Build AI prompt
    system_prompt = f"""{prompt_template}

---

להלן מידע על הערכת המנהל:

{context}

נא לנתח את ההערכה לפי המבנה שהוגדר לעיל."""

    try:
        # Check API key
        if not settings.ANTHROPIC_API_KEY:
            print("⚠️  ANTHROPIC_API_KEY not configured, skipping AI summary")
            return

        # Create Anthropic client
        client = Anthropic(api_key=settings.ANTHROPIC_API_KEY, timeout=60.0)

        # Try models in order
        models_to_try = [
            "claude-3-5-sonnet-latest",
            "claude-3-opus-latest",
            "claude-3-sonnet-20240229",
            "claude-3-haiku-20240307"
        ]

        for model_name in models_to_try:
            try:
                print(f"🤖 Generating AI summary with {model_name}...")
                message = client.messages.create(
                    model=model_name,
                    max_tokens=4096,
                    system=system_prompt,
                    messages=[{"role": "user", "content": "נא לספק ניתוח מקצועי ומקיף של ההערכה."}]
                )

                ai_summary = message.content[0].text
                evaluation.ai_summary = ai_summary
                db.commit()
                print(f"✅ AI summary generated successfully with {model_name}")
                return

            except Exception as model_error:
                print(f"❌ Model {model_name} failed: {str(model_error)}")
                continue

        print("⚠️  All AI models failed, evaluation created without summary")

    except Exception as e:
        print(f"❌ Error generating AI summary: {str(e)}")
        # Don't raise - allow evaluation to be created without summary


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
            overall_score=evaluation.overall_score,
            status=evaluation.status,
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

    # Calculate overall score (weighted average)
    calculate_evaluation_score(new_evaluation, db)

    # Generate AI summary automatically (like sanitation audits)
    generate_ai_summary(new_evaluation, db)

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

    # Load prompt template
    prompt_template = load_prompt_template("manager_evaluation_analysis")
    if not prompt_template:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Prompt template not found"
        )

    # Build context for AI
    categories_text = "\n".join([
        f"- {cat.category_name}: {cat.rating}/10{f' - {cat.comments}' if cat.comments else ''}"
        for cat in evaluation.categories
    ])

    context = f"""
דוח הערכת מנהל עבור {evaluation.manager_name} מסניף {branch.name if branch else 'לא ידוע'}
תאריך הערכה: {evaluation.evaluation_date.strftime('%d/%m/%Y')}

קטגוריות הערכה:
{categories_text}

הערות כלליות: {evaluation.general_comments or 'אין'}
"""

    # Import Anthropic client
    from anthropic import Anthropic
    from app.core.config import settings

    # Build AI prompt
    system_prompt = f"""{prompt_template}

---

להלן מידע על הערכת המנהל:

{context}

נא לנתח את ההערכה לפי המבנה שהוגדר לעיל."""

    try:
        # Check API key
        if not settings.ANTHROPIC_API_KEY:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="ANTHROPIC_API_KEY not configured"
            )

        # Create Anthropic client
        client = Anthropic(api_key=settings.ANTHROPIC_API_KEY, timeout=60.0)

        # Try models in order
        models_to_try = [
            "claude-3-5-sonnet-latest",
            "claude-3-opus-latest",
            "claude-3-sonnet-20240229",
            "claude-3-haiku-20240307"
        ]

        ai_summary = None
        for model_name in models_to_try:
            try:
                print(f"🤖 Trying Claude model: {model_name}")
                message = client.messages.create(
                    model=model_name,
                    max_tokens=4096,
                    system=system_prompt,
                    messages=[
                        {"role": "user", "content": "צור ניתוח מפורט של הערכת המנהל"}
                    ]
                )
                ai_summary = message.content[0].text
                print(f"✅ Claude responded successfully with {model_name}")
                break
            except Exception as model_error:
                print(f"❌ Model {model_name} failed: {str(model_error)}")
                continue

        if not ai_summary:
            raise Exception("All Claude models failed")

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

קטגוריות הערכה:
{categories_text}

הערות כלליות: {evaluation.general_comments or 'אין'}

{'סיכום AI: ' + evaluation.ai_summary if evaluation.ai_summary else ''}
"""

    # Import Anthropic client
    from anthropic import Anthropic
    from app.core.config import settings

    system_prompt = f"""אתה יועץ ארגוני מנוסה המתמחה בהערכת מנהלי מסעדות.

להלן מידע על הערכת מנהל:
{context}

נא לענות על השאלות בצורה מקצועית, תמציתית וממוקדת, תוך התבססות על הנתונים שבדוח ההערכה.
אם השאלה דורשת המלצות - תן המלצות ספציפיות ומעשיות.
כתוב בעברית ברורה."""

    try:
        # Check API key
        if not settings.ANTHROPIC_API_KEY:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="ANTHROPIC_API_KEY not configured"
            )

        # Create Anthropic client
        client = Anthropic(api_key=settings.ANTHROPIC_API_KEY, timeout=30.0)

        # Try models in order
        models_to_try = [
            "claude-3-5-sonnet-latest",
            "claude-3-opus-latest",
            "claude-3-sonnet-20240229",
            "claude-3-haiku-20240307"
        ]

        ai_answer = None
        for model_name in models_to_try:
            try:
                message = client.messages.create(
                    model=model_name,
                    max_tokens=2048,
                    system=system_prompt,
                    messages=[
                        {"role": "user", "content": chat_request.question}
                    ]
                )
                ai_answer = message.content[0].text
                break
            except Exception:
                continue

        if not ai_answer:
            raise Exception("All Claude models failed")

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
