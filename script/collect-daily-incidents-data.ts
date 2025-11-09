#!/usr/bin/env tsx
/**
 * 고급 일간 인시던트 데이터 수집기
 * 개별 인시던트 분석 수준의 상세한 데이터 수집
 * - 7개 인덱스 통합 (incidents, files, networks, alerts, processes, endpoints, causality_chains)
 * - TI 상관관계 분석 (PostgreSQL)
 * - AI 분석용 데이터 준비
 */

import { execSync } from 'child_process';
import { writeFileSync, readFileSync } from 'fs';
import pg from 'pg';
const { Client } = pg;

// 환경 변수
const OPENSEARCH_URL = process.env.OPENSEARCH_URL || 'http://opensearch:9200';
const OPENSEARCH_USER = process.env.OPENSEARCH_USER || 'admin';
const OPENSEARCH_PASSWORD = process.env.OPENSEARCH_PASSWORD || 'Admin@123456';

// PostgreSQL TI Database
const PG_HOST = process.env.POSTGRES_HOST || 'postgres';
const PG_PORT = parseInt(process.env.POSTGRES_PORT || '5432');
const PG_DATABASE = process.env.POSTGRES_DATABASE || 'n8n';
const PG_USER = process.env.POSTGRES_USER || 'n8n';
const PG_PASSWORD = process.env.POSTGRES_PASSWORD || 'n8n';

// 날짜 파라미터
const args = process.argv.slice(2);
const reportDate = args[0] || new Date(Date.now() - 86400000).toISOString().split('T')[0];

console.log('');
console.log('\x1b[36m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m');
console.log('\x1b[36m  📦 고급 인시던트 데이터 수집기\x1b[0m');
console.log(`\x1b[36m  날짜: ${reportDate}\x1b[0m`);
console.log('\x1b[36m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m');
console.log('');

// OpenSearch 쿼리 헬퍼
function queryOpenSearch(index: string, query: any): any {
  try {
    const curlCmd = `curl -s -u "${OPENSEARCH_USER}:${OPENSEARCH_PASSWORD}" \
      -H "Content-Type: application/json" \
      -X POST "${OPENSEARCH_URL}/${index}/_search" \
      -d '${JSON.stringify(query).replace(/'/g, "'\\''")}'`;

    const result = execSync(curlCmd, { encoding: 'utf-8', maxBuffer: 50 * 1024 * 1024 });
    return JSON.parse(result);
  } catch (error: any) {
    console.error(`⚠️  OpenSearch 쿼리 실패 (${index}):`, error.message);
    return { hits: { total: { value: 0 }, hits: [] }, aggregations: {} };
  }
}

// PostgreSQL TI 조회
async function queryTI(hashes: string[]): Promise<any[]> {
  if (hashes.length === 0) return [];

  const client = new Client({
    host: PG_HOST,
    port: PG_PORT,
    database: PG_DATABASE,
    user: PG_USER,
    password: PG_PASSWORD,
  });

  try {
    await client.connect();

    const query = `
      SELECT
        hash,
        verdict,
        threat_level,
        classification,
        file_name,
        threat_intel_sources
      FROM file_hashes
      WHERE hash = ANY($1::text[])
    `;

    const result = await client.query(query, [hashes]);
    return result.rows;
  } catch (error: any) {
    console.error('⚠️  PostgreSQL TI 조회 실패:', error.message);
    return [];
  } finally {
    await client.end();
  }
}

// MITRE ATT&CK 조회
async function queryMitre(techniqueIds: string[]): Promise<any[]> {
  if (techniqueIds.length === 0) return [];

  const client = new Client({
    host: PG_HOST,
    port: PG_PORT,
    database: PG_DATABASE,
    user: PG_USER,
    password: PG_PASSWORD,
  });

  try {
    await client.connect();

    const query = `
      SELECT
        technique_id,
        technique_name,
        tactic,
        description
      FROM mitre_attack
      WHERE technique_id = ANY($1::text[])
    `;

    const result = await client.query(query, [techniqueIds]);
    return result.rows;
  } catch (error: any) {
    console.error('⚠️  MITRE 조회 실패:', error.message);
    return [];
  } finally {
    await client.end();
  }
}

// 1. 인시던트 조회
console.log('\x1b[32m1️⃣  인시던트 조회 중...\x1b[0m');

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
  size: 1000, // 최대 1000개
  sort: [{ '@timestamp': { order: 'desc' } }],
  aggs: {
    by_severity: {
      terms: { field: 'severity.keyword', size: 10 },
    },
    by_status: {
      terms: { field: 'status.keyword', size: 10 },
    },
    by_detection_type: {
      terms: { field: 'detection_type.keyword', size: 50 },
    },
    by_host: {
      terms: { field: 'host_name.keyword', size: 20 },
    },
  },
};

// Main execution wrapped in async IIFE to support await
(async () => {
  const incidentData = queryOpenSearch('logs-cortex_xdr-incidents-*', incidentQuery);
  const incidents = incidentData.hits?.hits || [];

  console.log(`✅ ${incidents.length}건의 인시던트 조회 완료`);
  
  if (incidents.length === 0) {
    console.log('');
    console.log('\x1b[33m⚠️  데이터가 없습니다. 다른 날짜를 시도해보세요.\x1b[0m');
    console.log('');
    process.exit(0);
  }
  
  // 2. 상위 인시던트 상세 분석
  console.log('');
  console.log('\x1b[32m2️⃣  상위 인시던트 상세 분석 중...\x1b[0m');
  
  // Critical/High 우선, 그 다음 최신순
  const sortedIncidents = incidents.sort((a: any, b: any) => {
    const severityOrder: any = { critical: 4, high: 3, medium: 2, low: 1 };
    const aSeverity = severityOrder[a._source.severity] || 0;
    const bSeverity = severityOrder[b._source.severity] || 0;
  
    if (aSeverity !== bSeverity) {
      return bSeverity - aSeverity; // 높은 심각도 우선
    }
  
    // 같은 심각도면 최신순
    return new Date(b._source['@timestamp']).getTime() - new Date(a._source['@timestamp']).getTime();
  });
  
  // **전체 인시던트 상세 분석** (상위 20개가 아닌 전체)
  console.log(`   전체 ${sortedIncidents.length}건 인시던트 상세 분석 시작...`);
  const detailedIncidents: any[] = [];

  for (const incident of sortedIncidents) {
    const inc = incident._source;
    const incidentId = inc.incident_id;

    console.log(`   분석 중: ${incidentId} (${inc.severity})`);

    // 관련 데이터 조회
    const detailQuery = {
      query: {
        bool: {
          must: [
            { term: { 'incident_id.keyword': incidentId } },
          ],
        },
      },
      size: 100,
    };

    // 파일, 네트워크, 알럿, 프로세스, 엔드포인트 조회
    const files = queryOpenSearch('logs-cortex_xdr-files-*', detailQuery).hits?.hits || [];
    const networks = queryOpenSearch('logs-cortex_xdr-networks-*', detailQuery).hits?.hits || [];
    const alerts = queryOpenSearch('logs-cortex_xdr-alerts-*', detailQuery).hits?.hits || [];
    const processes = queryOpenSearch('logs-cortex_xdr-processes-*', detailQuery).hits?.hits || [];
    const endpoints = queryOpenSearch('logs-cortex_xdr-endpoints-*', detailQuery).hits?.hits || [];

    detailedIncidents.push({
      incident: inc,
      files: files.map((f: any) => f._source),
      networks: networks.map((n: any) => n._source),
      alerts: alerts.map((a: any) => a._source),
      processes: processes.map((p: any) => p._source),
      endpoints: endpoints.map((e: any) => e._source),
    });
  }

  console.log(`✅ ${detailedIncidents.length}개 인시던트 상세 분석 완료 (전체 수집)`);
  
  // 3. TI 상관관계 분석
  console.log('');
  console.log('\x1b[32m3️⃣  TI 상관관계 분석 중...\x1b[0m');
  
  // 모든 파일 해시 수집
  const allHashes = new Set<string>();
  detailedIncidents.forEach((d) => {
    d.files.forEach((f: any) => {
      if (f.file_sha256) allHashes.add(f.file_sha256);
    });
  });
  
  console.log(`   수집된 해시: ${allHashes.size}개`);
  
  // TI 조회
  const tiData = await queryTI(Array.from(allHashes));
  
  console.log(`✅ TI 매칭: ${tiData.length}개`);
  
  // 4. MITRE ATT&CK 분석
  console.log('');
  console.log('\x1b[32m4️⃣  MITRE ATT&CK 분석 중...\x1b[0m');
  
  // 모든 MITRE 기법 ID 수집
  const allMitreIds = new Set<string>();
  detailedIncidents.forEach((d) => {
    const mitreIds = d.incident.mitre_techniques_ids_and_names || [];
    mitreIds.forEach((m: string) => {
      const match = m.match(/^(T\d+(\.\d+)?)/);
      if (match) allMitreIds.add(match[1]);
    });
  });
  
  console.log(`   수집된 MITRE 기법: ${allMitreIds.size}개`);
  
  // MITRE 조회
  const mitreData = await queryMitre(Array.from(allMitreIds));
  
  console.log(`✅ MITRE 매칭: ${mitreData.length}개`);
  
  // 5. 통계 집계
  console.log('');
  console.log('\x1b[32m5️⃣  통계 집계 중...\x1b[0m');
  
  const stats = {
    total_incidents: incidents.length,
    detailed_analyzed: detailedIncidents.length,
  
    // 심각도별
    by_severity: {} as any,
  
    // 상태별
    by_status: {} as any,
  
    // 탐지 유형별
    by_detection_type: {} as any,
  
    // 호스트별
    by_host: {} as any,
  
    // 위협 파일 통계
    threat_files: {
      total: allHashes.size,
      threat: tiData.filter((t) => t.verdict === 'threat').length,
      suspicious: tiData.filter((t) => t.verdict === 'suspicious').length,
      benign: tiData.filter((t) => t.verdict === 'benign').length,
    },
  
    // MITRE 통계
    mitre: {
      total_techniques: allMitreIds.size,
      tactics: {} as any,
    },
  
    // 네트워크 통계
    network: {
      total_connections: 0,
      unique_ips: new Set(),
      unique_domains: new Set(),
      countries: {} as any,
    },
  };
  
  // 집계 처리
  (incidentData.aggregations?.by_severity?.buckets || []).forEach((bucket: any) => {
    stats.by_severity[bucket.key] = bucket.doc_count;
  });
  
  (incidentData.aggregations?.by_status?.buckets || []).forEach((bucket: any) => {
    stats.by_status[bucket.key] = bucket.doc_count;
  });
  
  (incidentData.aggregations?.by_detection_type?.buckets || []).forEach((bucket: any) => {
    stats.by_detection_type[bucket.key] = bucket.doc_count;
  });
  
  (incidentData.aggregations?.by_host?.buckets || []).forEach((bucket: any) => {
    stats.by_host[bucket.key] = bucket.doc_count;
  });
  
  // 네트워크 통계
  detailedIncidents.forEach((d) => {
    d.networks.forEach((n: any) => {
      stats.network.total_connections++;
      if (n.network_remote_ip) stats.network.unique_ips.add(n.network_remote_ip);
      if (n.network_domain) stats.network.unique_domains.add(n.network_domain);
      if (n.network_country) {
        stats.network.countries[n.network_country] = (stats.network.countries[n.network_country] || 0) + 1;
      }
    });
  });
  
  // MITRE 전술별 집계
  mitreData.forEach((m) => {
    const tactic = m.tactic || 'Unknown';
    stats.mitre.tactics[tactic] = (stats.mitre.tactics[tactic] || 0) + 1;
  });
  
  console.log(`✅ 통계 집계 완료`);
  
  // 6. AI 분석용 데이터 준비
  console.log('');
  console.log('\x1b[32m6️⃣  AI 분석용 데이터 준비 중...\x1b[0m');
  
  const aiAnalysisData = {
    report_date: reportDate,
  
    // 전체 개요
    summary: {
      total_incidents: stats.total_incidents,
      critical_count: stats.by_severity.critical || 0,
      high_count: stats.by_severity.high || 0,
      medium_count: stats.by_severity.medium || 0,
      low_count: stats.by_severity.low || 0,
    },
  
    // 상위 인시던트 (AI가 분석할 주요 케이스)
    top_incidents: detailedIncidents.slice(0, 10).map((d) => ({
      incident_id: d.incident.incident_id,
      severity: d.incident.severity,
      status: d.incident.status,
      description: d.incident.description,
      detection_time: d.incident.detection_time,
      resolve_comment: d.incident.resolve_comment,
  
      // 파일 요약
      files_summary: {
        total: d.files.length,
        threat_count: d.files.filter((f: any) =>
          tiData.find((t) => t.hash === f.file_sha256 && t.verdict === 'threat')
        ).length,
        file_types: [...new Set(d.files.map((f: any) => f.file_type))],
      },
  
      // 네트워크 요약
      network_summary: {
        total: d.networks.length,
        unique_ips: [...new Set(d.networks.map((n: any) => n.network_remote_ip).filter(Boolean))],
        unique_domains: [...new Set(d.networks.map((n: any) => n.network_domain).filter(Boolean))],
        countries: [...new Set(d.networks.map((n: any) => n.network_country).filter(Boolean))],
      },
  
      // MITRE 기법
      mitre_techniques: d.incident.mitre_techniques_ids_and_names || [],
      mitre_tactics: d.incident.mitre_tactics_ids_and_names || [],
  
      // 알럿 요약
      alerts_count: d.alerts.length,
  
      // 엔드포인트 CVE
      endpoint_cves: d.endpoints.flatMap((e: any) => e.endpoint_cves || []).slice(0, 10),
    })),
  
    // 통계 데이터
    statistics: stats,
  
    // TI 데이터
    threat_intelligence: {
      total_hashes_analyzed: allHashes.size,
      threat_files: tiData.filter((t) => t.verdict === 'threat'),
      suspicious_files: tiData.filter((t) => t.verdict === 'suspicious'),
    },
  
    // MITRE 데이터
    mitre_attack: {
      techniques: mitreData,
      tactics_distribution: stats.mitre.tactics,
    },
  };
  
  console.log(`✅ AI 분석용 데이터 준비 완료`);
  
  // 7. 결과 저장
  console.log('');
  console.log('\x1b[32m7️⃣  데이터 저장 중...\x1b[0m');
  
  const outputFile = `/tmp/daily_incidents_data_${reportDate}.json`;
  writeFileSync(outputFile, JSON.stringify({
    collected_data: {
      incidents: detailedIncidents,
      ti_data: tiData,
      mitre_data: mitreData,
    },
    ai_analysis_data: aiAnalysisData,
  }, null, 2));
  
  console.log(`✅ 데이터 저장: ${outputFile}`);
  
  // 8. 결과 출력
  console.log('');
  console.log('\x1b[36m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m');
  console.log('\x1b[36m✅ 데이터 수집 완료!\x1b[0m');
  console.log('\x1b[36m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m');
  console.log('');
  console.log('\x1b[33m📊 수집 요약:\x1b[0m');
  console.log(`\x1b[33m   - 총 인시던트: ${stats.total_incidents}건\x1b[0m`);
  console.log(`\x1b[33m   - 상세 분석: ${stats.detailed_analyzed}건\x1b[0m`);
  console.log(`\x1b[33m   - 위협 파일: ${stats.threat_files.threat}/${stats.threat_files.total}개\x1b[0m`);
  console.log(`\x1b[33m   - MITRE 기법: ${stats.mitre.total_techniques}개\x1b[0m`);
  console.log(`\x1b[33m   - 네트워크: ${stats.network.total_connections}건\x1b[0m`);
  console.log('');
  console.log(`\x1b[32m📁 출력 파일: ${outputFile}\x1b[0m`);
  console.log('');
  console.log('\x1b[33m다음 단계: AI 분석 프롬프트 생성\x1b[0m');
  console.log(`\x1b[33m  npx tsx script/create-ai-analysis-prompt.ts ${reportDate}\x1b[0m`);
  console.log('');
})().catch((error) => {
  console.error('\x1b[31m❌ 오류 발생:\x1b[0m');
  console.error(error);
  process.exit(1);
});
