#!/usr/bin/env node
/**
 * Report Data Collector - Claude Code 전용
 * AI 분석 없이 순수 데이터만 수집 (OpenSearch + TI)
 * Claude Code가 직접 분석하여 고품질 보고서 생성
 */

import { executeInvestigation } from './opensearch-executor.js';
import { checkHashesInTI, checkIPsInTI, getMITREByTechniqueIds, getCVEDetails } from './ti-correlator.js';

export interface ReportData {
  incident_id: string;
  timestamp: string;
  investigation: any;
  ti_correlation: {
    file_hashes: any[];
    ip_addresses: any[];
    mitre_techniques: any[];
    cve_details: any[];
  };
  summary: {
    total_alerts: number;
    total_files: number;
    total_networks: number;
    total_processes: number;
    total_endpoints: number;
    total_cves: number;
    ti_matched_files: number;
    ti_threat_files: number;
    ti_matched_ips: number;
    ti_threat_ips: number;
    analyst_verdict?: string;
    severity?: string;
  };
}

/**
 * 인시던트 데이터 수집 (AI 분석 없음)
 */
export async function collectReportData(incidentId: string): Promise<ReportData> {
  console.log(`[Report] 📊 Collecting data for incident: ${incidentId}`);

  // 1. OpenSearch 조사
  console.log(`[Report] 🔍 Querying OpenSearch...`);
  const investigationResult = await executeInvestigation(incidentId);

  if (!investigationResult.success) {
    throw new Error(`Failed to query OpenSearch: ${investigationResult.error}`);
  }

  const investigation = investigationResult.investigation_data;

  // 2. TI 상관분석
  console.log(`[Report] 🛡️ Running TI correlation...`);

  // 2-1. 파일 해시 TI 매칭
  const fileHashes = investigation.files
    .map((f: any) => f.file_sha256 || f.sha256)
    .filter(Boolean);

  let fileHashResults: any[] = [];
  if (fileHashes.length > 0) {
    console.log(`[Report] 🔍 Checking ${fileHashes.length} file hashes...`);
    fileHashResults = await checkHashesInTI(fileHashes);
    const threatCount = fileHashResults.filter(h => h.verdict === 'threat').length;
    console.log(`[Report] ✅ Files: ${fileHashResults.filter(h => h.matched).length} matched, ${threatCount} threats`);
  }

  // 2-2. IP 주소 TI 매칭
  const ipAddresses = investigation.networks
    .map((n: any) => n.external_ip || n.dst_ip)
    .filter(Boolean);

  let ipResults: any[] = [];
  if (ipAddresses.length > 0) {
    console.log(`[Report] 🔍 Checking ${ipAddresses.length} IPs...`);
    ipResults = await checkIPsInTI(ipAddresses);
    const threatCount = ipResults.filter(ip => ip.verdict === 'threat').length;
    console.log(`[Report] ✅ IPs: ${ipResults.filter(ip => ip.matched).length} matched, ${threatCount} threats`);
  }

  // 2-3. MITRE ATT&CK 기법 상세 조회
  const mitreStrings = investigation.incident?.mitre_techniques_ids_and_names || [];
  const techniqueIds = mitreStrings
    .map((str: string) => {
      const match = str.match(/^(T\d{4}(?:\.\d{3})?)/);
      return match ? match[1] : null;
    })
    .filter(Boolean);

  let mitreResults: any[] = [];
  if (techniqueIds.length > 0) {
    console.log(`[Report] 🔍 Fetching MITRE details: ${techniqueIds.join(', ')}`);
    mitreResults = await getMITREByTechniqueIds(techniqueIds);
    console.log(`[Report] ✅ MITRE: ${mitreResults.length}/${techniqueIds.length} found`);
  }

  // 2-4. CVE 상세 조회
  const cveIds = investigation.cves.map((c: any) => c.cve_id).filter(Boolean);

  let cveResults: any[] = [];
  if (cveIds.length > 0) {
    console.log(`[Report] 🔍 Fetching ${cveIds.length} CVE details...`);
    cveResults = await getCVEDetails(cveIds);
    console.log(`[Report] ✅ CVEs: ${cveResults.length} found`);
  }

  // 3. 요약 정보 생성
  const summary = {
    total_alerts: investigation.alerts?.length || 0,
    total_files: investigation.files?.length || 0,
    total_networks: investigation.networks?.length || 0,
    total_processes: investigation.processes?.length || 0,
    total_endpoints: investigation.endpoints?.length || 0,
    total_cves: investigation.cves?.length || 0,
    ti_matched_files: fileHashResults.filter(h => h.matched).length,
    ti_threat_files: fileHashResults.filter(h => h.verdict === 'threat').length,
    ti_matched_ips: ipResults.filter(ip => ip.matched).length,
    ti_threat_ips: ipResults.filter(ip => ip.verdict === 'threat').length,
    analyst_verdict: investigation.incident?.manual_severity,
    severity: investigation.incident?.severity,
  };

  console.log(`[Report] ✅ Data collection complete`);
  console.log(`[Report] 📊 Summary:`, summary);

  return {
    incident_id: incidentId,
    timestamp: new Date().toISOString(),
    investigation,
    ti_correlation: {
      file_hashes: fileHashResults,
      ip_addresses: ipResults,
      mitre_techniques: mitreResults,
      cve_details: cveResults,
    },
    summary,
  };
}

/**
 * 여러 인시던트 데이터 수집
 */
export async function collectMultipleReportData(incidentIds: string[]): Promise<ReportData[]> {
  console.log(`[Report] 📊 Collecting data for ${incidentIds.length} incidents...`);

  const results: ReportData[] = [];

  for (const incidentId of incidentIds) {
    try {
      const data = await collectReportData(incidentId);
      results.push(data);
    } catch (error) {
      console.error(`[Report] ❌ Failed to collect data for ${incidentId}:`, error);
    }
  }

  return results;
}

/**
 * 날짜 범위로 인시던트 조회 후 데이터 수집
 */
export async function collectReportDataByDateRange(
  startDate: Date,
  endDate: Date,
  severity?: string
): Promise<ReportData[]> {
  console.log(`[Report] 📊 Collecting incidents from ${startDate.toISOString()} to ${endDate.toISOString()}`);

  // OpenSearch 쿼리로 인시던트 목록 가져오기
  const { getExecutor } = await import('./opensearch-executor.js');
  const executor = getExecutor();

  const query: any = {
    query: {
      bool: {
        must: [
          {
            range: {
              creation_time: {
                gte: startDate.getTime(),
                lte: endDate.getTime(),
              },
            },
          },
        ],
      },
    },
    size: 100,
    sort: [{ creation_time: { order: 'desc' } }],
  };

  // Severity 필터
  if (severity) {
    query.query.bool.must.push({
      term: { 'severity.keyword': severity },
    });
  }

  const result = await executor.query('logs-cortex_xdr-incidents-*', query);
  const incidentIds = result.hits.map((hit: any) => hit.incident_id).filter(Boolean);

  console.log(`[Report] 📊 Found ${incidentIds.length} incidents`);

  return collectMultipleReportData(incidentIds);
}

// CLI 실행
if (import.meta.url === `file://${process.argv[1]}`) {
  const incidentId = process.argv[2];

  if (!incidentId) {
    console.error('Usage: npx tsx script/report-data-collector.ts <incident_id>');
    process.exit(1);
  }

  collectReportData(incidentId)
    .then(data => {
      console.log('\n=== Report Data ===');
      console.log(JSON.stringify(data, null, 2));
    })
    .catch(error => {
      console.error('Error:', error);
      process.exit(1);
    });
}
