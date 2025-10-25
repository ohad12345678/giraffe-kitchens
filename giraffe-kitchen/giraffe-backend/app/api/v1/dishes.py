from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.db.base import get_db
from app.schemas.dish import DishCreate, DishResponse
from app.models.dish import Dish
from app.models.user import User
from app.api.deps import get_current_user, require_hq_role

router = APIRouter()


@router.get("/", response_model=List[DishResponse])
def list_dishes(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all dishes."""
    dishes = db.query(Dish).all()
    return dishes


@router.post("/", response_model=DishResponse, status_code=status.HTTP_201_CREATED)
def create_dish(
    dish_data: DishCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hq_role)
):
    """Create a new dish (HQ only)."""
    existing = db.query(Dish).filter(Dish.name == dish_data.name).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Dish with this name already exists"
        )

    new_dish = Dish(**dish_data.dict())
    db.add(new_dish)
    db.commit()
    db.refresh(new_dish)

    return new_dish


@router.get("/{dish_id}", response_model=DishResponse)
def get_dish(
    dish_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific dish."""
    dish = db.query(Dish).filter(Dish.id == dish_id).first()

    if not dish:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dish not found"
        )

    return dish


@router.put("/{dish_id}", response_model=DishResponse)
def update_dish(
    dish_id: int,
    dish_data: DishCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hq_role)
):
    """Update a dish (HQ only)."""
    dish = db.query(Dish).filter(Dish.id == dish_id).first()

    if not dish:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dish not found"
        )

    # Check if name is being changed to an existing name
    if dish_data.name != dish.name:
        existing = db.query(Dish).filter(Dish.name == dish_data.name).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Dish with this name already exists"
            )

    # Update fields
    for key, value in dish_data.dict().items():
        setattr(dish, key, value)

    db.commit()
    db.refresh(dish)

    return dish


@router.delete("/{dish_id}")
def delete_dish(
    dish_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hq_role)
):
    """Delete a dish (HQ only)."""
    dish = db.query(Dish).filter(Dish.id == dish_id).first()

    if not dish:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dish not found"
        )

    db.delete(dish)
    db.commit()

    return {"status": "success", "message": f"Dish '{dish.name}' deleted"}
