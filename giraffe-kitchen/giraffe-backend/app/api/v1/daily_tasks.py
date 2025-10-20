"""
Daily Tasks API - משימות יומיות
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from pydantic import BaseModel
from typing import List, Optional
from datetime import date, datetime

from app.db.base import get_db
from app.api.deps import get_current_user
from app.models.user import User, UserRole
from app.models.daily_task import DailyTask, TaskAssignment, TaskType, TaskFrequency
from app.models.branch import Branch

router = APIRouter()


# Pydantic Models
class TaskCreate(BaseModel):
    """יצירת משימה חדשה"""
    title: str
    description: Optional[str] = None
    task_type: TaskType
    dish_id: Optional[int] = None
    frequency: TaskFrequency
    start_date: date
    end_date: Optional[date] = None
    branch_ids: List[int]  # רשימת סניפים שיקבלו את המשימה


class TaskUpdate(BaseModel):
    """עדכון משימה"""
    title: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


class TaskResponse(BaseModel):
    """תגובת משימה"""
    id: int
    title: str
    description: Optional[str] = None
    task_type: TaskType
    dish_id: Optional[int] = None
    dish_name: Optional[str] = None
    frequency: TaskFrequency
    start_date: date
    end_date: Optional[date] = None
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class TaskAssignmentResponse(BaseModel):
    """תגובת הקצאת משימה"""
    id: int
    task_id: int
    task_title: str
    task_description: Optional[str]
    task_type: TaskType
    dish_name: Optional[str]
    branch_id: int
    branch_name: str
    task_date: date
    is_completed: bool
    completed_at: Optional[datetime]
    notes: Optional[str]

    class Config:
        from_attributes = True


class CompleteTaskRequest(BaseModel):
    """השלמת משימה"""
    notes: Optional[str] = None
    check_id: Optional[int] = None  # אם המשימה קשורה לבדיקה ספציפית


# ============= HQ Endpoints =============

@router.post("/", response_model=TaskResponse)
def create_task(
    task_data: TaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    יצירת משימה יומית חדשה (HQ בלבד)
    """
    # בדיקת הרשאות
    if current_user.role != UserRole.HQ:
        raise HTTPException(status_code=403, detail="Only HQ users can create tasks")

    # יצירת המשימה
    new_task = DailyTask(
        title=task_data.title,
        description=task_data.description,
        task_type=task_data.task_type,
        dish_id=task_data.dish_id,
        frequency=task_data.frequency,
        start_date=task_data.start_date,
        end_date=task_data.end_date,
        created_by_user_id=current_user.id,
    )
    db.add(new_task)
    db.flush()

    # יצירת assignments לכל הסניפים שנבחרו
    for branch_id in task_data.branch_ids:
        # בדיקה שהסניף קיים
        branch = db.query(Branch).filter(Branch.id == branch_id).first()
        if not branch:
            continue

        # יצירת assignment להיום הראשון
        assignment = TaskAssignment(
            task_id=new_task.id,
            branch_id=branch_id,
            task_date=task_data.start_date,
        )
        db.add(assignment)

    db.commit()
    db.refresh(new_task)

    return new_task


@router.get("/", response_model=List[TaskResponse])
def list_tasks(
    is_active: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    רשימת כל המשימות (HQ בלבד)
    """
    if current_user.role != UserRole.HQ:
        raise HTTPException(status_code=403, detail="Only HQ users can view all tasks")

    query = db.query(DailyTask)

    if is_active is not None:
        query = query.filter(DailyTask.is_active == is_active)

    tasks = query.order_by(DailyTask.created_at.desc()).all()
    return tasks


@router.get("/assignments", response_model=List[TaskAssignmentResponse])
def list_task_assignments(
    task_date: Optional[date] = None,
    branch_id: Optional[int] = None,
    is_completed: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    רשימת כל ההקצאות (HQ בלבד) - מעקב אחר השלמות
    """
    if current_user.role != UserRole.HQ:
        raise HTTPException(status_code=403, detail="Only HQ users can view all assignments")

    query = db.query(TaskAssignment).join(DailyTask).join(Branch)

    if task_date:
        query = query.filter(TaskAssignment.task_date == task_date)

    if branch_id:
        query = query.filter(TaskAssignment.branch_id == branch_id)

    if is_completed is not None:
        query = query.filter(TaskAssignment.is_completed == is_completed)

    assignments = query.order_by(TaskAssignment.task_date.desc()).all()

    # Build response
    result = []
    for assignment in assignments:
        result.append({
            "id": assignment.id,
            "task_id": assignment.task_id,
            "task_title": assignment.task.title,
            "task_description": assignment.task.description,
            "task_type": assignment.task.task_type,
            "dish_name": assignment.task.dish.name if assignment.task.dish else None,
            "branch_id": assignment.branch_id,
            "branch_name": assignment.branch.name,
            "task_date": assignment.task_date,
            "is_completed": assignment.is_completed,
            "completed_at": assignment.completed_at,
            "notes": assignment.notes,
        })

    return result


# ============= Branch Manager Endpoints =============

@router.get("/my-tasks", response_model=List[TaskAssignmentResponse])
def get_my_tasks(
    task_date: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    המשימות שלי (למנהל סניף) - משימות לסניף שלי
    """
    if not current_user.branch_id:
        raise HTTPException(status_code=400, detail="User is not assigned to a branch")

    if not task_date:
        task_date = date.today()

    # חיפוש משימות עבור הסניף בתאריך הנתון
    assignments = (
        db.query(TaskAssignment)
        .join(DailyTask)
        .join(Branch)
        .filter(
            and_(
                TaskAssignment.branch_id == current_user.branch_id,
                TaskAssignment.task_date == task_date,
                DailyTask.is_active == True,
            )
        )
        .order_by(TaskAssignment.is_completed, DailyTask.created_at)
        .all()
    )

    # Build response
    result = []
    for assignment in assignments:
        result.append({
            "id": assignment.id,
            "task_id": assignment.task_id,
            "task_title": assignment.task.title,
            "task_description": assignment.task.description,
            "task_type": assignment.task.task_type,
            "dish_name": assignment.task.dish.name if assignment.task.dish else None,
            "branch_id": assignment.branch_id,
            "branch_name": assignment.branch.name,
            "task_date": assignment.task_date,
            "is_completed": assignment.is_completed,
            "completed_at": assignment.completed_at,
            "notes": assignment.notes,
        })

    return result


@router.post("/assignments/{assignment_id}/complete")
def complete_task(
    assignment_id: int,
    completion_data: CompleteTaskRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    סימון משימה כהושלמה
    """
    # מציאת ההקצאה
    assignment = db.query(TaskAssignment).filter(TaskAssignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Task assignment not found")

    # בדיקת הרשאות - רק מנהל הסניף הרלוונטי יכול להשלים
    if current_user.role == UserRole.BRANCH_MANAGER:
        if assignment.branch_id != current_user.branch_id:
            raise HTTPException(status_code=403, detail="Not authorized to complete this task")

    # סימון כהושלם
    assignment.is_completed = True
    assignment.completed_at = datetime.utcnow()
    assignment.completed_by_user_id = current_user.id
    assignment.notes = completion_data.notes
    assignment.check_id = completion_data.check_id

    db.commit()

    return {"status": "success", "message": "המשימה הושלמה בהצלחה"}


@router.delete("/assignments/{assignment_id}/complete")
def uncomplete_task(
    assignment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    ביטול השלמה של משימה
    """
    assignment = db.query(TaskAssignment).filter(TaskAssignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Task assignment not found")

    # בדיקת הרשאות
    if current_user.role == UserRole.BRANCH_MANAGER:
        if assignment.branch_id != current_user.branch_id:
            raise HTTPException(status_code=403, detail="Not authorized")

    # ביטול השלמה
    assignment.is_completed = False
    assignment.completed_at = None
    assignment.completed_by_user_id = None
    assignment.notes = None
    assignment.check_id = None

    db.commit()

    return {"status": "success", "message": "ההשלמה בוטלה"}
