import { Hono } from 'hono';
import { Bindings, Variables } from '../types';
import { dbQuery } from '../db/client';
import { authMiddleware } from '../middlewares/auth';

export const uploadsRouter = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// GET route for downloading/viewing shared attachments
uploadsRouter.get('/files/:key', async (c) => {
  const key = c.req.param('key');
  try {
    const result = await dbQuery<{ filename: string; content_type: string; data: Uint8Array }>(
      c.env.DATABASE_URL,
      "SELECT filename, content_type, data FROM files WHERE id = $1 LIMIT 1",
      [key]
    );

    if (result.length === 0) {
      return c.json({ error_code: 'NOT_FOUND', detail: 'File not found' }, 404);
    }

    const file = result[0];
    return new Response(file.data, {
      headers: {
        'Content-Type': file.content_type,
        'Content-Disposition': `inline; filename="${encodeURIComponent(file.filename)}"`
      }
    });
  } catch (err) {
    return c.json({ error_code: 'INTERNAL_ERROR', detail: 'Could not retrieve file' }, 500);
  }
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

  // Read file as ArrayBuffer and map to Uint8Array for Postgres BYTEA insert
  const arrayBuffer = await file.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);

  // Insert metadata and binary payload
  const files = await dbQuery<{ id: string; filename: string; content_type: string }>(
    c.env.DATABASE_URL,
    "INSERT INTO files (filename, file_url, content_type, size, uploaded_by, data) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, filename, content_type",
    [file.name, '', file.type, file.size, user.id, uint8Array]
  );

  const savedFile = files[0];
  const fileUrl = `/api/v1/uploads/files/${savedFile.id}`;

  // Update URL metadata matching generated primary key UUID
  await dbQuery(
    c.env.DATABASE_URL,
    "UPDATE files SET file_url = $1 WHERE id = $2",
    [fileUrl, savedFile.id]
  );

  return c.json({
    id: savedFile.id,
    filename: savedFile.filename,
    file_url: fileUrl,
    content_type: savedFile.content_type
  }, 201);
});
