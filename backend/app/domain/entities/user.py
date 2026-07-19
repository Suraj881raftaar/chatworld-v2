from datetime import datetime, timezone
from uuid import UUID, uuid4
from dataclasses import dataclass, field

@dataclass
class User:
    username: str
    email: str
    hashed_password: str
    role: str = "user" # user | admin
    avatar_url: str | None = None
    status_message: str | None = None
    is_active: bool = True
    id: UUID = field(default_factory=uuid4)
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    def update_profile(self, username: str | None = None, status_message: str | None = None, avatar_url: str | None = None) -> None:
        if username:
            self.username = username
        if status_message is not None:
            self.status_message = status_message
        if avatar_url is not None:
            self.avatar_url = avatar_url
        self.updated_at = datetime.now(timezone.utc)

    def suspend(self) -> None:
        self.is_active = False
        self.updated_at = datetime.now(timezone.utc)

    def activate(self) -> None:
        self.is_active = True
        self.updated_at = datetime.now(timezone.utc)
