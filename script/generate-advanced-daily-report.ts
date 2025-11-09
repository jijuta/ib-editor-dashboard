#!/usr/bin/env tsx
/**
 * 고급 일간 보안 인시던트 보고서 생성기
 * DeFender X 대시보드 수준의 상세 분석 보고서
 * 출력: JSON, Markdown, HTML (Chart.js 포함)
 */

import { execSync } from 'child_process';
import { writeFileSync, mkdirSync, readFileSync } from 'fs';
import { marked } from 'marked';

// 환경 변수
const OPENSEARCH_URL = process.env.OPENSEARCH_URL || 'http://opensearch:9200';
const OPENSEARCH_USER = process.env.OPENSEARCH_USER || 'admin';
const OPENSEARCH_PASSWORD = process.env.OPENSEARCH_PASSWORD || 'Admin@123456';

// 날짜 파라미터
const args = process.argv.slice(2);
const reportDate = args[0] || new Date(Date.now() - 86400000).toISOString().split('T')[0];

console.log('');
console.log('\x1b[34m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m');
console.log('\x1b[34m  📊 고급 일간 보안 인시던트 보고서 생성\x1b[0m');
console.log(`\x1b[34m  날짜: ${reportDate}\x1b[0m`);
console.log('\x1b[34m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m');
console.log('');

// OpenSearch 쿼리 헬퍼
function queryOpenSearch(index: string, query: any): any {
  try {
    const curlCmd = `curl -s -u "${OPENSEARCH_USER}:${OPENSEARCH_PASSWORD}" \
      -H "Content-Type: application/json" \
      -X POST "${OPENSEARCH_URL}/${index}/_search" \
      -d '${JSON.stringify(query)}'`;

    const result = execSync(curlCmd, { encoding: 'utf-8' });
    return JSON.parse(result);
  } catch (error) {
    console.error(`⚠️  OpenSearch 쿼리 실패 (${index}):`, error);
    return { hits: { total: { value: 0 }, hits: [] }, aggregations: {} };
  }
}

// 1. 인시던트 통계 수집
console.log('\x1b[32m1️⃣  인시던트 통계 수집 중...\x1b[0m');

const incidentQuery = {
  query: {
    bool: {
      must: [
        {
          range: {
            '@timestamp': {
              gte: `${reportDate}T00:00:00`,
              lte: `${reportDate}T23:59:59`,
            },
          },
        },
      ],
    },
  },
  size: 100, // 상위 100개 인시던트
  sort: [{ '@timestamp': { order: 'desc' } }],
  aggs: {
    by_severity: {
      terms: { field: 'severity.keyword', size: 10 },
    },
    by_status: {
      terms: { field: 'status.keyword', size: 10 },
    },
    by_detection_type: {
      terms: { field: 'detection_type.keyword', size: 20 },
    },
    by_host: {
      terms: { field: 'host_name.keyword', size: 10 },
    },
  },
};

const incidentData = queryOpenSearch('logs-cortex_xdr-incidents-*', incidentQuery);

// 통계 처리
const stats: any = {
  total: incidentData.hits?.total?.value || 0,
  incidents: incidentData.hits?.hits || [],
  severity: {},
  status: {},
  detection_types: {},
  top_hosts: {},
};

// 심각도별 집계
(incidentData.aggregations?.by_severity?.buckets || []).forEach((bucket: any) => {
  stats.severity[bucket.key] = bucket.doc_count;
});

// 상태별 집계
(incidentData.aggregations?.by_status?.buckets || []).forEach((bucket: any) => {
  stats.status[bucket.key] = bucket.doc_count;
});

// 탐지 유형별 집계
(incidentData.aggregations?.by_detection_type?.buckets || []).forEach((bucket: any) => {
  stats.detection_types[bucket.key] = bucket.doc_count;
});

// 호스트별 집계
(incidentData.aggregations?.by_host?.buckets || []).forEach((bucket: any) => {
  stats.top_hosts[bucket.key] = bucket.doc_count;
});

console.log(`✅ 총 ${stats.total}건의 인시던트 수집`);

// 2. 상위 위협 인시던트 상세 분석
console.log('');
console.log('\x1b[32m2️⃣  상위 위협 인시던트 상세 분석 중...\x1b[0m');

const topIncidents = stats.incidents
  .slice(0, 10)
  .map((hit: any) => hit._source);

console.log(`✅ 상위 ${topIncidents.length}개 인시던트 분석 완료`);

// 3. 위협 파일 분석
console.log('');
console.log('\x1b[32m3️⃣  위협 파일 분석 중...\x1b[0m');

const fileQuery = {
  query: {
    bool: {
      must: [
        {
          range: {
            '@timestamp': {
              gte: `${reportDate}T00:00:00`,
              lte: `${reportDate}T23:59:59`,
            },
          },
        },
      ],
    },
  },
  size: 100,
  aggs: {
    by_file_type: {
      terms: { field: 'file_type.keyword', size: 10 },
    },
  },
};

const fileData = queryOpenSearch('logs-cortex_xdr-files-*', fileQuery);
const threatFiles = fileData.hits?.hits || [];

console.log(`✅ ${threatFiles.length}개 파일 분석 완료`);

// 4. 네트워크 위협 분석
console.log('');
console.log('\x1b[32m4️⃣  네트워크 위협 분석 중...\x1b[0m');

const networkQuery = {
  query: {
    bool: {
      must: [
        {
          range: {
            '@timestamp': {
              gte: `${reportDate}T00:00:00`,
              lte: `${reportDate}T23:59:59`,
            },
          },
        },
      ],
    },
  },
  size: 100,
  aggs: {
    by_country: {
      terms: { field: 'network_country.keyword', size: 20 },
    },
    by_type: {
      terms: { field: 'type.keyword', size: 10 },
    },
  },
};

const networkData = queryOpenSearch('logs-cortex_xdr-networks-*', networkQuery);
const networks = networkData.hits?.hits || [];

console.log(`✅ ${networks.length}개 네트워크 연결 분석 완료`);

// 5. 보고서 데이터 구조화
const reportData = {
  metadata: {
    report_date: reportDate,
    generated_at: new Date().toISOString(),
    report_type: 'daily',
    system: 'DeFender X SIEM',
  },
  executive_summary: {
    total_incidents: stats.total,
    critical_count: stats.severity.critical || 0,
    high_count: stats.severity.high || 0,
    medium_count: stats.severity.medium || 0,
    low_count: stats.severity.low || 0,
    new_count: stats.status.new || 0,
    under_investigation: stats.status.under_investigation || 0,
    resolved_count: stats.status.resolved || 0,
  },
  statistics: {
    by_severity: stats.severity,
    by_status: stats.status,
    by_detection_type: stats.detection_types,
    by_host: stats.top_hosts,
  },
  top_incidents: topIncidents,
  threat_analysis: {
    files: threatFiles.slice(0, 20).map((hit: any) => hit._source),
    networks: networks.slice(0, 20).map((hit: any) => hit._source),
  },
  charts: {
    severity_distribution: Object.entries(stats.severity).map(([key, value]) => ({
      label: key,
      value,
    })),
    detection_types: Object.entries(stats.detection_types)
      .sort(([, a]: any, [, b]: any) => b - a)
      .slice(0, 10)
      .map(([key, value]) => ({ label: key, value })),
  },
};

// 6. JSON 저장
console.log('');
console.log('\x1b[32m5️⃣  JSON 저장 중...\x1b[0m');

const outputDir = 'public/reports/daily';
mkdirSync(outputDir, { recursive: true });

const jsonFile = `${outputDir}/daily_report_${reportDate}.json`;
writeFileSync(jsonFile, JSON.stringify(reportData, null, 2));

console.log(`✅ JSON 저장: ${jsonFile}`);

// 7. Markdown 생성
console.log('');
console.log('\x1b[32m6️⃣  Markdown 생성 중...\x1b[0m');

const markdown = `# 일간 보안 인시던트 보고서

**보고일**: ${reportDate}
**생성일시**: ${new Date().toISOString().replace('T', ' ').substring(0, 19)}
**분석 시스템**: DeFender X SIEM (Advanced Analysis)

---

## 📊 Executive Summary

### 핵심 지표 (KPI)

| 지표 | 수치 | 상태 |
|------|------|------|
| **총 인시던트** | ${reportData.executive_summary.total_incidents}건 | ${reportData.executive_summary.total_incidents > 100 ? '⚠️ 높음' : reportData.executive_summary.total_incidents > 50 ? '📊 보통' : '✅ 낮음'} |
| **긴급 대응 필요** | ${reportData.executive_summary.critical_count + reportData.executive_summary.high_count}건 | ${reportData.executive_summary.critical_count > 0 ? '🚨 Critical' : reportData.executive_summary.high_count > 0 ? '⚠️ High' : '✅ 정상'} |
| **해결 완료** | ${reportData.executive_summary.resolved_count}건 | ${reportData.executive_summary.resolved_count > 0 ? '✅' : '-'} |
| **조사 중** | ${reportData.executive_summary.under_investigation}건 | ${reportData.executive_summary.under_investigation > 20 ? '⚠️' : '📊'} |

### 심각도별 분포

| 심각도 | 건수 | 비율 | 긴급도 |
|--------|------|------|--------|
| **Critical** | ${reportData.executive_summary.critical_count} | ${reportData.executive_summary.total_incidents > 0 ? ((reportData.executive_summary.critical_count / reportData.executive_summary.total_incidents) * 100).toFixed(1) : 0}% | ${reportData.executive_summary.critical_count > 0 ? '🚨🚨🚨' : '-'} |
| **High** | ${reportData.executive_summary.high_count} | ${reportData.executive_summary.total_incidents > 0 ? ((reportData.executive_summary.high_count / reportData.executive_summary.total_incidents) * 100).toFixed(1) : 0}% | ${reportData.executive_summary.high_count > 0 ? '⚠️⚠️' : '-'} |
| **Medium** | ${reportData.executive_summary.medium_count} | ${reportData.executive_summary.total_incidents > 0 ? ((reportData.executive_summary.medium_count / reportData.executive_summary.total_incidents) * 100).toFixed(1) : 0}% | 📊 |
| **Low** | ${reportData.executive_summary.low_count} | ${reportData.executive_summary.total_incidents > 0 ? ((reportData.executive_summary.low_count / reportData.executive_summary.total_incidents) * 100).toFixed(1) : 0}% | ✅ |

---

## 🚨 긴급 조치 필요 인시던트

${reportData.executive_summary.critical_count > 0 || reportData.executive_summary.high_count > 0 ? `
### ⚠️ 즉시 대응 필요
- **Critical 인시던트**: ${reportData.executive_summary.critical_count}건
- **High 인시던트**: ${reportData.executive_summary.high_count}건

${topIncidents.filter((inc: any) => inc.severity === 'critical' || inc.severity === 'high').slice(0, 5).map((inc: any, idx: number) => `
#### ${idx + 1}. [${inc.severity?.toUpperCase()}] 인시던트 #${inc.incident_id}
- **탐지시각**: ${inc['@timestamp'] || 'N/A'}
- **호스트**: ${inc.host_name || 'N/A'}
- **탐지 유형**: ${inc.detection_type || 'N/A'}
- **상태**: ${inc.status || 'N/A'}
- **설명**: ${(inc.description || 'N/A').substring(0, 150)}...
`).join('')}
` : `
### ✅ 긴급 대응 필요 없음
- Critical 및 High 인시던트가 발생하지 않았습니다.
- 정상적인 보안 모니터링 상태입니다.
`}

---

## 📈 주요 탐지 유형 (Top 10)

${Object.entries(stats.detection_types)
  .sort(([, a]: any, [, b]: any) => b - a)
  .slice(0, 10)
  .map(([type, count], idx) => `${idx + 1}. **${type}**: ${count}건`)
  .join('\n')}

---

## 🔍 위협 분석

### 파일 위협
- **분석된 파일**: ${threatFiles.length}개
- **위협 파일**: ${threatFiles.filter((f: any) => f._source?.verdict === 'threat').length}개
- **의심 파일**: ${threatFiles.filter((f: any) => f._source?.verdict === 'suspicious').length}개

${threatFiles.slice(0, 5).map((file: any, idx: number) => {
  const f = file._source;
  return `
#### ${idx + 1}. ${f?.file_name || 'Unknown'}
- **SHA256**: \`${(f?.file_sha256 || 'N/A').substring(0, 16)}...\`
- **크기**: ${f?.file_size ? (f.file_size / 1024).toFixed(2) + ' KB' : 'N/A'}
- **판정**: ${f?.verdict || 'N/A'}
`;
}).join('')}

### 네트워크 위협
- **총 연결**: ${networks.length}건
- **외부 IP**: ${networks.filter((n: any) => n._source?.type === 'IP').length}개
- **외부 도메인**: ${networks.filter((n: any) => n._source?.type === 'DOMAIN').length}개

#### 상위 국가별 연결
${Object.entries(networkData.aggregations?.by_country?.buckets || [])
  .slice(0, 10)
  .map(([, bucket]: any, idx: number) => `${idx + 1}. **${bucket.key}**: ${bucket.doc_count}건`)
  .join('\n')}

---

## 📊 호스트별 인시던트

### Top 10 호스트

${Object.entries(stats.top_hosts)
  .sort(([, a]: any, [, b]: any) => b - a)
  .slice(0, 10)
  .map(([host, count], idx) => `${idx + 1}. **${host}**: ${count}건`)
  .join('\n')}

---

## 💡 권장 조치사항

### 즉시 조치
${reportData.executive_summary.critical_count > 0 ? `
- [ ] Critical 인시던트 ${reportData.executive_summary.critical_count}건 즉시 조사
- [ ] 영향받은 시스템 격리 검토
- [ ] 포렌식 증거 수집
` : ''}
${reportData.executive_summary.high_count > 0 ? `
- [ ] High 인시던트 ${reportData.executive_summary.high_count}건 우선 조사
- [ ] 관련 시스템 모니터링 강화
` : ''}
${reportData.executive_summary.critical_count === 0 && reportData.executive_summary.high_count === 0 ? `
- [x] 긴급 조치 필요 없음
- [ ] 정기 모니터링 지속
` : ''}

### 단기 개선 (1-2주)
- [ ] 반복 발생 호스트 점검
- [ ] 오탐 케이스 룰 튜닝
- [ ] 위협 인텔 DB 업데이트

### 중장기 개선 (1개월+)
- [ ] 자동화 대응 룰 확대
- [ ] 보안 교육 강화
- [ ] EDR 커버리지 확대

---

## 📞 연락처

- **긴급 대응팀**: 24/7 상시 대기
- **보안 담당자**: security@company.com
- **SIEM 관리자**: siem-admin@company.com

---

*본 보고서는 DeFender X SIEM 고급 분석 시스템을 통해 생성되었습니다.*

**데이터 출처**:
- OpenSearch Indices: logs-cortex_xdr-*
- 분석 기간: ${reportDate} 00:00:00 ~ 23:59:59
- 생성 시각: ${new Date().toISOString()}
`;

const mdFile = `${outputDir}/daily_report_${reportDate}.md`;
writeFileSync(mdFile, markdown);

console.log(`✅ Markdown 저장: ${mdFile}`);

// 8. HTML 생성 (Chart.js 포함)
console.log('');
console.log('\x1b[32m7️⃣  HTML 생성 중 (Chart.js 포함)...\x1b[0m');

const htmlBody = marked.parse(markdown) as string;

const html = `<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>일간 보안 인시던트 보고서 - ${reportDate}</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans KR', sans-serif;
            max-width: 1400px;
            margin: 0 auto;
            padding: 40px 20px;
            background: #f8fafc;
            color: #1f2937;
            line-height: 1.7;
        }

        h1 {
            color: #1f2937;
            border-bottom: 4px solid #3b82f6;
            padding-bottom: 15px;
            margin-bottom: 30px;
            font-size: 42px;
        }

        h2 {
            color: #374151;
            margin-top: 50px;
            margin-bottom: 25px;
            border-left: 6px solid #3b82f6;
            padding-left: 20px;
            font-size: 32px;
        }

        h3 {
            color: #4b5563;
            margin-top: 30px;
            margin-bottom: 18px;
            font-size: 24px;
        }

        h4 {
            color: #6b7280;
            margin-top: 20px;
            margin-bottom: 12px;
            font-size: 18px;
        }

        p {
            margin: 15px 0;
            font-size: 16px;
        }

        strong {
            color: #1f2937;
            font-weight: 600;
        }

        table {
            border-collapse: collapse;
            width: 100%;
            margin: 30px 0;
            background: white;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            border-radius: 12px;
            overflow: hidden;
        }

        th, td {
            border: 1px solid #e5e7eb;
            padding: 16px 20px;
            text-align: left;
        }

        th {
            background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
            color: white;
            font-weight: 600;
            font-size: 16px;
        }

        tr:nth-child(even) {
            background: #f9fafb;
        }

        tr:hover {
            background: #f3f4f6;
            transition: background 0.2s;
        }

        ul, ol {
            margin: 20px 0;
            padding-left: 40px;
        }

        li {
            margin: 12px 0;
            line-height: 1.9;
        }

        hr {
            border: none;
            border-top: 3px solid #e5e7eb;
            margin: 60px 0;
        }

        blockquote {
            background: #eff6ff;
            border-left: 5px solid #3b82f6;
            padding: 20px 25px;
            margin: 25px 0;
            border-radius: 6px;
            font-style: italic;
        }

        code {
            background: #f3f4f6;
            padding: 4px 10px;
            border-radius: 5px;
            font-family: 'Courier New', monospace;
            font-size: 14px;
            color: #dc2626;
        }

        .kpi-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 25px;
            margin: 40px 0;
        }

        .kpi-card {
            background: white;
            padding: 30px;
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            border-left: 5px solid #3b82f6;
            transition: transform 0.2s, box-shadow 0.2s;
        }

        .kpi-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 8px 20px rgba(0,0,0,0.15);
        }

        .kpi-label {
            font-size: 14px;
            color: #6b7280;
            margin-bottom: 10px;
            font-weight: 500;
        }

        .kpi-value {
            font-size: 36px;
            color: #1f2937;
            font-weight: 700;
            margin-bottom: 8px;
        }

        .kpi-status {
            font-size: 13px;
            padding: 6px 12px;
            border-radius: 20px;
            display: inline-block;
            font-weight: 500;
        }

        .status-critical { background: #fef2f2; color: #dc2626; }
        .status-high { background: #fff7ed; color: #ea580c; }
        .status-normal { background: #f0fdf4; color: #16a34a; }

        .charts-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
            gap: 30px;
            margin: 40px 0;
        }

        .chart-container {
            background: white;
            padding: 30px;
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }

        .chart-title {
            font-size: 20px;
            font-weight: 600;
            color: #374151;
            margin-bottom: 20px;
            padding-bottom: 15px;
            border-bottom: 2px solid #e5e7eb;
        }

        .print-button {
            position: fixed;
            top: 30px;
            right: 30px;
            background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
            color: white;
            border: none;
            padding: 15px 30px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 15px;
            font-weight: 600;
            box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
            transition: all 0.3s;
            z-index: 1000;
        }

        .print-button:hover {
            background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
            transform: translateY(-2px);
            box-shadow: 0 6px 16px rgba(59, 130, 246, 0.5);
        }

        @media print {
            body {
                background: white;
                margin: 0;
                padding: 20px;
            }

            .print-button {
                display: none;
            }

            .charts-grid {
                page-break-inside: avoid;
            }

            h1, h2 {
                page-break-after: avoid;
            }

            table {
                page-break-inside: avoid;
            }
        }

        @media (max-width: 768px) {
            .charts-grid {
                grid-template-columns: 1fr;
            }

            .kpi-grid {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <button class="print-button" onclick="window.print()">🖨️ 보고서 인쇄</button>

    <!-- KPI Cards -->
    <div class="kpi-grid">
        <div class="kpi-card">
            <div class="kpi-label">총 인시던트</div>
            <div class="kpi-value">${reportData.executive_summary.total_incidents}</div>
            <span class="kpi-status ${reportData.executive_summary.total_incidents > 100 ? 'status-high' : reportData.executive_summary.total_incidents > 50 ? 'status-normal' : 'status-normal'}">
                ${reportData.executive_summary.total_incidents > 100 ? '⚠️ 높음' : reportData.executive_summary.total_incidents > 50 ? '📊 보통' : '✅ 낮음'}
            </span>
        </div>

        <div class="kpi-card">
            <div class="kpi-label">긴급 대응 필요</div>
            <div class="kpi-value">${reportData.executive_summary.critical_count + reportData.executive_summary.high_count}</div>
            <span class="kpi-status ${reportData.executive_summary.critical_count > 0 ? 'status-critical' : reportData.executive_summary.high_count > 0 ? 'status-high' : 'status-normal'}">
                ${reportData.executive_summary.critical_count > 0 ? '🚨 Critical' : reportData.executive_summary.high_count > 0 ? '⚠️ High' : '✅ 정상'}
            </span>
        </div>

        <div class="kpi-card">
            <div class="kpi-label">해결 완료</div>
            <div class="kpi-value">${reportData.executive_summary.resolved_count}</div>
            <span class="kpi-status status-normal">
                ${reportData.executive_summary.resolved_count > 0 ? '✅ 조치 완료' : '대기 중'}
            </span>
        </div>

        <div class="kpi-card">
            <div class="kpi-label">조사 중</div>
            <div class="kpi-value">${reportData.executive_summary.under_investigation}</div>
            <span class="kpi-status ${reportData.executive_summary.under_investigation > 20 ? 'status-high' : 'status-normal'}">
                ${reportData.executive_summary.under_investigation > 20 ? '⚠️ 높음' : '📊 진행 중'}
            </span>
        </div>
    </div>

    <!-- Charts -->
    <div class="charts-grid">
        <div class="chart-container">
            <div class="chart-title">📊 심각도별 분포</div>
            <canvas id="severityChart"></canvas>
        </div>

        <div class="chart-container">
            <div class="chart-title">📈 주요 탐지 유형 (Top 10)</div>
            <canvas id="detectionChart"></canvas>
        </div>
    </div>

    <!-- Report Content -->
    ${htmlBody}

    <script>
        // 심각도 차트
        const severityCtx = document.getElementById('severityChart');
        new Chart(severityCtx, {
            type: 'doughnut',
            data: {
                labels: ${JSON.stringify(reportData.charts.severity_distribution.map((d: any) => d.label))},
                datasets: [{
                    data: ${JSON.stringify(reportData.charts.severity_distribution.map((d: any) => d.value))},
                    backgroundColor: [
                        '#dc2626', // critical
                        '#ea580c', // high
                        '#f59e0b', // medium
                        '#84cc16', // low
                    ],
                    borderWidth: 2,
                    borderColor: '#ffffff',
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 15,
                            font: { size: 13 }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.parsed || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((value / total) * 100).toFixed(1);
                                return label + ': ' + value + '건 (' + percentage + '%)';
                            }
                        }
                    }
                }
            }
        });

        // 탐지 유형 차트
        const detectionCtx = document.getElementById('detectionChart');
        new Chart(detectionCtx, {
            type: 'bar',
            data: {
                labels: ${JSON.stringify(reportData.charts.detection_types.map((d: any) => d.label.length > 20 ? d.label.substring(0, 20) + '...' : d.label))},
                datasets: [{
                    label: '건수',
                    data: ${JSON.stringify(reportData.charts.detection_types.map((d: any) => d.value))},
                    backgroundColor: 'rgba(59, 130, 246, 0.8)',
                    borderColor: 'rgba(59, 130, 246, 1)',
                    borderWidth: 2,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            font: { size: 12 }
                        }
                    },
                    x: {
                        ticks: {
                            font: { size: 11 },
                            maxRotation: 45,
                            minRotation: 45
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            title: function(context) {
                                const fullLabel = ${JSON.stringify(reportData.charts.detection_types.map((d: any) => d.label))};
                                return fullLabel[context[0].dataIndex];
                            }
                        }
                    }
                }
            }
        });

        // 페이지 로드 시각
        console.log('일간 보안 인시던트 보고서 로드:', new Date().toLocaleString('ko-KR'));
    </script>
</body>
</html>`;

const htmlFile = `${outputDir}/daily_report_${reportDate}.html`;
writeFileSync(htmlFile, html);

console.log(`✅ HTML 저장: ${htmlFile}`);

// 9. 결과 출력
console.log('');
console.log('\x1b[34m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m');
console.log('\x1b[34m✅ 고급 일간 보고서 생성 완료!\x1b[0m');
console.log('\x1b[34m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m');
console.log('');
console.log(`\x1b[32m📄 JSON: ${jsonFile}\x1b[0m`);
console.log(`\x1b[32m📄 Markdown: ${mdFile}\x1b[0m`);
console.log(`\x1b[32m📄 HTML: ${htmlFile}\x1b[0m`);
console.log('');
console.log(`\x1b[34m🌐 접속: http://localhost:40017/reports/daily/daily_report_${reportDate}.html\x1b[0m`);
console.log('');
console.log('\x1b[33m📊 보고서 요약:\x1b[0m');
console.log(`\x1b[33m   - 총 인시던트: ${stats.total}건\x1b[0m`);
console.log(`\x1b[33m   - Critical: ${reportData.executive_summary.critical_count}건 | High: ${reportData.executive_summary.high_count}건\x1b[0m`);
console.log(`\x1b[33m   - Medium: ${reportData.executive_summary.medium_count}건 | Low: ${reportData.executive_summary.low_count}건\x1b[0m`);
console.log(`\x1b[33m   - 분석된 파일: ${threatFiles.length}개 | 네트워크: ${networks.length}건\x1b[0m`);
console.log('');
