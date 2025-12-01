/**
 * PostgreSQL SIEM Database Connection
 * Used for chat history storage
 */

import { Client, Pool } from 'pg';

// Parse DATABASE_URL for connection config
const parseConnectionString = (url: string) => {
  try {
    const parsed = new URL(url);
    return {
      host: parsed.hostname,
      port: parseInt(parsed.port || '5432'),
      database: parsed.pathname.slice(1).split('?')[0],
      user: parsed.username,
      password: parsed.password,
    };
  } catch {
    return null;
  }
};

// Connection config for SIEM database
const getConfig = () => {
  const dbUrl = process.env.DATABASE_URL;

  if (dbUrl) {
    const parsed = parseConnectionString(dbUrl);
    if (parsed) {
      return {
        ...parsed,
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
      };
    }
  }

  // Fallback to environment variables
  return {
    host: process.env.SIEM_DB_HOST || 'localhost',
    port: parseInt(process.env.SIEM_DB_PORT || '5432'),
    database: process.env.SIEM_DB_NAME || 'siem_db',
    user: process.env.SIEM_DB_USER || 'opensearch',
    password: process.env.SIEM_DB_PASSWORD || 'opensearch123',
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  };
};

// Singleton pool for connection reuse
let pool: Pool | null = null;

/**
 * Get the shared PostgreSQL pool for SIEM database
 */
export function getSIEMPool(): Pool {
  if (!pool) {
    pool = new Pool(getConfig());

    pool.on('error', (err) => {
      console.error('[postgres-siem] Pool error:', err);
    });
  }
  return pool;
}

/**
 * Create a new PostgreSQL client for SIEM database
 */
export function createSIEMClient(): Client {
  return new Client(getConfig());
}

/**
 * Execute a query using the connection pool
 */
export async function querySIEM<T = unknown>(
  text: string,
  params?: unknown[]
): Promise<T[]> {
  const p = getSIEMPool();
  const result = await p.query(text, params);
  return result.rows as T[];
}

/**
 * Execute a query and return single row
 */
export async function queryOneSIEM<T = unknown>(
  text: string,
  params?: unknown[]
): Promise<T | null> {
  const rows = await querySIEM<T>(text, params);
  return rows[0] || null;
}

/**
 * Test connection to SIEM database
 */
export async function testSIEMConnection(): Promise<boolean> {
  try {
    const p = getSIEMPool();
    const result = await p.query('SELECT 1 as check');
    return result.rows[0]?.check === 1;
  } catch (error) {
    console.error('[postgres-siem] Connection test failed:', error);
    return false;
  }
}

/**
 * Initialize chat tables if they don't exist
 */
export async function initializeChatTables(): Promise<boolean> {
  const p = getSIEMPool();

  try {
    // Check if tables exist
    const tableCheck = await p.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'chat_sessions'
      ) as exists
    `);

    if (tableCheck.rows[0]?.exists) {
      return true;
    }

    // Create tables if they don't exist
    await p.query(`
      CREATE TABLE IF NOT EXISTS chat_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR(255) NOT NULL DEFAULT 'anonymous',
        title VARCHAR(500),
        workspace VARCHAR(255) DEFAULT 'default',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        metadata JSONB DEFAULT '{}'::jsonb
      );

      CREATE TABLE IF NOT EXISTS chat_messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE,
        role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
        content TEXT NOT NULL,
        tokens_used INTEGER DEFAULT 0,
        context_sources JSONB DEFAULT '[]'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_chat_sessions_user ON chat_sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_chat_sessions_workspace ON chat_sessions(workspace);
      CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages(session_id);
    `);

    console.log('[postgres-siem] Chat tables created successfully');
    return true;
  } catch (error) {
    console.error('[postgres-siem] Failed to initialize chat tables:', error);
    return false;
  }
}

/**
 * Close the connection pool
 */
export async function closeSIEMPool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
