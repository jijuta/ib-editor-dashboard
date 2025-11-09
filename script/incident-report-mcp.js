#!/usr/bin/env node
/**
 * Incident Report MCP Server - Claude Code 전용 고품질 보고서 생성
 *
 * AI 분석 없이 데이터만 수집하여 Claude Code에 전달
 * Claude Code가 직접 분석하여 HTML 보고서 생성
 */

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 데이터 수집 함수 import
let collectReportData, collectMultipleReportData, collectReportDataByDateRange;

async function loadCollector() {
  const module = await import('./report-data-collector.js');
  collectReportData = module.collectReportData;
  collectMultipleReportData = module.collectMultipleReportData;
  collectReportDataByDateRange = module.collectReportDataByDateRange;
}

/**
 * MCP Server 정의
 */
export const server = {
  name: 'incident-report',
  version: '1.0.0',
  description: 'Claude Code 전용 인시던트 보고서 생성 - 고품질 AI 분석',
};

/**
 * MCP Tools 정의
 */
export const tools = [
  {
    name: 'collect_report_data',
    description: `
인시던트 조사 데이터 수집 (AI 분석 없음)

OpenSearch + TI 상관분석만 수행하여 순수 데이터 반환.
Claude Code가 이 데이터를 직접 분석하여 고품질 HTML 보고서 생성.

사용 예시:
- "Investigate incident 414186" → 단일 인시던트 조사
- "Investigate incidents 414186, 414187, 414188" → 여러 인시던트 조사
- "Create weekly report for incidents" → 주간 보고서
`,
    inputSchema: {
      type: 'object',
      properties: {
        incident_ids: {
          type: 'array',
          items: { type: 'string' },
          description: '조사할 인시던트 ID 목록 (예: ["414186", "414187"])',
        },
        date_range: {
          type: 'object',
          properties: {
            start: { type: 'string', description: 'ISO 8601 날짜 (예: 2025-11-01T00:00:00Z)' },
            end: { type: 'string', description: 'ISO 8601 날짜 (예: 2025-11-08T23:59:59Z)' },
            severity: { type: 'string', description: '선택적 severity 필터 (high, medium, low)' },
          },
          description: '날짜 범위로 인시던트 조회 (incident_ids 대신 사용 가능)',
        },
      },
      oneOf: [
        { required: ['incident_ids'] },
        { required: ['date_range'] },
      ],
    },
    handler: async (params) => {
      await loadCollector();

      try {
        // 인시던트 ID 추출
        let incidentIds = [];

        if (params.incident_ids && params.incident_ids.length > 0) {
          incidentIds = params.incident_ids;
        } else if (params.date_range) {
          // 날짜 범위는 향후 구현
          return {
            success: false,
            message: '날짜 범위 쿼리는 아직 지원되지 않습니다. 인시던트 ID를 직접 지정하세요.',
          };
        } else {
          throw new Error('incident_ids must be provided');
        }

        console.error(`[Report MCP] 📊 Generating HTML reports for ${incidentIds.length} incidents`);

        // HTML 보고서 생성 스크립트 실행
        const { spawn } = await import('child_process');
        const results = [];

        for (const incidentId of incidentIds) {
          console.error(`[Report MCP] 🚀 Generating report for: ${incidentId}`);

          const proc = spawn('npx', ['tsx', path.join(__dirname, 'generate-html-report.ts'), incidentId], {
            cwd: path.join(__dirname, '..'),
            stdio: 'inherit',
          });

          await new Promise((resolve, reject) => {
            proc.on('exit', (code) => {
              if (code === 0) {
                resolve();
              } else {
                reject(new Error(`Report generation failed with code ${code}`));
              }
            });
            proc.on('error', reject);
          });

          results.push({
            incident_id: incidentId,
            status: 'completed',
          });
        }

        console.error(`[Report MCP] ✅ All reports generated successfully`);

        return {
          success: true,
          message: `✅ Generated ${results.length} HTML report(s) successfully!\n\nReports saved to: data/reports/\n\nOpen the HTML files in your browser to view the reports.`,
          results,
        };
      } catch (error) {
        console.error('[Report MCP] ❌ Error:', error);

        return {
          success: false,
          error: error.message || String(error),
          message: `Failed to generate reports: ${error.message}`,
        };
      }
    },
  },
];

/**
 * MCP Resources (선택적)
 */
export const resources = [];

/**
 * MCP Server 시작
 */
async function main() {
  const { createMCPServer } = await import('./mcp-framework.js');

  const mcpServer = createMCPServer({
    server,
    tools,
    resources,
  });

  await mcpServer.start();
}

// 직접 실행 시
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}
