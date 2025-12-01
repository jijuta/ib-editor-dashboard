/**
 * RAG Chat Assistant - Type Definitions
 */

// Message roles
export type MessageRole = 'user' | 'assistant' | 'system';

// Chat message
export interface ChatMessage {
  id: string;
  session_id: string;
  role: MessageRole;
  content: string;
  tokens_used?: number;
  context_sources?: ContextSource[];
  created_at: Date;
}

// Chat session
export interface ChatSession {
  id: string;
  user_id: string;
  title?: string;
  workspace: string;
  created_at: Date;
  updated_at: Date;
  metadata?: Record<string, unknown>;
}

// Context source types
export type ContextSourceType = 'lightrag' | 'incident' | 'threat_intel' | 'mitre';

// Context source item
export interface ContextSource {
  type: ContextSourceType;
  id: string;
  title?: string;
  content: string;
  score: number;
  metadata?: Record<string, unknown>;
}

// RAG context result
export interface RAGContext {
  sources: ContextSource[];
  totalTokens: number;
  query: string;
  workspace: string;
}

// LightRAG entity from pgvector
export interface LightRAGEntity {
  entity_name: string;
  content: string;
  distance: number;
  workspace: string;
}

// LightRAG relation from pgvector
export interface LightRAGRelation {
  source_id: string;
  target_id: string;
  content: string;
  distance: number;
  workspace: string;
}

// OpenSearch incident
export interface IncidentContext {
  incident_id: string;
  description: string;
  severity: string;
  status: string;
  source: string;
  created_time?: string;
}

// MITRE technique
export interface MITREContext {
  technique_id: string;
  technique_name: string;
  tactic: string;
  description: string;
}

// Threat Intel match
export interface ThreatIntelContext {
  ioc_value: string;
  ioc_type: string;
  threat_level: number;
  severity: string;
  source: string;
}

// Embedding response
export interface EmbeddingResult {
  vector: number[];
  model: string;
  dimensions: number;
}

// Chat API request
export interface ChatRequest {
  message: string;
  session_id?: string;
  workspace?: string;
  user_id?: string;
}

// Chat API response (non-streaming)
export interface ChatResponse {
  id: string;
  session_id: string;
  message: string;
  sources: ContextSource[];
  tokens_used: number;
}

// Session list item
export interface SessionListItem {
  id: string;
  title: string | null;
  preview: string;
  message_count: number;
  created_at: Date;
  updated_at: Date;
}

// Chat health status
export interface ChatHealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  ollama: boolean;
  postgres_n8n: boolean;
  postgres_siem: boolean;
  opensearch: boolean;
  azure_openai: boolean;
  timestamp: Date;
}

// Retrieval options
export interface RetrievalOptions {
  topK?: number;
  threshold?: number;
  workspace?: string;
  includeIncidents?: boolean;
  includeThreatIntel?: boolean;
  includeLightRAG?: boolean;
}

// Context builder options
export interface ContextBuilderOptions {
  maxTokens?: number;
  priorityOrder?: ContextSourceType[];
}

// Process trace step
export interface ProcessTraceStep {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  status: 'running' | 'success' | 'error' | 'skipped';
  details?: Record<string, unknown>;
  error?: string;
}

// Full process trace for debugging
export interface ProcessTrace {
  id: string;
  query: string;
  startTime: number;
  endTime?: number;
  totalDuration?: number;
  steps: ProcessTraceStep[];
  model: string;
  sources: {
    type: ContextSourceType;
    count: number;
    items: Array<{ id: string; title: string; score: number }>;
  }[];
  tokens: {
    context: number;
    input?: number;
    output?: number;
    total?: number;
  };
}
