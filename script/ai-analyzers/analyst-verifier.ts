/**
 * Analyst Verifier
 * 분석가 판단을 데이터 기반으로 검증
 */

import { runAIAnalysis, parseAIResponse } from './ai-helper';
import type { AnalystVerificationResult } from './types';
import type { FilteredData } from '../ai-data-filter';

const SYSTEM_PROMPT = `You are a cybersecurity analyst verifying another analyst's judgment.
Analyze the incident data and determine if the analyst's conclusion is supported by evidence.
Respond ONLY with valid JSON. Be objective and evidence-based.`;

export async function verifyAnalystJudgment(
  data: FilteredData['analyst_verification']
): Promise<AnalystVerificationResult> {
  const startTime = Date.now();

  try {
    const userPrompt = `
Incident: ${data.incident_id}
Severity: ${data.incident_severity}
Status: ${data.incident_status}
Description: ${data.incident_description}

Analyst's Judgment:
${data.analyst_comment || 'No comment provided'}

Based on the incident severity, status, and description, evaluate if the analyst's judgment is reasonable.

Respond with JSON:
{
  "agrees_with_analyst": true/false,
  "confidence": 0.0-1.0,
  "risk_score": 0-10,
  "key_findings": ["finding1", "finding2"],
  "reasoning": "brief explanation (max 100 words)"
}`;

    const { text, tokens_used, execution_time_ms } = await runAIAnalysis(
      SYSTEM_PROMPT,
      userPrompt,
      { maxTokens: 500 }
    );

    const parsed = parseAIResponse<{
      agrees_with_analyst: boolean;
      confidence: number;
      risk_score: number;
      key_findings: string[];
      reasoning: string;
    }>(text);

    return {
      category: 'analyst_judgment',
      success: true,
      agrees_with_analyst: parsed.agrees_with_analyst,
      confidence: parsed.confidence,
      risk_score: parsed.risk_score,
      key_findings: parsed.key_findings,
      reasoning: parsed.reasoning,
      tokens_used,
      execution_time_ms,
    };
  } catch (error) {
    console.error('[Analyst Verifier] Error:', error);
    return {
      category: 'analyst_judgment',
      success: false,
      agrees_with_analyst: true,  // 기본값: 분석가 판단 존중
      confidence: 0,
      risk_score: 5,
      key_findings: [],
      reasoning: 'Analysis failed',
      execution_time_ms: Date.now() - startTime,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
