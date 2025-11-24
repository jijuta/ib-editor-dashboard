# Cortex XDR 인덱스 패턴 전체 목록

> **생성일**: 2025-11-21
> **OpenSearch**: opensearch:9200
> **총 인덱스**: 약 995개

---

## 📊 전체 Cortex XDR 인덱스 목록 (패턴별)

| 인덱스 패턴 | 개수 | 데이터 기간 | 예시 |
|------------|------|------------|------|
| **Incidents** | 126개 | 2024.09.22 ~ 2025.09.26 | `logs-cortex_xdr-incidents-2024.09.22` |
| **Incident Details** | 50개 | 2025.08 ~ 2025.11 | `logs-cortex_xdr-incident-details-2025.08.02` |
| **Alerts** | 123개 | 2025.07.03 ~ 2025.11.10 | `logs-cortex_xdr-alerts-2025.07.03` |
| **File Artifacts** | 90개 | 2025.08 ~ 2025.11 | `logs-cortex_xdr-file-artifacts-2025.08.02` |
| **File (Short)** | 119개 | 2025.08.01 ~ 2025.11.01 | `logs-cortex_xdr-file-2025.08.01` |
| **Network Artifacts** | 105개 | 2024.10.01 ~ 2025.11.10 | `logs-cortex_xdr-network-artifacts-2024.10.01` |
| **Network (Short)** | 108개 | 2025.08 ~ 2025.11 | `logs-cortex_xdr-network-2025.10.31` |
| **Endpoints** | 48개 | 2025.08.02 ~ 2025.09.19 | `logs-cortex_xdr-endpoints-2025.08.02` |
| **VA CVEs (취약점)** | 9개 | 2025.08.28 ~ 2025.11.10 | `logs-cortex_xdr-va-cves-2025.08.28` |
| **VA Endpoints** | 2개 | 2025.08.28 ~ 2025.09.17 | `logs-cortex_xdr-va-endpoints-2025.08.28` |
| **MITRE Mappings** | 21개 | 2025.08.03 ~ 2025.08.23 | `logs-cortex_xdr-mitre-mappings-2025.08.03` |
| **Audit Logs** | 43개 | 2025.08.02 ~ 2025.09.17 | `logs-cortex_xdr-audit-logs-2025.08.02` |
| **Agent Audit Logs** | 24개 | 2025.08.22 ~ 2025.09.17 | `logs-cortex_xdr-agent-audit-logs-2025.08.22` |
| **Endpoint Changes** | 42개 | 2025.08.02 ~ 2025.09.17 | `logs-cortex_xdr-endpoint-changes-2025.08.02` |
| **Hybrid Performance** | 44개 | 2025.08.03 ~ 2025.09.15 | `logs-cortex_xdr-hybrid-performance-2025.08.03` |
| **Hybrid Alerts** | 40개 | 2025.08.03 ~ 2025.09.13 | `logs-cortex_xdr-hybrid-basic_alerts-alerts-2025.08.03` |
| **Hybrid Basic Alerts** | 41개 | 2025.08.03 ~ 2025.09.13 | `logs-cortex_xdr-hybrid-basic_alerts-basic_alerts-2025.08.03` |
| **Process** | 5개 | 2025.08 ~ 2025.10 | `logs-cortex_xdr-process-2025.10.31` |
| **Process Events** | 2개 | 2025.08.03 ~ 2025.08.23 | `logs-cortex_xdr-process-events-2025.08.03` |
| **Process Chains** | 2개 | 2025.08.03 ~ 2025.08.23 | `logs-cortex_xdr-process-chains-2025.08.03` |
| **Registry** | 2개 | 2025.08 ~ 2025.10 | `logs-cortex_xdr-registry-2025.10.31` |
| **Registry Events** | 1개 | 2025.08.23 | `logs-cortex_xdr-registry-events-2025.08.23` |
| **Scripts** | 38개 | 2025.08.03 ~ 2025.09.12 | `logs-cortex_xdr-scripts-2025.08.03` |
| **Incident-Alert Mappings** | 2개 | 2025.08.03 ~ 2025.08.25 | `logs-cortex_xdr-incident-alert-mappings-2025.08.03` |
| **Safe Correlations** | 1개 | 2025.08.03 | `logs-cortex_xdr-safe-correlations-2025.08.03` |
| **PostgreSQL Mappings** | 1개 | 2025.08.03 | `logs-cortex_xdr-postgres-mappings-2025.08.03` |
| **Endpoint History** | 1개 | 2025.08.02 | `logs-cortex_xdr-endpoint-history-2025.08.02` |
| **File Events** | 1개 | 2025.08.23 | `logs-cortex_xdr-file-events-2025.08.23` |
| **Network Events** | 1개 | 2025.08.23 | `logs-cortex_xdr-network-events-2025.08.23` |
| **Version 2 (v2)** | 4개 | 2025.09.26 | `logs-cortex_xdr-alerts-v2-2025.09.26` |
| **Raw Data** | 1개 | - | `logs-cortex_xdr-endpoints-raw` |
| **Realtime** | 1개 | 2025.09.17 | `logs-cortex_xdr-endpoints-2025.09.17-realtime` |

**총계**: **995개** 인덱스

---

## 🔍 주요 인덱스 상세

### 1. 핵심 데이터 인덱스

| 유형 | 인덱스 패턴 | 용도 |
|------|------------|------|
| 인시던트 | `logs-cortex_xdr-incidents-*` | 인시던트 목록, 심각도, 상태 |
| 인시던트 상세 | `logs-cortex_xdr-incident-details-*` | Artifacts, Causality Chain, Playbook |
| 알림 | `logs-cortex_xdr-alerts-*` | 개별 알림, Detection 정보 |
| 파일 | `logs-cortex_xdr-file-artifacts-*` | 파일 해시, 서명, WildFire 판정 |
| 네트워크 | `logs-cortex_xdr-network-artifacts-*` | IP, Port, Domain, 국가 |
| 엔드포인트 | `logs-cortex_xdr-endpoints-*` | 호스트 정보, 에이전트 상태 |

### 2. 보안 분석 인덱스

| 유형 | 인덱스 패턴 | 용도 |
|------|------------|------|
| CVE 취약점 | `logs-cortex_xdr-va-cves-*` | CVE ID, CVSS 점수, 영향받는 호스트 |
| MITRE ATT&CK | `logs-cortex_xdr-mitre-mappings-*` | Technique ID, Tactic, 매핑 정보 |
| 감사 로그 | `logs-cortex_xdr-audit-logs-*` | 사용자 활동, 정책 변경 |

### 3. 시스템 모니터링 인덱스

| 유형 | 인덱스 패턴 | 용도 |
|------|------------|------|
| 에이전트 감사 | `logs-cortex_xdr-agent-audit-logs-*` | 에이전트 동작 로그 |
| 엔드포인트 변경 | `logs-cortex_xdr-endpoint-changes-*` | SW 설치, 설정 변경 |
| 성능 메트릭 | `logs-cortex_xdr-hybrid-performance-*` | CPU, 메모리, 디스크 I/O |

### 4. 프로세스 & 레지스트리

| 유형 | 인덱스 패턴 | 용도 |
|------|------------|------|
| 프로세스 | `logs-cortex_xdr-process-*` | 프로세스 실행 정보 |
| 프로세스 체인 | `logs-cortex_xdr-process-chains-*` | 부모-자식 프로세스 관계 |
| 레지스트리 | `logs-cortex_xdr-registry-*` | 레지스트리 변경 |
| 스크립트 | `logs-cortex_xdr-scripts-*` | PowerShell, Bash 등 스크립트 실행 |

---

## 📅 데이터 기간별 분류

### 2024년 데이터 (레거시/더미)
- **Incidents**: 2024.09.22 ~ 2024.10.31
- **Network Artifacts**: 2024.10.01 ~ 2024.10.31

### 2025년 실제 데이터
- **7월**: Alerts (07.03~), Incidents (creation_time 기준)
- **8월**: 대부분의 인덱스 시작 (08.02~)
- **9월**: 9월 중순까지 지속 수집 (일부 인덱스 09.17 종료)
- **10월 이후**: 더미 데이터 또는 제한적 수집

---

## ⚠️ 누락 또는 제한적 인덱스

| 인덱스 | 상태 | 비고 |
|--------|------|------|
| **VA CVEs** | ⚠️ 9개만 존재 | 2025.08.28 ~ 2025.11.10 (제한적) |
| **VA Endpoints** | ⚠️ 2개만 존재 | 2025.08.28, 2025.09.17 |
| **MITRE Mappings** | ⚠️ 8월만 존재 | 2025.08.03 ~ 2025.08.23 (3주) |
| **Process Events** | ⚠️ 2개만 존재 | 2025.08.03, 2025.08.23 |
| **Registry Events** | ⚠️ 1개만 존재 | 2025.08.23 |
| **File Events** | ⚠️ 1개만 존재 | 2025.08.23 |
| **Network Events** | ⚠️ 1개만 존재 | 2025.08.23 |

---

## 🔧 특수 인덱스

### 별칭 (Aliases)
| 별칭 | 대상 |
|------|------|
| `cortex-xdr-incidents` | incidents 인덱스 집합 |
| `incidents` | 통합 인시던트 뷰 |
| `alerts` | 알림 인덱스 집합 |
| `file-artifacts` | 파일 아티팩트 집합 |
| `network-artifacts` | 네트워크 아티팩트 집합 |

### 버전별 인덱스
- **v2 스키마**: `logs-cortex_xdr-*-v2-2025.09.26` (4개)
  - incidents-v2, alerts-v2, file_artifacts-v2, endpoints-v2

### 특수 데이터 소스
- **Raw Data**: `logs-cortex_xdr-endpoints-raw`
- **Realtime**: `logs-cortex_xdr-endpoints-2025.09.17-realtime`

---

## 📝 권장 Query 패턴

### 전체 인시던트 조회
```
GET logs-cortex_xdr-incidents-*/_search
```

### 실제 데이터만 조회 (인시던트 ID `4*`)
```json
GET logs-cortex_xdr-incidents-*/_search
{
  "query": {
    "regexp": {
      "incident_id.keyword": "4[0-9]{5,8}"
    }
  }
}
```

### CVE 취약점 조회
```
GET logs-cortex_xdr-va-cves-*/_search
```

### MITRE ATT&CK 매핑 조회
```
GET logs-cortex_xdr-mitre-mappings-*/_search
```

### 파일 해시 검색
```
GET logs-cortex_xdr-file-artifacts-*,logs-cortex_xdr-file-*/_search
```

---

## 📚 참고 문서

- [Cortex-XDR-Real-Data-Analysis.md](Cortex-XDR-Real-Data-Analysis.md) - 실제 데이터 상세 분석
- [OpenSearch_Index_List.md](OpenSearch_Index_List.md) - 레거시 인덱스 목록
- [CLAUDE.md](../CLAUDE.md) - 프로젝트 가이드

---

**생성 도구**: Claude Code + opensearch-mcp
**최종 업데이트**: 2025-11-21
**문서 버전**: 1.0
