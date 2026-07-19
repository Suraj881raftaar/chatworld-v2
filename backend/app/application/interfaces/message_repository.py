from abc import ABC, abstractmethod
from uuid import UUID
from app.domain.entities.message import Message

class MessageRepository(ABC):
    @abstractmethod
    async def get_by_id(self, message_id: UUID) -> Message | None:
        pass

    @abstractmethod
    async def save(self, message: Message) -> Message:
        pass

    @abstractmethod
    async def get_room_history(
        self, room_id: UUID, limit: int = 50, before_id: UUID | None = None
    ) -> list[Message]:
        pass
