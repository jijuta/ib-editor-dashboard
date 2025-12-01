/**
 * Chat Sessions API
 * GET /api/chat/sessions - List sessions
 * POST /api/chat/sessions - Create new session
 */

import { NextRequest } from 'next/server';
import {
  listSessions,
  createSession,
  getSessionStats,
} from '@/lib/chat';

/**
 * GET /api/chat/sessions
 * List chat sessions for a user
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id') || 'anonymous';
    const limit = parseInt(searchParams.get('limit') || '20');
    const includeStats = searchParams.get('include_stats') === 'true';

    const sessions = await listSessions(userId, limit);

    const response: {
      sessions: typeof sessions;
      stats?: Awaited<ReturnType<typeof getSessionStats>>;
    } = { sessions };

    if (includeStats) {
      response.stats = await getSessionStats(userId);
    }

    return Response.json(response);
  } catch (error) {
    console.error('[sessions-api] GET error:', error);
    return Response.json(
      { error: 'Failed to list sessions' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/chat/sessions
 * Create a new chat session
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      user_id = 'anonymous',
      workspace = 'default',
      title,
    } = body;

    const session = await createSession(user_id, workspace, title);

    return Response.json(session, { status: 201 });
  } catch (error) {
    console.error('[sessions-api] POST error:', error);
    return Response.json(
      { error: 'Failed to create session' },
      { status: 500 }
    );
  }
}
