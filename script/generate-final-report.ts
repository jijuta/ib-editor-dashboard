#!/usr/bin/env tsx
/**
 * 최종 보고서 생성기
 * JSON + AI 분석 → HTML/MD/JSON 변환
 * Chart.js 시각화 포함
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';

// 날짜 파라미터
const args = process.argv.slice(2);
const reportDate = args[0] || new Date(Date.now() - 86400000).toISOString().split('T')[0];

console.log('');
console.log('\x1b[36m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m');
console.log('\x1b[36m  📄 최종 보고서 생성\x1b[0m');
console.log(`\x1b[36m  날짜: ${reportDate}\x1b[0m`);
console.log('\x1b[36m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m');
console.log('');

// 1. 데이터 로드
console.log('\x1b[32m1️⃣  데이터 로드 중...\x1b[0m');

const dataFile = `/tmp/daily_incidents_data_${reportDate}.json`;
const aiFile = `/tmp/ai_analysis_${reportDate}.json`;

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

// 2. HTML 생성
console.log('');
console.log('\x1b[32m2️⃣  HTML 보고서 생성 중...\x1b[0m');

const html = generateHTML(reportDate, data, aiAnalysis);
const htmlFile = `public/reports/daily/daily_report_${reportDate}.html`;
writeFileSync(htmlFile, html);

console.log(`✅ HTML 저장: ${htmlFile}`);

// 3. Markdown 생성
console.log('');
console.log('\x1b[32m3️⃣  Markdown 보고서 생성 중...\x1b[0m');

const markdown = generateMarkdown(reportDate, data, aiAnalysis);
const mdFile = `public/reports/daily/daily_report_${reportDate}.md`;
writeFileSync(mdFile, markdown);

console.log(`✅ Markdown 저장: ${mdFile}`);

// 4. JSON 통합
console.log('');
console.log('\x1b[32m4️⃣  JSON 보고서 생성 중...\x1b[0m');

const jsonReport = {
  report_date: reportDate,
  generated_at: new Date().toISOString(),
  data_summary: data.ai_analysis_data.summary,
  ai_analysis: aiAnalysis,
  top_incidents: data.ai_analysis_data.top_incidents.slice(0, 10),
  statistics: data.ai_analysis_data.statistics,
};

const jsonFile = `public/reports/daily/daily_report_${reportDate}.json`;
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
console.log('\x1b[33m💡 HTML 보고서 열기:\x1b[0m');
console.log(`  \x1b[33mxdg-open ${htmlFile}\x1b[0m`);
console.log('');
console.log('\x1b[33m🌐 웹 브라우저 접근:\x1b[0m');
console.log(`  \x1b[33mhttp://localhost:3000/reports/daily/daily_report_${reportDate}.html\x1b[0m`);
console.log('');

// HTML 생성 함수
function generateHTML(date: string, data: any, ai: any): string {
  const summary = data.ai_analysis_data.summary;
  const stats = data.ai_analysis_data.statistics;
  const riskLevel = ai.threat_assessment.overall_risk_level;
  const riskScore = ai.threat_assessment.risk_score;
  const grade = ai.security_posture_assessment.overall_grade;

  // 위험도 색상
  const riskColor = {
    critical: '#dc2626',
    high: '#ea580c',
    medium: '#f59e0b',
    low: '#10b981',
  }[riskLevel] || '#6b7280';

  // 등급 색상
  const gradeColor = {
    A: '#10b981',
    B: '#3b82f6',
    C: '#f59e0b',
    D: '#ea580c',
    F: '#dc2626',
  }[grade] || '#6b7280';

  return `<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>일간 보안 보고서 - ${date}</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.js"></script>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 20px;
            color: #1f2937;
        }
        .container {
            max-width: 1400px;
            margin: 0 auto;
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px;
            text-align: center;
        }
        .header h1 { font-size: 2.5em; margin-bottom: 10px; }
        .header .date { font-size: 1.2em; opacity: 0.9; }
        .content { padding: 40px; }

        .summary-cards {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 40px;
        }
        .card {
            background: #f9fafb;
            border-radius: 12px;
            padding: 20px;
            border-left: 4px solid #667eea;
        }
        .card h3 { font-size: 0.9em; color: #6b7280; margin-bottom: 10px; text-transform: uppercase; }
        .card .value { font-size: 2em; font-weight: bold; color: #1f2937; }
        .card.risk { border-color: ${riskColor}; }
        .card.risk .value { color: ${riskColor}; }
        .card.grade { border-color: ${gradeColor}; }
        .card.grade .value { color: ${gradeColor}; }

        .section {
            background: white;
            border-radius: 12px;
            padding: 30px;
            margin-bottom: 30px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        }
        .section h2 {
            font-size: 1.8em;
            margin-bottom: 20px;
            color: #1f2937;
            border-bottom: 3px solid #667eea;
            padding-bottom: 10px;
        }

        .chart-container {
            position: relative;
            height: 300px;
            margin: 20px 0;
        }
        .chart-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
            gap: 30px;
        }

        .findings-list {
            list-style: none;
            padding: 0;
        }
        .findings-list li {
            padding: 15px;
            margin-bottom: 10px;
            background: #f9fafb;
            border-left: 4px solid #667eea;
            border-radius: 8px;
        }
        .findings-list li:before {
            content: "•";
            color: #667eea;
            font-weight: bold;
            font-size: 1.5em;
            margin-right: 10px;
        }

        .recommendations {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
        }
        .rec-box {
            background: #f0fdf4;
            border: 2px solid #10b981;
            border-radius: 12px;
            padding: 20px;
        }
        .rec-box.immediate { background: #fef2f2; border-color: #dc2626; }
        .rec-box.short-term { background: #fef9f3; border-color: #f59e0b; }
        .rec-box h3 {
            font-size: 1.2em;
            margin-bottom: 15px;
            color: #1f2937;
        }
        .rec-box ul {
            list-style: none;
            padding-left: 0;
        }
        .rec-box li {
            padding: 8px 0;
            border-bottom: 1px solid rgba(0,0,0,0.05);
        }
        .rec-box li:last-child { border-bottom: none; }

        .incident-card {
            background: #f9fafb;
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 20px;
            border-left: 4px solid #f59e0b;
        }
        .incident-card.critical { border-color: #dc2626; }
        .incident-card.high { border-color: #ea580c; }
        .incident-card.medium { border-color: #f59e0b; }
        .incident-card.low { border-color: #10b981; }
        .incident-card h3 {
            font-size: 1.2em;
            margin-bottom: 10px;
            color: #1f2937;
        }
        .incident-card .badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 0.85em;
            font-weight: bold;
            margin-right: 10px;
            text-transform: uppercase;
        }
        .incident-card .badge.critical { background: #dc2626; color: white; }
        .incident-card .badge.high { background: #ea580c; color: white; }
        .incident-card .badge.medium { background: #f59e0b; color: white; }
        .incident-card .badge.low { background: #10b981; color: white; }

        .footer {
            background: #1f2937;
            color: white;
            padding: 20px;
            text-align: center;
        }

        @media print {
            body { background: white; padding: 0; }
            .container { box-shadow: none; }
            .section { page-break-inside: avoid; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🛡️ 일간 보안 인시던트 보고서</h1>
            <div class="date">${date}</div>
        </div>

        <div class="content">
            <!-- Summary Cards -->
            <div class="summary-cards">
                <div class="card">
                    <h3>총 인시던트</h3>
                    <div class="value">${summary.total_incidents}건</div>
                </div>
                <div class="card risk">
                    <h3>위험도</h3>
                    <div class="value">${riskLevel.toUpperCase()} (${riskScore}/100)</div>
                </div>
                <div class="card grade">
                    <h3>보안 등급</h3>
                    <div class="value">${grade}</div>
                </div>
                <div class="card">
                    <h3>오탐률</h3>
                    <div class="value">${ai.incident_analysis.false_positive_rate}</div>
                </div>
            </div>

            <!-- Executive Summary -->
            <div class="section">
                <h2>📋 종합 요약</h2>
                <p style="font-size: 1.1em; line-height: 1.8; color: #4b5563;">
                    ${ai.executive_summary}
                </p>
            </div>

            <!-- Key Findings -->
            <div class="section">
                <h2>🔍 주요 발견사항</h2>
                <ul class="findings-list">
                    ${ai.threat_assessment.key_findings.map((f: string) => `<li>${f}</li>`).join('')}
                </ul>
            </div>

            <!-- Statistics Charts -->
            <div class="section">
                <h2>📊 통계 분석</h2>
                <div class="chart-grid">
                    <div>
                        <h3 style="text-align: center; margin-bottom: 20px;">심각도별 분포</h3>
                        <div class="chart-container">
                            <canvas id="severityChart"></canvas>
                        </div>
                    </div>
                    <div>
                        <h3 style="text-align: center; margin-bottom: 20px;">상태별 분포</h3>
                        <div class="chart-container">
                            <canvas id="statusChart"></canvas>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Top Incidents -->
            <div class="section">
                <h2>⚠️ 상위 인시던트 (Top 5)</h2>
                ${data.ai_analysis_data.top_incidents.slice(0, 5).map((inc: any, idx: number) => `
                    <div class="incident-card ${inc.severity || 'medium'}">
                        <h3>
                            <span class="badge ${inc.severity || 'medium'}">${(inc.severity || 'medium').toUpperCase()}</span>
                            #${inc.incident_id || 'N/A'} - ${(inc.description || 'N/A').substring(0, 100)}...
                        </h3>
                        <p style="margin-top: 10px; color: #6b7280;">
                            <strong>분석가 판단:</strong> ${(inc.resolve_comment || 'N/A').substring(0, 200)}...
                        </p>
                        <p style="margin-top: 10px; font-size: 0.9em; color: #9ca3af;">
                            알럿: ${inc.alerts_count || 0}개 |
                            파일: ${inc.files_summary?.total || 0}개 |
                            네트워크: ${inc.network_summary?.total || 0}건
                        </p>
                    </div>
                `).join('')}
            </div>

            <!-- MITRE ATT&CK -->
            <div class="section">
                <h2>🎯 MITRE ATT&CK 분석</h2>
                <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                    <h3 style="margin-bottom: 15px;">주요 전술 (Top 3)</h3>
                    <ul style="list-style: none; padding: 0;">
                        ${ai.mitre_attack_analysis.primary_tactics.map((t: string) => `
                            <li style="padding: 10px; background: white; margin-bottom: 8px; border-radius: 6px;">
                                ${t}
                            </li>
                        `).join('')}
                    </ul>
                </div>
                <div style="background: #f9fafb; padding: 20px; border-radius: 8px;">
                    <h3 style="margin-bottom: 15px;">주요 기법 (Top 5)</h3>
                    <ul style="list-style: none; padding: 0;">
                        ${ai.mitre_attack_analysis.primary_techniques.map((t: string) => `
                            <li style="padding: 10px; background: white; margin-bottom: 8px; border-radius: 6px;">
                                ${t}
                            </li>
                        `).join('')}
                    </ul>
                </div>
                <div style="margin-top: 20px; padding: 20px; background: #eff6ff; border-radius: 8px;">
                    <h3 style="margin-bottom: 10px;">공격 체인 분석</h3>
                    <p style="line-height: 1.8; color: #1f2937;">
                        ${ai.mitre_attack_analysis.attack_chain_analysis}
                    </p>
                </div>
            </div>

            <!-- Recommendations -->
            <div class="section">
                <h2>💡 권고사항</h2>
                <div class="recommendations">
                    <div class="rec-box immediate">
                        <h3>🚨 즉시 조치</h3>
                        <ul>
                            ${ai.recommendations.immediate_actions.map((a: string) => `<li>${a}</li>`).join('')}
                        </ul>
                    </div>
                    <div class="rec-box short-term">
                        <h3>⏱️ 단기 개선</h3>
                        <ul>
                            ${ai.recommendations.short_term.map((a: string) => `<li>${a}</li>`).join('')}
                        </ul>
                    </div>
                    <div class="rec-box">
                        <h3>📅 장기 개선</h3>
                        <ul>
                            ${ai.recommendations.long_term.map((a: string) => `<li>${a}</li>`).join('')}
                        </ul>
                    </div>
                </div>
            </div>

            <!-- Security Posture -->
            <div class="section">
                <h2>🛡️ 보안 태세 평가</h2>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                    <div style="background: #f0fdf4; padding: 20px; border-radius: 8px;">
                        <h3 style="color: #10b981; margin-bottom: 15px;">✅ 강점</h3>
                        <ul style="list-style: none; padding: 0;">
                            ${ai.security_posture_assessment.strengths.map((s: string) => `
                                <li style="padding: 8px 0; border-bottom: 1px solid rgba(0,0,0,0.05);">${s}</li>
                            `).join('')}
                        </ul>
                    </div>
                    <div style="background: #fef2f2; padding: 20px; border-radius: 8px;">
                        <h3 style="color: #dc2626; margin-bottom: 15px;">⚠️ 약점</h3>
                        <ul style="list-style: none; padding: 0;">
                            ${ai.security_posture_assessment.weaknesses.map((w: string) => `
                                <li style="padding: 8px 0; border-bottom: 1px solid rgba(0,0,0,0.05);">${w}</li>
                            `).join('')}
                        </ul>
                    </div>
                </div>
                <div style="margin-top: 20px; padding: 20px; background: #fef9f3; border-radius: 8px;">
                    <h3 style="margin-bottom: 15px;">📋 개선 우선순위</h3>
                    <ol style="padding-left: 20px; line-height: 2;">
                        ${ai.security_posture_assessment.improvement_priority.map((p: string) => `<li>${p}</li>`).join('')}
                    </ol>
                </div>
            </div>
        </div>

        <div class="footer">
            <p>생성 시각: ${new Date().toLocaleString('ko-KR')}</p>
            <p style="margin-top: 10px; opacity: 0.8;">🤖 AI 분석 기반 일간 보안 보고서</p>
        </div>
    </div>

    <script>
        // 심각도별 차트
        const severityCtx = document.getElementById('severityChart').getContext('2d');
        new Chart(severityCtx, {
            type: 'doughnut',
            data: {
                labels: ${JSON.stringify(Object.keys(stats.by_severity))},
                datasets: [{
                    data: ${JSON.stringify(Object.values(stats.by_severity))},
                    backgroundColor: ['#dc2626', '#ea580c', '#f59e0b', '#10b981'],
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom' }
                }
            }
        });

        // 상태별 차트
        const statusCtx = document.getElementById('statusChart').getContext('2d');
        new Chart(statusCtx, {
            type: 'bar',
            data: {
                labels: ${JSON.stringify(Object.keys(stats.by_status).map((s: string) => s.replace('resolved_', '')))},
                datasets: [{
                    label: '건수',
                    data: ${JSON.stringify(Object.values(stats.by_status))},
                    backgroundColor: '#667eea',
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
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

// Markdown 생성 함수
function generateMarkdown(date: string, data: any, ai: any): string {
  const summary = data.ai_analysis_data.summary;

  return `# 일간 보안 인시던트 보고서

**날짜**: ${date}
**생성 시각**: ${new Date().toLocaleString('ko-KR')}

---

## 📊 요약

- **총 인시던트**: ${summary.total_incidents}건
- **위험도**: ${ai.threat_assessment.overall_risk_level.toUpperCase()} (${ai.threat_assessment.risk_score}/100)
- **보안 등급**: ${ai.security_posture_assessment.overall_grade}
- **오탐률**: ${ai.incident_analysis.false_positive_rate}

---

## 📋 종합 요약

${ai.executive_summary}

---

## 🔍 주요 발견사항

${ai.threat_assessment.key_findings.map((f: string, i: number) => `${i + 1}. ${f}`).join('\n')}

---

## 📊 통계 분석

### 심각도별 분포

${Object.entries(data.ai_analysis_data.statistics.by_severity)
    .map(([severity, count]) => `- **${severity}**: ${count}건`)
    .join('\n')}

### 상태별 분포

${Object.entries(data.ai_analysis_data.statistics.by_status)
    .map(([status, count]) => `- **${status}**: ${count}건`)
    .join('\n')}

---

## ⚠️ 상위 인시던트 (Top 5)

${data.ai_analysis_data.top_incidents.slice(0, 5).map((inc: any, idx: number) => `
### ${idx + 1}. [${(inc.severity || 'medium').toUpperCase()}] #${inc.incident_id || 'N/A'}

**설명**: ${inc.description || 'N/A'}

**분석가 판단**: ${inc.resolve_comment || 'N/A'}

**통계**:
- 알럿: ${inc.alerts_count || 0}개
- 파일: ${inc.files_summary?.total || 0}개
- 네트워크: ${inc.network_summary?.total || 0}건
`).join('\n---\n')}

---

## 🎯 MITRE ATT&CK 분석

### 주요 전술 (Top 3)

${ai.mitre_attack_analysis.primary_tactics.map((t: string, i: number) => `${i + 1}. ${t}`).join('\n')}

### 주요 기법 (Top 5)

${ai.mitre_attack_analysis.primary_techniques.map((t: string, i: number) => `${i + 1}. ${t}`).join('\n')}

### 공격 체인 분석

${ai.mitre_attack_analysis.attack_chain_analysis}

---

## 💡 권고사항

### 🚨 즉시 조치

${ai.recommendations.immediate_actions.map((a: string, i: number) => `${i + 1}. ${a}`).join('\n')}

### ⏱️ 단기 개선

${ai.recommendations.short_term.map((a: string, i: number) => `${i + 1}. ${a}`).join('\n')}

### 📅 장기 개선

${ai.recommendations.long_term.map((a: string, i: number) => `${i + 1}. ${a}`).join('\n')}

---

## 🛡️ 보안 태세 평가

### 전체 등급: ${ai.security_posture_assessment.overall_grade}

### ✅ 강점

${ai.security_posture_assessment.strengths.map((s: string, i: number) => `${i + 1}. ${s}`).join('\n')}

### ⚠️ 약점

${ai.security_posture_assessment.weaknesses.map((w: string, i: number) => `${i + 1}. ${w}`).join('\n')}

### 📋 개선 우선순위

${ai.security_posture_assessment.improvement_priority.map((p: string, i: number) => `${i + 1}. ${p}`).join('\n')}

---

**🤖 AI 분석 기반 일간 보안 보고서**
`;
}
