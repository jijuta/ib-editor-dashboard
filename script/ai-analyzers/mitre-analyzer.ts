/**
 * MITRE Analyzer
 * MITRE ATT&CK 기법 분석 및 검증
 */

import { runAIAnalysis, parseAIResponse } from './ai-helper.js';
import type { MITREAnalysisResult } from './types.js';
import type { FilteredData } from '../ai-data-filter.js';

const SYSTEM_PROMPT = `You are a threat intelligence analyst specializing in MITRE ATT&CK framework.
Evaluate detected techniques and explain their relevance to this incident.
Respond ONLY with valid JSON.`;

export async function analyzeMITRE(
  data: FilteredData['mitre_analysis']
): Promise<MITREAnalysisResult> {
  const startTime = Date.now();

  try {
    const userPrompt = `
Incident: ${data.incident_id}

Detected MITRE Techniques:
${data.techniques_raw.join('\n')}

Technique Details:
${JSON.stringify(data.techniques_details, null, 2)}

Analyze these MITRE techniques. Are they relevant to this incident? What do they tell us about the attack pattern?

Respond with JSON:
{
  "techniques_verified": ["T1234", "T5678"],
  "relevant_techniques": number,
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
      techniques_verified: string[];
      relevant_techniques: number;
      confidence: number;
      risk_score: number;
      key_findings: string[];
      reasoning: string;
    }>(text);

    return {
      category: 'mitre_techniques',
      success: true,
      techniques_verified: parsed.techniques_verified,
      relevant_techniques: parsed.relevant_techniques,
      confidence: parsed.confidence,
      risk_score: parsed.risk_score,
      key_findings: parsed.key_findings,
      reasoning: parsed.reasoning,
      tokens_used,
      execution_time_ms,
    };
  } catch (error) {
    console.error('[MITRE Analyzer] Error:', error);
    return {
      category: 'mitre_techniques',
      success: false,
      techniques_verified: [],
      relevant_techniques: data.techniques_raw.length,
      confidence: 0,
      risk_score: 4,
      key_findings: [],
      reasoning: 'Analysis failed',
      execution_time_ms: Date.now() - startTime,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
