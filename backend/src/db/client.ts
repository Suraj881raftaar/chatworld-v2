import { Client } from '@neondatabase/serverless';

/**
 * Executes a PostgreSQL query safely by connecting, running the query,
 * and cleaning up the database client connection immediately.
 */
export async function dbQuery<T = any>(
  databaseUrl: string,
  sql: string,
  params: any[] = []
): Promise<T[]> {
  // Replace postgres:// schema with postgresql:// if needed
  let normalizedUrl = databaseUrl;
  if (normalizedUrl.startsWith("postgres://")) {
    normalizedUrl = normalizedUrl.replace("postgres://", "postgresql://");
  }
  
  const client = new Client(normalizedUrl);
  await client.connect();
  try {
    const result = await client.query(sql, params);
    return result.rows as T[];
  } finally {
    // Safely disconnect client connection to prevent leaks on serverless/Neon
    await client.end();
  }
}
