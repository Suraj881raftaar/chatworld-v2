import { Context, Next } from 'hono';
import { verify } from 'hono/jwt';
import { Bindings, Variables } from '../types';

/**
 * Middleware that authenticates HTTP requests using Bearer JWT tokens.
 */
export async function authMiddleware(
  c: Context<{ Bindings: Bindings; Variables: Variables }>,
  next: Next
) {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json(
      { error_code: 'UNAUTHORIZED', detail: 'Missing or invalid authorization header' },
      401
    );
  }

  const token = authHeader.substring(7);
  try {
    const payload = await verify(token, c.env.JWT_SECRET);
    c.set('user', {
      id: payload.sub as string,
      username: payload.username as string,
      role: payload.role as string
    });
    await next();
  } catch (err) {
    return c.json(
      { error_code: 'UNAUTHORIZED', detail: 'Token is invalid or expired' },
      401
    );
  }
}

/**
 * Middleware that restricts routes to users with 'admin' roles.
 */
export async function adminMiddleware(
  c: Context<{ Bindings: Bindings; Variables: Variables }>,
  next: Next
) {
  const user = c.get('user');
  if (!user || user.role !== 'admin') {
    return c.json(
      { error_code: 'FORBIDDEN', detail: 'Administrator privileges required' },
      403
    );
  }
  await next();
}
