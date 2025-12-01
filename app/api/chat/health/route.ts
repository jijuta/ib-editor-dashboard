/**
 * Chat Health Check API
 * GET /api/chat/health - Check health of all RAG services
 */

import { checkRAGHealth, getEmbeddingConfig } from '@/lib/chat';
import { getLightRAGStats } from '@/lib/chat/retrieval/lightrag';
import { getIncidentCount } from '@/lib/chat/retrieval/incidents';

/**
 * GET /api/chat/health
 * Returns health status of all chat-related services
 */
export async function GET() {
  try {
    const health = await checkRAGHealth();
    const embeddingConfig = getEmbeddingConfig();

    // Get additional stats if services are healthy
    let stats: {
      lightrag?: Awaited<ReturnType<typeof getLightRAGStats>>;
      incidents_7d?: number;
    } = {};

    if (health.postgres_n8n) {
      try {
        stats.lightrag = await getLightRAGStats();
      } catch {
        // Ignore stats errors
      }
    }

    if (health.opensearch) {
      try {
        stats.incidents_7d = await getIncidentCount(7);
      } catch {
        // Ignore stats errors
      }
    }

    return Response.json({
      ...health,
      embedding: embeddingConfig,
      stats,
    });
  } catch (error) {
    console.error('[health-api] Error:', error);

    return Response.json(
      {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
      },
      { status: 500 }
    );
  }
}
