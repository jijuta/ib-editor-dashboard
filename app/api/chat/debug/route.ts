/**
 * RAG Chat Debug API
 * Returns detailed process trace for a query
 * POST /api/chat/debug
 */

import { NextRequest } from 'next/server';
import { getEmbedding, getEmbeddingConfig } from '@/lib/chat/embedding';
import { searchLightRAG } from '@/lib/chat/retrieval/lightrag';
import { searchIncidents, searchIncidentsByMITRE } from '@/lib/chat/retrieval/incidents';
import { searchThreatIntel, extractEntitiesFromQuery } from '@/lib/chat/retrieval/threat-intel';
import { buildContext, getContextStats } from '@/lib/chat/context-builder';
import type { ProcessTrace, ProcessTraceStep, ContextSource, ContextSourceType } from '@/lib/chat/types';

// Helper to create a step
function createStep(name: string): ProcessTraceStep {
  return {
    name,
    startTime: Date.now(),
    status: 'running',
  };
}

// Helper to complete a step
function completeStep(step: ProcessTraceStep, details?: Record<string, unknown>): ProcessTraceStep {
  return {
    ...step,
    endTime: Date.now(),
    duration: Date.now() - step.startTime,
    status: 'success',
    details,
  };
}

// Helper to fail a step
function failStep(step: ProcessTraceStep, error: string): ProcessTraceStep {
  return {
    ...step,
    endTime: Date.now(),
    duration: Date.now() - step.startTime,
    status: 'error',
    error,
  };
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const steps: ProcessTraceStep[] = [];
  const allSources: ContextSource[] = [];

  try {
    const body = await request.json();
    const query = body.message || body.query;
    const workspace = body.workspace || 'default';

    if (!query) {
      return Response.json({ error: 'Query is required' }, { status: 400 });
    }

    // Step 1: Entity Extraction
    let entityStep = createStep('1. 엔티티 추출');
    const entities = extractEntitiesFromQuery(query);
    entityStep = completeStep(entityStep, {
      mitreTechniques: entities.mitreTechniques,
      hashes: entities.hashes.length,
      ips: entities.ips.length,
      cves: entities.cves.length,
    });
    steps.push(entityStep);

    // Step 2: Embedding Generation
    let embeddingStep = createStep('2. 임베딩 생성 (Ollama bge-m3)');
    const embeddingConfig = getEmbeddingConfig();
    let queryVector: number[] | null = null;
    try {
      queryVector = await getEmbedding(query);
      embeddingStep = completeStep(embeddingStep, {
        model: embeddingConfig.model,
        dimensions: embeddingConfig.dimensions,
        vectorLength: queryVector?.length || 0,
      });
    } catch (error) {
      embeddingStep = failStep(embeddingStep, error instanceof Error ? error.message : 'Unknown error');
    }
    steps.push(embeddingStep);

    // Step 3: LightRAG Search
    let lightragStep = createStep('3. LightRAG 지식베이스 검색 (pgvector)');
    let lightragSources: ContextSource[] = [];
    if (queryVector) {
      try {
        lightragSources = await searchLightRAG(queryVector, { topK: 5, threshold: 0.6, workspace });
        lightragStep = completeStep(lightragStep, {
          resultsCount: lightragSources.length,
          topScores: lightragSources.slice(0, 3).map(s => ({ title: s.title, score: s.score.toFixed(3) })),
        });
        allSources.push(...lightragSources);
      } catch (error) {
        lightragStep = failStep(lightragStep, error instanceof Error ? error.message : 'Unknown error');
      }
    } else {
      lightragStep = { ...lightragStep, status: 'skipped', endTime: Date.now(), duration: 0, details: { reason: '임베딩 실패' } };
    }
    steps.push(lightragStep);

    // Step 4: OpenSearch Incident Search
    let incidentStep = createStep('4. OpenSearch 인시던트 검색');
    let incidentSources: ContextSource[] = [];
    try {
      incidentSources = await searchIncidents(query, { topK: 5 });
      incidentStep = completeStep(incidentStep, {
        resultsCount: incidentSources.length,
        topResults: incidentSources.slice(0, 3).map(s => ({
          id: s.metadata?.incident_id,
          severity: s.metadata?.severity,
          score: s.score.toFixed(3),
        })),
      });
      allSources.push(...incidentSources);
    } catch (error) {
      incidentStep = failStep(incidentStep, error instanceof Error ? error.message : 'Unknown error');
    }
    steps.push(incidentStep);

    // Step 5: MITRE Search (if technique detected)
    let mitreStep = createStep('5. MITRE ATT&CK 검색');
    let mitreSources: ContextSource[] = [];
    if (entities.mitreTechniques.length > 0) {
      try {
        mitreSources = await searchIncidentsByMITRE(entities.mitreTechniques[0], 3);
        mitreStep = completeStep(mitreStep, {
          technique: entities.mitreTechniques[0],
          resultsCount: mitreSources.length,
        });
        allSources.push(...mitreSources);
      } catch (error) {
        mitreStep = failStep(mitreStep, error instanceof Error ? error.message : 'Unknown error');
      }
    } else {
      mitreStep = { ...mitreStep, status: 'skipped', endTime: Date.now(), duration: 0, details: { reason: 'MITRE 기법 미감지' } };
    }
    steps.push(mitreStep);

    // Step 6: Threat Intelligence Search
    let tiStep = createStep('6. 위협 인텔리전스 검색 (PostgreSQL)');
    let tiSources: ContextSource[] = [];
    try {
      tiSources = await searchThreatIntel(query);
      tiStep = completeStep(tiStep, {
        resultsCount: tiSources.length,
        types: tiSources.map(s => s.type),
      });
      allSources.push(...tiSources);
    } catch (error) {
      tiStep = failStep(tiStep, error instanceof Error ? error.message : 'Unknown error');
    }
    steps.push(tiStep);

    // Step 7: Context Building
    let contextStep = createStep('7. 컨텍스트 구축');
    const context = buildContext(allSources, query, workspace, { maxTokens: 4000 });
    const stats = getContextStats(context);
    contextStep = completeStep(contextStep, {
      totalSources: context.sources.length,
      totalTokens: context.totalTokens,
      byType: stats.byType,
    });
    steps.push(contextStep);

    // Build source summary
    const sourcesByType: ProcessTrace['sources'] = [];
    const typeGroups: Record<ContextSourceType, ContextSource[]> = {
      lightrag: [],
      incident: [],
      mitre: [],
      threat_intel: [],
    };

    for (const source of context.sources) {
      typeGroups[source.type].push(source);
    }

    for (const [type, sources] of Object.entries(typeGroups)) {
      if (sources.length > 0) {
        sourcesByType.push({
          type: type as ContextSourceType,
          count: sources.length,
          items: sources.map(s => ({
            id: s.id,
            title: s.title || s.id,
            score: s.score,
          })),
        });
      }
    }

    const endTime = Date.now();
    const trace: ProcessTrace = {
      id: crypto.randomUUID(),
      query,
      startTime,
      endTime,
      totalDuration: endTime - startTime,
      steps,
      model: process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4o-mini',
      sources: sourcesByType,
      tokens: {
        context: context.totalTokens,
      },
    };

    return Response.json(trace);
  } catch (error) {
    console.error('[chat-debug] Error:', error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
