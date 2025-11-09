#!/usr/bin/env node
/**
 * Claude Investigation MCP Server
 * Claude Code가 직접 인시던트를 분석하고 한글 보고서 생성
 */

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} = require('@modelcontextprotocol/sdk/types.js');

const { collectReportData } = require('./report-data-collector.js');
const path = require('path');
const fs = require('fs/promises');
const { execSync } = require('child_process');

// MCP 서버 생성
const server = new Server(
  {
    name: 'claude-investigation',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// 도구 목록
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'collect_incident_data',
        description: '인시던트 데이터를 수집합니다 (AI 분석 없이). Claude Code가 직접 분석할 수 있도록 모든 원본 데이터를 반환합니다.',
        inputSchema: {
          type: 'object',
          properties: {
            incident_id: {
              type: 'string',
              description: '인시던트 ID',
            },
          },
          required: ['incident_id'],
        },
      },
      {
        name: 'save_analysis_and_generate_report',
        description: 'Claude Code가 작성한 AI 분석 의견을 저장하고 한글 HTML 보고서를 생성합니다.',
        inputSchema: {
          type: 'object',
          properties: {
            incident_id: {
              type: 'string',
              description: '인시던트 ID',
            },
            analysis: {
              type: 'object',
              description: 'Claude가 작성한 AI 분석 의견 (각 섹션별)',
              properties: {
                incident_detail: {
                  type: 'string',
                  description: '인시던트 상세 분석 의견 (한글)',
                },
                file_artifacts: {
                  type: 'string',
                  description: '파일 아티팩트 분석 의견 (한글)',
                },
                network_artifacts: {
                  type: 'string',
                  description: '네트워크 아티팩트 분석 의견 (한글)',
                },
                mitre_analysis: {
                  type: 'string',
                  description: 'MITRE ATT&CK 분석 의견 (한글)',
                },
                endpoint_analysis: {
                  type: 'string',
                  description: '엔드포인트 분석 의견 (한글)',
                },
                final_verdict: {
                  type: 'object',
                  description: '최종 종합 의견',
                  properties: {
                    verdict: {
                      type: 'string',
                      enum: ['false_positive', 'true_positive', 'needs_investigation'],
                      description: '최종 판정',
                    },
                    risk_score: {
                      type: 'number',
                      description: '위험 점수 (0-100)',
                    },
                    confidence: {
                      type: 'number',
                      description: '신뢰도 (0-100)',
                    },
                    summary: {
                      type: 'string',
                      description: '종합 분석 요약 (한글)',
                    },
                    key_findings: {
                      type: 'array',
                      items: { type: 'string' },
                      description: '주요 발견 사항 목록',
                    },
                  },
                  required: ['verdict', 'risk_score', 'confidence', 'summary'],
                },
              },
              required: ['final_verdict'],
            },
          },
          required: ['incident_id', 'analysis'],
        },
      },
    ],
  };
});

// 도구 실행
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    if (name === 'collect_incident_data') {
      const incidentId = args.incident_id;

      console.error(`[Claude Investigation] 📊 Collecting data for incident: ${incidentId}`);

      // 데이터 수집 (AI 분석 없이)
      const data = await collectReportData(incidentId);

      console.error(`[Claude Investigation] ✅ Data collection complete`);

      // Claude Code가 분석할 수 있도록 요약 정보 포함
      const summary = {
        incident_id: incidentId,
        basic_info: {
          severity: data.investigation.incident.severity,
          status: data.investigation.incident.status,
          description: data.investigation.incident.description,
          creation_time: data.investigation.incident.creation_time,
          alert_count: data.investigation.alerts?.length || 0,
        },
        statistics: {
          total_alerts: data.summary.total_alerts,
          total_files: data.summary.total_files,
          threat_files: data.summary.ti_threat_files,
          total_networks: data.summary.total_networks,
          threat_ips: data.summary.ti_threat_ips,
          total_endpoints: data.summary.total_endpoints,
          total_cves: data.summary.total_cves,
          mitre_techniques: data.ti_correlation.mitre_techniques?.length || 0,
        },
        threat_intelligence: {
          file_hashes: data.ti_correlation.file_hashes?.slice(0, 10) || [],
          ip_addresses: data.ti_correlation.ip_addresses?.slice(0, 10) || [],
          mitre_techniques: data.ti_correlation.mitre_techniques || [],
          cve_details: data.ti_correlation.cve_details?.slice(0, 20) || [],
        },
        full_data_path: `data/investigations/incident_${incidentId}_*.json`,
      };

      return {
        content: [
          {
            type: 'text',
            text: `# 인시던트 데이터 수집 완료

## 기본 정보
- **인시던트 ID**: ${incidentId}
- **심각도**: ${summary.basic_info.severity}
- **상태**: ${summary.basic_info.status}
- **알럿 수**: ${summary.basic_info.alert_count}

## 통계
- **총 파일**: ${summary.statistics.total_files} (위협: ${summary.statistics.threat_files})
- **총 네트워크**: ${summary.statistics.total_networks} (위협 IP: ${summary.statistics.threat_ips})
- **엔드포인트**: ${summary.statistics.total_endpoints}
- **CVE**: ${summary.statistics.total_cves}
- **MITRE 기법**: ${summary.statistics.mitre_techniques}

## 위협 인텔리전스 요약
### 파일 해시 (상위 10개)
${summary.threat_intelligence.file_hashes.map(f => `- ${f.hash.substring(0, 32)}... (위협: ${f.verdict}, 레벨: ${f.threat_level})`).join('\n')}

### MITRE ATT&CK
${summary.threat_intelligence.mitre_techniques.map(m => `- ${m.technique_id}: ${m.name}`).join('\n')}

### CVE (상위 20개)
${summary.threat_intelligence.cve_details.map(c => `- ${c.cve_id}: ${c.severity || 'N/A'}`).join('\n')}

---

**다음 단계**:
이 데이터를 바탕으로 다음 섹션별 AI 분석을 작성해주세요 (한글로):

1. **인시던트 상세 분석** (incident_detail)
   - 분석가 판단과 인시던트 현황 종합 분석

2. **파일 아티팩트 분석** (file_artifacts)
   - ${summary.statistics.threat_files}개 위협 파일에 대한 분석

3. **네트워크 아티팩트 분석** (network_artifacts)
   - ${summary.statistics.threat_ips}개 위협 IP에 대한 분석

4. **MITRE ATT&CK 분석** (mitre_analysis)
   - 탐지된 ${summary.statistics.mitre_techniques}개 기법 분석

5. **엔드포인트 분석** (endpoint_analysis)
   - ${summary.statistics.total_endpoints}개 엔드포인트와 ${summary.statistics.total_cves}개 CVE 분석

6. **최종 종합 의견** (final_verdict)
   - verdict: "false_positive" | "true_positive" | "needs_investigation"
   - risk_score: 0-100
   - confidence: 0-100
   - summary: 종합 분석 요약
   - key_findings: 주요 발견 사항 배열

분석 작성 후 \`save_analysis_and_generate_report\` 도구를 호출하여 보고서를 생성하세요.

전체 데이터: ${JSON.stringify(data, null, 2)}
`,
          },
        ],
      };
    }

    if (name === 'save_analysis_and_generate_report') {
      const { incident_id, analysis } = args;

      console.error(`[Claude Investigation] 💾 Saving analysis for incident: ${incident_id}`);

      // 기존 데이터 로드
      const { readdirSync } = require('fs');
      const dir = path.join(process.cwd(), 'data', 'investigations');
      const files = readdirSync(dir)
        .filter(f => f.startsWith(`incident_${incident_id}_`) && f.endsWith('.json'))
        .sort()
        .reverse();

      if (files.length === 0) {
        throw new Error(`No data file found for incident ${incident_id}`);
      }

      const dataFile = path.join(dir, files[0]);
      const data = JSON.parse(await fs.readFile(dataFile, 'utf-8'));

      // Claude 분석 추가
      data.claude_analysis = {
        ...analysis,
        analyzed_at: new Date().toISOString(),
        analyzed_by: 'Claude Sonnet 4.5',
      };

      // 업데이트된 JSON 저장
      await fs.writeFile(dataFile, JSON.stringify(data, null, 2), 'utf-8');
      console.error(`[Claude Investigation] ✅ Analysis saved to: ${dataFile}`);

      // HTML 보고서 생성 (TypeScript로 직접 실행)
      console.error(`[Claude Investigation] 📝 Generating Korean HTML report...`);
      execSync(`npx tsx script/generate-korean-html-report.ts ${incident_id}`, {
        cwd: process.cwd(),
        stdio: 'inherit',
      });

      return {
        content: [
          {
            type: 'text',
            text: `# 보고서 생성 완료!

## 저장된 파일
- **분석 데이터**: ${dataFile}
- **HTML 보고서**: public/reports/incident_${incident_id}_korean_*.html

## 웹 접속
http://localhost:40017/reports/incident_${incident_id}_korean_*.html

AI 분석이 성공적으로 저장되고 한글 보고서가 생성되었습니다.
`,
          },
        ],
      };
    }

    throw new Error(`Unknown tool: ${name}`);
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error.message}\n\nStack: ${error.stack}`,
        },
      ],
      isError: true,
    };
  }
});

// 서버 시작
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[Claude Investigation MCP] Server started');
}

main().catch((error) => {
  console.error('[Claude Investigation MCP] Fatal error:', error);
  process.exit(1);
});
