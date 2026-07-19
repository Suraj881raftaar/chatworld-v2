from datetime import datetime, timezone
from uuid import UUID, uuid4
from dataclasses import dataclass, field

@dataclass
class Room:
    name: str
    creator_id: UUID
    description: str | None = None
    is_private: bool = False
    id: UUID = field(default_factory=uuid4)
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc).replace(tzinfo=None))
    updated_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc).replace(tzinfo=None))

    def update_metadata(self, name: str | None = None, description: str | None = None) -> None:
        if name:
            self.name = name
        if description is not None:
            self.description = description
        self.updated_at = datetime.now(timezone.utc).replace(tzinfo=None)
