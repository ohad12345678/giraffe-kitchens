from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.db.base import get_db
from app.schemas.branch import BranchCreate, BranchResponse
from app.models.branch import Branch
from app.models.user import User
from app.api.deps import get_current_user, require_hq_role

router = APIRouter()


@router.get("/", response_model=List[BranchResponse])
def list_branches(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all branches (HQ sees all, managers see only their branch)."""
    if current_user.role.value == "hq":
        branches = db.query(Branch).all()
    else:
        branches = db.query(Branch).filter(Branch.id == current_user.branch_id).all()

    return branches


@router.post("/", response_model=BranchResponse, status_code=status.HTTP_201_CREATED)
def create_branch(
    branch_data: BranchCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hq_role)
):
    """Create a new branch (HQ only)."""
    # Check if branch already exists
    existing = db.query(Branch).filter(Branch.name == branch_data.name).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Branch with this name already exists"
        )

    new_branch = Branch(**branch_data.dict())
    db.add(new_branch)
    db.commit()
    db.refresh(new_branch)

    return new_branch


@router.get("/{branch_id}", response_model=BranchResponse)
def get_branch(
    branch_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific branch."""
    branch = db.query(Branch).filter(Branch.id == branch_id).first()

    if not branch:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Branch not found"
        )

    # Branch managers can only access their own branch
    if current_user.role.value == "branch_manager" and current_user.branch_id != branch_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only access your own branch"
        )

    return branch
