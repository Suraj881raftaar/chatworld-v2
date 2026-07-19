import { Hono } from 'hono';
import { sign } from 'hono/jwt';
import { Bindings } from '../types';
import { dbQuery } from '../db/client';

export const authRouter = new Hono<{ Bindings: Bindings }>();

// --- Web Crypto Password Hashing Helpers ---

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const baseKey = await crypto.subtle.importKey(
    "raw",
    data,
    "PBKDF2",
    false,
    ["deriveBits", "deriveKey"]
  );
  const key = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 100000,
      hash: "SHA-256"
    },
    baseKey,
    { name: "HMAC", hash: "SHA-256", length: 256 },
    true,
    ["sign", "verify"]
  );
  const exportedKey = await crypto.subtle.exportKey("raw", key) as ArrayBuffer;
  const hashBuffer = new Uint8Array(exportedKey);
  
  const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
  const hashHex = Array.from(hashBuffer).map(b => b.toString(16).padStart(2, '0')).join('');
  return `${saltHex}:${hashHex}`;
}

async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [saltHex, hashHex] = parts;
  const salt = new Uint8Array(saltHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
  
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const baseKey = await crypto.subtle.importKey(
    "raw",
    data,
    "PBKDF2",
    false,
    ["deriveBits", "deriveKey"]
  );
  const key = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 100000,
      hash: "SHA-256"
    },
    baseKey,
    { name: "HMAC", hash: "SHA-256", length: 256 },
    true,
    ["sign", "verify"]
  );
  const exportedKey = await crypto.subtle.exportKey("raw", key) as ArrayBuffer;
  const hashBuffer = new Uint8Array(exportedKey);
  const derivedHex = Array.from(hashBuffer).map(b => b.toString(16).padStart(2, '0')).join('');
  return derivedHex === hashHex;
}

// --- Routes ---

// 1. Signup Route
authRouter.post('/signup', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const { email, username, password } = body;

  if (!email || !username || !password) {
    return c.json({ error_code: 'VALIDATION_ERROR', detail: 'Email, username, and password are required' }, 400);
  }

  // Check if username/email already exists
  const existing = await dbQuery(
    c.env.DATABASE_URL,
    "SELECT id FROM users WHERE email = $1 OR username = $2 LIMIT 1",
    [email, username]
  );
  if (existing.length > 0) {
    return c.json({ error_code: 'USER_ALREADY_EXISTS', detail: 'Email or username is already registered' }, 400);
  }

  // Hash password and insert
  const passwordHash = await hashPassword(password);
  const users = await dbQuery<{ id: string; email: string; username: string; role: string }>(
    c.env.DATABASE_URL,
    "INSERT INTO users (email, username, password_hash) VALUES ($1, $2, $3) RETURNING id, email, username, role",
    [email, username, passwordHash]
  );

  return c.json(users[0], 201);
});

// 2. Login Route
authRouter.post('/login', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const { email, password } = body;

  if (!email || !password) {
    return c.json({ error_code: 'VALIDATION_ERROR', detail: 'Email and password are required' }, 400);
  }

  const users = await dbQuery(
    c.env.DATABASE_URL,
    "SELECT id, email, username, password_hash, role FROM users WHERE email = $1 LIMIT 1",
    [email]
  );
  if (users.length === 0) {
    return c.json({ error_code: 'INVALID_CREDENTIALS', detail: 'Invalid email or password' }, 401);
  }

  const user = users[0];
  const isValid = await verifyPassword(password, user.password_hash);
  if (!isValid) {
    return c.json({ error_code: 'INVALID_CREDENTIALS', detail: 'Invalid email or password' }, 401);
  }

  // Generate Access Token (short-lived: 15m)
  const accessPayload = {
    sub: user.id,
    username: user.username,
    role: user.role,
    exp: Math.floor(Date.now() / 1000) + 15 * 60
  };
  const accessToken = await sign(accessPayload, c.env.JWT_SECRET);

  // Generate Refresh Token (long-lived: 7d)
  const refreshTokenValue = crypto.randomUUID().replace(/-/g, '');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await dbQuery(
    c.env.DATABASE_URL,
    "INSERT INTO refresh_tokens (token, user_id, expires_at) VALUES ($1, $2, $3)",
    [refreshTokenValue, user.id, expiresAt]
  );

  // Set HTTP-Only Secure Cookie
  const cookieOptions = [
    `refresh_token=${refreshTokenValue}`,
    `HttpOnly`,
    `Secure`,
    `SameSite=Strict`,
    `Path=/api/v1/auth/refresh`,
    `Max-Age=${7 * 24 * 60 * 60}`
  ].join('; ');
  c.header('Set-Cookie', cookieOptions);

  return c.json({
    access_token: accessToken,
    token_type: 'bearer',
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role
    }
  });
});

// 3. Refresh Token Route
authRouter.post('/refresh', async (c) => {
  const cookieHeader = c.req.header('Cookie') || '';
  const match = cookieHeader.match(/refresh_token=([^;]+)/);
  const refreshToken = match ? match[1] : null;

  if (!refreshToken) {
    return c.json({ error_code: 'UNAUTHORIZED', detail: 'Refresh token is missing' }, 401);
  }

  const tokens = await dbQuery<{ user_id: string; expires_at: string; is_revoked: boolean }>(
    c.env.DATABASE_URL,
    "SELECT user_id, expires_at, is_revoked FROM refresh_tokens WHERE token = $1 LIMIT 1",
    [refreshToken]
  );

  if (tokens.length === 0 || tokens[0].is_revoked || new Date(tokens[0].expires_at) < new Date()) {
    return c.json({ error_code: 'UNAUTHORIZED', detail: 'Refresh token is invalid or expired' }, 401);
  }

  const tokenRecord = tokens[0];
  const users = await dbQuery(
    c.env.DATABASE_URL,
    "SELECT id, username, role FROM users WHERE id = $1 LIMIT 1",
    [tokenRecord.user_id]
  );
  if (users.length === 0) {
    return c.json({ error_code: 'UNAUTHORIZED', detail: 'User not found' }, 401);
  }

  const user = users[0];
  // Sign new Access Token
  const accessPayload = {
    sub: user.id,
    username: user.username,
    role: user.role,
    exp: Math.floor(Date.now() / 1000) + 15 * 60
  };
  const accessToken = await sign(accessPayload, c.env.JWT_SECRET);

  return c.json({
    access_token: accessToken,
    token_type: 'bearer'
  });
});

// 4. Logout Route
authRouter.post('/logout', async (c) => {
  const cookieHeader = c.req.header('Cookie') || '';
  const match = cookieHeader.match(/refresh_token=([^;]+)/);
  const refreshToken = match ? match[1] : null;

  if (refreshToken) {
    // Revoke refresh token
    await dbQuery(
      c.env.DATABASE_URL,
      "UPDATE refresh_tokens SET is_revoked = TRUE WHERE token = $1",
      [refreshToken]
    );
  }

  // Clear cookie
  const cookieOptions = [
    `refresh_token=`,
    `HttpOnly`,
    `Secure`,
    `SameSite=Strict`,
    `Path=/api/v1/auth/refresh`,
    `Expires=Thu, 01 Jan 1970 00:00:00 GMT`
  ].join('; ');
  c.header('Set-Cookie', cookieOptions);

  return c.json({ detail: 'Logged out successfully' });
});
