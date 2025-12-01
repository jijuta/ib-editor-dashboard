/**
 * RAG Chat Assistant - Main Export
 */

// Types
export type {
  MessageRole,
  ChatMessage,
  ChatSession,
  ContextSource,
  ContextSourceType,
  RAGContext,
  EmbeddingResult,
  ChatRequest,
  ChatResponse,
  SessionListItem,
  ChatHealthStatus,
  RetrievalOptions,
  ContextBuilderOptions,
  LightRAGEntity,
  LightRAGRelation,
  IncidentContext,
  MITREContext,
  ThreatIntelContext,
} from './types';

// Embedding
export {
  getEmbedding,
  getEmbeddingWithMeta,
  getEmbeddings,
  vectorToString,
  cosineSimilarity,
  testOllamaEmbedding,
  getEmbeddingConfig,
} from './embedding';

// Retrieval - LightRAG
export {
  searchLightRAG,
  searchLightRAGEntities,
  searchLightRAGRelations,
  getLightRAGStats,
  testLightRAGConnection,
} from './retrieval/lightrag';

// Retrieval - Incidents
export {
  searchIncidents,
  searchIncidentsByMITRE,
  searchIncidentsByEntity,
  testOpenSearchConnection,
  getIncidentCount,
} from './retrieval/incidents';

// Retrieval - Threat Intel
export {
  searchMITRETechniques,
  searchMITREByTactic,
  checkHashThreatIntel,
  checkIPThreatIntel,
  searchCVE,
  searchThreatIntel,
  extractEntitiesFromQuery,
  testThreatIntelConnection,
} from './retrieval/threat-intel';

// Context Builder
export {
  buildContext,
  buildSystemPrompt,
  formatContextForPrompt,
  formatSourcesSummary,
  deduplicateSources,
  getContextStats,
  estimateTokens,
  truncateToTokens,
} from './context-builder';

// History Management
export {
  initializeHistory,
  createSession,
  getSession,
  updateSessionTitle,
  deleteSession,
  listSessions,
  saveMessage,
  getChatHistory,
  getSessionMessages,
  generateSessionTitle,
  getOrCreateSession,
  getSessionStats,
  cleanupOldSessions,
} from './history';

// Orchestrator
export {
  getRAGContext,
  getSystemPromptWithContext,
  checkRAGHealth,
  getRAGStats,
  getSimpleContext,
  getSuggestedQueries,
  estimateQueryComplexity,
} from './orchestrator';
