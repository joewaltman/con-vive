import { Pool } from "pg";

// Lazy-initialized connection pool
let _pool: Pool | null = null;

export function getPool(): Pool | null {
  const connectionString = process.env.DATABASE_URL || process.env.DATABASE_PUBLIC_URL;
  if (!connectionString) {
    return null;
  }

  if (!_pool) {
    _pool = new Pool({
      connectionString,
      ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    _pool.on("error", (err) => {
      console.error("Unexpected PostgreSQL pool error:", err);
    });
  }

  return _pool;
}

export async function query<T>(text: string, params?: unknown[]): Promise<T[] | null> {
  const pool = getPool();
  if (!pool) {
    console.error("PostgreSQL: No pool available (DATABASE_URL not set?)");
    return null;
  }

  try {
    const result = await pool.query(text, params);
    return result.rows as T[];
  } catch (error) {
    console.error("PostgreSQL query error:", error);
    console.error("Query was:", text.substring(0, 200));
    return null;
  }
}

// Query that throws on error (for debugging)
export async function queryOrThrow<T>(text: string, params?: unknown[]): Promise<T[]> {
  const pool = getPool();
  if (!pool) {
    throw new Error("PostgreSQL: No pool available (DATABASE_URL not set)");
  }

  const result = await pool.query(text, params);
  return result.rows as T[];
}

// Export pool for admin dashboard compatibility
// Note: This throws if DATABASE_URL is not set, unlike getPool() which returns null
export const pool = new Proxy({} as Pool, {
  get(_, prop) {
    const p = getPool();
    if (!p) {
      throw new Error("PostgreSQL: No pool available (DATABASE_URL not set)");
    }
    return p[prop as keyof Pool];
  },
});
