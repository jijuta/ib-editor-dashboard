/**
 * AI Incident Analyzer
 * Azure OpenAI를 사용하여 인시던트 조사 결과를 종합 분석
 */

import { generateText } from 'ai';
import { createAzure } from '@ai-sdk/azure';
import { config } from 'dotenv';
import { resolve } from 'path';

// .env.local 로드
config({ path: resolve(process.cwd(), '.env.local') });

/**
 * Azure OpenAI 클라이언트 생성
 */
function getAzureClient() {
  // AZURE_OPENAI_ENDPOINT가 없으면 EMBEDDING_ENDPOINT에서 추출
  let endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  if (!endpoint && process.env.AZURE_OPENAI_EMBEDDING_ENDPOINT) {
    // https://etech-openai.openai.azure.com/... → https://etech-openai.openai.azure.com
    endpoint = process.env.AZURE_OPENAI_EMBEDDING_ENDPOINT.split('/openai/')[0];
  }

  if (!endpoint) {
    throw new Error('AZURE_OPENAI_ENDPOINT or AZURE_OPENAI_EMBEDDING_ENDPOINT not found');
  }

  // https://etech-openai.openai.azure.com → etech-openai
  const resourceName = endpoint.split('//')[1]?.split('.')[0] || '';

  return createAzure({
    resourceName,
    apiKey: process.env.AZURE_OPENAI_API_KEY || '',
  });
}

/**
 * AI 분석 결과
 */
export interface AIAnalysisResult {
  success: boolean;
  analysis?: {
    analyst_verification: {
      agrees_with_analyst: boolean;
      reasoning: string;
    };
    file_analysis: {
      total_checked: number;
      relevant_files: Array<{
        file_name: string;
        sha256: string;
        verdict: string;
        relevance: string;
      }>;
      summary: string;
    };
    cve_analysis: {
      total_checked: number;
      critical_cves: Array<{
        cve_id: string;
        cvss_score: number;
        hostname: string;
        is_actual_vulnerability: boolean;
        reasoning: string;
      }>;
      summary: string;
    };
    network_analysis: {
      total_checked: number;
      suspicious_connections: Array<{
        ip: string;
        port: number;
        country: string;
        reason: string;
      }>;
      summary: string;
    };
    risk_assessment: {
      level: 'critical' | 'high' | 'medium' | 'low' | 'none';
      score: number;
      reasoning: string;
    };
    recommendations: string[];
    final_verdict: string;
  };
  error?: string;
}

/**
 * 인시던트 종합 분석 실행
 */
export async function analyzeIncident(analysisData: {
  incident_id: string;
  analyst_comment: string | null;
  incident_info: any;
  summary: any;
  all_alerts: any[];
  all_files: any[];
  all_networks: any[];
  all_cves: any[];
  all_endpoints: any[];
  ti_correlation?: any;
}): Promise<AIAnalysisResult> {
  try {
    console.error(`[AI Analyzer] 🤖 Starting analysis for incident ${analysisData.incident_id}`);
    console.error(`[AI Analyzer] 📊 Data size: ${JSON.stringify(analysisData).length} bytes`);

    const azure = getAzureClient();
    const deployment = process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4o-mini';

    // AI 분석 프롬프트
    const prompt = `
당신은 사이버 보안 전문 분석가입니다. 인시던트 조사 결과를 종합적으로 분석하세요.

# 인시던트 정보
- **인시던트 ID**: ${analysisData.incident_id}
- **심각도**: ${analysisData.incident_info.severity}
- **상태**: ${analysisData.incident_info.status}
- **설명**: ${analysisData.incident_info.description}

# 분석가 판단
${analysisData.analyst_comment || '(분석가 코멘트 없음)'}

# 매칭된 데이터 (전체 검증 필요)

## 알림 (${analysisData.summary.total_alerts}개)
${JSON.stringify(analysisData.all_alerts, null, 2)}

## 파일 아티팩트 (${analysisData.summary.total_files}개)
${JSON.stringify(analysisData.all_files.map(f => ({
  file_name: f.file_name,
  sha256: f.file_sha256,
  verdict: f.wildfire_verdict || f.file_wildfire_verdict,
  is_malicious: f.is_malicious,
  file_path: f.file_path,
  file_size: f.file_size,
  file_type: f.file_type
})), null, 2)}

## 네트워크 연결 (${analysisData.summary.total_networks}개)
${JSON.stringify(analysisData.all_networks.map(n => ({
  external_ip: n.external_ip,
  external_port: n.external_port,
  country: n.country,
  domain: n.domain,
  protocol: n.protocol,
  action: n.action
})), null, 2)}

## CVE 취약점 (${analysisData.summary.total_cves}개)
${JSON.stringify(analysisData.all_cves.map(c => ({
  cve_id: c.cve_id,
  cvss_score: c.cvss_score,
  severity: c.severity,
  hostname: c.hostname,
  product: c.product,
  description: c.description
})), null, 2)}

## 엔드포인트 (${analysisData.summary.total_endpoints}개)
${JSON.stringify(analysisData.all_endpoints, null, 2)}

## TI 상관분석 결과
${analysisData.ti_correlation ? `
### 파일 해시 TI 매칭 (${analysisData.ti_correlation.file_hashes.length}개 검사)
- 매칭됨: ${analysisData.summary.ti_matched_files || 0}개
- 위협 파일: ${analysisData.summary.ti_threat_files || 0}개
${JSON.stringify(analysisData.ti_correlation.file_hashes.filter(h => h.matched).map(h => ({
  hash: h.hash,
  verdict: h.verdict,
  threat_level: h.threat_level,
  severity: h.severity,
  source: h.source,
  misp_matches: h.misp_matches,
  opencti_matches: h.opencti_matches
})), null, 2)}

### IP 주소 TI 매칭 (${analysisData.ti_correlation.ip_addresses.length}개 검사)
- 매칭됨: ${analysisData.summary.ti_matched_ips || 0}개
- 위협 IP: ${analysisData.summary.ti_threat_ips || 0}개
${JSON.stringify(analysisData.ti_correlation.ip_addresses.filter(ip => ip.matched).map(ip => ({
  ip: ip.hash,
  verdict: ip.verdict,
  threat_level: ip.threat_level,
  severity: ip.severity,
  source: ip.source
})), null, 2)}

### MITRE ATT&CK 기법 (${analysisData.ti_correlation.mitre_techniques.length}개)
${JSON.stringify(analysisData.ti_correlation.mitre_techniques.map(m => ({
  technique_id: m.technique_id,
  technique_name: m.technique_name,
  tactic: m.tactic,
  description: m.description,
  incident_count: m.incident_count
})), null, 2)}

### CVE 상세 정보 (${analysisData.ti_correlation.cve_details.length}개)
${JSON.stringify(analysisData.ti_correlation.cve_details.map(c => ({
  cve_id: c.cve_id,
  cvss_score: c.cvss_score,
  severity: c.severity,
  description: c.description
})), null, 2)}
` : '(TI 상관분석 정보 없음)'}

---

# 분석 작업

다음을 **JSON 형식**으로 답변하세요:

\`\`\`json
{
  "analyst_verification": {
    "agrees_with_analyst": true/false,
    "reasoning": "분석가 판단에 동의/불일치하는 이유"
  },
  "file_analysis": {
    "total_checked": ${analysisData.summary.total_files},
    "relevant_files": [
      {
        "file_name": "실제 인시던트와 연관된 파일",
        "sha256": "해시값",
        "verdict": "MALWARE/BENIGN",
        "relevance": "이 파일이 인시던트와 연관된 이유"
      }
    ],
    "summary": "파일 분석 요약"
  },
  "cve_analysis": {
    "total_checked": ${analysisData.summary.total_cves},
    "critical_cves": [
      {
        "cve_id": "CVE-XXXX-XXXXX",
        "cvss_score": 10,
        "hostname": "영향받는 호스트",
        "is_actual_vulnerability": true/false,
        "reasoning": "실제 취약점인지 판단 근거"
      }
    ],
    "summary": "CVE 분석 요약"
  },
  "network_analysis": {
    "total_checked": ${analysisData.summary.total_networks},
    "suspicious_connections": [
      {
        "ip": "의심스러운 IP",
        "port": 443,
        "country": "국가",
        "reason": "의심스러운 이유"
      }
    ],
    "summary": "네트워크 분석 요약"
  },
  "risk_assessment": {
    "level": "critical/high/medium/low/none",
    "score": 0-100,
    "reasoning": "위험도 평가 근거"
  },
  "recommendations": [
    "권장 조치 1",
    "권장 조치 2"
  ],
  "final_verdict": "최종 판단 (한글로 2-3문장)"
}
\`\`\`

**중요 지침:**
1. 매칭된 파일 중 실제로 이 인시던트와 연관된 것만 relevant_files에 포함
2. CVE는 호스트 이름 fuzzy match로 매칭되었으므로, 실제 이 호스트의 취약점인지 검증
3. 네트워크 연결 중 정상 트래픽과 의심스러운 것을 구분
4. 분석가 판단을 데이터 기반으로 재검증
5. 반드시 유효한 JSON만 반환하세요
`;

    const { text } = await generateText({
      model: azure(deployment),
      prompt,
      temperature: 0.3,
      maxTokens: 4000,
    });

    console.error(`[AI Analyzer] ✅ Analysis complete`);
    console.error(`[AI Analyzer] 📝 Response length: ${text.length} chars`);

    // JSON 추출 (```json ... ``` 블록 처리)
    let jsonText = text.trim();
    const jsonMatch = jsonText.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonText = jsonMatch[1];
    }

    // JSON 파싱
    const analysis = JSON.parse(jsonText);

    return {
      success: true,
      analysis,
    };
  } catch (error) {
    console.error('[AI Analyzer] ❌ Analysis error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * AI 분석 결과를 마크다운으로 포맷팅
 */
export function formatAIAnalysisAsMarkdown(analysis: AIAnalysisResult['analysis']): string {
  if (!analysis) {
    return '## 🤖 AI 분석\n\n분석 결과를 가져올 수 없습니다.\n\n';
  }

  let md = '## 🤖 AI 종합 분석\n\n';

  // 1. 분석가 판단 검증
  md += '### 👨‍💼 분석가 판단 검증\n\n';
  if (analysis.analyst_verification.agrees_with_analyst) {
    md += `✅ **분석가 판단에 동의합니다**\n\n`;
  } else {
    md += `⚠️ **분석가 판단과 다른 의견**\n\n`;
  }
  md += `${analysis.analyst_verification.reasoning}\n\n`;

  // 2. 파일 분석
  md += `### 📁 파일 분석 (${analysis.file_analysis.total_checked}개 검사 완료)\n\n`;
  md += `${analysis.file_analysis.summary}\n\n`;
  if (analysis.file_analysis.relevant_files.length > 0) {
    md += `**인시던트 연관 파일**:\n\n`;
    analysis.file_analysis.relevant_files.forEach((file, idx) => {
      md += `${idx + 1}. **${file.file_name}**\n`;
      md += `   - SHA256: \`${file.sha256}\`\n`;
      md += `   - 판정: ${file.verdict}\n`;
      md += `   - 연관성: ${file.relevance}\n\n`;
    });
  }

  // 3. CVE 분석
  md += `### 🔒 CVE 분석 (${analysis.cve_analysis.total_checked}개 검사 완료)\n\n`;
  md += `${analysis.cve_analysis.summary}\n\n`;
  if (analysis.cve_analysis.critical_cves.length > 0) {
    md += `**주요 취약점**:\n\n`;
    analysis.cve_analysis.critical_cves.forEach((cve, idx) => {
      const icon = cve.is_actual_vulnerability ? '🔴' : '⚠️';
      md += `${idx + 1}. ${icon} **${cve.cve_id}** (CVSS: ${cve.cvss_score})\n`;
      md += `   - 호스트: ${cve.hostname}\n`;
      md += `   - 실제 취약점: ${cve.is_actual_vulnerability ? '예' : '아니오'}\n`;
      md += `   - 근거: ${cve.reasoning}\n\n`;
    });
  }

  // 4. 네트워크 분석
  md += `### 🌐 네트워크 분석 (${analysis.network_analysis.total_checked}개 검사 완료)\n\n`;
  md += `${analysis.network_analysis.summary}\n\n`;
  if (analysis.network_analysis.suspicious_connections.length > 0) {
    md += `**의심스러운 연결**:\n\n`;
    analysis.network_analysis.suspicious_connections.forEach((conn, idx) => {
      md += `${idx + 1}. **${conn.ip}:${conn.port}** (${conn.country})\n`;
      md += `   - 이유: ${conn.reason}\n\n`;
    });
  }

  // 5. 위험도 평가
  md += `### ⚡ 위험도 평가\n\n`;
  const riskIcon = {
    critical: '🔴',
    high: '🟠',
    medium: '🟡',
    low: '🟢',
    none: '⚪',
  }[analysis.risk_assessment.level];
  md += `**${riskIcon} ${analysis.risk_assessment.level.toUpperCase()}** (점수: ${analysis.risk_assessment.score}/100)\n\n`;
  md += `${analysis.risk_assessment.reasoning}\n\n`;

  // 6. 권장 조치
  md += `### 📋 권장 조치\n\n`;
  analysis.recommendations.forEach((rec, idx) => {
    md += `${idx + 1}. ${rec}\n`;
  });
  md += `\n`;

  // 7. 최종 판단
  md += `### ✅ 최종 판단\n\n`;
  md += `${analysis.final_verdict}\n\n`;

  return md;
}
