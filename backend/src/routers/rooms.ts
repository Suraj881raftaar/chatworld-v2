import { Hono } from 'hono';
import { Bindings, Variables } from '../types';
import { dbQuery } from '../db/client';
import { authMiddleware } from '../middlewares/auth';

export const roomsRouter = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// All routes require authentication
roomsRouter.use('*', authMiddleware);

// 1. List rooms user belongs to
roomsRouter.get('/', async (c) => {
  const user = c.get('user');
  const rooms = await dbQuery(
    c.env.DATABASE_URL,
    `SELECT r.id, r.name, r.description, r.is_private, r.created_by, r.created_at, rm.role 
     FROM rooms r 
     JOIN room_members rm ON r.id = rm.room_id 
     WHERE rm.user_id = $1 
     ORDER BY r.updated_at DESC`,
    [user.id]
  );
  return c.json(rooms);
});

// 1b. List public rooms available for discovery
roomsRouter.get('/public', async (c) => {
  const user = c.get('user');
  const rooms = await dbQuery(
    c.env.DATABASE_URL,
    `SELECT r.id, r.name, r.description, r.is_private, r.created_by, r.created_at,
            EXISTS(SELECT 1 FROM room_members rm WHERE rm.room_id = r.id AND rm.user_id = $1) as is_member,
            (SELECT COUNT(*) FROM room_members rm WHERE rm.room_id = r.id) as member_count
     FROM rooms r
     WHERE r.is_private = false
     ORDER BY r.created_at DESC
     LIMIT 50`,
    [user.id]
  );
  return c.json(rooms);
});

// 2. Create room
roomsRouter.post('/', async (c) => {
  const user = c.get('user');
  const body = await c.req.json().catch(() => ({}));
  const { name, description, is_private } = body;

  if (!name || name.trim() === '') {
    return c.json({ error_code: 'VALIDATION_ERROR', detail: 'Room name is required' }, 400);
  }

  // Create room inside a transaction
  const rooms = await dbQuery<{ id: string; name: string; description: string; is_private: boolean; created_by: string; created_at: string }>(
    c.env.DATABASE_URL,
    "INSERT INTO rooms (name, description, is_private, created_by) VALUES ($1, $2, $3, $4) RETURNING id, name, description, is_private, created_by, created_at",
    [name, description || '', !!is_private, user.id]
  );

  const room = rooms[0];

  // Add creator as owner member of room
  await dbQuery(
    c.env.DATABASE_URL,
    "INSERT INTO room_members (room_id, user_id, role) VALUES ($1, $2, $3)",
    [room.id, user.id, 'owner']
  );

  return c.json(room, 201);
});

// 3. Join public room
roomsRouter.post('/:id/join', async (c) => {
  const user = c.get('user');
  const roomId = c.req.param('id');

  const rooms = await dbQuery<{ id: string; name: string; description: string; is_private: boolean }>(
    c.env.DATABASE_URL,
    "SELECT id, name, description, is_private FROM rooms WHERE id = $1 LIMIT 1",
    [roomId]
  );
  if (rooms.length === 0) {
    return c.json({ error_code: 'NOT_FOUND', detail: 'Room not found' }, 404);
  }

  const room = rooms[0];
  if (room.is_private) {
    return c.json({ error_code: 'FORBIDDEN', detail: 'Cannot join private rooms without an invite' }, 403);
  }

  // Check if already a member
  const members = await dbQuery(
    c.env.DATABASE_URL,
    "SELECT room_id FROM room_members WHERE room_id = $1 AND user_id = $2",
    [roomId, user.id]
  );

  if (members.length === 0) {
    // Insert member
    await dbQuery(
      c.env.DATABASE_URL,
      "INSERT INTO room_members (room_id, user_id, role) VALUES ($1, $2, $3)",
      [roomId, user.id, 'member']
    );
  }

  return c.json(room);
});

// 4. List members of a room
roomsRouter.get('/:id/members', async (c) => {
  const roomId = c.req.param('id');
  const members = await dbQuery(
    c.env.DATABASE_URL,
    `SELECT u.id, u.username, u.avatar_url, rm.role, rm.joined_at 
     FROM room_members rm 
     JOIN users u ON rm.user_id = u.id 
     WHERE rm.room_id = $1 
     ORDER BY rm.joined_at ASC`,
    [roomId]
  );
  return c.json(members);
});

// 5. Get message history (paginated with reactions)
roomsRouter.get('/:id/messages', async (c) => {
  const roomId = c.req.param('id');
  const limit = parseInt(c.req.query('limit') || '50');
  const offset = parseInt(c.req.query('offset') || '0');

  const messages = await dbQuery(
    c.env.DATABASE_URL,
    `SELECT m.id, m.room_id, m.sender_id, u.username as sender_name, u.avatar_url as sender_avatar, m.message_type, m.content, m.file_url, m.created_at,
            COALESCE(
              (SELECT json_agg(json_build_object('emoji', r.emoji, 'count', r.count, 'user_ids', r.user_ids))
               FROM (
                 SELECT emoji, COUNT(*)::int as count, ARRAY_AGG(user_id::text) as user_ids
                 FROM message_reactions
                 WHERE message_id = m.id
                 GROUP BY emoji
               ) r
              ), '[]'::json
            ) as reactions
     FROM messages m 
     LEFT JOIN users u ON m.sender_id = u.id 
     WHERE m.room_id = $1 
     ORDER BY m.created_at DESC 
     LIMIT $2 OFFSET $3`,
    [roomId, limit, offset]
  );

  // Return reversed to chronological order for UI display
  return c.json(messages.reverse());
});

// 6. Delete room (Owner only)
roomsRouter.delete('/:id', async (c) => {
  const user = c.get('user');
  const roomId = c.req.param('id');

  // Check if room exists and if user is creator/owner
  const rooms = await dbQuery<{ created_by: string }>(
    c.env.DATABASE_URL,
    "SELECT created_by FROM rooms WHERE id = $1 LIMIT 1",
    [roomId]
  );

  if (rooms.length === 0) {
    return c.json({ error_code: 'NOT_FOUND', detail: 'Room not found' }, 404);
  }

  // Check membership role or creator
  const members = await dbQuery<{ role: string }>(
    c.env.DATABASE_URL,
    "SELECT role FROM room_members WHERE room_id = $1 AND user_id = $2 LIMIT 1",
    [roomId, user.id]
  );

  const isOwner = rooms[0].created_by === user.id || (members.length > 0 && members[0].role === 'owner');
  if (!isOwner) {
    return c.json({ error_code: 'FORBIDDEN', detail: 'Only the room creator or owner can delete this room' }, 403);
  }

  // Delete messages, members, and room in database
  await dbQuery(c.env.DATABASE_URL, "DELETE FROM messages WHERE room_id = $1", [roomId]);
  await dbQuery(c.env.DATABASE_URL, "DELETE FROM room_members WHERE room_id = $1", [roomId]);
  await dbQuery(c.env.DATABASE_URL, "DELETE FROM rooms WHERE id = $1", [roomId]);

  return c.json({ detail: 'Room deleted successfully', id: roomId });
});

// 7. Leave room
roomsRouter.post('/:id/leave', async (c) => {
  const user = c.get('user');
  const roomId = c.req.param('id');

  await dbQuery(
    c.env.DATABASE_URL,
    "DELETE FROM room_members WHERE room_id = $1 AND user_id = $2",
    [roomId, user.id]
  );

  return c.json({ detail: 'Left room successfully', id: roomId });
});

// 8. Delete message (Sender or Room Owner)
roomsRouter.delete('/:id/messages/:messageId', async (c) => {
  const user = c.get('user');
  const roomId = c.req.param('id');
  const messageId = c.req.param('messageId');

  // Find message
  const messages = await dbQuery<{ sender_id: string; file_url: string }>(
    c.env.DATABASE_URL,
    "SELECT sender_id, file_url FROM messages WHERE id = $1 AND room_id = $2 LIMIT 1",
    [messageId, roomId]
  );

  if (messages.length === 0) {
    return c.json({ error_code: 'NOT_FOUND', detail: 'Message not found' }, 404);
  }

  const message = messages[0];

  // Check if user is room owner
  const members = await dbQuery<{ role: string }>(
    c.env.DATABASE_URL,
    "SELECT role FROM room_members WHERE room_id = $1 AND user_id = $2 LIMIT 1",
    [roomId, user.id]
  );

  const isSender = message.sender_id === user.id;
  const isOwner = members.length > 0 && members[0].role === 'owner';

  if (!isSender && !isOwner) {
    return c.json({ error_code: 'FORBIDDEN', detail: 'You can only delete your own messages' }, 403);
  }

  // Delete message
  await dbQuery(c.env.DATABASE_URL, "DELETE FROM messages WHERE id = $1", [messageId]);

  // Clean up file if present
  if (message.file_url && message.file_url.includes('/files/')) {
    const fileId = message.file_url.split('/files/').pop();
    if (fileId) {
      await dbQuery(c.env.DATABASE_URL, "DELETE FROM files WHERE id = $1", [fileId]).catch(() => {});
    }
  }

  return c.json({ detail: 'Message deleted successfully', message_id: messageId, room_id: roomId });
});
