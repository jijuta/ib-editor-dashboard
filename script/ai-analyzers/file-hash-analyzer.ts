/**
 * File Hash Analyzer
 * 파일 해시 TI 매칭 결과 분석
 */

import { runAIAnalysis, parseAIResponse } from './ai-helper';
import type { FileHashAnalysisResult } from './types';
import type { FilteredData } from '../ai-data-filter';

const SYSTEM_PROMPT = `You are a malware analyst evaluating file artifacts.
Analyze threat intelligence matches and determine which files are truly dangerous.
Focus on threat files and unknown files that need investigation.
Respond ONLY with valid JSON.`;

export async function analyzeFileHashes(
  data: FilteredData['file_hash_analysis']
): Promise<FileHashAnalysisResult> {
  const startTime = Date.now();

  try {
    const userPrompt = `
Incident: ${data.incident_id}
Total Files: ${data.total_files}

Threat Files (${data.threat_files.length}):
${JSON.stringify(data.threat_files, null, 2)}

Unknown Files (${data.unknown_files.length}):
${JSON.stringify(data.unknown_files, null, 2)}

Analyze these files. Which are truly dangerous? Which are false positives?

Respond with JSON:
{
  "threat_count": number,
  "suspicious_count": number,
  "confidence": 0.0-1.0,
  "risk_score": 0-10,
  "critical_files": ["filename1", "filename2"],
  "key_findings": ["finding1", "finding2"],
  "reasoning": "brief explanation (max 150 words)"
}`;

    const { text, tokens_used, execution_time_ms } = await runAIAnalysis(
      SYSTEM_PROMPT,
      userPrompt,
      { maxTokens: 600 }
    );

    const parsed = parseAIResponse<{
      threat_count: number;
      suspicious_count: number;
      confidence: number;
      risk_score: number;
      critical_files: string[];
      key_findings: string[];
      reasoning: string;
    }>(text);

    return {
      category: 'file_artifacts',
      success: true,
      threat_count: parsed.threat_count,
      suspicious_count: parsed.suspicious_count,
      critical_files: parsed.critical_files,
      confidence: parsed.confidence,
      risk_score: parsed.risk_score,
      key_findings: parsed.key_findings,
      reasoning: parsed.reasoning,
      tokens_used,
      execution_time_ms,
    };
  } catch (error) {
    console.error('[File Hash Analyzer] Error:', error);
    return {
      category: 'file_artifacts',
      success: false,
      threat_count: data.threat_files.length,
      suspicious_count: data.unknown_files.length,
      critical_files: [],
      confidence: 0,
      risk_score: 5,
      key_findings: [],
      reasoning: 'Analysis failed',
      execution_time_ms: Date.now() - startTime,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
