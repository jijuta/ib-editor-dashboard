/**
 * PostgreSQL n8n Database Connection
 * Used for LightRAG pgvector tables
 */

import { Client, Pool } from 'pg';

// Connection config for n8n database (LightRAG)
const getConfig = () => ({
  host: process.env.POSTGRES_HOST || 'postgres',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB || 'n8n',
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'postgres',
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// Singleton pool for connection reuse
let pool: Pool | null = null;

/**
 * Get the shared PostgreSQL pool for n8n database
 */
export function getN8NPool(): Pool {
  if (!pool) {
    pool = new Pool(getConfig());

    pool.on('error', (err) => {
      console.error('[postgres-n8n] Pool error:', err);
    });
  }
  return pool;
}

/**
 * Create a new PostgreSQL client for n8n database
 * Use this for single queries that don't need pooling
 */
export function createN8NClient(): Client {
  return new Client(getConfig());
}

/**
 * Execute a query using the connection pool
 */
export async function queryN8N<T = unknown>(
  text: string,
  params?: unknown[]
): Promise<T[]> {
  const p = getN8NPool();
  const result = await p.query(text, params);
  return result.rows as T[];
}

/**
 * Execute a query and return single row
 */
export async function queryOneN8N<T = unknown>(
  text: string,
  params?: unknown[]
): Promise<T | null> {
  const rows = await queryN8N<T>(text, params);
  return rows[0] || null;
}

/**
 * Test connection to n8n database
 */
export async function testN8NConnection(): Promise<boolean> {
  try {
    const p = getN8NPool();
    const result = await p.query('SELECT 1 as check');
    return result.rows[0]?.check === 1;
  } catch (error) {
    console.error('[postgres-n8n] Connection test failed:', error);
    return false;
  }
}

/**
 * Close the connection pool
 */
export async function closeN8NPool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
