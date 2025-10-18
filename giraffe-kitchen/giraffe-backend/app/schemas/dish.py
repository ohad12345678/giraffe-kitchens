from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class DishBase(BaseModel):
    name: str
    category: Optional[str] = None


class DishCreate(DishBase):
    pass


class DishResponse(DishBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True
