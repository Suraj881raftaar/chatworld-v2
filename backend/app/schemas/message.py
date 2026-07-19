from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, Field

class MessageOut(BaseModel):
    id: UUID
    room_id: UUID
    sender_id: UUID | None = None
    message_type: str
    content: str
    file_url: str | None = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
