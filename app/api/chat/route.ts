/**
 * RAG Chat API - Streaming Endpoint
 * POST /api/chat
 *
 * Supports both:
 * 1. Direct API calls: { message: "...", session_id?, workspace?, user_id? }
 * 2. AI SDK 5.x format: { messages: [...], session_id?, workspace?, user_id? }
 */

import { NextRequest } from 'next/server';
import { streamText } from 'ai';
import { createAzure } from '@ai-sdk/azure';
import {
  getRAGContext,
  buildSystemPrompt,
  getOrCreateSession,
  saveMessage,
  getChatHistory,
  generateSessionTitle,
  updateSessionTitle,
  getContextStats,
} from '@/lib/chat';

// Azure OpenAI client
function getAzureClient() {
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  if (!endpoint) {
    throw new Error('AZURE_OPENAI_ENDPOINT not configured');
  }

  const resourceName = endpoint.split('//')[1]?.split('.')[0] || '';

  return createAzure({
    resourceName,
    apiKey: process.env.AZURE_OPENAI_API_KEY || '',
  });
}

// Extract text from AI SDK 5.x message parts
function extractTextFromParts(parts: unknown): string {
  if (!Array.isArray(parts)) return '';
  return parts
    .filter((part: unknown) => {
      const p = part as { type?: string; text?: string };
      return p.type === 'text' && typeof p.text === 'string';
    })
    .map((part: unknown) => (part as { text: string }).text)
    .join('');
}

// Extract user message from request body
function extractUserMessage(body: Record<string, unknown>): string | null {
  // Format 1: Direct API call with 'message' field
  if (typeof body.message === 'string' && body.message.trim()) {
    return body.message.trim();
  }

  // Format 2: AI SDK 5.x with 'messages' array
  if (Array.isArray(body.messages) && body.messages.length > 0) {
    // Find the last user message
    for (let i = body.messages.length - 1; i >= 0; i--) {
      const msg = body.messages[i] as Record<string, unknown>;
      if (msg.role === 'user') {
        // Check for content field
        if (typeof msg.content === 'string' && msg.content.trim()) {
          return msg.content.trim();
        }
        // Check for parts array (AI SDK 5.x format)
        if (Array.isArray(msg.parts)) {
          const text = extractTextFromParts(msg.parts);
          if (text.trim()) return text.trim();
        }
      }
    }
  }

  return null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as Record<string, unknown>;

    // Extract message from either format
    const message = extractUserMessage(body);

    if (!message) {
      return Response.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    const session_id = body.session_id as string | undefined;
    const workspace = (body.workspace as string) || 'default';
    const user_id = (body.user_id as string) || 'anonymous';

    // Get or create session
    const session = await getOrCreateSession(session_id, user_id, workspace);
    const isNewSession = !session_id;

    // Get RAG context
    const ragContext = await getRAGContext(message, { workspace });

    // Get chat history
    const history = await getChatHistory(session.id, 10);

    // Build system prompt with context
    const systemPrompt = buildSystemPrompt(ragContext);

    // Prepare messages for LLM
    const messages = [
      ...history,
      { role: 'user' as const, content: message },
    ];

    // Create Azure client
    const azure = getAzureClient();
    const model = process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4o-mini';

    // Stream response
    const result = streamText({
      model: azure(model),
      system: systemPrompt,
      messages,
      temperature: 0.7,
      maxOutputTokens: 2000,
      onFinish: async ({ text, usage }) => {
        // Save user message
        await saveMessage(session.id, 'user', message);

        // Save assistant message with context sources
        const tokensUsed =
          (usage?.inputTokens || 0) + (usage?.outputTokens || 0);
        await saveMessage(
          session.id,
          'assistant',
          text,
          tokensUsed,
          ragContext.sources
        );

        // Update session title if new session
        if (isNewSession) {
          const title = generateSessionTitle(message);
          await updateSessionTitle(session.id, title);
        }
      },
    });

    // Get context stats for headers
    const stats = getContextStats(ragContext);

    // Return streaming response with session info in headers
    const response = result.toTextStreamResponse();

    // Add custom headers with context info
    const headers = new Headers(response.headers);
    headers.set('X-Session-Id', session.id);
    headers.set('X-Is-New-Session', isNewSession ? 'true' : 'false');
    headers.set('X-Context-Sources', String(ragContext.sources.length));
    headers.set('X-Context-Tokens', String(stats.totalTokens));
    headers.set('X-Context-LightRAG', String(stats.byType.lightrag));
    headers.set('X-Context-Incidents', String(stats.byType.incident));
    headers.set('X-Context-MITRE', String(stats.byType.mitre));
    headers.set('X-Context-TI', String(stats.byType.threat_intel));

    // CORS headers for custom headers to be readable
    headers.set('Access-Control-Expose-Headers',
      'X-Session-Id, X-Is-New-Session, X-Context-Sources, X-Context-Tokens, ' +
      'X-Context-LightRAG, X-Context-Incidents, X-Context-MITRE, X-Context-TI'
    );

    return new Response(response.body, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error('[chat-api] Error:', error);

    const errorMessage =
      error instanceof Error ? error.message : 'Internal server error';

    return Response.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

// OPTIONS for CORS
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
