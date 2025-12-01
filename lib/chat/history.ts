/**
 * Chat History Management
 * Handles sessions and messages in PostgreSQL
 */

import { querySIEM, queryOneSIEM, initializeChatTables } from '@/lib/db/postgres-siem';
import type {
  ChatSession,
  ChatMessage,
  SessionListItem,
  ContextSource,
  MessageRole,
} from './types';

// Configuration
const DEFAULT_HISTORY_LIMIT = 10;

/**
 * Initialize chat database tables
 */
export async function initializeHistory(): Promise<boolean> {
  return await initializeChatTables();
}

/**
 * Create a new chat session
 * @param userId - User ID
 * @param workspace - Workspace name
 * @param title - Optional session title
 * @returns Created session
 */
export async function createSession(
  userId: string = 'anonymous',
  workspace: string = 'default',
  title?: string
): Promise<ChatSession> {
  const result = await queryOneSIEM<ChatSession>(
    `INSERT INTO chat_sessions (user_id, workspace, title)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [userId, workspace, title || null]
  );

  if (!result) {
    throw new Error('Failed to create chat session');
  }

  return result;
}

/**
 * Get session by ID
 * @param sessionId - Session UUID
 * @returns Session or null
 */
export async function getSession(sessionId: string): Promise<ChatSession | null> {
  return await queryOneSIEM<ChatSession>(
    'SELECT * FROM chat_sessions WHERE id = $1',
    [sessionId]
  );
}

/**
 * Update session title
 * @param sessionId - Session UUID
 * @param title - New title
 */
export async function updateSessionTitle(
  sessionId: string,
  title: string
): Promise<void> {
  await querySIEM(
    'UPDATE chat_sessions SET title = $1, updated_at = NOW() WHERE id = $2',
    [title, sessionId]
  );
}

/**
 * Delete session and all messages
 * @param sessionId - Session UUID
 */
export async function deleteSession(sessionId: string): Promise<void> {
  await querySIEM('DELETE FROM chat_sessions WHERE id = $1', [sessionId]);
}

/**
 * List sessions for a user
 * @param userId - User ID
 * @param limit - Maximum number of sessions
 * @returns List of session items with preview
 */
export async function listSessions(
  userId: string = 'anonymous',
  limit: number = 20
): Promise<SessionListItem[]> {
  const sessions = await querySIEM<SessionListItem>(
    `SELECT
      s.id,
      s.title,
      s.created_at,
      s.updated_at,
      (SELECT content FROM chat_messages WHERE session_id = s.id ORDER BY created_at DESC LIMIT 1) as preview,
      (SELECT COUNT(*) FROM chat_messages WHERE session_id = s.id)::int as message_count
    FROM chat_sessions s
    WHERE s.user_id = $1
    ORDER BY s.updated_at DESC
    LIMIT $2`,
    [userId, limit]
  );

  return sessions;
}

/**
 * Save a message to the database
 * @param sessionId - Session UUID
 * @param role - Message role
 * @param content - Message content
 * @param tokensUsed - Tokens used (optional)
 * @param contextSources - Context sources used (optional)
 * @returns Created message
 */
export async function saveMessage(
  sessionId: string,
  role: MessageRole,
  content: string,
  tokensUsed: number = 0,
  contextSources: ContextSource[] = []
): Promise<ChatMessage> {
  const result = await queryOneSIEM<ChatMessage>(
    `INSERT INTO chat_messages (session_id, role, content, tokens_used, context_sources)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [sessionId, role, content, tokensUsed, JSON.stringify(contextSources)]
  );

  if (!result) {
    throw new Error('Failed to save message');
  }

  // Update session timestamp
  await querySIEM(
    'UPDATE chat_sessions SET updated_at = NOW() WHERE id = $1',
    [sessionId]
  );

  return result;
}

/**
 * Get chat history for a session
 * @param sessionId - Session UUID
 * @param limit - Maximum number of messages
 * @returns Array of messages (oldest first)
 */
export async function getChatHistory(
  sessionId: string,
  limit: number = DEFAULT_HISTORY_LIMIT
): Promise<Array<{ role: MessageRole; content: string }>> {
  const messages = await querySIEM<ChatMessage>(
    `SELECT role, content FROM chat_messages
     WHERE session_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [sessionId, limit]
  );

  // Reverse to get oldest first
  return messages.reverse().map((m) => ({
    role: m.role,
    content: m.content,
  }));
}

/**
 * Get all messages for a session with full details
 * @param sessionId - Session UUID
 * @returns Array of full message objects
 */
export async function getSessionMessages(
  sessionId: string
): Promise<ChatMessage[]> {
  const messages = await querySIEM<ChatMessage>(
    `SELECT * FROM chat_messages
     WHERE session_id = $1
     ORDER BY created_at ASC`,
    [sessionId]
  );

  return messages;
}

/**
 * Generate session title from first message
 * @param content - First message content
 * @returns Generated title
 */
export function generateSessionTitle(content: string): string {
  // Take first 50 chars or first sentence
  const firstSentence = content.split(/[.!?。！？]/)[0];
  const title = firstSentence.length > 50
    ? firstSentence.slice(0, 47) + '...'
    : firstSentence;

  return title || '새 대화';
}

/**
 * Get or create session
 * @param sessionId - Optional existing session ID
 * @param userId - User ID
 * @param workspace - Workspace
 * @returns Session (existing or new)
 */
export async function getOrCreateSession(
  sessionId?: string,
  userId: string = 'anonymous',
  workspace: string = 'default'
): Promise<ChatSession> {
  if (sessionId) {
    const existing = await getSession(sessionId);
    if (existing) {
      return existing;
    }
  }

  return await createSession(userId, workspace);
}

/**
 * Get session statistics
 * @param userId - User ID
 * @returns Statistics
 */
export async function getSessionStats(userId: string = 'anonymous'): Promise<{
  totalSessions: number;
  totalMessages: number;
  totalTokens: number;
}> {
  const stats = await queryOneSIEM<{
    total_sessions: string;
    total_messages: string;
    total_tokens: string;
  }>(
    `SELECT
      COUNT(DISTINCT s.id)::text as total_sessions,
      COUNT(m.id)::text as total_messages,
      COALESCE(SUM(m.tokens_used), 0)::text as total_tokens
    FROM chat_sessions s
    LEFT JOIN chat_messages m ON m.session_id = s.id
    WHERE s.user_id = $1`,
    [userId]
  );

  return {
    totalSessions: parseInt(stats?.total_sessions || '0'),
    totalMessages: parseInt(stats?.total_messages || '0'),
    totalTokens: parseInt(stats?.total_tokens || '0'),
  };
}

/**
 * Clean up old sessions (older than N days)
 * @param userId - User ID
 * @param daysOld - Delete sessions older than this
 * @returns Number of deleted sessions
 */
export async function cleanupOldSessions(
  userId: string = 'anonymous',
  daysOld: number = 30
): Promise<number> {
  const result = await querySIEM<{ count: string }>(
    `WITH deleted AS (
      DELETE FROM chat_sessions
      WHERE user_id = $1
        AND updated_at < NOW() - INTERVAL '1 day' * $2
      RETURNING id
    )
    SELECT COUNT(*)::text as count FROM deleted`,
    [userId, daysOld]
  );

  return parseInt(result[0]?.count || '0');
}
