from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID
import json
from app.infrastructure.database.session import AsyncSessionLocal
from app.infrastructure.database.repository import SqlAlchemyRoomRepository, SqlAlchemyMessageRepository, SqlAlchemyUserRepository
from app.infrastructure.security.jwt import decode_access_token
from app.services.chat import manager
from app.domain.entities.message import Message
from loguru import logger

router = APIRouter(prefix="/ws", tags=["WebSockets"])

@router.websocket("/chat")
async def websocket_endpoint(
    websocket: WebSocket,
    token: str = Query(...),
    room_id: UUID = Query(...)
):
    # 1. Connection Authentication
    try:
        payload = decode_access_token(token)
        user_id_str = payload.get("sub")
        if not user_id_str:
            logger.warning("WS Connection reject: token missing sub claim")
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return
        user_id = UUID(user_id_str)
        username = payload.get("username", "Unknown")
    except Exception as e:
        logger.warning(f"WS Connection reject: token decode failure: {e}")
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    # 2. Connection Validation (Membership check)
    async with AsyncSessionLocal() as db:
        room_repo = SqlAlchemyRoomRepository(db)
        user_repo = SqlAlchemyUserRepository(db)
        
        # Check active user
        user = await user_repo.get_by_id(user_id)
        if not user or not user.is_active:
            logger.warning(f"WS Connection reject: user={user_id} inactive or suspended")
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return
            
        # Check room exist and user membership
        if not await room_repo.is_member(room_id, user_id):
            logger.warning(f"WS Connection reject: user={user_id} is not a member of room={room_id}")
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return

    # 3. Connection Registration
    await manager.connect(websocket, room_id, user_id)
    logger.info(f"WebSocket Connected: user={username} ({user_id}) room={room_id}")

    try:
        # 4. Message Stream Loop
        while True:
            data = await websocket.receive_text()
            payload = json.loads(data)
            event = payload.get("event")
            event_data = payload.get("data", {})

            if event == "send_message":
                content = event_data.get("content", "").strip()
                message_type = event_data.get("message_type", "text")
                file_url = event_data.get("file_url")

                if content or file_url:
                    # Persist message to database
                    async with AsyncSessionLocal() as db:
                        message_repo = SqlAlchemyMessageRepository(db)
                        msg_entity = Message(
                            room_id=room_id,
                            sender_id=user_id,
                            content=content,
                            message_type=message_type,
                            file_url=file_url
                        )
                        saved_msg = await message_repo.save(msg_entity)
                        
                        # Broadcast message packet to all room subscribers
                        broadcast_payload = {
                            "event": "new_message",
                            "data": {
                                "id": str(saved_msg.id),
                                "room_id": str(saved_msg.room_id),
                                "sender_id": str(saved_msg.sender_id),
                                "sender_name": username,
                                "message_type": saved_msg.message_type,
                                "content": saved_msg.content,
                                "file_url": saved_msg.file_url,
                                "created_at": saved_msg.created_at.isoformat()
                            }
                        }
                    await manager.broadcast_to_room(room_id, broadcast_payload)

            elif event == "typing":
                is_typing = event_data.get("is_typing", False)
                broadcast_payload = {
                    "event": "user_typing",
                    "data": {
                        "room_id": str(room_id),
                        "user_id": str(user_id),
                        "username": username,
                        "is_typing": is_typing
                    }
                }
                await manager.broadcast_to_room(room_id, broadcast_payload)

    except WebSocketDisconnect:
        await manager.disconnect(websocket, room_id, user_id)
        logger.info(f"WebSocket Disconnected: user={username} ({user_id}) room={room_id}")
    except Exception as e:
        logger.exception(f"Error in WebSocket handler loop: {e}")
        await manager.disconnect(websocket, room_id, user_id)
