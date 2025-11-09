#!/usr/bin/env node
/**
 * HTML Report Generator
 * 인시던트 데이터를 수집하고 HTML 보고서 생성
 */

import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import { collectReportData } from './report-data-collector.js';
import { sendAllNotifications } from './supabase-notifier.js';

/**
 * HTML 템플릿에 데이터 삽입
 */
async function generateHtmlReport(data: any): Promise<string> {
  // 간단한 템플릿 사용 (CDN 없이, 가벼운 버전)
  const templatePath = path.join(process.cwd(), 'templates', 'simple-report-template.html');
  let html = await readFile(templatePath, 'utf-8');

  const incident = data.investigation.incident;
  const summary = data.summary;

  // 기본 정보
  html = html.replace(/\{\{INCIDENT_ID\}\}/g, data.incident_id);
  html = html.replace(/\{\{TIMESTAMP\}\}/g, new Date().toLocaleString());
  html = html.replace(/\{\{REPORT_ID\}\}/g, Date.now().toString());
  html = html.replace(/\{\{TI_THREATS\}\}/g, String(summary.ti_threat_files + summary.ti_threat_ips));

  // Severity 색상
  const severityColor = summary.severity === 'high' ? 'bg-red-500' :
                        summary.severity === 'medium' ? 'bg-yellow-500' : 'bg-green-500';
  html = html.replace(/\{\{SEVERITY_COLOR\}\}/g, severityColor);
  html = html.replace(/\{\{SEVERITY\}\}/g, (summary.severity || 'N/A').toUpperCase());
  html = html.replace(/\{\{ORIGINAL_SEVERITY\}\}/g, incident.severity || 'N/A');

  // 임시 값 (Claude가 분석 안 했으므로)
  html = html.replace(/\{\{RISK_SCORE\}\}/g, '75');
  html = html.replace(/\{\{VERDICT\}\}/g, 'NEEDS_INVESTIGATION');
  html = html.replace(/\{\{VERDICT_COLOR\}\}/g, 'bg-yellow-500');
  html = html.replace(/\{\{CONFIDENCE\}\}/g, '80');

  // 통계
  html = html.replace(/\{\{TOTAL_ALERTS\}\}/g, String(summary.total_alerts));
  html = html.replace(/\{\{TOTAL_FILES\}\}/g, String(summary.total_files));
  html = html.replace(/\{\{TOTAL_NETWORKS\}\}/g, String(summary.total_networks));
  html = html.replace(/\{\{TOTAL_PROCESSES\}\}/g, String(summary.total_processes));
  html = html.replace(/\{\{TOTAL_ENDPOINTS\}\}/g, String(summary.total_endpoints));
  html = html.replace(/\{\{TOTAL_CVES\}\}/g, String(summary.total_cves));
  html = html.replace(/\{\{TI_THREATS\}\}/g, String(summary.ti_threat_files + summary.ti_threat_ips));
  html = html.replace(/\{\{TI_MATCHED_FILES\}\}/g, String(summary.ti_matched_files));
  html = html.replace(/\{\{TI_THREAT_FILES\}\}/g, String(summary.ti_threat_files));
  html = html.replace(/\{\{TI_MATCHED_IPS\}\}/g, String(summary.ti_matched_ips));
  html = html.replace(/\{\{TI_THREAT_IPS\}\}/g, String(summary.ti_threat_ips));

  // 인시던트 상세
  html = html.replace(/\{\{CREATION_TIME\}\}/g, new Date(incident.creation_time).toLocaleString());
  html = html.replace(/\{\{DETECTION_TIME\}\}/g, new Date(incident.detection_time).toLocaleString());
  html = html.replace(/\{\{STATUS\}\}/g, incident.status || 'N/A');
  html = html.replace(/\{\{STATUS_COLOR\}\}/g, 'bg-blue-100 text-blue-800');
  html = html.replace(/\{\{DESCRIPTION\}\}/g, incident.description || 'No description');

  // MITRE ATT&CK
  const mitreHtml = data.ti_correlation.mitre_techniques
    .map((m: any) => `
      <div class="mitre-card">
        <div class="mitre-id">${m.technique_id}: ${m.name}</div>
        <div class="mitre-tactic">${m.tactic || 'Unknown Tactic'}</div>
        <div class="mitre-desc">${(m.description || '').substring(0, 150)}...</div>
      </div>
    `)
    .join('') || '<p>No MITRE ATT&CK techniques detected.</p>';
  html = html.replace(/\{\{MITRE_TECHNIQUES\}\}/g, mitreHtml);

  // TI 파일 해시 테이블
  const fileHashRows = data.ti_correlation.file_hashes
    .slice(0, 10)
    .map((f: any) => {
      const verdictClass = f.verdict === 'threat' ? 'threat' :
                          f.verdict === 'unknown' ? 'unknown' : 'benign';
      return `
        <tr>
          <td style="font-family: monospace; font-size: 12px;">${f.hash.substring(0, 24)}...</td>
          <td><span class="badge ${verdictClass}">${f.verdict.toUpperCase()}</span></td>
          <td>${f.threat_level || 'N/A'}</td>
          <td>${f.source || 'Internal TI'}</td>
        </tr>
      `;
    })
    .join('') || '<tr><td colspan="4" style="text-align: center; color: #999;">No file hash data</td></tr>';
  html = html.replace(/\{\{FILE_HASH_ROWS\}\}/g, fileHashRows);

  // TI IP 주소 테이블
  const ipRows = data.ti_correlation.ip_addresses
    .slice(0, 10)
    .map((ip: any) => {
      const verdictClass = ip.verdict === 'threat' ? 'threat' :
                          ip.verdict === 'unknown' ? 'unknown' : 'benign';
      return `
        <tr>
          <td style="font-family: monospace;">${ip.ip}</td>
          <td><span class="badge ${verdictClass}">${ip.verdict.toUpperCase()}</span></td>
          <td>${ip.country || 'N/A'}</td>
          <td>${ip.isp || 'N/A'}</td>
        </tr>
      `;
    })
    .join('') || '<tr><td colspan="4" style="text-align: center; color: #999;">No IP address data</td></tr>';
  html = html.replace(/\{\{IP_ADDRESS_ROWS\}\}/g, ipRows);

  // 간단한 템플릿에는 KEY_FINDINGS와 RECOMMENDATIONS가 이미 포함되어 있음
  // Timeline 부분은 제거됨

  return html;
}

/**
 * 메인 함수
 */
async function main() {
  const incidentId = process.argv[2];

  if (!incidentId) {
    console.error('Usage: npx tsx script/generate-html-report.ts <incident_id>');
    process.exit(1);
  }

  try {
    console.log(`[Report] 🚀 Generating HTML report for incident: ${incidentId}`);

    // 1. 데이터 수집
    const data = await collectReportData(incidentId);

    // 2. HTML 생성
    console.log(`[Report] 📝 Generating HTML...`);
    const html = await generateHtmlReport(data);

    // 3. 파일 저장 (public/reports에 저장)
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('.')[0];
    const filename = `incident_${incidentId}_${timestamp}.html`;
    const filepath = path.join(process.cwd(), 'public', 'reports', filename);

    await writeFile(filepath, html, 'utf-8');
    console.log(`[Report] ✅ HTML report saved: ${filepath}`);
    console.log(`[Report] 🌐 Access via web: http://localhost:3000/reports/${filename}`);

    // 4. JSON 저장 (public/reports에 저장)
    const jsonFilename = filename.replace('.html', '.json');
    const jsonFilepath = path.join(process.cwd(), 'public', 'reports', jsonFilename);
    await writeFile(jsonFilepath, JSON.stringify(data, null, 2), 'utf-8');
    console.log(`[Report] 📄 JSON data saved: ${jsonFilepath}`);
    console.log(`[Report] 📊 Access JSON via web: http://localhost:3000/reports/${jsonFilename}`);

    // 5. 알림 전송
    console.log(`[Report] 📢 Sending notifications...`);
    await sendAllNotifications(incidentId, filepath, {
      report_type: 'single',
      risk_score: 75,
      verdict: 'NEEDS_INVESTIGATION',
      generated_at: new Date().toISOString(),
      generated_by: 'cli',
    });

    console.log(`[Report] 🎉 Report generation complete!`);
    console.log(`[Report] 🌐 Open: ${filepath}`);

  } catch (error) {
    console.error('[Report] ❌ Error:', error);
    process.exit(1);
  }
}

// 실행
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { generateHtmlReport };
