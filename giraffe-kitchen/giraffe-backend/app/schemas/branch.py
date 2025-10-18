from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class BranchBase(BaseModel):
    name: str
    location: Optional[str] = None


class BranchCreate(BranchBase):
    pass


class BranchResponse(BranchBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True
