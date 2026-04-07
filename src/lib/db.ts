import { Pool } from "pg";

// Lazy-initialized connection pool
let pool: Pool | null = null;

export function getPool(): Pool | null {
  if (!process.env.DATABASE_URL) {
    return null;
  }

  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    pool.on("error", (err) => {
      console.error("Unexpected PostgreSQL pool error:", err);
    });
  }

  return pool;
}

export async function query<T>(text: string, params?: unknown[]): Promise<T[] | null> {
  const pool = getPool();
  if (!pool) {
    return null;
  }

  try {
    const result = await pool.query(text, params);
    return result.rows as T[];
  } catch (error) {
    console.error("PostgreSQL query error:", error);
    return null;
  }
}
