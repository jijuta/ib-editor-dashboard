/**
 * Chat Session Messages API
 * GET /api/chat/sessions/[id]/messages - Get messages for a session
 */

import { NextRequest } from 'next/server';
import { getSession, getSessionMessages } from '@/lib/chat';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/chat/sessions/[id]/messages
 * Get all messages for a session
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;

    const session = await getSession(id);

    if (!session) {
      return Response.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    const messages = await getSessionMessages(id);

    return Response.json({
      session_id: id,
      messages,
      count: messages.length,
    });
  } catch (error) {
    console.error('[messages-api] GET error:', error);
    return Response.json(
      { error: 'Failed to get messages' },
      { status: 500 }
    );
  }
}
