from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, Field

class RoomCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    description: str | None = Field(None, max_length=255)
    is_private: bool = False


class RoomOut(BaseModel):
    id: UUID
    name: str
    description: str | None = None
    is_private: bool
    creator_id: UUID | None = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
