/**
 * Endpoint Analyzer
 * 엔드포인트 취약성 분석
 */

import { runAIAnalysis, parseAIResponse } from './ai-helper.js';
import type { EndpointAnalysisResult } from './types.js';
import type { FilteredData } from '../ai-data-filter.js';

const SYSTEM_PROMPT = `You are an endpoint security analyst.
Assess endpoint vulnerability status based on CVE counts and OS types.
Identify which endpoints are at highest risk.
Respond ONLY with valid JSON.`;

export async function analyzeEndpoints(
  data: FilteredData['endpoint_analysis']
): Promise<EndpointAnalysisResult> {
  const startTime = Date.now();

  try {
    const userPrompt = `
Incident: ${data.incident_id}
Total Endpoints: ${data.total_endpoints}

Endpoint Vulnerability Status:
${JSON.stringify(data.endpoints, null, 2)}

Analyze endpoint risk. Which endpoints are most vulnerable? Which need immediate patching?

Respond with JSON:
{
  "vulnerable_endpoints": number,
  "high_risk_endpoints": ["endpoint1", "endpoint2"],
  "confidence": 0.0-1.0,
  "risk_score": 0-10,
  "key_findings": ["finding1", "finding2"],
  "reasoning": "brief explanation (max 150 words)"
}`;

    const { text, tokens_used, execution_time_ms } = await runAIAnalysis(
      SYSTEM_PROMPT,
      userPrompt,
      { maxTokens: 600 }
    );

    const parsed = parseAIResponse<{
      vulnerable_endpoints: number;
      high_risk_endpoints: string[];
      confidence: number;
      risk_score: number;
      key_findings: string[];
      reasoning: string;
    }>(text);

    return {
      category: 'endpoint_vulnerability',
      success: true,
      vulnerable_endpoints: parsed.vulnerable_endpoints,
      high_risk_endpoints: parsed.high_risk_endpoints,
      confidence: parsed.confidence,
      risk_score: parsed.risk_score,
      key_findings: parsed.key_findings,
      reasoning: parsed.reasoning,
      tokens_used,
      execution_time_ms,
    };
  } catch (error) {
    console.error('[Endpoint Analyzer] Error:', error);
    return {
      category: 'endpoint_vulnerability',
      success: false,
      vulnerable_endpoints: 0,
      high_risk_endpoints: [],
      confidence: 0,
      risk_score: 3,
      key_findings: [],
      reasoning: 'Analysis failed',
      execution_time_ms: Date.now() - startTime,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
