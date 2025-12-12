// @ts-nocheck
/**
 * Markdown Formatter
 * Investigation 데이터를 마크다운으로 포맷팅
 */

import type { InvestigationData } from './investigation-cache.js';

/**
 * Investigation 데이터를 마크다운으로 포맷팅
 */
export function formatInvestigationAsMarkdown(
  investigation: InvestigationData,
  jsonPath?: string
): string {
  let markdown = `# 🔍 Incident Investigation: ${investigation.incident_id}\n\n`;

  // JSON 파일 경로
  if (jsonPath) {
    markdown += `**상세 데이터**: \`${jsonPath}\`\n\n`;
  }

  markdown += `---\n\n`;

  // 1. 인시던트 기본 정보
  markdown += `## 📋 Incident Overview\n\n`;

  const incident = investigation.incident;
  if (incident) {
    markdown += `- **ID**: ${incident.incident_id}\n`;
    markdown += `- **Name**: ${incident.incident_name || 'N/A'}\n`;
    markdown += `- **Severity**: ${incident.severity || 'unknown'}\n`;
    markdown += `- **Manual Severity**: ${incident.manual_severity || 'none'}\n`;
    markdown += `- **Status**: ${incident.status || 'unknown'}\n`;
    markdown += `- **Creation Time**: ${incident.creation_time || 'N/A'}\n`;
    markdown += `- **Detection Time**: ${incident.detection_time || 'N/A'}\n`;
    markdown += `- **Hosts**: ${incident.hosts?.join(', ') || 'N/A'}\n`;
    markdown += `- **Users**: ${incident.users?.join(', ') || 'N/A'}\n`;
    markdown += `- **Description**: ${incident.description || 'N/A'}\n`;

    // 분석가 판단
    if (incident.notes) {
      markdown += `\n**분석가 판단**:\n\`\`\`\n${incident.notes}\n\`\`\`\n`;
    }

    // MITRE 기법
    if (incident.mitre_techniques_ids_and_names?.length > 0) {
      markdown += `\n**MITRE Techniques**:\n`;
      incident.mitre_techniques_ids_and_names.forEach((tech: string) => {
        markdown += `- ${tech}\n`;
      });
    }
  }

  markdown += `\n---\n\n`;

  // 2. 요약 통계
  markdown += `## 📊 Summary Statistics\n\n`;
  const summary = investigation.summary;

  markdown += `| Category | Count |\n`;
  markdown += `|----------|-------|\n`;
  markdown += `| **Total Alerts** | ${summary.total_alerts} |\n`;
  markdown += `| **Endpoints** | ${summary.total_endpoints} |\n`;
  markdown += `| **Files** | ${summary.total_files} |\n`;
  markdown += `| **Networks** | ${summary.total_networks} |\n`;
  markdown += `| **Processes** | ${summary.total_processes} |\n`;
  markdown += `| **Causality Chains** | ${summary.total_causality_chains} |\n`;
  markdown += `| **Registry** | ${summary.total_registry} |\n`;
  markdown += `| **CVEs** | ${summary.total_cves} |\n\n`;

  // TI 상관 통계
  if (summary.ti_matched_files !== undefined) {
    markdown += `### 🔗 TI Correlation\n\n`;
    markdown += `| TI Category | Count |\n`;
    markdown += `|-------------|-------|\n`;
    markdown += `| **Files Matched** | ${summary.ti_matched_files} |\n`;
    markdown += `| **Threat Files** | ${summary.ti_threat_files || 0} |\n`;
    markdown += `| **IPs Matched** | ${summary.ti_matched_ips || 0} |\n`;
    markdown += `| **Threat IPs** | ${summary.ti_threat_ips || 0} |\n\n`;
  }

  markdown += `---\n\n`;

  // 3. TI 상관 분석 결과
  if (investigation.ti_correlation) {
    const ti = investigation.ti_correlation;

    // 3-1. 파일 해시 TI 매칭
    if (ti.file_hashes && ti.file_hashes.length > 0) {
      markdown += `## 🗂️ File Hash TI Correlation\n\n`;

      const threats = ti.file_hashes.filter((h: any) => h.verdict === 'threat');
      const unknowns = ti.file_hashes.filter((h: any) => h.verdict === 'unknown');
      const benigns = ti.file_hashes.filter((h: any) => h.verdict === 'benign');

      markdown += `**총 ${ti.file_hashes.length}개 파일**:\n`;
      markdown += `- 🔴 위협 (Threat): ${threats.length}개\n`;
      markdown += `- ⚠️ 미확인 (Unknown): ${unknowns.length}개\n`;
      markdown += `- ✅ 안전 (Benign): ${benigns.length}개\n\n`;

      // 위협 파일 상세
      if (threats.length > 0) {
        markdown += `### 🔴 위협 파일 상세\n\n`;
        threats.forEach((h: any, idx: number) => {
          markdown += `**${idx + 1}. ${h.hash}**\n`;
          markdown += `- 위협 레벨: ${h.threat_level}\n`;
          markdown += `- 분류: ${h.mal_family || 'Unknown'}\n`;
          if (h.mitre_techniques) {
            markdown += `- MITRE: ${h.mitre_techniques}\n`;
          }
          markdown += `\n`;
        });
      }

      // 미확인 파일 상세 (최대 10개)
      if (unknowns.length > 0) {
        markdown += `### ⚠️ 미확인 파일 상세 (TI DB에 매칭되었으나 위협 레벨 낮음)\n\n`;
        unknowns.slice(0, 10).forEach((h: any, idx: number) => {
          markdown += `**${idx + 1}. ${h.hash}**\n`;
          markdown += `- 위협 레벨: ${h.threat_level}\n`;
          markdown += `- 분류: ${h.mal_family || 'Unknown'}\n`;
          markdown += `\n`;
        });

        if (unknowns.length > 10) {
          markdown += `... 그 외 ${unknowns.length - 10}개\n\n`;
        }
      }

      // 안전 파일 요약
      if (benigns.length > 0) {
        markdown += `### ✅ 안전 파일\n\n`;
        markdown += `**${benigns.length}개** 파일이 안전한 것으로 확인되었습니다.\n\n`;
      }
    }

    // 3-2. IP 주소 TI 매칭
    if (ti.ip_addresses && ti.ip_addresses.length > 0) {
      markdown += `## 🌐 IP Address TI Correlation\n\n`;

      const threatIPs = ti.ip_addresses.filter((ip: any) => ip.verdict === 'threat');
      const unknownIPs = ti.ip_addresses.filter((ip: any) => ip.verdict === 'unknown');
      const benignIPs = ti.ip_addresses.filter((ip: any) => ip.verdict === 'benign');

      markdown += `**총 ${ti.ip_addresses.length}개 IP**:\n`;
      markdown += `- 🔴 위협 (Threat): ${threatIPs.length}개\n`;
      markdown += `- ⚠️ 미확인 (Unknown): ${unknownIPs.length}개\n`;
      markdown += `- ✅ 안전 (Benign): ${benignIPs.length}개\n\n`;

      // 위협 IP 상세
      if (threatIPs.length > 0) {
        markdown += `### 🔴 위협 IP 상세\n\n`;
        threatIPs.forEach((ip: any, idx: number) => {
          markdown += `**${idx + 1}. ${ip.ioc}**\n`;
          markdown += `- 위협 레벨: ${ip.threat_level}\n`;
          markdown += `- 유형: ${ip.type || 'IP'}\n`;
          if (ip.country) markdown += `- 국가: ${ip.country}\n`;
          markdown += `\n`;
        });
      }

      // 미확인 IP 상세 (최대 10개)
      if (unknownIPs.length > 0) {
        markdown += `### ⚠️ 미확인 IP 상세\n\n`;
        unknownIPs.slice(0, 10).forEach((ip: any, idx: number) => {
          markdown += `**${idx + 1}. ${ip.ioc}**\n`;
          markdown += `- 위협 레벨: ${ip.threat_level}\n`;
          markdown += `\n`;
        });

        if (unknownIPs.length > 10) {
          markdown += `... 그 외 ${unknownIPs.length - 10}개\n\n`;
        }
      }

      // 안전 IP 요약
      if (benignIPs.length > 0) {
        markdown += `### ✅ 안전 IP\n\n`;
        markdown += `**${benignIPs.length}개** IP가 안전한 것으로 확인되었습니다.\n\n`;
      }
    }

    // 3-3. MITRE 기법 상세
    if (ti.mitre_techniques_raw && ti.mitre_techniques_raw.length > 0) {
      markdown += `## 🎯 MITRE ATT&CK Techniques\n\n`;

      markdown += `**인시던트에서 감지된 기법**:\n`;
      ti.mitre_techniques_raw.forEach((tech: string) => {
        markdown += `- ${tech}\n`;
      });
      markdown += `\n`;

      // PostgreSQL에서 가져온 상세 정보
      if (ti.mitre_techniques && ti.mitre_techniques.length > 0) {
        markdown += `### 상세 정보 (PostgreSQL TI DB)\n\n`;
        ti.mitre_techniques.forEach((mitre: any) => {
          markdown += `**${mitre.technique_id} - ${mitre.technique_name}**\n`;
          if (mitre.tactic) markdown += `- Tactic: ${mitre.tactic}\n`;
          if (mitre.description) markdown += `- Description: ${mitre.description}\n`;
          if (mitre.detection) markdown += `- Detection: ${mitre.detection}\n`;
          markdown += `\n`;
        });
      }
    }

    // 3-4. CVE 상세
    if (ti.cve_details && ti.cve_details.length > 0) {
      markdown += `## 🔒 CVE Vulnerabilities\n\n`;

      ti.cve_details.forEach((cve: any) => {
        markdown += `**${cve.cve_id}**\n`;
        if (cve.description) markdown += `- ${cve.description}\n`;
        if (cve.cvss_score) markdown += `- CVSS Score: ${cve.cvss_score}\n`;
        if (cve.severity) markdown += `- Severity: ${cve.severity}\n`;
        markdown += `\n`;
      });
    }
  }

  // 4. CVE 매칭 (인시던트 데이터에서)
  if (investigation.cves && investigation.cves.length > 0) {
    markdown += `## 🔐 CVE Matches from Endpoints\n\n`;

    const exactCves = investigation.cves.filter((c: any) => c.match_type === 'exact');
    const fuzzyCves = investigation.cves.filter((c: any) => c.match_type === 'fuzzy');

    if (exactCves.length > 0) {
      markdown += `### ✅ Exact Match CVE (${exactCves.length}개) - 높은 신뢰도\n\n`;
      exactCves.slice(0, 20).forEach((cve: any) => {
        markdown += `- **${cve.cve_id}** (${cve.hostname})\n`;
        if (cve.cve_description) {
          markdown += `  - ${cve.cve_description.substring(0, 150)}...\n`;
        }
      });
      markdown += `\n`;
    }

    if (fuzzyCves.length > 0) {
      markdown += `### ⚠️ Fuzzy Match CVE (${fuzzyCves.length}개) - 낮은 신뢰도\n\n`;
      markdown += `⚠️ 이 CVE들은 호스트 이름 유사 매칭으로 찾았습니다. **AI 분석에서 실제 취약점 여부를 검증하세요.**\n\n`;
      fuzzyCves.slice(0, 20).forEach((cve: any) => {
        markdown += `- **${cve.cve_id}** (${cve.hostname}) - Confidence: ${cve.confidence.toFixed(1)}\n`;
      });

      if (fuzzyCves.length > 20) {
        markdown += `\n... 그 외 ${fuzzyCves.length - 20}개 (상세는 JSON 파일 참조)\n`;
      }
      markdown += `\n`;
    }
  }

  // 5. 엔드포인트 정보
  if (investigation.endpoints && investigation.endpoints.length > 0) {
    markdown += `## 💻 Endpoints\n\n`;
    investigation.endpoints.slice(0, 10).forEach((endpoint: any, idx: number) => {
      markdown += `**${idx + 1}. ${endpoint.endpoint_name}**\n`;
      markdown += `- OS: ${endpoint.os_type || 'Unknown'}\n`;
      markdown += `- IP: ${endpoint.ip_address?.[0] || 'N/A'}\n`;
      if (endpoint.endpoint_status) {
        markdown += `- Status: ${endpoint.endpoint_status}\n`;
      }
      markdown += `\n`;
    });

    if (investigation.endpoints.length > 10) {
      markdown += `... 그 외 ${investigation.endpoints.length - 10}개 (상세는 JSON 파일 참조)\n\n`;
    }
  }

  // 6. 파일 정보
  if (investigation.files && investigation.files.length > 0) {
    markdown += `## 📁 Files\n\n`;
    markdown += `총 ${investigation.files.length}개 파일 (상세는 JSON 파일 및 TI Correlation 참조)\n\n`;
  }

  // 7. 네트워크 연결
  if (investigation.networks && investigation.networks.length > 0) {
    markdown += `## 🌐 Network Connections\n\n`;
    markdown += `총 ${investigation.networks.length}개 연결 (상세는 JSON 파일 참조)\n\n`;

    // 외부 연결 상위 10개
    const externalConns = investigation.networks
      .filter((n: any) => n.action_external_ip)
      .slice(0, 10);

    if (externalConns.length > 0) {
      markdown += `**주요 외부 연결**:\n`;
      externalConns.forEach((conn: any, idx: number) => {
        markdown += `${idx + 1}. ${conn.dst_ip} → ${conn.action_external_ip}`;
        if (conn.dst_port) markdown += ` :${conn.dst_port}`;
        markdown += `\n`;
      });
      markdown += `\n`;
    }
  }

  return markdown;
}
