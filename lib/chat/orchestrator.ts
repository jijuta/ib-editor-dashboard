/**
 * RAG Orchestrator
 * Coordinates retrieval from multiple sources and builds context
 */

import { getEmbedding, testOllamaEmbedding } from './embedding';
import { searchLightRAG, testLightRAGConnection } from './retrieval/lightrag';
import {
  searchIncidents,
  searchIncidentsByMITRE,
  testOpenSearchConnection,
} from './retrieval/incidents';
import {
  searchThreatIntel,
  extractEntitiesFromQuery,
  testThreatIntelConnection,
} from './retrieval/threat-intel';
import {
  buildContext,
  buildSystemPrompt,
  deduplicateSources,
  getContextStats,
} from './context-builder';
import type {
  RAGContext,
  ContextSource,
  RetrievalOptions,
  ChatHealthStatus,
} from './types';

// Configuration
const DEFAULT_WORKSPACE = process.env.LIGHTRAG_WORKSPACE || 'default';
const DEFAULT_TOP_K = 5;
const DEFAULT_MAX_TOKENS = 4000;

/**
 * Get RAG context for a query
 * Orchestrates parallel retrieval from all sources
 * @param query - User query
 * @param options - Retrieval options
 * @returns RAG context with sources
 */
export async function getRAGContext(
  query: string,
  options: RetrievalOptions = {}
): Promise<RAGContext> {
  const {
    topK = DEFAULT_TOP_K,
    threshold = 0.6,
    workspace = DEFAULT_WORKSPACE,
    includeIncidents = true,
    includeThreatIntel = true,
    includeLightRAG = true,
  } = options;

  const allSources: ContextSource[] = [];

  // Get embedding for vector search
  const queryVector = await getEmbedding(query);

  // Extract entities for targeted searches
  const entities = extractEntitiesFromQuery(query);

  // Run searches in parallel
  const searchPromises: Promise<ContextSource[]>[] = [];

  // LightRAG vector search (if embedding available)
  if (includeLightRAG && queryVector) {
    searchPromises.push(
      searchLightRAG(queryVector, { topK, threshold, workspace })
    );
  }

  // OpenSearch incident search
  if (includeIncidents) {
    searchPromises.push(searchIncidents(query, { topK }));

    // Also search by MITRE techniques if found in query
    if (entities.mitreTechniques.length > 0) {
      searchPromises.push(
        searchIncidentsByMITRE(entities.mitreTechniques[0], 3)
      );
    }
  }

  // Threat Intelligence search
  if (includeThreatIntel) {
    searchPromises.push(searchThreatIntel(query));
  }

  // Wait for all searches to complete
  const results = await Promise.allSettled(searchPromises);

  // Collect successful results
  for (const result of results) {
    if (result.status === 'fulfilled') {
      allSources.push(...result.value);
    } else {
      console.error('[orchestrator] Search failed:', result.reason);
    }
  }

  // Deduplicate and build context
  const uniqueSources = deduplicateSources(allSources);
  const context = buildContext(uniqueSources, query, workspace, {
    maxTokens: DEFAULT_MAX_TOKENS,
  });

  return context;
}

/**
 * Get system prompt with RAG context
 * @param query - User query
 * @param options - Retrieval options
 * @returns System prompt string
 */
export async function getSystemPromptWithContext(
  query: string,
  options: RetrievalOptions = {}
): Promise<{ prompt: string; context: RAGContext }> {
  const context = await getRAGContext(query, options);
  const prompt = buildSystemPrompt(context);

  return { prompt, context };
}

/**
 * Health check for all RAG services
 * @returns Health status for each service
 */
export async function checkRAGHealth(): Promise<ChatHealthStatus> {
  const [ollama, postgresN8N, opensearch] = await Promise.all([
    testOllamaEmbedding(),
    testLightRAGConnection(),
    testOpenSearchConnection(),
  ]);

  // Also check TI connection (same DB as LightRAG)
  const threatIntel = await testThreatIntelConnection();

  // Check Azure OpenAI (simple env check, not actual API call)
  const azureOpenAI = !!(
    process.env.AZURE_OPENAI_API_KEY &&
    process.env.AZURE_OPENAI_ENDPOINT
  );

  const allHealthy = ollama && postgresN8N && opensearch && azureOpenAI;
  const someHealthy = ollama || postgresN8N || opensearch || azureOpenAI;

  return {
    status: allHealthy ? 'healthy' : someHealthy ? 'degraded' : 'unhealthy',
    ollama,
    postgres_n8n: postgresN8N,
    postgres_siem: true, // Assumed healthy if we reach this point
    opensearch,
    azure_openai: azureOpenAI,
    timestamp: new Date(),
  };
}

/**
 * Get RAG context statistics
 * @param context - RAG context
 * @returns Context stats
 */
export function getRAGStats(context: RAGContext) {
  return getContextStats(context);
}

/**
 * Simple query without full RAG (for quick responses)
 * Only searches based on detected entities
 * @param query - User query
 * @returns Simple context
 */
export async function getSimpleContext(query: string): Promise<RAGContext> {
  const entities = extractEntitiesFromQuery(query);
  const sources: ContextSource[] = [];

  // Only search if specific entities are found
  if (
    entities.mitreTechniques.length > 0 ||
    entities.hashes.length > 0 ||
    entities.ips.length > 0 ||
    entities.cves.length > 0
  ) {
    const tiResults = await searchThreatIntel(query);
    sources.push(...tiResults);
  }

  return buildContext(sources, query, DEFAULT_WORKSPACE, {
    maxTokens: 2000,
  });
}

/**
 * Get suggested follow-up queries based on context
 * @param context - RAG context
 * @returns List of suggested queries
 */
export function getSuggestedQueries(context: RAGContext): string[] {
  const suggestions: string[] = [];

  // Check for MITRE techniques in context
  const mitreSources = context.sources.filter((s) => s.type === 'mitre');
  if (mitreSources.length > 0) {
    const technique = mitreSources[0].metadata?.technique_id;
    if (technique) {
      suggestions.push(`${technique} 공격의 탐지 방법은?`);
      suggestions.push(`${technique}에 대한 대응 방안은?`);
    }
  }

  // Check for incidents in context
  const incidentSources = context.sources.filter((s) => s.type === 'incident');
  if (incidentSources.length > 0) {
    suggestions.push('관련 인시던트의 공통점은?');
    suggestions.push('최근 비슷한 인시던트가 있었나요?');
  }

  // Check for threat intel in context
  const tiSources = context.sources.filter((s) => s.type === 'threat_intel');
  if (tiSources.length > 0) {
    suggestions.push('이 위협의 IOC는 무엇인가요?');
    suggestions.push('관련된 다른 악성코드가 있나요?');
  }

  // Default suggestions
  if (suggestions.length === 0) {
    suggestions.push('최근 고위험 인시던트는?');
    suggestions.push('PowerShell 공격이란?');
    suggestions.push('랜섬웨어 대응 방안은?');
  }

  return suggestions.slice(0, 4);
}

/**
 * Estimate query complexity
 * @param query - User query
 * @returns Complexity level and estimated processing time
 */
export function estimateQueryComplexity(query: string): {
  level: 'simple' | 'moderate' | 'complex';
  estimatedMs: number;
} {
  const entities = extractEntitiesFromQuery(query);
  const entityCount =
    entities.hashes.length +
    entities.ips.length +
    entities.cves.length +
    entities.mitreTechniques.length;

  // Longer queries typically need more context
  const queryLength = query.length;

  if (entityCount > 3 || queryLength > 200) {
    return { level: 'complex', estimatedMs: 5000 };
  } else if (entityCount > 0 || queryLength > 50) {
    return { level: 'moderate', estimatedMs: 3000 };
  } else {
    return { level: 'simple', estimatedMs: 1500 };
  }
}
