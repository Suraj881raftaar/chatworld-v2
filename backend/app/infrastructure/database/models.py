from datetime import datetime
from uuid import UUID, uuid4
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from sqlalchemy import String, DateTime, Boolean, ForeignKey, Text, Uuid, UniqueConstraint

class Base(DeclarativeBase):
    pass

class RoomMember(Base):
    __tablename__ = "room_members"

    room_id: Mapped[UUID] = mapped_column(Uuid, ForeignKey("rooms.id", ondelete="CASCADE"), primary_key=True)
    user_id: Mapped[UUID] = mapped_column(Uuid, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    role: Mapped[str] = mapped_column(String(20), default="member") # owner | admin | member
    joined_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    room = relationship("RoomModel", back_populates="members")
    user = relationship("UserModel", back_populates="rooms_joined")


class UserModel(Base):
    __tablename__ = "users"

    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=uuid4)
    username: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    avatar_url: Mapped[str | None] = mapped_column(String(2048), nullable=True)
    status_message: Mapped[str | None] = mapped_column(String(150), nullable=True)
    role: Mapped[str] = mapped_column(String(20), default="user") # user | admin
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    rooms_joined = relationship("RoomMember", back_populates="user", cascade="all, delete-orphan")
    refresh_tokens = relationship("RefreshTokenModel", back_populates="user", cascade="all, delete-orphan")
    messages = relationship("MessageModel", back_populates="sender")


class RoomModel(Base):
    __tablename__ = "rooms"

    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=uuid4)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str | None] = mapped_column(String(255), nullable=True)
    is_private: Mapped[bool] = mapped_column(Boolean, default=False)
    creator_id: Mapped[UUID | None] = mapped_column(Uuid, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    members = relationship("RoomMember", back_populates="room", cascade="all, delete-orphan")
    messages = relationship("MessageModel", back_populates="room", cascade="all, delete-orphan")


class MessageModel(Base):
    __tablename__ = "messages"

    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=uuid4)
    room_id: Mapped[UUID] = mapped_column(Uuid, ForeignKey("rooms.id", ondelete="CASCADE"), index=True, nullable=False)
    sender_id: Mapped[UUID | None] = mapped_column(Uuid, ForeignKey("users.id", ondelete="SET NULL"), index=True, nullable=True)
    message_type: Mapped[str] = mapped_column(String(20), default="text") # text | file | system
    content: Mapped[str] = mapped_column(Text, nullable=False)
    file_url: Mapped[str | None] = mapped_column(String(2048), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    room = relationship("RoomModel", back_populates="messages")
    sender = relationship("UserModel", back_populates="messages")


class RefreshTokenModel(Base):
    __tablename__ = "refresh_tokens"

    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=uuid4)
    user_id: Mapped[UUID] = mapped_column(Uuid, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    token: Mapped[str] = mapped_column(String(512), unique=True, index=True, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    is_revoked: Mapped[bool] = mapped_column(Boolean, default=False)

    # Relationships
    user = relationship("UserModel", back_populates="refresh_tokens")
