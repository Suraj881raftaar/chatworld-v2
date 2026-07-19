from datetime import datetime, timezone
from uuid import UUID, uuid4
from dataclasses import dataclass, field

@dataclass
class Message:
    room_id: UUID
    sender_id: UUID | None
    content: str
    message_type: str = "text" # text | file | system
    file_url: str | None = None
    id: UUID = field(default_factory=uuid4)
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    def update_content(self, content: str) -> None:
        self.content = content
        self.updated_at = datetime.now(timezone.utc)
