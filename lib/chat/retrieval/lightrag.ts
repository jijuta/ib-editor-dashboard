/**
 * LightRAG Vector Search
 * Searches pgvector tables for relevant entities and relations
 */

import { queryN8N } from '@/lib/db/postgres-n8n';
import { vectorToString } from '../embedding';
import type { ContextSource, LightRAGEntity, LightRAGRelation } from '../types';

// Configuration
const DEFAULT_TOP_K = 5;
const DEFAULT_THRESHOLD = 0.6; // Cosine distance threshold (lower is better)
const DEFAULT_WORKSPACE = process.env.LIGHTRAG_WORKSPACE || 'default';

/**
 * Search LightRAG entities using vector similarity
 * @param queryVector - Query embedding vector
 * @param options - Search options
 * @returns Relevant entity context sources
 */
export async function searchLightRAGEntities(
  queryVector: number[],
  options: {
    topK?: number;
    threshold?: number;
    workspace?: string;
  } = {}
): Promise<ContextSource[]> {
  const {
    topK = DEFAULT_TOP_K,
    threshold = DEFAULT_THRESHOLD,
    workspace = DEFAULT_WORKSPACE,
  } = options;

  const vectorStr = vectorToString(queryVector);

  try {
    const entities = await queryN8N<LightRAGEntity>(
      `SELECT
        entity_name,
        content,
        content_vector <=> $1::vector AS distance,
        workspace
      FROM lightrag_vdb_entity
      WHERE workspace = $2
        AND content_vector <=> $1::vector < $3
      ORDER BY content_vector <=> $1::vector
      LIMIT $4`,
      [vectorStr, workspace, threshold, topK]
    );

    return entities.map((entity) => ({
      type: 'lightrag' as const,
      id: `entity:${entity.entity_name}`,
      title: entity.entity_name,
      content: entity.content,
      score: 1 - entity.distance, // Convert distance to similarity
      metadata: {
        workspace: entity.workspace,
        distance: entity.distance,
      },
    }));
  } catch (error) {
    console.error('[lightrag] Entity search error:', error);
    return [];
  }
}

/**
 * Search LightRAG relations using vector similarity
 * @param queryVector - Query embedding vector
 * @param options - Search options
 * @returns Relevant relation context sources
 */
export async function searchLightRAGRelations(
  queryVector: number[],
  options: {
    topK?: number;
    threshold?: number;
    workspace?: string;
  } = {}
): Promise<ContextSource[]> {
  const {
    topK = 3,
    threshold = DEFAULT_THRESHOLD,
    workspace = DEFAULT_WORKSPACE,
  } = options;

  const vectorStr = vectorToString(queryVector);

  try {
    const relations = await queryN8N<LightRAGRelation>(
      `SELECT
        source_id,
        target_id,
        content,
        content_vector <=> $1::vector AS distance,
        workspace
      FROM lightrag_vdb_relation
      WHERE workspace = $2
        AND content_vector <=> $1::vector < $3
      ORDER BY content_vector <=> $1::vector
      LIMIT $4`,
      [vectorStr, workspace, threshold, topK]
    );

    return relations.map((rel) => ({
      type: 'lightrag' as const,
      id: `relation:${rel.source_id}->${rel.target_id}`,
      title: `${rel.source_id} → ${rel.target_id}`,
      content: rel.content,
      score: 1 - rel.distance,
      metadata: {
        workspace: rel.workspace,
        source_id: rel.source_id,
        target_id: rel.target_id,
        distance: rel.distance,
      },
    }));
  } catch (error) {
    console.error('[lightrag] Relation search error:', error);
    return [];
  }
}

/**
 * Search both entities and relations from LightRAG
 * @param queryVector - Query embedding vector
 * @param options - Search options
 * @returns Combined context sources
 */
export async function searchLightRAG(
  queryVector: number[],
  options: {
    topK?: number;
    threshold?: number;
    workspace?: string;
  } = {}
): Promise<ContextSource[]> {
  const [entities, relations] = await Promise.all([
    searchLightRAGEntities(queryVector, options),
    searchLightRAGRelations(queryVector, { ...options, topK: 3 }),
  ]);

  // Combine and sort by score
  const combined = [...entities, ...relations];
  combined.sort((a, b) => b.score - a.score);

  return combined;
}

/**
 * Get LightRAG statistics
 */
export async function getLightRAGStats(workspace: string = DEFAULT_WORKSPACE): Promise<{
  entityCount: number;
  relationCount: number;
}> {
  try {
    const [entityResult, relationResult] = await Promise.all([
      queryN8N<{ count: string }>(
        'SELECT COUNT(*) as count FROM lightrag_vdb_entity WHERE workspace = $1',
        [workspace]
      ),
      queryN8N<{ count: string }>(
        'SELECT COUNT(*) as count FROM lightrag_vdb_relation WHERE workspace = $1',
        [workspace]
      ),
    ]);

    return {
      entityCount: parseInt(entityResult[0]?.count || '0'),
      relationCount: parseInt(relationResult[0]?.count || '0'),
    };
  } catch (error) {
    console.error('[lightrag] Stats error:', error);
    return { entityCount: 0, relationCount: 0 };
  }
}

/**
 * Test LightRAG database connection
 */
export async function testLightRAGConnection(): Promise<boolean> {
  try {
    const result = await queryN8N<{ exists: boolean }>(
      `SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'lightrag_vdb_entity'
      ) as exists`
    );
    return result[0]?.exists || false;
  } catch {
    return false;
  }
}
