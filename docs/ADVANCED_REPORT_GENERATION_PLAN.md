# 고급 보안 보고서 생성 시스템 - 완전 설계 문서

> **작성일**: 2025-11-23
> **버전**: 1.0
> **목적**: 다층적 AI 분석을 통한 경영진급 고품질 보고서 생성
> **참고 수준**: plan.md와 동일한 상세도 및 심층성

---

## 📋 목차

1. [개요 및 현황 분석](#1-개요-및-현황-분석)
2. [데이터 아키텍처](#2-데이터-아키텍처)
3. [다단계 AI 분석 파이프라인](#3-다단계-ai-분석-파이프라인)
4. [보고서 유형별 차별화 전략](#4-보고서-유형별-차별화-전략)
5. [섹션별 AI 프롬프트 설계](#5-섹션별-ai-프롬프트-설계)
6. [고급 TI 상관분석](#6-고급-ti-상관분석)
7. [시각화 및 UI/UX](#7-시각화-및-uiux)
8. [최신 보안 트렌드 통합](#8-최신-보안-트렌드-통합)
9. [자동 번역 파이프라인](#9-자동-번역-파이프라인)
10. [구현 로드맵](#10-구현-로드맵)
11. [기술 스택 및 아키텍처](#11-기술-스택-및-아키텍처)

---

## 1. 개요 및 현황 분석

### 1.1 현재 시스템의 한계점

#### 문제 1: 단일 프롬프트 방식의 한계

**현재 방식**:
```typescript
// 현재: 모든 데이터를 하나의 프롬프트로 전달
const prompt = `
다음 일간 보안 데이터를 분석하여 JSON으로 응답하세요:
${JSON.stringify(dailyData, null, 2)}
`;

cat prompt.txt | claude --print > result.json
```

**한계점**:
- ❌ **토큰 제한**: 대량 데이터 시 컨텍스트 윈도우 초과 (Sonnet 4.5: 200K 토큰)
- ❌ **분석 깊이**: 모든 섹션을 얕게 분석 (각 섹션 200-300자)
- ❌ **번역 품질**: 영어 분석 → 한글 번역 시 의미 손실
- ❌ **재실행 불가**: 특정 섹션만 수정 시 전체 재생성 필요
- ❌ **병렬 처리 불가**: 순차 실행으로 시간 소요 (월간 보고서: 5-10분)

#### 문제 2: 영어 콘텐츠 번역 미흡

**현재 상황**:
- `description` (인시던트 설명): 영어
- `alert_name` (알럿 이름): 영어
- `mitre_technique_name` (MITRE 기법명): 영어
- `cve_description` (CVE 설명): 영어

**요구사항**:
- ✅ 실시간 번역 (Gemini Translation API)
- ✅ 컨텍스트 기반 번역 (보안 용어 정확성)
- ✅ 번역 캐싱 (동일 텍스트 재사용)

#### 문제 3: 섹션별 깊이 부족

**현재 섹션 (6개)**:
1. 요약 (50자)
2. 통계 (테이블만)
3. TOP 10 인시던트 (제목 나열)
4. 파일 해시 (TI 매칭만)
5. 주요 발견사항 (3-5줄)
6. AI 종합 의견 (500자)

**요구 섹션 (일간 9개, 주간 13개, 월간 17개)**:
- 각 섹션 500-1000자 상세 분석
- 섹션별 독립 AI 프롬프트
- 시각화 차트 15종 이상

#### 문제 4: 유형별 차별화 부족

**현재**: 일간/주간/월간 동일한 템플릿
**요구**:
- 일간 (3-5페이지, 운영팀용)
- 주간 (10-15페이지, 보안팀 + 관리자용)
- 월간 (30-50페이지, 경영진용)

### 1.2 목표 및 성공 지표

#### 핵심 목표

1. **고품질 분석**: plan.md 수준의 상세하고 심층적인 분석
2. **다국어 지원**: 영어 분석 → 한글 자동 번역
3. **섹션별 심화**: 각 섹션 독립 AI 분석 (500-1000자)
4. **유형별 특화**: 일간/주간/월간 완전히 다른 구조
5. **자동화**: Cron 기반 완전 자동화 (사용자 개입 0%)

#### 성공 지표 (KPI)

| 지표 | 현재 | 목표 | 측정 방법 |
|------|------|------|----------|
| **분석 깊이** | 섹션당 200-300자 | 섹션당 500-1000자 | 글자수 카운트 |
| **번역 정확도** | N/A | 95% 이상 | 전문가 검수 |
| **보고서 페이지 수** | 3-5페이지 (일간) | 일간 5-8, 주간 15-20, 월간 40-60 | PDF 페이지 |
| **시각화 다양성** | 3종 (라인, 막대, 도넛) | 15종 이상 | 차트 유형 카운트 |
| **생성 시간** | N/A | 일간 2분, 주간 5분, 월간 15분 | 로그 분석 |
| **경영진 만족도** | N/A | 4.5/5 이상 | 설문 조사 |
| **자동화율** | 50% | 100% | 수동 개입 횟수 |

---

## 2. 데이터 아키텍처

### 2.1 OpenSearch 인덱스 구조 (7개 인덱스)

#### 인덱스 1: incidents-* (인시던트 집계)

**총 레코드**: 2,301건 (2025-07-03 ~ 2025-09-13)

**주요 필드** (41개):
```typescript
{
  // 기본 정보
  incident_id: string,              // "414186"
  severity: "critical" | "high" | "medium" | "low",
  status: "new" | "under_investigation" | "false_positive" | "resolved_true_positive",
  creation_time: timestamp,
  modification_time: timestamp,

  // 분석 정보
  description: string,              // 영어 설명 (번역 필요)
  analyst_verdict: string | null,   // 분석가 판단 (영어, 번역 필요)
  analyst_comment: string | null,   // 분석가 코멘트 (영어, 번역 필요)

  // MITRE ATT&CK
  mitre_tactics: string[],          // ["Persistence", "Privilege Escalation"]
  mitre_techniques: string[],       // ["T1112", "T1547.001"]
  mitre_technique_names: string[],  // 영어 (번역 필요)

  // 통계
  alert_count: number,
  host_count: number,
  user_count: number,

  // 메타데이터
  playbook_name: string,
  playbook_verdict: string,
  xdr_url: string,

  // 집계 데이터
  file_sha256: string[],            // 관련 파일 해시 목록
  external_ips: string[],           // 외부 IP 목록
  domains: string[],                // 도메인 목록
  hosts: string[]                   // 영향받은 호스트
}
```

**집계 쿼리 예시**:
```json
{
  "aggs": {
    "by_severity": {
      "terms": { "field": "severity.keyword", "size": 10 }
    },
    "by_status": {
      "terms": { "field": "status.keyword", "size": 20 }
    },
    "hourly_timeline": {
      "date_histogram": {
        "field": "creation_time",
        "calendar_interval": "1h",
        "format": "yyyy-MM-dd HH:00"
      }
    },
    "top_hosts": {
      "terms": { "field": "hosts.keyword", "size": 50 },
      "aggs": {
        "avg_severity_score": {
          "avg": { "script": "params._source.severity == 'critical' ? 4 : params._source.severity == 'high' ? 3 : 2" }
        }
      }
    },
    "mitre_heatmap": {
      "terms": { "field": "mitre_tactics.keyword", "size": 20 },
      "aggs": {
        "techniques": {
          "terms": { "field": "mitre_techniques.keyword", "size": 100 }
        }
      }
    }
  }
}
```

#### 인덱스 2: alerts-* (개별 알럿)

**총 레코드**: 4,572건

**주요 필드** (63개):
```typescript
{
  // 기본 정보
  alert_id: string,
  incident_id: string,              // 부모 인시던트
  severity: "critical" | "high" | "medium" | "low" | "informational",
  alert_name: string,               // 영어 (번역 필요)
  description: string,              // 영어 (번역 필요)

  // Detection 정보
  category: string,                 // "Exploit", "Malware", "Phishing" 등
  detection_timestamp: timestamp,
  mitre_technique_id: string,       // "T1112"
  mitre_tactic_id: string,          // "TA0003"

  // 호스트 정보
  host_name: string,
  host_ip: string,
  endpoint_id: string,
  os_type: "Windows" | "Linux" | "macOS",

  // 아티팩트
  file_sha256: string,
  file_path: string,
  file_name: string,
  process_name: string,
  process_cmd: string,

  // 네트워크
  external_ip: string,
  external_port: number,
  domain: string,

  // Action
  action_taken: "Blocked" | "Allowed" | "Quarantined" | "Logged",
  is_blocked: boolean
}
```

#### 인덱스 3: file-* (파일 아티팩트)

**총 레코드**: 81,341건

**주요 필드** (28개):
```typescript
{
  // 해시
  action_file_sha256: string,       // 필수
  action_file_md5: string,

  // 파일 정보
  action_file_path: string,
  action_file_name: string,
  action_file_size: number,
  action_file_signature_vendor: string,
  action_file_signature_product: string,

  // 판정 (WildFire)
  action_file_wildfire_verdict: "benign" | "malware" | "grayware" | "unknown",
  is_malicious: boolean,

  // TI 연동
  threat_intel_sources: string[],   // ["VirusTotal", "MalwareBazaar"]
  enriched_at_v2: timestamp,        // TI 검증 시간

  // 컨텍스트
  incident_id: string,
  alert_id: string,
  host_name: string,
  process_name: string
}
```

**TI 매칭 쿼리**:
```sql
-- PostgreSQL: ti_malware 테이블 조회
SELECT
  m.hash,
  m.family,
  m.verdict,
  m.severity,
  m.first_seen,
  m.last_seen,
  m.source,
  COUNT(DISTINCT f.incident_id) as incident_count
FROM ti_malware m
JOIN opensearch_file_artifacts f ON f.action_file_sha256 = m.hash
WHERE m.hash = ANY($1)
GROUP BY m.hash, m.family, m.verdict;
```

#### 인덱스 4: network-* (네트워크 아티팩트)

**총 레코드**: 24,336건

**주요 필드** (22개):
```typescript
{
  // IP 정보
  external_ip: string,
  internal_ip: string,
  external_port: number,
  internal_port: number,
  protocol: "TCP" | "UDP" | "ICMP",

  // 도메인
  domain: string,
  is_malicious_domain: boolean,

  // GeoIP
  country: string,
  country_code: string,
  region: string,
  city: string,
  isp: string,
  asn: string,

  // TI 연동
  threat_intel_verdict: "malicious" | "suspicious" | "clean" | "unknown",
  threat_category: string[],        // ["C2", "Phishing", "Malware Distribution"]

  // 컨텍스트
  incident_id: string,
  host_name: string,
  connection_time: timestamp,
  bytes_sent: number,
  bytes_received: number
}
```

**GeoIP + TI 조인 쿼리**:
```sql
-- PostgreSQL: ti_ioc + geoip 테이블
SELECT
  ioc.ioc_value as ip,
  ioc.threat_type,
  ioc.confidence,
  ioc.tags,
  geo.country_name,
  geo.region,
  geo.isp,
  COUNT(DISTINCT net.incident_id) as incident_count,
  SUM(net.bytes_received + net.bytes_sent) as total_traffic
FROM ti_ioc ioc
LEFT JOIN geoip geo ON geo.ip = ioc.ioc_value
LEFT JOIN opensearch_network_artifacts net ON net.external_ip = ioc.ioc_value
WHERE ioc.ioc_type = 'ip'
  AND ioc.ioc_value = ANY($1)
GROUP BY ioc.ioc_value, geo.country_name;
```

#### 인덱스 5: endpoints-* (엔드포인트 정보)

**총 레코드**: 257,970건

**주요 필드** (35개):
```typescript
{
  // 호스트 정보
  endpoint_id: string,
  endpoint_name: string,
  endpoint_ip: string[],
  os_type: "Windows" | "Linux" | "macOS",
  os_version: string,

  // 에이전트
  agent_version: string,
  agent_status: "Connected" | "Disconnected" | "Isolated",
  is_isolated: boolean,
  last_seen: timestamp,

  // 도메인/사용자
  domain: string,
  users: string[],

  // 인시던트 통계
  incident_count: number,
  high_severity_count: number,
  last_incident_time: timestamp,

  // 취약점 (VA)
  cve_count: number,
  critical_cve_count: number,
  high_cve_count: number
}
```

#### 인덱스 6: va-cves-* (CVE 취약점)

**총 레코드**: 18,532건

**주요 필드** (18개):
```typescript
{
  // CVE 정보
  cve_id: string,                   // "CVE-2023-12345"
  cvss_score: number,               // 9.8
  cvss_vector: string,
  severity: "Critical" | "High" | "Medium" | "Low",

  // 설명
  description: string,              // 영어 (번역 필요)
  affected_products: string[],

  // 날짜
  published_date: timestamp,
  modified_date: timestamp,

  // 영향받은 호스트
  endpoint_id: string,
  endpoint_name: string,

  // 패치 상태
  patch_available: boolean,
  patch_date: timestamp | null,
  is_patched: boolean,

  // 컨텍스트
  incident_id: string | null
}
```

**CVE 심층 분석 쿼리**:
```sql
-- PostgreSQL: ti_cve 테이블
SELECT
  cve.cve_id,
  cve.cvss_score,
  cve.description,
  cve.affected_products,
  cve.exploit_available,
  cve.exploit_maturity,
  cve.ransomware_used,
  COUNT(DISTINCT va.endpoint_id) as affected_endpoints,
  SUM(CASE WHEN va.is_patched = false THEN 1 ELSE 0 END) as unpatched_endpoints,
  array_agg(DISTINCT va.endpoint_name) as endpoint_list
FROM ti_cve cve
LEFT JOIN opensearch_va_cves va ON va.cve_id = cve.cve_id
WHERE cve.cve_id = ANY($1)
GROUP BY cve.cve_id
ORDER BY cve.cvss_score DESC;
```

#### 인덱스 7: causality-chains-* (인과관계 체인)

**총 레코드**: ~5,000건

**주요 필드**:
```typescript
{
  incident_id: string,
  chain_id: string,
  chain_sequence: number,

  // 프로세스 체인
  process_name: string,
  process_cmd: string,
  parent_process: string,
  child_processes: string[],

  // 액션
  action_type: "Process Execution" | "File Creation" | "Registry Modification" | "Network Connection",
  action_target: string,
  action_result: "Success" | "Blocked",

  // 타임스탬프
  timestamp: timestamp
}
```

### 2.2 PostgreSQL TI 데이터베이스 (17개 테이블)

#### 테이블 1: ti_malware (멀웨어 해시 검증)

**레코드 수**: 951,940건
**크기**: 1,884 MB

**스키마**:
```sql
CREATE TABLE ti_malware (
  id SERIAL PRIMARY KEY,
  hash VARCHAR(64) UNIQUE NOT NULL,     -- SHA256
  hash_md5 VARCHAR(32),
  family VARCHAR(255),                  -- "Trojan.Generic", "Emotet", "Trickbot"
  verdict VARCHAR(50),                  -- "malicious", "suspicious", "clean"
  severity INTEGER,                     -- 0-100
  first_seen TIMESTAMP,
  last_seen TIMESTAMP,
  source VARCHAR(255),                  -- "MalwareBazaar", "VirusTotal", "MISP"
  tags TEXT[],
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_ti_malware_hash ON ti_malware(hash);
CREATE INDEX idx_ti_malware_family ON ti_malware(family);
CREATE INDEX idx_ti_malware_verdict ON ti_malware(verdict);
```

**AI 분석 쿼리** (파일 해시별 benign/threat/unknown):
```sql
-- benign 해시 (안전한 파일)
SELECT
  hash,
  family,
  source,
  'benign' as classification
FROM ti_malware
WHERE verdict = 'clean'
  AND hash = ANY($1);

-- threat 해시 (악성 파일)
SELECT
  hash,
  family,
  severity,
  tags,
  description,
  'threat' as classification
FROM ti_malware
WHERE verdict IN ('malicious', 'suspicious')
  AND hash = ANY($1);

-- unknown 해시 (TI DB에 없음)
SELECT
  hash,
  'unknown' as classification
FROM unnest($1::varchar[]) hash
WHERE hash NOT IN (SELECT hash FROM ti_malware);
```

#### 테이블 2: ti_cve (CVE 취약점 정보)

**레코드 수**: 309,069건
**크기**: 1,173 MB

**스키마**:
```sql
CREATE TABLE ti_cve (
  id SERIAL PRIMARY KEY,
  cve_id VARCHAR(20) UNIQUE NOT NULL,   -- "CVE-2023-12345"
  cvss_score DECIMAL(3,1),              -- 9.8
  cvss_vector VARCHAR(255),
  severity VARCHAR(20),                 -- "Critical", "High", "Medium", "Low"
  description TEXT,                     -- 영어 설명
  affected_products TEXT[],

  -- Exploit 정보
  exploit_available BOOLEAN,
  exploit_maturity VARCHAR(50),         -- "Not Defined", "PoC", "Functional", "High"
  exploit_published_date TIMESTAMP,

  -- 위협 인텔
  ransomware_used BOOLEAN,              -- 랜섬웨어에서 사용 여부
  apt_groups TEXT[],                    -- 사용하는 APT 그룹
  in_the_wild BOOLEAN,                  -- 실제 공격 확인 여부

  -- 날짜
  published_date TIMESTAMP,
  modified_date TIMESTAMP,

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_ti_cve_id ON ti_cve(cve_id);
CREATE INDEX idx_ti_cve_cvss_score ON ti_cve(cvss_score DESC);
CREATE INDEX idx_ti_cve_ransomware ON ti_cve(ransomware_used);
```

**호스트별 CVE 심층 분석 쿼리**:
```sql
-- 각 호스트의 CVE를 CVSS 점수, Exploit 가능성, 랜섬웨어 사용 여부로 우선순위화
SELECT
  ep.endpoint_name,
  cve.cve_id,
  cve.cvss_score,
  cve.severity,
  cve.description,
  cve.exploit_available,
  cve.exploit_maturity,
  cve.ransomware_used,
  cve.apt_groups,
  va.is_patched,
  -- 위험도 점수 계산
  (
    cve.cvss_score * 10 +
    CASE WHEN cve.exploit_available THEN 20 ELSE 0 END +
    CASE WHEN cve.ransomware_used THEN 30 ELSE 0 END +
    CASE WHEN va.is_patched THEN 0 ELSE 40 END
  ) as risk_score
FROM opensearch_endpoints ep
JOIN opensearch_va_cves va ON va.endpoint_id = ep.endpoint_id
JOIN ti_cve cve ON cve.cve_id = va.cve_id
WHERE ep.endpoint_name = $1
ORDER BY risk_score DESC
LIMIT 20;
```

#### 테이블 3: ti_ioc (IP/도메인/URL IOC)

**레코드 수**: 301,408건
**크기**: 304 MB

**스키마**:
```sql
CREATE TABLE ti_ioc (
  id SERIAL PRIMARY KEY,
  ioc_type VARCHAR(20) NOT NULL,        -- "ip", "domain", "url", "email"
  ioc_value VARCHAR(500) NOT NULL,
  threat_type VARCHAR(100),             -- "C2", "Phishing", "Malware Distribution"
  confidence INTEGER,                   -- 0-100
  tags TEXT[],

  -- GeoIP (IP only)
  country_code VARCHAR(2),
  country_name VARCHAR(100),
  region VARCHAR(100),
  city VARCHAR(100),
  isp VARCHAR(255),
  asn VARCHAR(50),

  -- 위협 인텔
  first_seen TIMESTAMP,
  last_seen TIMESTAMP,
  source VARCHAR(255),

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_ti_ioc_type_value ON ti_ioc(ioc_type, ioc_value);
CREATE INDEX idx_ti_ioc_threat_type ON ti_ioc(threat_type);
```

**외부 IP/도메인별 AI 분석 쿼리**:
```sql
-- 외부 IP별 위협 분석
SELECT
  ioc.ioc_value as ip,
  ioc.threat_type,
  ioc.confidence,
  ioc.tags,
  ioc.country_name,
  ioc.isp,
  COUNT(DISTINCT net.incident_id) as incident_count,
  COUNT(DISTINCT net.host_name) as affected_hosts,
  MIN(net.connection_time) as first_connection,
  MAX(net.connection_time) as last_connection,
  SUM(net.bytes_sent + net.bytes_received) as total_traffic
FROM ti_ioc ioc
LEFT JOIN opensearch_network_artifacts net ON net.external_ip = ioc.ioc_value
WHERE ioc.ioc_type = 'ip'
  AND ioc.ioc_value = ANY($1)
GROUP BY ioc.ioc_value, ioc.threat_type, ioc.country_name;
```

#### 테이블 4: ti_mitre (MITRE ATT&CK 기법)

**레코드 수**: 1,950건
**크기**: 5,592 KB

**스키마**:
```sql
CREATE TABLE ti_mitre (
  id SERIAL PRIMARY KEY,
  technique_id VARCHAR(20) UNIQUE NOT NULL,  -- "T1112", "T1547.001"
  technique_name VARCHAR(255),               -- "Modify Registry"
  tactic VARCHAR(100),                       -- "Persistence"
  tactic_id VARCHAR(20),                     -- "TA0003"
  description TEXT,                          -- 영어 설명

  -- 메타데이터
  data_sources TEXT[],
  platforms TEXT[],                          -- ["Windows", "Linux"]
  permissions_required TEXT[],

  -- 탐지/완화
  detection TEXT,
  mitigation TEXT,

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_ti_mitre_technique_id ON ti_mitre(technique_id);
CREATE INDEX idx_ti_mitre_tactic ON ti_mitre(tactic);
```

#### 테이블 5: ti_apt_groups (APT 그룹 정보)

**레코드 수**: 470건
**크기**: 5,304 KB

**스키마**:
```sql
CREATE TABLE ti_apt_groups (
  id SERIAL PRIMARY KEY,
  group_name VARCHAR(255) UNIQUE NOT NULL,  -- "APT28", "Lazarus Group"
  aliases TEXT[],                           -- ["Fancy Bear", "Sofacy"]
  country VARCHAR(100),                     -- "Russia", "North Korea"
  description TEXT,

  -- TTP
  techniques TEXT[],                        -- ["T1112", "T1547.001"]
  malware_families TEXT[],                  -- ["Emotet", "Trickbot"]
  targets TEXT[],                           -- 공격 대상 산업

  -- 활동
  first_seen TIMESTAMP,
  last_seen TIMESTAMP,
  is_active BOOLEAN,

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_ti_apt_groups_name ON ti_apt_groups(group_name);
CREATE INDEX idx_ti_apt_groups_country ON ti_apt_groups(country);
```

**해시 → APT 그룹 매핑 쿼리**:
```sql
-- 파일 해시 → 멀웨어 패밀리 → APT 그룹 연결
SELECT DISTINCT
  apt.group_name,
  apt.country,
  apt.description,
  array_agg(DISTINCT m.family) as malware_families_used,
  array_agg(DISTINCT apt.techniques) as techniques_used,
  COUNT(DISTINCT inc.incident_id) as related_incidents
FROM ti_malware m
JOIN ti_apt_groups apt
  ON m.family = ANY(apt.malware_families)
LEFT JOIN opensearch_incidents inc
  ON inc.file_sha256 && ARRAY[m.hash]
WHERE m.hash = ANY($1)
GROUP BY apt.group_name, apt.country, apt.description;
```

#### 추가 테이블 (12개)

| 테이블명 | 레코드 수 | 용도 |
|---------|-----------|------|
| **ti_misp_events** | ~50,000 | MISP 이벤트 정보 |
| **ti_misp_attributes** | ~500,000 | MISP 속성 (IOC) |
| **ti_misp_objects** | ~100,000 | MISP 오브젝트 (파일, 네트워크) |
| **ti_virustotal_cache** | ~200,000 | VirusTotal 캐시 |
| **ti_ransomware_families** | ~300 | 랜섬웨어 패밀리 정보 |
| **ti_exploit_db** | ~50,000 | Exploit DB 참조 |
| **ti_threat_actors** | ~800 | 위협 액터 정보 |
| **ti_campaigns** | ~1,200 | 공격 캠페인 |
| **ti_yara_rules** | ~5,000 | YARA 룰 정보 |
| **ti_sigma_rules** | ~3,000 | Sigma 룰 정보 |
| **ti_geoip** | ~10,000,000 | GeoIP 데이터 |
| **ti_asn** | ~100,000 | ASN 정보 |

### 2.3 데이터 수집 강화 전략

#### 강화 1: 시계열 집계

**목적**: 트렌드 분석, 패턴 탐지

```typescript
// 24시간 타임라인 (시간대별)
const hourlyAgg = {
  aggs: {
    hourly_timeline: {
      date_histogram: {
        field: 'creation_time',
        calendar_interval: '1h',
        format: 'yyyy-MM-dd HH:00',
        time_zone: 'Asia/Seoul'
      },
      aggs: {
        by_severity: {
          terms: { field: 'severity.keyword' }
        }
      }
    }
  }
};

// 7일 일별 추이
const dailyTrendAgg = {
  aggs: {
    daily_trend: {
      date_histogram: {
        field: 'creation_time',
        calendar_interval: '1d',
        format: 'yyyy-MM-dd',
        extended_bounds: {
          min: 'now-7d/d',
          max: 'now/d'
        }
      },
      aggs: {
        avg_mttr: {
          avg: {
            field: 'resolution_time_minutes'
          }
        }
      }
    }
  }
};

// 30일 주별 추이 (월간 보고서)
const weeklyTrendAgg = {
  aggs: {
    weekly_trend: {
      date_histogram: {
        field: 'creation_time',
        calendar_interval: '1w',
        format: 'yyyy-MM-dd'
      }
    }
  }
};
```

#### 강화 2: TOP N 집계

```typescript
// TOP 50 호스트 (인시던트 발생 횟수순)
const topHostsAgg = {
  aggs: {
    top_hosts: {
      terms: {
        field: 'hosts.keyword',
        size: 50,
        order: { _count: 'desc' }
      },
      aggs: {
        by_severity: {
          terms: { field: 'severity.keyword' }
        },
        avg_resolution_time: {
          avg: { field: 'resolution_time_minutes' }
        },
        latest_incident: {
          top_hits: {
            size: 1,
            sort: [{ creation_time: 'desc' }],
            _source: ['incident_id', 'description', 'severity']
          }
        }
      }
    }
  }
};

// TOP 50 사용자
const topUsersAgg = {
  aggs: {
    top_users: {
      terms: {
        field: 'users.keyword',
        size: 50
      }
    }
  }
};

// TOP 20 파일 해시
const topHashesAgg = {
  aggs: {
    top_file_hashes: {
      terms: {
        field: 'file_sha256.keyword',
        size: 20
      },
      aggs: {
        unique_hosts: {
          cardinality: { field: 'hosts.keyword' }
        }
      }
    }
  }
};

// TOP 20 외부 IP
const topExternalIPsAgg = {
  aggs: {
    top_external_ips: {
      terms: {
        field: 'external_ips.keyword',
        size: 20
      },
      aggs: {
        connection_count: {
          sum: { field: 'connection_count' }
        }
      }
    }
  }
};

// TOP 15 MITRE 기법
const topMITREAgg = {
  aggs: {
    top_mitre_techniques: {
      terms: {
        field: 'mitre_techniques.keyword',
        size: 15,
        order: { _count: 'desc' }
      },
      aggs: {
        by_tactic: {
          terms: { field: 'mitre_tactics.keyword' }
        }
      }
    }
  }
};

// TOP 10 CVE
const topCVEsAgg = {
  aggs: {
    top_cves: {
      terms: {
        field: 'cve_id.keyword',
        size: 10,
        order: { avg_cvss: 'desc' }
      },
      aggs: {
        avg_cvss: {
          avg: { field: 'cvss_score' }
        },
        affected_endpoints: {
          cardinality: { field: 'endpoint_id.keyword' }
        }
      }
    }
  }
};
```

#### 강화 3: MITRE ATT&CK 히트맵

```typescript
// 14 Tactics x ~200 Techniques 매트릭스
const mitreHeatmapAgg = {
  aggs: {
    by_tactic: {
      terms: {
        field: 'mitre_tactics.keyword',
        size: 20  // 14개 Tactic + 여유
      },
      aggs: {
        by_technique: {
          terms: {
            field: 'mitre_techniques.keyword',
            size: 100  // 각 Tactic당 최대 100개 Technique
          },
          aggs: {
            incident_count: {
              cardinality: { field: 'incident_id.keyword' }
            },
            severity_breakdown: {
              terms: { field: 'severity.keyword' }
            }
          }
        }
      }
    }
  }
};

// 출력 형식
interface MITREHeatmap {
  tactics: {
    [tacticName: string]: {
      techniques: {
        [techniqueID: string]: {
          incident_count: number;
          critical: number;
          high: number;
          medium: number;
          low: number;
        };
      };
    };
  };
}
```

#### 강화 4: 네트워크 위협 GeoIP

```typescript
// 국가별 악성 IP 분포
const geoIPThreatAgg = {
  aggs: {
    by_country: {
      terms: {
        field: 'external_ip_country.keyword',
        size: 50
      },
      aggs: {
        threat_level_avg: {
          avg: { field: 'threat_level' }
        },
        connection_count: {
          sum: { field: 'connection_count' }
        },
        traffic_volume: {
          sum: {
            script: 'doc["bytes_sent"].value + doc["bytes_received"].value'
          }
        },
        top_ips: {
          terms: {
            field: 'external_ip.keyword',
            size: 5
          }
        }
      }
    }
  }
};
```

---

## 3. 다단계 AI 분석 파이프라인

### 3.1 전체 파이프라인 아키텍처

```
┌─────────────────────────────────────────────────────────────┐
│                   Phase 1: 데이터 수집                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1-1. OpenSearch 집계 쿼리 (7개 인덱스)                      │
│       ├─ incidents-* (인시던트 집계)                         │
│       ├─ alerts-* (알럿 상세)                                │
│       ├─ file-* (파일 해시)                                  │
│       ├─ network-* (네트워크 연결)                           │
│       ├─ endpoints-* (호스트 정보)                           │
│       ├─ va-cves-* (취약점)                                  │
│       └─ causality-chains-* (인과관계)                       │
│                                                              │
│  1-2. PostgreSQL TI 상관분석 (17개 테이블)                   │
│       ├─ ti_malware (951K) - 파일 해시 검증                 │
│       ├─ ti_cve (309K) - CVE 상세 정보                      │
│       ├─ ti_ioc (301K) - IP/도메인 위협 정보                │
│       ├─ ti_mitre (1.9K) - MITRE 기법 설명                  │
│       ├─ ti_apt_groups (470) - APT 그룹 매핑                │
│       └─ 12개 추가 테이블 (MISP, VT, GeoIP 등)              │
│                                                              │
│  1-3. 데이터 전처리                                          │
│       ├─ 영어 텍스트 분리 (번역 대상)                       │
│       ├─ 파일 해시 분류 (benign/threat/unknown)             │
│       ├─ IP 분류 (내부/외부, 위협/안전)                     │
│       └─ CVE 우선순위화 (CVSS, Exploit, Ransomware)         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────┐
│                   Phase 2: 섹션별 AI 분석                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  2-1. 일간 보고서 (9개 섹션, 병렬 실행)                      │
│       ┌─────────────────────────────────────┐              │
│       │ Section 1: 일일 개요                │ → Gemini 2.0 Flash  │
│       │ Section 2: 인시던트 현황             │ → Gemini 2.0 Flash  │
│       │ Section 3: 심각도 분포               │ → Gemini 2.0 Flash  │
│       │ Section 4: TOP 10 인시던트           │ → Claude Sonnet 4.5 │
│       │ Section 5: 시간대별 발생 추이        │ → Gemini 2.0 Flash  │
│       │ Section 6: 영향받은 호스트           │ → Gemini 2.0 Flash  │
│       │ Section 7: 신규 파일 해시            │ → Claude Sonnet 4.5 │
│       │ Section 8: 긴급 조치사항             │ → Gemini 2.5 Pro    │
│       │ Section 9: AI 종합 의견              │ → Gemini 2.5 Pro    │
│       └─────────────────────────────────────┘              │
│                                                              │
│  2-2. 주간 보고서 (13개 섹션, 병렬 실행)                     │
│       ┌─────────────────────────────────────┐              │
│       │ ... (일간 9개 섹션)                  │              │
│       │ Section 10: MITRE ATT&CK 매핑        │ → Claude Sonnet 4.5 │
│       │ Section 11: 위협 파일 해시 분석      │ → Claude Sonnet 4.5 │
│       │ Section 12: 네트워크 아티팩트        │ → Claude Sonnet 4.5 │
│       │ Section 13: CVE 취약점               │ → Claude Sonnet 4.5 │
│       └─────────────────────────────────────┘              │
│                                                              │
│  2-3. 월간 보고서 (17개 섹션, 병렬 실행)                     │
│       ┌─────────────────────────────────────┐              │
│       │ Section 1: 경영진 요약               │ → GPT-4 Turbo       │
│       │ Section 2: 월간 지표                 │ → Gemini 2.5 Pro    │
│       │ ... (주간 13개 섹션)                 │              │
│       │ Section 14: MITRE 히트맵             │ → Claude Sonnet 4.5 │
│       │ Section 15: 컴플라이언스 지표        │ → Gemini 2.5 Pro    │
│       │ Section 16: 보안 운영 효율           │ → Gemini 2.5 Pro    │
│       │ Section 17: 최종 AI 종합 분석        │ → GPT-4 Turbo       │
│       └─────────────────────────────────────┘              │
│                                                              │
│  2-4. 영어 콘텐츠 번역 (병렬 실행)                           │
│       ├─ description (인시던트 설명) → Gemini Translation   │
│       ├─ analyst_comment (분석가 코멘트) → Gemini Translation│
│       ├─ mitre_technique_name → Gemini Translation          │
│       ├─ cve_description → Gemini Translation               │
│       └─ 번역 캐싱 (Redis, 동일 텍스트 재사용)              │
│                                                              │
└─────────────────────────────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────┐
│                   Phase 3: 종합 및 통합                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  3-1. 섹션 결과 병합                                         │
│       ├─ 각 AI 분석 결과 JSON 수집                          │
│       ├─ 번역 결과 통합                                     │
│       └─ 오류 처리 (재시도, 기본값)                         │
│                                                              │
│  3-2. HTML 보고서 생성                                       │
│       ├─ Tailwind CSS 스타일링                              │
│       ├─ Chart.js 차트 15종                                 │
│       ├─ D3.js 고급 시각화 (히트맵, Sankey)                 │
│       └─ 인터랙티브 요소                                    │
│                                                              │
│  3-3. PDF 변환                                               │
│       ├─ react-pdf (경영진용)                               │
│       └─ Puppeteer (인쇄 최적화)                            │
│                                                              │
│  3-4. 파일 저장 및 알림                                      │
│       ├─ public/reports/daily/*.html                        │
│       ├─ public/reports/weekly/*.html                       │
│       ├─ public/reports/monthly/*.html + .pdf               │
│       └─ Slack/Email 알림                                   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Phase 1: 데이터 수집 상세

#### 스크립트: `collect-advanced-report-data.ts`

```typescript
/**
 * 고급 보고서 데이터 수집
 * - OpenSearch 7개 인덱스 집계
 * - PostgreSQL TI 상관분석
 * - 데이터 전처리 (분류, 우선순위화)
 */

import { Client } from '@opensearch-project/opensearch';
import { Pool } from 'pg';

interface AdvancedReportData {
  // 기본 통계
  summary: {
    total_incidents: number;
    by_severity: { [key: string]: number };
    by_status: { [key: string]: number };
    mttr_average: number;
    resolution_rate: number;
  };

  // 시계열
  timeline: {
    hourly: Array<{ time: string; count: number; by_severity: object }>;
    daily: Array<{ date: string; count: number; avg_mttr: number }>;
    weekly?: Array<{ week: string; count: number }>;
  };

  // TOP N
  top_hosts: Array<{
    host_name: string;
    incident_count: number;
    severities: object;
    avg_resolution_time: number;
    latest_incident: object;
  }>;

  top_users: Array<{ user: string; incident_count: number }>;
  top_file_hashes: Array<{ hash: string; count: number; unique_hosts: number }>;
  top_external_ips: Array<{ ip: string; count: number; connections: number }>;
  top_mitre_techniques: Array<{ technique_id: string; tactic: string; count: number }>;
  top_cves: Array<{ cve_id: string; cvss_score: number; affected_endpoints: number }>;

  // MITRE 히트맵
  mitre_heatmap: {
    [tactic: string]: {
      [technique: string]: {
        incident_count: number;
        severity_breakdown: object;
      };
    };
  };

  // 네트워크 위협 (GeoIP)
  geo_threats: Array<{
    country: string;
    threat_level_avg: number;
    connection_count: number;
    traffic_volume: number;
    top_ips: string[];
  }>;

  // TI 상관분석
  ti_correlation: {
    // 파일 해시 (분류별)
    file_hashes_benign: Array<{ hash: string; family: string; source: string }>;
    file_hashes_threat: Array<{ hash: string; family: string; severity: number; tags: string[] }>;
    file_hashes_unknown: Array<{ hash: string }>;

    // APT 캠페인
    apt_campaigns: Array<{
      apt_group: string;
      country: string;
      malware_families: string[];
      techniques: string[];
      related_incidents: number;
    }>;

    // IP/도메인 위협
    ip_threats: Array<{
      ip: string;
      threat_type: string;
      confidence: number;
      country: string;
      isp: string;
      incident_count: number;
      affected_hosts: number;
      traffic_volume: number;
    }>;

    // CVE 우선순위 (호스트별)
    cve_by_host: {
      [host_name: string]: Array<{
        cve_id: string;
        cvss_score: number;
        description: string;
        exploit_available: boolean;
        ransomware_used: boolean;
        is_patched: boolean;
        risk_score: number;
      }>;
    };
  };

  // 영어 텍스트 (번역 대상)
  translations_needed: {
    incident_descriptions: Array<{ incident_id: string; text: string }>;
    analyst_comments: Array<{ incident_id: string; text: string }>;
    mitre_techniques: Array<{ technique_id: string; name: string; description: string }>;
    cve_descriptions: Array<{ cve_id: string; description: string }>;
  };
}

async function collectAdvancedReportData(
  reportType: 'daily' | 'weekly' | 'monthly',
  reportDate: string
): Promise<AdvancedReportData> {

  const osClient = new Client({ node: process.env.OPENSEARCH_URL });
  const pgPool = new Pool({ connectionString: process.env.DATABASE_URL });

  // 1. OpenSearch 집계 쿼리 (병렬 실행)
  const [
    summaryResult,
    timelineResult,
    topHostsResult,
    topUsersResult,
    topHashesResult,
    topIPsResult,
    topMITREResult,
    topCVEsResult,
    mitreHeatmapResult,
    geoThreatsResult
  ] = await Promise.all([
    osClient.search({ index: 'logs-cortex_xdr-incidents-*', body: summaryQuery }),
    osClient.search({ index: 'logs-cortex_xdr-incidents-*', body: timelineQuery }),
    osClient.search({ index: 'logs-cortex_xdr-incidents-*', body: topHostsQuery }),
    osClient.search({ index: 'logs-cortex_xdr-incidents-*', body: topUsersQuery }),
    osClient.search({ index: 'logs-cortex_xdr-file-*', body: topHashesQuery }),
    osClient.search({ index: 'logs-cortex_xdr-network-*', body: topIPsQuery }),
    osClient.search({ index: 'logs-cortex_xdr-incidents-*', body: topMITREQuery }),
    osClient.search({ index: 'logs-cortex_xdr-va-cves-*', body: topCVEsQuery }),
    osClient.search({ index: 'logs-cortex_xdr-incidents-*', body: mitreHeatmapQuery }),
    osClient.search({ index: 'logs-cortex_xdr-network-*', body: geoThreatsQuery })
  ]);

  // 2. PostgreSQL TI 상관분석 (병렬 실행)
  const fileHashes = extractFileHashes(topHashesResult);
  const externalIPs = extractExternalIPs(topIPsResult);
  const cveIDs = extractCVEIDs(topCVEsResult);

  const [
    fileHashesBenign,
    fileHashesThreat,
    fileHashesUnknown,
    aptCampaigns,
    ipThreats,
    cveByHost
  ] = await Promise.all([
    pgPool.query(tiMalwareBenignQuery, [fileHashes]),
    pgPool.query(tiMalwareThreatQuery, [fileHashes]),
    pgPool.query(tiMalwareUnknownQuery, [fileHashes]),
    pgPool.query(tiAPTCampaignsQuery, [fileHashes]),
    pgPool.query(tiIOCThreatsQuery, [externalIPs]),
    pgPool.query(tiCVEByHostQuery, [cveIDs])
  ]);

  // 3. 영어 텍스트 추출 (번역 대상)
  const translationsNeeded = extractEnglishTexts(summaryResult);

  return {
    summary: parseSummary(summaryResult),
    timeline: parseTimeline(timelineResult),
    top_hosts: parseTopHosts(topHostsResult),
    // ... (생략)
    ti_correlation: {
      file_hashes_benign: fileHashesBenign.rows,
      file_hashes_threat: fileHashesThreat.rows,
      file_hashes_unknown: fileHashesUnknown.rows,
      apt_campaigns: aptCampaigns.rows,
      ip_threats: ipThreats.rows,
      cve_by_host: parseCVEByHost(cveByHost.rows)
    },
    translations_needed
  };
}
```

### 3.3 Phase 2: 섹션별 AI 분석 상세

#### 병렬 AI 분석 오케스트레이터

```typescript
/**
 * 섹션별 AI 분석 병렬 실행
 * - 일간: 9개 섹션
 * - 주간: 13개 섹션
 * - 월간: 17개 섹션
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface SectionAnalysis {
  section_id: string;
  section_title: string;
  ai_model: 'gemini-2.0-flash' | 'gemini-2.5-pro' | 'claude-sonnet-4.5' | 'gpt-4-turbo';
  input_data: any;
  prompt_template: string;
  output: string;
  execution_time: number;
}

async function analyzeSectionsInParallel(
  reportType: 'daily' | 'weekly' | 'monthly',
  reportData: AdvancedReportData
): Promise<SectionAnalysis[]> {

  // 섹션별 AI 모델 할당
  const sectionConfigs = getSectionConfigs(reportType);

  // 병렬 실행 (Promise.all)
  const analysisPromises = sectionConfigs.map(async (config) => {
    const startTime = Date.now();

    // 프롬프트 생성
    const prompt = generatePrompt(config, reportData);

    // claude --print 실행
    const { stdout } = await execAsync(
      `echo "${escapePrompt(prompt)}" | claude --print --model ${config.ai_model}`
    );

    const executionTime = Date.now() - startTime;

    return {
      section_id: config.section_id,
      section_title: config.section_title,
      ai_model: config.ai_model,
      input_data: config.input_data,
      prompt_template: config.prompt_template,
      output: stdout.trim(),
      execution_time: executionTime
    };
  });

  // 모든 섹션 병렬 실행 및 대기
  const results = await Promise.all(analysisPromises);

  console.log(`✅ ${results.length}개 섹션 분석 완료 (총 ${Math.max(...results.map(r => r.execution_time))}ms)`);

  return results;
}

function getSectionConfigs(reportType: string) {
  const configs = {
    daily: [
      {
        section_id: 'daily_overview',
        section_title: '일일 개요',
        ai_model: 'gemini-2.0-flash',
        prompt_template: 'daily_overview_prompt'
      },
      {
        section_id: 'incident_status',
        section_title: '인시던트 현황',
        ai_model: 'gemini-2.0-flash',
        prompt_template: 'incident_status_prompt'
      },
      {
        section_id: 'severity_distribution',
        section_title: '심각도 분포',
        ai_model: 'gemini-2.0-flash',
        prompt_template: 'severity_distribution_prompt'
      },
      {
        section_id: 'top_10_incidents',
        section_title: 'TOP 10 인시던트',
        ai_model: 'claude-sonnet-4.5',  // 심층 분석 필요
        prompt_template: 'top_10_incidents_prompt'
      },
      {
        section_id: 'hourly_trend',
        section_title: '시간대별 발생 추이',
        ai_model: 'gemini-2.0-flash',
        prompt_template: 'hourly_trend_prompt'
      },
      {
        section_id: 'affected_hosts',
        section_title: '영향받은 호스트',
        ai_model: 'gemini-2.0-flash',
        prompt_template: 'affected_hosts_prompt'
      },
      {
        section_id: 'new_file_hashes',
        section_title: '신규 파일 해시',
        ai_model: 'claude-sonnet-4.5',  // TI 분석 필요
        prompt_template: 'new_file_hashes_prompt'
      },
      {
        section_id: 'urgent_actions',
        section_title: '긴급 조치사항',
        ai_model: 'gemini-2.5-pro',  // 우선순위 판단 필요
        prompt_template: 'urgent_actions_prompt'
      },
      {
        section_id: 'ai_summary',
        section_title: 'AI 종합 의견',
        ai_model: 'gemini-2.5-pro',  // 종합 분석 필요
        prompt_template: 'ai_summary_prompt'
      }
    ],

    weekly: [
      // ... (daily 9개 + 추가 4개)
      {
        section_id: 'mitre_mapping',
        section_title: 'MITRE ATT&CK 매핑',
        ai_model: 'claude-sonnet-4.5',  // 복잡한 분석
        prompt_template: 'mitre_mapping_prompt'
      },
      {
        section_id: 'threat_file_hashes',
        section_title: '위협 파일 해시 분석',
        ai_model: 'claude-sonnet-4.5',
        prompt_template: 'threat_file_hashes_prompt'
      },
      {
        section_id: 'network_artifacts',
        section_title: '네트워크 아티팩트',
        ai_model: 'claude-sonnet-4.5',
        prompt_template: 'network_artifacts_prompt'
      },
      {
        section_id: 'cve_vulnerabilities',
        section_title: 'CVE 취약점',
        ai_model: 'claude-sonnet-4.5',
        prompt_template: 'cve_vulnerabilities_prompt'
      }
    ],

    monthly: [
      // ... (weekly 13개 + 추가 4개)
      {
        section_id: 'executive_summary',
        section_title: '경영진 요약',
        ai_model: 'gpt-4-turbo',  // 경영진용 고급 요약
        prompt_template: 'executive_summary_prompt'
      },
      {
        section_id: 'mitre_heatmap',
        section_title: 'MITRE ATT&CK 히트맵',
        ai_model: 'claude-sonnet-4.5',
        prompt_template: 'mitre_heatmap_prompt'
      },
      {
        section_id: 'compliance_metrics',
        section_title: '컴플라이언스 지표',
        ai_model: 'gemini-2.5-pro',
        prompt_template: 'compliance_metrics_prompt'
      },
      {
        section_id: 'final_comprehensive_analysis',
        section_title: '최종 종합 분석',
        ai_model: 'gpt-4-turbo',  // 경영진용 10+ 문단 상세 분석
        prompt_template: 'final_comprehensive_analysis_prompt'
      }
    ]
  };

  return configs[reportType];
}
```

### 3.4 Phase 3: 종합 및 통합

#### HTML 보고서 생성

```typescript
/**
 * HTML 보고서 생성
 * - Tailwind CSS 스타일링
 * - Chart.js 차트 15종
 * - D3.js 고급 시각화
 * - 인터랙티브 요소
 */

import { renderToString } from 'react-dom/server';
import fs from 'fs/promises';

async function generateHTMLReport(
  reportType: string,
  reportDate: string,
  reportData: AdvancedReportData,
  sectionAnalyses: SectionAnalysis[],
  translations: TranslationResults
) {
  // 1. React 컴포넌트로 렌더링
  const reportHTML = renderToString(
    <AdvancedReport
      type={reportType}
      date={reportDate}
      data={reportData}
      analyses={sectionAnalyses}
      translations={translations}
    />
  );

  // 2. Tailwind CSS + Chart.js 삽입
  const fullHTML = `
    <!DOCTYPE html>
    <html lang="ko">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${reportType === 'monthly' ? '월간' : reportType === 'weekly' ? '주간' : '일간'} 보안 보고서 - ${reportDate}</title>

      <!-- Tailwind CSS -->
      <script src="https://cdn.tailwindcss.com"></script>

      <!-- Chart.js -->
      <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>

      <!-- D3.js -->
      <script src="https://d3js.org/d3.v7.min.js"></script>

      <style>
        @media print {
          .no-print { display: none; }
          .page-break { page-break-after: always; }
        }

        /* 다크모드 */
        @media (prefers-color-scheme: dark) {
          :root {
            --bg-color: #1a1a1a;
            --text-color: #e0e0e0;
          }
        }
      </style>
    </head>
    <body class="bg-gray-50 text-gray-900 dark:bg-gray-900 dark:text-gray-100">
      ${reportHTML}

      <!-- Chart.js 초기화 -->
      <script>
        // 차트 15종 초기화
        ${generateChartScripts(reportData, sectionAnalyses)}
      </script>
    </body>
    </html>
  `;

  // 3. 파일 저장
  const outputPath = `public/reports/${reportType}/report_${reportDate}.html`;
  await fs.writeFile(outputPath, fullHTML, 'utf-8');

  console.log(`✅ HTML 보고서 저장: ${outputPath}`);

  return outputPath;
}
```

---

## 4. 보고서 유형별 차별화 전략

### 4.1 일간 보고서 (Daily Report)

**목적**: 운영팀의 일일 보안 현황 파악
**대상**: 보안 엔지니어, SOC 분석가
**페이지 수**: 5-8페이지 (A4 기준)
**생성 시간**: 2분 이내

#### 섹션 구성 (9개)

| # | 섹션명 | 데이터 소스 | AI 모델 | 페이지 | 설명 |
|---|--------|-----------|---------|--------|------|
| 1 | 일일 개요 | incidents 집계 | Gemini 2.0 Flash | 0.5p | 총 인시던트, 전일 대비, MTTR, 해결률 |
| 2 | 인시던트 현황 | incidents 상태별 | Gemini 2.0 Flash | 0.5p | 상태별 분포 (도넛 차트) |
| 3 | 심각도 분포 | incidents 심각도별 | Gemini 2.0 Flash | 0.5p | 심각도별 카운트 (가로 막대) |
| 4 | TOP 10 인시던트 | incidents TOP 10 | Claude Sonnet 4.5 | 2p | 우선순위 정렬 + 각 인시던트 요약 (200자) |
| 5 | 시간대별 발생 추이 | incidents hourly | Gemini 2.0 Flash | 0.5p | 24시간 타임라인 (라인 차트) |
| 6 | 영향받은 호스트 | incidents by host | Gemini 2.0 Flash | 0.5p | TOP 10 호스트 (가로 막대) |
| 7 | 신규 파일 해시 | file + ti_malware | Claude Sonnet 4.5 | 1.5p | 첫 등장 해시 TI 검증 + VirusTotal |
| 8 | 긴급 조치사항 | incidents 미해결 | Gemini 2.5 Pro | 0.5p | Critical/High 미해결 알림 |
| 9 | AI 종합 의견 | 전체 데이터 | Gemini 2.5 Pro | 1.5p | 패턴 분석 + 권장 조치 체크리스트 |

#### 차트 종류 (7종)

1. **메트릭 카드 (4개)**: 총 인시던트, 전일 대비 증감, MTTR, 해결률
2. **도넛 차트**: 상태별 분포
3. **가로 막대 차트 (2개)**: 심각도별, 호스트별
4. **라인 차트**: 24시간 타임라인
5. **테이블 (2개)**: TOP 10 인시던트, 신규 파일 해시
6. **알림 카드**: 긴급 조치사항

### 4.2 주간 보고서 (Weekly Report)

**목적**: 보안팀 + 관리자의 주간 트렌드 파악
**대상**: 보안팀 전체, IT 관리자, 보안 책임자
**페이지 수**: 15-20페이지
**생성 시간**: 5분 이내

#### 섹션 구성 (13개)

**1-9번**: 일간 보고서와 동일 (단, 7일 집계)

**추가 섹션 (4개)**:

| # | 섹션명 | 데이터 소스 | AI 모델 | 페이지 | 설명 |
|---|--------|-----------|---------|--------|------|
| 10 | MITRE ATT&CK 매핑 | incidents MITRE + ti_mitre | Claude Sonnet 4.5 | 3p | TOP 15 기법, 전주 대비 증감, 기법별 상세 설명 (한글) |
| 11 | 위협 파일 해시 분석 | file + ti_malware | Claude Sonnet 4.5 | 3p | 악성 해시 TOP 20, 멀웨어 패밀리별 분류, APT 연결 |
| 12 | 네트워크 아티팩트 | network + ti_ioc | Claude Sonnet 4.5 | 3p | 외부 통신 TOP 20, GeoIP 분석, 위협 IP 상세 |
| 13 | CVE 취약점 | va-cves + ti_cve | Claude Sonnet 4.5 | 2p | Critical/High CVE, 패치 상태, Exploit 가능성 |

#### 차트 종류 (12종)

일간 7종 + 추가 5종:
- **MITRE 가로 막대 차트**: TOP 15 기법
- **멀웨어 패밀리 도넛 차트**: 패밀리별 분포
- **GeoIP 세계 지도**: 국가별 위협 분포
- **CVE CVSS 막대 차트**: CVE별 CVSS 점수
- **7일 트렌드 라인 차트**: 일별 인시던트 추이

### 4.3 월간 보고서 (Monthly Report)

**목적**: 경영진 보고 + 보안 태세 평가
**대상**: C-level, 이사회, 보안 책임자
**페이지 수**: 40-60페이지
**생성 시간**: 15분 이내

#### 섹션 구성 (17개)

| # | 섹션명 | 데이터 소스 | AI 모델 | 페이지 | 설명 |
|---|--------|-----------|---------|--------|------|
| 1 | 경영진 요약 | 전체 통계 | GPT-4 Turbo | 2p | C-level용 2-3문단, 비즈니스 영향 포함 |
| 2 | 월간 지표 | 30일 집계 | Gemini 2.5 Pro | 3p | 10+ KPI, MoM 비교, 목표 대비 실적 |
| 3-13 | (주간 보고서 11개 섹션) | 30일 집계 | 동일 | 30p | 주간 보고서 섹션 (30일 데이터) |
| 14 | MITRE ATT&CK 히트맵 | incidents + ti_mitre | Claude Sonnet 4.5 | 5p | 14 Tactics x 200 Techniques 매트릭스 |
| 15 | 컴플라이언스 지표 | incidents + audit | Gemini 2.5 Pro | 3p | ISMS-P, ISO 27001, SLA 준수율 |
| 16 | 보안 운영 효율 | incidents + team | Gemini 2.5 Pro | 2p | 해결률, 자동화율, 담당자별 처리량 |
| 17 | 최종 종합 분석 | 전체 데이터 | GPT-4 Turbo | 5p | 경영진용 10+ 문단, 전략적 권장사항 |

#### 차트 종류 (15종)

주간 12종 + 추가 3종:
- **MITRE 히트맵**: 14x200 매트릭스 (색상 코딩)
- **월간 트렌드 라인 차트**: 30일 일별 추이 + 3개월 비교
- **컴플라이언스 준수율 막대 차트**: ISMS-P, ISO 27001, PCI-DSS

---

## 5. 섹션별 AI 프롬프트 설계

### 5.1 일간 보고서 섹션별 프롬프트

#### 섹션 1: 일일 개요

**AI 모델**: Gemini 2.0 Flash
**실행 시간**: ~5초

**입력 데이터**:
```typescript
{
  today: {
    total_incidents: 42,
    critical: 0,
    high: 8,
    medium: 26,
    low: 8,
    avg_mttr: 45,
    resolution_rate: 85
  },
  yesterday: {
    total_incidents: 38,
    critical: 1,
    high: 6,
    medium: 22,
    low: 9,
    avg_mttr: 50,
    resolution_rate: 82
  }
}
```

**프롬프트 템플릿**:
```
다음 일일 보안 데이터를 분석하여 한국어로 요약해주세요:

**오늘 데이터**:
- 총 인시던트: ${today.total_incidents}건
- Critical: ${today.critical}건, High: ${today.high}건, Medium: ${today.medium}건, Low: ${today.low}건
- 평균 해결 시간 (MTTR): ${today.avg_mttr}분
- 해결률: ${today.resolution_rate}%

**어제 데이터 (비교)**:
- 총 인시던트: ${yesterday.total_incidents}건
- Critical: ${yesterday.critical}건, High: ${yesterday.high}건
- 평균 해결 시간: ${yesterday.avg_mttr}분
- 해결률: ${yesterday.resolution_rate}%

**요청사항**:
1. 전일 대비 변화율 계산 및 해석 (증가/감소/유지)
2. Critical/High 인시던트 변화 강조
3. MTTR 개선/악화 평가
4. 해결률 개선/악화 평가
5. 전반적인 보안 태세 평가 (좋아짐/나빠짐/유지)

**출력 형식**: JSON
\`\`\`json
{
  "total_incidents_change": "+10.5%",
  "total_incidents_interpretation": "전일 대비 10.5% 증가",
  "critical_high_change": "+2건",
  "critical_high_interpretation": "Critical은 1건 감소, High는 2건 증가",
  "mttr_change": "-5분 (-10%)",
  "mttr_interpretation": "평균 해결 시간이 5분 개선되었습니다",
  "resolution_rate_change": "+3%",
  "resolution_rate_interpretation": "해결률이 3% 개선되었습니다",
  "overall_assessment": "전반적으로 보안 태세가 개선되었으나, High 심각도 인시던트가 증가하여 주의가 필요합니다"
}
\`\`\`
```

**출력 예시**:
```json
{
  "total_incidents_change": "+10.5%",
  "total_incidents_interpretation": "전일 대비 4건 (10.5%) 증가",
  "critical_high_change": "-1건 (Critical) / +2건 (High)",
  "critical_high_interpretation": "Critical 인시던트는 1건 감소하여 0건이 되었으나, High 인시던트가 2건 증가하여 8건 발생",
  "mttr_change": "-5분 (-10%)",
  "mttr_interpretation": "평균 해결 시간이 50분에서 45분으로 5분 (10%) 단축되어 대응 효율이 개선되었습니다",
  "resolution_rate_change": "+3%",
  "resolution_rate_interpretation": "해결률이 82%에서 85%로 3% 상승하여 미해결 인시던트가 감소했습니다",
  "overall_assessment": "전반적으로 보안 태세가 개선되었습니다. Critical 인시던트가 0건으로 감소했고, MTTR과 해결률 모두 개선되었습니다. 그러나 High 심각도 인시던트가 2건 증가하여 지속적인 모니터링이 필요합니다."
}
```

#### 섹션 4: TOP 10 인시던트

**AI 모델**: Claude Sonnet 4.5
**실행 시간**: ~15초

**입력 데이터**:
```typescript
{
  top_10_incidents: [
    {
      incident_id: "414186",
      severity: "high",
      status: "false_positive",
      description: "Registry modification detected on endpoint KT-GMOM-04",
      analyst_verdict: "False positive - legitimate software update",
      creation_time: "2025-11-10T14:32:00Z",
      alert_count: 5,
      file_sha256: ["a3f8b2c1d4..."],
      mitre_techniques: ["T1112"],
      host_name: "KT-GMOM-04"
    },
    // ... 9 more
  ]
}
```

**프롬프트 템플릿**:
```
다음 TOP 10 인시던트를 분석하여 각 인시던트별로 200-300자의 한국어 요약을 작성하세요:

**인시던트 데이터**:
${JSON.stringify(top_10_incidents, null, 2)}

**요청사항**:
1. 각 인시던트별로 다음 정보 포함:
   - 인시던트 ID 및 심각도
   - 주요 활동 (description 한글 번역)
   - 영향받은 호스트
   - MITRE ATT&CK 기법 (한글 설명)
   - 분석가 판단 (analyst_verdict 한글 번역)
   - 위협 평가 (실제 위협 / 오탐 / 추가 조사 필요)

2. 우선순위 정렬 기준:
   - Critical > High > Medium > Low
   - 같은 심각도 내에서는 최신순

3. 각 요약은 200-300자

**출력 형식**: JSON 배열
\`\`\`json
[
  {
    "incident_id": "414186",
    "severity": "high",
    "summary_ko": "호스트 KT-GMOM-04에서 레지스트리 수정이 탐지되었습니다 (MITRE T1112: Modify Registry). 분석가는 정상 소프트웨어 업데이트로 판단했으나, 5개의 알럿이 발생했고 파일 해시 a3f8b2c1d4...가 확인되었습니다. 추가 TI 검증 결과를 확인하여 최종 판단이 필요합니다.",
    "threat_assessment": "추가 조사 필요",
    "priority": 1
  },
  // ... 9 more
]
\`\`\`
```

#### 섹션 7: 신규 파일 해시

**AI 모델**: Claude Sonnet 4.5
**실행 시간**: ~20초

**입력 데이터**:
```typescript
{
  new_file_hashes: [
    {
      hash: "a3f8b2c1d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0",
      file_name: "malware.exe",
      file_path: "C:\\Users\\Admin\\Downloads\\malware.exe",
      first_seen: "2025-11-10T14:32:00Z",
      incident_count: 3,
      host_count: 2,
      // TI 검증 결과
      ti_verdict: "malicious",
      ti_family: "Trojan.Generic",
      ti_severity: 80,
      ti_tags: ["trojan", "backdoor", "credential-stealer"],
      ti_source: "MalwareBazaar",
      // VirusTotal (선택)
      vt_positives: 45,
      vt_total: 70,
      vt_url: "https://www.virustotal.com/gui/file/a3f8b2c1d4..."
    },
    // ... more (benign, unknown)
  ]
}
```

**프롬프트 템플릿**:
```
다음 신규 파일 해시를 benign/threat/unknown 분류별로 분석하여 한국어로 상세 설명하세요:

**파일 해시 데이터**:
${JSON.stringify(new_file_hashes, null, 2)}

**요청사항**:

1. **Benign 해시 (안전한 파일)**:
   - 파일명, 서명 정보
   - TI 소스 (VirusTotal, MalwareBazaar 등)
   - "안전한 파일로 확인되었습니다" 문구

2. **Threat 해시 (악성 파일)**:
   - 파일명, 해시 (첫 16자)
   - 멀웨어 패밀리 (한글 설명)
   - 심각도 (0-100)
   - 태그 (trojan, ransomware 등, 한글)
   - VirusTotal 탐지율 (45/70 = 64%)
   - 영향받은 호스트 목록
   - **긴급 조치사항** (격리, 삭제, 스캔)

3. **Unknown 해시 (TI DB에 없음)**:
   - 파일명, 해시
   - "위협 인텔리전스 DB에 없는 파일입니다"
   - **권장 조치**: VirusTotal 수동 업로드 또는 샌드박스 분석

**출력 형식**: JSON
\`\`\`json
{
  "benign_hashes": [
    {
      "hash": "abc123...",
      "file_name": "chrome_installer.exe",
      "summary_ko": "Google Chrome 설치 파일로 확인되었습니다. VirusTotal에서 0/70 탐지로 안전한 파일입니다."
    }
  ],
  "threat_hashes": [
    {
      "hash": "a3f8b2c1d4e5f6g7...",
      "file_name": "malware.exe",
      "family_ko": "트로이목마 (Trojan.Generic)",
      "severity": 80,
      "tags_ko": ["트로이목마", "백도어", "자격증명 탈취"],
      "vt_detection_rate": "64% (45/70)",
      "affected_hosts": ["KT-GMOM-04", "LAPTOP-EPCI81HQ"],
      "summary_ko": "악성 파일로 확인되었습니다. MalwareBazaar에서 Trojan.Generic으로 분류되었으며, 자격증명 탈취 기능이 있는 백도어 트로이목마입니다. VirusTotal 탐지율 64% (45/70)로 높은 위협 수준입니다. 2개 호스트에서 발견되었습니다.",
      "urgent_actions_ko": [
        "즉시 영향받은 호스트 2대 격리",
        "파일 삭제 및 전체 스캔 수행",
        "자격증명 변경 (해당 호스트의 모든 계정)"
      ]
    }
  ],
  "unknown_hashes": [
    {
      "hash": "xyz789...",
      "file_name": "unknown_file.dll",
      "summary_ko": "위협 인텔리전스 데이터베이스에 등록되지 않은 파일입니다. VirusTotal에 수동 업로드하거나 샌드박스 분석을 권장합니다."
    }
  ]
}
\`\`\`
```

### 5.2 주간 보고서 추가 섹션 프롬프트

#### 섹션 10: MITRE ATT&CK 매핑

**AI 모델**: Claude Sonnet 4.5
**실행 시간**: ~30초

**입력 데이터**:
```typescript
{
  top_mitre_techniques: [
    {
      technique_id: "T1112",
      technique_name: "Modify Registry",
      tactic: "Persistence",
      count: 15,
      last_week_count: 12,
      incidents: [
        { incident_id: "414186", severity: "high" },
        // ... more
      ]
    },
    // ... 14 more (TOP 15)
  ],
  ti_mitre_details: [
    {
      technique_id: "T1112",
      description: "Adversaries may interact with the Windows Registry to hide configuration information...",
      detection: "Monitor processes and command-line arguments for actions...",
      mitigation: "Restrict Registry permissions..."
    }
    // ... more
  ]
}
```

**프롬프트 템플릿**:
```
다음 MITRE ATT&CK 기법 데이터를 분석하여 상세 한국어 보고서를 작성하세요:

**탐지된 기법 (TOP 15)**:
${JSON.stringify(top_mitre_techniques, null, 2)}

**MITRE 기법 상세 정보**:
${JSON.stringify(ti_mitre_details, null, 2)}

**요청사항**:

1. **각 기법별 분석** (TOP 15):
   - 기법 ID 및 이름 (한글 번역)
   - 전술(Tactic) (한글)
   - 탐지 횟수
   - 전주 대비 증감 (%, 증가/감소/유지)
   - 관련 인시던트 수
   - 기법 설명 (200-300자, 한글)
   - 탐지 방법 (한글)
   - 완화 조치 (한글)

2. **트렌드 분석**:
   - 가장 많이 증가한 기법 (TOP 3)
   - 새로 출현한 기법
   - 감소한 기법

3. **전체 평가**:
   - 공격 패턴 변화
   - 위협 수준 평가
   - 권장 대응 전략

**출력 형식**: JSON
\`\`\`json
{
  "techniques": [
    {
      "technique_id": "T1112",
      "technique_name_ko": "레지스트리 수정",
      "tactic_ko": "지속성(Persistence)",
      "count": 15,
      "change_from_last_week": "+25%",
      "trend": "증가",
      "related_incidents": 8,
      "description_ko": "공격자는 Windows 레지스트리를 수정하여 시스템 재부팅 후에도 지속성을 유지합니다. 일반적으로 Run 키 또는 서비스 레지스트리를 수정하여 악성 프로그램이 자동으로 실행되도록 설정합니다.",
      "detection_ko": "레지스트리 수정 프로세스 및 명령줄 인자를 모니터링하세요. 특히 HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\Run 경로의 변경을 주의 깊게 확인해야 합니다.",
      "mitigation_ko": "레지스트리 권한을 제한하고, 중요 레지스트리 키에 대한 변경을 감사하세요. EDR 솔루션으로 실시간 모니터링을 구현하는 것이 효과적입니다."
    }
    // ... 14 more
  ],
  "trend_analysis": {
    "most_increased": [
      { "technique_id": "T1112", "change": "+25%" },
      { "technique_id": "T1547.001", "change": "+15%" },
      { "technique_id": "T1059", "change": "+12%" }
    ],
    "newly_appeared": [
      { "technique_id": "T1055", "technique_name_ko": "프로세스 인젝션" }
    ],
    "decreased": [
      { "technique_id": "T1003", "change": "-10%" }
    ]
  },
  "overall_assessment": {
    "attack_pattern_change": "지난주 대비 Persistence(지속성) 전술이 25% 증가했으며, 특히 레지스트리 수정(T1112)과 부팅 자동 실행(T1547.001) 기법이 두드러집니다. 이는 공격자가 시스템에 장기간 잠복하려는 의도로 해석됩니다.",
    "threat_level": "중간(Medium) - 지속성 공격 증가로 추가 모니터링 필요",
    "recommended_strategy": "레지스트리 및 부팅 프로세스 모니터링을 강화하고, EDR 룰을 업데이트하여 지속성 관련 기법 탐지율을 높이세요. 또한 정기적인 레지스트리 감사를 통해 비정상적인 변경을 조기에 발견할 수 있습니다."
  }
}
\`\`\`
```

#### 섹션 12: 네트워크 아티팩트

**AI 모델**: Claude Sonnet 4.5
**실행 시간**: ~25초

**입력 데이터**:
```typescript
{
  top_external_ips: [
    {
      ip: "203.0.113.5",
      threat_type: "C2",
      confidence: 90,
      country: "Russia",
      isp: "Unknown ISP",
      incident_count: 5,
      affected_hosts: 3,
      first_connection: "2025-11-04T10:00:00Z",
      last_connection: "2025-11-10T18:30:00Z",
      total_traffic: 15728640  // bytes
    },
    // ... 19 more (TOP 20)
  ]
}
```

**프롬프트 템플릿**:
```
다음 외부 IP/도메인 통신 데이터를 분석하여 상세 한국어 보고서를 작성하세요:

**TOP 20 외부 IP**:
${JSON.stringify(top_external_ips, null, 2)}

**요청사항**:

1. **각 IP별 분석** (위협 수준 높은 순):
   - IP 주소
   - 위협 유형 (C2, Phishing, Malware Distribution 등, 한글)
   - 신뢰도 (0-100%)
   - 국가 (국기 이모지 + 국가명)
   - ISP
   - 관련 인시던트 수
   - 영향받은 호스트 수
   - 첫 연결 / 마지막 연결 시간
   - 총 트래픽 (MB 단위)
   - **위협 평가** (Critical/High/Medium/Low)
   - **권장 조치**

2. **GeoIP 분석**:
   - 상위 5개 국가별 위협 IP 수
   - 고위험 국가 (러시아, 중국, 북한 등)

3. **전체 평가**:
   - C2 서버 통신 여부
   - 데이터 유출 가능성
   - 즉시 차단해야 할 IP 목록

**출력 형식**: JSON
\`\`\`json
{
  "ips": [
    {
      "ip": "203.0.113.5",
      "threat_type_ko": "C2 서버 (Command & Control)",
      "confidence": 90,
      "country": "🇷🇺 러시아",
      "isp": "Unknown ISP",
      "incident_count": 5,
      "affected_hosts": 3,
      "first_connection": "2025-11-04 10:00",
      "last_connection": "2025-11-10 18:30",
      "total_traffic_mb": 15.0,
      "threat_level": "Critical",
      "summary_ko": "러시아 소재 C2 서버로 확인되었습니다. 신뢰도 90%로 매우 높은 위협 수준입니다. 3개 호스트에서 5건의 인시던트가 발생했으며, 총 15MB의 데이터가 송수신되었습니다. 지난 7일간 지속적으로 통신이 시도되었습니다.",
      "recommended_actions_ko": [
        "즉시 IP 차단 (방화벽 + EDR)",
        "영향받은 호스트 3대 격리 및 조사",
        "네트워크 트래픽 분석 (데이터 유출 여부 확인)",
        "유사 IP 패턴 검색 (같은 ASN, 서브넷)"
      ]
    }
    // ... 19 more
  ],
  "geoip_analysis": {
    "top_5_countries": [
      { "country": "🇷🇺 러시아", "ip_count": 8 },
      { "country": "🇨🇳 중국", "ip_count": 5 },
      { "country": "🇺🇸 미국", "ip_count": 3 },
      { "country": "🇰🇷 한국", "ip_count": 2 },
      { "country": "🇩🇪 독일", "ip_count": 2 }
    ],
    "high_risk_countries": ["러시아", "중국", "북한"],
    "high_risk_ip_count": 13
  },
  "overall_assessment": {
    "c2_detected": true,
    "c2_count": 3,
    "data_exfiltration_risk": "높음 - 총 45MB 데이터 송신 확인",
    "immediate_block_list": ["203.0.113.5", "203.0.113.12", "203.0.113.23"],
    "summary_ko": "3개의 C2 서버 통신이 확인되었으며, 모두 러시아와 중국 소재입니다. 데이터 유출 가능성이 높으므로 즉시 해당 IP를 차단하고 영향받은 호스트를 격리해야 합니다. 또한 네트워크 트래픽 분석을 통해 실제 유출된 데이터를 파악하는 것이 중요합니다."
  }
}
\`\`\`
```

### 5.3 월간 보고서 경영진 섹션 프롬프트

#### 섹션 1: 경영진 요약

**AI 모델**: GPT-4 Turbo
**실행 시간**: ~40초

**입력 데이터**:
```typescript
{
  monthly_summary: {
    total_incidents: 1247,
    mom_change: "+5.2%",
    critical_incidents: 3,
    high_incidents: 142,
    avg_mttr: 38,
    resolution_rate: 88,
    false_positive_rate: 42,
    security_grade: "B+",

    // 비즈니스 영향
    downtime_hours: 2.5,
    affected_users: 156,
    estimated_cost_usd: 12500,

    // 주요 위협
    top_threat_type: "Ransomware",
    apt_detected: false,
    data_breach: false,

    // 개선 사항
    improvements: [
      "MTTR 10% 개선",
      "False Positive 5% 감소",
      "보안 등급 B → B+ 상승"
    ]
  }
}
```

**프롬프트 템플릿**:
```
다음 월간 보안 데이터를 바탕으로 C-level 경영진을 위한 Executive Summary를 작성하세요:

**월간 데이터**:
${JSON.stringify(monthly_summary, null, 2)}

**요청사항**:

1. **2-3문단으로 구성** (각 문단 150-200자):
   - 1문단: 전반적인 보안 현황 (인시던트 수, 전월 대비 변화, 보안 등급)
   - 2문단: 비즈니스 영향 (다운타임, 영향받은 사용자, 비용)
   - 3문단: 주요 개선 사항 및 전략적 권장사항

2. **경영진 관점 강조**:
   - 비즈니스 리스크 (다운타임, 생산성 손실)
   - 재무 영향 (예상 비용, ROI)
   - 전략적 결정 필요 사항 (예산, 인력, 솔루션)

3. **긍정적 톤 유지** (단, 리스크는 명확히 전달):
   - 개선 사항 강조
   - 문제점은 해결 방안과 함께 제시
   - 미래 지향적 권장사항

4. **전문 용어 최소화**:
   - 기술 용어 대신 비즈니스 용어 사용
   - 약어 설명 (MTTR → 평균 해결 시간)

**출력 형식**: JSON
\`\`\`json
{
  "executive_summary_ko": "11월 한 달간 총 1,247건의 보안 인시던트가 발생하여 전월 대비 5.2% 증가했습니다. 그러나 평균 해결 시간이 10% 개선되고 오탐률이 5% 감소하면서, 전반적인 보안 운영 효율이 향상되어 보안 등급이 B에서 B+로 상승했습니다. Critical 인시던트는 3건에 불과했으며, 랜섬웨어 공격 시도는 모두 차단되어 실제 피해는 발생하지 않았습니다.\n\n비즈니스 관점에서 보안 인시던트로 인한 총 다운타임은 2.5시간이었으며, 156명의 직원이 일시적으로 업무에 영향을 받았습니다. 이로 인한 예상 비용은 약 $12,500 (약 1,650만원)으로, 전월 대비 15% 감소했습니다. 보안팀의 신속한 대응으로 데이터 유출이나 APT 공격은 발견되지 않았습니다.\n\n향후 오탐률을 30% 이하로 낮추고 평균 해결 시간을 30분 이내로 단축하기 위해, EDR 솔루션 고도화와 보안 인력 1명 추가 채용을 권장합니다. 또한 랜섬웨어 대응 훈련을 분기별로 실시하여 임직원 보안 인식을 강화할 필요가 있습니다. 예상 투자비는 연간 $50,000이며, 이는 잠재적 보안 사고 비용 대비 5배의 ROI를 제공할 것으로 예상됩니다."
}
\`\`\`
```

**출력 예시** (한글):
```
11월 한 달간 총 1,247건의 보안 인시던트가 발생하여 전월 대비 5.2% 증가했습니다. 그러나 평균 해결 시간이 10% 개선되고 오탐률이 5% 감소하면서, 전반적인 보안 운영 효율이 향상되어 보안 등급이 B에서 B+로 상승했습니다. Critical 인시던트는 3건에 불과했으며, 랜섬웨어 공격 시도는 모두 차단되어 실제 피해는 발생하지 않았습니다.

비즈니스 관점에서 보안 인시던트로 인한 총 다운타임은 2.5시간이었으며, 156명의 직원이 일시적으로 업무에 영향을 받았습니다. 이로 인한 예상 비용은 약 $12,500 (약 1,650만원)으로, 전월 대비 15% 감소했습니다. 보안팀의 신속한 대응으로 데이터 유출이나 APT 공격은 발견되지 않았습니다.

향후 오탐률을 30% 이하로 낮추고 평균 해결 시간을 30분 이내로 단축하기 위해, EDR 솔루션 고도화와 보안 인력 1명 추가 채용을 권장합니다. 또한 랜섬웨어 대응 훈련을 분기별로 실시하여 임직원 보안 인식을 강화할 필요가 있습니다. 예상 투자비는 연간 $50,000이며, 이는 잠재적 보안 사고 비용 대비 5배의 ROI를 제공할 것으로 예상됩니다.
```

---

## 6. 고급 TI 상관분석

### 6.1 APT 캠페인 매핑

**목적**: 파일 해시 → 멀웨어 패밀리 → APT 그룹 연결

#### 쿼리 체인

```sql
-- 1단계: 파일 해시 → 멀웨어 패밀리
SELECT
  m.hash,
  m.family,
  m.verdict,
  m.severity,
  m.tags
FROM ti_malware m
WHERE m.hash = ANY($1)
  AND m.verdict IN ('malicious', 'suspicious');

-- 2단계: 멀웨어 패밀리 → APT 그룹
SELECT DISTINCT
  apt.group_name,
  apt.aliases,
  apt.country,
  apt.description,
  apt.techniques,
  array_agg(DISTINCT m.family) as malware_families_used,
  COUNT(DISTINCT inc.incident_id) as related_incidents
FROM ti_apt_groups apt
JOIN ti_malware m
  ON m.family = ANY(apt.malware_families)
LEFT JOIN opensearch_file_artifacts fa
  ON fa.action_file_sha256 = m.hash
LEFT JOIN opensearch_incidents inc
  ON inc.incident_id = fa.incident_id
WHERE m.hash = ANY($1)
GROUP BY apt.group_name, apt.aliases, apt.country, apt.description, apt.techniques;

-- 3단계: APT 그룹 → 사용 기법 (MITRE)
SELECT
  apt.group_name,
  array_agg(DISTINCT mitre.technique_id) as technique_ids,
  array_agg(DISTINCT mitre.technique_name) as technique_names,
  array_agg(DISTINCT mitre.tactic) as tactics
FROM ti_apt_groups apt
CROSS JOIN LATERAL unnest(apt.techniques) as tech_id
JOIN ti_mitre mitre ON mitre.technique_id = tech_id
WHERE apt.group_name = ANY($2)
GROUP BY apt.group_name;
```

#### AI 분석 프롬프트

```
다음 APT 캠페인 데이터를 분석하여 한국어로 상세 보고서를 작성하세요:

**탐지된 APT 그룹**:
- APT28 (Fancy Bear, Sofacy)
  - 국가: 러시아
  - 사용 멀웨어: Emotet, Trickbot
  - 사용 기법: T1112, T1547.001, T1059
  - 관련 인시던트: 5건

**요청사항**:
1. APT 그룹 설명 (200-300자, 한글)
2. 공격 의도 및 목적
3. 사용 전술/기법 (한글)
4. 대응 전략 및 권장 조치

**출력**: JSON
```

---

### 6.2 VirusTotal 실시간 통합

#### VirusTotal API 연동 전략

**API 할당량 관리**:
```typescript
// VT API 요금제
const VT_QUOTA = {
  free: {
    requests_per_day: 500,
    requests_per_minute: 4,
    cost: 0
  },
  premium: {
    requests_per_day: 15000,
    requests_per_minute: 1000,
    cost: 500 // USD/month
  }
};

// 할당량 기반 요청 전략
async function queryVirusTotalWithQuota(
  hashes: string[],
  quota: 'free' | 'premium' = 'free'
): Promise<VTResult[]> {
  const { requests_per_minute } = VT_QUOTA[quota];

  // 캐싱 우선: PostgreSQL에 이미 있는 해시는 VT 호출 안 함
  const cachedResults = await db.query(`
    SELECT file_sha256, vt_*
    FROM ioclog.vt_cache
    WHERE file_sha256 = ANY($1)
      AND updated_at > NOW() - INTERVAL '7 days'
  `, [hashes]);

  const uncachedHashes = hashes.filter(
    h => !cachedResults.find(r => r.file_sha256 === h)
  );

  // Rate limiting (분당 요청 수 제한)
  const vtResults: VTResult[] = [];
  for (let i = 0; i < uncachedHashes.length; i += requests_per_minute) {
    const batch = uncachedHashes.slice(i, i + requests_per_minute);

    const batchResults = await Promise.all(
      batch.map(hash => fetchVTReport(hash))
    );

    vtResults.push(...batchResults);

    // 다음 배치 전 1분 대기
    if (i + requests_per_minute < uncachedHashes.length) {
      await sleep(60 * 1000);
    }
  }

  // PostgreSQL 캐싱
  await cacheVTResults(vtResults);

  return [...cachedResults, ...vtResults];
}

// VirusTotal API 호출
async function fetchVTReport(hash: string): Promise<VTResult> {
  const response = await fetch(
    `https://www.virustotal.com/api/v3/files/${hash}`,
    {
      headers: { 'x-apikey': process.env.VIRUSTOTAL_API_KEY! }
    }
  );

  if (!response.ok) {
    return { hash, error: 'Not found in VT' };
  }

  const data = await response.json();

  return {
    hash,
    malicious: data.data.attributes.last_analysis_stats.malicious,
    total_engines: data.data.attributes.last_analysis_stats.total,
    first_seen: data.data.attributes.first_submission_date,
    names: data.data.attributes.names,
    tags: data.data.attributes.tags,
    threat_label: data.data.attributes.popular_threat_classification?.suggested_threat_label,
    detection_ratio: `${data.data.attributes.last_analysis_stats.malicious}/${data.data.attributes.last_analysis_stats.total}`,
    permalink: `https://www.virustotal.com/gui/file/${hash}`
  };
}
```

#### PostgreSQL 캐싱 스키마

```sql
-- VirusTotal 캐싱 테이블
CREATE TABLE IF NOT EXISTS ioclog.vt_cache (
  file_sha256 VARCHAR(64) PRIMARY KEY,

  -- VT 탐지 결과
  vt_malicious INTEGER,
  vt_total_engines INTEGER,
  vt_detection_ratio VARCHAR(10),
  vt_threat_label VARCHAR(255),
  vt_tags TEXT[], -- PostgreSQL array
  vt_names TEXT[],

  -- 메타데이터
  vt_first_seen TIMESTAMP,
  vt_last_seen TIMESTAMP,
  vt_permalink TEXT,

  -- 캐싱 정보
  updated_at TIMESTAMP DEFAULT NOW(),
  cached_from VARCHAR(20) DEFAULT 'virustotal'
);

CREATE INDEX idx_vt_updated ON ioclog.vt_cache(updated_at);
CREATE INDEX idx_vt_malicious ON ioclog.vt_cache(vt_malicious);
```

#### VT 데이터를 활용한 AI 분석

**프롬프트 템플릿**:
```
다음 파일 해시의 VirusTotal 분석 결과를 한국어로 요약하세요:

**해시**: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
**탐지율**: 52/73 (71.2%)
**위협 라벨**: trojan.emotet
**태그**: trojan, emotet, malware, banking
**파일명**: Emotet.exe, malware_sample.exe
**첫 발견**: 2025-10-01
**VT 링크**: https://www.virustotal.com/gui/file/e3b0c44...

**요청사항** (200-300자 한글 요약):
1. 위협 유형 및 심각도
2. 주요 기능 (뱅킹 트로이얀, 정보 탈취 등)
3. 전파 방식
4. 권장 조치

**출력 형식**:
{
  "threat_type_ko": "Emotet 트로이얀",
  "severity": "Critical",
  "summary_ko": "...",
  "capabilities_ko": ["정보 탈취", "추가 멀웨어 다운로드"],
  "recommended_actions_ko": ["즉시 격리", "네트워크 차단", "전체 시스템 스캔"]
}
```

---

### 6.3 GeoIP 기반 네트워크 위협 분석

#### GeoIP 데이터베이스 구조

**PostgreSQL 스키마**:
```sql
-- GeoIP 데이터 (MaxMind GeoLite2 기반)
CREATE TABLE IF NOT EXISTS ioclog.geoip_data (
  network CIDR PRIMARY KEY, -- 예: 203.0.113.0/24
  country VARCHAR(2), -- ISO 3166-1 alpha-2
  country_name VARCHAR(100),
  city VARCHAR(100),
  continent VARCHAR(2),
  latitude DECIMAL(9, 6),
  longitude DECIMAL(9, 6),
  asn INTEGER,
  as_organization VARCHAR(255),
  is_anonymous_proxy BOOLEAN,
  is_satellite_provider BOOLEAN,
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_geoip_country ON ioclog.geoip_data(country);
CREATE INDEX idx_geoip_asn ON ioclog.geoip_data(asn);

-- 위협 국가 리스트 (주관적 평가 - 설정 가능)
CREATE TABLE IF NOT EXISTS ioclog.threat_countries (
  country_code VARCHAR(2) PRIMARY KEY,
  country_name VARCHAR(100),
  threat_level VARCHAR(20), -- critical, high, medium, low
  reason TEXT,
  updated_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO ioclog.threat_countries VALUES
  ('RU', '러시아', 'high', 'APT28, APT29 등 다수 APT 그룹 소재', NOW()),
  ('CN', '중국', 'high', 'APT10, APT40 등 다수 APT 그룹 소재', NOW()),
  ('KP', '북한', 'critical', 'Lazarus, Kimsuky 등 국가 지원 APT 그룹', NOW()),
  ('IR', '이란', 'high', 'APT33, APT34 등 국가 지원 APT 그룹', NOW()),
  ('US', '미국', 'low', '정상 트래픽 다수, 클라우드 인프라 소재', NOW()),
  ('KR', '한국', 'low', '내부 트래픽', NOW());
```

#### GeoIP 조회 및 위험 점수 계산

```typescript
interface NetworkThreatAnalysis {
  ip: string;
  country_code: string;
  country_name: string;
  threat_level: 'critical' | 'high' | 'medium' | 'low';
  ti_matches: any[];
  incident_count: number;
  risk_score: number; // 0-100
  summary_ko: string;
  recommended_actions_ko: string[];
}

async function analyzeNetworkThreats(
  reportDate: string
): Promise<NetworkThreatAnalysis[]> {
  // 1. OpenSearch에서 외부 IP 수집
  const osClient = createOpenSearchClient();

  const ipResult = await osClient.search({
    index: 'logs-cortex_xdr-network-*',
    body: {
      query: {
        bool: {
          must: [
            { range: { '@timestamp': { gte: reportDate, lte: `${reportDate}T23:59:59` } } },
            { term: { 'action_external_ip_is_private': false } }
          ]
        }
      },
      aggs: {
        unique_ips: {
          terms: { field: 'action_external_hostname.keyword', size: 1000 },
          aggs: {
            incident_count: { cardinality: { field: 'incident_id.keyword' } }
          }
        }
      },
      size: 0
    }
  });

  const ips = ipResult.body.aggregations.unique_ips.buckets.map((b: any) => ({
    ip: b.key,
    incident_count: b.incident_count.value
  }));

  // 2. PostgreSQL GeoIP + TI 조회
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();

  const analyses: NetworkThreatAnalysis[] = [];

  for (const ipData of ips) {
    const geoResult = await db.query(`
      SELECT
        geo.country,
        geo.country_name,
        threat.threat_level,
        ioc.source as ti_source,
        ioc.threat_type,
        ioc.confidence
      FROM ioclog.geoip_data geo
      LEFT JOIN ioclog.threat_countries threat
        ON threat.country_code = geo.country
      LEFT JOIN ioclog.ioc_log ioc
        ON ioc.indicator = $1 AND ioc.type = 'ip'
      WHERE $1::inet <<= geo.network
      LIMIT 1
    `, [ipData.ip]);

    if (geoResult.rows.length === 0) continue;

    const row = geoResult.rows[0];

    // 위험 점수 계산
    let riskScore = 0;
    if (row.threat_level === 'critical') riskScore += 40;
    else if (row.threat_level === 'high') riskScore += 30;
    else if (row.threat_level === 'medium') riskScore += 15;

    if (row.ti_source) riskScore += 50; // TI 매칭 시 50점 추가
    if (ipData.incident_count > 10) riskScore += 10;

    analyses.push({
      ip: ipData.ip,
      country_code: row.country,
      country_name: row.country_name,
      threat_level: row.threat_level || 'low',
      ti_matches: row.ti_source ? [{ source: row.ti_source, type: row.threat_type }] : [],
      incident_count: ipData.incident_count,
      risk_score: Math.min(riskScore, 100),
      summary_ko: '', // AI 생성
      recommended_actions_ko: [] // AI 생성
    });
  }

  await db.end();

  return analyses.sort((a, b) => b.risk_score - a.risk_score);
}
```

---

### 6.4 호스트별 CVE 취약점 분석

#### CVE 데이터베이스 구조

```sql
-- CVE 상세 정보
CREATE TABLE IF NOT EXISTS ioclog.cve_details (
  cve_id VARCHAR(20) PRIMARY KEY,
  description TEXT,
  description_ko TEXT, -- 한글 번역
  severity VARCHAR(20), -- CRITICAL, HIGH, MEDIUM, LOW
  cvss_v3_score DECIMAL(3, 1),
  published_date TIMESTAMP,
  affected_vendors TEXT[],
  affected_products TEXT[],
  exploit_available BOOLEAN DEFAULT false,
  patch_available BOOLEAN DEFAULT false,
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_cve_severity ON ioclog.cve_details(severity);
CREATE INDEX idx_cve_cvss_score ON ioclog.cve_details(cvss_v3_score);
```

#### 호스트별 CVE 매칭

```typescript
interface HostCVEAnalysis {
  host_name: string;
  total_cves: number;
  critical_cves: number;
  high_cves: number;
  patched_cves: number;
  exploit_available_count: number;
  top_cves: {
    cve_id: string;
    description_ko: string;
    cvss_score: number;
    exploit_available: boolean;
  }[];
  risk_score: number;
  summary_ko: string;
  recommended_actions_ko: string[];
}

async function analyzeHostCVEs(reportDate: string): Promise<HostCVEAnalysis[]> {
  const osClient = createOpenSearchClient();

  // OpenSearch에서 호스트 목록 수집
  const hostResult = await osClient.search({
    index: 'logs-cortex_xdr-endpoints-*',
    body: {
      query: { range: { '@timestamp': { gte: reportDate } } },
      aggs: {
        unique_hosts: {
          terms: { field: 'endpoint_name.keyword', size: 500 },
          aggs: {
            os: { terms: { field: 'os_type.keyword', size: 1 } }
          }
        }
      },
      size: 0
    }
  });

  const hosts = hostResult.body.aggregations.unique_hosts.buckets.map((b: any) => ({
    host_name: b.key,
    os: b.os.buckets[0]?.key || 'Unknown'
  }));

  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();

  const analyses: HostCVEAnalysis[] = [];

  for (const host of hosts) {
    // CVE 매칭 (OS 기반)
    const vendor = host.os.includes('WINDOWS') ? 'Microsoft' : 'Unknown';

    const cveResult = await db.query(`
      SELECT
        cve.cve_id,
        cve.description_ko,
        cve.severity,
        cve.cvss_v3_score,
        cve.exploit_available,
        cve.patch_available
      FROM ioclog.cve_details cve
      WHERE cve.affected_vendors @> ARRAY[$1]
      ORDER BY cve.cvss_v3_score DESC
      LIMIT 50
    `, [vendor]);

    const cves = cveResult.rows;
    const criticalCVEs = cves.filter(c => c.severity === 'CRITICAL');
    const highCVEs = cves.filter(c => c.severity === 'HIGH');
    const patchedCVEs = cves.filter(c => c.patch_available);
    const exploitCVEs = cves.filter(c => c.exploit_available);

    let riskScore = criticalCVEs.length * 10 + highCVEs.length * 5 + exploitCVEs.length * 15;
    riskScore = Math.min(riskScore, 100);

    analyses.push({
      host_name: host.host_name,
      total_cves: cves.length,
      critical_cves: criticalCVEs.length,
      high_cves: highCVEs.length,
      patched_cves: patchedCVEs.length,
      exploit_available_count: exploitCVEs.length,
      top_cves: cves.slice(0, 10).map(c => ({
        cve_id: c.cve_id,
        description_ko: c.description_ko,
        cvss_score: parseFloat(c.cvss_v3_score),
        exploit_available: c.exploit_available
      })),
      risk_score: Math.round(riskScore),
      summary_ko: '',
      recommended_actions_ko: []
    });
  }

  await db.end();

  return analyses.sort((a, b) => b.risk_score - a.risk_score);
}
```

---

## 7. 시각화 및 UI/UX

### 7.1 차트 라이브러리 선택

**기술 스택**:
- **Chart.js 4.x**: 기본 차트 (라인, 바, 파이, 도넛)
- **D3.js 7.x**: 고급 시각화 (히트맵, 네트워크 그래프)
- **Recharts 2.x**: React 통합 차트
- **react-pdf**: PDF 생성

### 7.2 주요 차트 유형

#### 1. MITRE ATT&CK 히트맵 (D3.js)

```typescript
import * as d3 from 'd3';

function renderMITREHeatmap(data: { tactic: string; technique: string; count: number }[]) {
  const tactics = ['Initial Access', 'Execution', 'Persistence', 'Privilege Escalation',
                   'Defense Evasion', 'Credential Access', 'Discovery', 'Lateral Movement'];

  const svg = d3.select('#mitre-heatmap')
    .append('svg')
    .attr('width', 1200)
    .attr('height', 400);

  const colorScale = d3.scaleLinear()
    .domain([0, d3.max(data, d => d.count) || 10])
    .range(['#f0f0f0', '#d32f2f'] as any);

  svg.selectAll('rect')
    .data(data)
    .enter()
    .append('rect')
    .attr('x', (d) => tactics.indexOf(d.tactic) * 150)
    .attr('y', 50)
    .attr('width', 148)
    .attr('height', 48)
    .attr('fill', d => colorScale(d.count))
    .append('title')
    .text(d => `${d.tactic}: ${d.technique} (${d.count})`);
}
```

#### 2. GeoIP 세계 지도 (D3.js)

```typescript
import * as d3 from 'd3';
import { feature } from 'topojson-client';

function renderWorldMap(geoipData: { country_code: string; threat_count: number }[]) {
  const svg = d3.select('#world-map')
    .append('svg')
    .attr('width', 960)
    .attr('height', 500);

  const projection = d3.geoMercator()
    .scale(150)
    .translate([480, 250]);

  const path = d3.geoPath().projection(projection);

  d3.json('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json')
    .then((world: any) => {
      const countries = feature(world, world.objects.countries);

      const colorScale = d3.scaleLinear()
        .domain([0, d3.max(geoipData, d => d.threat_count) || 100])
        .range(['#ffffcc', '#ff0000'] as any);

      svg.selectAll('path')
        .data(countries.features)
        .enter()
        .append('path')
        .attr('d', path)
        .attr('fill', (d: any) => {
          const countryData = geoipData.find(g => g.country_code === d.id);
          return countryData ? colorScale(countryData.threat_count) : '#f0f0f0';
        })
        .attr('stroke', '#333')
        .attr('stroke-width', 0.5);
    });
}
```

#### 3. 보안 등급 게이지 (D3.js)

```typescript
function renderSecurityGauge(score: number) {
  const svg = d3.select('#security-gauge')
    .append('svg')
    .attr('width', 400)
    .attr('height', 300);

  const arc = d3.arc()
    .innerRadius(80)
    .outerRadius(120)
    .startAngle(-Math.PI / 2);

  // Background arc
  svg.append('path')
    .datum({ endAngle: Math.PI / 2 })
    .attr('d', arc as any)
    .attr('transform', 'translate(200, 200)')
    .attr('fill', '#e0e0e0');

  // Score arc
  const scoreAngle = -Math.PI / 2 + (score / 100) * Math.PI;
  svg.append('path')
    .datum({ endAngle: scoreAngle })
    .attr('d', arc as any)
    .attr('transform', 'translate(200, 200)')
    .attr('fill', score > 80 ? '#28a745' : score > 60 ? '#ffc107' : '#dc3545');

  // Score text
  svg.append('text')
    .attr('x', 200)
    .attr('y', 200)
    .attr('text-anchor', 'middle')
    .attr('font-size', '48px')
    .attr('font-weight', 'bold')
    .text(`${score}`);
}
```

---

## 8. 최신 보안 트렌드 통합

### 8.1 2025년 주요 보안 트렌드

**출처**: Verizon DBIR 2024, IBM X-Force 2024, Mandiant M-Trends 2024

**주요 트렌드**:
1. **AI 기반 공격 증가**
   - Deepfake 피싱
   - AI 생성 멀웨어
   - ChatGPT 기반 사회공학

2. **랜섬웨어 진화**
   - Double/Triple Extortion
   - RaaS (Ransomware-as-a-Service)
   - 공급망 타겟팅

3. **Zero Trust 아키텍처**
   - Identity-based Security
   - Least Privilege Access

4. **클라우드 네이티브 공격**
   - Container Escape
   - Kubernetes Misconfiguration

### 8.2 트렌드 데이터 수집

```typescript
interface TrendFeed {
  source: string;
  title: string;
  description: string;
  published_date: string;
  url: string;
  tags: string[];
}

async function fetchSecurityTrends(): Promise<TrendFeed[]> {
  const feeds = [
    'https://www.cisa.gov/uscert/ncas/current-activity.xml',
    'https://www.secureworks.com/rss?feed=blog'
  ];

  const Parser = require('rss-parser');
  const parser = new Parser();

  const allFeeds: TrendFeed[] = [];

  for (const feedUrl of feeds) {
    try {
      const feed = await parser.parseURL(feedUrl);
      feed.items.forEach((item: any) => {
        allFeeds.push({
          source: feed.title,
          title: item.title,
          description: item.contentSnippet,
          published_date: item.pubDate,
          url: item.link,
          tags: item.categories || []
        });
      });
    } catch (error) {
      console.error(`Failed to fetch ${feedUrl}:`, error);
    }
  }

  return allFeeds.slice(0, 20);
}
```

---

## 9. 자동 번역 파이프라인

### 9.1 Gemini Translation API 통합

```typescript
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!);

async function translateToKorean(text: string): Promise<string> {
  // 캐시 확인
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();

  const cachedResult = await db.query(`
    SELECT translated_text
    FROM ioclog.translation_cache
    WHERE original_text = $1
      AND source_lang = 'en'
      AND target_lang = 'ko'
      AND cached_at > NOW() - INTERVAL '30 days'
    LIMIT 1
  `, [text]);

  if (cachedResult.rows.length > 0) {
    await db.end();
    return cachedResult.rows[0].translated_text;
  }

  // Gemini Translation API 호출
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

  const prompt = `다음 보안 관련 영어 텍스트를 한국어로 번역하세요:\n\n${text}`;

  const result = await model.generateContent(prompt);
  const translated = result.response.text().trim();

  // 캐싱
  await db.query(`
    INSERT INTO ioclog.translation_cache
      (original_text, translated_text, source_lang, target_lang)
    VALUES ($1, $2, 'en', 'ko')
  `, [text, translated]);

  await db.end();

  return translated;
}
```

### 9.2 번역 캐시 스키마

```sql
CREATE TABLE IF NOT EXISTS ioclog.translation_cache (
  id SERIAL PRIMARY KEY,
  original_text TEXT NOT NULL,
  translated_text TEXT NOT NULL,
  source_lang VARCHAR(10) NOT NULL,
  target_lang VARCHAR(10) NOT NULL,
  cached_at TIMESTAMP DEFAULT NOW(),
  hit_count INTEGER DEFAULT 0,
  UNIQUE (original_text, source_lang, target_lang)
);

CREATE INDEX idx_translation_original ON ioclog.translation_cache(original_text);
```

### 9.3 보안 용어 사전

```typescript
const SECURITY_TERM_DICTIONARY: Record<string, string> = {
  'Malware': '악성코드',
  'Ransomware': '랜섬웨어',
  'Trojan': '트로이얀',
  'C2 Server': 'C2 서버',
  'Phishing': '피싱',
  'true_positive': '실제 위협',
  'false_positive': '오탐',
  'critical': '매우 높음',
  'high': '높음',
  'medium': '보통',
  'low': '낮음'
};

function translateWithDictionary(text: string): string {
  let translated = text;
  Object.entries(SECURITY_TERM_DICTIONARY).forEach(([en, ko]) => {
    const regex = new RegExp(`\\b${en}\\b`, 'gi');
    translated = translated.replace(regex, ko);
  });
  return translated;
}
```

---

## 10. 구현 로드맵

### 10.1 Phase 1: 기초 인프라 구축 (2주)

**목표**: 데이터 수집 및 저장 파이프라인 완성

**주요 작업**:
1. PostgreSQL 스키마 확장
   - `ioclog.vt_cache`
   - `ioclog.geoip_data`
   - `ioclog.security_trends`
   - `ioclog.translation_cache`

2. 외부 데이터 소스 통합
   - VirusTotal API 연동
   - GeoIP 데이터베이스 import
   - 보안 트렌드 RSS 수집

**검증 기준**:
- [ ] PostgreSQL 테이블 생성 완료
- [ ] VirusTotal API 테스트 성공 (10개 해시)
- [ ] GeoIP 데이터 100만+ 레코드 import
- [ ] 번역 캐시 히트율 70% 이상

---

### 10.2 Phase 2: AI 분석 파이프라인 개발 (3주)

**목표**: 다단계 AI 분석 시스템 구현

**주요 작업**:
1. 섹션별 AI 프롬프트 템플릿 작성
   - 일간: 9개 섹션
   - 주간: 13개 섹션
   - 월간: 17개 섹션

2. 병렬 AI 분석 오케스트레이터
```typescript
async function runParallelSectionAnalysis(
  reportType: 'daily' | 'weekly' | 'monthly',
  reportData: ReportData
): Promise<SectionAnalysis[]> {
  const sectionConfigs = getSectionConfigs(reportType);

  const analysisPromises = sectionConfigs.map(async (config) => {
    const prompt = generatePrompt(config, reportData);
    const { stdout } = await execAsync(
      `echo "${escapePrompt(prompt)}" | claude --print --model ${config.ai_model}`
    );
    return { section_id: config.section_id, output: JSON.parse(stdout.trim()) };
  });

  return await Promise.all(analysisPromises);
}
```

**검증 기준**:
- [ ] 9개 섹션 병렬 분석 3분 이내
- [ ] 번역 정확도 90% 이상
- [ ] TI 매칭률 80% 이상

---

### 10.3 Phase 3: 시각화 및 보고서 생성 (2주)

**목표**: 최종 보고서 생성 시스템 완성

**주요 작업**:
1. Chart.js 차트 컴포넌트 (6-15개)
2. D3.js 고급 시각화 (히트맵, 지도, 게이지)
3. react-pdf 보고서 생성

**검증 기준**:
- [ ] 일간 보고서 5페이지 이내
- [ ] 주간 보고서 15페이지 이내
- [ ] 월간 보고서 50페이지 이내

---

### 10.4 Phase 4: 자동화 및 최적화 (1주)

**Cron 스케줄링**:
```bash
# crontab -e

# 일간 보고서 (매일 오전 1시)
0 1 * * * cd /www/ib-editor/my-app && ./script/auto-daily-report.sh

# 주간 보고서 (매주 월요일 오전 2시)
0 2 * * 1 cd /www/ib-editor/my-app && ./script/auto-weekly-report.sh

# 월간 보고서 (매월 1일 오전 3시)
0 3 1 * * cd /www/ib-editor/my-app && ./script/auto-monthly-report.sh
```

**검증 기준**:
- [ ] 자동 생성 성공률 99% 이상
- [ ] 주간 보고서 10분 이내
- [ ] 월간 보고서 30분 이내

---

## 11. 기술 스택 및 아키텍처

### 11.1 전체 기술 스택

| 레이어 | 기술 | 버전 | 용도 |
|--------|------|------|------|
| **프론트엔드** | Next.js | 16.0.1 | 웹 프레임워크 |
| | React | 19.2.0 | UI 라이브러리 |
| | TypeScript | 5.x | 타입 시스템 |
| | Tailwind CSS | 4.x | 스타일링 |
| **시각화** | Chart.js | 4.x | 기본 차트 |
| | D3.js | 7.x | 고급 시각화 |
| | react-pdf | Latest | PDF 생성 |
| **데이터베이스** | OpenSearch | 3.5.1 | 인시던트 저장소 |
| | PostgreSQL | 16.x | TI 데이터베이스 |
| **AI/ML** | Azure OpenAI | GPT-4 Turbo | 경영진 요약 |
| | Google Gemini | 2.0 Flash | 빠른 분석 |
| | Anthropic Claude | Sonnet 4.5 | 심층 분석 |
| **자동화** | claude CLI | Latest | 프롬프트 실행 |
| | Cron | System | 스케줄링 |

### 11.2 시스템 아키텍처

```
┌─────────────────────────────────────────────────────────────┐
│              보고서 생성 오케스트레이터                        │
│          (script/generate-advanced-report.ts)              │
└─────────────────────────────────────────────────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        ▼                  ▼                  ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ OpenSearch   │  │ PostgreSQL   │  │ External API │
│ (incidents)  │  │ (TI data)    │  │ (VT, GeoIP)  │
└──────────────┘  └──────────────┘  └──────────────┘
        │                  │                  │
        └──────────────────┴──────────────────┘
                           │
                           ▼
        ┌─────────────────────────────────────┐
        │  Phase 2: TI 상관분석 (2-3분)       │
        └─────────────────────────────────────┘
                           │
                           ▼
        ┌─────────────────────────────────────┐
        │  Phase 3: 병렬 AI 분석 (5-10분)     │
        └─────────────────────────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        ▼                  ▼                  ▼
  ┌──────────┐      ┌──────────┐      ┌──────────┐
  │ Gemini   │      │ Claude   │      │  GPT-4   │
  │ Flash    │      │ Sonnet   │      │  Turbo   │
  └──────────┘      └──────────┘      └──────────┘
        │                  │                  │
        └──────────────────┴──────────────────┘
                           │
                           ▼
        ┌─────────────────────────────────────┐
        │  Phase 4: 번역 + 시각화 + PDF       │
        └─────────────────────────────────────┘
                           │
                           ▼
        ┌─────────────────────────────────────┐
        │       최종 보고서 출력               │
        │  - daily_report_2025-11-23.pdf     │
        │  - daily_report_2025-11-23.html    │
        └─────────────────────────────────────┘
```

---

## 12. 결론 및 다음 단계

### 12.1 핵심 성과

이 문서는 **plan.md 수준의 상세도와 심층성**을 갖춘 고급 보안 보고서 생성 시스템의 완전한 설계를 제시합니다:

1. ✅ **다층적 AI 분석**: 섹션별 병렬 분석으로 전환
2. ✅ **자동 번역**: Gemini API + PostgreSQL 캐싱
3. ✅ **고급 TI 상관분석**: VT, GeoIP, CVE, APT 통합
4. ✅ **차별화된 보고서**: 일간/주간/월간 완전 다른 구조
5. ✅ **최신 보안 트렌드**: 2025년 글로벌 위협 동향 통합
6. ✅ **완전 자동화**: Cron 기반 무인 보고서 생성

### 12.2 즉시 실행 가능한 다음 단계

#### Step 1: 데이터베이스 스키마 생성
```bash
cd /www/ib-editor/my-app
psql -h postgres -U n8n -d n8n < script/sql/create-advanced-schema.sql
```

#### Step 2: 첫 번째 프로토타입 실행
```bash
# 일간 보고서 프로토타입
npx tsx script/generate-advanced-daily-report.ts --date 2025-11-23

# 생성된 보고서 확인
ls -lh public/reports/daily/daily_report_2025-11-23.*
```

#### Step 3: AI 프롬프트 테스트
```bash
# 단일 섹션 테스트
npx tsx script/test-section-analysis.ts --section top_incidents
```

### 12.3 기대 효과

**정량적 개선**:
- 분석 깊이: 200-300자 → 500-1000자 (2-3배 향상)
- 생성 속도: 순차 10분 → 병렬 5분 (2배 향상)
- 번역 비용: 100% AI → 85% 캐시 (85% 절감)

**정성적 개선**:
- 경영진급 보고서 품질
- 글로벌 보안 트렌드 자동 통합
- 섹션별 심층 분석
- 완전 자동화 (사용자 개입 0%)

---

**문서 작성 완료일**: 2025-11-23  
**버전**: 1.0  
**작성자**: Claude Code  
**참고 문서**: plan.md, opensearch-index-pt.md, ti.md
