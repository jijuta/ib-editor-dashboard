#!/usr/bin/env node

/**
 * NL-Query MCP Server
 *
 * 자연어 질문을 OpenSearch 쿼리로 변환하고 실행하는 MCP 서버
 *
 * Tools:
 * 1. nl_query - 자연어 질문 → 파싱 → OpenSearch 쿼리 실행
 * 2. test_parse - 파싱만 테스트 (쿼리 실행 안 함)
 */

import readline from 'readline';
import { parseNLQuery } from './nl-query-parser.js';
import { executeNLQuery } from './opensearch-executor.js';
import { saveInvestigation, prepareForAIAnalysis, getRelativePath } from './investigation-cache.js';
import { analyzeIncident, formatAIAnalysisAsMarkdown } from './ai-incident-analyzer.js';
import { checkHashesInTI, checkIPsInTI, getMITREByTechniqueIds, getCVEDetails } from './ti-correlator.js';
import { runParallelAnalysis, formatParallelAnalysisAsMarkdown } from './ai-parallel-analyzer.js';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false,
});

// MCP 도구 목록
const TOOLS = [
  {
    name: 'nl_query',
    description: '자연어 질문을 OpenSearch 쿼리로 변환하고 실행합니다',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: '자연어 질문 (한국어 또는 영어)',
        },
        model: {
          type: 'string',
          description: 'AI 모델 선택 (기본: azure-gpt-4o-mini)',
          enum: ['azure-gpt-4o-mini', 'claude-3-5-sonnet', 'gemini-2.0-flash', 'azure-gpt-35-turbo', 'claude-3-haiku', 'gemini-2.5-pro'],
          default: 'azure-gpt-4o-mini',
        },
        execute: {
          type: 'boolean',
          description: '쿼리 실행 여부 (false면 파싱만)',
          default: true,
        },
        format: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['markdown', 'json', 'summary'],
          },
          description: '결과 형식',
          default: ['markdown', 'json'],
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'test_parse',
    description: '자연어 질문 파싱만 테스트 (쿼리 실행 안 함)',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: '자연어 질문',
        },
        model: {
          type: 'string',
          description: 'AI 모델 선택 (기본: azure-gpt-4o-mini)',
          enum: ['azure-gpt-4o-mini', 'claude-3-5-sonnet', 'gemini-2.0-flash', 'azure-gpt-35-turbo', 'claude-3-haiku', 'gemini-2.5-pro'],
          default: 'azure-gpt-4o-mini',
        },
      },
      required: ['query'],
    },
  },
];

/**
 * nl_query 도구 실행
 */
async function executeNLQueryTool(args) {
  const {
    query,
    model = 'azure-gpt-4o-mini',  // 기본값: Azure (안정성 & 비용효율)
    execute = true,
    format = ['markdown', 'json'],
  } = args;

  try {
    // 1. 파싱
    console.error(`[NL-Query MCP] ========================================`);
    console.error(`[NL-Query MCP] Tool: nl_query`);
    console.error(`[NL-Query MCP] Query: ${query}`);
    console.error(`[NL-Query MCP] Model: ${model}`);
    console.error(`[NL-Query MCP] Execute: ${execute}`);
    console.error(`[NL-Query MCP] ========================================`);
    console.error(`[NL-Query MCP] Parsing query...`);

    const params = await parseNLQuery(query, { model });

    console.error(`[NL-Query MCP] Parsed params:`, JSON.stringify(params, null, 2));

    // 2. 쿼리 실행 (execute=true인 경우)
    if (!execute) {
      return {
        success: true,
        message: 'Parsing only (execute=false)',
        params,
      };
    }

    console.error(`[NL-Query MCP] Executing query on index: ${params.indexPattern}`);
    const result = await executeNLQuery(params);

    if (!result.success) {
      return {
        success: false,
        error: result.error,
        params,
      };
    }

    console.error(`[NL-Query MCP] Query executed successfully. Total: ${result.total}, Took: ${result.took}ms`);

    // 3. Investigation 타입일 경우 특별 처리
    if (params.queryType === 'investigation' && result.data && params.incident_id) {
      return await handleInvestigation(query, params, result, format);
    }

    // 4. 일반 쿼리 결과 포맷팅
    const formattedResult = {
      success: true,
      query,
      params,
      result: {
        total: result.total,
        took: result.took,
        hits: result.hits,
        aggregations: result.aggregations,
      },
    };

    // 5. 형식별 출력
    if (format.includes('markdown')) {
      formattedResult.markdown = formatResultAsMarkdown(result, params);
    }

    if (format.includes('summary')) {
      formattedResult.summary = formatResultAsSummary(result, params, query);
    }

    return formattedResult;
  } catch (error) {
    console.error('[NL-Query MCP] Error:', error);

    // Safe error message extraction
    let errorMessage = 'Unknown error occurred';

    if (error && typeof error === 'object') {
      if (error.message) {
        errorMessage = error.message;
      } else if (error.toString && typeof error.toString === 'function') {
        errorMessage = error.toString();
      }

      // Log full error for debugging
      console.error('[NL-Query MCP] Full error:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
    } else if (typeof error === 'string') {
      errorMessage = error;
    }

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * test_parse 도구 실행
 */
async function executeTestParse(args) {
  const { query, model = 'azure-gpt-4o-mini' } = args;  // 기본값: Azure

  try {
    console.error(`[NL-Query MCP] ========================================`);
    console.error(`[NL-Query MCP] Tool: test_parse`);
    console.error(`[NL-Query MCP] Query: ${query}`);
    console.error(`[NL-Query MCP] Model: ${model}`);
    console.error(`[NL-Query MCP] ========================================`);
    console.error(`[NL-Query MCP] Parsing (debug mode)...`);

    const params = await parseNLQuery(query, { model, debug: true });

    return {
      success: true,
      query,
      params,
      message: 'Parsing successful (test mode)',
    };
  } catch (error) {
    console.error('[NL-Query MCP] Parse error:', error);

    // Safe error message extraction
    let errorMessage = 'Parse error occurred';

    if (error && typeof error === 'object') {
      if (error.message) {
        errorMessage = error.message;
      } else if (error.toString && typeof error.toString === 'function') {
        errorMessage = error.toString();
      }

      // Log full error for debugging
      console.error('[NL-Query MCP] Full parse error:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
    } else if (typeof error === 'string') {
      errorMessage = error;
    }

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Investigation 특별 처리 (JSON 저장 + AI 분석)
 */
async function handleInvestigation(query, params, result, format) {
  try {
    console.error(`[Investigation Handler] 🔍 Processing incident ${params.incident_id}`);

    const investigationData = {
      incident_id: params.incident_id,
      timestamp: new Date().toISOString(),
      ...result.data,
    };

    // 1. TI 상관분석 실행
    console.error(`[Investigation Handler] 🔍 Running TI correlation...`);
    const tiCorrelation = {
      file_hashes: [],
      ip_addresses: [],
      mitre_techniques: [],
      cve_details: [],
    };

    // 1-1. 파일 해시 TI 매칭
    const fileHashes = investigationData.files
      .map(f => f.file_sha256 || f.sha256)
      .filter(Boolean);
    if (fileHashes.length > 0) {
      console.error(`[Investigation Handler] 🔍 Checking ${fileHashes.length} file hashes in TI DB...`);
      tiCorrelation.file_hashes = await checkHashesInTI(fileHashes);
      const threatCount = tiCorrelation.file_hashes.filter(h => h.verdict === 'threat').length;
      const matchedCount = tiCorrelation.file_hashes.filter(h => h.matched).length;
      console.error(`[Investigation Handler] ✅ File hashes: ${matchedCount} matched, ${threatCount} threats`);
    }

    // 1-2. IP 주소 TI 매칭
    const ipAddresses = investigationData.networks
      .map(n => n.external_ip || n.dst_ip)
      .filter(Boolean);
    if (ipAddresses.length > 0) {
      console.error(`[Investigation Handler] 🔍 Checking ${ipAddresses.length} IPs in TI DB...`);
      tiCorrelation.ip_addresses = await checkIPsInTI(ipAddresses);
      const threatCount = tiCorrelation.ip_addresses.filter(ip => ip.verdict === 'threat').length;
      const matchedCount = tiCorrelation.ip_addresses.filter(ip => ip.matched).length;
      console.error(`[Investigation Handler] ✅ IPs: ${matchedCount} matched, ${threatCount} threats`);
    }

    // 1-3. MITRE ATT&CK 기법 조회 (인시던트 데이터에서 technique IDs 추출)
    const mitreStrings = investigationData.incident?.mitre_techniques_ids_and_names || [];
    const techniqueIds = mitreStrings
      .map(str => {
        // "T1112 - Modify Registry" → "T1112"
        // "T1588.001 - Obtain Capabilities: Malware" → "T1588.001"
        const match = str.match(/^(T\d{4}(?:\.\d{3})?)/);
        return match ? match[1] : null;
      })
      .filter(Boolean);

    // 인시던트 원본 MITRE 정보는 항상 포함
    tiCorrelation.mitre_techniques_raw = mitreStrings;

    // PostgreSQL에서 상세 정보 조회
    if (techniqueIds.length > 0) {
      console.error(`[Investigation Handler] 🔍 Fetching MITRE technique details: ${techniqueIds.join(', ')}`);
      tiCorrelation.mitre_techniques = await getMITREByTechniqueIds(techniqueIds);
      console.error(`[Investigation Handler] ✅ MITRE technique details: ${tiCorrelation.mitre_techniques.length}/${techniqueIds.length} found in TI DB`);
    } else {
      tiCorrelation.mitre_techniques = [];
    }

    // 1-4. CVE 상세 정보 조회
    const cveIds = investigationData.cves.map(c => c.cve_id).filter(Boolean);
    if (cveIds.length > 0) {
      console.error(`[Investigation Handler] 🔍 Fetching ${cveIds.length} CVE details...`);
      tiCorrelation.cve_details = await getCVEDetails(cveIds);
      console.error(`[Investigation Handler] ✅ CVE details: ${tiCorrelation.cve_details.length} found`);
    }

    // TI 상관분석 결과를 investigationData에 추가
    investigationData.ti_correlation = tiCorrelation;
    investigationData.summary.ti_matched_files = tiCorrelation.file_hashes.filter(h => h.matched).length;
    investigationData.summary.ti_matched_ips = tiCorrelation.ip_addresses.filter(ip => ip.matched).length;
    investigationData.summary.ti_threat_files = tiCorrelation.file_hashes.filter(h => h.verdict === 'threat').length;
    investigationData.summary.ti_threat_ips = tiCorrelation.ip_addresses.filter(ip => ip.verdict === 'threat').length;

    // 2. JSON 파일로 저장 (TI 정보 포함)
    console.error(`[Investigation Handler] 💾 Saving investigation data with TI correlation...`);
    const filepath = await saveInvestigation(params.incident_id, investigationData);
    const relativePath = getRelativePath(filepath);
    console.error(`[Investigation Handler] ✅ Saved to: ${relativePath}`);

    // 3. AI 병렬 분석 실행 (7개 카테고리 + 종합)
    console.error(`[Investigation Handler] 🤖 Running parallel AI analysis...`);
    const parallelResult = await runParallelAnalysis(investigationData);

    // 4. 결과 포맷팅
    const formattedResult = {
      success: true,
      query,
      params,
      incident_id: params.incident_id,
      data_file: relativePath,
      result: {
        total: result.total,
        took: result.took,
        aggregations: result.aggregations || result.data?.summary,
      },
      parallel_ai_analysis: parallelResult.success ? parallelResult : null,
      ai_error: parallelResult.success ? null : 'Parallel analysis failed',
    };

    // 5. 마크다운 생성 (Investigation 데이터 + 병렬 AI 분석)
    if (format.includes('markdown')) {
      // 기본 Investigation 마크다운
      let markdown = formatInvestigationWithAI(
        investigationData,
        null,  // 단일 AI 분석은 더 이상 사용 안 함
        relativePath
      );

      // 병렬 AI 분석 결과 추가
      if (parallelResult.success) {
        markdown += `\n---\n\n`;
        markdown += formatParallelAnalysisAsMarkdown(parallelResult);
      }

      formattedResult.markdown = markdown;
    }

    // 6. 요약 생성
    if (format.includes('summary')) {
      const { summary } = investigationData;
      const verdict = parallelResult.synthesis?.final_verdict || 'unknown';
      const riskScore = parallelResult.synthesis?.overall_risk_score || 0;

      formattedResult.summary = `인시던트 ${params.incident_id} 종합 조사 완료:
- 알림: ${summary.total_alerts}개
- 파일: ${summary.total_files}개
- 네트워크: ${summary.total_networks}개
- 프로세스: ${summary.total_processes}개
- 엔드포인트: ${summary.total_endpoints}개
- CVE 취약점: ${summary.total_cves || 0}개

🛡️ TI 상관분석:
- 파일 매칭: ${summary.ti_matched_files || 0}개 (위협: ${summary.ti_threat_files || 0}개)
- IP 매칭: ${summary.ti_matched_ips || 0}개 (위협: ${summary.ti_threat_ips || 0}개)
- MITRE 기법: ${investigationData.ti_correlation?.mitre_techniques?.length || 0}개

🤖 AI 병렬 분석:
- 최종 판단: ${verdict}
- 위험도: ${riskScore}/100
- 실행 시간: ${parallelResult.total_execution_time_ms}ms
- 토큰 사용: ${parallelResult.total_tokens}

📁 상세 데이터: ${relativePath}`;
    }

    return formattedResult;
  } catch (error) {
    console.error('[Investigation Handler] ❌ Error:', error);
    // Fallback to basic formatting
    return {
      success: true,
      query,
      params,
      result: {
        total: result.total,
        took: result.took,
        aggregations: result.aggregations,
      },
      markdown: format.includes('markdown') ? formatInvestigationAsMarkdown(result.data) : undefined,
      error: `Investigation processing error: ${error.message}`,
    };
  }
}

/**
 * Investigation + AI 분석 마크다운 생성
 */
function formatInvestigationWithAI(investigation, aiAnalysis, dataFilePath) {
  const { incident, summary } = investigation;

  let markdown = '';
  markdown += `# 🔍 인시던트 종합 조사 보고서\n\n`;

  // 1. 인시던트 기본 정보
  markdown += `## 📋 인시던트 기본 정보\n\n`;
  markdown += `- **인시던트 ID**: ${incident.incident_id || 'N/A'}\n`;
  markdown += `- **심각도**: ${incident.severity || 'N/A'}\n`;
  markdown += `- **상태**: ${incident.status || 'N/A'}\n`;
  markdown += `- **생성 시간**: ${incident.creation_time || incident['@timestamp'] || 'N/A'}\n`;
  markdown += `- **설명**: ${incident.description || 'N/A'}\n`;
  markdown += `- **호스트 수**: ${incident.host_count || 0}\n`;
  markdown += `- **알림 수**: ${incident.alert_count || 0}\n`;
  if (incident.assigned_user_mail) {
    markdown += `- **담당자**: ${incident.assigned_user_mail}\n`;
  }
  markdown += `\n`;

  // 2. 분석가 판단
  if (incident.resolve_comment) {
    markdown += `## 👨‍💼 분석가 판단\n\n`;
    markdown += `${incident.resolve_comment}\n\n`;
  }

  // 3. AI 종합 분석
  if (aiAnalysis) {
    markdown += formatAIAnalysisAsMarkdown(aiAnalysis);
  } else {
    markdown += `## 🤖 AI 분석\n\n⚠️  AI 분석을 실행할 수 없습니다.\n\n`;
  }

  // 4. 데이터 요약
  markdown += `## 📊 연관 데이터 요약\n\n`;
  markdown += `| 데이터 유형 | 개수 |\n`;
  markdown += `|------------|------|\n`;
  markdown += `| 📢 알림 (Alerts) | ${summary.total_alerts} |\n`;
  markdown += `| 📁 파일 (Files) | ${summary.total_files} |\n`;
  markdown += `| 🌐 네트워크 (Networks) | ${summary.total_networks} |\n`;
  markdown += `| ⚙️  프로세스 (Processes) | ${summary.total_processes} |\n`;
  markdown += `| 💻 엔드포인트 (Endpoints) | ${summary.total_endpoints} |\n`;
  markdown += `| 🔒 CVE 취약점 (Vulnerabilities) | ${summary.total_cves || 0} |\n`;
  markdown += `\n`;

  // 5. CVE 취약점 상세 (OpenSearch에서 조회된 것)
  if (investigation.cves && investigation.cves.length > 0) {
    markdown += `## 🔒 CVE 취약점 상세\n\n`;

    const exactCves = investigation.cves.filter(c => c.match_type === 'exact');
    const fuzzyCves = investigation.cves.filter(c => c.match_type === 'fuzzy');

    if (exactCves.length > 0) {
      markdown += `### ✅ Exact Match CVE (${exactCves.length}개) - 높은 신뢰도\n\n`;
      const criticalExact = exactCves.filter(c => c.cvss_score >= 9.0);
      const highExact = exactCves.filter(c => c.cvss_score >= 7.0 && c.cvss_score < 9.0);

      if (criticalExact.length > 0) {
        markdown += `**🔴 Critical (CVSS ≥ 9.0)**: ${criticalExact.length}개\n\n`;
        criticalExact.slice(0, 5).forEach((c, idx) => {
          markdown += `${idx + 1}. **${c.cve_id}** - ${c.hostname}\n`;
          markdown += `   - CVSS: ${c.cvss_score || 'N/A'}\n`;
          markdown += `   - ${c.description || 'No description'}\n\n`;
        });
      }

      if (highExact.length > 0) {
        markdown += `**🟠 High (CVSS 7.0-8.9)**: ${highExact.length}개\n\n`;
      }
    }

    if (fuzzyCves.length > 0) {
      markdown += `### ⚠️ Fuzzy Match CVE (${fuzzyCves.length}개) - 낮은 신뢰도\n\n`;
      markdown += `⚠️  이 CVE들은 호스트 이름 유사 매칭으로 찾았습니다. **AI 분석에서 실제 취약점 여부를 검증하세요.**\n\n`;

      const criticalFuzzy = fuzzyCves.filter(c => c.cvss_score >= 9.0);
      if (criticalFuzzy.length > 0) {
        markdown += `**🔴 Critical (CVSS ≥ 9.0)**: ${criticalFuzzy.length}개 (검증 필요)\n\n`;
        criticalFuzzy.slice(0, 3).forEach((c, idx) => {
          markdown += `${idx + 1}. **${c.cve_id}** - ${c.hostname} (유사 매칭)\n`;
          markdown += `   - CVSS: ${c.cvss_score || 'N/A'}\n`;
          markdown += `   - 신뢰도: ${c.confidence * 100}%\n\n`;
        });
      }
    }

    markdown += `\n`;
  }

  // 6. TI 상관분석 결과
  if (investigation.ti_correlation) {
    const ti = investigation.ti_correlation;
    markdown += `## 🛡️ TI 상관분석 결과\n\n`;

    // 파일 해시 TI 매칭
    if (ti.file_hashes && ti.file_hashes.length > 0) {
      const matched = ti.file_hashes.filter(h => h.matched);
      const threats = ti.file_hashes.filter(h => h.verdict === 'threat');
      const unknowns = ti.file_hashes.filter(h => h.verdict === 'unknown' && h.matched);
      const benigns = ti.file_hashes.filter(h => h.verdict === 'benign');

      markdown += `### 📁 파일 해시 TI 매칭 (${ti.file_hashes.length}개 검사)\n\n`;
      markdown += `| 분류 | 개수 |\n`;
      markdown += `|------|------|\n`;
      markdown += `| 🔴 위협 (Threat) | ${threats.length} |\n`;
      markdown += `| ⚠️ 미확인 (Unknown) | ${unknowns.length} |\n`;
      markdown += `| ✅ 안전 (Benign) | ${benigns.length} |\n`;
      markdown += `| ❓ 매칭 없음 | ${ti.file_hashes.length - matched.length} |\n\n`;

      // 위협 파일 상세
      if (threats.length > 0) {
        markdown += `**🔴 위협 파일 상세**:\n\n`;
        threats.forEach((h, idx) => {
          markdown += `${idx + 1}. \`${h.hash.substring(0, 16)}...\`\n`;
          markdown += `   - 위협 레벨: ${h.threat_level}/100\n`;
          markdown += `   - 심각도: ${h.severity}\n`;
          markdown += `   - 출처: ${h.source}\n`;
          if (h.misp_matches > 0) markdown += `   - MISP 매칭: ${h.misp_matches}개\n`;
          if (h.opencti_matches > 0) markdown += `   - OpenCTI 매칭: ${h.opencti_matches}개\n`;
        });
        markdown += `\n`;
      }

      // 미확인 파일 상세
      if (unknowns.length > 0) {
        markdown += `**⚠️ 미확인 파일 상세** (TI DB에 매칭되었으나 위협 레벨 낮음):\n\n`;
        unknowns.slice(0, 10).forEach((h, idx) => {
          markdown += `${idx + 1}. \`${h.hash.substring(0, 16)}...\`\n`;
          markdown += `   - 위협 레벨: ${h.threat_level}/100\n`;
          markdown += `   - 심각도: ${h.severity}\n`;
          markdown += `   - 출처: ${h.source}\n`;
        });
        if (unknowns.length > 10) {
          markdown += `\n... 외 ${unknowns.length - 10}개 (전체 데이터는 JSON 파일 참조)\n`;
        }
        markdown += `\n`;
      }

      // 안전 파일 요약 (상세는 선택적)
      if (benigns.length > 0) {
        markdown += `**✅ 안전 파일**: ${benigns.length}개 (TI DB에서 Benign으로 분류됨)\n\n`;
        // 상세는 너무 많으면 생략, 필요 시 JSON 참조
      }
    }

    // IP 주소 TI 매칭
    if (ti.ip_addresses && ti.ip_addresses.length > 0) {
      const matched = ti.ip_addresses.filter(ip => ip.matched);
      const threats = ti.ip_addresses.filter(ip => ip.verdict === 'threat');
      const unknowns = ti.ip_addresses.filter(ip => ip.verdict === 'unknown' && ip.matched);

      markdown += `### 🌐 IP 주소 TI 매칭 (${ti.ip_addresses.length}개 검사)\n\n`;
      markdown += `| 분류 | 개수 |\n`;
      markdown += `|------|------|\n`;
      markdown += `| 🔴 위협 (Threat) | ${threats.length} |\n`;
      markdown += `| ⚠️ 미확인 (Unknown) | ${unknowns.length} |\n`;
      markdown += `| ❓ 매칭 없음 | ${ti.ip_addresses.length - matched.length} |\n\n`;

      // 위협 IP 상세
      if (threats.length > 0) {
        markdown += `**🔴 위협 IP 상세**:\n\n`;
        threats.forEach((ip, idx) => {
          markdown += `${idx + 1}. \`${ip.hash}\`\n`;
          markdown += `   - 위협 레벨: ${ip.threat_level}/100\n`;
          markdown += `   - 심각도: ${ip.severity}\n`;
          markdown += `   - 출처: ${ip.source}\n`;
        });
        markdown += `\n`;
      }

      // 미확인 IP 상세
      if (unknowns.length > 0) {
        markdown += `**⚠️ 미확인 IP 상세** (TI DB에 매칭되었으나 위협 레벨 낮음):\n\n`;
        unknowns.slice(0, 10).forEach((ip, idx) => {
          markdown += `${idx + 1}. \`${ip.hash}\`\n`;
          markdown += `   - 위협 레벨: ${ip.threat_level}/100\n`;
          markdown += `   - 심각도: ${ip.severity}\n`;
          markdown += `   - 출처: ${ip.source}\n`;
        });
        if (unknowns.length > 10) {
          markdown += `\n... 외 ${unknowns.length - 10}개 (전체 데이터는 JSON 파일 참조)\n`;
        }
        markdown += `\n`;
      }
    }

    // MITRE ATT&CK 기법
    const mitreRaw = ti.mitre_techniques_raw || [];
    const mitreDetails = ti.mitre_techniques || [];

    if (mitreRaw.length > 0 || mitreDetails.length > 0) {
      markdown += `### 🎯 MITRE ATT&CK 기법\n\n`;

      // 인시던트 원본 MITRE 정보 표시
      if (mitreRaw.length > 0) {
        markdown += `**인시던트에서 탐지된 기법 (${mitreRaw.length}개)**:\n`;
        mitreRaw.forEach((tech, idx) => {
          markdown += `${idx + 1}. ${tech}\n`;
        });
        markdown += `\n`;
      }

      // PostgreSQL 상세 정보 표시
      if (mitreDetails.length > 0) {
        markdown += `**TI DB 상세 정보 (${mitreDetails.length}개 조회됨)**:\n\n`;
        mitreDetails.forEach((m, idx) => {
          markdown += `${idx + 1}. **${m.technique_id}**: ${m.technique_name}\n`;
          markdown += `   - Tactic: ${m.tactic}\n`;
          markdown += `   - 설명: ${m.description.substring(0, 200)}...\n`;
          markdown += `   - 과거 인시던트: ${m.incident_count}회\n`;
          markdown += `   - [MITRE 상세](${m.mitre_url})\n\n`;
        });
      } else if (mitreRaw.length > 0) {
        markdown += `⚠️  TI DB에서 상세 정보를 찾지 못했습니다.\n\n`;
      }
    }

    // CVE 상세 정보
    if (ti.cve_details && ti.cve_details.length > 0) {
      markdown += `### 🔒 CVE 상세 정보 (${ti.cve_details.length}개)\n\n`;
      const criticalCVEs = ti.cve_details.filter(c => c.cvss_score >= 9.0);
      const highCVEs = ti.cve_details.filter(c => c.cvss_score >= 7.0 && c.cvss_score < 9.0);

      markdown += `| 심각도 | 개수 |\n`;
      markdown += `|--------|------|\n`;
      markdown += `| 🔴 Critical (9.0-10.0) | ${criticalCVEs.length} |\n`;
      markdown += `| 🟠 High (7.0-8.9) | ${highCVEs.length} |\n`;
      markdown += `| 🟡 Medium/Low (<7.0) | ${ti.cve_details.length - criticalCVEs.length - highCVEs.length} |\n\n`;

      if (criticalCVEs.length > 0) {
        markdown += `**🔴 Critical CVE 상세**:\n\n`;
        criticalCVEs.slice(0, 10).forEach((c, idx) => {
          markdown += `${idx + 1}. **${c.cve_id}** (CVSS: ${c.cvss_score})\n`;
          markdown += `   - ${c.description}\n`;
          markdown += `   - 심각도: ${c.severity}\n\n`;
        });
      }
    }
  }

  // 7. 상세 데이터 참조
  markdown += `---\n\n`;
  markdown += `**📁 상세 데이터 파일**: \`${dataFilePath}\`\n\n`;
  markdown += `전체 인시던트 데이터(알림, 파일, 네트워크, CVE, TI 상관분석 등)는 위 JSON 파일에 저장되어 있습니다.\n\n`;

  return markdown;
}

/**
 * Investigation 결과를 마크다운으로 포맷팅 (기본 버전 - AI 없이)
 */
function formatInvestigationAsMarkdown(investigation) {
  let markdown = '';

  const { incident, alerts, files, networks, processes, endpoints, cves, summary } = investigation;

  // 디버깅: 데이터 구조 확인
  console.error(`[Format Investigation] Data received:`);
  console.error(`  - incident: ${incident ? 'YES' : 'NO'}`);
  console.error(`  - alerts: ${alerts ? alerts.length : 0} items`);
  console.error(`  - files: ${files ? files.length : 0} items`);
  console.error(`  - networks: ${networks ? networks.length : 0} items`);
  console.error(`  - processes: ${processes ? processes.length : 0} items`);
  console.error(`  - endpoints: ${endpoints ? endpoints.length : 0} items`);
  console.error(`  - cves: ${cves ? cves.length : 0} items`);

  markdown += `# 🔍 인시던트 종합 조사 보고서\n\n`;

  // 1. 인시던트 기본 정보
  markdown += `## 📋 인시던트 기본 정보\n\n`;
  markdown += `- **인시던트 ID**: ${incident.incident_id || 'N/A'}\n`;
  markdown += `- **심각도**: ${incident.severity || 'N/A'}\n`;
  markdown += `- **상태**: ${incident.status || 'N/A'}\n`;
  markdown += `- **생성 시간**: ${incident.creation_time || incident['@timestamp'] || 'N/A'}\n`;
  markdown += `- **설명**: ${incident.description || 'N/A'}\n`;
  markdown += `- **호스트 수**: ${incident.host_count || 0}\n`;
  markdown += `- **알림 수**: ${incident.alert_count || 0}\n`;
  if (incident.assigned_user_mail) {
    markdown += `- **담당자**: ${incident.assigned_user_mail}\n`;
  }
  if (incident.manual_severity) {
    markdown += `- **수동 심각도**: ${incident.manual_severity}\n`;
  }
  if (incident.notes) {
    markdown += `- **노트**: ${incident.notes}\n`;
  }
  if (incident.resolve_comment) {
    markdown += `\n**🔍 해결 코멘트**:\n\n${incident.resolve_comment}\n`;
  }
  markdown += `\n`;

  // 2. 연관 데이터 요약
  markdown += `## 📊 연관 데이터 요약\n\n`;
  markdown += `| 데이터 유형 | 개수 |\n`;
  markdown += `|------------|------|\n`;
  markdown += `| 📢 알림 (Alerts) | ${summary.total_alerts} |\n`;
  markdown += `| 📁 파일 (Files) | ${summary.total_files} |\n`;
  markdown += `| 🌐 네트워크 (Networks) | ${summary.total_networks} |\n`;
  markdown += `| ⚙️  프로세스 (Processes) | ${summary.total_processes} |\n`;
  markdown += `| 💻 엔드포인트 (Endpoints) | ${summary.total_endpoints} |\n`;
  markdown += `| 🔒 CVE 취약점 (Vulnerabilities) | ${summary.total_cves || 0} |\n`;
  markdown += `\n`;

  // 3. 알림 상세
  if (alerts && alerts.length > 0) {
    markdown += `## 📢 알림 상세 (Alerts)\n\n`;
    markdown += `총 ${alerts.length}개의 알림이 발견되었습니다.\n\n`;

    alerts.slice(0, 5).forEach((alert, idx) => {
      markdown += `### 알림 #${idx + 1}\n\n`;
      markdown += `- **Alert ID**: ${alert.alert_id || 'N/A'}\n`;
      markdown += `- **이름**: ${alert.name || 'N/A'}\n`;
      markdown += `- **심각도**: ${alert.severity || 'N/A'}\n`;
      markdown += `- **카테고리**: ${alert.category || 'N/A'}\n`;
      markdown += `- **행동**: ${alert.action || 'N/A'}\n`;
      if (alert.host_name) {
        markdown += `- **호스트**: ${alert.host_name}\n`;
      }
      if (alert.user_name) {
        markdown += `- **사용자**: ${alert.user_name}\n`;
      }
      if (alert.mitre_technique_id) {
        markdown += `- **MITRE**: ${alert.mitre_technique_id}`;
        if (alert.mitre_tactic) {
          markdown += ` (${alert.mitre_tactic})`;
        }
        markdown += `\n`;
      }
      markdown += `\n`;
    });

    if (alerts.length > 5) {
      markdown += `... 그 외 ${alerts.length - 5}개의 알림\n\n`;
    }
  }

  // 4. 파일 아티팩트
  if (files && files.length > 0) {
    markdown += `## 📁 파일 아티팩트 (File Artifacts)\n\n`;
    markdown += `총 ${files.length}개의 파일이 발견되었습니다.\n\n`;

    // 파일을 위협도별로 분류
    const malwareFiles = files.filter(f =>
      f.wildfire_verdict === 'MALWARE' ||
      f.is_malicious === true ||
      (f.file_wildfire_verdict && f.file_wildfire_verdict.toLowerCase().includes('malware'))
    );
    const graywareFiles = files.filter(f =>
      f.wildfire_verdict === 'GRAYWARE' ||
      (f.file_wildfire_verdict && f.file_wildfire_verdict.toLowerCase().includes('grayware'))
    );
    const benignFiles = files.filter(f =>
      f.wildfire_verdict === 'BENIGN' ||
      f.is_malicious === false ||
      (f.file_wildfire_verdict && f.file_wildfire_verdict.toLowerCase().includes('benign'))
    );
    const unknownFiles = files.filter(f =>
      !f.wildfire_verdict &&
      !f.file_wildfire_verdict &&
      f.is_malicious === undefined
    );

    // 위협 파일 먼저 표시 (제한 없이 모두)
    if (malwareFiles.length > 0) {
      markdown += `### 🦠 악성 파일 (Malware) - ${malwareFiles.length}개\n\n`;
      malwareFiles.forEach((file, idx) => {
        markdown += `#### ${idx + 1}. ${file.file_name || 'Unknown'}\n\n`;
        markdown += `- **경로**: \`${file.file_path || 'N/A'}\`\n`;
        if (file.file_sha256) {
          markdown += `- **SHA256**: \`${file.file_sha256}\`\n`;
        }
        if (file.file_md5) {
          markdown += `- **MD5**: \`${file.file_md5}\`\n`;
        }
        if (file.file_size) {
          markdown += `- **크기**: ${(file.file_size / 1024 / 1024).toFixed(2)} MB\n`;
        }
        if (file.file_type) {
          markdown += `- **유형**: ${file.file_type}\n`;
        }
        markdown += `- **판정**: 🔴 MALWARE\n`;
        if (file.signer) {
          markdown += `- **서명자**: ${file.signer}\n`;
        }
        markdown += `\n`;
      });
    }

    if (graywareFiles.length > 0) {
      markdown += `### ⚠️ 그레이웨어 (Grayware) - ${graywareFiles.length}개\n\n`;
      graywareFiles.slice(0, 10).forEach((file, idx) => {
        markdown += `#### ${idx + 1}. ${file.file_name || 'Unknown'}\n\n`;
        markdown += `- **경로**: \`${file.file_path || 'N/A'}\`\n`;
        if (file.file_sha256) {
          markdown += `- **SHA256**: \`${file.file_sha256}\`\n`;
        }
        markdown += `- **판정**: ⚠️ GRAYWARE\n\n`;
      });
      if (graywareFiles.length > 10) {
        markdown += `... 그 외 ${graywareFiles.length - 10}개\n\n`;
      }
    }

    if (unknownFiles.length > 0) {
      markdown += `### ❓ 미확인 파일 (Unknown) - ${unknownFiles.length}개\n\n`;
      unknownFiles.slice(0, 5).forEach((file, idx) => {
        markdown += `- **파일명**: ${file.file_name || 'Unknown'}\n`;
        if (file.file_sha256) {
          markdown += `  - **SHA256**: \`${file.file_sha256}\`\n`;
        }
        if (file.file_path) {
          markdown += `  - **경로**: \`${file.file_path}\`\n`;
        }
      });
      if (unknownFiles.length > 5) {
        markdown += `\n... 그 외 ${unknownFiles.length - 5}개\n`;
      }
      markdown += `\n`;
    }

    if (benignFiles.length > 0) {
      markdown += `### ✅ 정상 파일 (Benign) - ${benignFiles.length}개\n\n`;
      benignFiles.slice(0, 3).forEach((file, idx) => {
        markdown += `- ${file.file_name || 'Unknown'}\n`;
      });
      if (benignFiles.length > 3) {
        markdown += `\n... 그 외 ${benignFiles.length - 3}개\n`;
      }
      markdown += `\n`;
    }
  }

  // 5. 네트워크 아티팩트
  if (networks && networks.length > 0) {
    markdown += `## 🌐 네트워크 아티팩트 (Network Artifacts)\n\n`;
    markdown += `총 ${networks.length}개의 네트워크 연결이 발견되었습니다.\n\n`;

    // 내부/외부 분류 (RFC1918 사설 IP 기준)
    const isPrivateIP = (ip) => {
      if (!ip) return false;
      const parts = ip.split('.');
      if (parts.length !== 4) return false;
      const first = parseInt(parts[0]);
      const second = parseInt(parts[1]);
      return (
        first === 10 ||
        (first === 172 && second >= 16 && second <= 31) ||
        (first === 192 && second === 168)
      );
    };

    const externalNetworks = networks.filter(n => !isPrivateIP(n.external_ip));
    const internalNetworks = networks.filter(n => isPrivateIP(n.external_ip));

    // 외부 연결 (중요!)
    if (externalNetworks.length > 0) {
      markdown += `### 🌍 외부 연결 (External) - ${externalNetworks.length}개\n\n`;

      // 국가별 분류
      const byCountry = {};
      externalNetworks.forEach(net => {
        const country = net.country || 'Unknown';
        if (!byCountry[country]) {
          byCountry[country] = [];
        }
        byCountry[country].push(net);
      });

      markdown += `**국가별 분포**:\n\n`;
      Object.entries(byCountry)
        .sort((a, b) => b[1].length - a[1].length)
        .forEach(([country, nets]) => {
          markdown += `- **${country}**: ${nets.length}개 연결\n`;
        });
      markdown += `\n`;

      // 상위 외부 IP 리스트 (중복 제거)
      const uniqueIPs = {};
      externalNetworks.forEach(net => {
        const ip = net.external_ip;
        if (ip && !uniqueIPs[ip]) {
          uniqueIPs[ip] = {
            ip,
            port: net.external_port,
            domain: net.domain,
            country: net.country,
            protocol: net.protocol,
            action: net.action,
            count: 1
          };
        } else if (ip) {
          uniqueIPs[ip].count++;
        }
      });

      const sortedIPs = Object.values(uniqueIPs).sort((a, b) => b.count - a.count);

      markdown += `**외부 IP 리스트** (상위 ${Math.min(20, sortedIPs.length)}개):\n\n`;
      markdown += `| IP 주소 | 포트 | 국가 | 프로토콜 | 도메인 | 횟수 | 행동 |\n`;
      markdown += `|---------|------|------|---------|--------|------|------|\n`;

      sortedIPs.slice(0, 20).forEach(item => {
        markdown += `| \`${item.ip}\` | ${item.port || '-'} | ${item.country || '-'} | ${item.protocol || '-'} | ${item.domain || '-'} | ${item.count} | ${item.action || '-'} |\n`;
      });

      if (sortedIPs.length > 20) {
        markdown += `\n... 그 외 ${sortedIPs.length - 20}개의 고유 IP\n`;
      }
      markdown += `\n`;
    }

    // 내부 연결
    if (internalNetworks.length > 0) {
      markdown += `### 🏢 내부 연결 (Internal) - ${internalNetworks.length}개\n\n`;
      markdown += `내부 네트워크 간 통신이 ${internalNetworks.length}건 발견되었습니다.\n\n`;

      // 상위 5개만 표시
      if (internalNetworks.length <= 5) {
        internalNetworks.forEach(net => {
          markdown += `- \`${net.local_ip}:${net.local_port}\` → \`${net.external_ip}:${net.external_port}\` (${net.protocol || 'Unknown'})\n`;
        });
      } else {
        markdown += `(내부 통신은 보안상 중요도가 낮아 요약만 표시)\n`;
      }
      markdown += `\n`;
    }
  }

  // 6. 엔드포인트 정보
  if (endpoints && endpoints.length > 0) {
    markdown += `## 💻 엔드포인트 정보 (Endpoints)\n\n`;
    markdown += `총 ${endpoints.length}개의 엔드포인트가 발견되었습니다.\n\n`;

    endpoints.forEach((endpoint, idx) => {
      markdown += `### 엔드포인트 #${idx + 1}\n\n`;
      markdown += `- **이름**: ${endpoint.endpoint_name || 'N/A'}\n`;
      markdown += `- **ID**: ${endpoint.endpoint_id || 'N/A'}\n`;
      markdown += `- **유형**: ${endpoint.endpoint_type || 'N/A'}\n`;
      markdown += `- **OS**: ${endpoint.os_type || 'N/A'}\n`;
      if (endpoint.ip && Array.isArray(endpoint.ip)) {
        markdown += `- **IP**: ${endpoint.ip.join(', ')}\n`;
      }
      if (endpoint.domain) {
        markdown += `- **도메인**: ${endpoint.domain}\n`;
      }
      if (endpoint.agent_version) {
        markdown += `- **Agent 버전**: ${endpoint.agent_version}\n`;
      }
      if (endpoint.agent_status) {
        markdown += `- **Agent 상태**: ${endpoint.agent_status}\n`;
      }
      if (endpoint.last_seen) {
        markdown += `- **마지막 확인**: ${endpoint.last_seen}\n`;
      }
      markdown += `\n`;
    });
  }

  // 7. CVE 취약점 정보
  if (cves && cves.length > 0) {
    markdown += `## 🔒 CVE 취약점 정보 (Vulnerabilities)\n\n`;
    markdown += `총 ${cves.length}개의 CVE 취약점이 발견되었습니다.\n\n`;

    // CVSS 점수별로 그룹핑
    const criticalCVEs = cves.filter(c => (c.cvss_score || 0) >= 9.0);
    const highCVEs = cves.filter(c => (c.cvss_score || 0) >= 7.0 && (c.cvss_score || 0) < 9.0);
    const mediumCVEs = cves.filter(c => (c.cvss_score || 0) >= 4.0 && (c.cvss_score || 0) < 7.0);
    const lowCVEs = cves.filter(c => (c.cvss_score || 0) < 4.0);

    // 심각도 요약
    markdown += `**심각도 분포**:\n\n`;
    markdown += `| 심각도 | 개수 | CVSS 범위 |\n`;
    markdown += `|--------|------|----------|\n`;
    markdown += `| 🔴 Critical | ${criticalCVEs.length} | 9.0 - 10.0 |\n`;
    markdown += `| 🟠 High | ${highCVEs.length} | 7.0 - 8.9 |\n`;
    markdown += `| 🟡 Medium | ${mediumCVEs.length} | 4.0 - 6.9 |\n`;
    markdown += `| 🟢 Low | ${lowCVEs.length} | 0.0 - 3.9 |\n`;
    markdown += `\n`;

    // Critical CVEs 상세 표시 (모두)
    if (criticalCVEs.length > 0) {
      markdown += `### 🔴 Critical 취약점 (${criticalCVEs.length}개)\n\n`;
      criticalCVEs.forEach((cve, idx) => {
        markdown += `#### ${idx + 1}. ${cve.cve_id || 'Unknown CVE'}\n\n`;
        markdown += `- **CVSS 점수**: ${cve.cvss_score || 'N/A'}\n`;
        if (cve.severity) {
          markdown += `- **심각도**: ${cve.severity}\n`;
        }
        if (cve.hostname) {
          markdown += `- **영향받는 호스트**: ${cve.hostname}\n`;
        }
        if (cve.product) {
          markdown += `- **제품**: ${cve.product}\n`;
        }
        if (cve.version) {
          markdown += `- **버전**: ${cve.version}\n`;
        }
        if (cve.description) {
          markdown += `- **설명**: ${cve.description}\n`;
        }
        if (cve.cve_url) {
          markdown += `- **참고**: ${cve.cve_url}\n`;
        }
        markdown += `\n`;
      });
    }

    // High CVEs 상세 표시 (상위 10개)
    if (highCVEs.length > 0) {
      markdown += `### 🟠 High 취약점 (${highCVEs.length}개)\n\n`;
      highCVEs.slice(0, 10).forEach((cve, idx) => {
        markdown += `#### ${idx + 1}. ${cve.cve_id || 'Unknown CVE'}\n\n`;
        markdown += `- **CVSS 점수**: ${cve.cvss_score || 'N/A'}\n`;
        if (cve.hostname) {
          markdown += `- **영향받는 호스트**: ${cve.hostname}\n`;
        }
        if (cve.product) {
          markdown += `- **제품**: ${cve.product}\n`;
        }
        if (cve.description) {
          const shortDesc = cve.description.length > 200
            ? cve.description.substring(0, 200) + '...'
            : cve.description;
          markdown += `- **설명**: ${shortDesc}\n`;
        }
        markdown += `\n`;
      });
      if (highCVEs.length > 10) {
        markdown += `... 그 외 ${highCVEs.length - 10}개의 High 취약점\n\n`;
      }
    }

    // Medium/Low CVEs는 요약만
    if (mediumCVEs.length > 0) {
      markdown += `### 🟡 Medium 취약점 (${mediumCVEs.length}개)\n\n`;
      markdown += `Medium 심각도 취약점 ${mediumCVEs.length}개가 발견되었습니다.\n\n`;

      // 제품별 요약
      const productCount = {};
      mediumCVEs.forEach(cve => {
        const product = cve.product || 'Unknown';
        productCount[product] = (productCount[product] || 0) + 1;
      });

      markdown += `**영향받는 제품**:\n`;
      Object.entries(productCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .forEach(([product, count]) => {
          markdown += `- ${product}: ${count}개\n`;
        });
      markdown += `\n`;
    }

    if (lowCVEs.length > 0) {
      markdown += `### 🟢 Low 취약점 (${lowCVEs.length}개)\n\n`;
      markdown += `Low 심각도 취약점 ${lowCVEs.length}개가 발견되었습니다.\n\n`;
    }
  }

  return markdown;
}

/**
 * 결과를 마크다운으로 포맷팅
 */
function formatResultAsMarkdown(result, params) {
  // Investigation 타입일 경우 특별 처리
  if (params.queryType === 'investigation' && result.data) {
    return formatInvestigationAsMarkdown(result.data);
  }

  let markdown = '';

  // 1. 쿼리 정보
  markdown += `## 쿼리 결과\n\n`;
  markdown += `- **쿼리 타입**: ${params.queryType}\n`;
  markdown += `- **데이터 유형**: ${params.dataType}\n`;
  markdown += `- **인덱스**: ${params.indexPattern}\n`;
  markdown += `- **총 개수**: ${result.total}\n`;
  markdown += `- **실행 시간**: ${result.took}ms\n\n`;

  // 2. 집계 결과
  if (result.aggregations) {
    markdown += `### 집계 결과\n\n`;
    markdown += '```json\n';
    markdown += JSON.stringify(result.aggregations, null, 2);
    markdown += '\n```\n\n';
  }

  // 3. 샘플 문서
  if (result.hits && result.hits.length > 0) {
    markdown += `### 샘플 문서 (상위 ${Math.min(5, result.hits.length)}개)\n\n`;
    markdown += '```json\n';
    markdown += JSON.stringify(result.hits.slice(0, 5), null, 2);
    markdown += '\n```\n\n';
  }

  return markdown;
}

/**
 * 결과를 요약으로 포맷팅
 */
function formatResultAsSummary(result, params, query) {
  if (params.queryType === 'investigation' && result.data) {
    const { summary } = result.data;
    return `인시던트 ${params.incident_id} 종합 조사 완료:\n- 알림: ${summary.total_alerts}개\n- 파일: ${summary.total_files}개\n- 네트워크: ${summary.total_networks}개\n- 프로세스: ${summary.total_processes}개\n- 엔드포인트: ${summary.total_endpoints}개\n- CVE 취약점: ${summary.total_cves || 0}개`;
  } else if (params.queryType === 'statistics' || params.queryType === 'chart') {
    return `질문: "${query}"\n\n답변: 총 ${result.total}개의 ${params.dataType} 데이터가 발견되었습니다.`;
  } else if (params.queryType === 'detail') {
    return `질문: "${query}"\n\n답변: ${result.total}개의 ${params.dataType} 데이터를 조회했습니다. 상위 ${Math.min(result.hits?.length || 0, 10)}개를 표시합니다.`;
  } else if (params.queryType === 'report') {
    return `질문: "${query}"\n\n답변: ${params.dataType} 보고서를 생성했습니다. 총 ${result.total}개의 데이터를 분석했습니다.`;
  } else {
    return `질문: "${query}"\n\n답변: 쿼리가 성공적으로 실행되었습니다.`;
  }
}

// MCP 프로토콜 핸들러
rl.on('line', async (line) => {
  let request = null;
  try {
    request = JSON.parse(line);

    if (request.method === 'initialize') {
      const safeId = request.id !== null && request.id !== undefined ? request.id : 0;
      const response = {
        jsonrpc: '2.0',
        result: {
          protocolVersion: '2024-11-05',
          capabilities: {
            tools: {},
          },
          serverInfo: {
            name: 'nl-query-mcp',
            version: '1.0.0',
          },
        },
        id: safeId,
      };
      console.log(JSON.stringify(response));
    } else if (request.method === 'tools/list') {
      const response = {
        jsonrpc: '2.0',
        result: {
          tools: TOOLS,
        },
        id: request.id !== null && request.id !== undefined ? request.id : 0,
      };
      console.log(JSON.stringify(response));
    } else if (request.method === 'prompts/list') {
      const response = {
        jsonrpc: '2.0',
        result: {
          prompts: [],
        },
        id: request.id !== null && request.id !== undefined ? request.id : 0,
      };
      console.log(JSON.stringify(response));
    } else if (request.method === 'resources/list') {
      const response = {
        jsonrpc: '2.0',
        result: {
          resources: [],
        },
        id: request.id !== null && request.id !== undefined ? request.id : 0,
      };
      console.log(JSON.stringify(response));
    } else if (request.method === 'tools/call') {
      const { name, arguments: args } = request.params;

      console.error(`[NL-Query MCP] Tool call: ${name}`);

      let result;
      if (name === 'nl_query') {
        result = await executeNLQueryTool(args);
      } else if (name === 'test_parse') {
        result = await executeTestParse(args);
      } else {
        throw new Error(`Unknown tool: ${name}`);
      }

      const safeRequestId = request.id !== null && request.id !== undefined ? request.id : 0;

      // MCP 프로토콜 2024-11-05: content 배열로 반환
      const response = {
        jsonrpc: '2.0',
        result: {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        },
        id: safeRequestId,
      };
      console.log(JSON.stringify(response));
    } else {
      throw new Error(`Unknown method: ${request.method}`);
    }
  } catch (error) {
    let requestId = null;
    try {
      if (request && typeof request.id !== 'undefined') {
        requestId = request.id;
      }
    } catch {
      requestId = null;
    }

    console.error(`[NL-Query MCP] Error: ${error.message}`);

    const safeRequestId = requestId !== null ? requestId : 0;

    const errorResponse = {
      jsonrpc: '2.0',
      error: {
        code: -32603,
        message: error.message,
      },
      id: safeRequestId,
    };
    console.log(JSON.stringify(errorResponse));
  }
});

process.on('SIGINT', () => {
  console.error('[NL-Query MCP] Terminated');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.error('[NL-Query MCP] Terminated');
  process.exit(0);
});

console.error('[NL-Query MCP] Server started');
