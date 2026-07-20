import { Hono } from 'hono';
import { Bindings, Variables } from '../types';
import { dbQuery } from '../db/client';
import { authMiddleware } from '../middlewares/auth';

export const uploadsRouter = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// GET route for downloading/viewing shared attachments
uploadsRouter.get('/files/:key', async (c) => {
  const key = c.req.param('key');
  try {
    const result = await dbQuery<{ filename: string; content_type: string; data: any }>(
      c.env.DATABASE_URL,
      "SELECT filename, content_type, data FROM files WHERE id = $1 LIMIT 1",
      [key]
    );

    if (result.length === 0) {
      return c.json({ error_code: 'NOT_FOUND', detail: 'File not found' }, 404);
    }

    const file = result[0];
    let binaryData: Uint8Array;

    // Convert PostgreSQL BYTEA hex string representation '\x89504e...' or Uint8Array
    if (typeof file.data === 'string') {
      const hex = file.data.startsWith('\\x') ? file.data.slice(2) : file.data;
      const bytes = new Uint8Array(hex.length / 2);
      for (let i = 0; i < hex.length; i += 2) {
        bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
      }
      binaryData = bytes;
    } else if (file.data instanceof Uint8Array) {
      binaryData = file.data;
    } else if (file.data && typeof file.data === 'object') {
      binaryData = new Uint8Array(Object.values(file.data));
    } else {
      binaryData = new Uint8Array(0);
    }

    return new Response(binaryData, {
      headers: {
        'Content-Type': file.content_type || 'application/octet-stream',
        'Content-Disposition': `inline; filename="${encodeURIComponent(file.filename)}"`,
        'Cache-Control': 'public, max-age=31536000'
      }
    });
  } catch (err) {
    return c.json({ error_code: 'INTERNAL_ERROR', detail: 'Could not retrieve file' }, 500);
  }
});

// POST route for uploading files (Auth required)
uploadsRouter.use('*', authMiddleware);

const handleFileUpload = async (c: any) => {
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
};

uploadsRouter.post('/', handleFileUpload);
uploadsRouter.post('/rooms/:roomId/upload', handleFileUpload);
