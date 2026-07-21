import { Hono } from 'hono';
import { Bindings, Variables } from '../types';
import { dbQuery } from '../db/client';
import { authMiddleware, adminMiddleware } from '../middlewares/auth';

export const usersRouter = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// All routes require authentication
usersRouter.use('*', authMiddleware);

// 1. Get current user profile
usersRouter.get('/me', async (c) => {
  const user = c.get('user');
  const profiles = await dbQuery(
    c.env.DATABASE_URL,
    "SELECT id, email, username, role, status_message, status_type, bio, avatar_url, created_at FROM users WHERE id = $1 LIMIT 1",
    [user.id]
  );
  if (profiles.length === 0) {
    return c.json({ error_code: 'NOT_FOUND', detail: 'User not found' }, 404);
  }
  return c.json(profiles[0]);
});

// 2. Update current user profile
usersRouter.put('/me', async (c) => {
  const user = c.get('user');
  const body = await c.req.json().catch(() => ({}));
  const { status_message, status_type, bio, avatar_url, username } = body;

  const params: any[] = [];
  const sets: string[] = [];

  if (status_message !== undefined) {
    params.push(status_message);
    sets.push(`status_message = $${params.length}`);
  }
  if (status_type !== undefined) {
    params.push(status_type);
    sets.push(`status_type = $${params.length}`);
  }
  if (bio !== undefined) {
    params.push(bio);
    sets.push(`bio = $${params.length}`);
  }
  if (avatar_url !== undefined) {
    params.push(avatar_url);
    sets.push(`avatar_url = $${params.length}`);
  }
  if (username !== undefined && username.trim() !== '') {
    params.push(username);
    sets.push(`username = $${params.length}`);
  }

  if (sets.length === 0) {
    return c.json({ error_code: 'VALIDATION_ERROR', detail: 'No update parameters supplied' }, 400);
  }

  params.push(user.id);
  const sql = `UPDATE users SET ${sets.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${params.length} RETURNING id, email, username, role, status_message, status_type, bio, avatar_url`;
  const result = await dbQuery(c.env.DATABASE_URL, sql, params);

  return c.json(result[0]);
});

// 3. Search users (excluding current user)
usersRouter.get('/search', async (c) => {
  const user = c.get('user');
  const query = c.req.query('q') || '';

  const users = await dbQuery(
    c.env.DATABASE_URL,
    "SELECT id, username, status_message, avatar_url FROM users WHERE id != $1 AND (username ILIKE $2 OR email ILIKE $2) LIMIT 10",
    [user.id, `%${query}%`]
  );
  return c.json(users);
});

// 4. Retrieve notifications
usersRouter.get('/notifications', async (c) => {
  const user = c.get('user');
  const notifications = await dbQuery(
    c.env.DATABASE_URL,
    "SELECT id, message, is_read, created_at FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50",
    [user.id]
  );
  return c.json(notifications);
});

// 5. Mark notification as read
usersRouter.put('/notifications/:id/read', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');

  await dbQuery(
    c.env.DATABASE_URL,
    "UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2",
    [id, user.id]
  );
  return c.json({ detail: 'Notification marked as read' });
});

// 6. Admin user query (list all users)
usersRouter.get('/', adminMiddleware, async (c) => {
  const users = await dbQuery(
    c.env.DATABASE_URL,
    "SELECT id, email, username, role, status_message, avatar_url, created_at FROM users ORDER BY created_at DESC"
  );
  return c.json(users);
});
