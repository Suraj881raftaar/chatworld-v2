from fastapi import APIRouter, Depends, Query, status, UploadFile, File, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID
from app.infrastructure.database.session import get_db
from app.infrastructure.database.repository import SqlAlchemyRoomRepository, SqlAlchemyMessageRepository
from app.infrastructure.security.dependencies import get_current_user
from app.domain.entities.user import User
from app.schemas.room import RoomCreate, RoomOut
from app.schemas.message import MessageOut
from app.infrastructure.services.storage import LocalStorageService
from app.application.use_cases.rooms import (
    CreateRoomUseCase,
    ListUserRoomsUseCase,
    JoinRoomUseCase,
    LeaveRoomUseCase,
    GetRoomMessagesUseCase
)

router = APIRouter(prefix="/rooms", tags=["Rooms"])

@router.post("/", response_model=RoomOut, status_code=status.HTTP_201_CREATED)
async def create_room(
    schema: RoomCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    room_repo = SqlAlchemyRoomRepository(db)
    use_case = CreateRoomUseCase(room_repo)
    room = await use_case.execute(schema, creator_id=current_user.id)
    return room


@router.get("/", response_model=list[RoomOut])
async def list_rooms(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    room_repo = SqlAlchemyRoomRepository(db)
    use_case = ListUserRoomsUseCase(room_repo)
    rooms = await use_case.execute(current_user.id)
    return rooms


@router.post("/{room_id}/join", status_code=status.HTTP_200_OK)
async def join_room(
    room_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    room_repo = SqlAlchemyRoomRepository(db)
    use_case = JoinRoomUseCase(room_repo)
    await use_case.execute(room_id, current_user.id)
    return {"detail": "Joined room successfully"}


@router.post("/{room_id}/leave", status_code=status.HTTP_200_OK)
async def leave_room(
    room_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    room_repo = SqlAlchemyRoomRepository(db)
    use_case = LeaveRoomUseCase(room_repo)
    await use_case.execute(room_id, current_user.id)
    return {"detail": "Left room successfully"}


@router.get("/{room_id}/messages", response_model=list[MessageOut])
async def get_room_messages(
    room_id: UUID,
    limit: int = Query(50, ge=1, le=100),
    before: UUID | None = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    room_repo = SqlAlchemyRoomRepository(db)
    message_repo = SqlAlchemyMessageRepository(db)
    use_case = GetRoomMessagesUseCase(room_repo, message_repo)
    
    messages = await use_case.execute(
        room_id=room_id,
        user_id=current_user.id,
        limit=limit,
        before_id=before
    )
    return messages


@router.post("/{room_id}/upload", status_code=status.HTTP_200_OK)
async def upload_room_file(
    room_id: UUID,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    room_repo = SqlAlchemyRoomRepository(db)
    room = await room_repo.get_by_id(room_id)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    if not await room_repo.is_member(room_id, current_user.id):
        raise HTTPException(status_code=403, detail="Not a member of this room")

    storage_service = LocalStorageService()
    file_url = await storage_service.upload_file(file)
    return {
        "file_url": file_url,
        "filename": file.filename,
        "content_type": file.content_type
    }
