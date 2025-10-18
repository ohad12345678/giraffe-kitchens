from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class DishCheckBase(BaseModel):
    branch_id: int
    dish_id: int
    chef_id: Optional[int] = None
    chef_name_manual: Optional[str] = None
    rating: float = Field(..., ge=1, le=10)  # Rating between 1-10
    comments: Optional[str] = None


class DishCheckCreate(DishCheckBase):
    pass


class DishCheckResponse(DishCheckBase):
    id: int
    created_by: int
    check_date: datetime
    created_at: datetime

    class Config:
        from_attributes = True


class DishCheckWithDetails(DishCheckResponse):
    """Extended response with related entity details."""
    branch_name: Optional[str] = None
    dish_name: Optional[str] = None
    chef_name: Optional[str] = None
    created_by_name: Optional[str] = None
