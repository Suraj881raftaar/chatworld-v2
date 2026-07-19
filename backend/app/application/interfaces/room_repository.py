from abc import ABC, abstractmethod
from uuid import UUID
from app.domain.entities.room import Room

class RoomRepository(ABC):
    @abstractmethod
    async def get_by_id(self, room_id: UUID) -> Room | None:
        pass

    @abstractmethod
    async def save(self, room: Room) -> Room:
        pass

    @abstractmethod
    async def delete(self, room_id: UUID) -> bool:
        pass

    @abstractmethod
    async def get_user_rooms(self, user_id: UUID) -> list[Room]:
        pass

    @abstractmethod
    async def add_member(self, room_id: UUID, user_id: UUID, role: str = "member") -> None:
        pass

    @abstractmethod
    async def remove_member(self, room_id: UUID, user_id: UUID) -> None:
        pass

    @abstractmethod
    async def is_member(self, room_id: UUID, user_id: UUID) -> bool:
        pass

    @abstractmethod
    async def get_member_role(self, room_id: UUID, user_id: UUID) -> str | None:
        pass
