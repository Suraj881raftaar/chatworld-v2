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

  const rooms = await dbQuery(
    c.env.DATABASE_URL,
    "SELECT id, is_private FROM rooms WHERE id = $1 LIMIT 1",
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
  if (members.length > 0) {
    return c.json({ detail: 'Already a member of this room' });
  }

  // Insert member
  await dbQuery(
    c.env.DATABASE_URL,
    "INSERT INTO room_members (room_id, user_id, role) VALUES ($1, $2, $3)",
    [roomId, user.id, 'member']
  );

  return c.json({ detail: 'Joined room successfully' });
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

// 5. Get message history (paginated)
roomsRouter.get('/:id/messages', async (c) => {
  const roomId = c.req.param('id');
  const limit = parseInt(c.req.query('limit') || '50');
  const offset = parseInt(c.req.query('offset') || '0');

  const messages = await dbQuery(
    c.env.DATABASE_URL,
    `SELECT m.id, m.room_id, m.sender_id, u.username as sender_name, m.message_type, m.content, m.file_url, m.created_at 
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
