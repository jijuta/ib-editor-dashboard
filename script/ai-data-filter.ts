/**
 * AI Data Filter
 * 각 AI 분석 카테고리별로 필요한 데이터만 추출하여 토큰 절약
 */

export interface FilteredData {
  analyst_verification: {
    incident_id: string;
    analyst_comment: string | null;
    incident_severity: string;
    incident_status: string;
    incident_description: string;
  };

  file_hash_analysis: {
    incident_id: string;
    total_files: number;
    threat_files: Array<{
      file_name: string;
      sha256: string;
      verdict: string;
      threat_level: number;
      source: string;
    }>;
    unknown_files: Array<{
      file_name: string;
      sha256: string;
      threat_level: number;
    }>;
  };

  network_analysis: {
    incident_id: string;
    total_networks: number;
    suspicious_ips: Array<{
      ip: string;
      port: number;
      country?: string;
      threat_level: number;
      verdict: string;
    }>;
    external_connections: Array<{
      external_ip: string;
      external_port: number;
      protocol: string;
      action: string;
    }>;
  };

  mitre_analysis: {
    incident_id: string;
    techniques_raw: string[];
    techniques_details: Array<{
      technique_id: string;
      technique_name: string;
      tactic: string;
      description: string;
      incident_count: number;
    }>;
  };

  cve_analysis: {
    incident_id: string;
    total_cves: number;
    exact_match_cves: Array<{
      cve_id: string;
      cvss_score: number;
      severity: string;
      hostname: string;
      description: string;
    }>;
    fuzzy_match_cves: Array<{
      cve_id: string;
      cvss_score: number;
      hostname: string;
      confidence: number;
    }>;
  };

  endpoint_analysis: {
    incident_id: string;
    total_endpoints: number;
    endpoints: Array<{
      endpoint_name: string;
      os_type: string;
      cve_count: number;
      critical_cves: number;
      high_cves: number;
    }>;
  };
}

/**
 * Investigation 데이터를 AI 분석용으로 필터링
 */
export function filterDataForAI(investigationData: any): FilteredData {
  // 1. 분석가 판단 검증용 데이터
  const analyst_verification = {
    incident_id: investigationData.incident_id,
    analyst_comment: investigationData.incident?.resolve_comment || null,
    incident_severity: investigationData.incident?.severity || 'unknown',
    incident_status: investigationData.incident?.status || 'unknown',
    incident_description: investigationData.incident?.description || '',
  };

  // 2. 파일 해시 분석용 데이터 (threat와 unknown만)
  const tiHashes = investigationData.ti_correlation?.file_hashes || [];
  const file_hash_analysis = {
    incident_id: investigationData.incident_id,
    total_files: investigationData.summary.total_files,
    threat_files: tiHashes
      .filter((h: any) => h.verdict === 'threat')
      .map((h: any) => ({
        file_name: investigationData.files.find((f: any) => f.file_sha256 === h.hash)?.file_name || 'Unknown',
        sha256: h.hash,
        verdict: h.verdict,
        threat_level: h.threat_level,
        source: h.source,
      })),
    unknown_files: tiHashes
      .filter((h: any) => h.verdict === 'unknown' && h.matched)
      .slice(0, 20)  // 최대 20개만
      .map((h: any) => ({
        file_name: investigationData.files.find((f: any) => f.file_sha256 === h.hash)?.file_name || 'Unknown',
        sha256: h.hash,
        threat_level: h.threat_level,
      })),
  };

  // 3. 네트워크 분석용 데이터 (의심스러운 IP만)
  const tiIPs = investigationData.ti_correlation?.ip_addresses || [];
  const network_analysis = {
    incident_id: investigationData.incident_id,
    total_networks: investigationData.summary.total_networks,
    suspicious_ips: tiIPs
      .filter((ip: any) => ip.verdict === 'threat' || (ip.verdict === 'unknown' && ip.matched))
      .map((ip: any) => ({
        ip: ip.hash,
        port: 0,  // TODO: 실제 포트 매핑
        country: '',
        threat_level: ip.threat_level,
        verdict: ip.verdict,
      })),
    external_connections: investigationData.networks
      .filter((n: any) => n.external_ip)
      .slice(0, 30)  // 최대 30개
      .map((n: any) => ({
        external_ip: n.external_ip,
        external_port: n.external_port,
        protocol: n.protocol,
        action: n.action,
      })),
  };

  // 4. MITRE 분석용 데이터
  const mitre_analysis = {
    incident_id: investigationData.incident_id,
    techniques_raw: investigationData.ti_correlation?.mitre_techniques_raw || [],
    techniques_details: (investigationData.ti_correlation?.mitre_techniques || []).map((m: any) => ({
      technique_id: m.technique_id,
      technique_name: m.technique_name,
      tactic: m.tactic,
      description: m.description.substring(0, 300),  // 설명은 300자만
      incident_count: m.incident_count,
    })),
  };

  // 5. CVE 분석용 데이터 (exact와 fuzzy 분리)
  const cves = investigationData.cves || [];
  const cve_analysis = {
    incident_id: investigationData.incident_id,
    total_cves: cves.length,
    exact_match_cves: cves
      .filter((c: any) => c.match_type === 'exact' && c.cvss_score >= 7.0)
      .slice(0, 20)  // 최대 20개
      .map((c: any) => ({
        cve_id: c.cve_id,
        cvss_score: c.cvss_score,
        severity: c.severity,
        hostname: c.hostname,
        description: c.description?.substring(0, 200) || '',
      })),
    fuzzy_match_cves: cves
      .filter((c: any) => c.match_type === 'fuzzy' && c.cvss_score >= 9.0)
      .slice(0, 10)  // Fuzzy는 critical만 최대 10개
      .map((c: any) => ({
        cve_id: c.cve_id,
        cvss_score: c.cvss_score,
        hostname: c.hostname,
        confidence: c.confidence,
      })),
  };

  // 6. 엔드포인트 분석용 데이터
  const endpoints = investigationData.endpoints || [];
  const endpoint_analysis = {
    incident_id: investigationData.incident_id,
    total_endpoints: endpoints.length,
    endpoints: endpoints.map((e: any) => {
      // 이 엔드포인트의 CVE 계산
      const endpointCves = cves.filter((c: any) => c.hostname === e.endpoint_name);
      const criticalCves = endpointCves.filter((c: any) => c.cvss_score >= 9.0).length;
      const highCves = endpointCves.filter((c: any) => c.cvss_score >= 7.0 && c.cvss_score < 9.0).length;

      return {
        endpoint_name: e.endpoint_name || e.hostname,
        os_type: e.os_type || 'unknown',
        cve_count: endpointCves.length,
        critical_cves: criticalCves,
        high_cves: highCves,
      };
    }),
  };

  return {
    analyst_verification,
    file_hash_analysis,
    network_analysis,
    mitre_analysis,
    cve_analysis,
    endpoint_analysis,
  };
}

/**
 * 토큰 사용량 추정
 */
export function estimateTokens(data: any): number {
  const jsonStr = JSON.stringify(data);
  // 대략 4자 = 1토큰
  return Math.ceil(jsonStr.length / 4);
}
