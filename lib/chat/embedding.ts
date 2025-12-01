/**
 * Ollama Embedding Service
 * Uses bge-m3 model for 1024-dimensional embeddings
 */

import type { EmbeddingResult } from './types';

// Configuration
const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://localhost:11434';
const EMBEDDING_MODEL = process.env.OLLAMA_EMBEDDING_MODEL || 'bge-m3';
const MAX_TEXT_LENGTH = 8000;
const EMBEDDING_DIMENSIONS = 1024;

/**
 * Get embedding vector from Ollama bge-m3 model
 * @param text - Text to embed (max 8000 chars)
 * @returns Embedding vector or null on failure
 */
export async function getEmbedding(text: string): Promise<number[] | null> {
  if (!text || text.trim().length === 0) {
    return null;
  }

  // Truncate text to max length
  const truncatedText = text.slice(0, MAX_TEXT_LENGTH);

  try {
    const response = await fetch(`${OLLAMA_HOST}/api/embed`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        input: truncatedText,
      }),
    });

    if (!response.ok) {
      console.error(`[embedding] Ollama error: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = await response.json();
    const embeddings = data.embeddings;

    if (!embeddings || !Array.isArray(embeddings) || embeddings.length === 0) {
      console.error('[embedding] No embeddings returned from Ollama');
      return null;
    }

    return embeddings[0] as number[];
  } catch (error) {
    console.error('[embedding] Failed to get embedding:', error);
    return null;
  }
}

/**
 * Get embedding with metadata
 * @param text - Text to embed
 * @returns EmbeddingResult with vector and metadata
 */
export async function getEmbeddingWithMeta(text: string): Promise<EmbeddingResult | null> {
  const vector = await getEmbedding(text);

  if (!vector) {
    return null;
  }

  return {
    vector,
    model: EMBEDDING_MODEL,
    dimensions: vector.length,
  };
}

/**
 * Get multiple embeddings in batch
 * @param texts - Array of texts to embed
 * @returns Array of vectors (null for failed embeddings)
 */
export async function getEmbeddings(texts: string[]): Promise<(number[] | null)[]> {
  // Process in parallel with concurrency limit
  const results: (number[] | null)[] = [];
  const concurrency = 3;

  for (let i = 0; i < texts.length; i += concurrency) {
    const batch = texts.slice(i, i + concurrency);
    const batchResults = await Promise.all(batch.map(getEmbedding));
    results.push(...batchResults);
  }

  return results;
}

/**
 * Convert vector array to PostgreSQL vector string format
 * @param vector - Number array
 * @returns PostgreSQL vector string like '[0.1,0.2,...]'
 */
export function vectorToString(vector: number[]): string {
  return '[' + vector.join(',') + ']';
}

/**
 * Calculate cosine similarity between two vectors
 * @param a - First vector
 * @param b - Second vector
 * @returns Cosine similarity (0-1)
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have same dimensions');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (normA * normB);
}

/**
 * Test Ollama embedding service
 * @returns True if service is available
 */
export async function testOllamaEmbedding(): Promise<boolean> {
  try {
    const vector = await getEmbedding('test');
    return vector !== null && vector.length === EMBEDDING_DIMENSIONS;
  } catch {
    return false;
  }
}

/**
 * Get Ollama embedding configuration
 */
export function getEmbeddingConfig() {
  return {
    host: OLLAMA_HOST,
    model: EMBEDDING_MODEL,
    maxTextLength: MAX_TEXT_LENGTH,
    dimensions: EMBEDDING_DIMENSIONS,
  };
}
