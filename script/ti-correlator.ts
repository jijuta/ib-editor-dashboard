/**
 * TI Correlator
 * PostgreSQL TI 데이터베이스와 상관분석
 */

import { Client } from 'pg';
import { config } from 'dotenv';
import { resolve } from 'path';

// .env.local 로드
config({ path: resolve(process.cwd(), '.env.local') });

/**
 * TI 매칭 결과
 */
export interface TIMatchResult {
  hash: string;
  matched: boolean;
  verdict: 'threat' | 'unknown' | 'benign';
  threat_level: number; // 0-100
  severity: string;
  source: string;
  context?: any;
  misp_matches: number;
  opencti_matches: number;
}

/**
 * MITRE ATT&CK 정보
 */
export interface MITREInfo {
  technique_id: string;
  technique_name: string;
  tactic: string;
  description: string;
  incident_count: number;
  incidents: Array<{
    incident_id: string;
    severity: string;
    context: string;
    timestamp: string;
  }>;
  mitre_url: string;
}

/**
 * CVE 정보
 */
export interface CVEInfo {
  cve_id: string;
  description: string;
  cvss_score: number;
  severity: string;
  affected_products: any;
  published_date: string;
}

/**
 * PostgreSQL 클라이언트 생성
 */
function createPGClient(): Client {
  return new Client({
    host: process.env.POSTGRES_HOST || 'postgres',
    port: parseInt(process.env.POSTGRES_PORT || '5432'),
    database: process.env.POSTGRES_DB || 'n8n',
    user: process.env.POSTGRES_USER || 'root',
    password: process.env.POSTGRES_PASSWORD || 'test',
  });
}

/**
 * 해시 목록을 TI DB에서 조회
 */
export async function checkHashesInTI(hashes: string[]): Promise<TIMatchResult[]> {
  const client = createPGClient();

  try {
    await client.connect();
    console.error(`[TI Correlator] 🔍 Checking ${hashes.length} hashes in TI DB...`);

    const query = `
      SELECT
        ioc_value as hash,
        threat_level,
        severity,
        source,
        context,
        misp_matches,
        opencti_matches,
        incident_id
      FROM public.ioc_simple
      WHERE ioc_type = 'sha256' AND ioc_value = ANY($1)
    `;

    const result = await client.query(query, [hashes]);

    console.error(`[TI Correlator] ✅ Found ${result.rows.length} matches in TI DB`);

    // 결과 매핑
    const matchedHashes = new Set(result.rows.map(r => r.hash));
    const results: TIMatchResult[] = hashes.map(hash => {
      const match = result.rows.find(r => r.hash === hash);

      if (match) {
        let verdict: 'threat' | 'unknown' | 'benign' = 'unknown';
        if (match.threat_level >= 50) {
          verdict = 'threat';
        } else if (match.threat_level >= 1) {
          verdict = 'unknown';
        } else {
          verdict = 'benign';
        }

        return {
          hash,
          matched: true,
          verdict,
          threat_level: match.threat_level,
          severity: match.severity,
          source: match.source,
          context: match.context,
          misp_matches: match.misp_matches || 0,
          opencti_matches: match.opencti_matches || 0,
        };
      } else {
        return {
          hash,
          matched: false,
          verdict: 'unknown',
          threat_level: 0,
          severity: 'unknown',
          source: 'none',
          misp_matches: 0,
          opencti_matches: 0,
        };
      }
    });

    return results;
  } catch (error) {
    console.error('[TI Correlator] ❌ Error:', error);
    // 에러 시 빈 배열 반환
    return hashes.map(hash => ({
      hash,
      matched: false,
      verdict: 'unknown',
      threat_level: 0,
      severity: 'unknown',
      source: 'error',
      misp_matches: 0,
      opencti_matches: 0,
    }));
  } finally {
    await client.end();
  }
}

/**
 * Technique IDs 배열로 MITRE ATT&CK 기법 조회
 */
export async function getMITREByTechniqueIds(techniqueIds: string[]): Promise<MITREInfo[]> {
  if (!techniqueIds || techniqueIds.length === 0) {
    return [];
  }

  const client = createPGClient();

  try {
    await client.connect();
    console.error(`[TI Correlator] 🔍 Fetching ${techniqueIds.length} MITRE techniques...`);

    const query = `
      SELECT
        technique_id,
        technique_name,
        tactic,
        description,
        incident_count,
        incidents,
        mitre_url
      FROM ioclog.ti_mitre
      WHERE technique_id = ANY($1)
    `;

    const result = await client.query(query, [techniqueIds]);

    console.error(`[TI Correlator] ✅ Found ${result.rows.length} MITRE techniques`);

    return result.rows.map(row => ({
      technique_id: row.technique_id,
      technique_name: row.technique_name,
      tactic: row.tactic,
      description: row.description,
      incident_count: row.incident_count,
      incidents: row.incidents || [],
      mitre_url: row.mitre_url,
    }));
  } catch (error) {
    console.error('[TI Correlator] ❌ MITRE query error:', error);
    return [];
  } finally {
    await client.end();
  }
}

/**
 * 인시던트 ID로 MITRE ATT&CK 기법 조회 (레거시)
 */
export async function getMITREByIncident(incidentId: string): Promise<MITREInfo[]> {
  const client = createPGClient();

  try {
    await client.connect();
    console.error(`[TI Correlator] 🔍 Fetching MITRE techniques for incident ${incidentId}...`);

    const query = `
      SELECT
        technique_id,
        technique_name,
        tactic,
        description,
        incident_count,
        incidents,
        mitre_url
      FROM ioclog.ti_mitre
      WHERE incidents @> $1::jsonb
    `;

    // incidents는 jsonb 배열이므로 incident_id를 포함하는지 확인
    const incidentFilter = JSON.stringify([{ incident_id: incidentId }]);

    const result = await client.query(query, [incidentFilter]);

    console.error(`[TI Correlator] ✅ Found ${result.rows.length} MITRE techniques`);

    return result.rows.map(row => ({
      technique_id: row.technique_id,
      technique_name: row.technique_name,
      tactic: row.tactic,
      description: row.description,
      incident_count: row.incident_count,
      incidents: row.incidents || [],
      mitre_url: row.mitre_url,
    }));
  } catch (error) {
    console.error('[TI Correlator] ❌ MITRE query error:', error);
    return [];
  } finally {
    await client.end();
  }
}

/**
 * CVE ID 목록 조회
 */
export async function getCVEDetails(cveIds: string[]): Promise<CVEInfo[]> {
  const client = createPGClient();

  try {
    await client.connect();
    console.error(`[TI Correlator] 🔍 Fetching ${cveIds.length} CVE details...`);

    const query = `
      SELECT
        cve_id,
        description,
        cvss_score,
        severity,
        affected_products,
        published_date
      FROM ioclog.ti_cve
      WHERE cve_id = ANY($1)
    `;

    const result = await client.query(query, [cveIds]);

    console.error(`[TI Correlator] ✅ Found ${result.rows.length} CVE details`);

    return result.rows.map(row => ({
      cve_id: row.cve_id,
      description: row.description,
      cvss_score: row.cvss_score,
      severity: row.severity,
      affected_products: row.affected_products,
      published_date: row.published_date,
    }));
  } catch (error) {
    console.error('[TI Correlator] ❌ CVE query error:', error);
    return [];
  } finally {
    await client.end();
  }
}

/**
 * IP 주소 목록을 TI DB에서 조회
 */
export async function checkIPsInTI(ips: string[]): Promise<TIMatchResult[]> {
  const client = createPGClient();

  try {
    await client.connect();
    console.error(`[TI Correlator] 🔍 Checking ${ips.length} IPs in TI DB...`);

    const query = `
      SELECT
        ioc_value as hash,
        threat_level,
        severity,
        source,
        context,
        misp_matches,
        opencti_matches
      FROM public.ioc_simple
      WHERE ioc_type = 'ipv4' AND ioc_value = ANY($1)
    `;

    const result = await client.query(query, [ips]);

    console.error(`[TI Correlator] ✅ Found ${result.rows.length} IP matches`);

    const results: TIMatchResult[] = ips.map(ip => {
      const match = result.rows.find(r => r.hash === ip);

      if (match) {
        let verdict: 'threat' | 'unknown' | 'benign' = 'unknown';
        if (match.threat_level >= 50) {
          verdict = 'threat';
        } else if (match.threat_level >= 1) {
          verdict = 'unknown';
        }

        return {
          hash: ip,
          matched: true,
          verdict,
          threat_level: match.threat_level,
          severity: match.severity,
          source: match.source,
          context: match.context,
          misp_matches: match.misp_matches || 0,
          opencti_matches: match.opencti_matches || 0,
        };
      } else {
        return {
          hash: ip,
          matched: false,
          verdict: 'unknown',
          threat_level: 0,
          severity: 'unknown',
          source: 'none',
          misp_matches: 0,
          opencti_matches: 0,
        };
      }
    });

    return results;
  } catch (error) {
    console.error('[TI Correlator] ❌ IP check error:', error);
    return ips.map(ip => ({
      hash: ip,
      matched: false,
      verdict: 'unknown',
      threat_level: 0,
      severity: 'unknown',
      source: 'error',
      misp_matches: 0,
      opencti_matches: 0,
    }));
  } finally {
    await client.end();
  }
}
