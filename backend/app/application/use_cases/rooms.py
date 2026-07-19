from uuid import UUID
from app.domain.entities.room import Room
from app.domain.entities.message import Message
from app.domain.exceptions import RoomNotFoundException, UnauthorizedException
from app.application.interfaces.room_repository import RoomRepository
from app.application.interfaces.message_repository import MessageRepository
from app.schemas.room import RoomCreate

class CreateRoomUseCase:
    def __init__(self, room_repo: RoomRepository):
        self.room_repo = room_repo

    async def execute(self, schema: RoomCreate, creator_id: UUID) -> Room:
        room = Room(
            name=schema.name,
            description=schema.description,
            is_private=schema.is_private,
            creator_id=creator_id
        )
        saved_room = await self.room_repo.save(room)
        
        # Add creator as Owner member of the room
        await self.room_repo.add_member(
            room_id=saved_room.id,
            user_id=creator_id,
            role="owner"
        )
        return saved_room


class ListUserRoomsUseCase:
    def __init__(self, room_repo: RoomRepository):
        self.room_repo = room_repo

    async def execute(self, user_id: UUID) -> list[Room]:
        return await self.room_repo.get_user_rooms(user_id)


class JoinRoomUseCase:
    def __init__(self, room_repo: RoomRepository):
        self.room_repo = room_repo

    async def execute(self, room_id: UUID, user_id: UUID) -> None:
        room = await self.room_repo.get_by_id(room_id)
        if not room:
            raise RoomNotFoundException()

        # If already member, do nothing
        if await self.room_repo.is_member(room_id, user_id):
            return

        # Private rooms constraint
        if room.is_private:
            raise UnauthorizedException("Cannot join private room without invite")

        await self.room_repo.add_member(room_id, user_id, role="member")


class LeaveRoomUseCase:
    def __init__(self, room_repo: RoomRepository):
        self.room_repo = room_repo

    async def execute(self, room_id: UUID, user_id: UUID) -> None:
        if not await self.room_repo.is_member(room_id, user_id):
            raise UnauthorizedException("Not a member of this room")

        # Owner cannot leave directly (must delete or transfer ownership)
        role = await self.room_repo.get_member_role(room_id, user_id)
        if role == "owner":
            raise UnauthorizedException("Owner cannot leave room. Delete room or transfer ownership.")

        await self.room_repo.remove_member(room_id, user_id)


class GetRoomMessagesUseCase:
    def __init__(self, room_repo: RoomRepository, message_repo: MessageRepository):
        self.room_repo = room_repo
        self.message_repo = message_repo

    async def execute(
        self, room_id: UUID, user_id: UUID, limit: int = 50, before_id: UUID | None = None
    ) -> list[Message]:
        # Enforce membership check
        if not await self.room_repo.is_member(room_id, user_id):
            raise UnauthorizedException("Access denied: you must be a member of this room to read logs.")
        
        return await self.message_repo.get_room_history(room_id, limit, before_id)
