/**
 * Network Analyzer
 * 네트워크 연결 및 IP 주소 분석
 */

import { runAIAnalysis, parseAIResponse } from './ai-helper.js';
import type { NetworkAnalysisResult } from './types.js';
import type { FilteredData } from '../ai-data-filter.js';

const SYSTEM_PROMPT = `You are a network security analyst.
Evaluate IP addresses and network connections for suspicious activity.
Distinguish between normal business traffic and potential threats.
Respond ONLY with valid JSON.`;

export async function analyzeNetwork(
  data: FilteredData['network_analysis']
): Promise<NetworkAnalysisResult> {
  const startTime = Date.now();

  try {
    const userPrompt = `
Incident: ${data.incident_id}
Total Network Connections: ${data.total_networks}

Suspicious IPs (TI Match):
${JSON.stringify(data.suspicious_ips, null, 2)}

External Connections Sample:
${JSON.stringify(data.external_connections.slice(0, 15), null, 2)}

Which IPs/connections are truly malicious? Which are legitimate business traffic?

Respond with JSON:
{
  "suspicious_ips": number,
  "malicious_connections": ["ip1", "ip2"],
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
      suspicious_ips: number;
      malicious_connections: string[];
      confidence: number;
      risk_score: number;
      key_findings: string[];
      reasoning: string;
    }>(text);

    return {
      category: 'network_connections',
      success: true,
      suspicious_ips: parsed.suspicious_ips,
      malicious_connections: parsed.malicious_connections,
      confidence: parsed.confidence,
      risk_score: parsed.risk_score,
      key_findings: parsed.key_findings,
      reasoning: parsed.reasoning,
      tokens_used,
      execution_time_ms,
    };
  } catch (error) {
    console.error('[Network Analyzer] Error:', error);
    return {
      category: 'network_connections',
      success: false,
      suspicious_ips: data.suspicious_ips.length,
      malicious_connections: [],
      confidence: 0,
      risk_score: 3,
      key_findings: [],
      reasoning: 'Analysis failed',
      execution_time_ms: Date.now() - startTime,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
