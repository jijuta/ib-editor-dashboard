#!/usr/bin/env tsx
/**
 * 완벽한 일간 보안 보고서 생성기
 * 개별 인시던트 분석 수준의 상세한 보고서 생성
 * - 9개 섹션 구조 (인시던트 분석 템플릿 기반)
 * - Critical/High 인시던트 심층 분석
 * - 모든 해시/IP/도메인/CVE 포함
 * - Chart.js 시각화
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import path from 'path';

// 날짜 파라미터
const args = process.argv.slice(2);
const reportDate = args[0] || new Date(Date.now() - 86400000).toISOString().split('T')[0];

console.log('');
console.log('\x1b[36m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m');
console.log('\x1b[36m  📄 완벽한 일간 보고서 생성\x1b[0m');
console.log(`\x1b[36m  날짜: ${reportDate}\x1b[0m`);
console.log('\x1b[36m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m');
console.log('');

// 출력 디렉토리 확인
const outputDir = 'public/reports/daily';
if (!existsSync(outputDir)) {
  mkdirSync(outputDir, { recursive: true });
}

// 1. 데이터 로드
console.log('\x1b[32m1️⃣  데이터 로드 중...\x1b[0m');

const dataFile = `public/reports/data/daily_incidents_data_${reportDate}.json`;
const aiFile = `public/reports/data/ai_analysis_${reportDate}.json`;

if (!existsSync(dataFile)) {
  console.error(`\x1b[31m❌ 데이터 파일을 찾을 수 없습니다: ${dataFile}\x1b[0m`);
  process.exit(1);
}

if (!existsSync(aiFile)) {
  console.error(`\x1b[31m❌ AI 분석 파일을 찾을 수 없습니다: ${aiFile}\x1b[0m`);
  process.exit(1);
}

const data = JSON.parse(readFileSync(dataFile, 'utf-8'));
const aiAnalysis = JSON.parse(readFileSync(aiFile, 'utf-8'));

console.log('✅ 데이터 로드 완료');
console.log(`   총 인시던트: ${data.collected_data.incidents.length}건`);
console.log(`   상세 분석: ${data.ai_analysis_data.top_incidents.length}건`);

// 2. HTML 생성
console.log('');
console.log('\x1b[32m2️⃣  HTML 보고서 생성 중...\x1b[0m');

const html = generateComprehensiveHTML(reportDate, data, aiAnalysis);
const htmlFile = `${outputDir}/daily_report_${reportDate}.html`;
writeFileSync(htmlFile, html);

console.log(`✅ HTML 저장: ${htmlFile}`);

// 3. Markdown 생성
console.log('');
console.log('\x1b[32m3️⃣  Markdown 보고서 생성 중...\x1b[0m');

const markdown = generateComprehensiveMarkdown(reportDate, data, aiAnalysis);
const mdFile = `${outputDir}/daily_report_${reportDate}.md`;
writeFileSync(mdFile, markdown);

console.log(`✅ Markdown 저장: ${mdFile}`);

// 4. JSON 통합
console.log('');
console.log('\x1b[32m4️⃣  JSON 보고서 생성 중...\x1b[0m');

// 호스트별 인시던트 카운트 생성
const hostIncidentCount: Record<string, number> = {};
data.collected_data.incidents.forEach((inc: any) => {
  const hosts = inc.incident.hosts || [];
  hosts.forEach((hostStr: string) => {
    const hostname = hostStr.split(':')[0]; // "hostname:guid" 형식에서 hostname만 추출
    hostIncidentCount[hostname] = (hostIncidentCount[hostname] || 0) + 1;
  });
});

const jsonReport = {
  report_date: reportDate,
  generated_at: new Date().toISOString(),
  data_summary: data.ai_analysis_data.summary,
  ai_analysis: aiAnalysis,
  all_incidents: data.collected_data.incidents.map((inc: any) => ({
    incident_id: inc.incident.incident_id,
    severity: inc.incident.severity,
    status: inc.incident.status,
    description: inc.incident.description,
    host_name: inc.incident.host_name,
    detection_time: inc.incident.detection_time,
    alerts_count: inc.alerts.length,
    files_count: inc.files.length,
    networks_count: inc.networks.length,
  })),
  statistics: {
    ...(data.ai_analysis_data.statistics || {}),
    by_host: hostIncidentCount,
  },
};

const jsonFile = `${outputDir}/daily_report_${reportDate}.json`;
writeFileSync(jsonFile, JSON.stringify(jsonReport, null, 2));

console.log(`✅ JSON 저장: ${jsonFile}`);

// 5. 완료
console.log('');
console.log('\x1b[36m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m');
console.log('\x1b[36m✅ 보고서 생성 완료!\x1b[0m');
console.log('\x1b[36m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m');
console.log('');
console.log('\x1b[32m📁 생성된 파일:\x1b[0m');
console.log(`  \x1b[32m✓\x1b[0m ${htmlFile}`);
console.log(`  \x1b[32m✓\x1b[0m ${mdFile}`);
console.log(`  \x1b[32m✓\x1b[0m ${jsonFile}`);
console.log('');
console.log('\x1b[33m🌐 웹 브라우저 접근:\x1b[0m');
console.log(`  \x1b[33mhttp://localhost:3000/reports/daily/daily_report_${reportDate}.html\x1b[0m`);
console.log('');

/**
 * 번역 함수들
 */
function translateSeverity(severity: string): string {
  const translations: Record<string, string> = {
    'critical': '치명적',
    'high': '높음',
    'medium': '중간',
    'low': '낮음',
    'informational': '정보',
  };
  return translations[severity?.toLowerCase()] || severity;
}

function translateStatus(status: string): string {
  const translations: Record<string, string> = {
    'new': '신규',
    'under_investigation': '조사 중',
    'resolved_threat_handled': '해결됨 (위협 처리)',
    'resolved_known_issue': '해결됨 (알려진 이슈)',
    'resolved_duplicate': '해결됨 (중복)',
    'resolved_false_positive': '해결됨 (오탐)',
    'resolved_true_positive': '해결됨 (실제 위협)',
    'resolved_other': '해결됨 (기타)',
  };
  return translations[status] || status;
}

/**
 * 종합적인 HTML 보고서 생성
 * 9개 섹션으로 구성된 상세 보고서
 */
function generateComprehensiveHTML(date: string, data: any, ai: any): string {
  const summary = data.ai_analysis_data.summary;
  const incidents = data.collected_data.incidents;
  const topIncidents = data.ai_analysis_data.top_incidents;

  // Critical/High 인시던트 필터링
  const criticalHighIncidents = incidents.filter((inc: any) =>
    inc.incident.severity === 'critical' || inc.incident.severity === 'high'
  );

  // 모든 해시 수집 (리스트: Unknown TI만 표시, Benign 제외)
  const allHashes = new Set<string>();
  const allHashesWithContext: any[] = [];
  const seenHashes = new Set<string>(); // 완전 중복 제거용 (해시만으로)

  // 통계용
  let totalHashCount = 0;
  let whitelistHashCount = 0; // Benign (화이트리스트)
  let threatHashCount = 0; // Malicious/Suspicious
  let unknownHashCount = 0; // Unknown TI

  incidents.forEach((inc: any) => {
    inc.files.forEach((file: any) => {
      if (file.sha256 || file.file_sha256) {
        const hash = file.sha256 || file.file_sha256;

        // 이미 본 해시는 스킵 (완전 중복 제거)
        if (seenHashes.has(hash)) {
          return;
        }

        seenHashes.add(hash);
        totalHashCount++;

        // TI 매칭 확인
        const tiMatch = data.collected_data.ti_data?.find((ti: any) => ti.hash === hash);

        if (tiMatch) {
          // TI 정보가 있는 해시
          const verdict = (tiMatch.verdict || '').toLowerCase();
          if (verdict === 'benign') {
            // 화이트리스트 (리스트에 표시 안 함)
            whitelistHashCount++;
          } else {
            // 위협 해시 (Malicious/Suspicious)
            threatHashCount++;
            allHashes.add(hash);
            allHashesWithContext.push({
              hash: hash,
              file_name: file.file_name || file.file_path || 'Unknown',
              incident_id: inc.incident.incident_id,
              incident_severity: inc.incident.severity,
              verdict: tiMatch.verdict,
              classification: tiMatch.classification,
            });
          }
        } else {
          // Unknown TI (위협 정보 없음, 검사 필요)
          unknownHashCount++;
          allHashes.add(hash);
          allHashesWithContext.push({
            hash: hash,
            file_name: file.file_name || file.file_path || 'Unknown',
            incident_id: inc.incident.incident_id,
            incident_severity: inc.incident.severity,
            verdict: null,
            classification: null,
          });
        }
      }
    });
  });

  // 모든 네트워크 아티팩트 수집 (내부 도메인 제외, 중복 제거)
  const allIPs = new Set<string>();
  const allDomains = new Set<string>();
  const allNetworksWithContext: any[] = [];
  const seenIPs = new Set<string>(); // 완전 중복 제거용

  // 내부/외부 IP 카운트 (통계용)
  let internalIPCount = 0;
  let externalIPCount = 0;
  let benignNetworkCount = 0;  // Benign 네트워크 카운트

  // 내부 IP 패턴 (RFC1918)
  const isInternalIP = (ip: string) => {
    if (!ip || ip === '-') return true;
    return /^10\./.test(ip) ||
           /^172\.(1[6-9]|2[0-9]|3[01])\./.test(ip) ||
           /^192\.168\./.test(ip) ||
           /^127\./.test(ip) ||
           /^169\.254\./.test(ip);
  };

  // 내부 도메인 패턴 (제외할 도메인)
  const internalDomainPatterns = [
    /^$/, // 빈 문자열
    /^-$/, // 대시만
    /localhost/i,
    /\.local$/i,
    /\.internal$/i,
    /^10\./,
    /^172\.(1[6-9]|2[0-9]|3[01])\./,
    /^192\.168\./,
  ];

  const isInternalDomain = (domain: string) => {
    if (!domain || domain === '-') return true;
    return internalDomainPatterns.some(pattern => pattern.test(domain));
  };

  incidents.forEach((inc: any) => {
    inc.networks.forEach((net: any) => {
      const ip = net.network_remote_ip || net.remote_ip || net.dst_ip || net.action_external_ip;
      const domain = net.network_domain || net.domain;
      const reputation = net.reputation || 'unknown';

      if (ip && !seenIPs.has(ip)) {
        seenIPs.add(ip);

        // 내부/외부 카운트
        if (isInternalIP(ip)) {
          internalIPCount++;
        } else {
          externalIPCount++;

          // Benign 네트워크 필터링 (파일 해시처럼)
          if (reputation === 'benign') {
            benignNetworkCount++;
            // 보고서에는 표시하지 않음 (카운트만)
            return;
          }

          // Unknown/Malicious만 리스트에 추가
          allIPs.add(ip);

          // 도메인이 내부가 아닌 경우만 추가
          if (domain && !isInternalDomain(domain)) {
            allDomains.add(domain);
          }

          allNetworksWithContext.push({
            ip: ip,
            domain: (domain && !isInternalDomain(domain)) ? domain : '-',
            country: net.country || '-',
            reputation: reputation,  // reputation 추가
            incident_id: inc.incident.incident_id,
            incident_severity: inc.incident.severity,
          });
        }
      }
    });
  });

  // 모든 CVE 수집
  const allCVEs = new Set<string>();
  const allCVEsWithContext: any[] = [];

  // 호스트별 인시던트 카운트
  const hostIncidentCount: Record<string, number> = {};

  incidents.forEach((inc: any) => {
    // CVE 추출: endpoints가 있으면 사용, 없으면 description에서 추출
    if (inc.endpoints && inc.endpoints.length > 0) {
      inc.endpoints.forEach((endpoint: any) => {
        if (endpoint.endpoint_cves && Array.isArray(endpoint.endpoint_cves)) {
          endpoint.endpoint_cves.forEach((cve: string) => {
            allCVEs.add(cve);
            allCVEsWithContext.push({
              cve: cve,
              endpoint_name: endpoint.endpoint_name || endpoint.host_name,
              os_type: endpoint.os_type,
              incident_id: inc.incident.incident_id,
            });
          });
        }
      });
    } else {
      // endpoints가 없으면 description, alerts에서 CVE-XXXX-XXXXX 패턴 추출
      const cvePattern = /CVE-\d{4}-\d{4,7}/gi;
      const description = inc.incident.description || '';
      const matches = description.match(cvePattern);
      if (matches) {
        matches.forEach((cve: string) => {
          allCVEs.add(cve.toUpperCase());
          allCVEsWithContext.push({
            cve: cve.toUpperCase(),
            endpoint_name: (inc.incident.hosts?.[0] || '').split(':')[0] || 'Unknown',
            os_type: 'Unknown',
            incident_id: inc.incident.incident_id,
          });
        });
      }

      // alerts에서도 CVE 추출
      if (inc.alerts && inc.alerts.length > 0) {
        inc.alerts.forEach((alert: any) => {
          const alertName = alert.alert_name || alert.name || '';
          const alertMatches = alertName.match(cvePattern);
          if (alertMatches) {
            alertMatches.forEach((cve: string) => {
              allCVEs.add(cve.toUpperCase());
              allCVEsWithContext.push({
                cve: cve.toUpperCase(),
                endpoint_name: (inc.incident.hosts?.[0] || '').split(':')[0] || 'Unknown',
                os_type: 'Unknown',
                incident_id: inc.incident.incident_id,
              });
            });
          }
        });
      }
    }

    // 호스트별 인시던트 카운트
    const hosts = inc.incident.hosts || [];
    hosts.forEach((hostStr: string) => {
      const hostname = hostStr.split(':')[0]; // "hostname:guid" 형식에서 hostname만 추출
      hostIncidentCount[hostname] = (hostIncidentCount[hostname] || 0) + 1;
    });
  });

  // MITRE ATT&CK 데이터 수집 (incidents에서 직접)
  const allMitreTechniques = new Set<string>();
  const mitreTactics: Record<string, number> = {};
  const tacticToEndpoints: Record<string, Set<string>> = {}; // 전술별 엔드포인트 추적

  incidents.forEach((inc: any) => {
    const techniques = inc.incident.mitre_techniques_ids_and_names || [];
    const tactics = inc.incident.mitre_tactics_ids_and_names || [];
    const hosts = inc.incident.hosts || [];

    techniques.forEach((tech: string) => {
      allMitreTechniques.add(tech);
    });

    tactics.forEach((tactic: string) => {
      mitreTactics[tactic] = (mitreTactics[tactic] || 0) + 1;

      // 전술별 엔드포인트 추적
      if (!tacticToEndpoints[tactic]) {
        tacticToEndpoints[tactic] = new Set();
      }
      hosts.forEach((host: string) => {
        tacticToEndpoints[tactic].add(host);
      });
    });
  });

  // 위험도에 따른 색상
  const riskColor = getRiskColor(ai.threat_assessment?.overall_risk_level || 'medium');
  const gradeColor = getGradeColor(ai.security_posture_assessment?.overall_grade || 'C');

  return `<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>일간 보안 인시던트 보고서 - ${date}</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, system-ui, Roboto, 'Helvetica Neue', 'Segoe UI', 'Apple SD Gothic Neo', 'Noto Sans KR', 'Malgun Gothic', sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: #1a202c;
            line-height: 1.6;
            padding: 2rem 1rem;
        }

        .container {
            max-width: 1400px;
            margin: 0 auto;
            background: #ffffff;
            border-radius: 16px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            overflow: hidden;
        }

        .header {
            background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);
            color: white;
            padding: 3rem 2rem;
            text-align: center;
        }

        .header h1 {
            font-size: 2.5rem;
            font-weight: 700;
            margin-bottom: 0.5rem;
        }

        .header .date {
            font-size: 1.25rem;
            opacity: 0.9;
        }

        .content {
            padding: 2rem;
        }

        .summary-cards {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 1.5rem;
            margin-bottom: 2rem;
        }

        .card {
            background: linear-gradient(135deg, #f6f8fb 0%, #ffffff 100%);
            border-radius: 12px;
            padding: 1.5rem;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
            border-left: 4px solid #3b82f6;
        }

        .card-title {
            font-size: 0.875rem;
            color: #64748b;
            margin-bottom: 0.5rem;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }

        .card-value {
            font-size: 2rem;
            font-weight: 700;
            color: #1e293b;
        }

        .card-label {
            font-size: 0.875rem;
            color: #94a3b8;
            margin-top: 0.25rem;
        }

        .card.critical { border-left-color: #ef4444; }
        .card.high { border-left-color: #f97316; }
        .card.medium { border-left-color: #eab308; }
        .card.low { border-left-color: #22c55e; }

        .section {
            background: #ffffff;
            border-radius: 12px;
            padding: 2rem;
            margin-bottom: 2rem;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
            border: 1px solid #e2e8f0;
        }

        .section-title {
            font-size: 1.75rem;
            font-weight: 700;
            color: #1e293b;
            margin-bottom: 1.5rem;
            padding-bottom: 0.75rem;
            border-bottom: 3px solid #3b82f6;
        }

        .section-subtitle {
            font-size: 1.25rem;
            font-weight: 600;
            color: #475569;
            margin-top: 1.5rem;
            margin-bottom: 1rem;
        }

        .incident-card {
            background: #f8fafc;
            border-radius: 8px;
            padding: 1.5rem;
            margin-bottom: 1rem;
            border-left: 4px solid #3b82f6;
        }

        .incident-card.critical { border-left-color: #ef4444; background: #fef2f2; }
        .incident-card.high { border-left-color: #f97316; background: #fff7ed; }
        .incident-card.medium { border-left-color: #eab308; background: #fefce8; }
        .incident-card.low { border-left-color: #22c55e; background: #f0fdf4; }

        .incident-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1rem;
        }

        .incident-id {
            font-size: 1.125rem;
            font-weight: 700;
            color: #1e293b;
        }

        .severity-badge {
            padding: 0.25rem 0.75rem;
            border-radius: 6px;
            font-size: 0.875rem;
            font-weight: 600;
            text-transform: uppercase;
        }

        .severity-badge.critical { background: #ef4444; color: white; }
        .severity-badge.high { background: #f97316; color: white; }
        .severity-badge.medium { background: #eab308; color: white; }
        .severity-badge.low { background: #22c55e; color: white; }

        .info-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1rem;
            margin-top: 1rem;
        }

        .info-item {
            display: flex;
            flex-direction: column;
        }

        .info-label {
            font-size: 0.75rem;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-bottom: 0.25rem;
        }

        .info-value {
            font-size: 0.875rem;
            color: #1e293b;
            font-weight: 500;
        }

        .table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 1rem;
        }

        .table th {
            background: #f1f5f9;
            padding: 0.75rem;
            text-align: left;
            font-weight: 600;
            color: #475569;
            border-bottom: 2px solid #cbd5e1;
        }

        .table td {
            padding: 0.75rem;
            border-bottom: 1px solid #e2e8f0;
        }

        .table tr:hover {
            background: #f8fafc;
        }

        .hash-display {
            font-family: 'Monaco', 'Courier New', monospace;
            font-size: 0.75rem;
            color: #475569;
            word-break: break-all;
        }

        .chart-container {
            position: relative;
            height: 300px;
            margin-top: 1rem;
        }

        .badge {
            display: inline-block;
            padding: 0.25rem 0.75rem;
            border-radius: 6px;
            font-size: 0.75rem;
            font-weight: 600;
            margin-right: 0.5rem;
        }

        .badge.malicious { background: #fee2e2; color: #991b1b; }
        .badge.suspicious { background: #fef3c7; color: #92400e; }
        .badge.benign { background: #dcfce7; color: #166534; }
        .badge.unknown { background: #f1f5f9; color: #475569; }

        .no-data {
            text-align: center;
            padding: 2rem;
            color: #64748b;
            font-style: italic;
        }

        .recommendation-list {
            list-style: none;
            padding: 0;
        }

        .recommendation-list li {
            padding: 0.75rem 1rem;
            margin-bottom: 0.5rem;
            background: #f8fafc;
            border-left: 3px solid #3b82f6;
            border-radius: 4px;
        }

        .recommendation-list li.urgent {
            background: #fef2f2;
            border-left-color: #ef4444;
        }

        .mitre-technique {
            display: inline-block;
            background: #dbeafe;
            color: #1e40af;
            padding: 0.25rem 0.75rem;
            border-radius: 6px;
            margin: 0.25rem;
            font-size: 0.875rem;
        }

        .footer {
            text-align: center;
            padding: 2rem;
            background: #f8fafc;
            color: #64748b;
            font-size: 0.875rem;
        }

        @media print {
            body {
                background: white;
                padding: 0;
            }
            .container {
                box-shadow: none;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🛡️ 일간 보안 인시던트 보고서</h1>
            <div class="date">날짜: ${date}</div>
            <div class="date" style="font-size: 0.875rem; margin-top: 0.5rem;">
                생성 시각: ${new Date().toLocaleString('ko-KR')}
            </div>
        </div>

        <div class="content">
            <!-- 요약 카드 -->
            <div class="summary-cards">
                <div class="card">
                    <div class="card-title">총 인시던트</div>
                    <div class="card-value">${summary.total_incidents || 0}</div>
                    <div class="card-label">건</div>
                </div>
                <div class="card critical">
                    <div class="card-title">Critical</div>
                    <div class="card-value">${summary.critical_count || 0}</div>
                    <div class="card-label">건</div>
                </div>
                <div class="card high">
                    <div class="card-title">High</div>
                    <div class="card-value">${summary.high_count || 0}</div>
                    <div class="card-label">건</div>
                </div>
                <div class="card medium">
                    <div class="card-title">Medium</div>
                    <div class="card-value">${summary.medium_count || 0}</div>
                    <div class="card-label">건</div>
                </div>
                <div class="card low">
                    <div class="card-title">Low</div>
                    <div class="card-value">${summary.low_count || 0}</div>
                    <div class="card-label">건</div>
                </div>
                <div class="card" style="border-left-color: ${riskColor};">
                    <div class="card-title">위험도</div>
                    <div class="card-value">${(ai.threat_assessment?.overall_risk_level || 'MEDIUM').toUpperCase()}</div>
                    <div class="card-label">${ai.threat_assessment?.risk_score || 0}/100</div>
                </div>
                <div class="card" style="border-left-color: ${gradeColor};">
                    <div class="card-title">보안 등급</div>
                    <div class="card-value">${ai.security_posture_assessment?.overall_grade || 'C'}</div>
                    <div class="card-label">Security Grade</div>
                </div>
                <div class="card">
                    <div class="card-title">오탐률</div>
                    <div class="card-value">${((summary.false_positive_count / summary.total_incidents * 100) || 0).toFixed(1)}%</div>
                    <div class="card-label">${summary.false_positive_count || 0}/${summary.total_incidents || 0}건</div>
                </div>
            </div>

            <!-- 섹션 1: 종합 요약 -->
            <section class="section">
                <h2 class="section-title">1. 종합 요약</h2>
                <p style="font-size: 1.125rem; line-height: 1.8; color: #334155;">
                    ${ai.executive_summary || 'AI 분석 요약이 없습니다.'}
                </p>

                <h3 class="section-subtitle">주요 발견사항</h3>
                <ul style="padding-left: 1.5rem; line-height: 1.8;">
                    ${(ai.threat_assessment?.key_findings || []).map((finding: string) => `
                        <li>${finding}</li>
                    `).join('')}
                </ul>

                <h3 class="section-subtitle">통계 차트</h3>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 2rem;">
                    <div class="chart-container">
                        <canvas id="severityChart"></canvas>
                    </div>
                    <div class="chart-container">
                        <canvas id="statusChart"></canvas>
                    </div>
                </div>
            </section>

            <!-- 섹션 2: Critical/High 인시던트 심층 분석 -->
            <section class="section">
                <h2 class="section-title">2. Critical/High 인시던트 심층 분석</h2>
                <p style="margin-bottom: 1rem; color: #64748b;">
                    전체 ${summary.total_incidents}건 중 ${criticalHighIncidents.length}건의 Critical/High 인시던트에 대한 상세 분석
                </p>

                <h3 class="section-subtitle">Critical/High 인시던트 요약</h3>
                <p style="margin-bottom: 1rem; line-height: 1.8;">
                    ${ai.incident_analysis?.critical_incidents_summary || 'Critical/High 인시던트 요약이 없습니다.'}
                </p>

                ${criticalHighIncidents.length > 0 ? criticalHighIncidents.slice(0, 10).map((inc: any) => `
                    <div class="incident-card ${inc.incident.severity || 'medium'}">
                        <div class="incident-header">
                            <div class="incident-id">#${inc.incident.incident_id || 'N/A'}</div>
                            <span class="severity-badge ${inc.incident.severity || 'medium'}">
                                ${(inc.incident.severity || 'medium').toUpperCase()}
                            </span>
                        </div>
                        <h4 style="font-size: 1rem; margin-bottom: 0.5rem; color: #1e293b;">
                            ${inc.incident.incident_name || '이름 없음'}
                        </h4>
                        <p style="font-size: 0.875rem; color: #475569; margin-bottom: 1rem;">
                            ${inc.incident.description || '설명 없음'}
                        </p>
                        <div class="info-grid">
                            <div class="info-item">
                                <div class="info-label">호스트</div>
                                <div class="info-value">${inc.incident.host_name || 'N/A'}</div>
                            </div>
                            <div class="info-item">
                                <div class="info-label">탐지 시각</div>
                                <div class="info-value">${inc.incident.detection_time ? new Date(inc.incident.detection_time).toLocaleString('ko-KR') : 'N/A'}</div>
                            </div>
                            <div class="info-item">
                                <div class="info-label">상태</div>
                                <div class="info-value">${translateStatus(inc.incident.status) || 'N/A'}</div>
                            </div>
                            <div class="info-item">
                                <div class="info-label">알럿 수</div>
                                <div class="info-value">${inc.alerts.length}개</div>
                            </div>
                        </div>
                        ${inc.incident.resolve_comment || inc.incident.manual_description ? `
                            <div style="margin-top: 1rem; padding: 1rem; background: #f1f5f9; border-radius: 6px;">
                                <strong style="color: #1e293b;">분석가 판단:</strong>
                                <p style="margin-top: 0.5rem; color: #475569;">${inc.incident.resolve_comment || inc.incident.manual_description}</p>
                            </div>
                        ` : ''}
                    </div>
                `).join('') : '<div class="no-data">Critical/High 인시던트가 없습니다.</div>'}
            </section>

            <!-- 섹션 3: 파일 아티팩트 분석 (모든 해시) -->
            <section class="section">
                <h2 class="section-title">3. 파일 아티팩트 분석</h2>

                <h3 class="section-subtitle">분포 통계</h3>
                <div class="info-grid" style="margin-bottom: 1.5rem;">
                    <div class="info-item">
                        <div class="info-label">총 해시 수</div>
                        <div class="info-value">${totalHashCount}개</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">화이트리스트</div>
                        <div class="info-value">${whitelistHashCount}개</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">위협 해시</div>
                        <div class="info-value">${threatHashCount}개</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Unknown (검사필요)</div>
                        <div class="info-value">${unknownHashCount}개</div>
                    </div>
                </div>


                ${allHashesWithContext.length > 0 ? `
                    <h3 class="section-subtitle">검사 필요 파일 해시 리스트 (Unknown TI)</h3>
                    <p style="color: #64748b; margin-bottom: 1rem; font-size: 0.875rem;">
                        ※ 화이트리스트(Benign) 파일은 제외되었습니다. 아래는 위협 정보가 없어 추가 검사가 필요한 파일 목록입니다.
                    </p>
                    <table class="table">
                        <thead>
                            <tr>
                                <th>SHA256 해시</th>
                                <th>파일명</th>
                                <th>인시던트</th>
                                <th>심각도</th>
                                <th>TI 분석</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${allHashesWithContext.map((item: any) => {
                                return `
                                <tr>
                                    <td><div class="hash-display">${item.hash}</div></td>
                                    <td>${item.file_name}</td>
                                    <td>${item.incident_id}</td>
                                    <td><span class="severity-badge ${item.incident_severity}">${translateSeverity(item.incident_severity)}</span></td>
                                    <td>
                                        ${item.verdict ? `
                                            <span class="badge ${item.verdict === 'malicious' ? 'malicious' : item.verdict === 'suspicious' ? 'suspicious' : 'unknown'}">
                                                ${item.verdict}
                                            </span>
                                            ${item.classification ? `<br><small>${item.classification}</small>` : ''}
                                        ` : '<span class="badge" style="background: #f59e0b; color: #fff;">Unknown TI</span>'}
                                    </td>
                                </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                ` : '<div class="no-data">검사가 필요한 파일이 없습니다. (모든 파일이 화이트리스트 또는 위협 해시로 분류됨)</div>'}

                ${data.ai_analysis_data.threat_intelligence?.threat_files?.length > 0 ? `
                    <h3 class="section-subtitle">위협 파일 상세 분석</h3>
                    ${data.ai_analysis_data.threat_intelligence.threat_files.map((file: any) => `
                        <div style="background: #fef2f2; border-left: 3px solid #ef4444; padding: 1rem; margin-bottom: 1rem; border-radius: 6px;">
                            <strong style="color: #991b1b;">${file.file_name || 'Unknown'}</strong>
                            <div class="hash-display" style="margin-top: 0.5rem;">${file.hash}</div>
                            <p style="margin-top: 0.5rem; color: #7f1d1d;">${file.analysis || 'TI 분석 정보 없음'}</p>
                        </div>
                    `).join('')}
                ` : ''}
            </section>

            <!-- 섹션 4: 네트워크 아티팩트 분석 (모든 IP/도메인) -->
            <section class="section">
                <h2 class="section-title">4. 네트워크 아티팩트 분석</h2>

                <h3 class="section-subtitle">분포 통계</h3>
                <div class="info-grid" style="margin-bottom: 1.5rem;">
                    <div class="info-item">
                        <div class="info-label">총 IP 수</div>
                        <div class="info-value">${internalIPCount + externalIPCount}개</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">내부 IP</div>
                        <div class="info-value">${internalIPCount}개</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">외부 IP</div>
                        <div class="info-value">${externalIPCount}개</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Benign 네트워크</div>
                        <div class="info-value" style="color: #10b981;">${benignNetworkCount}개</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">위험 네트워크</div>
                        <div class="info-value" style="color: #f59e0b;">${allNetworksWithContext.length}개</div>
                    </div>
                </div>

                ${(internalIPCount + externalIPCount) > 0 ? `
                    <h3 class="section-subtitle">내부/외부 IP 분포</h3>
                    <canvas id="internalExternalChart" style="max-height: 300px; margin: 1rem 0;"></canvas>
                    <script>
                        new Chart(document.getElementById('internalExternalChart'), {
                            type: 'doughnut',
                            data: {
                                labels: ['내부 IP', '외부 IP'],
                                datasets: [{
                                    data: [${internalIPCount}, ${externalIPCount}],
                                    backgroundColor: [
                                        'rgba(59, 130, 246, 0.8)',  // blue for Internal
                                        'rgba(239, 68, 68, 0.8)'    // red for External
                                    ],
                                    borderColor: [
                                        'rgba(59, 130, 246, 1)',
                                        'rgba(239, 68, 68, 1)'
                                    ],
                                    borderWidth: 1
                                }]
                            },
                            options: {
                                responsive: true,
                                maintainAspectRatio: true,
                                plugins: {
                                    legend: {
                                        position: 'right'
                                    },
                                    tooltip: {
                                        callbacks: {
                                            label: function(context) {
                                                const total = ${internalIPCount + externalIPCount};
                                                const percentage = ((context.parsed / total) * 100).toFixed(1);
                                                return context.label + ': ' + context.parsed + '개 (' + percentage + '%)';
                                            }
                                        }
                                    }
                                }
                            }
                        });
                    </script>
                ` : ''}

                ${allNetworksWithContext.length > 0 ? `
                    <h3 class="section-subtitle">외부 네트워크 연결 리스트</h3>
                    <p style="color: #64748b; margin-bottom: 1rem; font-size: 0.875rem;">
                        ※ 내부 IP 및 Benign 네트워크는 제외되었습니다. Unknown/Malicious 네트워크만 표시됩니다.
                    </p>
                    <table class="table">
                        <thead>
                            <tr>
                                <th>IP 주소</th>
                                <th>도메인</th>
                                <th>국가</th>
                                <th>위험도</th>
                                <th>인시던트</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${allNetworksWithContext.map((item: any) => {
                                const reputationBadge = item.reputation === 'malicious'
                                    ? '<span class="badge malicious">Malicious</span>'
                                    : item.reputation === 'unknown'
                                    ? '<span class="badge unknown">Unknown</span>'
                                    : '<span class="badge benign">Benign</span>';
                                return `
                                <tr>
                                    <td><code>${item.ip}</code></td>
                                    <td>${item.domain || '-'}</td>
                                    <td>${item.country || '-'}</td>
                                    <td>${reputationBadge}</td>
                                    <td>${item.incident_id} <span class="severity-badge ${item.incident_severity}">${translateSeverity(item.incident_severity)}</span></td>
                                </tr>`;
                            }).join('')}
                        </tbody>
                    </table>
                ` : '<div class="no-data">네트워크 아티팩트가 없습니다. 모든 인시던트에서 외부 네트워크 연결이 탐지되지 않았습니다.</div>'}

                <h3 class="section-subtitle">국가별 분포</h3>
                ${allNetworksWithContext.length > 0 ? `
                    <canvas id="countryChart" style="max-height: 300px; margin: 1rem 0;"></canvas>
                    <script>
                        // 국가별 카운트
                        const countryData = {};
                        ${JSON.stringify(allNetworksWithContext)}.forEach(item => {
                            if (item.country && item.country !== '-') {
                                countryData[item.country] = (countryData[item.country] || 0) + 1;
                            }
                        });

                        const sortedCountries = Object.entries(countryData)
                            .sort((a, b) => b[1] - a[1])
                            .slice(0, 10);

                        new Chart(document.getElementById('countryChart'), {
                            type: 'bar',
                            data: {
                                labels: sortedCountries.map(c => c[0]),
                                datasets: [{
                                    label: '연결 수',
                                    data: sortedCountries.map(c => c[1]),
                                    backgroundColor: 'rgba(59, 130, 246, 0.8)',
                                    borderColor: 'rgba(59, 130, 246, 1)',
                                    borderWidth: 1
                                }]
                            },
                            options: {
                                responsive: true,
                                maintainAspectRatio: true,
                                plugins: {
                                    legend: { display: false }
                                },
                                scales: {
                                    y: {
                                        beginAtZero: true,
                                        ticks: { precision: 0 }
                                    }
                                }
                            }
                        });
                    </script>
                ` : ''}

                <h3 class="section-subtitle">네트워크 위협 분석</h3>
                <p style="line-height: 1.8;">${ai.network_threat_analysis?.lateral_movement || '네트워크 위협 분석 정보가 없습니다.'}</p>

                <h3 class="section-subtitle">분석가 의견</h3>
                ${incidents.some((inc: any) => inc.incident.resolve_comment) ? `
                    <div style="background: #f8fafc; border-left: 3px solid #3b82f6; padding: 1rem; margin-top: 1rem; border-radius: 6px;">
                        ${incidents.filter((inc: any) => inc.incident.resolve_comment).slice(0, 3).map((inc: any) => `
                            <div style="margin-bottom: 1rem;">
                                <strong>인시던트 ${inc.incident.incident_id}:</strong>
                                <p style="margin-top: 0.5rem; color: #475569;">${inc.incident.resolve_comment}</p>
                            </div>
                        `).join('')}
                    </div>
                ` : '<p>분석가 의견이 없습니다.</p>'}
            </section>

            <!-- 섹션 5: MITRE ATT&CK 분석 -->
            <section class="section">
                <h2 class="section-title">5. MITRE ATT&CK 분석</h2>

                <h3 class="section-subtitle">주요 전술 (Tactics)</h3>
                ${Object.keys(mitreTactics).length > 0 ? `
                    <div style="margin-bottom: 1.5rem;">
                        ${Object.entries(mitreTactics).sort((a: [string, number], b: [string, number]) => b[1] - a[1]).slice(0, 5).map(([tactic, count]: [string, any], index: number) => `
                            <div style="margin-bottom: 0.5rem;">
                                <strong>${index + 1}. ${tactic}</strong>
                                <span style="color: #64748b; margin-left: 0.5rem;">(${count}회)</span>
                            </div>
                        `).join('')}
                    </div>
                ` : '<div class="no-data">MITRE ATT&CK 전술 데이터가 없습니다.</div>'}

                <h3 class="section-subtitle">주요 전술 엔드포인트 리스트</h3>
                ${Object.keys(mitreTactics).length > 0 ? `
                    <div style="margin-top: 1rem;">
                        ${Object.entries(mitreTactics)
                            .sort((a, b) => b[1] - a[1])
                            .slice(0, 5)
                            .map(([tactic, count]) => {
                                const endpoints = tacticToEndpoints[tactic];
                                return `
                                    <div style="background: #f1f5f9; border-left: 3px solid #3b82f6; padding: 1rem; margin-bottom: 1rem; border-radius: 6px;">
                                        <div style="font-weight: 600; color: #1e293b; margin-bottom: 0.5rem;">
                                            ${tactic}
                                            <span style="color: #64748b; margin-left: 0.5rem; font-weight: normal;">(${count}회 탐지)</span>
                                        </div>
                                        <div style="margin-top: 0.5rem;">
                                            <strong style="font-size: 0.875rem; color: #475569;">영향받은 엔드포인트 (${endpoints?.size || 0}대):</strong>
                                            <div style="margin-top: 0.5rem; display: flex; flex-wrap: wrap; gap: 0.5rem;">
                                                ${endpoints && endpoints.size > 0 ?
                                                    Array.from(endpoints).map(host =>
                                                        `<span style="background: #ffffff; padding: 0.25rem 0.75rem; border-radius: 4px; font-size: 0.875rem; border: 1px solid #e2e8f0;">${host}</span>`
                                                    ).join('') :
                                                    '<span style="color: #94a3b8; font-size: 0.875rem;">엔드포인트 정보 없음</span>'
                                                }
                                            </div>
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                    </div>
                ` : '<div class="no-data">전술별 엔드포인트 데이터가 없습니다.</div>'}

                <h3 class="section-subtitle">탐지된 기법 (Techniques)</h3>
                <div>
                    ${allMitreTechniques.size > 0 ?
                        Array.from(allMitreTechniques).map((tech: string) => `
                            <span class="mitre-technique">${tech}</span>
                        `).join('') :
                        '<div class="no-data">탐지된 MITRE 기법이 없습니다.</div>'
                    }
                </div>

                <h3 class="section-subtitle">공격 체인 분석</h3>
                ${ai.mitre_analysis?.attack_chain ? `
                    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 2rem; border-radius: 12px; margin-bottom: 1.5rem; box-shadow: 0 8px 32px rgba(102, 126, 234, 0.3);">
                        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
                            ${Object.entries(ai.mitre_analysis.attack_chain)
                                .sort((a: any, b: any) => a[0].localeCompare(b[0]))
                                .map(([key, stage]: [string, any], index: number, arr: any[]) => `
                                <div style="flex: 1; min-width: 150px; text-align: center;">
                                    <div style="background: rgba(255,255,255,0.95); border-radius: 8px; padding: 1rem; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                                        <div style="font-weight: 700; color: #5b21b6; font-size: 0.75rem; margin-bottom: 0.5rem;">
                                            ${stage.tactic?.split(' - ')[0] || 'Stage ' + (index + 1)}
                                        </div>
                                        <div style="font-size: 0.875rem; color: #1e293b; font-weight: 600; margin-bottom: 0.5rem;">
                                            ${stage.tactic?.split(' - ')[1] || 'Unknown'}
                                        </div>
                                        <div style="font-size: 0.75rem; color: #64748b;">
                                            ${(stage.incidents || []).length}건
                                        </div>
                                    </div>
                                    ${index < arr.length - 1 ? '<div style="position: absolute; right: -1rem; top: 50%; transform: translateY(-50%); color: white; font-size: 1.5rem;">→</div>' : ''}
                                </div>
                            `).join('')}
                        </div>
                    </div>

                    <div style="margin-top: 1.5rem;">
                        <h4 style="font-size: 1rem; font-weight: 600; color: #475569; margin-bottom: 1rem;">단계별 상세 분석</h4>
                        ${Object.entries(ai.mitre_analysis.attack_chain).map(([key, stage]: [string, any]) => `
                            <div style="background: #f8fafc; border-left: 4px solid #3b82f6; padding: 1rem; margin-bottom: 1rem; border-radius: 6px;">
                                <div style="font-weight: 600; color: #1e293b; margin-bottom: 0.5rem;">
                                    ${stage.tactic}
                                </div>
                                <div style="font-size: 0.875rem; color: #475569; line-height: 1.6;">
                                    ${stage.description}
                                </div>
                                ${(stage.techniques || []).length > 0 ? `
                                    <div style="margin-top: 0.5rem; font-size: 0.75rem; color: #64748b;">
                                        <strong>기법:</strong> ${(stage.techniques || []).join(', ')}
                                    </div>
                                ` : ''}
                                ${(stage.incidents || []).length > 0 ? `
                                    <div style="margin-top: 0.5rem; font-size: 0.75rem; color: #64748b;">
                                        <strong>관련 인시던트:</strong> ${(stage.incidents || []).join(', ')}
                                    </div>
                                ` : ''}
                            </div>
                        `).join('')}
                    </div>

                    ${ai.mitre_analysis.kill_chain_assessment ? `
                        <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 1.5rem; margin-top: 1.5rem; border-radius: 6px;">
                            <h4 style="font-size: 1rem; font-weight: 600; color: #991b1b; margin-bottom: 1rem;">Kill Chain 완성도 평가</h4>
                            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 1rem;">
                                <div>
                                    <div style="font-size: 0.75rem; color: #7f1d1d;">완성도</div>
                                    <div style="font-size: 1.5rem; font-weight: 700; color: #dc2626;">${ai.mitre_analysis.kill_chain_assessment.completeness}</div>
                                </div>
                                <div>
                                    <div style="font-size: 0.75rem; color: #7f1d1d;">위협 수준</div>
                                    <div style="font-size: 1.5rem; font-weight: 700; color: #dc2626;">${ai.mitre_analysis.kill_chain_assessment.threat_level}</div>
                                </div>
                            </div>
                            <div style="font-size: 0.875rem; color: #7f1d1d; line-height: 1.6;">
                                ${ai.mitre_analysis.kill_chain_assessment.reasoning}
                            </div>
                            ${(ai.mitre_analysis.kill_chain_assessment.missing_stages || []).length > 0 ? `
                                <div style="margin-top: 1rem; font-size: 0.875rem; color: #78350f;">
                                    <strong>누락된 단계:</strong> ${(ai.mitre_analysis.kill_chain_assessment.missing_stages || []).join(', ')}
                                </div>
                            ` : ''}
                        </div>
                    ` : ''}
                ` : '<p style="color: #64748b;">MITRE 공격 체인 분석이 없습니다.</p>'}

                <h3 class="section-subtitle">보안 분석가 의견</h3>
                ${ai.mitre_analysis?.summary ? `
                    <div style="background: #f0fdf4; border-left: 3px solid #22c55e; padding: 1rem; margin-top: 1rem; border-radius: 6px;">
                        <p style="line-height: 1.8; color: #14532d;">
                            ${ai.mitre_analysis.summary}
                        </p>
                    </div>
                ` : allMitreTechniques.size > 0 ? `
                    <div style="background: #fef3c7; border-left: 3px solid #f59e0b; padding: 1rem; margin-top: 1rem; border-radius: 6px;">
                        <p style="line-height: 1.8; color: #78350f;">
                            <strong>탐지된 ${allMitreTechniques.size}개 기법 분석:</strong><br>
                            ${Array.from(allMitreTechniques).length > 5 ?
                                `다수의 MITRE 기법이 탐지되었습니다. 특히 Privilege Escalation, Defense Evasion, Process Injection 관련 기법이 포함되어 있어 주의가 필요합니다. 각 기법별로 탐지 규칙을 재검토하고, False Positive 여부를 확인하세요.` :
                                `소수의 MITRE 기법이 탐지되었습니다. 각 기법이 실제 위협인지 정상 소프트웨어 동작인지 확인이 필요합니다.`
                            }
                        </p>
                    </div>
                ` : '<div class="no-data">MITRE 기법 분석 의견이 없습니다.</div>'}
            </section>

            <!-- 섹션 6: 엔드포인트 및 CVE 분석 -->
            <section class="section">
                <h2 class="section-title">6. 엔드포인트 및 CVE 취약점 분석</h2>

                <h3 class="section-subtitle">엔드포인트 통계</h3>
                <div class="info-grid" style="margin-bottom: 1.5rem;">
                    <div class="info-item">
                        <div class="info-label">총 엔드포인트</div>
                        <div class="info-value">${summary.unique_hosts || 0}대</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">총 CVE</div>
                        <div class="info-value">${allCVEs.size}개</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">취약 호스트</div>
                        <div class="info-value">${new Set(allCVEsWithContext.map(c => c.endpoint_name)).size}대</div>
                    </div>
                </div>

                ${allCVEsWithContext.length > 0 ? `
                    <h3 class="section-subtitle">CVE 취약점 리스트</h3>
                    <table class="table">
                        <thead>
                            <tr>
                                <th>CVE ID</th>
                                <th>영향 엔드포인트</th>
                                <th>OS 유형</th>
                                <th>관련 인시던트</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${allCVEsWithContext.map((item: any) => `
                                <tr>
                                    <td><strong>${item.cve}</strong></td>
                                    <td>${item.endpoint_name}</td>
                                    <td>${item.os_type || 'N/A'}</td>
                                    <td>${item.incident_id}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                ` : '<div class="no-data">CVE 취약점이 탐지되지 않았습니다.</div>'}

                <h3 class="section-subtitle">상위 영향 호스트</h3>
                ${data.ai_analysis_data.statistics?.by_host ? `
                    <ul style="padding-left: 1.5rem;">
                        ${Object.entries(data.ai_analysis_data.statistics.by_host).slice(0, 10).map(([host, count]: [string, any]) => `
                            <li><strong>${host}</strong> - ${count}건</li>
                        `).join('')}
                    </ul>
                ` : '<div class="no-data">호스트별 통계가 없습니다.</div>'}
            </section>

            <!-- 섹션 7: AI 종합 의견 -->
            <section class="section">
                <h2 class="section-title">7. AI 종합 의견</h2>

                <h3 class="section-subtitle">위협 평가</h3>
                <div style="background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%); padding: 1.5rem; border-radius: 8px; margin-bottom: 1.5rem;">
                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; text-align: center;">
                        <div>
                            <div style="font-size: 0.875rem; color: #64748b; margin-bottom: 0.5rem;">위험도</div>
                            <div style="font-size: 2rem; font-weight: 700; color: ${riskColor};">
                                ${(ai.threat_assessment?.overall_risk_level || 'MEDIUM').toUpperCase()}
                            </div>
                            <div style="font-size: 0.875rem; color: #64748b;">${ai.threat_assessment?.risk_score || 0}/100</div>
                        </div>
                        <div>
                            <div style="font-size: 0.875rem; color: #64748b; margin-bottom: 0.5rem;">신뢰도</div>
                            <div style="font-size: 2rem; font-weight: 700; color: #3b82f6;">
                                ${ai.threat_assessment?.confidence || 0}%
                            </div>
                        </div>
                        <div>
                            <div style="font-size: 0.875rem; color: #64748b; margin-bottom: 0.5rem;">보안 등급</div>
                            <div style="font-size: 2rem; font-weight: 700; color: ${gradeColor};">
                                ${ai.security_posture_assessment?.overall_grade || 'C'}
                            </div>
                        </div>
                    </div>
                </div>

                <h3 class="section-subtitle">인시던트 분석 의견</h3>
                <p style="line-height: 1.8; margin-bottom: 1.5rem;">
                    ${ai.incident_analysis?.critical_incidents_summary || 'AI 분석 의견이 없습니다.'}
                </p>

                <h3 class="section-subtitle">위협 인텔리전스 인사이트</h3>
                <p style="line-height: 1.8;">
                    ${ai.threat_intelligence_insights?.ioc_summary || '위협 인텔리전스 인사이트가 없습니다.'}
                </p>

                <h3 class="section-subtitle">트렌드 분석</h3>
                ${ai.trending_analysis ? `
                    <div style="margin-top: 1rem;">
                        ${ai.trending_analysis.increasing_threats?.length > 0 ? `
                            <div style="margin-bottom: 1rem;">
                                <strong>증가 추세:</strong>
                                <ul style="padding-left: 1.5rem; margin-top: 0.5rem;">
                                    ${ai.trending_analysis.increasing_threats.map((threat: string) => `<li>${threat}</li>`).join('')}
                                </ul>
                            </div>
                        ` : ''}
                        <p style="color: #64748b; font-style: italic;">${ai.trending_analysis.comparison_notes || ''}</p>
                    </div>
                ` : '<div class="no-data">트렌드 분석 데이터가 없습니다.</div>'}
            </section>

            <!-- 섹션 8: 전체 인시던트 요약 -->
            <section class="section">
                <h2 class="section-title">8. 전체 인시던트 요약</h2>

                <h3 class="section-subtitle">심각도별 분포</h3>
                <table class="table">
                    <thead>
                        <tr>
                            <th>심각도</th>
                            <th>건수</th>
                            <th>비율</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${Object.entries(data.ai_analysis_data.statistics?.by_severity || {}).map(([severity, count]: [string, any]) => `
                            <tr>
                                <td><span class="severity-badge ${severity}">${translateSeverity(severity)}</span></td>
                                <td>${count}건</td>
                                <td>${((count / summary.total_incidents) * 100).toFixed(1)}%</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>

                <h3 class="section-subtitle">상태별 분포</h3>
                <table class="table">
                    <thead>
                        <tr>
                            <th>상태</th>
                            <th>건수</th>
                            <th>비율</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${Object.entries(data.ai_analysis_data.statistics?.by_status || {}).map(([status, count]: [string, any]) => `
                            <tr>
                                <td>${translateStatus(status)}</td>
                                <td>${count}건</td>
                                <td>${((count / summary.total_incidents) * 100).toFixed(1)}%</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>

                <h3 class="section-subtitle">탐지 유형별 분포</h3>
                <table class="table">
                    <thead>
                        <tr>
                            <th>탐지 유형</th>
                            <th>건수</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${Object.entries(data.ai_analysis_data.statistics?.by_detection_type || {}).slice(0, 10).map(([type, count]: [string, any]) => `
                            <tr>
                                <td>${type}</td>
                                <td>${count}건</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>

                <h3 class="section-subtitle">패턴 탐지</h3>
                ${ai.incident_analysis?.patterns_detected?.length > 0 ? `
                    <ul style="padding-left: 1.5rem; line-height: 1.8;">
                        ${ai.incident_analysis.patterns_detected.map((pattern: string) => `
                            <li>${pattern}</li>
                        `).join('')}
                    </ul>
                ` : '<div class="no-data">탐지된 패턴이 없습니다.</div>'}

                <h3 class="section-subtitle">오탐 분석</h3>
                <div style="background: #fef3c7; border-left: 3px solid #f59e0b; padding: 1rem; border-radius: 6px;">
                    <strong>오탐률: ${ai.incident_analysis?.false_positive_rate || '0%'}</strong>
                    <p style="margin-top: 0.5rem;">
                        총 ${summary.total_incidents}건 중 ${summary.false_positive_count || 0}건이 오탐으로 확인되었습니다.
                        실제 위협은 ${ai.incident_analysis?.true_threats_count || 0}건으로 평가됩니다.
                    </p>
                </div>
            </section>

            <!-- 섹션 9: 권고사항 및 플레이북 -->
            <section class="section">
                <h2 class="section-title">9. 권고사항 및 플레이북</h2>

                <h3 class="section-subtitle">🚨 즉시 조치 필요</h3>
                <ul class="recommendation-list">
                    ${(ai.recommendations?.immediate_actions || []).map((action: string) => `
                        <li class="urgent">${action}</li>
                    `).join('')}
                </ul>

                <h3 class="section-subtitle">⏱️ 단기 개선 사항 (1주일 내)</h3>
                <ul class="recommendation-list">
                    ${(ai.recommendations?.short_term_improvements || []).map((action: string) => `
                        <li>${action}</li>
                    `).join('')}
                </ul>

                <h3 class="section-subtitle">📅 장기 개선 사항 (1개월 내)</h3>
                <ul class="recommendation-list">
                    ${(ai.recommendations?.long_term_improvements || []).map((action: string) => `
                        <li>${action}</li>
                    `).join('')}
                </ul>

                <h3 class="section-subtitle">보안 태세 평가</h3>
                <div style="background: #f1f5f9; padding: 1.5rem; border-radius: 8px; margin-top: 1rem;">
                    <div style="margin-bottom: 1rem;">
                        <strong>전체 등급: ${ai.security_posture_assessment?.overall_grade || 'C'}</strong>
                    </div>

                    ${ai.security_posture_assessment?.strengths?.length > 0 ? `
                        <div style="margin-bottom: 1rem;">
                            <strong style="color: #22c55e;">✅ 강점:</strong>
                            <ul style="padding-left: 1.5rem; margin-top: 0.5rem;">
                                ${ai.security_posture_assessment.strengths.map((strength: string) => `
                                    <li>${strength}</li>
                                `).join('')}
                            </ul>
                        </div>
                    ` : ''}

                    ${ai.security_posture_assessment?.weaknesses?.length > 0 ? `
                        <div style="margin-bottom: 1rem;">
                            <strong style="color: #f97316;">⚠️ 약점:</strong>
                            <ul style="padding-left: 1.5rem; margin-top: 0.5rem;">
                                ${ai.security_posture_assessment.weaknesses.map((weakness: string) => `
                                    <li>${weakness}</li>
                                `).join('')}
                            </ul>
                        </div>
                    ` : ''}

                    ${ai.security_posture_assessment?.improvement_priorities?.length > 0 ? `
                        <div>
                            <strong>📋 개선 우선순위:</strong>
                            <ol style="padding-left: 1.5rem; margin-top: 0.5rem;">
                                ${ai.security_posture_assessment.improvement_priorities.map((priority: string) => `
                                    <li>${priority}</li>
                                `).join('')}
                            </ol>
                        </div>
                    ` : ''}
                </div>
            </section>
        </div>

        <div class="footer">
            <p>🤖 AI 기반 일간 보안 보고서</p>
            <p style="margin-top: 0.5rem; font-size: 0.75rem;">
                Generated by DeFender X SIEM · ${new Date().toLocaleString('ko-KR')}
            </p>
        </div>
    </div>

    <script>
        // Severity Chart
        const severityCtx = document.getElementById('severityChart');
        new Chart(severityCtx, {
            type: 'doughnut',
            data: {
                labels: ['Critical', 'High', 'Medium', 'Low'],
                datasets: [{
                    data: [
                        ${summary.critical_count || 0},
                        ${summary.high_count || 0},
                        ${summary.medium_count || 0},
                        ${summary.low_count || 0}
                    ],
                    backgroundColor: ['#ef4444', '#f97316', '#eab308', '#22c55e']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom' },
                    title: { display: true, text: '심각도별 분포' }
                }
            }
        });

        // Status Chart
        const statusCtx = document.getElementById('statusChart');
        new Chart(statusCtx, {
            type: 'bar',
            data: {
                labels: ${JSON.stringify(Object.keys(data.ai_analysis_data.statistics?.by_status || {}))},
                datasets: [{
                    label: '인시던트 수',
                    data: ${JSON.stringify(Object.values(data.ai_analysis_data.statistics?.by_status || {}))},
                    backgroundColor: '#3b82f6'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    title: { display: true, text: '상태별 분포' }
                },
                scales: {
                    y: { beginAtZero: true }
                }
            }
        });
    </script>
</body>
</html>`;
}

/**
 * 종합적인 Markdown 보고서 생성
 */
function generateComprehensiveMarkdown(date: string, data: any, ai: any): string {
  const summary = data.ai_analysis_data.summary;
  const incidents = data.collected_data.incidents;

  // Critical/High 필터링
  const criticalHighIncidents = incidents.filter((inc: any) =>
    inc.incident.severity === 'critical' || inc.incident.severity === 'high'
  );

  // 아티팩트 수집
  const allHashes = new Set<string>();
  incidents.forEach((inc: any) => {
    inc.files.forEach((file: any) => {
      if (file.sha256 || file.file_sha256) {
        allHashes.add(file.sha256 || file.file_sha256);
      }
    });
  });

  const allIPs = new Set<string>();
  incidents.forEach((inc: any) => {
    inc.networks.forEach((net: any) => {
      if (net.remote_ip) allIPs.add(net.remote_ip);
    });
  });

  const allCVEs = new Set<string>();
  incidents.forEach((inc: any) => {
    inc.endpoints.forEach((endpoint: any) => {
      if (endpoint.endpoint_cves && Array.isArray(endpoint.endpoint_cves)) {
        endpoint.endpoint_cves.forEach((cve: string) => allCVEs.add(cve));
      }
    });
  });

  return `# 일간 보안 인시던트 보고서

**날짜**: ${date}
**생성 시각**: ${new Date().toLocaleString('ko-KR')}

---

## 📊 요약

- **총 인시던트**: ${summary.total_incidents}건
- **위험도**: ${(ai.threat_assessment?.overall_risk_level || 'MEDIUM').toUpperCase()} (${ai.threat_assessment?.risk_score || 0}/100)
- **보안 등급**: ${ai.security_posture_assessment?.overall_grade || 'C'}
- **오탐률**: ${((summary.false_positive_count / summary.total_incidents * 100) || 0).toFixed(1)}% (${summary.false_positive_count || 0}/${summary.total_incidents || 0}건)

---

## 📋 종합 요약

${ai.executive_summary || 'AI 분석 요약이 없습니다.'}

---

## 🔍 주요 발견사항

${(ai.threat_assessment?.key_findings || []).map((finding: string, index: number) =>
  `${index + 1}. ${finding}`
).join('\n')}

---

## 📊 통계 분석

### 심각도별 분포

${Object.entries(data.ai_analysis_data.statistics?.by_severity || {}).map(([severity, count]: [string, any]) =>
  `- **${severity}**: ${count}건`
).join('\n')}

### 상태별 분포

${Object.entries(data.ai_analysis_data.statistics?.by_status || {}).map(([status, count]: [string, any]) =>
  `- **${status}**: ${count}건`
).join('\n')}

---

## ⚠️ Critical/High 인시던트 (${criticalHighIncidents.length}건)

${criticalHighIncidents.length > 0 ? criticalHighIncidents.slice(0, 10).map((inc: any, index: number) => `
### ${index + 1}. [${(inc.incident.severity || 'MEDIUM').toUpperCase()}] #${inc.incident.incident_id || 'N/A'}

**설명**: ${inc.incident.description || '설명 없음'}

**분석가 판단**: ${inc.incident.manual_description || 'N/A'}

**통계**:
- 알럿: ${inc.alerts.length}개
- 파일: ${inc.files.length}개
- 네트워크: ${inc.networks.length}건
`).join('\n---\n') : '해당 사항 없음'}

---

## 📦 파일 아티팩트

- **총 해시**: ${allHashes.size}개
- **TI 매칭**: ${data.collected_data.ti_data?.length || 0}개
- **위험 파일**: ${data.ai_analysis_data.threat_intelligence?.threat_files?.length || 0}개

${allHashes.size > 0 ? `\n상세 내용은 HTML 보고서를 참조하세요.` : '파일 아티팩트가 없습니다.'}

---

## 🌐 네트워크 아티팩트

- **총 IP**: ${allIPs.size}개
- **의심 국가**: ${ai.network_threat_analysis?.suspicious_countries?.length || 0}개
- **C2 지표**: ${ai.network_threat_analysis?.c2_indicators?.length || 0}개

${ai.network_threat_analysis?.lateral_movement || '네트워크 위협 분석 정보가 없습니다.'}

---

## 🎯 MITRE ATT&CK 분석

### 주요 전술 (Top 3)

${Object.entries(data.ai_analysis_data.mitre_attack?.tactics_distribution || {}).slice(0, 3).map(([tactic, count]: [string, any], index: number) =>
  `${index + 1}. ${tactic} (${count}회)`
).join('\n')}

### 주요 기법 (Top 5)

${(data.ai_analysis_data.mitre_attack?.techniques || []).slice(0, 5).map((tech: string, index: number) =>
  `${index + 1}. ${tech}`
).join('\n')}

### 공격 체인 분석

${ai.mitre_analysis?.attack_chain ? `
**APT 멀티 스테이지 공격 체인 탐지**

${Object.entries(ai.mitre_analysis.attack_chain)
  .sort((a: any, b: any) => a[0].localeCompare(b[0]))
  .map(([key, stage]: [string, any], index: number) => `
**${index + 1}. ${stage.tactic}**
- ${stage.description}
${(stage.techniques || []).length > 0 ? `- 기법: ${(stage.techniques || []).join(', ')}` : ''}
- 관련 인시던트: ${(stage.incidents || []).join(', ')}
`).join('\n')}

${ai.mitre_analysis.kill_chain_assessment ? `
**Kill Chain 완성도 평가**
- 완성도: ${ai.mitre_analysis.kill_chain_assessment.completeness}
- 위협 수준: ${ai.mitre_analysis.kill_chain_assessment.threat_level}
- 평가: ${ai.mitre_analysis.kill_chain_assessment.reasoning}
${(ai.mitre_analysis.kill_chain_assessment.missing_stages || []).length > 0 ? `- 누락된 단계: ${(ai.mitre_analysis.kill_chain_assessment.missing_stages || []).join(', ')}` : ''}
` : ''}
` : 'MITRE 공격 체인 분석이 없습니다.'}

---

## 🔒 CVE 취약점

- **총 CVE**: ${allCVEs.size}개
- **취약 호스트**: ${incidents.filter((inc: any) => inc.endpoints.some((e: any) => e.endpoint_cves && e.endpoint_cves.length > 0)).length}대

${allCVEs.size > 0 ? `\n상세 CVE 리스트는 HTML 보고서를 참조하세요.` : 'CVE 취약점이 탐지되지 않았습니다.'}

---

## 💡 권고사항

### 🚨 즉시 조치

${(ai.recommendations?.immediate_actions || []).map((action: string, index: number) =>
  `${index + 1}. ${action}`
).join('\n')}

### ⏱️ 단기 개선

${(ai.recommendations?.short_term_improvements || []).map((action: string, index: number) =>
  `${index + 1}. ${action}`
).join('\n')}

### 📅 장기 개선

${(ai.recommendations?.long_term_improvements || []).map((action: string, index: number) =>
  `${index + 1}. ${action}`
).join('\n')}

---

## 🛡️ 보안 태세 평가

### 전체 등급: ${ai.security_posture_assessment?.overall_grade || 'C'}

### ✅ 강점

${(ai.security_posture_assessment?.strengths || []).map((strength: string, index: number) =>
  `${index + 1}. ${strength}`
).join('\n')}

### ⚠️ 약점

${(ai.security_posture_assessment?.weaknesses || []).map((weakness: string, index: number) =>
  `${index + 1}. ${weakness}`
).join('\n')}

### 📋 개선 우선순위

${(ai.security_posture_assessment?.improvement_priorities || []).map((priority: string, index: number) =>
  `${index + 1}. ${priority}`
).join('\n')}

---

**🤖 AI 분석 기반 일간 보안 보고서**
`;
}

/**
 * 위험도 색상 반환
 */
function getRiskColor(risk: string): string {
  const colors: Record<string, string> = {
    critical: '#ef4444',
    high: '#f97316',
    medium: '#eab308',
    low: '#22c55e',
  };
  return colors[risk.toLowerCase()] || '#64748b';
}

/**
 * 등급 색상 반환
 */
function getGradeColor(grade: string): string {
  const colors: Record<string, string> = {
    'A': '#22c55e',
    'B': '#84cc16',
    'C': '#eab308',
    'D': '#f97316',
    'F': '#ef4444',
  };
  return colors[grade.toUpperCase()] || '#64748b';
}
