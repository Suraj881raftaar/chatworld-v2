import json
import asyncio
from typing import Dict, Set
from fastapi import WebSocket
from uuid import UUID
import redis.asyncio as aioredis
from app.core.config import settings
from loguru import logger

class ConnectionManager:
    def __init__(self):
        # Maps room_id (str) -> Set[WebSocket]
        self.active_rooms: Dict[str, Set[WebSocket]] = {}
        # Maps user_id (str) -> Set[WebSocket] for presence tracking
        self.active_users: Dict[str, Set[WebSocket]] = {}
        self.redis_client = None
        self.pubsub = None
        self.listener_task = None

    async def initialize(self):
        # Attempt connection to Redis
        try:
            self.redis_client = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
            # Test ping connection
            await self.redis_client.ping()
            self.pubsub = self.redis_client.pubsub()
            # Start background task to listen to Redis channels
            self.listener_task = asyncio.create_task(self._redis_listener())
            logger.info("Successfully connected to Redis. Multi-node WebSocket broadcasting enabled.")
        except Exception as e:
            logger.warning(f"Could not connect to Redis: {e}. Falling back to in-memory local broadcasting.")
            self.redis_client = None

    async def connect(self, websocket: WebSocket, room_id: UUID, user_id: UUID):
        await websocket.accept()
        room_str = str(room_id)
        user_str = str(user_id)

        # Register in room pool
        if room_str not in self.active_rooms:
            self.active_rooms[room_str] = set()
            # If scaling with Redis, subscribe to the Redis channel for this room
            if self.redis_client and self.pubsub:
                await self.pubsub.subscribe(f"room:{room_str}")
                logger.info(f"Subscribed node to Redis channel: room:{room_str}")

        self.active_rooms[room_str].add(websocket)

        # Register in user presence pool
        if user_str not in self.active_users:
            self.active_users[user_str] = set()
            # Send presence online broadcast
            await self.broadcast_presence(user_id, True)

        self.active_users[user_str].add(websocket)

    async def disconnect(self, websocket: WebSocket, room_id: UUID, user_id: UUID):
        room_str = str(room_id)
        user_str = str(user_id)

        # Remove from room pool
        if room_str in self.active_rooms:
            self.active_rooms[room_str].discard(websocket)
            if not self.active_rooms[room_str]:
                del self.active_rooms[room_str]
                # If scaling with Redis, unsubscribe from the Redis channel
                if self.redis_client and self.pubsub:
                    await self.pubsub.unsubscribe(f"room:{room_str}")
                    logger.info(f"Unsubscribed node from Redis channel: room:{room_str}")

        # Remove from user presence pool
        if user_str in self.active_users:
            self.active_users[user_str].discard(websocket)
            if not self.active_users[user_str]:
                del self.active_users[user_str]
                # Send presence offline broadcast
                await self.broadcast_presence(user_id, False)

    async def broadcast_to_room(self, room_id: UUID, payload: dict):
        room_str = str(room_id)
        # If scaling with Redis, publish the message event to Redis channel
        if self.redis_client:
            await self.redis_client.publish(f"room:{room_str}", json.dumps(payload))
        else:
            # Fallback to local in-memory broadcasting
            await self._local_broadcast_room(room_str, payload)

    async def broadcast_presence(self, user_id: UUID, is_online: bool):
        payload = {
            "event": "presence_update",
            "data": {
                "user_id": str(user_id),
                "is_online": is_online
            }
        }
        # Publish presence updates globally
        if self.redis_client:
            await self.redis_client.publish("global:presence", json.dumps(payload))
        else:
            # Broadcast locally to all active sockets
            for user_sockets in self.active_users.values():
                for socket in user_sockets:
                    try:
                        await socket.send_json(payload)
                    except Exception:
                        pass

    async def _local_broadcast_room(self, room_str: str, payload: dict):
        if room_str in self.active_rooms:
            # Send to all local websockets in the room
            for socket in self.active_rooms[room_str].copy():
                try:
                    await socket.send_json(payload)
                except Exception as e:
                    logger.warning(f"Error sending local WS message: {e}")

    async def _redis_listener(self):
        logger.info("Redis listener background task started.")
        # Subscribe to global presence channel
        await self.pubsub.subscribe("global:presence")
        
        while True:
            try:
                if self.pubsub:
                    # Non-blocking get message
                    message = await self.pubsub.get_message(ignore_subscribe_messages=True, timeout=1.0)
                    if message:
                        channel = message["channel"]
                        data = json.loads(message["data"])
                        
                        if channel.startswith("room:"):
                            room_str = channel.split(":")[-1]
                            await self._local_broadcast_room(room_str, data)
                        elif channel == "global:presence":
                            # Broadcast presence events globally to all local sockets
                            for user_sockets in self.active_users.values():
                                for socket in user_sockets:
                                    try:
                                        await socket.send_json(data)
                                    except Exception:
                                        pass
                await asyncio.sleep(0.01)
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in Redis listener task: {e}")
                await asyncio.sleep(2.0)

manager = ConnectionManager()
