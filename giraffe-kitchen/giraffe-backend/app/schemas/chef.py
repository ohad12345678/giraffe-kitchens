from pydantic import BaseModel
from datetime import datetime


class ChefBase(BaseModel):
    name: str
    branch_id: int


class ChefCreate(ChefBase):
    pass


class ChefResponse(ChefBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True
