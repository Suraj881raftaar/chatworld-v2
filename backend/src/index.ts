import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { verify } from 'hono/jwt';
import { Bindings, Variables } from './types';
import { authRouter } from './routers/auth';
import { usersRouter } from './routers/users';
import { roomsRouter } from './routers/rooms';
import { uploadsRouter } from './routers/uploads';

// Export Durable Object class to make it visible to Cloudflare runtime
export { ChatRoom } from './objects/ChatRoom';

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// 1. Central CORS Middleware
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'Cookie'],
  exposeHeaders: ['Content-Length', 'X-Kuma-Revision'],
  maxAge: 600,
  credentials: true,
}));

// 2. Register Health Check Endpoint
app.get('/api/v1/health', (c) => {
  return c.json({
    status: 'healthy',
    project: 'Chat World v2',
    environment: c.env.ENVIRONMENT || 'production'
  });
});

// 3. Register Hono Modular Routers
app.route('/api/v1/auth', authRouter);
app.route('/api/v1/users', usersRouter);
app.route('/api/v1/rooms', roomsRouter);
app.route('/api/v1/uploads', uploadsRouter);

// SPA Fallback: Serves index.html for non-file route refreshes
app.get('/*', async (c) => {
  // If the assets directory exists and wrangler assets binding is present:
  // Cloudflare Workers Assets serves files natively. However, to support SPA route reloads
  // we fallback to c.env.ASSETS.fetch(request) targeting index.html.
  const url = new URL(c.req.url);
  
  // If requesting a file (like js, css, png), let Cloudflare serve it
  if (url.pathname.includes('.')) {
    return c.env.ASSETS.fetch(c.req.raw);
  }

  // Rewrite request internally to serve index.html
  const indexUrl = new URL(c.req.url);
  indexUrl.pathname = '/index.html';
  return c.env.ASSETS.fetch(new Request(indexUrl.toString(), c.req.raw));
});

export default {
  async fetch(request: Request, env: Bindings, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/api/v1/ws/chat') {
      const roomId = url.searchParams.get('room_id');
      const token = url.searchParams.get('token');

      if (!roomId || !token) {
        return new Response('Missing room_id or token parameter', { status: 400 });
      }

      try {
        const payload = await verify(token, env.JWT_SECRET);
        const userId = payload.sub as string;
        const username = payload.username as string;

        const id = env.CHAT_ROOM.idFromName(roomId);
        const stub = env.CHAT_ROOM.get(id);

        const reqUrl = new URL(request.url);
        reqUrl.searchParams.set("user_id", userId);
        reqUrl.searchParams.set("username", username);

        return stub.fetch(new Request(reqUrl.toString(), request));
      } catch (err) {
        return new Response('Unauthorized WebSocket connection', { status: 401 });
      }
    }

    return app.fetch(request, env, ctx);
  }
};
