import { Hono } from 'hono';
import { Bindings, Variables } from '../types';
import { dbQuery } from '../db/client';
import { authMiddleware } from '../middlewares/auth';

export const uploadsRouter = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// GET route for downloading files (Public/No Auth required to download files shared in rooms)
uploadsRouter.get('/files/:key', async (c) => {
  const key = c.req.param('key');
  const object = await c.env.R2_BUCKET.get(key);
  if (!object) {
    return c.json({ error_code: 'NOT_FOUND', detail: 'File not found' }, 404);
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('etag', object.httpEtag);

  return new Response(object.body, { headers });
});

// POST route for uploading files (Auth required)
uploadsRouter.use('*', authMiddleware);

uploadsRouter.post('/', async (c) => {
  const user = c.get('user');
  const body = await c.req.parseBody().catch(() => ({}) as any) as any;
  const file = body.file as File | undefined;

  if (!file) {
    return c.json({ error_code: 'VALIDATION_ERROR', detail: 'No file was uploaded' }, 400);
  }

  // File size validation (10MB limit)
  const MAX_FILE_SIZE = 10 * 1024 * 1024;
  if (file.size > MAX_FILE_SIZE) {
    return c.json({ error_code: 'FILE_TOO_LARGE', detail: 'File exceeds maximum 10MB size limit' }, 400);
  }

  // Generate unique file key and upload to R2
  const ext = file.name.split('.').pop() || '';
  const fileKey = `${crypto.randomUUID()}.${ext}`;

  await c.env.R2_BUCKET.put(fileKey, file.stream(), {
    httpMetadata: {
      contentType: file.type
    }
  });

  // Access URL through worker endpoint
  const fileUrl = `/api/v1/uploads/files/${fileKey}`;

  // Log metadata in database
  const files = await dbQuery<{ id: string; filename: string; file_url: string; content_type: string }>(
    c.env.DATABASE_URL,
    "INSERT INTO files (filename, file_url, content_type, size, uploaded_by) VALUES ($1, $2, $3, $4, $5) RETURNING id, filename, file_url, content_type",
    [file.name, fileUrl, file.type, file.size, user.id]
  );

  return c.json(files[0], 201);
});
