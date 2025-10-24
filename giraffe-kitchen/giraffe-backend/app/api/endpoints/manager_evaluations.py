"""
API endpoints for Manager Evaluations.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from datetime import datetime, date
import json
import os

from app.db.base import get_db
from app.models import (
    ManagerEvaluation,
    EvaluationCategory,
    User,
    Branch,
    EvaluationStatus,
    PerformanceLevel
)
from app.schemas.manager_evaluation import (
    ManagerEvaluationCreate,
    ManagerEvaluationUpdate,
    ManagerEvaluationInDB,
    ManagerEvaluationList,
    EvaluationFormData,
    GenerateAIAnalysisRequest,
    GenerateAIAnalysisResponse,
    EvaluationCategoryCreate,
    EvaluationCategoryInDB
)
from app.api.deps import get_current_user, get_current_hq_user
from anthropic import Anthropic
from app.core.config import settings
from app.api.v1.sanitation_audits import load_prompt_template

router = APIRouter()


def calculate_total_score(evaluation: ManagerEvaluation) -> float:
    """
    Calculate the weighted total score for an evaluation.

    Weights:
    - Operational Management: 35%
    - People Management: 30%
    - Business Performance: 25%
    - Leadership: 10%
    """
    scores = []
    weights = []

    if evaluation.operational_management_score is not None:
        scores.append(evaluation.operational_management_score)
        weights.append(0.35)

    if evaluation.people_management_score is not None:
        scores.append(evaluation.people_management_score)
        weights.append(0.30)

    if evaluation.business_performance_score is not None:
        scores.append(evaluation.business_performance_score)
        weights.append(0.25)

    if evaluation.leadership_score is not None:
        scores.append(evaluation.leadership_score)
        weights.append(0.10)

    if not scores:
        return 0.0

    # Normalize weights if not all categories are scored
    total_weight = sum(weights)
    if total_weight > 0:
        normalized_weights = [w / total_weight for w in weights]
        total = sum(score * weight for score, weight in zip(scores, normalized_weights))
        return round(total, 1)

    return 0.0


def get_performance_level(score: float) -> PerformanceLevel:
    """Determine performance level based on score."""
    if score >= 90:
        return PerformanceLevel.OUTSTANDING
    elif score >= 80:
        return PerformanceLevel.EXCEEDS_EXPECTATIONS
    elif score >= 70:
        return PerformanceLevel.MEETS_EXPECTATIONS
    elif score >= 60:
        return PerformanceLevel.NEEDS_IMPROVEMENT
    else:
        return PerformanceLevel.DOES_NOT_MEET


@router.get("/", response_model=List[ManagerEvaluationList])
def list_evaluations(
    skip: int = 0,
    limit: int = 100,
    branch_id: Optional[int] = None,
    manager_id: Optional[int] = None,
    status: Optional[EvaluationStatus] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    List all manager evaluations.

    - HQ users can see all evaluations
    - Branch managers can only see their own evaluations
    """
    query = db.query(ManagerEvaluation).join(Branch)

    # Access control
    if current_user.role != "hq":
        # Branch managers can only see their own evaluations
        query = query.filter(ManagerEvaluation.manager_id == current_user.id)

    # Filters
    if branch_id:
        query = query.filter(ManagerEvaluation.branch_id == branch_id)
    if manager_id:
        query = query.filter(ManagerEvaluation.manager_id == manager_id)
    if status:
        query = query.filter(ManagerEvaluation.status == status)

    evaluations = query.offset(skip).limit(limit).all()

    # Format for list view
    result = []
    for eval in evaluations:
        result.append({
            "id": eval.id,
            "branch_id": eval.branch_id,
            "branch_name": eval.branch.name,
            "manager_id": eval.manager_id,
            "manager_name": eval.manager_name,
            "evaluator_name": eval.evaluator_name,
            "evaluation_date": eval.evaluation_date,
            "evaluation_period_start": eval.evaluation_period_start,
            "evaluation_period_end": eval.evaluation_period_end,
            "total_score": eval.total_score,
            "performance_level": eval.performance_level,
            "status": eval.status,
            "created_at": eval.created_at
        })

    return result


@router.get("/{evaluation_id}", response_model=ManagerEvaluationInDB)
def get_evaluation(
    evaluation_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get a single evaluation by ID.

    - HQ users can see all evaluations
    - Branch managers can only see their own evaluations
    """
    evaluation = db.query(ManagerEvaluation)\
        .options(joinedload(ManagerEvaluation.categories))\
        .filter(ManagerEvaluation.id == evaluation_id)\
        .first()

    if not evaluation:
        raise HTTPException(status_code=404, detail="הערכה לא נמצאה")

    # Access control
    if current_user.role != "hq" and evaluation.manager_id != current_user.id:
        raise HTTPException(status_code=403, detail="אין לך הרשאה לצפות בהערכה זו")

    return evaluation


@router.post("/", response_model=ManagerEvaluationInDB)
def create_evaluation(
    form_data: EvaluationFormData,
    current_user: User = Depends(get_current_hq_user),
    db: Session = Depends(get_db)
):
    """
    Create a new manager evaluation.

    Only HQ users can create evaluations.
    """
    # Check if manager exists
    manager = db.query(User).filter(User.id == form_data.manager_id).first()
    if not manager:
        raise HTTPException(status_code=404, detail="המנהל לא נמצא")

    # Calculate category scores
    operational_score = (
        form_data.sanitation_safety_score * 0.286 +  # 10/35
        form_data.inventory_costs_score * 0.286 +    # 10/35
        form_data.product_quality_score * 0.286 +    # 10/35
        form_data.maintenance_score * 0.142          # 5/35
    )

    people_score = (
        form_data.recruitment_training_score * 0.333 +  # 10/30
        form_data.scheduling_score * 0.333 +            # 10/30
        form_data.retention_climate_score * 0.334       # 10/30
    )

    business_score = (
        form_data.sales_profitability_score * 0.6 +     # 15/25
        form_data.operational_efficiency_score * 0.4     # 10/25
    )

    leadership_score = (
        form_data.initiative_score * 0.2 +
        form_data.problem_solving_score * 0.2 +
        form_data.communication_score * 0.2 +
        form_data.development_score * 0.2 +
        form_data.values_alignment_score * 0.2
    )

    # Create detailed scores JSON
    detailed_scores = {
        "operational": {
            "sanitation_safety": form_data.sanitation_safety_score,
            "inventory_costs": form_data.inventory_costs_score,
            "product_quality": form_data.product_quality_score,
            "maintenance": form_data.maintenance_score
        },
        "people": {
            "recruitment_training": form_data.recruitment_training_score,
            "scheduling": form_data.scheduling_score,
            "retention_climate": form_data.retention_climate_score
        },
        "business": {
            "sales_profitability": form_data.sales_profitability_score,
            "operational_efficiency": form_data.operational_efficiency_score
        },
        "leadership": {
            "initiative": form_data.initiative_score,
            "problem_solving": form_data.problem_solving_score,
            "communication": form_data.communication_score,
            "development": form_data.development_score,
            "values_alignment": form_data.values_alignment_score
        }
    }

    # Create evaluation
    evaluation = ManagerEvaluation(
        branch_id=form_data.branch_id,
        manager_id=form_data.manager_id,
        evaluator_id=current_user.id,
        evaluation_period_start=form_data.evaluation_period_start,
        evaluation_period_end=form_data.evaluation_period_end,
        evaluation_date=datetime.utcnow(),
        manager_name=form_data.manager_name,
        evaluator_name=current_user.full_name,
        evaluator_role="HQ Staff",
        operational_management_score=round(operational_score, 1),
        people_management_score=round(people_score, 1),
        business_performance_score=round(business_score, 1),
        leadership_score=round(leadership_score, 1),
        detailed_scores=detailed_scores,
        strengths_summary=form_data.strengths_summary,
        improvement_areas_summary=form_data.improvement_areas_summary,
        development_goals=[goal.dict() for goal in form_data.development_goals] if form_data.development_goals else None,
        promotion_potential=form_data.promotion_potential,
        management_notes=form_data.management_notes,
        status=EvaluationStatus.DRAFT
    )

    # Calculate total score and performance level
    evaluation.total_score = calculate_total_score(evaluation)
    evaluation.performance_level = get_performance_level(evaluation.total_score)

    db.add(evaluation)
    db.commit()

    # Create categories for detailed tracking
    categories_data = [
        ("ניהול תפעולי", "operational", "תברואה ובטיחות מזון", "sanitation_safety",
         form_data.sanitation_safety_score, 0.286, form_data.sanitation_notes),
        ("ניהול תפעולי", "operational", "ניהול מלאי ושליטה בעלויות", "inventory_costs",
         form_data.inventory_costs_score, 0.286, form_data.inventory_notes),
        ("ניהול תפעולי", "operational", "איכות מוצר ושירות", "product_quality",
         form_data.product_quality_score, 0.286, form_data.quality_notes),
        ("ניהול תפעולי", "operational", "תחזוקה וסדר", "maintenance",
         form_data.maintenance_score, 0.142, form_data.maintenance_notes),
        ("ניהול אנשים", "people", "גיוס והכשרה", "recruitment_training",
         form_data.recruitment_training_score, 0.333, form_data.recruitment_notes),
        ("ניהול אנשים", "people", "ניהול משמרות ותזמון", "scheduling",
         form_data.scheduling_score, 0.333, form_data.scheduling_notes),
        ("ניהול אנשים", "people", "אקלים ושימור עובדים", "retention_climate",
         form_data.retention_climate_score, 0.334, form_data.retention_notes),
        ("ביצועים עסקיים", "business", "מכירות ורווחיות", "sales_profitability",
         form_data.sales_profitability_score, 0.6, form_data.sales_notes),
        ("ביצועים עסקיים", "business", "יעילות תפעולית", "operational_efficiency",
         form_data.operational_efficiency_score, 0.4, form_data.efficiency_notes),
        ("מנהיגות והתפתחות אישית", "leadership", None, None,
         leadership_score, 1.0, form_data.leadership_notes),
    ]

    for cat_data in categories_data:
        category = EvaluationCategory(
            evaluation_id=evaluation.id,
            category_name=cat_data[0],
            category_key=cat_data[1],
            subcategory_name=cat_data[2],
            subcategory_key=cat_data[3],
            score=cat_data[4],
            weight=cat_data[5],
            improvement_areas=cat_data[6]
        )
        db.add(category)

    # Add metrics where available
    if form_data.waste_percentage is not None:
        cat = db.query(EvaluationCategory).filter(
            EvaluationCategory.evaluation_id == evaluation.id,
            EvaluationCategory.subcategory_key == "inventory_costs"
        ).first()
        if cat:
            cat.metrics = {"waste_percentage": form_data.waste_percentage}

    if form_data.mystery_shopper_score is not None:
        cat = db.query(EvaluationCategory).filter(
            EvaluationCategory.evaluation_id == evaluation.id,
            EvaluationCategory.subcategory_key == "product_quality"
        ).first()
        if cat:
            cat.metrics = {"mystery_shopper_score": form_data.mystery_shopper_score}

    if form_data.turnover_rate is not None:
        cat = db.query(EvaluationCategory).filter(
            EvaluationCategory.evaluation_id == evaluation.id,
            EvaluationCategory.subcategory_key == "retention_climate"
        ).first()
        if cat:
            cat.metrics = {"turnover_rate": form_data.turnover_rate}

    if form_data.sales_growth is not None:
        cat = db.query(EvaluationCategory).filter(
            EvaluationCategory.evaluation_id == evaluation.id,
            EvaluationCategory.subcategory_key == "sales_profitability"
        ).first()
        if cat:
            cat.metrics = {"sales_growth": form_data.sales_growth}

    if form_data.labor_cost_percentage is not None:
        cat = db.query(EvaluationCategory).filter(
            EvaluationCategory.evaluation_id == evaluation.id,
            EvaluationCategory.subcategory_key == "operational_efficiency"
        ).first()
        if cat:
            cat.metrics = {"labor_cost_percentage": form_data.labor_cost_percentage}

    db.commit()
    db.refresh(evaluation)

    return evaluation


@router.put("/{evaluation_id}", response_model=ManagerEvaluationInDB)
def update_evaluation(
    evaluation_id: int,
    update_data: ManagerEvaluationUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update an existing evaluation.

    - HQ users can update any evaluation
    - Branch managers can only add comments to their own evaluations
    """
    evaluation = db.query(ManagerEvaluation).filter(ManagerEvaluation.id == evaluation_id).first()

    if not evaluation:
        raise HTTPException(status_code=404, detail="הערכה לא נמצאה")

    # Access control
    if current_user.role != "hq":
        if evaluation.manager_id != current_user.id:
            raise HTTPException(status_code=403, detail="אין לך הרשאה לעדכן הערכה זו")
        # Branch managers can only update their comments
        if update_data.manager_comments is not None:
            evaluation.manager_comments = update_data.manager_comments
            evaluation.manager_acknowledged = True
            evaluation.manager_acknowledged_at = datetime.utcnow()
            db.commit()
            db.refresh(evaluation)
            return evaluation
        else:
            raise HTTPException(status_code=403, detail="מנהלי סניף יכולים רק להוסיף הערות")

    # HQ users can update everything
    update_dict = update_data.dict(exclude_unset=True)
    for field, value in update_dict.items():
        setattr(evaluation, field, value)

    # Recalculate total score if any score field was updated
    if any(field.endswith("_score") for field in update_dict.keys()):
        evaluation.total_score = calculate_total_score(evaluation)
        evaluation.performance_level = get_performance_level(evaluation.total_score)

    db.commit()
    db.refresh(evaluation)

    return evaluation


@router.post("/{evaluation_id}/generate-analysis", response_model=GenerateAIAnalysisResponse)
def generate_ai_analysis(
    evaluation_id: int,
    request: GenerateAIAnalysisRequest,
    current_user: User = Depends(get_current_hq_user),
    db: Session = Depends(get_db)
):
    """
    Generate AI analysis for an evaluation using OpenAI.

    Only HQ users can generate analyses.
    """
    evaluation = db.query(ManagerEvaluation)\
        .options(joinedload(ManagerEvaluation.categories))\
        .filter(ManagerEvaluation.id == evaluation_id)\
        .first()

    if not evaluation:
        raise HTTPException(status_code=404, detail="הערכה לא נמצאה")

    # Check if analysis already exists and regenerate flag
    if evaluation.ai_analysis and not request.regenerate:
        return GenerateAIAnalysisResponse(
            evaluation_id=evaluation.id,
            ai_analysis=evaluation.ai_analysis,
            generated_at=evaluation.ai_analysis_generated_at,
            status="existing"
        )

    # Load the prompt template
    prompt_file = os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
        "prompts",
        "manager_evaluation_analysis.txt"
    )

    with open(prompt_file, 'r', encoding='utf-8') as f:
        prompt_template = f.read()

    # Prepare evaluation data for the prompt
    evaluation_text = f"""
    שם מנהל: {evaluation.manager_name}
    סניף: {evaluation.branch.name}
    תקופת הערכה: {evaluation.evaluation_period_start} עד {evaluation.evaluation_period_end}
    מעריך: {evaluation.evaluator_name} ({evaluation.evaluator_role})

    ציונים לפי קטגוריות:

    ניהול תפעולי (35%): {evaluation.operational_management_score}/100
    """

    if evaluation.detailed_scores:
        ops = evaluation.detailed_scores.get("operational", {})
        evaluation_text += f"""
    - תברואה ובטיחות מזון: {ops.get('sanitation_safety', 'N/A')}/100
    - ניהול מלאי ושליטה בעלויות: {ops.get('inventory_costs', 'N/A')}/100
    - איכות מוצר ושירות: {ops.get('product_quality', 'N/A')}/100
    - תחזוקה וסדר: {ops.get('maintenance', 'N/A')}/100
    """

    evaluation_text += f"""
    ניהול אנשים (30%): {evaluation.people_management_score}/100
    """

    if evaluation.detailed_scores:
        people = evaluation.detailed_scores.get("people", {})
        evaluation_text += f"""
    - גיוס והכשרה: {people.get('recruitment_training', 'N/A')}/100
    - ניהול משמרות ותזמון: {people.get('scheduling', 'N/A')}/100
    - אקלים ושימור עובדים: {people.get('retention_climate', 'N/A')}/100
    """

    evaluation_text += f"""
    ביצועים עסקיים (25%): {evaluation.business_performance_score}/100
    """

    if evaluation.detailed_scores:
        business = evaluation.detailed_scores.get("business", {})
        evaluation_text += f"""
    - מכירות ורווחיות: {business.get('sales_profitability', 'N/A')}/100
    - יעילות תפעולית: {business.get('operational_efficiency', 'N/A')}/100
    """

    evaluation_text += f"""
    מנהיגות והתפתחות אישית (10%): {evaluation.leadership_score}/100
    """

    if evaluation.detailed_scores:
        leadership = evaluation.detailed_scores.get("leadership", {})
        evaluation_text += f"""
    - יוזמה: {leadership.get('initiative', 'N/A')}/100
    - פתרון בעיות: {leadership.get('problem_solving', 'N/A')}/100
    - תקשורת: {leadership.get('communication', 'N/A')}/100
    - פיתוח: {leadership.get('development', 'N/A')}/100
    - התאמה לערכי החברה: {leadership.get('values_alignment', 'N/A')}/100
    """

    evaluation_text += f"""

    ציון כולל משוקלל: {evaluation.total_score}/100
    רמת ביצועים: {evaluation.performance_level}
    """

    # Add category notes if available
    if evaluation.categories:
        evaluation_text += "\n\nהערות לפי קטגוריות:\n"
        for cat in evaluation.categories:
            if cat.improvement_areas:
                evaluation_text += f"- {cat.subcategory_name or cat.category_name}: {cat.improvement_areas}\n"

    # Add summaries if available
    if evaluation.strengths_summary:
        evaluation_text += f"\n\nנקודות חוזק (מתוך ההערכה):\n{evaluation.strengths_summary}\n"

    if evaluation.improvement_areas_summary:
        evaluation_text += f"\n\nתחומים לשיפור (מתוך ההערכה):\n{evaluation.improvement_areas_summary}\n"

    # Generate analysis using Claude
    api_key = settings.ANTHROPIC_API_KEY

    if not api_key:
        raise HTTPException(status_code=500, detail="לא הוגדר מפתח API עבור Claude")

    # Combine template with evaluation data
    full_prompt = prompt_template.replace(
        "[הדבק כאן את טופס ההערכה או נתונים רלוונטיים]",
        evaluation_text
    )

    try:
        # Create Claude client
        client = Anthropic(api_key=api_key, timeout=60.0)

        # Try different models
        models_to_try = [
            "claude-3-5-sonnet-latest",
            "claude-3-opus-latest",
            "claude-3-sonnet-20240229",
            "claude-3-haiku-20240307"  # Fallback model
        ]

        analysis = None
        for model_name in models_to_try:
            try:
                print(f"🤖 Generating manager evaluation analysis with {model_name}")
                message = client.messages.create(
                    model=model_name,
                    max_tokens=4096,
                    system=full_prompt,
                    messages=[
                        {
                            "role": "user",
                            "content": "נתח את ההערכה וצור דוח מפורט לפי התבנית"
                        }
                    ]
                )
                analysis = message.content[0].text
                print(f"✅ Successfully generated analysis with {model_name}")
                break
            except Exception as model_error:
                print(f"❌ Failed with {model_name}: {str(model_error)}")
                continue

        if not analysis:
            raise Exception("Failed to generate analysis with all available models")

        # Save analysis to database
        evaluation.ai_analysis = analysis
        evaluation.ai_analysis_generated_at = datetime.utcnow()
        db.commit()

        return GenerateAIAnalysisResponse(
            evaluation_id=evaluation.id,
            ai_analysis=analysis,
            generated_at=evaluation.ai_analysis_generated_at,
            status="generated"
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"שגיאה ביצירת הניתוח: {str(e)}")


@router.post("/{evaluation_id}/approve")
def approve_evaluation(
    evaluation_id: int,
    current_user: User = Depends(get_current_hq_user),
    db: Session = Depends(get_db)
):
    """
    Approve an evaluation.

    Only HQ users can approve evaluations.
    """
    evaluation = db.query(ManagerEvaluation).filter(ManagerEvaluation.id == evaluation_id).first()

    if not evaluation:
        raise HTTPException(status_code=404, detail="הערכה לא נמצאה")

    if evaluation.status == EvaluationStatus.APPROVED:
        raise HTTPException(status_code=400, detail="ההערכה כבר אושרה")

    evaluation.status = EvaluationStatus.APPROVED
    evaluation.approved_by_id = current_user.id
    evaluation.approved_at = datetime.utcnow()

    db.commit()

    return {"message": "ההערכה אושרה בהצלחה", "evaluation_id": evaluation.id}


@router.delete("/{evaluation_id}")
def delete_evaluation(
    evaluation_id: int,
    current_user: User = Depends(get_current_hq_user),
    db: Session = Depends(get_db)
):
    """
    Delete an evaluation.

    Only HQ users can delete evaluations.
    """
    evaluation = db.query(ManagerEvaluation).filter(ManagerEvaluation.id == evaluation_id).first()

    if not evaluation:
        raise HTTPException(status_code=404, detail="הערכה לא נמצאה")

    if evaluation.status == EvaluationStatus.APPROVED:
        raise HTTPException(status_code=400, detail="לא ניתן למחוק הערכה מאושרת")

    db.delete(evaluation)
    db.commit()

    return {"message": "ההערכה נמחקה בהצלחה"}