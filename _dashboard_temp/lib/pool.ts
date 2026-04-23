import { Pool } from 'pg';

const dbUrl = process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL || '';

// Single shared connection pool for the entire application
export const pool = new Pool({
  connectionString: dbUrl,
  ssl: dbUrl.includes('localhost') ? false : { rejectUnauthorized: false },
  max: 10, // Maximum connections
  idleTimeoutMillis: 30000, // Close idle connections after 30 seconds
  connectionTimeoutMillis: 10000, // Fail if can't connect within 10 seconds
});

// Log pool errors
pool.on('error', (err) => {
  console.error('Unexpected database pool error:', err);
});
