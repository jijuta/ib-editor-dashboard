/**
 * Synthesizer
 * 모든 개별 분석 결과를 종합하여 최종 판단
 */

import { runAIAnalysis, parseAIResponse } from './ai-helper';
import type { SynthesisResult, AnalysisResult } from './types';

const SYSTEM_PROMPT = `You are a senior security analyst making final incident assessment.
Synthesize all category analyses into a comprehensive verdict.
Consider: analyst judgment, file threats, network activity, MITRE techniques, CVEs, and endpoint vulnerabilities.
Provide actionable recommendations.
Respond ONLY with valid JSON.`;

export async function synthesizeAnalyses(
  incidentId: string,
  analyses: {
    analyst_verification?: AnalysisResult;
    file_hash_analysis?: AnalysisResult;
    network_analysis?: AnalysisResult;
    mitre_analysis?: AnalysisResult;
    cve_analysis?: AnalysisResult;
    endpoint_analysis?: AnalysisResult;
  }
): Promise<SynthesisResult> {
  const startTime = Date.now();

  try {
    // 각 분석 결과 요약
    const summaries = Object.entries(analyses)
      .map(([category, result]) => {
        if (!result || !result.success) return `${category}: Failed`;
        return `${category}:
  Risk: ${result.risk_score}/10
  Confidence: ${(result.confidence * 100).toFixed(0)}%
  Findings: ${result.key_findings.join(', ')}
  Reasoning: ${result.reasoning}`;
      })
      .join('\n\n');

    const userPrompt = `
Incident: ${incidentId}

Individual Analysis Results:
${summaries}

Based on ALL analyses above, provide your final assessment.

Respond with JSON:
{
  "final_verdict": "true_positive" | "false_positive" | "benign" | "needs_investigation",
  "overall_risk_score": 0-100,
  "confidence": 0.0-1.0,
  "executive_summary": "2-3 sentence summary",
  "key_findings": ["critical finding 1", "critical finding 2"],
  "recommendations": ["action 1", "action 2", "action 3"],
  "reasoning": "comprehensive explanation (max 200 words)"
}`;

    const { text, tokens_used, execution_time_ms } = await runAIAnalysis(
      SYSTEM_PROMPT,
      userPrompt,
      { maxTokens: 1000 }  // 종합 분석은 좀 더 길게
    );

    const parsed = parseAIResponse<{
      final_verdict: 'true_positive' | 'false_positive' | 'benign' | 'needs_investigation';
      overall_risk_score: number;
      confidence: number;
      executive_summary: string;
      key_findings: string[];
      recommendations: string[];
      reasoning: string;
    }>(text);

    return {
      category: 'synthesis',
      success: true,
      final_verdict: parsed.final_verdict,
      overall_risk_score: parsed.overall_risk_score,
      executive_summary: parsed.executive_summary,
      recommendations: parsed.recommendations,
      confidence: parsed.confidence,
      risk_score: Math.round(parsed.overall_risk_score / 10),  // 0-10 scale
      key_findings: parsed.key_findings,
      reasoning: parsed.reasoning,
      tokens_used,
      execution_time_ms,
    };
  } catch (error) {
    console.error('[Synthesizer] Error:', error);
    return {
      category: 'synthesis',
      success: false,
      final_verdict: 'needs_investigation',
      overall_risk_score: 50,
      executive_summary: 'Synthesis failed - manual review required',
      recommendations: ['Review individual analyses manually'],
      confidence: 0,
      risk_score: 5,
      key_findings: [],
      reasoning: 'Synthesis failed',
      execution_time_ms: Date.now() - startTime,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
