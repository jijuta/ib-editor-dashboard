#!/usr/bin/env node
/**
 * Korean HTML Report Generator
 * 한글 기반 인시던트 보고서 생성
 */

import { readFile, writeFile, copyFile } from 'fs/promises';
import path from 'path';

/**
 * Verdict 번역
 */
function translateVerdict(verdict: string): string {
  const translations: Record<string, string> = {
    'false_positive': '오탐',
    'true_positive': '실제 위협',
    'needs_investigation': '추가 조사 필요',
    'none': '미분류',
  };
  return translations[verdict] || verdict;
}

/**
 * Severity 번역
 */
function translateSeverity(severity: string): string {
  const translations: Record<string, string> = {
    'high': '높음',
    'medium': '중간',
    'low': '낮음',
    'informational': '정보',
  };
  return translations[severity] || severity;
}

/**
 * Status 번역
 */
function translateStatus(status: string): string {
  const translations: Record<string, string> = {
    'new': '신규',
    'under_investigation': '조사 중',
    'resolved_threat_handled': '해결됨 (위협 처리)',
    'resolved_known_issue': '해결됨 (알려진 이슈)',
    'resolved_duplicate': '해결됨 (중복)',
    'resolved_false_positive': '해결됨 (오탐)',
    'resolved_true_positive': '해결됨 (실제 위협)',
  };
  return translations[status] || status;
}

/**
 * 메인 함수
 */
async function main() {
  const incidentId = process.argv[2];

  if (!incidentId) {
    console.error('Usage: npx tsx script/generate-korean-html-report.ts <incident_id>');
    process.exit(1);
  }

  try {
    console.log(`[Korean Report] 🚀 Generating Korean HTML report for incident: ${incidentId}`);

    // 최신 JSON 파일 찾기
    const { readdirSync } = await import('fs');
    const dir = path.join(process.cwd(), 'data', 'investigations');
    const files = readdirSync(dir)
      .filter(f => f.startsWith(`incident_${incidentId}_`) && f.endsWith('.json'))
      .sort()
      .reverse();

    if (files.length === 0) {
      throw new Error(`No investigation file found for incident ${incidentId}`);
    }

    const latestFile = path.join(dir, files[0]);
    console.log(`[Korean Report] 📄 Reading: ${latestFile}`);

    const rawData = await readFile(latestFile, 'utf-8');
    const data = JSON.parse(rawData);

    const incident = data.incident || {};
    const alerts = data.alerts || [];
    const files_data = data.files || [];
    const networks = data.networks || [];
    const endpoints = data.endpoints || [];
    const ti = data.ti_correlation || {};
    // Claude 분석 우선, 없으면 Azure AI 분석 사용
    const claude = data.claude_analysis || {};
    const analysis = data.analysis || {};
    const aiAnalysis = claude.incident_detail ? claude : null;

    // HTML 생성
    const html = `<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>인시던트 조사 보고서 - ${incidentId}</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.js"></script>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans KR', sans-serif;
            background: #fafafa;
            color: #171717;
            line-height: 1.6;
        }

        .container {
            width: 100%;
            max-width: 100%;
            margin: 0 auto;
        }

        header {
            background: linear-gradient(135deg, #000000 0%, #27272a 100%);
            color: white;
            padding: 60px 80px;
            border-bottom: 1px solid #27272a;
        }

        h1 {
            font-size: 42px;
            font-weight: 700;
            margin-bottom: 15px;
            letter-spacing: -0.02em;
        }

        .header-meta {
            display: flex;
            gap: 30px;
            margin-top: 20px;
            font-size: 15px;
            color: #a1a1aa;
        }

        .section {
            padding: 60px 80px;
            border-bottom: 1px solid #e5e5e5;
            background: white;
        }

        .section:nth-child(even) {
            background: #fafafa;
        }

        .section-title {
            font-size: 32px;
            font-weight: 700;
            margin-bottom: 30px;
            color: #0a0a0a;
            letter-spacing: -0.02em;
        }

        .section-subtitle {
            font-size: 20px;
            font-weight: 600;
            margin: 30px 0 15px 0;
            color: #27272a;
        }

        .card {
            background: white;
            border: 1px solid #e5e5e5;
            border-radius: 8px;
            padding: 24px;
            margin: 20px 0;
        }

        .card-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin: 20px 0;
        }

        .stat-card {
            background: white;
            border: 1px solid #e5e5e5;
            border-radius: 8px;
            padding: 24px;
            text-align: center;
        }

        .stat-value {
            font-size: 48px;
            font-weight: 700;
            color: #0a0a0a;
            margin: 10px 0;
        }

        .stat-label {
            font-size: 14px;
            color: #71717a;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }

        .info-grid {
            display: grid;
            grid-template-columns: 200px 1fr;
            gap: 12px 24px;
            margin: 20px 0;
        }

        .info-label {
            font-weight: 600;
            color: #52525b;
        }

        .info-value {
            color: #18181b;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            background: white;
            border: 1px solid #e5e5e5;
            border-radius: 8px;
            overflow: hidden;
        }

        th {
            background: #fafafa;
            padding: 12px 16px;
            text-align: left;
            font-weight: 600;
            font-size: 13px;
            color: #52525b;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            border-bottom: 1px solid #e5e5e5;
        }

        td {
            padding: 12px 16px;
            border-bottom: 1px solid #f4f4f5;
            color: #18181b;
        }

        tr:last-child td {
            border-bottom: none;
        }

        tr:hover {
            background: #fafafa;
        }

        .badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 6px;
            font-size: 13px;
            font-weight: 600;
            letter-spacing: 0.02em;
        }

        .badge-high {
            background: #fee2e2;
            color: #991b1b;
        }

        .badge-medium {
            background: #fef3c7;
            color: #92400e;
        }

        .badge-low {
            background: #dcfce7;
            color: #166534;
        }

        .badge-threat {
            background: #fee2e2;
            color: #991b1b;
        }

        .badge-unknown {
            background: #f4f4f5;
            color: #52525b;
        }

        .ai-insight {
            background: #f0f9ff;
            border-left: 4px solid #0ea5e9;
            padding: 20px 24px;
            margin: 20px 0;
            border-radius: 8px;
        }

        .ai-insight-title {
            font-size: 16px;
            font-weight: 600;
            color: #0c4a6e;
            margin-bottom: 10px;
        }

        .ai-insight-content {
            color: #0f172a;
            line-height: 1.7;
        }

        .chart-container {
            position: relative;
            height: 300px;
            margin: 30px 0;
        }

        .vt-link {
            color: #0ea5e9;
            text-decoration: none;
            font-family: 'Courier New', monospace;
            font-size: 13px;
        }

        .vt-link:hover {
            text-decoration: underline;
        }

        .print-btn {
            position: fixed;
            top: 20px;
            right: 20px;
            background: #0a0a0a;
            color: white;
            padding: 12px 24px;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 600;
            font-size: 14px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            z-index: 1000;
        }

        .print-btn:hover {
            background: #27272a;
        }

        .playbook {
            background: #fff7ed;
            border: 1px solid #fed7aa;
            border-radius: 8px;
            padding: 24px;
            margin: 20px 0;
        }

        .playbook-title {
            font-size: 18px;
            font-weight: 600;
            color: #9a3412;
            margin-bottom: 15px;
        }

        .playbook-step {
            background: white;
            border-left: 3px solid #fb923c;
            padding: 12px 16px;
            margin: 10px 0;
            border-radius: 4px;
        }

        @media print {
            .print-btn {
                display: none;
            }
        }

        @media (max-width: 768px) {
            header, .section {
                padding: 40px 20px;
            }
            h1 {
                font-size: 32px;
            }
            .card-grid {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <button class="print-btn" onclick="window.print()">📄 보고서 출력</button>

    <div class="container">
        <header>
            <h1>🔍 인시던트 조사 보고서</h1>
            <div class="header-meta">
                <div><strong>인시던트 ID:</strong> ${incidentId}</div>
                <div><strong>생성 시간:</strong> ${new Date().toLocaleString('ko-KR')}</div>
                <div><strong>심각도:</strong> ${translateSeverity(incident.severity)}</div>
            </div>
        </header>

        <!-- 1. 인시던트 상세 -->
        <section class="section">
            <h2 class="section-title">1. 인시던트 상세</h2>

            <h3 class="section-subtitle">기본 정보</h3>
            <div class="info-grid">
                <div class="info-label">인시던트 ID</div>
                <div class="info-value">${incident.incident_id || incidentId}</div>

                <div class="info-label">심각도</div>
                <div class="info-value">
                    <span class="badge badge-${incident.severity}">${translateSeverity(incident.severity)}</span>
                </div>

                <div class="info-label">상태</div>
                <div class="info-value">${translateStatus(incident.status)}</div>

                <div class="info-label">생성 시간</div>
                <div class="info-value">${new Date(incident.creation_time).toLocaleString('ko-KR')}</div>

                <div class="info-label">탐지 시간</div>
                <div class="info-value">${incident.detection_time ? new Date(incident.detection_time).toLocaleString('ko-KR') : 'N/A'}</div>

                <div class="info-label">호스트</div>
                <div class="info-value">${incident.hosts || 'N/A'}</div>

                <div class="info-label">사용자</div>
                <div class="info-value">${incident.users || 'N/A'}</div>

                <div class="info-label">분석가 판단</div>
                <div class="info-value">
                    <span class="badge badge-${incident.manual_severity || 'low'}">${translateVerdict(incident.manual_severity || 'none')}</span>
                </div>
            </div>

            <h3 class="section-subtitle">인시던트 설명</h3>
            <div class="card">
                ${incident.description || '설명 없음'}
            </div>

            ${incident.resolve_comment ? `
            <h3 class="section-subtitle">분석가 판단 상세</h3>
            <div class="card" style="background: #f0fdf4; border-left: 4px solid #16a34a;">
                <div style="margin-bottom: 16px;">
                    <strong style="color: #166534;">원문 (English):</strong><br>
                    <div style="margin-top: 8px; padding: 12px; background: white; border-radius: 6px; font-size: 14px; line-height: 1.6;">
                        ${incident.resolve_comment}
                    </div>
                </div>
                <div>
                    <strong style="color: #166534;">한글 번역:</strong><br>
                    <div style="margin-top: 8px; padding: 12px; background: white; border-radius: 6px; font-size: 14px; line-height: 1.6; color: #3f3f46;">
                        ${incident.resolve_comment_korean || '번역 중... (다음 버전에서 자동 번역 지원)'}
                    </div>
                </div>
            </div>
            ` : ''}

            <h3 class="section-subtitle">인시던트 주요 정보</h3>
            <div class="card-grid">
                <div class="stat-card">
                    <div class="stat-label">총 알럿</div>
                    <div class="stat-value">${alerts.length}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">엔드포인트</div>
                    <div class="stat-value">${endpoints.length}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">파일</div>
                    <div class="stat-value">${files_data.length}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">네트워크</div>
                    <div class="stat-value">${networks.length}</div>
                </div>
            </div>

            ${aiAnalysis?.incident_detail ? `
            <div class="ai-insight">
                <div class="ai-insight-title">🤖 AI 분석 의견 (Claude Sonnet 4.5)</div>
                <div class="ai-insight-content">${aiAnalysis.incident_detail}</div>
            </div>
            ` : analysis.synthesis?.summary ? `
            <div class="ai-insight">
                <div class="ai-insight-title">🤖 AI 분석 의견</div>
                <div class="ai-insight-content">${analysis.synthesis.summary}</div>
            </div>
            ` : ''}
        </section>

        <!-- 2. 파일 아티팩트 -->
        <section class="section">
            <h2 class="section-title">2. 파일 아티팩트 (해시 분석)</h2>

            <h3 class="section-subtitle">분포 통계</h3>
            <div class="chart-container">
                <canvas id="fileChart"></canvas>
            </div>

            <h3 class="section-subtitle">위험 파일 리스트</h3>
            <table>
                <thead>
                    <tr>
                        <th style="width: 40%;">파일 해시 (SHA256)</th>
                        <th>파일명</th>
                        <th>위협 레벨</th>
                        <th>분류</th>
                        <th>VirusTotal</th>
                    </tr>
                </thead>
                <tbody>
                    ${ti.file_hashes?.filter((f: any) => f.verdict === 'threat').slice(0, 20).map((f: any) => {
                      const cleanHash = f.hash?.trim().replace(/^["']|["']$/g, '') || 'N/A';
                      const fileName = f.file_name || files_data.find((file: any) =>
                        file.file_sha256?.trim().replace(/^["']|["']$/g, '') === cleanHash
                      )?.file_name || 'N/A';
                      return `
                    <tr>
                        <td style="font-family: monospace; font-size: 11px; word-break: break-all; max-width: 400px;">${cleanHash}</td>
                        <td style="font-size: 13px;">${fileName}</td>
                        <td><span class="badge badge-threat">${f.threat_level || 'N/A'}</span></td>
                        <td>${f.classification || 'Unknown'}</td>
                        <td>
                            <a href="https://www.virustotal.com/gui/file/${cleanHash}"
                               target="_blank"
                               class="vt-link">🔍 VirusTotal</a>
                        </td>
                    </tr>
                    `;
                    }).join('') || '<tr><td colspan="5" style="text-align: center; color: #71717a;">위협 파일 없음</td></tr>'}
                </tbody>
            </table>

            ${aiAnalysis?.file_artifacts ? `
            <div class="ai-insight">
                <div class="ai-insight-title">🤖 AI 분석 의견 (Claude Sonnet 4.5)</div>
                <div class="ai-insight-content">${aiAnalysis.file_artifacts}</div>
            </div>
            ` : analysis.file_artifacts?.reasoning ? `
            <div class="ai-insight">
                <div class="ai-insight-title">🤖 AI 분석 의견</div>
                <div class="ai-insight-content">${analysis.file_artifacts.reasoning}</div>
            </div>
            ` : ''}
        </section>

        <!-- 3. 네트워크 아티팩트 -->
        <section class="section">
            <h2 class="section-title">3. 네트워크 아티팩트</h2>

            <h3 class="section-subtitle">네트워크 분포 현황</h3>
            <div class="card-grid">
                <div class="stat-card">
                    <div class="stat-label">총 연결</div>
                    <div class="stat-value">${networks.length}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">위협 연결</div>
                    <div class="stat-value" style="${(networks.filter((n: any) => n.reputation === 'malicious' || n.reputation === 'threat').length > 0) ? 'color: #dc2626;' : ''}">${networks.filter((n: any) => n.reputation === 'malicious' || n.reputation === 'threat').length || 0}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">정상 연결</div>
                    <div class="stat-value" style="color: #16a34a;">${networks.filter((n: any) => n.reputation === 'benign' || n.reputation === 'good').length || 0}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">미분류 연결</div>
                    <div class="stat-value">${networks.filter((n: any) => !n.reputation || n.reputation === 'unknown').length || 0}</div>
                </div>
            </div>

            <h3 class="section-subtitle">외부 네트워크 리스트</h3>
            <table>
                <thead>
                    <tr>
                        <th>타입</th>
                        <th>주소</th>
                        <th>국가</th>
                        <th>위협 여부</th>
                    </tr>
                </thead>
                <tbody>
                    ${networks.slice(0, 20).map((n: any) => {
                      // 타입에 따라 주소 표시
                      let address = 'N/A';
                      if (n.type === 'DOMAIN' || n.type === 'domain') {
                        address = n.network_domain || n.network_remote_ip || 'N/A';
                      } else if (n.type === 'URL' || n.type === 'url') {
                        address = n.network_url || 'N/A';
                      } else {
                        address = n.network_remote_ip || n.network_url || n.network_domain || 'N/A';
                      }

                      const country = n.network_country || n.country || 'N/A';
                      const reputation = n.reputation || 'unknown';
                      const hasThreatIntel = n.threat_intel_sources && n.threat_intel_sources.length > 0;
                      const isThreat = reputation === 'malicious' || reputation === 'threat' || hasThreatIntel;

                      return `
                    <tr>
                        <td><span class="badge badge-unknown">${n.type || 'unknown'}</span></td>
                        <td style="font-family: monospace; font-size: 12px; max-width: 300px; overflow: hidden; text-overflow: ellipsis;">${address}</td>
                        <td>${country}</td>
                        <td>${isThreat ? '<span class="badge badge-threat">위협</span>' : '<span class="badge badge-low">정상</span>'}</td>
                    </tr>
                    `;
                    }).join('') || '<tr><td colspan="4" style="text-align: center; color: #71717a;">네트워크 데이터 없음</td></tr>'}
                </tbody>
            </table>

            ${aiAnalysis?.network_artifacts ? `
            <div class="ai-insight">
                <div class="ai-insight-title">🤖 AI 분석 의견 (Claude Sonnet 4.5)</div>
                <div class="ai-insight-content">${aiAnalysis.network_artifacts}</div>
            </div>
            ` : analysis.network_connections?.reasoning ? `
            <div class="ai-insight">
                <div class="ai-insight-title">🤖 AI 분석 의견</div>
                <div class="ai-insight-content">${analysis.network_connections.reasoning}</div>
            </div>
            ` : ''}
        </section>

        <!-- 5. MITRE ATT&CK 분석 -->
        <section class="section">
            <h2 class="section-title">5. MITRE ATT&CK 분석</h2>

            <h3 class="section-subtitle">발견된 MITRE 기법</h3>
            <div class="card-grid">
                ${ti.mitre_techniques?.slice(0, 6).map((m: any) => `
                <div class="card">
                    <div style="font-size: 18px; font-weight: 600; color: #dc2626; margin-bottom: 10px;">
                        ${m.technique_id}: ${m.technique_name || m.name || 'Unknown'}
                    </div>
                    <div style="font-size: 13px; color: #71717a; margin-bottom: 8px;">
                        ${m.tactic || 'Unknown Tactic'}
                    </div>
                    ${m.description ? `
                    <div style="margin-top: 12px;">
                        <div style="font-size: 12px; font-weight: 600; color: #71717a; margin-bottom: 4px;">설명 (English):</div>
                        <div style="font-size: 13px; color: #52525b; line-height: 1.5; margin-bottom: 10px;">
                            ${(m.description || '').substring(0, 150)}...
                        </div>
                        <div style="font-size: 12px; font-weight: 600; color: #71717a; margin-bottom: 4px;">한글 번역:</div>
                        <div style="font-size: 13px; color: #3f3f46; line-height: 1.5;">
                            ${m.description_korean || '번역 중... (다음 버전에서 자동 번역 지원)'}
                        </div>
                    </div>
                    ` : ''}
                </div>
                `).join('') || '<div class="card">탐지된 MITRE ATT&CK 기법 없음</div>'}
            </div>

            ${aiAnalysis?.mitre_analysis ? `
            <div class="ai-insight">
                <div class="ai-insight-title">🤖 AI 분석 의견 (Claude Sonnet 4.5)</div>
                <div class="ai-insight-content">${aiAnalysis.mitre_analysis}</div>
            </div>
            ` : analysis.mitre_techniques?.reasoning ? `
            <div class="ai-insight">
                <div class="ai-insight-title">🤖 AI 분석 의견</div>
                <div class="ai-insight-content">${analysis.mitre_techniques.reasoning}</div>
            </div>
            ` : ''}
        </section>

        <!-- 6. 엔드포인트 분석 -->
        <section class="section">
            <h2 class="section-title">6. 엔드포인트 분석</h2>

            <h3 class="section-subtitle">엔드포인트 주요 정보</h3>
            ${endpoints.slice(0, 5).map((e: any) => `
            <div class="card">
                <div class="info-grid">
                    <div class="info-label">호스트명</div>
                    <div class="info-value">${e.endpoint_name || 'N/A'}</div>

                    <div class="info-label">OS</div>
                    <div class="info-value">${e.endpoint_type || 'N/A'}</div>

                    <div class="info-label">IP 주소</div>
                    <div class="info-value">${e.ip || 'N/A'}</div>

                    <div class="info-label">상태</div>
                    <div class="info-value">${e.endpoint_status || 'N/A'}</div>
                </div>
            </div>
            `).join('') || '<div class="card">엔드포인트 정보 없음</div>'}

            <h3 class="section-subtitle">CVE 현황</h3>
            <div class="card-grid">
                <div class="stat-card">
                    <div class="stat-label">총 CVE</div>
                    <div class="stat-value">${ti.cve_details?.length || 0}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">Critical</div>
                    <div class="stat-value" style="color: #dc2626;">${ti.cve_details?.filter((c: any) => c.severity === 'CRITICAL').length || 0}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">High</div>
                    <div class="stat-value" style="color: #ea580c;">${ti.cve_details?.filter((c: any) => c.severity === 'HIGH').length || 0}</div>
                </div>
            </div>

            ${aiAnalysis?.endpoint_analysis ? `
            <div class="ai-insight">
                <div class="ai-insight-title">🤖 AI 종합 의견 (Claude Sonnet 4.5)</div>
                <div class="ai-insight-content">${aiAnalysis.endpoint_analysis}</div>
            </div>
            ` : analysis.endpoint_vulnerability?.reasoning ? `
            <div class="ai-insight">
                <div class="ai-insight-title">🤖 AI 종합 의견</div>
                <div class="ai-insight-content">${analysis.endpoint_vulnerability.reasoning}</div>
            </div>
            ` : ''}
        </section>

        <!-- 7. AI 종합 의견 -->
        <section class="section">
            <h2 class="section-title">7. AI 종합 의견</h2>

            <div class="card-grid">
                <div class="stat-card">
                    <div class="stat-label">최종 판정</div>
                    <div class="stat-value" style="font-size: 24px;">${translateVerdict(aiAnalysis?.final_verdict?.verdict || analysis.synthesis?.verdict || 'needs_investigation')}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">위험 점수</div>
                    <div class="stat-value" style="color: ${((aiAnalysis?.final_verdict?.risk_score || analysis.synthesis?.risk_score) || 0) > 70 ? '#dc2626' : ((aiAnalysis?.final_verdict?.risk_score || analysis.synthesis?.risk_score) || 0) > 40 ? '#ea580c' : '#16a34a'};">
                        ${aiAnalysis?.final_verdict?.risk_score || analysis.synthesis?.risk_score || 0}/100
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">신뢰도</div>
                    <div class="stat-value" style="font-size: 32px;">${aiAnalysis?.final_verdict?.confidence || analysis.synthesis?.confidence || 0}%</div>
                </div>
            </div>

            ${aiAnalysis?.final_verdict?.summary ? `
            <div class="ai-insight">
                <div class="ai-insight-title">종합 분석 (Claude Sonnet 4.5)</div>
                <div class="ai-insight-content">${aiAnalysis.final_verdict.summary}</div>
            </div>
            ` : analysis.synthesis?.summary ? `
            <div class="ai-insight">
                <div class="ai-insight-title">종합 분석</div>
                <div class="ai-insight-content">${analysis.synthesis.summary}</div>
            </div>
            ` : ''}

            ${aiAnalysis?.final_verdict?.key_findings?.length ? `
            <h3 class="section-subtitle">주요 발견 사항</h3>
            <div class="card">
                <ul style="padding-left: 20px;">
                    ${aiAnalysis.final_verdict.key_findings.map((f: string) => `<li style="margin: 8px 0;">${f}</li>`).join('')}
                </ul>
            </div>
            ` : analysis.synthesis?.key_findings?.length ? `
            <h3 class="section-subtitle">주요 발견 사항</h3>
            <div class="card">
                <ul style="padding-left: 20px;">
                    ${analysis.synthesis.key_findings.map((f: string) => `<li style="margin: 8px 0;">${f}</li>`).join('')}
                </ul>
            </div>
            ` : ''}
        </section>

        <!-- 8. 개별 분석 요약 -->
        <section class="section">
            <h2 class="section-title">8. 개별 분석 요약</h2>

            ${Object.entries(analysis).filter(([key]) => key !== 'synthesis').map(([analyzer, result]: [string, any]) => `
            <div class="card">
                <h3 style="font-size: 18px; font-weight: 600; color: #0a0a0a; margin-bottom: 15px;">
                    ${analyzer === 'analyst_judgment' ? '분석가 판단' :
                      analyzer === 'file_artifacts' ? '파일 분석' :
                      analyzer === 'network_connections' ? '네트워크 분석' :
                      analyzer === 'mitre_techniques' ? 'MITRE 기법' :
                      analyzer === 'cve_vulnerabilities' ? 'CVE 취약점' :
                      analyzer === 'endpoint_vulnerability' ? '엔드포인트' : analyzer}
                </h3>
                <div class="info-grid">
                    <div class="info-label">위험 점수</div>
                    <div class="info-value"><span class="badge badge-${result.risk_score > 7 ? 'high' : result.risk_score > 4 ? 'medium' : 'low'}">${result.risk_score}/10</span></div>

                    <div class="info-label">신뢰도</div>
                    <div class="info-value">${result.confidence}%</div>
                </div>
                ${result.reasoning ? `
                <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #e5e5e5; color: #3f3f46; line-height: 1.7;">
                    ${result.reasoning}
                </div>
                ` : ''}
            </div>
            `).join('')}
        </section>

        <!-- 9. 플레이북 (조치 사항) -->
        <section class="section">
            <h2 class="section-title">9. 플레이북 (권장 조치 사항)</h2>

            <div class="playbook">
                <div class="playbook-title">🎯 권장 조치 사항</div>

                ${(analysis.synthesis?.risk_score || 0) > 70 ? `
                <div class="playbook-step">
                    <strong>1단계: 즉각 격리</strong><br>
                    영향받은 엔드포인트를 네트워크에서 즉시 격리하여 추가 피해를 방지합니다.
                </div>
                <div class="playbook-step">
                    <strong>2단계: 위협 제거</strong><br>
                    탐지된 ${ti.file_hashes?.filter((f: any) => f.verdict === 'threat').length || 0}개의 위협 파일을 삭제하고 시스템을 복구합니다.
                </div>
                <div class="playbook-step">
                    <strong>3단계: 상세 조사</strong><br>
                    공격 경로와 침해 범위를 파악하기 위한 포렌식 조사를 수행합니다.
                </div>
                <div class="playbook-step">
                    <strong>4단계: 보안 강화</strong><br>
                    탐지된 MITRE 기법에 대한 방어 규칙을 업데이트하고 취약점을 패치합니다.
                </div>
                ` : (analysis.synthesis?.risk_score || 0) > 40 ? `
                <div class="playbook-step">
                    <strong>1단계: 추가 조사</strong><br>
                    의심스러운 활동을 면밀히 검토하고 추가 증거를 수집합니다.
                </div>
                <div class="playbook-step">
                    <strong>2단계: 모니터링 강화</strong><br>
                    영향받은 시스템에 대한 모니터링을 강화하여 이상 행위를 조기 탐지합니다.
                </div>
                <div class="playbook-step">
                    <strong>3단계: 로그 분석</strong><br>
                    시스템 로그를 상세히 분석하여 공격 타임라인을 재구성합니다.
                </div>
                ` : `
                <div class="playbook-step">
                    <strong>1단계: 오탐 확인</strong><br>
                    분석가 판단과 AI 분석을 종합하여 오탐 여부를 최종 확인합니다.
                </div>
                <div class="playbook-step">
                    <strong>2단계: 문서화</strong><br>
                    조사 결과를 문서화하고 인시던트를 종료 처리합니다.
                </div>
                <div class="playbook-step">
                    <strong>3단계: 정책 검토</strong><br>
                    유사한 오탐을 방지하기 위해 탐지 정책을 검토하고 개선합니다.
                </div>
                `}

                <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #fed7aa;">
                    <strong>📝 추가 권장 사항:</strong>
                    <ul style="margin-top: 10px; padding-left: 20px;">
                        <li>정기적인 보안 교육 실시</li>
                        <li>EDR/XDR 탐지 규칙 업데이트</li>
                        <li>취약점 패치 적용 (${ti.cve_details?.length || 0}개 CVE)</li>
                        <li>인시던트 대응 플레이북 지속 개선</li>
                    </ul>
                </div>
            </div>
        </section>

        <footer style="padding: 40px 80px; text-align: center; background: #fafafa; border-top: 1px solid #e5e5e5; color: #71717a; font-size: 13px;">
            <p>Incident Investigation System | 보고서 ID: RPT-${incidentId}-${Date.now()}</p>
            <p style="margin-top: 5px;">${new Date().toLocaleString('ko-KR')}</p>
        </footer>
    </div>

    <script>
        // 파일 분포 차트
        const threatCount = ${ti.file_hashes?.filter((f: any) => f.verdict === 'threat').length || 0};
        const unknownCount = ${ti.file_hashes?.filter((f: any) => f.verdict === 'unknown').length || 0};
        const benignCount = ${ti.file_hashes?.filter((f: any) => f.verdict === 'benign').length || 0};

        const ctx = document.getElementById('fileChart');
        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['위협 파일', '미확인 파일', '안전 파일'],
                datasets: [{
                    data: [threatCount, unknownCount, benignCount],
                    backgroundColor: ['#dc2626', '#71717a', '#16a34a'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 20,
                            font: {
                                size: 14
                            }
                        }
                    }
                }
            }
        });
    </script>
</body>
</html>`;

    // HTML 파일 저장
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('.')[0];
    const filename = `incident_${incidentId}_korean_${timestamp}.html`;
    const filepath = path.join(process.cwd(), 'public', 'reports', filename);

    await writeFile(filepath, html, 'utf-8');
    console.log(`[Korean Report] ✅ HTML saved: ${filepath}`);

    // 도메인 설정에 따라 URL 생성
    const reportDomain = process.env.REPORT_DOMAIN;
    const reportUrl = reportDomain
      ? `https://${reportDomain}/reports/${filename}`
      : `http://localhost:40017/reports/${filename}`;

    console.log(`[Korean Report] 🌐 Access: ${reportUrl}`);

    // JSON 복사
    const jsonFilename = filename.replace('.html', '.json');
    const jsonDest = path.join(process.cwd(), 'public', 'reports', jsonFilename);
    await copyFile(latestFile, jsonDest);
    console.log(`[Korean Report] 📄 JSON copied: ${jsonDest}`);

  } catch (error) {
    console.error('[Korean Report] ❌ Error:', error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
