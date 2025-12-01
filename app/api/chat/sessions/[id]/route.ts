/**
 * Chat Session Detail API
 * GET /api/chat/sessions/[id] - Get session details
 * PATCH /api/chat/sessions/[id] - Update session
 * DELETE /api/chat/sessions/[id] - Delete session
 */

import { NextRequest } from 'next/server';
import {
  getSession,
  updateSessionTitle,
  deleteSession,
  getSessionMessages,
} from '@/lib/chat';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/chat/sessions/[id]
 * Get session details with messages
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const includeMessages = searchParams.get('include_messages') !== 'false';

    const session = await getSession(id);

    if (!session) {
      return Response.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    const response: {
      session: typeof session;
      messages?: Awaited<ReturnType<typeof getSessionMessages>>;
    } = { session };

    if (includeMessages) {
      response.messages = await getSessionMessages(id);
    }

    return Response.json(response);
  } catch (error) {
    console.error('[session-api] GET error:', error);
    return Response.json(
      { error: 'Failed to get session' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/chat/sessions/[id]
 * Update session (title)
 */
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { title } = body;

    const session = await getSession(id);

    if (!session) {
      return Response.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    if (title && typeof title === 'string') {
      await updateSessionTitle(id, title);
    }

    const updated = await getSession(id);
    return Response.json({ session: updated });
  } catch (error) {
    console.error('[session-api] PATCH error:', error);
    return Response.json(
      { error: 'Failed to update session' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/chat/sessions/[id]
 * Delete session and all messages
 */
export async function DELETE(
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

    await deleteSession(id);

    return Response.json({ success: true, deleted_id: id });
  } catch (error) {
    console.error('[session-api] DELETE error:', error);
    return Response.json(
      { error: 'Failed to delete session' },
      { status: 500 }
    );
  }
}
