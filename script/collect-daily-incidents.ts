#!/usr/bin/env npx tsx
// @ts-nocheck
/**
 * Stage 1: 일일 인시던트 데이터 수집
 *
 * 기능:
 * 1. 특정 날짜의 모든 인시던트 ID 조회
 * 2. 각 인시던트별 상세 데이터 수집 (기존 함수 활용)
 * 3. TI 상관분석 (PostgreSQL)
 * 4. 섹션별 데이터 구조화
 *
 * Usage:
 *   npx tsx script/collect-daily-incidents.ts --date 2025-11-23
 */

import { Client } from '@opensearch-project/opensearch';
import { OpenSearchExecutor } from './opensearch-executor.js';
import { checkHashesInTI, checkIPsInTI, getMITREByTechniqueIds, getCVEDetails } from './ti-correlator.js';
import fs from 'fs/promises';
import path from 'path';

interface CLIOptions {
  date: string;
  outputDir?: string;
}

function parseArgs(): CLIOptions {
  const args = process.argv.slice(2);
  const options: CLIOptions = {
    date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 기본: 어제
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '--date':
      case '-d':
        options.date = args[++i];
        break;
      case '--output':
      case '-o':
        options.outputDir = args[++i];
        break;
    }
  }

  return options;
}

/**
 * 특정 날짜의 모든 인시던트 ID 조회
 */
async function getIncidentIdsByDate(date: string): Promise<string[]> {
  const osClient = new Client({
    node: process.env.OPENSEARCH_URL || 'http://opensearch:9200',
    auth: {
      username: process.env.OPENSEARCH_USER || 'admin',
      password: process.env.OPENSEARCH_PASSWORD || 'Admin@123456',
    },
    ssl: { rejectUnauthorized: false },
  });

  // creation_time은 milliseconds 형식
  const startTimestamp = new Date(`${date}T00:00:00`).getTime();
  const endTimestamp = new Date(`${date}T23:59:59.999`).getTime();

  console.log(`[getIncidentIdsByDate] 조회 기간: ${date} (${startTimestamp} ~ ${endTimestamp})`);

  const result = await osClient.search({
    index: 'logs-cortex_xdr-incidents-*',
    body: {
      query: {
        range: {
          creation_time: {
            gte: startTimestamp,
            lte: endTimestamp,
          },
        },
      },
      size: 10000, // 최대 10,000개
      _source: ['incident_id'],
      sort: [{ creation_time: { order: 'desc' } }],
    },
  });

  const incidentIds = result.body.hits.hits.map((hit: any) => hit._source.incident_id);

  console.log(`[getIncidentIdsByDate] ${incidentIds.length}개 인시던트 발견`);

  return incidentIds;
}

/**
 * 헬퍼: TOP N 호스트 추출
 */
function getTopHosts(incidents: any[], limit: number = 20) {
  const hostMap = new Map<string, number>();

  incidents.forEach(inc => {
    inc.endpoints?.forEach((ep: any) => {
      const hostname = ep.endpoint_name;
      if (hostname) {
        hostMap.set(hostname, (hostMap.get(hostname) || 0) + 1);
      }
    });
  });

  return Array.from(hostMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([hostname, count]) => ({ hostname, incident_count: count }));
}

/**
 * 헬퍼: TOP N 알럿 유형 추출
 */
function getTopAlertTypes(incidents: any[], limit: number = 30) {
  const alertMap = new Map<string, number>();

  incidents.forEach(inc => {
    inc.alerts?.forEach((alert: any) => {
      const alertName = alert.alert_name;
      if (alertName) {
        alertMap.set(alertName, (alertMap.get(alertName) || 0) + 1);
      }
    });
  });

  return Array.from(alertMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([alert_name, count]) => ({ alert_name, count }));
}

/**
 * 헬퍼: 파일을 판단(verdict)별로 추출
 */
function extractFilesByVerdict(incidents: any[], verdict: string) {
  const files = new Map();

  incidents.forEach(inc => {
    inc.files?.forEach((file: any) => {
      const hash = file.action_file_sha256;
      if (!hash) return;

      // TI 매칭 결과 확인
      const tiMatch = inc.ti?.file_hashes?.find((t: any) => t.hash === hash);
      const fileVerdict = tiMatch?.verdict || 'unknown';

      if (fileVerdict === verdict) {
        if (files.has(hash)) {
          const existing = files.get(hash);
          existing.incidents.push(inc.incident.incident_id);
        } else {
          files.set(hash, {
            hash,
            filename: file.action_file_name,
            path: file.action_file_path,
            incidents: [inc.incident.incident_id],
            ti_data: tiMatch,
          });
        }
      }
    });
  });

  return Array.from(files.values());
}

/**
 * 헬퍼: 외부 IP 추출
 */
function extractExternalIPs(incidents: any[]) {
  const ipMap = new Map();

  incidents.forEach(inc => {
    inc.networks?.forEach((net: any) => {
      const ip = net.action_external_ip;
      if (!ip || net.action_external_ip_is_private) return;

      // TI 매칭 결과
      const tiMatch = inc.ti?.ips?.find((t: any) => t.ip === ip);

      if (ipMap.has(ip)) {
        const existing = ipMap.get(ip);
        existing.incidents.push(inc.incident.incident_id);
      } else {
        ipMap.set(ip, {
          ip,
          hostname: net.action_external_hostname,
          incidents: [inc.incident.incident_id],
          ti_data: tiMatch,
        });
      }
    });
  });

  return Array.from(ipMap.values());
}

/**
 * 헬퍼: 도메인 추출
 */
function extractDomains(incidents: any[]) {
  const domainMap = new Map();

  incidents.forEach(inc => {
    inc.networks?.forEach((net: any) => {
      const domain = net.action_external_hostname;
      if (!domain || domain.match(/^\d+\.\d+\.\d+\.\d+$/)) return; // IP는 제외

      if (domainMap.has(domain)) {
        const existing = domainMap.get(domain);
        existing.incidents.push(inc.incident.incident_id);
      } else {
        domainMap.set(domain, {
          domain,
          incidents: [inc.incident.incident_id],
        });
      }
    });
  });

  return Array.from(domainMap.values());
}

/**
 * 헬퍼: 모든 호스트 정보 추출
 */
function extractAllHosts(incidents: any[]) {
  const hostMap = new Map();

  incidents.forEach(inc => {
    inc.endpoints?.forEach((ep: any) => {
      const hostname = ep.endpoint_name;
      if (!hostname) return;

      if (hostMap.has(hostname)) {
        const existing = hostMap.get(hostname);
        existing.incidents.push(inc.incident.incident_id);
      } else {
        hostMap.set(hostname, {
          hostname,
          endpoint_id: ep.endpoint_id,
          os_type: ep.os_type,
          os_version: ep.os_version,
          ip_address: ep.endpoint_ip_address,
          incidents: [inc.incident.incident_id],
          // CVE 정보는 나중에 추가
        });
      }
    });
  });

  return Array.from(hostMap.values());
}

/**
 * 헬퍼: MITRE 기법 추출
 */
function extractMITRETechniques(incidents: any[]) {
  const techniqueMap = new Map();

  incidents.forEach(inc => {
    const techniques = inc.incident?.mitre_technique_ids || [];
    const techniqueNames = inc.incident?.mitre_technique_names || [];

    techniques.forEach((techId: string, idx: number) => {
      const techName = techniqueNames[idx] || '';

      if (techniqueMap.has(techId)) {
        const existing = techniqueMap.get(techId);
        existing.incident_count++;
        existing.incidents.push(inc.incident.incident_id);
      } else {
        techniqueMap.set(techId, {
          technique_id: techId,
          technique_name: techName,
          incident_count: 1,
          incidents: [inc.incident.incident_id],
        });
      }
    });
  });

  return Array.from(techniqueMap.values());
}

/**
 * 메인 함수
 */
async function main() {
  const options = parseArgs();
  const { date, outputDir = '/tmp' } = options;

  console.log('=================================');
  console.log(`[Stage 1] 데이터 수집 시작`);
  console.log(`날짜: ${date}`);
  console.log('=================================\n');

  // 1. 인시던트 ID 조회
  console.log('[1/4] 인시던트 ID 조회 중...');
  const incidentIds = await getIncidentIdsByDate(date);

  if (incidentIds.length === 0) {
    console.log('❌ 인시던트가 없습니다.');
    process.exit(0);
  }

  console.log(`✅ ${incidentIds.length}개 인시던트 발견\n`);

  // 2. 각 인시던트별 상세 데이터 수집
  console.log('[2/4] 인시던트별 상세 데이터 수집 중...');
  const executor = new OpenSearchExecutor();
  const allIncidents = [];

  for (let i = 0; i < incidentIds.length; i++) {
    const incidentId = incidentIds[i];
    process.stdout.write(`  진행: ${i + 1}/${incidentIds.length} (${incidentId})\r`);

    try {
      // 기존 함수 활용 ✅
      const data = await executor.executeIncidentInvestigation(incidentId);

      if (!data.success) {
        console.log(`\n  ⚠️  ${incidentId}: ${data.error}`);
        continue;
      }

      allIncidents.push(data);
    } catch (error: any) {
      console.log(`\n  ❌ ${incidentId}: ${error.message}`);
    }
  }

  console.log(`\n✅ ${allIncidents.length}개 수집 완료\n`);

  // 3. TI 상관분석
  console.log('[3/4] TI 상관분석 중...');

  for (let i = 0; i < allIncidents.length; i++) {
    const inc = allIncidents[i];
    process.stdout.write(`  진행: ${i + 1}/${allIncidents.length}\r`);

    // 파일 해시 추출
    const fileHashes = inc.files?.map((f: any) => f.action_file_sha256).filter(Boolean) || [];

    // IP 추출
    const ips = inc.networks?.map((n: any) => n.action_external_ip).filter(Boolean) || [];

    // MITRE 기법 ID 추출
    const mitreIds = inc.incident?.mitre_technique_ids || [];

    // CVE ID 추출
    const cveIds = inc.endpoints?.flatMap((e: any) => e.cves || []) || [];

    // TI 상관분석 실행
    const tiData: any = {};

    if (fileHashes.length > 0) {
      tiData.file_hashes = await checkHashesInTI(fileHashes);
    }

    if (ips.length > 0) {
      tiData.ips = await checkIPsInTI(ips);
    }

    if (mitreIds.length > 0) {
      tiData.mitre = await getMITREByTechniqueIds(mitreIds);
    }

    if (cveIds.length > 0) {
      tiData.cves = await getCVEDetails(cveIds);
    }

    // TI 데이터 추가
    inc.ti = tiData;
  }

  console.log('\n✅ TI 상관분석 완료\n');

  // 4. 섹션별 데이터 구조화
  console.log('[4/4] 섹션별 데이터 구조화 중...');

  const structuredData = {
    metadata: {
      report_date: date,
      total_incidents: allIncidents.length,
      collection_time: new Date().toISOString(),
    },

    // 전체 인시던트 원본 데이터
    all_incidents: allIncidents,

    // 통계용 집계
    statistics: {
      by_severity: {
        critical: allIncidents.filter(i => i.incident?.severity === 'critical').length,
        high: allIncidents.filter(i => i.incident?.severity === 'high').length,
        medium: allIncidents.filter(i => i.incident?.severity === 'medium').length,
        low: allIncidents.filter(i => i.incident?.severity === 'low').length,
      },
      by_status: {
        new: allIncidents.filter(i => i.incident?.status === 'new').length,
        under_investigation: allIncidents.filter(i => i.incident?.status === 'under_investigation').length,
        resolved_true_positive: allIncidents.filter(i => i.incident?.manual_severity === 'true_positive').length,
        resolved_false_positive: allIncidents.filter(i => i.incident?.manual_severity === 'false_positive').length,
      },
      top_hosts: getTopHosts(allIncidents, 20),
      top_alert_types: getTopAlertTypes(allIncidents, 30),
    },

    // 파일 해시 전체 (카테고리별)
    all_files: {
      malicious: extractFilesByVerdict(allIncidents, 'malicious'),
      suspicious: extractFilesByVerdict(allIncidents, 'suspicious'),
      benign: extractFilesByVerdict(allIncidents, 'benign'),
      unknown: extractFilesByVerdict(allIncidents, 'unknown'),
    },

    // 네트워크 전체 (외부 IP/도메인)
    all_networks: {
      external_ips: extractExternalIPs(allIncidents),
      domains: extractDomains(allIncidents),
    },

    // 호스트 전체
    all_hosts: extractAllHosts(allIncidents),

    // MITRE 기법 전체
    all_mitre_techniques: extractMITRETechniques(allIncidents),
  };

  // 5. JSON 저장
  const outputPath = path.join(outputDir, `daily_data_${date}.json`);
  await fs.writeFile(outputPath, JSON.stringify(structuredData, null, 2));

  console.log('✅ 데이터 구조화 완료\n');

  console.log('=================================');
  console.log('✅ Stage 1 완료!');
  console.log('=================================');
  console.log(`출력 파일: ${outputPath}`);
  console.log(`파일 크기: ${(await fs.stat(outputPath)).size / 1024 / 1024} MB`);
  console.log('\n요약:');
  console.log(`  - 총 인시던트: ${allIncidents.length}개`);
  console.log(`  - Critical: ${structuredData.statistics.by_severity.critical}개`);
  console.log(`  - High: ${structuredData.statistics.by_severity.high}개`);
  console.log(`  - Medium: ${structuredData.statistics.by_severity.medium}개`);
  console.log(`  - Low: ${structuredData.statistics.by_severity.low}개`);
  console.log(`  - 악성 파일: ${structuredData.all_files.malicious.length}개`);
  console.log(`  - 외부 IP: ${structuredData.all_networks.external_ips.length}개`);
  console.log(`  - 영향받은 호스트: ${structuredData.all_hosts.length}대`);
}

main().catch(console.error);
