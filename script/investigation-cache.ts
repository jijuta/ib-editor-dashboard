/**
 * Investigation Cache Manager
 * 인시던트 조사 결과를 JSON 파일로 저장/조회
 */

import { writeFile, readFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

/**
 * Investigation 데이터 구조
 */
export interface InvestigationData {
  incident_id: string;
  timestamp: string;
  incident: any;
  alerts: any[];
  files: any[];
  networks: any[];
  processes: any[];
  endpoints: any[];
  cves: any[];
  ti_correlation?: {
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
    ti_matched_files?: number;
    ti_matched_ips?: number;
    ti_threat_files?: number;
    ti_threat_ips?: number;
  };
}

/**
 * 캐시 디렉토리
 */
const CACHE_DIR = join(process.cwd(), 'data', 'investigations');

/**
 * Investigation 결과를 JSON 파일로 저장
 */
export async function saveInvestigation(
  data: InvestigationData
): Promise<string> {
  try {
    // 디렉토리 확인/생성
    if (!existsSync(CACHE_DIR)) {
      await mkdir(CACHE_DIR, { recursive: true });
    }

    const incidentId = data.incident_id;

    // 파일명: incident_{id}_{timestamp}.json
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `incident_${incidentId}_${timestamp}.json`;
    const filepath = join(CACHE_DIR, filename);

    // JSON 저장
    await writeFile(filepath, JSON.stringify(data, null, 2), 'utf-8');

    console.error(`[Investigation Cache] ✅ Saved: ${filepath}`);
    console.error(`[Investigation Cache] 📊 Data size: ${JSON.stringify(data).length} bytes`);

    return filepath;
  } catch (error) {
    console.error('[Investigation Cache] ❌ Save error:', error);
    throw error;
  }
}

/**
 * Investigation 결과를 파일에서 로드 (filepath 기준)
 */
export async function loadInvestigationFromPath(filepath: string): Promise<InvestigationData> {
  try {
    const content = await readFile(filepath, 'utf-8');
    const data = JSON.parse(content);

    console.error(`[Investigation Cache] ✅ Loaded: ${filepath}`);
    return data;
  } catch (error) {
    console.error('[Investigation Cache] ❌ Load error:', error);
    throw error;
  }
}

/**
 * 인시던트 ID로 가장 최근 Investigation 파일 경로 가져오기
 */
export function getInvestigationPath(incidentId: string): string | null {
  if (!existsSync(CACHE_DIR)) {
    return null;
  }

  const fs = require('fs');
  const files = fs.readdirSync(CACHE_DIR);

  // incident_{id}_*.json 패턴으로 필터링
  const pattern = `incident_${incidentId}_`;
  const matchingFiles = files
    .filter((f: string) => f.startsWith(pattern) && f.endsWith('.json'))
    .sort()
    .reverse(); // 최신 파일 먼저

  if (matchingFiles.length === 0) {
    return null;
  }

  return join(CACHE_DIR, matchingFiles[0]);
}

/**
 * 인시던트 ID로 가장 최근 Investigation 로드
 */
export async function loadInvestigation(incidentId: string): Promise<InvestigationData | null> {
  try {
    const filepath = getInvestigationPath(incidentId);

    if (!filepath) {
      console.error(`[Investigation Cache] ℹ️  No cached investigation found for ${incidentId}`);
      return null;
    }

    return await loadInvestigationFromPath(filepath);
  } catch (error) {
    console.error('[Investigation Cache] ❌ Load error:', error);
    return null;
  }
}

/**
 * Investigation 데이터를 AI 분석용으로 요약
 * (전체 데이터를 그대로 반환 - AI가 모든 매칭 정보를 검증해야 함)
 */
export function prepareForAIAnalysis(data: InvestigationData): {
  incident_id: string;
  analyst_comment: string | null;
  incident_info: {
    severity: string;
    status: string;
    description: string;
    hosts: any[];
    users: any[];
  };
  summary: any;
  all_alerts: any[];
  all_files: any[];
  all_networks: any[];
  all_cves: any[];
  all_endpoints: any[];
  ti_correlation?: any;
} {
  return {
    incident_id: data.incident_id,
    analyst_comment: data.incident?.resolve_comment || null,
    incident_info: {
      severity: data.incident?.severity || 'unknown',
      status: data.incident?.status || 'unknown',
      description: data.incident?.description || '',
      hosts: data.incident?.hosts || [],
      users: data.incident?.users || [],
    },
    summary: data.summary,
    all_alerts: data.alerts,
    all_files: data.files,
    all_networks: data.networks,
    all_cves: data.cves,
    all_endpoints: data.endpoints,
    ti_correlation: data.ti_correlation,
  };
}

/**
 * 상대 경로로 변환 (마크다운 출력용)
 */
export function getRelativePath(filepath: string): string {
  const cwd = process.cwd();
  return filepath.replace(cwd, '.');
}
