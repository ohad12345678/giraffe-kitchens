"""
Sanitation Audit API endpoints

These endpoints allow HQ users to create, view, and manage sanitation audit reports.
Branch managers can view audits for their branch only.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, desc
from typing import List, Optional
from datetime import datetime
from anthropic import Anthropic
import os

from app.db.base import get_db
from app.models.sanitation_audit import SanitationAudit, SanitationAuditCategory, AuditStatus
from app.models.user import User, UserRole
from app.models.branch import Branch
from app.schemas.sanitation_audit import (
    SanitationAuditCreate,
    SanitationAuditUpdate,
    SanitationAuditResponse,
    SanitationAuditSummary,
    SanitationAuditCategoryUpdate,
    NetworkAuditStats,
    BranchAuditStats,
)
from app.api.deps import get_current_user
from app.core.config import settings
from app.services.email import send_audit_completion_email

router = APIRouter()


# ===== Helper Functions =====

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


def calculate_audit_score(audit: SanitationAudit, db: Session) -> None:
    """
    Calculate total score for an audit based on category deductions.
    Updates the audit's total_score and total_deductions.
    """
    total_deductions = sum(
        category.score_deduction
        for category in audit.categories
    )
    audit.total_deductions = total_deductions
    audit.total_score = max(0, 100 - total_deductions)  # Score can't go below 0


def generate_deficiencies_summary(audit: SanitationAudit, db: Session) -> str:
    """
    Generate an AI-powered professional summary of the audit using Claude.
    Falls back to simple text if AI is unavailable.
    """
    print(f"\n{'='*60}")
    print(f"🤖 generate_deficiencies_summary called for audit {audit.id}")
    print(f"{'='*60}\n")

    # Get API key
    api_key = settings.ANTHROPIC_API_KEY

    # Fallback to simple summary if no API key
    if not api_key:
        print("⚠️  No ANTHROPIC_API_KEY found - using fallback summary")
        deficiencies = [
            f"{cat.category_name} - {cat.notes}"
            for cat in audit.categories
            if cat.score_deduction > 0 and cat.notes
        ]
        return "\n".join(deficiencies) if deficiencies else "לא נמצאו ליקויים"

    try:
        # Prepare audit data for AI analysis
        categories_with_issues = [
            {
                "name": cat.category_name,
                "deduction": cat.score_deduction,
                "notes": cat.notes,
                "status": cat.status
            }
            for cat in audit.categories
            if cat.score_deduction > 0
        ]

        # Build detailed audit context
        audit_context = f"""
## פרטי הביקורת:
- **סניף:** {audit.branch.name}
- **תאריך ביקורת:** {audit.audit_date.strftime('%d/%m/%Y')}
- **ממלא:** {audit.auditor_name}
- **מלווה:** {audit.accompanist_name or 'לא צוין'}
- **ציון כולל:** {audit.total_score}/100
- **סך ניכויים:** {audit.total_deductions} נקודות

## ליקויים שנמצאו ({len(categories_with_issues)} עמדות):
"""

        for cat in categories_with_issues:
            audit_context += f"\n### {cat['name']}\n"
            audit_context += f"- **ניכוי:** {cat['deduction']} נקודות\n"
            audit_context += f"- **סטטוס:** {cat['status']}\n"
            if cat['notes']:
                audit_context += f"- **הערות:** {cat['notes']}\n"

        if audit.general_notes:
            audit_context += f"\n## הערות כלליות:\n{audit.general_notes}\n"

        if audit.equipment_issues:
            audit_context += f"\n## בעיות ציוד:\n{audit.equipment_issues}\n"

        # Load the detailed prompt template
        prompt_template = load_prompt_template("sanitation_audit_analysis")

        if not prompt_template:
            # Fallback if template not found
            raise Exception("Prompt template not found")

        # Create Claude client
        client = Anthropic(api_key=api_key, timeout=60.0)  # Longer timeout for analysis

        # Build system prompt with template + context
        system_prompt = f"""{prompt_template}

---

{audit_context}

בבקשה צור ניתוח מפורט ומקצועי של ביקורת התברואה לפי הפורמט המוגדר לעיל.
"""

        # Try models
        models_to_try = [
            "claude-3-5-sonnet-latest",
            "claude-3-opus-latest",
            "claude-3-sonnet-20240229"
        ]

        for model_name in models_to_try:
            try:
                print(f"🤖 Generating audit summary with {model_name}")
                message = client.messages.create(
                    model=model_name,
                    max_tokens=4096,  # Longer response for detailed analysis
                    system=system_prompt,
                    messages=[
                        {"role": "user", "content": "צור ניתוח מפורט של דוח הביקורת"}
                    ]
                )

                summary = message.content[0].text
                print(f"✅ AI summary generated successfully")
                return summary

            except Exception as model_error:
                print(f"❌ Model {model_name} failed: {str(model_error)}")
                continue

        # If all models failed, fall back to simple summary
        raise Exception("All AI models failed")

    except Exception as e:
        print(f"⚠️  AI summary generation failed: {str(e)}, using fallback")
        # Fallback to simple text summary
        deficiencies = [
            f"{cat.category_name} - {cat.notes}"
            for cat in audit.categories
            if cat.score_deduction > 0 and cat.notes
        ]
        return "\n".join(deficiencies) if deficiencies else "לא נמצאו ליקויים"


# ===== CRUD Endpoints =====

@router.post("/", response_model=SanitationAuditResponse, status_code=status.HTTP_201_CREATED)
def create_sanitation_audit(
    audit_data: SanitationAuditCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new sanitation audit report.

    - Only HQ users can create audits
    - Automatically calculates total score based on category deductions
    - Generates deficiencies summary
    """
    # Check if user is HQ
    if current_user.role != UserRole.HQ:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only HQ users can create sanitation audits"
        )

    # Verify branch exists
    branch = db.query(Branch).filter(Branch.id == audit_data.branch_id).first()
    if not branch:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Branch not found"
        )

    # Create audit
    audit = SanitationAudit(
        branch_id=audit_data.branch_id,
        auditor_id=current_user.id,
        audit_date=audit_data.audit_date,
        start_time=audit_data.start_time,
        auditor_name=audit_data.auditor_name,
        accompanist_name=audit_data.accompanist_name,
        general_notes=audit_data.general_notes,
        equipment_issues=audit_data.equipment_issues,
        status=AuditStatus.IN_PROGRESS
    )

    db.add(audit)
    db.flush()  # Get audit.id before adding categories

    # Add categories
    for cat_data in audit_data.categories:
        category = SanitationAuditCategory(
            audit_id=audit.id,
            category_name=cat_data.category_name,
            category_key=cat_data.category_key,
            status=cat_data.status,
            notes=cat_data.notes,
            score_deduction=cat_data.score_deduction,
            check_performed=cat_data.check_performed,
            check_name=cat_data.check_name,
            image_urls=",".join(cat_data.image_urls) if cat_data.image_urls else None
        )
        db.add(category)

    # Calculate score and generate summary
    db.flush()
    db.refresh(audit)  # Load relationships
    calculate_audit_score(audit, db)
    audit.deficiencies_summary = generate_deficiencies_summary(audit, db)

    db.commit()
    db.refresh(audit)

    return audit


@router.get("/", response_model=List[SanitationAuditSummary])
def list_sanitation_audits(
    branch_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    List all sanitation audits.

    - HQ users see all audits (can filter by branch_id)
    - Branch managers see only their branch's audits
    """
    query = db.query(SanitationAudit).join(Branch)

    # Filter by user role
    if current_user.role == UserRole.BRANCH_MANAGER:
        if not current_user.branch_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Branch manager must be assigned to a branch"
            )
        query = query.filter(SanitationAudit.branch_id == current_user.branch_id)
    elif branch_id:
        query = query.filter(SanitationAudit.branch_id == branch_id)

    # Order by most recent first
    audits = query.order_by(desc(SanitationAudit.audit_date)).offset(skip).limit(limit).all()

    # Format response
    return [
        SanitationAuditSummary(
            id=audit.id,
            branch_id=audit.branch_id,
            branch_name=audit.branch.name,
            audit_date=audit.audit_date,
            auditor_name=audit.auditor_name,
            total_score=audit.total_score,
            total_deductions=audit.total_deductions,
            status=audit.status,
            created_at=audit.created_at
        )
        for audit in audits
    ]


@router.get("/{audit_id}", response_model=SanitationAuditResponse)
def get_sanitation_audit(
    audit_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get a specific sanitation audit by ID.

    - HQ users can view any audit
    - Branch managers can only view their branch's audits
    """
    audit = db.query(SanitationAudit).filter(SanitationAudit.id == audit_id).first()

    if not audit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Audit not found"
        )

    # Check permissions
    if current_user.role == UserRole.BRANCH_MANAGER:
        if audit.branch_id != current_user.branch_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only view audits for your branch"
            )

    return audit


@router.put("/{audit_id}", response_model=SanitationAuditResponse)
def update_sanitation_audit(
    audit_id: int,
    audit_update: SanitationAuditUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update a sanitation audit.

    - Only HQ users can update audits
    - Can update audit details and status
    """
    # Only HQ can update
    if current_user.role != UserRole.HQ:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only HQ users can update audits"
        )

    audit = db.query(SanitationAudit).filter(SanitationAudit.id == audit_id).first()
    if not audit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Audit not found"
        )

    # Check if audit is being completed (status changing to COMPLETED)
    was_completed = audit.status == AuditStatus.COMPLETED
    is_now_completed = audit_update.status == AuditStatus.COMPLETED if audit_update.status else False

    # Update fields
    update_data = audit_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(audit, field, value)

    # If completing audit, set signed_at
    if audit_update.status == AuditStatus.COMPLETED and audit_update.signature_url:
        audit.signed_at = datetime.utcnow()

    audit.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(audit)

    # Send email notification if audit was just completed
    if is_now_completed and not was_completed:
        try:
            # Get branch manager email
            branch_manager = db.query(User).filter(
                User.branch_id == audit.branch_id,
                User.role == UserRole.BRANCH_MANAGER
            ).first()

            # Get all HQ users emails
            hq_users = db.query(User).filter(User.role == UserRole.HQ).all()

            # Prepare recipient list
            recipients = []
            if branch_manager and branch_manager.email:
                recipients.append(branch_manager.email)
            recipients.extend([user.email for user in hq_users if user.email])

            if recipients:
                # Determine score color
                score_color = "#22c55e"  # green
                if audit.total_score < 70:
                    score_color = "#ef4444"  # red
                elif audit.total_score < 85:
                    score_color = "#f59e0b"  # orange

                # Prepare audit data for email
                audit_data = {
                    'branch_name': audit.branch.name,
                    'audit_date': audit.audit_date.strftime('%d/%m/%Y'),
                    'auditor_name': audit.auditor_name,
                    'accompanist_name': audit.accompanist_name,
                    'total_score': audit.total_score,
                    'score_color': score_color,
                    'audit_url': f"{settings.ALLOWED_ORIGINS.split(',')[0]}/sanitation-audits/{audit.id}"
                }

                # Send email with the summary
                send_audit_completion_email(
                    audit_data=audit_data,
                    summary=audit.deficiencies_summary or "לא נמצאו ליקויים",
                    to_emails=recipients
                )
                print(f"📧 Sent audit completion email to {len(recipients)} recipients")
        except Exception as e:
            print(f"⚠️  Failed to send audit completion email: {str(e)}")
            # Don't fail the request if email fails

    return audit


@router.put("/{audit_id}/categories/{category_id}", response_model=SanitationAuditResponse)
def update_audit_category(
    audit_id: int,
    category_id: int,
    category_update: SanitationAuditCategoryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update a specific category in an audit.

    - Only HQ users can update
    - Recalculates total score after update
    """
    if current_user.role != UserRole.HQ:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only HQ users can update audit categories"
        )

    category = db.query(SanitationAuditCategory).filter(
        SanitationAuditCategory.id == category_id,
        SanitationAuditCategory.audit_id == audit_id
    ).first()

    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found"
        )

    # Update category
    update_data = category_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if field == "image_urls" and value:
            setattr(category, field, ",".join(value))
        else:
            setattr(category, field, value)

    category.updated_at = datetime.utcnow()

    # Recalculate audit score
    audit = category.audit
    db.refresh(audit)  # Load relationships including branch
    calculate_audit_score(audit, db)
    audit.deficiencies_summary = generate_deficiencies_summary(audit, db)
    audit.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(audit)

    return audit


@router.delete("/{audit_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_sanitation_audit(
    audit_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Delete a sanitation audit.

    - Only HQ users can delete audits
    """
    if current_user.role != UserRole.HQ:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only HQ users can delete audits"
        )

    audit = db.query(SanitationAudit).filter(SanitationAudit.id == audit_id).first()
    if not audit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Audit not found"
        )

    db.delete(audit)
    db.commit()


# ===== Analytics Endpoints =====

@router.get("/stats/network", response_model=NetworkAuditStats)
def get_network_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get network-wide statistics for all branches.

    - Only HQ users can access
    - Returns average scores, trends, and comparisons
    """
    if current_user.role != UserRole.HQ:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only HQ users can view network statistics"
        )

    # Get all branches with their audit stats
    branches = db.query(Branch).all()
    branch_stats = []

    for branch in branches:
        audits = db.query(SanitationAudit).filter(
            SanitationAudit.branch_id == branch.id
        ).order_by(desc(SanitationAudit.audit_date)).all()

        if not audits:
            continue

        avg_score = sum(a.total_score for a in audits) / len(audits)
        latest_score = audits[0].total_score if audits else None

        # Determine trend
        if len(audits) >= 2:
            recent_avg = sum(a.total_score for a in audits[:3]) / min(3, len(audits))
            older_avg = sum(a.total_score for a in audits[3:6]) / max(1, min(3, len(audits) - 3))
            if recent_avg > older_avg + 5:
                trend = "improving"
            elif recent_avg < older_avg - 5:
                trend = "declining"
            else:
                trend = "stable"
        else:
            trend = "insufficient_data"

        # Get common issues
        common_issues = []
        issue_counts = {}
        for audit in audits[:5]:  # Last 5 audits
            for cat in audit.categories:
                if cat.score_deduction > 0 and cat.category_name:
                    issue_counts[cat.category_name] = issue_counts.get(cat.category_name, 0) + 1

        common_issues = sorted(issue_counts.items(), key=lambda x: x[1], reverse=True)[:3]
        common_issues = [issue[0] for issue in common_issues]

        branch_stats.append(BranchAuditStats(
            branch_id=branch.id,
            branch_name=branch.name,
            total_audits=len(audits),
            average_score=round(avg_score, 1),
            latest_score=round(latest_score, 1) if latest_score else None,
            score_trend=trend,
            common_issues=common_issues
        ))

    # Calculate network stats
    total_audits = sum(bs.total_audits for bs in branch_stats)
    network_avg = sum(bs.average_score * bs.total_audits for bs in branch_stats) / total_audits if total_audits > 0 else 0

    best_branch = max(branch_stats, key=lambda x: x.average_score) if branch_stats else None
    worst_branch = min(branch_stats, key=lambda x: x.average_score) if branch_stats else None

    # Get network-wide common issues
    all_issues = []
    for bs in branch_stats:
        all_issues.extend(bs.common_issues)
    issue_counts = {}
    for issue in all_issues:
        issue_counts[issue] = issue_counts.get(issue, 0) + 1
    common_issues_network = sorted(issue_counts.items(), key=lambda x: x[1], reverse=True)[:5]
    common_issues_network = [issue[0] for issue in common_issues_network]

    return NetworkAuditStats(
        total_audits=total_audits,
        network_average_score=round(network_avg, 1),
        best_performing_branch=best_branch,
        worst_performing_branch=worst_branch,
        branch_stats=branch_stats,
        common_issues_network=common_issues_network
    )


@router.get("/stats/branch/{branch_id}", response_model=BranchAuditStats)
def get_branch_stats(
    branch_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get statistics for a specific branch.

    - HQ can view any branch
    - Branch managers can only view their own branch
    """
    # Check permissions
    if current_user.role == UserRole.BRANCH_MANAGER:
        if branch_id != current_user.branch_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only view stats for your branch"
            )

    branch = db.query(Branch).filter(Branch.id == branch_id).first()
    if not branch:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Branch not found"
        )

    audits = db.query(SanitationAudit).filter(
        SanitationAudit.branch_id == branch_id
    ).order_by(desc(SanitationAudit.audit_date)).all()

    if not audits:
        return BranchAuditStats(
            branch_id=branch_id,
            branch_name=branch.name,
            total_audits=0,
            average_score=0,
            latest_score=None,
            score_trend="no_data",
            common_issues=[]
        )

    avg_score = sum(a.total_score for a in audits) / len(audits)
    latest_score = audits[0].total_score

    # Determine trend
    if len(audits) >= 2:
        recent_avg = sum(a.total_score for a in audits[:3]) / min(3, len(audits))
        older_avg = sum(a.total_score for a in audits[3:6]) / max(1, min(3, len(audits) - 3))
        if recent_avg > older_avg + 5:
            trend = "improving"
        elif recent_avg < older_avg - 5:
            trend = "declining"
        else:
            trend = "stable"
    else:
        trend = "insufficient_data"

    # Get common issues
    issue_counts = {}
    for audit in audits[:5]:
        for cat in audit.categories:
            if cat.score_deduction > 0 and cat.category_name:
                issue_counts[cat.category_name] = issue_counts.get(cat.category_name, 0) + 1

    common_issues = sorted(issue_counts.items(), key=lambda x: x[1], reverse=True)[:5]
    common_issues = [issue[0] for issue in common_issues]

    return BranchAuditStats(
        branch_id=branch_id,
        branch_name=branch.name,
        total_audits=len(audits),
        average_score=round(avg_score, 1),
        latest_score=round(latest_score, 1),
        score_trend=trend,
        common_issues=common_issues
    )


@router.get("/branches/{branch_id}/recent", response_model=List[SanitationAuditResponse])
def get_recent_audits_for_branch(
    branch_id: int,
    limit: int = 2,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get recent audits for a specific branch (for AI comparison)."""
    # HQ can see all, branch managers only their branch
    if current_user.role != UserRole.HQ and current_user.branch_id != branch_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this branch's audits"
        )

    # Get recent audits excluding the current one being created
    audits = db.query(SanitationAudit).filter(
        SanitationAudit.branch_id == branch_id,
        SanitationAudit.status == AuditStatus.COMPLETED
    ).order_by(desc(SanitationAudit.audit_date)).limit(limit).all()

    # Convert to response format with categories
    result = []
    for audit in audits:
        categories = db.query(SanitationAuditCategory).filter(
            SanitationAuditCategory.audit_id == audit.id
        ).all()

        result.append(SanitationAuditResponse(
            id=audit.id,
            branch_id=audit.branch_id,
            auditor_id=audit.auditor_id,
            audit_date=audit.audit_date,
            start_time=audit.start_time,
            end_time=audit.end_time,
            auditor_name=audit.auditor_name,
            accompanist_name=audit.accompanist_name,
            total_score=audit.total_score,
            total_deductions=audit.total_deductions,
            status=audit.status.value,
            general_notes=audit.general_notes,
            equipment_issues=audit.equipment_issues,
            deficiencies_summary=audit.deficiencies_summary,
            signature_url=audit.signature_url,
            signed_at=audit.signed_at,
            created_at=audit.created_at,
            updated_at=audit.updated_at,
            categories=[{
                'id': cat.id,
                'category_name': cat.category_name,
                'category_key': cat.category_key,
                'status': cat.status,
                'notes': cat.notes,
                'score_deduction': cat.score_deduction,
                'check_performed': cat.check_performed,
                'check_name': cat.check_name,
                'image_urls': cat.image_urls.split(',') if cat.image_urls else []
            } for cat in categories]
        ))

    return result


@router.post("/{audit_id}/generate-summary")
def generate_ai_summary(
    audit_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Generate AI summary with insights and comparison to previous audits."""
    # Only HQ can generate summaries
    if current_user.role != UserRole.HQ:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only HQ users can generate summaries"
        )

    # Get current audit with branch relationship loaded
    audit = db.query(SanitationAudit).options(
        joinedload(SanitationAudit.branch)
    ).filter(SanitationAudit.id == audit_id).first()
    if not audit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Audit not found"
        )

    # Get audit categories
    categories = db.query(SanitationAuditCategory).filter(
        SanitationAuditCategory.audit_id == audit_id
    ).all()

    # Get 2 previous audits for comparison
    previous_audits = db.query(SanitationAudit).filter(
        SanitationAudit.branch_id == audit.branch_id,
        SanitationAudit.id != audit_id,
        SanitationAudit.status == AuditStatus.COMPLETED
    ).order_by(desc(SanitationAudit.audit_date)).limit(2).all()

    # Prepare data for AI
    defects = []
    for cat in categories:
        if cat.score_deduction > 0:
            defects.append({
                'category': cat.category_name,
                'deduction': cat.score_deduction,
                'notes': cat.notes
            })

    # Prepare comparison data
    comparison_data = []
    for prev_audit in previous_audits:
        prev_cats = db.query(SanitationAuditCategory).filter(
            SanitationAuditCategory.audit_id == prev_audit.id
        ).all()
        comparison_data.append({
            'date': prev_audit.audit_date.strftime('%Y-%m-%d'),
            'score': prev_audit.total_score,
            'deductions': prev_audit.total_deductions,
            'defects': [{'category': c.category_name, 'deduction': c.score_deduction} for c in prev_cats if c.score_deduction > 0]
        })

    # Generate AI-powered summary using the detailed prompt template
    # This will use the same function we created earlier
    ai_summary = generate_deficiencies_summary(audit, db)

    # Update audit with summary
    audit.deficiencies_summary = ai_summary
    db.commit()

    return {
        "summary": ai_summary,
        "current_score": audit.total_score,
        "previous_scores": [c['score'] for c in comparison_data]
    }
