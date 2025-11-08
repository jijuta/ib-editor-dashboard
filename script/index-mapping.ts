import { DataType } from './nl-query-schema';

/**
 * 인덱스 매핑 정보
 */
export interface IndexMapping {
  pattern: string; // OpenSearch 인덱스 패턴
  description: string; // 설명
  summaryFields: string[]; // 요약용 필드 목록
  fullFields: string[]; // 전체 필드 목록
}

/**
 * 데이터 유형별 OpenSearch 인덱스 매핑 테이블
 */
export const INDEX_MAPPING: Record<DataType, IndexMapping> = {
  incidents: {
    pattern: 'logs-cortex_xdr-incidents-*',
    description: 'Cortex XDR 인시던트',
    summaryFields: [
      'incident_id',
      'severity',
      'description',
      'creation_time',
      'status',
    ],
    fullFields: [
      'incident_id',
      'severity',
      'status',
      'description',
      'creation_time',
      '@timestamp',
      'host_count',
      'alert_count',
      'assigned_user_mail',
      'manual_severity',
      'notes',
    ],
  },

  alerts: {
    pattern: 'logs-cortex_xdr-alerts-*',
    description: 'Cortex XDR 알럿',
    summaryFields: ['alert_id', 'name', 'severity', 'detection_timestamp'],
    fullFields: [
      'alert_id',
      'name',
      'severity',
      'category',
      'action',
      'endpoint_id',
      'host_name',
      'user_name',
      'detection_timestamp',
      'mitre_technique_id',
      'mitre_tactic',
    ],
  },

  file_artifacts: {
    pattern: 'logs-cortex_xdr-file-artifacts-*',
    description: '파일 아티팩트',
    summaryFields: ['file_path', 'file_sha256', 'is_malicious'],
    fullFields: [
      'file_path',
      'file_name',
      'file_sha256',
      'file_size',
      'file_type',
      'signer',
      'is_signed',
      'is_malicious',
      'wildfire_verdict',
    ],
  },

  network_artifacts: {
    pattern: 'logs-cortex_xdr-network-artifacts-*',
    description: '네트워크 아티팩트',
    summaryFields: ['type', 'network_remote_ip', 'network_domain'],
    fullFields: [
      'type',
      'network_remote_ip',
      'network_remote_port',
      'network_domain',
      'network_country',
      'incident_id',
      'alert_count',
      'is_manual',
      '@timestamp',
    ],
  },

  endpoints: {
    pattern: 'logs-cortex_xdr-endpoints-*',
    description: '엔드포인트',
    summaryFields: ['endpoint_id', 'endpoint_name', 'agent_status'],
    fullFields: [
      'endpoint_id',
      'endpoint_name',
      'endpoint_type',
      'os_type',
      'ip',
      'domain',
      'agent_version',
      'agent_status',
      'installation_date',
      'last_seen',
    ],
  },

  ti: {
    pattern: 'threat-intelligence-*',
    description: '위협 인텔리전스 원본 데이터 (통합)',
    summaryFields: ['ioc.type', 'ioc.value', 'severity'],
    fullFields: [
      'ioc.type',
      'ioc.value',
      'severity',
      'confidence',
      'description',
      'source',
      'first_seen',
      'last_seen',
    ],
  },

  ti_results: {
    pattern: 'ti-correlation-results-*',
    description: 'TI 상관분석 결과 (인시던트 ↔ TI DB 매칭)',
    summaryFields: [
      'source_id',
      'threat_score',
      'risk_level',
      'matched_hashes',
      'matched_ips',
      'matched_cves',
    ],
    fullFields: [
      'source_id',
      'source_type',
      'source_timestamp',
      'ti_matches',
      'threat_score',
      'risk_level',
      'confidence_level',
      'matched_hashes',
      'matched_ips',
      'matched_domains',
      'matched_cves',
      'matched_mitre',
      'analysis_factors',
      'breakdown',
      'processing_time_ms',
      'analysis_date',
    ],
  },

  audit_logs: {
    pattern: 'logs-cortex_xdr-audit-logs-*',
    description: '감사 로그',
    summaryFields: ['audit_type', 'user', 'action', 'result'],
    fullFields: [
      'audit_type',
      'user',
      'action',
      'resource',
      'result',
      'ip_address',
      'timestamp',
    ],
  },

  agent_audit_logs: {
    pattern: 'logs-cortex_xdr-agent-audit-logs-*',
    description: '에이전트 감사 로그',
    summaryFields: ['endpoint_id', 'action', 'timestamp'],
    fullFields: [
      'endpoint_id',
      'endpoint_name',
      'action',
      'process_name',
      'file_path',
      'timestamp',
    ],
  },
};

/**
 * 위협 인텔리전스 하위 인덱스 매핑
 */
export const TI_SUB_INDEX_MAPPING: Record<string, string> = {
  ioc: 'threat-intelligence-ioc',
  malware: 'threat-intelligence-malware',
  cve: 'threat-intelligence-cve',
  mitre: 'threat-intelligence-mitre',
  'apt-groups': 'threat-intelligence-apt-groups',
  'socradar-cve': 'threat-intelligence-socradar-cve',
  'socradar-campaigns': 'threat-intelligence-socradar-campaigns',
  'socradar-threat-actors': 'threat-intelligence-socradar-threat-actors',
  tools: 'threat-intelligence-tools',
  yara: 'threat-intelligence-yara',
  codesigning: 'threat-intelligence-codesigning',
  'misp-galaxy': 'threat-intelligence-misp-galaxy',
  'misp-clusters': 'threat-intelligence-misp-clusters',
};

/**
 * 데이터 유형 → 인덱스 패턴 변환
 */
export function getIndexPattern(dataType: DataType): string {
  return INDEX_MAPPING[dataType]?.pattern || '*';
}

/**
 * 데이터 유형 → 요약 필드 목록
 */
export function getSummaryFields(dataType: DataType): string[] {
  return INDEX_MAPPING[dataType]?.summaryFields || ['*'];
}

/**
 * 데이터 유형 → 전체 필드 목록
 */
export function getFullFields(dataType: DataType): string[] {
  return INDEX_MAPPING[dataType]?.fullFields || ['*'];
}

/**
 * 키워드 → 데이터 유형 매핑 (자연어 파싱용)
 */
export const KEYWORD_TO_DATATYPE: Record<string, DataType> = {
  // 인시던트
  인시던트: 'incidents',
  incident: 'incidents',
  incidents: 'incidents',

  // 알럿
  알럿: 'alerts',
  알림: 'alerts',
  alert: 'alerts',
  alerts: 'alerts',

  // 파일
  파일: 'file_artifacts',
  '파일 아티팩트': 'file_artifacts',
  해시: 'file_artifacts',
  '파일 해시': 'file_artifacts',
  file: 'file_artifacts',
  files: 'file_artifacts',
  'file artifacts': 'file_artifacts',
  hash: 'file_artifacts',

  // 네트워크
  네트워크: 'network_artifacts',
  ip: 'network_artifacts',
  '네트워크 아티팩트': 'network_artifacts',
  network: 'network_artifacts',
  'network artifacts': 'network_artifacts',

  // 엔드포인트
  엔드포인트: 'endpoints',
  호스트: 'endpoints',
  endpoint: 'endpoints',
  endpoints: 'endpoints',
  host: 'endpoints',
  hosts: 'endpoints',

  // 위협 인텔리전스 원본
  ti: 'ti',
  '위협 인텔리전스': 'ti',
  'threat intelligence': 'ti',
  'ioc 목록': 'ti',
  'ti 데이터베이스': 'ti',
  '악성코드 db': 'ti',

  // TI 상관분석 결과
  'ti 분석': 'ti_results',
  'ti 상관분석': 'ti_results',
  '위협 분석': 'ti_results',
  '위협 인텔 통계': 'ti_results',
  '위협 인텔 분석': 'ti_results',
  'ti 매칭': 'ti_results',
  'ioc 매칭': 'ti_results',
  '인리치먼트': 'ti_results',
  enrichment: 'ti_results',
  '위협 인텔': 'ti_results', // 대부분의 경우 ti_results로 매핑
  ioc: 'ti_results',

  // 감사 로그
  '감사 로그': 'audit_logs',
  'audit log': 'audit_logs',
  'audit logs': 'audit_logs',

  // 에이전트 감사 로그
  '에이전트 감사 로그': 'agent_audit_logs',
  'agent audit log': 'agent_audit_logs',
  'agent audit logs': 'agent_audit_logs',
};

/**
 * 키워드를 데이터 유형으로 변환
 */
export function keywordToDataType(keyword: string): DataType | null {
  const normalized = keyword.toLowerCase().trim();
  return KEYWORD_TO_DATATYPE[normalized] || null;
}

/**
 * 벤더명 정규화
 */
export const VENDOR_MAPPING: Record<string, string> = {
  crowdstrike: 'crowdstrike',
  크라우드스트라이크: 'crowdstrike',
  falcon: 'crowdstrike',

  microsoft: 'microsoft',
  마이크로소프트: 'microsoft',
  defender: 'microsoft',
  디펜더: 'microsoft',

  google: 'google',
  구글: 'google',
  chronicle: 'google',

  aws: 'aws',
  amazon: 'aws',
  'security hub': 'aws',
  guardduty: 'aws',

  'palo alto': 'palo-alto',
  팔로알토: 'palo-alto',
  cortex: 'palo-alto',

  fortinet: 'fortinet',
  포티넷: 'fortinet',

  cisco: 'cisco',
  시스코: 'cisco',

  wazuh: 'wazuh',
  와주: 'wazuh',
};

/**
 * 벤더명 정규화
 */
export function normalizeVendor(vendor: string): string | null {
  const normalized = vendor.toLowerCase().trim();
  return VENDOR_MAPPING[normalized] || null;
}

/**
 * Artifact 타입 매핑 (인시던트 관계 조회용)
 */
export const ARTIFACT_TYPE_MAPPING: Record<string, string> = {
  // 한글
  파일: 'files',
  '파일 아티팩트': 'files',
  네트워크: 'networks',
  '네트워크 아티팩트': 'networks',
  프로세스: 'processes',
  '프로세스 아티팩트': 'processes',
  알럿: 'alerts',
  알림: 'alerts',
  경고: 'alerts',
  레지스트리: 'registries',
  '레지스트리 아티팩트': 'registries',
  엔드포인트: 'endpoints',
  호스트: 'endpoints',
  단말: 'endpoints',

  // 영어
  file: 'files',
  files: 'files',
  'file artifacts': 'files',
  'file artifact': 'files',
  network: 'networks',
  networks: 'networks',
  'network artifacts': 'networks',
  'network artifact': 'networks',
  process: 'processes',
  processes: 'processes',
  'process artifacts': 'processes',
  'process artifact': 'processes',
  alert: 'alerts',
  alerts: 'alerts',
  registry: 'registries',
  registries: 'registries',
  'registry artifacts': 'registries',
  'registry artifact': 'registries',
  endpoint: 'endpoints',
  endpoints: 'endpoints',
  host: 'endpoints',
  hosts: 'endpoints',
};

/**
 * Artifact 타입별 인덱스 패턴 (인시던트 관계 조회용)
 */
export const INCIDENT_RELATIONSHIP_INDICES: Record<string, string> = {
  alerts: 'logs-cortex_xdr-alerts-*',
  files: 'logs-cortex_xdr-file-*',
  networks: 'logs-cortex_xdr-network-*',
  processes: 'logs-cortex_xdr-process-*',
  registries: 'logs-cortex_xdr-registry-*',
  endpoints: 'logs-cortex_xdr-endpoints-*',
};

/**
 * Artifact 타입 키워드 → 정규화
 */
export function normalizeArtifactType(keyword: string): string | null {
  const normalized = keyword.toLowerCase().trim();
  return ARTIFACT_TYPE_MAPPING[normalized] || null;
}
