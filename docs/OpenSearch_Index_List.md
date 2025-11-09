# OpenSearch Index List - DeFender X SIEM

> **생성일**: 2025-10-25
> **MCP Server**: opensearch-mcp-inbridge
> **총 인덱스 수**: 약 650개

## 📑 목차

- [1. Threat Intelligence (TI) 인덱스](#1-threat-intelligence-ti-인덱스)
- [2. Cortex XDR Logs 인덱스](#2-cortex-xdr-logs-인덱스)
  - [2.1 Incidents (인시던트)](#21-incidents-인시던트)
  - [2.2 Alerts (알림)](#22-alerts-알림)
  - [2.3 Incident Details (상세정보)](#23-incident-details-상세정보)
  - [2.4 Endpoints (엔드포인트)](#24-endpoints-엔드포인트)
  - [2.5 File Artifacts (파일 아티팩트)](#25-file-artifacts-파일-아티팩트)
  - [2.6 Network Artifacts (네트워크 아티팩트)](#26-network-artifacts-네트워크-아티팩트)
  - [2.7 Endpoint Changes (엔드포인트 변경)](#27-endpoint-changes-엔드포인트-변경)
  - [2.8 Audit Logs (감사 로그)](#28-audit-logs-감사-로그)
  - [2.9 Agent Audit Logs (에이전트 감사 로그)](#29-agent-audit-logs-에이전트-감사-로그)
  - [2.10 Hybrid Performance (하이브리드 성능)](#210-hybrid-performance-하이브리드-성능)
  - [2.11 Hybrid Basic Alerts](#211-hybrid-basic-alerts)
  - [2.12 Scripts (스크립트)](#212-scripts-스크립트)
  - [2.13 File Events (파일 이벤트)](#213-file-events-파일-이벤트)
  - [2.14 MITRE ATT&CK Mappings](#214-mitre-attck-mappings)
  - [2.15 기타 Cortex XDR 로그](#215-기타-cortex-xdr-로그)
- [3. 기타 Logs 인덱스](#3-기타-logs-인덱스)
- [4. 인덱스 명명 규칙](#4-인덱스-명명-규칙)
- [5. 데이터 보존 정책](#5-데이터-보존-정책)

---

## 1. Threat Intelligence (TI) 인덱스

### 1.1 핵심 TI 인덱스 (15개)

| 인덱스명 | 설명 | 주요 필드 |
|---------|------|----------|
| `threat-intelligence` | 메인 위협 인텔리전스 통합 인덱스 | - |
| `threat-intelligence-ioc` | IoC (Indicators of Compromise) | IP, Domain, Hash, URL |
| `threat-intelligence-malware` | 악성코드 정보 | Malware Family, Type, Signature |
| `threat-intelligence-cve` | CVE 취약점 정보 | CVE-ID, CVSS Score, Description |
| `threat-intelligence-socradar-cve` | SocRadar CVE 피드 | CVE-ID, Exploit Availability |
| `threat-intelligence-mitre` | MITRE ATT&CK 프레임워크 | Technique ID, Tactic, Description |
| `threat-intelligence-apt-groups` | APT 그룹 정보 | Group Name, Aliases, TTPs |
| `threat-intelligence-socradar-campaigns` | SocRadar 캠페인 추적 | Campaign Name, Target Industry |
| `threat-intelligence-socradar-threat-actors` | SocRadar 위협 행위자 | Actor Name, Motivation, Geography |
| `threat-intelligence-tools` | 공격 도구/해킹 툴 | Tool Name, Category, Usage |
| `threat-intelligence-yara` | YARA 룰 저장소 | Rule Name, Author, Tags |
| `threat-intelligence-codesigning` | 코드 서명 정보 | Certificate, Issuer, Validity |
| `threat-intelligence-misp-galaxy` | MISP Galaxy 데이터 | Cluster Type, Name, Description |
| `threat-intelligence-misp-clusters` | MISP 클러스터 | Cluster ID, Values |
| `threat-intelligence-etda-stats` | ETDA (태국 정부) 통계 | Statistics Type, Country |

### 1.2 시계열 TI 인덱스

| 인덱스명 | 기간 | 설명 |
|---------|------|------|
| `threat-intel-2025.08` | 2025년 8월 | 월별 위협 인텔 아카이브 |
| `threat-intel-2025.09` | 2025년 9월 | 월별 위협 인텔 아카이브 |
| `threat-intel-realtime-2025.08` | 2025년 8월 | 실시간 위협 인텔 스트림 |

### 1.3 TI 상관분석 인덱스

| 인덱스명 | 설명 |
|---------|------|
| `ti-correlation-results-2025.09.11` | 2025-09-11 TI 상관분석 결과 |
| `ti-correlation-results-2025.09.21` | 2025-09-21 TI 상관분석 결과 |
| `ti-correlation-results-2025.09.22` | 2025-09-22 TI 상관분석 결과 |
| `incident-ti-correlation-2025-09-18` | 인시던트-TI 상관분석 (2025-09-18) |
| `incident-correlation-2025-09-19` | 인시던트 상관분석 (2025-09-19) |

---

## 2. Cortex XDR Logs 인덱스

### 2.1 Incidents (인시던트)

**총 인덱스**: 약 70개
**데이터 기간**: 2024-09-22 ~ 2025-10-11
**일별 용량**: 평균 1-5 GB

#### 인덱스 패턴
```
logs-cortex_xdr-incidents-YYYY.MM.DD
```

#### 주요 인덱스 목록

**2025년 10월**
- `logs-cortex_xdr-incidents-2025.10.01` ~ `2025.10.08`
- `logs-cortex_xdr-incidents-2025.10.11`

**2025년 9월**
- `logs-cortex_xdr-incidents-2025.09.01` ~ `2025.09.30`

**2025년 8월**
- `logs-cortex_xdr-incidents-2025.08.01` ~ `2025.08.31`

**2025년 7월**
- 데이터 없음 (Alerts만 존재)

**2024년 9월**
- `logs-cortex_xdr-incidents-2024.09.22` (레거시 데이터)

#### 특수 인덱스
- `logs-cortex_xdr-incidents-v2-2025.09.26` (버전 2 스키마)
- `cortex-xdr-incidents` (집계용 별칭)

#### 주요 필드 구조
```json
{
  "incident_id": "500455",
  "description": "Malicious Browser Extension detected on host",
  "severity": "high|medium|low|critical",
  "status": "new|under_investigation|resolved_false_positive|resolved_duplicate|resolved_other",
  "creation_time": "2025-10-11T15:28:30.088Z",
  "@timestamp": "2025-10-11T15:28:30.088Z",
  "host_count": 1,
  "alert_count": 1,
  "assigned_user_mail": "analyst@example.com",
  "manual_severity": null,
  "notes": null
}
```

---

### 2.2 Alerts (알림)

**총 인덱스**: 약 80개
**데이터 기간**: 2025-07-03 ~ 2025-10-13
**일별 용량**: 평균 500MB - 2GB

#### 인덱스 패턴
```
logs-cortex_xdr-alerts-YYYY.MM.DD
```

#### 주요 인덱스 목록

**2025년 10월**
- `logs-cortex_xdr-alerts-2025.10.01` ~ `2025.10.13`

**2025년 9월**
- `logs-cortex_xdr-alerts-2025.09.01` ~ `2025.09.30`

**2025년 8월**
- `logs-cortex_xdr-alerts-2025.08.01` ~ `2025.08.31`

**2025년 7월**
- `logs-cortex_xdr-alerts-2025.07.03` ~ `2025.07.31`

#### 특수 인덱스
- `logs-cortex_xdr-alerts-v2-2025.09.26` (버전 2 스키마)
- `alerts` (집계용 별칭)

#### 주요 필드 구조
```json
{
  "alert_id": "12345",
  "name": "Malicious Behavior Detection",
  "severity": "high",
  "category": "Malware|Exploit|Behavior|Network",
  "action": "DETECTED|BLOCKED|ALLOWED",
  "endpoint_id": "abc123",
  "host_name": "DESKTOP-ABC123",
  "user_name": "john.doe",
  "detection_timestamp": "2025-10-11T10:30:00Z",
  "mitre_technique_id": "T1055",
  "mitre_tactic": "Defense Evasion"
}
```

---

### 2.3 Incident Details (상세정보)

**총 인덱스**: 약 35개
**데이터 기간**: 2025-08-02 ~ 2025-09-13

#### 인덱스 패턴
```
logs-cortex_xdr-incident-details-YYYY.MM.DD
```

#### 주요 인덱스 목록

**2025년 9월**
- `logs-cortex_xdr-incident-details-2025.09.01` ~ `2025.09.13`

**2025년 8월**
- `logs-cortex_xdr-incident-details-2025.08.02` ~ `2025.08.31`

#### 주요 필드
- Causality Chain (인과 체인)
- Alert Details (알림 상세정보)
- File Artifacts (파일 아티팩트)
- Network Artifacts (네트워크 아티팩트)
- Registry Changes (레지스트리 변경)
- Process Tree (프로세스 트리)

---

### 2.4 Endpoints (엔드포인트)

**총 인덱스**: 약 45개
**데이터 기간**: 2025-08-02 ~ 2025-09-19

#### 인덱스 패턴
```
logs-cortex_xdr-endpoints-YYYY.MM.DD
```

#### 주요 인덱스 목록

**2025년 9월**
- `logs-cortex_xdr-endpoints-2025.09.01` ~ `2025.09.19`

**2025년 8월**
- `logs-cortex_xdr-endpoints-2025.08.02` ~ `2025.08.31`

#### 특수 인덱스
- `logs-cortex_xdr-endpoints` (별칭, 날짜 없음)
- `logs-cortex_xdr-endpoints-v2` (버전 2 스키마)
- `logs-cortex_xdr-endpoints-raw` (원시 데이터)
- `logs-cortex_xdr-endpoints-2025.09.17-realtime` (실시간 스트림)

#### 주요 필드 구조
```json
{
  "endpoint_id": "abc123def456",
  "endpoint_name": "DESKTOP-ABC123",
  "endpoint_type": "WORKSTATION|SERVER",
  "os_type": "WINDOWS|LINUX|MAC",
  "ip": ["192.168.1.100"],
  "domain": "example.com",
  "agent_version": "7.8.0.12345",
  "agent_status": "CONNECTED|DISCONNECTED|LOST_COMMUNICATION",
  "installation_date": "2025-01-15T10:00:00Z",
  "last_seen": "2025-10-11T15:30:00Z"
}
```

---

### 2.5 File Artifacts (파일 아티팩트)

**총 인덱스**: 약 65개
**데이터 기간**: 2025-08-02 ~ 2025-10-15

#### 인덱스 패턴
```
logs-cortex_xdr-file-artifacts-YYYY.MM.DD
```

#### 주요 인덱스 목록

**2025년 10월**
- `logs-cortex_xdr-file-artifacts-2025.10.01` ~ `2025.10.15`

**2025년 9월**
- `logs-cortex_xdr-file-artifacts-2025.09.01` ~ `2025.09.30`
- `logs-cortex_xdr-file-artifacts-2025-09-24` (특수 포맷)
- `logs-cortex_xdr-file-artifacts-2025-09-25` (특수 포맷)

**2025년 8월**
- `logs-cortex_xdr-file-artifacts-2025.08.02` ~ `2025.08.31`

#### 특수 인덱스
- `logs-cortex_xdr-file_artifacts-v2-2025.09.26` (버전 2 스키마)
- `file-artifacts` (집계용 별칭)

#### 주요 필드 구조
```json
{
  "file_path": "C:\\Windows\\System32\\malware.exe",
  "file_name": "malware.exe",
  "file_sha256": "abc123...",
  "file_size": 1024000,
  "file_type": "PE32|DLL|SCRIPT",
  "signer": "Microsoft Corporation",
  "is_signed": true,
  "is_malicious": false,
  "wildfire_verdict": "BENIGN|MALWARE|GRAYWARE"
}
```

---

### 2.6 Network Artifacts (네트워크 아티팩트)

**총 인덱스**: 약 55개
**데이터 기간**: 2025-08-02 ~ 2025-10-15

#### 인덱스 패턴
```
logs-cortex_xdr-network-artifacts-YYYY.MM.DD
```

#### 주요 인덱스 목록

**2025년 10월**
- `logs-cortex_xdr-network-artifacts-2025.10.01` ~ `2025.10.15`

**2025년 9월**
- `logs-cortex_xdr-network-artifacts-2025.09.01` ~ `2025.09.30`

**2025년 8월**
- `logs-cortex_xdr-network-artifacts-2025.08.02` ~ `2025.08.31`

#### 특수 인덱스
- `network-artifacts` (집계용 별칭)

#### 주요 필드 구조
```json
{
  "external_ip": "8.8.8.8",
  "external_port": 443,
  "local_ip": "192.168.1.100",
  "local_port": 54321,
  "protocol": "TCP|UDP|ICMP",
  "direction": "OUTBOUND|INBOUND",
  "action": "ALLOWED|BLOCKED",
  "country": "US",
  "domain": "example.com"
}
```

---

### 2.7 Endpoint Changes (엔드포인트 변경)

**총 인덱스**: 약 45개
**데이터 기간**: 2025-08-02 ~ 2025-09-17

#### 인덱스 패턴
```
logs-cortex_xdr-endpoint-changes-YYYY.MM.DD
```

#### 주요 인덱스 목록

**2025년 9월**
- `logs-cortex_xdr-endpoint-changes-2025.09.01` ~ `2025.09.17`

**2025년 8월**
- `logs-cortex_xdr-endpoint-changes-2025.08.02` ~ `2025.08.31`

#### 주요 필드
- Change Type (변경 유형): SOFTWARE_INSTALL, CONFIG_CHANGE, POLICY_UPDATE
- Before/After Values (변경 전/후 값)
- User (변경 수행 사용자)
- Timestamp (변경 시간)

---

### 2.8 Audit Logs (감사 로그)

**총 인덱스**: 약 50개
**데이터 기간**: 2025-08-02 ~ 2025-09-17

#### 인덱스 패턴
```
logs-cortex_xdr-audit-logs-YYYY.MM.DD
```

#### 주요 인덱스 목록

**2025년 9월**
- `logs-cortex_xdr-audit-logs-2025.09.01` ~ `2025.09.17`

**2025년 8월**
- `logs-cortex_xdr-audit-logs-2025.08.02` ~ `2025.08.31`

#### 주요 필드 구조
```json
{
  "audit_type": "USER_LOGIN|POLICY_CHANGE|CONFIGURATION_UPDATE",
  "user": "admin@example.com",
  "action": "CREATE|UPDATE|DELETE|VIEW",
  "resource": "Incident|Policy|Endpoint",
  "result": "SUCCESS|FAILURE",
  "ip_address": "192.168.1.10",
  "timestamp": "2025-10-11T10:00:00Z"
}
```

---

### 2.9 Agent Audit Logs (에이전트 감사 로그)

**총 인덱스**: 약 35개
**데이터 기간**: 2025-08-22 ~ 2025-09-17

#### 인덱스 패턴
```
logs-cortex_xdr-agent-audit-logs-YYYY.MM.DD
```

#### 주요 인덱스 목록

**2025년 9월**
- `logs-cortex_xdr-agent-audit-logs-2025.09.01` ~ `2025.09.17`

**2025년 8월**
- `logs-cortex_xdr-agent-audit-logs-2025.08.22` ~ `2025.08.31`

#### 주요 필드
- Agent Actions (에이전트 동작)
- Process Monitoring (프로세스 모니터링)
- File System Monitoring (파일 시스템 모니터링)
- Network Monitoring (네트워크 모니터링)

---

### 2.10 Hybrid Performance (하이브리드 성능)

**총 인덱스**: 약 45개
**데이터 기간**: 2025-08-03 ~ 2025-09-15

#### 인덱스 패턴
```
logs-cortex_xdr-hybrid-performance-YYYY.MM.DD
```

#### 주요 인덱스 목록

**2025년 9월**
- `logs-cortex_xdr-hybrid-performance-2025.09.01` ~ `2025.09.15`

**2025년 8월**
- `logs-cortex_xdr-hybrid-performance-2025.08.03` ~ `2025.08.31`

#### 주요 필드
- CPU Usage (CPU 사용률)
- Memory Usage (메모리 사용률)
- Disk I/O (디스크 I/O)
- Network Latency (네트워크 지연)
- Agent Performance Metrics (에이전트 성능 메트릭)

---

### 2.11 Hybrid Basic Alerts

**총 인덱스**: 약 100개
**데이터 기간**: 2025-08-03 ~ 2025-09-13

#### 인덱스 패턴
```
logs-cortex_xdr-hybrid-basic_alerts-basic_alerts-YYYY.MM.DD
logs-cortex_xdr-hybrid-basic_alerts-alerts-YYYY.MM.DD
```

#### 주요 인덱스 목록

**Basic Alerts (2025년 9월)**
- `logs-cortex_xdr-hybrid-basic_alerts-basic_alerts-2025.09.01` ~ `2025.09.13`

**Basic Alerts (2025년 8월)**
- `logs-cortex_xdr-hybrid-basic_alerts-basic_alerts-2025.08.03` ~ `2025.08.31`

**Alerts (2025년 9월)**
- `logs-cortex_xdr-hybrid-basic_alerts-alerts-2025.09.01` ~ `2025.09.13`

**Alerts (2025년 8월)**
- `logs-cortex_xdr-hybrid-basic_alerts-alerts-2025.08.03` ~ `2025.08.31`

---

### 2.12 Scripts (스크립트)

**총 인덱스**: 약 35개
**데이터 기간**: 2025-08-03 ~ 2025-09-12

#### 인덱스 패턴
```
logs-cortex_xdr-scripts-YYYY.MM.DD
```

#### 주요 인덱스 목록

**2025년 9월**
- `logs-cortex_xdr-scripts-2025.09.01` ~ `2025.09.12`

**2025년 8월**
- `logs-cortex_xdr-scripts-2025.08.03` ~ `2025.08.31`

#### 주요 필드
- Script Name (스크립트 이름)
- Script Type (PowerShell, Bash, Python, VBScript)
- Execution Result (실행 결과)
- User Context (사용자 컨텍스트)
- Command Line (명령줄)

---

### 2.13 File Events (파일 이벤트)

**총 인덱스**: 약 30개
**데이터 기간**: 2025-08-01 ~ 2025-09-21

#### 인덱스 패턴
```
logs-cortex_xdr-file-YYYY.MM.DD
```

#### 주요 인덱스 목록

**2025년 9월**
- `logs-cortex_xdr-file-2025.09.01` ~ `2025.09.21`

**2025년 8월**
- `logs-cortex_xdr-file-2025.08.01` ~ `2025.08.10`

#### 특수 인덱스
- `logs-cortex_xdr-file-events-2025.08.23`

---

### 2.14 MITRE ATT&CK Mappings

**총 인덱스**: 약 25개
**데이터 기간**: 2025-08-03 ~ 2025-08-23

#### 인덱스 패턴
```
logs-cortex_xdr-mitre-mappings-YYYY.MM.DD
```

#### 주요 인덱스 목록
- `logs-cortex_xdr-mitre-mappings-2025.08.03` ~ `2025.08.23`

#### 관련 인덱스
- `mitre-attack-techniques` (MITRE 기술 목록)

#### 주요 필드 구조
```json
{
  "incident_id": "500455",
  "technique_id": "T1055",
  "technique_name": "Process Injection",
  "tactic": "Defense Evasion",
  "subtechnique": "T1055.001",
  "confidence": "HIGH|MEDIUM|LOW",
  "evidence": "Process hollowing detected"
}
```

---

### 2.15 기타 Cortex XDR 로그

#### Process Events (프로세스 이벤트)
- `logs-cortex_xdr-process-events-2025.08.03`
- `logs-cortex_xdr-process-events-2025.08.23`

#### Process Chains (프로세스 체인)
- `logs-cortex_xdr-process-chains-2025.08.03`
- `logs-cortex_xdr-process-chains-2025.08.23`

#### Registry Events (레지스트리 이벤트)
- `logs-cortex_xdr-registry-events-2025.08.23`

#### Network Events (네트워크 이벤트)
- `logs-cortex_xdr-network-events-2025.08.23`

#### Vulnerability Assessment (취약점 평가)
- `logs-cortex_xdr-va-endpoints-2025.08.28`
- `logs-cortex_xdr-va-endpoints-2025.09.17`
- `logs-cortex_xdr-va-cves-2025.08.28`
- `logs-cortex_xdr-va-cves-2025.09.17`

#### Incident-Alert Mappings (인시던트-알림 매핑)
- `logs-cortex_xdr-incident-alert-mappings-2025.08.03`
- `logs-cortex_xdr-incident-alert-mappings-2025.08.25`

#### Safe Correlations (안전 상관분석)
- `logs-cortex_xdr-safe-correlations-2025.08.03`

#### PostgreSQL Mappings (PostgreSQL 매핑)
- `logs-cortex_xdr-postgres-mappings-2025.08.03`

#### Endpoint History (엔드포인트 히스토리)
- `logs-cortex_xdr-endpoint-history-2025.08.02`

---

## 3. 기타 Logs 인덱스

### 3.1 OpenCTI & MISP

| 인덱스명 | 설명 |
|---------|------|
| `logs-opencti-2025.08.05` | OpenCTI (Open Cyber Threat Intelligence) 로그 |
| `logs-misp-2025.08.05` | MISP (Malware Information Sharing Platform) 로그 |

### 3.2 일반 Logs

| 인덱스명 | 기간 |
|---------|------|
| `logs-2025.08.02` | 2025-08-02 |
| `logs-2025.08.03` | 2025-08-03 |
| `logs-2025.08.04` | 2025-08-04 |
| `logs-2025.08.05` | 2025-08-05 |
| `logs-2025.08.06` | 2025-08-06 |
| `logs-2025.08.07` | 2025-08-07 |
| `logs-2025.08.11` | 2025-08-11 |
| `logs-2025.08.12` | 2025-08-12 |
| `logs-2025.08.21` | 2025-08-21 |
| `logs-2025.08.22` | 2025-08-22 |

### 3.3 테스트 및 임시 인덱스

| 인덱스명 | 설명 |
|---------|------|
| `logs-test-enrichment` | 데이터 보강 테스트 |
| `logs-ioc-vectors` | IoC 벡터 분석 |

### 3.4 기타 관련 인덱스

| 인덱스명 | 설명 |
|---------|------|
| `security-events-2025.08` | 보안 이벤트 집계 (2025년 8월) |
| `security-events` | 보안 이벤트 (별칭) |
| `security-correlations` | 보안 상관분석 |
| `incidents` | 인시던트 집계 (별칭) |
| `alerts` | 알림 집계 (별칭) |
| `incident-management` | 인시던트 관리 |
| `ib-guard-ai-analysis` | IB Guard AI 분석 결과 |

---

## 4. 인덱스 명명 규칙

### 4.1 일별 인덱스 패턴

```
logs-{vendor}-{data_type}-YYYY.MM.DD
```

**예시**:
- `logs-cortex_xdr-incidents-2025.10.11`
- `logs-cortex_xdr-alerts-2025.09.30`

### 4.2 월별 인덱스 패턴

```
{category}-YYYY.MM
```

**예시**:
- `threat-intel-2025.08`
- `security-events-2025.08`

### 4.3 버전별 인덱스

```
logs-{vendor}-{data_type}-v{version}-YYYY.MM.DD
```

**예시**:
- `logs-cortex_xdr-incidents-v2-2025.09.26`
- `logs-cortex_xdr-alerts-v2-2025.09.26`

### 4.4 실시간 인덱스

```
logs-{vendor}-{data_type}-YYYY.MM.DD-realtime
```

**예시**:
- `logs-cortex_xdr-endpoints-2025.09.17-realtime`
- `threat-intel-realtime-2025.08`

---

## 5. 데이터 보존 정책

### 5.1 Hot 데이터 (최근 7일)
- **스토리지**: SSD
- **샤드**: 5 primary, 1 replica
- **리프레시**: 1s
- **보존 기간**: 7일

### 5.2 Warm 데이터 (8일 ~ 30일)
- **스토리지**: SSD
- **샤드**: 3 primary, 1 replica
- **리프레시**: 30s
- **보존 기간**: 23일

### 5.3 Cold 데이터 (31일 ~ 90일)
- **스토리지**: HDD
- **샤드**: 1 primary, 1 replica
- **리프레시**: 60s
- **보존 기간**: 60일

### 5.4 Frozen 데이터 (91일 이상)
- **스토리지**: S3 / Object Storage
- **압축**: GZIP
- **보존 기간**: 1년
- **복원**: On-demand

---

## 6. 인덱스 통계 요약

### 6.1 카테고리별 인덱스 수

| 카테고리 | 인덱스 수 | 비고 |
|----------|-----------|------|
| **Threat Intelligence** | 21개 | 핵심 15개 + 시계열 6개 |
| **Incidents** | ~70개 | 일별 인덱스 |
| **Alerts** | ~80개 | 일별 인덱스 |
| **Incident Details** | ~35개 | 일별 인덱스 |
| **Endpoints** | ~45개 | 일별 인덱스 + 특수 4개 |
| **File Artifacts** | ~65개 | 일별 인덱스 |
| **Network Artifacts** | ~55개 | 일별 인덱스 |
| **Endpoint Changes** | ~45개 | 일별 인덱스 |
| **Audit Logs** | ~50개 | 일별 인덱스 |
| **Agent Audit Logs** | ~35개 | 일별 인덱스 |
| **Hybrid Performance** | ~45개 | 일별 인덱스 |
| **Hybrid Basic Alerts** | ~100개 | basic_alerts + alerts |
| **Scripts** | ~35개 | 일별 인덱스 |
| **File Events** | ~30개 | 일별 인덱스 |
| **MITRE Mappings** | ~25개 | 일별 인덱스 |
| **기타 Cortex XDR** | ~15개 | Process, Registry, Network 등 |
| **일반 Logs** | ~15개 | OpenCTI, MISP, 일반 로그 |

**총 인덱스 수**: **약 650개**

### 6.2 데이터 기간 요약

| 데이터 유형 | 최초 데이터 | 최신 데이터 | 기간 |
|------------|------------|------------|------|
| Incidents | 2024-09-22 | 2025-10-11 | 약 13개월 |
| Alerts | 2025-07-03 | 2025-10-13 | 약 3개월 |
| TI Feeds | 지속적 업데이트 | 실시간 | - |
| Endpoints | 2025-08-02 | 2025-09-19 | 약 1.5개월 |
| File Artifacts | 2025-08-02 | 2025-10-15 | 약 2.5개월 |

### 6.3 일별 평균 데이터 볼륨

| 인덱스 유형 | 평균 용량/일 | 문서 수/일 |
|------------|-------------|-----------|
| Incidents | 1-5 GB | 100-500 |
| Alerts | 500MB-2GB | 1,000-5,000 |
| File Artifacts | 2-8 GB | 10,000-50,000 |
| Network Artifacts | 1-4 GB | 5,000-20,000 |
| Endpoints | 100-500 MB | 500-2,000 |

---

## 7. 인덱스 사용 예시

### 7.1 OpenSearch Query DSL

#### 최근 24시간 High 이상 인시던트 조회
```json
GET logs-cortex_xdr-incidents-*/_search
{
  "query": {
    "bool": {
      "must": [
        {
          "range": {
            "@timestamp": {
              "gte": "now-24h"
            }
          }
        },
        {
          "terms": {
            "severity": ["high", "critical"]
          }
        }
      ]
    }
  },
  "sort": [
    { "@timestamp": { "order": "desc" } }
  ],
  "size": 100
}
```

#### Threat Intelligence IoC 검색
```json
GET threat-intelligence-ioc/_search
{
  "query": {
    "bool": {
      "should": [
        { "term": { "ioc.type": "ip" } },
        { "term": { "ioc.type": "domain" } },
        { "term": { "ioc.type": "hash" } }
      ]
    }
  }
}
```

#### MITRE ATT&CK 기술 통계
```json
GET logs-cortex_xdr-mitre-mappings-*/_search
{
  "size": 0,
  "aggs": {
    "top_techniques": {
      "terms": {
        "field": "technique_id.keyword",
        "size": 10
      },
      "aggs": {
        "tactics": {
          "terms": {
            "field": "tactic.keyword"
          }
        }
      }
    }
  }
}
```

### 7.2 Index Patterns (Kibana/OpenSearch Dashboards)

```
logs-cortex_xdr-incidents-*
logs-cortex_xdr-alerts-*
logs-cortex_xdr-endpoints-*
threat-intelligence-*
ti-correlation-results-*
```

---

## 8. 참고 문서

- [OpenSearch Documentation](https://opensearch.org/docs/)
- [Cortex XDR API Reference](https://docs.paloaltonetworks.com/cortex/cortex-xdr/cortex-xdr-api)
- [MITRE ATT&CK Framework](https://attack.mitre.org/)
- [CLAUDE.md](/www/ib-poral/CLAUDE.md) - 프로젝트 전체 가이드
- [MCP_README.md](/www/ib-poral/docs/MCP_README.md) - MCP 서버 사용 가이드

---

**생성 도구**: Claude Code + opensearch-mcp-inbridge
**최종 업데이트**: 2025-10-25
