from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from app.db.base import get_db
from app.schemas.chef import ChefCreate, ChefResponse
from app.models.chef import Chef
from app.models.user import User
from app.api.deps import get_current_user

router = APIRouter()


@router.get("/", response_model=List[ChefResponse])
def list_chefs(
    branch_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List chefs (optionally filtered by branch)."""
    query = db.query(Chef)

    # Branch managers can only see chefs from their branch
    if current_user.role.value == "branch_manager":
        query = query.filter(Chef.branch_id == current_user.branch_id)
    elif branch_id:
        query = query.filter(Chef.branch_id == branch_id)

    chefs = query.all()
    return chefs


@router.post("/", response_model=ChefResponse, status_code=status.HTTP_201_CREATED)
def create_chef(
    chef_data: ChefCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new chef."""
    # Branch managers can only create chefs for their own branch
    if current_user.role.value == "branch_manager" and chef_data.branch_id != current_user.branch_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only create chefs for your own branch"
        )

    new_chef = Chef(**chef_data.dict())
    db.add(new_chef)
    db.commit()
    db.refresh(new_chef)

    return new_chef
