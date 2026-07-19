from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, or_
from app.domain.entities.user import User
from app.domain.entities.room import Room
from app.domain.entities.message import Message
from app.application.interfaces.user_repository import UserRepository
from app.application.interfaces.room_repository import RoomRepository
from app.application.interfaces.message_repository import MessageRepository
from app.infrastructure.database.models import UserModel, RoomModel, RoomMember, MessageModel

# --- Mapper Functions ---
def _to_domain_user(model: UserModel) -> User:
    return User(
        username=model.username,
        email=model.email,
        hashed_password=model.hashed_password,
        role=model.role,
        avatar_url=model.avatar_url,
        status_message=model.status_message,
        is_active=model.is_active,
        id=model.id,
        created_at=model.created_at,
        updated_at=model.updated_at
    )

def _to_domain_room(model: RoomModel) -> Room:
    return Room(
        name=model.name,
        creator_id=model.creator_id,
        description=model.description,
        is_private=model.is_private,
        id=model.id,
        created_at=model.created_at,
        updated_at=model.updated_at
    )

def _to_domain_message(model: MessageModel) -> Message:
    return Message(
        room_id=model.room_id,
        sender_id=model.sender_id,
        content=model.content,
        message_type=model.message_type,
        file_url=model.file_url,
        id=model.id,
        created_at=model.created_at,
        updated_at=model.updated_at
    )

# --- Implementations ---

class SqlAlchemyUserRepository(UserRepository):
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_id(self, user_id: UUID) -> User | None:
        result = await self.session.execute(select(UserModel).where(UserModel.id == user_id))
        model = result.scalar_one_or_none()
        return _to_domain_user(model) if model else None

    async def get_by_email(self, email: str) -> User | None:
        result = await self.session.execute(select(UserModel).where(UserModel.email == email))
        model = result.scalar_one_or_none()
        return _to_domain_user(model) if model else None

    async def get_by_username(self, username: str) -> User | None:
        result = await self.session.execute(select(UserModel).where(UserModel.username == username))
        model = result.scalar_one_or_none()
        return _to_domain_user(model) if model else None

    async def save(self, user: User) -> User:
        # Check if already exists in DB to update or insert
        result = await self.session.execute(select(UserModel).where(UserModel.id == user.id))
        model = result.scalar_one_or_none()

        if model:
            # Update
            model.username = user.username
            model.email = user.email
            model.hashed_password = user.hashed_password
            model.avatar_url = user.avatar_url
            model.status_message = user.status_message
            model.role = user.role
            model.is_active = user.is_active
            model.updated_at = user.updated_at
        else:
            # Insert
            model = UserModel(
                id=user.id,
                username=user.username,
                email=user.email,
                hashed_password=user.hashed_password,
                avatar_url=user.avatar_url,
                status_message=user.status_message,
                role=user.role,
                is_active=user.is_active,
                created_at=user.created_at,
                updated_at=user.updated_at
            )
            self.session.add(model)
        
        await self.session.commit()
        return _to_domain_user(model)

    async def search(self, query: str) -> list[User]:
        stmt = select(UserModel).where(
            or_(
                UserModel.username.ilike(f"%{query}%"),
                UserModel.email.ilike(f"%{query}%")
            )
        ).limit(20)
        result = await self.session.execute(stmt)
        return [_to_domain_user(m) for m in result.scalars().all()]


class SqlAlchemyRoomRepository(RoomRepository):
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_id(self, room_id: UUID) -> Room | None:
        result = await self.session.execute(select(RoomModel).where(RoomModel.id == room_id))
        model = result.scalar_one_or_none()
        return _to_domain_room(model) if model else None

    async def save(self, room: Room) -> Room:
        result = await self.session.execute(select(RoomModel).where(RoomModel.id == room.id))
        model = result.scalar_one_or_none()

        if model:
            model.name = room.name
            model.description = room.description
            model.is_private = room.is_private
            model.updated_at = room.updated_at
        else:
            model = RoomModel(
                id=room.id,
                name=room.name,
                description=room.description,
                is_private=room.is_private,
                creator_id=room.creator_id,
                created_at=room.created_at,
                updated_at=room.updated_at
            )
            self.session.add(model)

        await self.session.commit()
        return _to_domain_room(model)

    async def delete(self, room_id: UUID) -> bool:
        stmt = delete(RoomModel).where(RoomModel.id == room_id)
        result = await self.session.execute(stmt)
        await self.session.commit()
        return (result.rowcount or 0) > 0

    async def get_user_rooms(self, user_id: UUID) -> list[Room]:
        # Fetch rooms where user is a member
        stmt = select(RoomModel).join(RoomMember).where(RoomMember.user_id == user_id)
        result = await self.session.execute(stmt)
        return [_to_domain_room(m) for m in result.scalars().all()]

    async def add_member(self, room_id: UUID, user_id: UUID, role: str = "member") -> None:
        member = RoomMember(room_id=room_id, user_id=user_id, role=role)
        self.session.add(member)
        await self.session.commit()

    async def remove_member(self, room_id: UUID, user_id: UUID) -> None:
        stmt = delete(RoomMember).where(
            RoomMember.room_id == room_id,
            RoomMember.user_id == user_id
        )
        await self.session.execute(stmt)
        await self.session.commit()

    async def is_member(self, room_id: UUID, user_id: UUID) -> bool:
        stmt = select(RoomMember).where(
            RoomMember.room_id == room_id,
            RoomMember.user_id == user_id
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none() is not None

    async def get_member_role(self, room_id: UUID, user_id: UUID) -> str | None:
        stmt = select(RoomMember.role).where(
            RoomMember.room_id == room_id,
            RoomMember.user_id == user_id
        )
        result = await self.session.execute(stmt)
        return result.scalar()


class SqlAlchemyMessageRepository(MessageRepository):
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_id(self, message_id: UUID) -> Message | None:
        result = await self.session.execute(select(MessageModel).where(MessageModel.id == message_id))
        model = result.scalar_one_or_none()
        return _to_domain_message(model) if model else None

    async def save(self, message: Message) -> Message:
        result = await self.session.execute(select(MessageModel).where(MessageModel.id == message.id))
        model = result.scalar_one_or_none()

        if model:
            model.content = message.content
            model.updated_at = message.updated_at
        else:
            model = MessageModel(
                id=message.id,
                room_id=message.room_id,
                sender_id=message.sender_id,
                message_type=message.message_type,
                content=message.content,
                file_url=message.file_url,
                created_at=message.created_at,
                updated_at=message.updated_at
            )
            self.session.add(model)

        await self.session.commit()
        return _to_domain_message(model)

    async def get_room_history(
        self, room_id: UUID, limit: int = 50, before_id: UUID | None = None
    ) -> list[Message]:
        stmt = select(MessageModel).where(MessageModel.room_id == room_id)
        
        if before_id:
            # Fetch message timestamp for comparison
            msg_result = await self.session.execute(select(MessageModel.created_at).where(MessageModel.id == before_id))
            before_created_at = msg_result.scalar()
            if before_created_at:
                stmt = stmt.where(MessageModel.created_at < before_created_at)

        stmt = stmt.order_by(MessageModel.created_at.desc()).limit(limit)
        result = await self.session.execute(stmt)
        # Reverse order so messages are chronological (oldest to newest) for UI rendering
        messages = list(reversed(result.scalars().all()))
        return [_to_domain_message(m) for m in messages]
