# TI (Threat Intelligence) 데이터 크롤링 시스템 종합 분석

> **생성일**: 2025-11-21
> **목적**: 위협 인텔리전스 데이터의 수집, 저장, 캐싱 전체 프로세스 상세 문서화

---

## 📋 목차

1. [시스템 개요](#시스템-개요)
2. [아키텍처 다이어그램](#아키텍처-다이어그램)
3. [데이터 소스](#데이터-소스)
4. [크롤링 시스템](#크롤링-시스템)
5. [데이터 저장소](#데이터-저장소)
6. [TI 캐시 시스템](#ti-캐시-시스템)
7. [데이터 플로우](#데이터-플로우)
8. [스크립트 및 도구](#스크립트-및-도구)
9. [운영 가이드](#운영-가이드)
10. [성능 및 최적화](#성능-및-최적화)

---

## 🎯 시스템 개요

### 핵심 목적
- **200만+ 위협 인텔리전스 데이터**의 실시간 수집 및 분석
- **Cortex XDR** 보안 이벤트와 **위협 인텔리전스** 데이터의 상관 분석
- **< 1ms 응답시간**의 초고속 위협 조회 시스템 구축

### 주요 특징
- ⚡ **증분 업데이트**: 80-95% 시간 절약 (2분 vs 15분)
- 🔗 **멀티소스 통합**: OpenSearch + PostgreSQL + Redis
- 📊 **대용량 처리**: 951K+ 멀웨어, 309K+ CVE, 301K+ IOC
- 🚀 **실시간 캐싱**: Redis 기반 Bloom Filter + Reverse Index
- 🔄 **자동화**: 스케줄러 기반 주기적 데이터 수집

### 시스템 구성 요소

| 컴포넌트 | 역할 | 위치 | 기술 스택 |
|---------|------|------|-----------|
| **Cortex XDR Crawler** | XDR 데이터 수집 | `/opensearch/cortex-xdr-crawler/` | Python, OpenSearch |
| **PostgreSQL TI DB** | 위협 인텔리전스 저장소 | `postgres:5432/authdb` | PostgreSQL, pgvector |
| **TI Cache System** | 고속 캐시 | `/opensearch/script2/` | Redis, Node.js, Bloom Filters |
| **OpenSearch** | 보안 이벤트 인덱스 | `20.41.120.173:9200` | OpenSearch 2.8+ |
| **Redis TI Cache** | 전용 캐시 인스턴스 | `redis-ti-cache:6379` (외부 6380) | Redis 7.2+ with RedisBloom |

---

## 🏗️ 아키텍처 다이어그램

### 전체 시스템 아키텍처

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         외부 데이터 소스                                  │
├──────────────────────────────────────────────────────────────────────────┤
│  Cortex XDR API     │  VirusTotal  │  AbuseIPDB  │  URLhaus  │  MISP    │
│  (Palo Alto)        │  (멀웨어)    │  (IP 평판)  │  (악성URL)│  (TI)    │
└──────────┬───────────┴──────┬───────┴──────┬──────┴─────┬─────┴──────────┘
           │                  │              │            │
           ▼                  ▼              ▼            ▼
┌─────────────────────────────────────────────────────────────────┐
│              데이터 수집 레이어 (크롤러)                          │
├─────────────────────────────────────────────────────────────────┤
│  Cortex XDR Crawler                                             │
│  ├── scheduler.py (스케줄러)                                    │
│  ├── enhanced_unified_collector.py (통합 수집기)                │
│  ├── enhanced_endpoint_collector.py (엔드포인트)                │
│  ├── enhanced_alerts_collector.py (알림)                        │
│  └── checkpoint/ (체크포인트 관리)                              │
│                                                                 │
│  External TI Collectors (예정)                                  │
│  ├── virustotal_collector.py                                   │
│  ├── abuseipdb_collector.py                                    │
│  └── misp_collector.py                                         │
└─────────┬──────────────────────────────────────┬────────────────┘
          │                                      │
          ▼                                      ▼
┌──────────────────────────┐      ┌─────────────────────────────┐
│   OpenSearch 인덱스       │      │  PostgreSQL TI DB           │
│   (실시간 보안 이벤트)     │      │  (위협 인텔리전스 마스터)   │
├──────────────────────────┤      ├─────────────────────────────┤
│ • logs-cortex_xdr-       │      │ • ti_malware (951K)         │
│   incidents-*            │      │ • ti_cve (309K)             │
│ • logs-cortex_xdr-       │      │ • ti_ioc (301K)             │
│   alerts-*               │      │ • ti_mitre (1,950)          │
│ • logs-cortex_xdr-       │      │ • ti_apt_groups (470)       │
│   endpoints-*            │      │ • ti_misp_* (MISP 통합)     │
│ • logs-cortex_xdr-       │      │ • ti_tools, ti_tactics...   │
│   file-*, network-*,     │      │                             │
│   process-*, registry-*  │      │ 총 17개 TI 테이블           │
└──────────┬───────────────┘      └──────────┬──────────────────┘
           │                                 │
           └──────────┬──────────────────────┘
                      │
                      ▼
           ┌─────────────────────────────────────────┐
           │  TI Cache Builder (증분 업데이트)        │
           │  /opensearch/script2/                   │
           ├─────────────────────────────────────────┤
           │  • IncrementalUpdateEngine              │
           │  • CheckpointManager                    │
           │  • TimestampChangeDetection             │
           │  • Bloom Filter Generator               │
           │  • Reverse Index Builder                │
           └─────────┬───────────────────────────────┘
                     │
                     ▼
           ┌─────────────────────────────────────────┐
           │  Redis TI Cache (Port 6380)             │
           │  redis-ti-cache 컨테이너                │
           ├─────────────────────────────────────────┤
           │  Bloom Filters (초고속 존재 여부 확인)   │
           │  ├── ti:bloom:hashes (500K capacity)    │
           │  ├── ti:bloom:ips (100K capacity)       │
           │  ├── ti:bloom:domains (200K capacity)   │
           │  ├── ti:bloom:cves (50K capacity)       │
           │  ├── ti:bloom:mitre (5K capacity)       │
           │  └── ti:bloom:apt_groups (1K capacity)  │
           │                                         │
           │  Reverse Index (실제 데이터 조회)        │
           │  ├── ti:reverse:hashes:* (샤딩됨)       │
           │  ├── ti:reverse:ips:* (샤딩됨)          │
           │  ├── ti:reverse:domains:* (샤딩됨)      │
           │  ├── ti:reverse:cves                    │
           │  └── ti:reverse:mitre                   │
           │                                         │
           │  캐시 메타데이터                         │
           │  └── ti:metadata (빌드 정보, 통계)       │
           └─────────┬───────────────────────────────┘
                     │
                     ▼
           ┌─────────────────────────────────────────┐
           │         애플리케이션 레이어               │
           ├─────────────────────────────────────────┤
           │  • InBridge (엔터프라이즈 SIEM)          │
           │  • My-App (국제 SIEM)                   │
           │  • IB-Endpoints (엔드포인트 모니터링)    │
           │  • Incident Analysis Tools              │
           │  • TI Correlation API                   │
           └─────────────────────────────────────────┘
```

### 데이터 플로우 (시간순)

```
1. 데이터 수집 (매 시간/일 자동)
   ┌────────────────────────────────────────────────┐
   │ Cortex XDR API                                 │
   │ ├── 인시던트 데이터 (incidents)                │
   │ ├── 알림 데이터 (alerts)                       │
   │ ├── 엔드포인트 데이터 (endpoints)              │
   │ └── 행위 데이터 (file, network, process)       │
   └──────────┬─────────────────────────────────────┘
              │ (Python Collector)
              ▼
   ┌────────────────────────────────────────────────┐
   │ Checkpoint 확인                                │
   │ └── last_timestamp 이후 데이터만 수집 (증분)   │
   └──────────┬─────────────────────────────────────┘
              │
              ▼
   ┌────────────────────────────────────────────────┐
   │ OpenSearch 저장                                │
   │ logs-cortex_xdr-{type}-{date}                  │
   └────────────────────────────────────────────────┘

2. TI 데이터 캐시 구축 (일 1회 증분 업데이트)
   ┌────────────────────────────────────────────────┐
   │ PostgreSQL 위협 인텔리전스 DB                   │
   │ └── 26개 테이블 (1,563K+ 레코드)               │
   └──────────┬─────────────────────────────────────┘
              │ (Node.js TI Cache Builder)
              ▼
   ┌────────────────────────────────────────────────┐
   │ 체크포인트 기반 증분 데이터 추출                │
   │ └── 마지막 updated_at 이후 변경사항만          │
   └──────────┬─────────────────────────────────────┘
              │
              ▼
   ┌────────────────────────────────────────────────┐
   │ Bloom Filter 업데이트                          │
   │ └── BF.ADD ti:bloom:{type} {value}             │
   └──────────┬─────────────────────────────────────┘
              │
              ▼
   ┌────────────────────────────────────────────────┐
   │ Reverse Index 업데이트                         │
   │ └── HSET ti:reverse:{type}:{shard} {key} {json}│
   └──────────┬─────────────────────────────────────┘
              │
              ▼
   ┌────────────────────────────────────────────────┐
   │ Redis TI Cache 완료                            │
   │ └── 5개 키 (Bloom + Reverse Index)             │
   └────────────────────────────────────────────────┘

3. 실시간 조회 (< 1ms)
   ┌────────────────────────────────────────────────┐
   │ 애플리케이션 요청                               │
   │ └── 해시 조회: a1b2c3d4e5f6...                 │
   └──────────┬─────────────────────────────────────┘
              │
              ▼
   ┌────────────────────────────────────────────────┐
   │ Step 1: Bloom Filter 체크                      │
   │ └── BF.EXISTS ti:bloom:hashes {hash}           │
   │     ├── 0 → 즉시 "데이터 없음" 반환 (< 0.1ms) │
   │     └── 1 → Step 2로 진행                      │
   └──────────┬─────────────────────────────────────┘
              │
              ▼
   ┌────────────────────────────────────────────────┐
   │ Step 2: Reverse Index 조회                     │
   │ └── HGET ti:reverse:hashes:{shard} {hash}      │
   │     └── TI 레코드 반환 (< 1ms)                 │
   └──────────┬─────────────────────────────────────┘
              │
              ▼
   ┌────────────────────────────────────────────────┐
   │ Step 3: 결과 반환                              │
   │ └── { malware_family, severity, verdict... }   │
   └────────────────────────────────────────────────┘
```

---

## 📊 데이터 소스

### 1. Cortex XDR (Palo Alto Networks)

**API 엔드포인트**: `https://api-{instance}.xdr.us.paloaltonetworks.com`
**인증**: API Key + API ID
**수집 주기**: 1시간마다 (스케줄러 설정 가능)

#### 수집 데이터 유형

| 데이터 유형 | OpenSearch 인덱스 | 설명 | 평균 수집량 |
|-----------|------------------|------|-----------|
| **Incidents** | `logs-cortex_xdr-incidents-*` | 보안 인시던트 (집계된 알림) | ~100-500/일 |
| **Alerts** | `logs-cortex_xdr-alerts-*` | 개별 보안 알림 | ~1,000-5,000/일 |
| **Endpoints** | `logs-cortex_xdr-endpoints-*` | 엔드포인트 상태 및 정보 | ~500-2,000 (전체) |
| **File Activities** | `logs-cortex_xdr-file-*` | 파일 생성/수정/삭제 이벤트 | ~10,000-50,000/일 |
| **Network Activities** | `logs-cortex_xdr-network-*` | 네트워크 연결 이벤트 | ~5,000-20,000/일 |
| **Process Activities** | `logs-cortex_xdr-process-*` | 프로세스 실행 이벤트 | ~8,000-30,000/일 |
| **Registry Activities** | `logs-cortex_xdr-registry-*` | 레지스트리 변경 이벤트 | ~2,000-10,000/일 |

#### XDR 수집 스크립트

```bash
# 위치: /opt/docs/apps/opensearch/cortex-xdr-crawler/

# 주요 수집기
collectors/
├── enhanced_unified_collector.py        # 통합 수집기 (모든 유형)
├── enhanced_alerts_collector.py         # 알림 전용
├── enhanced_endpoint_collector.py       # 엔드포인트 전용
├── collect_incident_details_background.py  # 인시던트 상세 (백그라운드)
└── hybrid_data_collector.py            # 하이브리드 수집기

# 체크포인트 파일 (증분 업데이트용)
checkpoint/
├── enhanced_unified_checkpoint.json     # 마지막 수집 타임스탬프
├── incident_details_checkpoint.json     # 인시던트 상세 체크포인트
└── batch_endpoint_checkpoint_v2.json    # 엔드포인트 배치 체크포인트
```

### 2. PostgreSQL 위협 인텔리전스 DB

**연결 정보**:
- Host: `postgres` (Docker 네트워크) / `localhost:5432` (외부)
- Database: `authdb`
- Schema: `threat_intelligence`
- User: `n8n`
- Password: `n8n123`

#### TI 테이블 구조 및 데이터 현황

| 테이블명 | 레코드 수 | 크기 | 설명 | 주요 필드 |
|---------|-----------|------|------|----------|
| **ti_malware** | 951,940 | 1,884 MB | 멀웨어 해시 정보 | hash, family, verdict, source |
| **ti_cve** | 309,069 | 1,173 MB | CVE 취약점 정보 | cve_id, cvss_score, description |
| **ti_ioc** | 301,408 | 304 MB | IOC (IP, 도메인, URL) | ioc_type, ioc_value, threat_type |
| **ti_mitre** | 1,950 | 5,592 KB | MITRE ATT&CK 기법 | technique_id, tactic, description |
| **ti_apt_groups** | 470 | 5,304 KB | APT 그룹 정보 | group_name, aliases, country |
| **ti_misp_attributes** | - | 360 MB | MISP 속성 데이터 | event_id, type, value |
| **ti_misp_objects** | - | 93 MB | MISP 객체 데이터 | object_type, attributes |
| **ti_misp_clusters** | - | 79 MB | MISP 갤럭시 클러스터 | cluster_type, values |
| **ti_tools** | - | 11 MB | 공격자 도구 정보 | tool_name, description |
| **ti_tactics** | - | 200 KB | MITRE 전술 정보 | tactic_id, name |
| **ti_mitigations** | - | 456 KB | 완화 조치 정보 | mitigation_id, description |
| **ti_incident_mitre** | - | 5,912 KB | 인시던트-MITRE 매핑 | incident_id, technique_id |
| **ti_yara_stats** | - | 5,160 KB | YARA 룰 통계 | rule_name, hits |
| **ti_correlations** | - | 64 KB | TI 상관관계 데이터 | source_id, target_id |

**총 데이터 규모**: ~1,563,837+ 레코드, ~3.8GB

#### 캐시 전용 테이블 (Redis 백업용)

| 테이블명 | 용도 |
|---------|------|
| `ti_cache_bloom_filters` | Bloom Filter 백업 |
| `ti_cache_hashes` | 해시 Reverse Index 백업 |
| `ti_cache_ips` | IP Reverse Index 백업 |
| `ti_cache_domains` | 도메인 Reverse Index 백업 |
| `ti_cache_cves` | CVE Reverse Index 백업 |
| `ti_cache_mitre` | MITRE Reverse Index 백업 |
| `ti_cache_apt_groups` | APT 그룹 Reverse Index 백업 |
| `ti_cache_metadata` | 캐시 메타데이터 |
| `ti_cache_reverse_index` | 통합 Reverse Index |

### 3. 외부 위협 인텔리전스 소스 (계획)

| 소스 | API | 현재 상태 | 통합 계획 |
|------|-----|----------|----------|
| **VirusTotal** | REST API | 수동 조회 가능 | 자동 수집기 개발 예정 |
| **AbuseIPDB** | REST API | 수동 조회 가능 | 자동 수집기 개발 예정 |
| **URLhaus** | REST API | 수동 조회 가능 | 자동 수집기 개발 예정 |
| **MISP** | PyMISP | 부분 통합 | PostgreSQL 저장 완료 |
| **OpenCTI** | GraphQL API | 개발 중 | InBridge 통합 진행 중 |

---

## 🤖 크롤링 시스템

### Cortex XDR 크롤러 아키텍처

**위치**: `/opt/docs/apps/opensearch/cortex-xdr-crawler/`
**언어**: Python 3.9+
**실행 방식**: Docker 컨테이너 + 스케줄러

#### 스케줄러 (scheduler.py)

**자동 실행 주기**:
```python
# 하이브리드 수집 (모든 데이터 유형)
schedule.every(1).hours.do(hybrid_collection_job)

# XQL 실시간 모니터링
schedule.every(15).minutes.do(xql_monitoring_job)

# MITRE ATT&CK 분석
schedule.every(2).hours.do(mitre_analysis_job)

# 엔드포인트 상태 추적
schedule.every(30).minutes.do(endpoint_collection_job)

# 헬스체크
schedule.every(5).minutes.do(health_check_job)

# 인덱스 모니터링 (Markdown + JSON 보고서)
schedule.every().day.at("02:00").do(monitoring_job)
```

**로그 위치**: `/opt/docs/apps/opensearch/cortex-xdr-crawler/logs/scheduler.log`

#### 주요 수집기 상세

##### 1. Enhanced Unified Collector
**파일**: `collectors/enhanced_unified_collector.py`

**기능**:
- 모든 XDR 데이터 유형을 단일 스크립트로 수집
- 병렬 처리로 성능 최적화
- 자동 재시도 (exponential backoff)
- MITRE ATT&CK 전술 자동 매핑

**실행**:
```bash
cd /opt/docs/apps/opensearch/cortex-xdr-crawler
python collectors/enhanced_unified_collector.py
```

**처리 흐름**:
```
1. 환경 변수 로드 (API 키, OpenSearch 연결 정보)
2. 체크포인트 파일 읽기 (checkpoint/enhanced_unified_checkpoint.json)
3. Cortex XDR API 호출 (last_timestamp 이후 데이터)
4. 데이터 변환 및 정규화
5. MITRE 전술 매핑 (알림 → MITRE ATT&CK 기법)
6. OpenSearch 벌크 인덱싱
7. 체크포인트 업데이트
8. 통계 로깅
```

##### 2. Enhanced Endpoint Collector
**파일**: `collectors/enhanced_endpoint_collector.py`

**특징**:
- 배치 처리로 대량 엔드포인트 효율적 수집
- OS 분포 분석
- Agent 버전 추적
- 엔드포인트 상태 모니터링

**수집 데이터**:
- 엔드포인트 ID, 호스트명
- OS 정보 (유형, 버전)
- Agent 버전
- 마지막 접속 시간
- 네트워크 인터페이스

##### 3. Incident Details Collector (백그라운드)
**파일**: `collectors/collect_incident_details_background.py`

**특징**:
- Redis 큐 기반 비동기 처리
- 인시던트당 상세 알림 수집
- 파일/네트워크 아티팩트 추출
- 타임라인 재구성

**Redis 큐**:
```
redis:6379/incident_queue
- 인시던트 ID 대기열
- 처리 상태 추적
- 우선순위 기반 처리
```

#### 체크포인트 관리

**체크포인트 형식**:
```json
{
  "last_timestamp": "2025-11-20T15:30:00Z",
  "total_collected": 1245,
  "last_incident_id": 414189,
  "build_version": "v2.0.3"
}
```

**증분 업데이트 로직**:
```python
# 1. 체크포인트 읽기
checkpoint = load_checkpoint('enhanced_unified_checkpoint.json')
last_timestamp = checkpoint['last_timestamp']

# 2. API 쿼리 (마지막 타임스탬프 이후만)
filters = [{
    "field": "modification_time",
    "operator": "gte",
    "value": last_timestamp
}]

# 3. 데이터 수집 및 저장
new_data = api.get_incidents(filters=filters)
index_to_opensearch(new_data)

# 4. 체크포인트 업데이트
checkpoint['last_timestamp'] = datetime.now().isoformat()
checkpoint['total_collected'] += len(new_data)
save_checkpoint(checkpoint)
```

#### 모니터링 API

##### FastAPI 모니터링 서비스
**파일**: `api/monitoring_fastapi.py`
**포트**: 38888
**엔드포인트**:
```
GET /health                 # 헬스체크
GET /stats                  # 수집 통계
GET /indices                # OpenSearch 인덱스 현황
GET /checkpoint/{type}      # 체크포인트 상태
POST /manual-collect        # 수동 수집 트리거
```

**접속**: `http://localhost:38888`

##### Simple API
**파일**: `api/simple_api.py`
**포트**: 38889
**엔드포인트**:
```
GET /                       # 간단한 상태 확인
GET /quick-stats            # 빠른 통계
```

**접속**: `http://localhost:38889`

#### Docker 실행 설정

**Dockerfile**:
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD ["python", "scheduler.py"]
```

**Docker Compose** (`/opt/docs/apps/opensearch/docker-compose.yml`):
```yaml
cortex-xdr-crawler:
  build: ./cortex-xdr-crawler
  container_name: cortex-xdr-crawler
  volumes:
    - ./cortex-xdr-crawler/checkpoint:/app/checkpoint
    - ./cortex-xdr-crawler/logs:/app/logs
  environment:
    - XDR_API_KEY=${XDR_API_KEY}
    - XDR_API_ID=${XDR_API_ID}
    - XDR_FQDN=${XDR_FQDN}
    - OPENSEARCH_URL=http://opensearch:9200
    - OPENSEARCH_USER=admin
    - OPENSEARCH_PASSWORD=Admin@123456
  networks:
    - siem-net
  restart: unless-stopped
  healthcheck:
    test: ["CMD", "./healthcheck.sh"]
    interval: 5m
    timeout: 30s
    retries: 3
```

---

## 💾 데이터 저장소

### OpenSearch 인덱스 구조

**접속 정보**:
- URL: `http://20.41.120.173:9200`
- 인증: `elastic:n8n123`
- SSL: 비활성화

#### 인덱스 네이밍 규칙

```
logs-cortex_xdr-{type}-{date}

예시:
- logs-cortex_xdr-incidents-2025.11.20
- logs-cortex_xdr-alerts-2025.11.20
- logs-cortex_xdr-endpoints-2025.11.20
```

#### 인덱스별 매핑 (주요 필드)

##### incidents 인덱스
```json
{
  "incident_id": "integer",
  "creation_time": "date",
  "modification_time": "date",
  "severity": "keyword",
  "status": "keyword",
  "description": "text",
  "host_count": "integer",
  "alert_count": "integer",
  "mitre_tactics": "keyword",  // 자동 매핑
  "mitre_techniques": "keyword",  // 자동 매핑
  "assigned_user_mail": "keyword",
  "starred": "boolean"
}
```

##### alerts 인덱스
```json
{
  "alert_id": "keyword",
  "detection_timestamp": "date",
  "severity": "keyword",
  "category": "keyword",
  "source": "keyword",
  "action": "keyword",
  "host_name": "keyword",
  "host_ip": "ip",
  "user_name": "keyword",
  "file_sha256": "keyword",
  "mitre_technique_id": "keyword"
}
```

##### file 인덱스
```json
{
  "action_file_sha256": "keyword",
  "action_file_path": "keyword",
  "action_file_name": "keyword",
  "action_file_size": "long",
  "action_file_md5": "keyword",
  "action_process_image_name": "keyword",
  "agent_hostname": "keyword",
  "event_timestamp": "date"
}
```

#### 검색 예시

```bash
# 최근 인시던트 조회
curl -u elastic:n8n123 "http://20.41.120.173:9200/logs-cortex_xdr-incidents-*/_search" \
  -H 'Content-Type: application/json' \
  -d '{
    "query": {
      "range": {
        "creation_time": {
          "gte": "now-7d"
        }
      }
    },
    "sort": [
      { "creation_time": "desc" }
    ],
    "size": 100
  }'

# SHA256 해시로 파일 검색
curl -u elastic:n8n123 "http://20.41.120.173:9200/logs-cortex_xdr-file-*/_search" \
  -H 'Content-Type: application/json' \
  -d '{
    "query": {
      "term": {
        "action_file_sha256": "a1b2c3d4e5f67890..."
      }
    }
  }'

# MITRE 기법별 알림 집계
curl -u elastic:n8n123 "http://20.41.120.173:9200/logs-cortex_xdr-alerts-*/_search" \
  -H 'Content-Type: application/json' \
  -d '{
    "size": 0,
    "aggs": {
      "by_technique": {
        "terms": {
          "field": "mitre_technique_id",
          "size": 20
        }
      }
    }
  }'
```

### PostgreSQL TI 데이터베이스

#### 연결 방법

```bash
# Docker 내부에서
PGPASSWORD=n8n123 psql -h postgres -U n8n -d authdb

# Docker 외부에서
PGPASSWORD=n8n123 psql -h localhost -U n8n -d authdb
```

#### 스키마: threat_intelligence

##### 주요 테이블 DDL

**ti_malware** (951,940 rows):
```sql
CREATE TABLE threat_intelligence.ti_malware (
    id SERIAL PRIMARY KEY,
    hash VARCHAR(128) UNIQUE NOT NULL,
    hash_type VARCHAR(10) CHECK (hash_type IN ('MD5', 'SHA1', 'SHA256', 'SHA512')),
    family VARCHAR(255),
    verdict VARCHAR(50),
    source VARCHAR(255),
    first_seen TIMESTAMP,
    last_seen TIMESTAMP,
    severity INTEGER CHECK (severity BETWEEN 1 AND 10),
    additional_info JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_malware_hash ON threat_intelligence.ti_malware(hash);
CREATE INDEX idx_malware_family ON threat_intelligence.ti_malware(family);
CREATE INDEX idx_malware_updated ON threat_intelligence.ti_malware(updated_at);
```

**ti_cve** (309,069 rows):
```sql
CREATE TABLE threat_intelligence.ti_cve (
    id SERIAL PRIMARY KEY,
    cve_id VARCHAR(20) UNIQUE NOT NULL,
    cvss_score DECIMAL(3,1),
    cvss_vector VARCHAR(255),
    description TEXT,
    published_date DATE,
    modified_date DATE,
    cwe_id VARCHAR(20),
    affected_products TEXT[],
    references TEXT[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_cve_id ON threat_intelligence.ti_cve(cve_id);
CREATE INDEX idx_cve_score ON threat_intelligence.ti_cve(cvss_score);
CREATE INDEX idx_cve_updated ON threat_intelligence.ti_cve(updated_at);
```

**ti_ioc** (301,408 rows):
```sql
CREATE TABLE threat_intelligence.ti_ioc (
    id SERIAL PRIMARY KEY,
    ioc_type VARCHAR(50) CHECK (ioc_type IN ('ip', 'domain', 'url', 'email')),
    ioc_value VARCHAR(255) NOT NULL,
    threat_type VARCHAR(100),
    confidence INTEGER CHECK (confidence BETWEEN 0 AND 100),
    first_seen TIMESTAMP,
    last_seen TIMESTAMP,
    source VARCHAR(255),
    tags VARCHAR(50)[],
    additional_data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ioc_value ON threat_intelligence.ti_ioc(ioc_value);
CREATE INDEX idx_ioc_type ON threat_intelligence.ti_ioc(ioc_type);
CREATE INDEX idx_ioc_updated ON threat_intelligence.ti_ioc(updated_at);
```

**ti_mitre** (1,950 rows):
```sql
CREATE TABLE threat_intelligence.ti_mitre (
    id SERIAL PRIMARY KEY,
    technique_id VARCHAR(20) UNIQUE NOT NULL,
    technique_name VARCHAR(255),
    tactic VARCHAR(100),
    description TEXT,
    platforms TEXT[],
    data_sources TEXT[],
    detection TEXT,
    mitigation_id VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_mitre_technique ON threat_intelligence.ti_mitre(technique_id);
CREATE INDEX idx_mitre_tactic ON threat_intelligence.ti_mitre(tactic);
```

**ti_apt_groups** (470 rows):
```sql
CREATE TABLE threat_intelligence.ti_apt_groups (
    id SERIAL PRIMARY KEY,
    group_name VARCHAR(255) UNIQUE NOT NULL,
    aliases TEXT[],
    country VARCHAR(100),
    description TEXT,
    first_seen DATE,
    last_seen DATE,
    targets TEXT[],
    techniques TEXT[],
    tools TEXT[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_apt_name ON threat_intelligence.ti_apt_groups(group_name);
CREATE INDEX idx_apt_country ON threat_intelligence.ti_apt_groups(country);
```

#### 쿼리 예시

```sql
-- 최근 업데이트된 멀웨어 해시 조회
SELECT hash, family, verdict, updated_at
FROM threat_intelligence.ti_malware
WHERE updated_at > NOW() - INTERVAL '1 day'
ORDER BY updated_at DESC
LIMIT 100;

-- CVSS 점수가 높은 CVE 조회
SELECT cve_id, cvss_score, description
FROM threat_intelligence.ti_cve
WHERE cvss_score >= 9.0
ORDER BY cvss_score DESC;

-- 특정 IP 주소의 IOC 조회
SELECT * FROM threat_intelligence.ti_ioc
WHERE ioc_type = 'ip'
AND ioc_value = '192.168.1.1';

-- APT 그룹이 사용하는 MITRE 기법 조회
SELECT
  ag.group_name,
  ag.country,
  unnest(ag.techniques) as technique_id,
  m.technique_name,
  m.tactic
FROM threat_intelligence.ti_apt_groups ag
LEFT JOIN threat_intelligence.ti_mitre m
  ON m.technique_id = ANY(ag.techniques)
WHERE ag.group_name = 'APT28';

-- TI 데이터 통계
SELECT
  'ti_malware' as table_name,
  COUNT(*) as row_count,
  pg_size_pretty(pg_total_relation_size('threat_intelligence.ti_malware')) as size
FROM threat_intelligence.ti_malware
UNION ALL
SELECT 'ti_cve', COUNT(*), pg_size_pretty(pg_total_relation_size('threat_intelligence.ti_cve'))
FROM threat_intelligence.ti_cve
UNION ALL
SELECT 'ti_ioc', COUNT(*), pg_size_pretty(pg_total_relation_size('threat_intelligence.ti_ioc'))
FROM threat_intelligence.ti_ioc;
```

---

## 🚀 TI 캐시 시스템

### 시스템 개요

**위치**: `/opt/docs/apps/opensearch/script2/`
**프로젝트명**: TI-Cache v2.0 (Incremental Updates)
**언어**: Node.js 18+
**캐시 엔진**: Redis 7.2+ with RedisBloom

### Redis TI Cache 인스턴스

**Docker 컨테이너**: `redis-ti-cache`
**내부 포트**: 6379
**외부 포트**: 6380
**메모리**: 3GB 전용
**비밀번호**: `redis123` (`.env.redis` 설정)

**Docker Compose** (`script2/docker-compose-ti-cache-redis.yml`):
```yaml
version: '3.8'
services:
  redis-ti-cache:
    image: redis/redis-stack-server:7.2.0-v11
    container_name: redis-ti-cache
    ports:
      - "6380:6379"
    volumes:
      - ./data/redis-ti:/data
    environment:
      - REDIS_ARGS=--maxmemory 3gb --maxmemory-policy allkeys-lru --requirepass redis123
    restart: unless-stopped
    networks:
      - ti-cache-net
```

**시작 명령어**:
```bash
cd /opt/docs/apps/opensearch/script2
docker-compose -f docker-compose-ti-cache-redis.yml up -d
```

### 캐시 아키텍처

#### Bloom Filter 설계

**용도**: 빠른 존재 여부 확인 (< 0.1ms)

| Bloom Filter | Capacity | Error Rate | 메모리 | 해시 함수 |
|-------------|----------|------------|--------|-----------|
| `ti:bloom:hashes` | 500,000 | 0.00001 (0.001%) | ~7.2MB | 17개 |
| `ti:bloom:ips` | 100,000 | 0.00001 | ~1.4MB | 17개 |
| `ti:bloom:domains` | 200,000 | 0.00001 | ~2.9MB | 17개 |
| `ti:bloom:cves` | 50,000 | 0.00001 | ~720KB | 17개 |
| `ti:bloom:mitre` | 5,000 | 0.00001 | ~72KB | 17개 |
| `ti:bloom:apt_groups` | 1,000 | 0.00001 | ~14KB | 17개 |

**총 Bloom Filter 메모리**: ~12.3MB

**생성 명령어** (Redis):
```redis
BF.RESERVE ti:bloom:hashes 0.00001 500000
BF.RESERVE ti:bloom:ips 0.00001 100000
BF.RESERVE ti:bloom:domains 0.00001 200000
BF.RESERVE ti:bloom:cves 0.00001 50000
BF.RESERVE ti:bloom:mitre 0.00001 5000
BF.RESERVE ti:bloom:apt_groups 0.00001 1000
```

**데이터 추가**:
```redis
BF.ADD ti:bloom:hashes "a1b2c3d4e5f67890..."
BF.ADD ti:bloom:ips "192.168.1.1"
BF.ADD ti:bloom:domains "malicious.com"
```

**조회**:
```redis
BF.EXISTS ti:bloom:hashes "a1b2c3d4e5f67890..."
# 반환: 1 (존재) 또는 0 (존재하지 않음)
```

#### Reverse Index 설계

**용도**: 실제 TI 레코드 조회 (< 1ms)

**샤딩 전략**:

1. **해시 샤딩** (16진수 첫 4자리):
```
해시: a1b2c3d4... → 샤드: ti:reverse:hashes:a1b2
해시: ff00ee11... → 샤드: ti:reverse:hashes:ff00
```

2. **IP 샤딩** (첫 번째 옥텟):
```
IP: 192.168.1.1 → 샤드: ti:reverse:ips:192
IP: 10.0.0.1 → 샤드: ti:reverse:ips:10
```

3. **도메인 샤딩** (TLD):
```
도메인: malicious.com → 샤드: ti:reverse:domains:com
도메인: evil.org → 샤드: ti:reverse:domains:org
```

**데이터 구조** (Redis Hash):
```redis
HSET ti:reverse:hashes:a1b2 "a1b2c3d4..." '{"hash":"a1b2...","family":"Zeus","verdict":"malicious","severity":9}'
HSET ti:reverse:ips:192 "192.168.1.1" '{"ip":"192.168.1.1","type":"botnet","threat":"high","source":"AbuseIPDB"}'
```

**조회**:
```redis
HGET ti:reverse:hashes:a1b2 "a1b2c3d4..."
# 반환: JSON 문자열
```

#### 메타데이터

**키**: `ti:metadata`

**구조**:
```json
{
  "build_id": "build_20251121_033000",
  "build_date": "2025-11-21T03:30:00Z",
  "last_update": "2025-11-21T15:00:00Z",
  "update_mode": "incremental",
  "total_keys": 855623,
  "bloom_filters": {
    "hashes": 451234,
    "ips": 89012,
    "domains": 156789,
    "cves": 42567,
    "mitre": 1950,
    "apt_groups": 470
  },
  "reverse_index": {
    "hashes": 451234,
    "ips": 89012,
    "domains": 156789,
    "cves": 42567,
    "mitre": 1950
  },
  "data_sources": {
    "postgresql": {
      "ti_malware": 951940,
      "ti_cve": 309069,
      "ti_ioc": 301408,
      "ti_mitre": 1950,
      "ti_apt_groups": 470
    },
    "opensearch": {
      "cortex_xdr_incidents": 12456,
      "cortex_xdr_alerts": 45789
    }
  },
  "update_efficiency": "85%",
  "update_duration_seconds": 120,
  "cache_hit_rate": 0.952
}
```

### 증분 업데이트 시스템

#### 체크포인트 시스템

**위치**: `script2/checkpoint/`

**파일**: `ti-cache-checkpoint.json`
```json
{
  "build_id": "build_20251121_033000",
  "last_update": "2025-11-21T15:00:00Z",
  "data_source_checkpoints": {
    "postgresql_ti_malware": "2025-11-21T14:55:00Z",
    "postgresql_ti_cve": "2025-11-21T14:50:00Z",
    "postgresql_ti_ioc": "2025-11-21T14:52:00Z",
    "opensearch_incidents": "2025-11-21T14:58:00Z"
  },
  "total_records_cached": 855623,
  "update_history": [
    {
      "update_id": "update_20251121_150000",
      "timestamp": "2025-11-21T15:00:00Z",
      "new_records": 1245,
      "updated_records": 89,
      "deleted_records": 3,
      "duration_seconds": 120,
      "efficiency": "85%"
    }
  ]
}
```

#### 증분 업데이트 엔진

**파일**: `src/builders/IncrementalUpdateEngine.js`

**핵심 로직**:
```javascript
class IncrementalUpdateEngine {
  async updateCache() {
    // 1. 체크포인트 로드
    const checkpoint = await this.checkpointManager.load();
    const lastUpdate = checkpoint.last_update;

    // 2. PostgreSQL에서 변경된 데이터만 조회
    const changedData = await this.fetchChangedData(lastUpdate);

    // 3. Bloom Filter 업데이트
    for (const record of changedData) {
      await redis.bf.add(`ti:bloom:${record.type}`, record.value);
    }

    // 4. Reverse Index 업데이트
    for (const record of changedData) {
      const shard = this.getShardKey(record.type, record.value);
      await redis.hset(shard, record.value, JSON.stringify(record));
    }

    // 5. 체크포인트 업데이트
    checkpoint.last_update = new Date().toISOString();
    checkpoint.total_records_cached += changedData.length;
    await this.checkpointManager.save(checkpoint);

    return {
      newRecords: changedData.length,
      totalRecords: checkpoint.total_records_cached,
      efficiency: this.calculateEfficiency()
    };
  }

  async fetchChangedData(lastUpdate) {
    // PostgreSQL 쿼리 (updated_at > lastUpdate)
    const query = `
      SELECT * FROM threat_intelligence.ti_malware
      WHERE updated_at > $1
      UNION ALL
      SELECT * FROM threat_intelligence.ti_cve
      WHERE updated_at > $1
      UNION ALL
      SELECT * FROM threat_intelligence.ti_ioc
      WHERE updated_at > $1
    `;

    return await this.pgClient.query(query, [lastUpdate]);
  }

  calculateEfficiency() {
    // 증분 업데이트 시간 vs 전체 재구축 시간
    const incrementalTime = 120; // 2분
    const fullRebuildTime = 900; // 15분
    const efficiency = (1 - incrementalTime / fullRebuildTime) * 100;
    return `${efficiency.toFixed(0)}%`; // "87%"
  }
}
```

### CLI 도구 (ti-cache-cli.js)

**위치**: `script2/ti-cache-cli.js`
**권한**: 실행 가능 (`chmod +x ti-cache-cli.js`)

#### 사용법

```bash
# 초기 캐시 구축 (10-15분 소요, 최초 1회만)
./ti-cache-cli.js build

# 증분 업데이트 (< 2분 소요, 일일 실행)
./ti-cache-cli.js update

# 시스템 상태 확인
./ti-cache-cli.js status

# 캐시 조회
./ti-cache-cli.js lookup a1b2c3d4e5f67890... --type hash
./ti-cache-cli.js lookup 192.168.1.1 --type ip
./ti-cache-cli.js lookup malicious.com --type domain
./ti-cache-cli.js lookup CVE-2024-12345 --type cve

# 체크포인트 관리
./ti-cache-cli.js checkpoint --status
./ti-cache-cli.js checkpoint --list
./ti-cache-cli.js checkpoint --restore <checkpoint_id>

# 헬스체크
./ti-cache-cli.js health
```

#### 출력 예시

**상태 확인**:
```
$ ./ti-cache-cli.js status

═══ TI Cache 시스템 상태 v2.0 ═══

📊 전체 상태: ✅ 정상

🔴 Redis TI Cache:
  상태: ✅ 연결됨
  호스트: localhost:6380
  메모리 사용: 2.1GB / 3.0GB (70%)
  총 키: 855,623개
  가동 시간: 7일 14시간

📁 데이터 소스:
  PostgreSQL: ✅ 연결됨 (1,563,837 레코드)
  OpenSearch: ✅ 연결됨 (58,245 인덱스 문서)

🔍 Bloom Filters:
  ti:bloom:hashes: ✅ 로드됨 (451,234개, 오탐율 < 0.001%)
  ti:bloom:ips: ✅ 로드됨 (89,012개)
  ti:bloom:domains: ✅ 로드됨 (156,789개)
  ti:bloom:cves: ✅ 로드됨 (42,567개)
  ti:bloom:mitre: ✅ 로드됨 (1,950개)
  ti:bloom:apt_groups: ✅ 로드됨 (470개)

📦 Reverse Index:
  샤드 수: 256개 (해시 기반)
  총 키: 742,022개

🔄 마지막 업데이트:
  유형: 증분 업데이트
  시간: 2025-11-21 15:00:00 (2시간 전)
  새 레코드: 1,245개
  업데이트 레코드: 89개
  소요 시간: 120초 (2분)
  효율성: 85% (vs 전체 재구축 15분)

📈 캐시 성능:
  히트율: 95.2%
  평균 응답시간: 0.8ms
  총 쿼리: 45,678회
  초당 쿼리: 12.5 QPS

✅ 시스템 정상 작동 중
```

**조회 예시**:
```
$ ./ti-cache-cli.js lookup 6061f622505a8a786c6068d19e77a67623ddbe9a85192a24ba92c6baae2196d2 --type hash

🔍 TI 캐시 조회 결과

검색 대상: 6061f622505a8a786c6068d19e77a67623ddbe9a85192a24ba92c6baae2196d2
검색 유형: hash

Step 1: Bloom Filter 체크... ✅ 존재 (< 0.1ms)
Step 2: Reverse Index 조회... ✅ 발견 (0.7ms)

매칭 레코드: 1개

┌─────────────────────────────────────────────────────────────────┐
│ TI 레코드 정보                                                   │
├─────────────────────────────────────────────────────────────────┤
│ 해시: 6061f622505a8a786c6068d19e77a67623ddbe9a85192a24ba92c6baae2196d2
│ 유형: SHA256
│ 멀웨어 패밀리: Zeus
│ 평가: malicious
│ 심각도: 9/10
│ 소스: VirusTotal
│ 최초 발견: 2024-08-15
│ 최근 발견: 2025-11-20
│ 추가 정보:
│   - 변종: Zeus.v2.3
│   - 행위: 뱅킹 트로이잔
│   - C2 서버: 192.168.1.100:8080
│   - 관련 IOC: 15개
└─────────────────────────────────────────────────────────────────┘

총 조회 시간: 0.8ms
```

### 소스 코드 구조

```
script2/
├── ti-cache-cli.js                     # CLI 메인 도구
├── package.json                        # 의존성 (Redis, pg)
├── .env.redis                          # 환경 설정
├── docker-compose-ti-cache-redis.yml   # Redis 인스턴스
├── src/
│   ├── builders/                       # 캐시 빌더
│   │   ├── IncrementalUpdateEngine.js  # 증분 업데이트 엔진
│   │   ├── BloomFilterBuilder.js       # Bloom Filter 생성
│   │   └── ReverseIndexBuilder.js      # Reverse Index 생성
│   ├── checkpoint/                     # 체크포인트 관리
│   │   ├── CheckpointManager.js        # 체크포인트 CRUD
│   │   └── checkpoint-utils.js         # 유틸리티
│   ├── adapters/                       # 데이터 어댑터
│   │   ├── PostgreSQLAdapter.js        # PostgreSQL 연결
│   │   ├── OpenSearchAdapter.js        # OpenSearch 연결
│   │   └── RedisAdapter.js             # Redis 연결
│   ├── incident/                       # 인시던트 분석
│   │   ├── IncidentAnalysisManager.js
│   │   ├── IncidentDataConverter.js
│   │   └── IncidentCorrelationAnalyzer.js
│   └── utils/                          # 공통 유틸리티
│       ├── logger.js
│       └── validators.js
├── checkpoint/                         # 체크포인트 저장소
│   ├── ti-cache-checkpoint.json
│   └── backups/
├── data/                               # 데이터 파일
│   └── redis-ti/                       # Redis RDB/AOF
├── logs/                               # 로그 파일
│   ├── ti-cache.log
│   └── incremental-update.log
└── docs/                               # 상세 문서
    ├── TI-CACHE-REDIS-ARCHITECTURE.md
    ├── TI-CACHE-TECHNICAL-DESIGN.md
    ├── TI-CACHE-IMPLEMENTATION-GUIDE.md
    ├── TI-CACHE-API-SPECIFICATION.md
    └── TI-CACHE-OPERATIONS-MANUAL.md
```

---

## 🔄 데이터 플로우

### 전체 데이터 플로우 (시간순)

```
[단계 1] 데이터 수집 (매 시간 자동)
──────────────────────────────────────────
Cortex XDR API
  │
  ├─> scheduler.py (크롤러 스케줄러)
  │     │
  │     ├─> enhanced_unified_collector.py
  │     │     │
  │     │     ├─> Checkpoint 확인
  │     │     │   (checkpoint/enhanced_unified_checkpoint.json)
  │     │     │
  │     │     ├─> API 호출 (last_timestamp 이후만)
  │     │     │   filters: modification_time >= last_timestamp
  │     │     │
  │     │     ├─> 데이터 변환 & MITRE 매핑
  │     │     │
  │     │     ├─> OpenSearch 벌크 인덱싱
  │     │     │   logs-cortex_xdr-{type}-{date}
  │     │     │
  │     │     └─> Checkpoint 업데이트
  │     │         last_timestamp = now()
  │     │
  │     └─> 로그 기록
  │         /app/logs/scheduler.log

──────────────────────────────────────────
[단계 2] PostgreSQL TI 데이터 준비 (수동/스크립트)
──────────────────────────────────────────
External TI Sources
(VirusTotal, AbuseIPDB, MISP 등)
  │
  ├─> 데이터 수집 스크립트 (개발 중)
  │     │
  │     ├─> 데이터 정규화
  │     │
  │     └─> PostgreSQL 저장
  │         INSERT INTO threat_intelligence.ti_*
  │         ON CONFLICT UPDATE updated_at

──────────────────────────────────────────
[단계 3] TI 캐시 구축 (일 1회 자동 or 수동)
──────────────────────────────────────────
PostgreSQL TI DB + OpenSearch
  │
  ├─> ti-cache-cli.js update
  │     │
  │     ├─> CheckpointManager.load()
  │     │   checkpoint/ti-cache-checkpoint.json
  │     │
  │     ├─> IncrementalUpdateEngine.fetchChangedData()
  │     │   │
  │     │   ├─> PostgreSQL 쿼리
  │     │   │   SELECT * FROM ti_* WHERE updated_at > $lastUpdate
  │     │   │
  │     │   └─> OpenSearch 쿼리
  │     │       POST logs-cortex_xdr-*/_search
  │     │       (최근 인시던트/알림)
  │     │
  │     ├─> BloomFilterBuilder.addToFilter()
  │     │   │
  │     │   └─> Redis BF.ADD ti:bloom:{type} {value}
  │     │
  │     ├─> ReverseIndexBuilder.updateIndex()
  │     │   │
  │     │   ├─> 샤드 키 계산
  │     │   │   getShardKey(type, value)
  │     │   │
  │     │   └─> Redis HSET ti:reverse:{type}:{shard} {key} {json}
  │     │
  │     ├─> Redis SET ti:metadata {json}
  │     │   (빌드 정보, 통계)
  │     │
  │     └─> CheckpointManager.save()
  │         update last_update, total_records
  │
  └─> 로그 기록
      logs/incremental-update.log

──────────────────────────────────────────
[단계 4] 실시간 조회 (< 1ms)
──────────────────────────────────────────
애플리케이션 요청
(InBridge, My-App, 분석 도구)
  │
  ├─> TICacheService.lookup(value, type)
  │     │
  │     ├─> Step 1: Bloom Filter 체크
  │     │   Redis BF.EXISTS ti:bloom:{type} {value}
  │     │   │
  │     │   ├─> 0 (존재하지 않음)
  │     │   │   └─> 즉시 반환: null (< 0.1ms)
  │     │   │
  │     │   └─> 1 (존재 가능)
  │     │       └─> Step 2로 진행
  │     │
  │     ├─> Step 2: Reverse Index 조회
  │     │   │
  │     │   ├─> 샤드 키 계산
  │     │   │   shard = getShardKey(type, value)
  │     │   │
  │     │   └─> Redis HGET ti:reverse:{type}:{shard} {value}
  │     │       └─> JSON 레코드 반환 (< 1ms)
  │     │
  │     └─> Step 3: 결과 반환
  │         { hash, family, verdict, severity... }
  │
  └─> 애플리케이션 처리
      - 위협 스코어링
      - 알림 생성
      - 대시보드 표시
```

### 증분 업데이트 상세 플로우

```
[매일 02:00 자동 실행 or 수동]

1. 체크포인트 로드
   ┌─────────────────────────────────────┐
   │ checkpoint/ti-cache-checkpoint.json │
   │ {                                   │
   │   "last_update": "2025-11-20T02:00" │
   │ }                                   │
   └─────────────────────────────────────┘
           │
           ▼
2. PostgreSQL 변경사항 조회
   ┌─────────────────────────────────────┐
   │ SELECT * FROM ti_malware            │
   │ WHERE updated_at > '2025-11-20'     │
   │                                     │
   │ 결과: 1,245개 새 레코드             │
   │       89개 업데이트된 레코드        │
   │       3개 삭제된 레코드             │
   └─────────────────────────────────────┘
           │
           ▼
3. OpenSearch 최근 이벤트 조회 (선택적)
   ┌─────────────────────────────────────┐
   │ POST logs-cortex_xdr-*/_search      │
   │ {                                   │
   │   "query": {                        │
   │     "range": {                      │
   │       "timestamp": {                │
   │         "gte": "2025-11-20T02:00"   │
   │       }                             │
   │     }                               │
   │   }                                 │
   │ }                                   │
   └─────────────────────────────────────┘
           │
           ▼
4. Bloom Filter 업데이트
   ┌─────────────────────────────────────┐
   │ for (const record of newRecords) {  │
   │   BF.ADD ti:bloom:hashes record.hash│
   │ }                                   │
   │                                     │
   │ 1,245개 추가 완료 (30초)            │
   └─────────────────────────────────────┘
           │
           ▼
5. Reverse Index 업데이트
   ┌─────────────────────────────────────┐
   │ for (const record of newRecords) {  │
   │   shard = getShardKey(record.hash)  │
   │   HSET ti:reverse:hashes:shard      │
   │        record.hash                  │
   │        JSON.stringify(record)       │
   │ }                                   │
   │                                     │
   │ 1,245개 업데이트 완료 (45초)        │
   └─────────────────────────────────────┘
           │
           ▼
6. 삭제된 레코드 처리
   ┌─────────────────────────────────────┐
   │ for (const hash of deletedHashes) { │
   │   shard = getShardKey(hash)         │
   │   HDEL ti:reverse:hashes:shard hash │
   │ }                                   │
   │                                     │
   │ 3개 삭제 완료 (5초)                 │
   └─────────────────────────────────────┘
           │
           ▼
7. 메타데이터 업데이트
   ┌─────────────────────────────────────┐
   │ SET ti:metadata {                   │
   │   "last_update": "2025-11-21T02:00",│
   │   "new_records": 1245,              │
   │   "updated_records": 89,            │
   │   "deleted_records": 3,             │
   │   "duration_seconds": 120,          │
   │   "efficiency": "85%"               │
   │ }                                   │
   └─────────────────────────────────────┘
           │
           ▼
8. 체크포인트 저장
   ┌─────────────────────────────────────┐
   │ checkpoint/ti-cache-checkpoint.json │
   │ {                                   │
   │   "last_update": "2025-11-21T02:00",│
   │   "total_records": 856868,          │
   │   "update_history": [...]           │
   │ }                                   │
   └─────────────────────────────────────┘
           │
           ▼
9. 완료 로그
   ✅ 증분 업데이트 완료
   • 새 레코드: 1,245개
   • 업데이트: 89개
   • 삭제: 3개
   • 소요 시간: 120초 (2분)
   • 효율성: 85% (vs 전체 재구축 15분)
```

### 조회 플로우 (3단계)

```
애플리케이션 요청:
"해시 a1b2c3d4... 위협 정보 조회"

┌──────────────────────────────────────┐
│ Step 1: Bloom Filter 빠른 체크       │
│ (< 0.1ms)                            │
├──────────────────────────────────────┤
│ Redis 명령:                          │
│ > BF.EXISTS ti:bloom:hashes \        │
│   "a1b2c3d4..."                      │
│                                      │
│ 응답: 1 (존재 가능)                  │
│                                      │
│ ※ 만약 0이면 즉시 "데이터 없음" 반환│
└──────────┬───────────────────────────┘
           │
           ▼
┌──────────────────────────────────────┐
│ Step 2: Reverse Index 조회           │
│ (< 1ms)                              │
├──────────────────────────────────────┤
│ 1. 샤드 키 계산:                     │
│    prefix = "a1b2"                   │
│    shard = "ti:reverse:hashes:a1b2"  │
│                                      │
│ 2. Redis 명령:                       │
│    > HGET ti:reverse:hashes:a1b2 \   │
│      "a1b2c3d4..."                   │
│                                      │
│ 3. 응답 (JSON):                      │
│    {                                 │
│      "hash": "a1b2c3d4...",          │
│      "family": "Zeus",               │
│      "verdict": "malicious",         │
│      "severity": 9,                  │
│      "source": "VirusTotal",         │
│      "first_seen": "2024-08-15",     │
│      "last_seen": "2025-11-20"       │
│    }                                 │
└──────────┬───────────────────────────┘
           │
           ▼
┌──────────────────────────────────────┐
│ Step 3: 결과 반환 및 처리            │
├──────────────────────────────────────┤
│ 애플리케이션 레이어:                 │
│                                      │
│ 1. TI 레코드 파싱                    │
│ 2. 위협 스코어 계산                  │
│ 3. 관련 인시던트 조회 (OpenSearch)   │
│ 4. 상관분석 수행                     │
│ 5. 대시보드/알림 생성                │
│                                      │
│ 총 응답 시간: < 1ms (캐시 조회)      │
│              + 10-50ms (추가 분석)   │
└──────────────────────────────────────┘

최종 반환:
{
  "threat_info": { TI 레코드 },
  "risk_score": 85,
  "related_incidents": [...],
  "recommended_action": "Block",
  "response_time_ms": 0.8
}
```

---

## 📂 스크립트 및 도구

### Cortex XDR Crawler 스크립트

**위치**: `/opt/docs/apps/opensearch/cortex-xdr-crawler/`

| 파일 | 용도 | 실행 방법 |
|------|------|----------|
| `scheduler.py` | 주 스케줄러 (자동 실행) | `python scheduler.py` |
| `collectors/enhanced_unified_collector.py` | 통합 수집기 | `python collectors/enhanced_unified_collector.py` |
| `collectors/enhanced_endpoint_collector.py` | 엔드포인트 전용 | `python collectors/enhanced_endpoint_collector.py` |
| `collectors/enhanced_alerts_collector.py` | 알림 전용 | `python collectors/enhanced_alerts_collector.py` |
| `collectors/collect_incident_details_background.py` | 인시던트 상세 (백그라운드) | `python collectors/collect_incident_details_background.py` |
| `collectors/hybrid_data_collector.py` | 하이브리드 수집 | `python collectors/hybrid_data_collector.py` |
| `monitoring/index_monitor.py` | OpenSearch 인덱스 모니터링 | `python monitoring/index_monitor.py` |
| `monitoring/json_monitor.py` | 데이터 품질 검사 | `python monitoring/json_monitor.py` |
| `api/monitoring_fastapi.py` | FastAPI 모니터링 (38888) | `python api/monitoring_fastapi.py` |
| `api/simple_api.py` | 간단한 API (38889) | `python api/simple_api.py` |
| `test_xql_working.py` | XQL 쿼리 테스트 | `python test_xql_working.py` |
| `test_api.py` | API 연결 테스트 | `python test_api.py` |
| `healthcheck.sh` | 헬스체크 스크립트 | `./healthcheck.sh` |
| `endpoint_cron.sh` | 엔드포인트 크론 작업 | `./endpoint_cron.sh` |

### TI Cache 스크립트

**위치**: `/opt/docs/apps/opensearch/script2/`

| 파일 | 용도 | 실행 방법 |
|------|------|----------|
| `ti-cache-cli.js` | 메인 CLI 도구 | `./ti-cache-cli.js <command>` |
| `src/builders/IncrementalUpdateEngine.js` | 증분 업데이트 엔진 | (내부 모듈) |
| `src/checkpoint/CheckpointManager.js` | 체크포인트 관리 | (내부 모듈) |
| `src/adapters/PostgreSQLAdapter.js` | PostgreSQL 연결 | (내부 모듈) |
| `src/adapters/RedisAdapter.js` | Redis 연결 | (내부 모듈) |
| `src/adapters/OpenSearchAdapter.js` | OpenSearch 연결 | (내부 모듈) |
| `incident_info.js` | 인시던트 분석 도구 | `node incident_info.js <incident_id>` |
| `artifact-extractor.js` | 아티팩트 추출기 | `node artifact-extractor.js` |
| `correlation-matcher.js` | 상관관계 매칭 | `node correlation-matcher.js` |
| `ti-data-indexer.js` | TI 데이터 인덱서 | `node ti-data-indexer.js` |
| `batch-processor.js` | 배치 처리기 | `node batch-processor.js` |
| `realtime-processor.js` | 실시간 처리기 | `node realtime-processor.js` |

### PostgreSQL 유틸리티

**위치**: 명령줄에서 직접 실행

```bash
# PostgreSQL 연결
PGPASSWORD=n8n123 psql -h postgres -U n8n -d authdb

# TI 테이블 목록
PGPASSWORD=n8n123 psql -h postgres -U n8n -d authdb -c "\dt threat_intelligence.*"

# 테이블 통계
PGPASSWORD=n8n123 psql -h postgres -U n8n -d authdb -c "
SELECT
  tablename,
  pg_size_pretty(pg_total_relation_size('threat_intelligence.' || tablename)) as size
FROM pg_tables
WHERE schemaname = 'threat_intelligence'
ORDER BY pg_total_relation_size('threat_intelligence.' || tablename) DESC;
"

# 레코드 수 확인
PGPASSWORD=n8n123 psql -h postgres -U n8n -d authdb -c "
SELECT 'ti_malware', COUNT(*) FROM threat_intelligence.ti_malware
UNION ALL
SELECT 'ti_cve', COUNT(*) FROM threat_intelligence.ti_cve
UNION ALL
SELECT 'ti_ioc', COUNT(*) FROM threat_intelligence.ti_ioc;
"
```

### OpenSearch 유틸리티

```bash
# 클러스터 상태
curl -u elastic:n8n123 "http://20.41.120.173:9200/_cluster/health?pretty"

# 인덱스 목록
curl -u elastic:n8n123 "http://20.41.120.173:9200/_cat/indices/logs-cortex_xdr-*?v"

# 인덱스 통계
curl -u elastic:n8n123 "http://20.41.120.173:9200/_cat/indices/logs-cortex_xdr-*?h=index,docs.count,store.size"

# 최근 인시던트 조회
curl -u elastic:n8n123 "http://20.41.120.173:9200/logs-cortex_xdr-incidents-*/_search?size=10&sort=creation_time:desc"

# 특정 해시 검색
curl -u elastic:n8n123 "http://20.41.120.173:9200/logs-cortex_xdr-file-*/_search" \
  -H 'Content-Type: application/json' \
  -d '{"query":{"term":{"action_file_sha256":"a1b2c3d4..."}}}'
```

### Redis 유틸리티

```bash
# Redis TI Cache 연결
docker exec -it redis-ti-cache redis-cli -p 6379

# 키 확인
docker exec redis-ti-cache redis-cli -p 6379 DBSIZE
docker exec redis-ti-cache redis-cli -p 6379 --scan --pattern "ti:*"

# Bloom Filter 조회
docker exec redis-ti-cache redis-cli -p 6379 BF.EXISTS ti:bloom:hashes "a1b2c3d4..."

# Reverse Index 조회
docker exec redis-ti-cache redis-cli -p 6379 HGET ti:reverse:hashes:a1b2 "a1b2c3d4..."

# 메타데이터 조회
docker exec redis-ti-cache redis-cli -p 6379 GET ti:metadata

# 메모리 사용량
docker exec redis-ti-cache redis-cli -p 6379 INFO memory
```

---

## 🎮 운영 가이드

### 일일 운영 작업

#### 1. 시스템 상태 확인 (아침 09:00)
```bash
# TI 캐시 상태
cd /opt/docs/apps/opensearch/script2
./ti-cache-cli.js status

# Cortex XDR 크롤러 상태
docker logs cortex-xdr-crawler --tail 100

# OpenSearch 클러스터 상태
curl -u elastic:n8n123 "http://20.41.120.173:9200/_cluster/health?pretty"

# PostgreSQL TI DB 상태
PGPASSWORD=n8n123 psql -h postgres -U n8n -d authdb -c "SELECT COUNT(*) FROM threat_intelligence.ti_malware;"
```

#### 2. 증분 업데이트 실행 (매일 02:00 자동 or 수동)
```bash
cd /opt/docs/apps/opensearch/script2

# 증분 업데이트 실행
./ti-cache-cli.js update

# 로그 확인
tail -f logs/incremental-update.log
```

#### 3. 데이터 수집 확인 (매일 10:00)
```bash
# 최근 수집된 인시던트 확인
curl -u elastic:n8n123 "http://20.41.120.173:9200/logs-cortex_xdr-incidents-*/_count?q=creation_time:[now-24h TO now]"

# 최근 수집된 알림 확인
curl -u elastic:n8n123 "http://20.41.120.173:9200/logs-cortex_xdr-alerts-*/_count?q=detection_timestamp:[now-24h TO now]"

# 체크포인트 확인
cat /opt/docs/apps/opensearch/cortex-xdr-crawler/checkpoint/enhanced_unified_checkpoint.json
```

### 주간 운영 작업

#### 1. 성능 분석 (매주 월요일)
```bash
# TI 캐시 성능 메트릭
cd /opt/docs/apps/opensearch/script2
./ti-cache-cli.js status | grep -A 5 "캐시 성능"

# Redis 메모리 사용량
docker exec redis-ti-cache redis-cli -p 6379 INFO memory | grep used_memory_human

# OpenSearch 인덱스 크기 확인
curl -u elastic:n8n123 "http://20.41.120.173:9200/_cat/indices/logs-cortex_xdr-*?h=index,store.size&s=store.size:desc"
```

#### 2. 체크포인트 백업 (매주 일요일)
```bash
# TI 캐시 체크포인트 백업
cd /opt/docs/apps/opensearch/script2
cp checkpoint/ti-cache-checkpoint.json checkpoint/backups/ti-cache-checkpoint-$(date +%Y%m%d).json

# Cortex XDR 체크포인트 백업
cd /opt/docs/apps/opensearch/cortex-xdr-crawler
cp checkpoint/*.json checkpoint/backups/
```

### 월간 운영 작업

#### 1. 전체 캐시 재구축 (매월 1일)
```bash
cd /opt/docs/apps/opensearch/script2

# 기존 캐시 백업
./ti-cache-cli.js checkpoint --backup

# 전체 재구축
./ti-cache-cli.js build --force

# 검증
./ti-cache-cli.js health
```

#### 2. PostgreSQL 통계 업데이트
```bash
PGPASSWORD=n8n123 psql -h postgres -U n8n -d authdb -c "
VACUUM ANALYZE threat_intelligence.ti_malware;
VACUUM ANALYZE threat_intelligence.ti_cve;
VACUUM ANALYZE threat_intelligence.ti_ioc;
"
```

#### 3. 로그 정리
```bash
# 30일 이상 된 로그 삭제
find /opt/docs/apps/opensearch/cortex-xdr-crawler/logs -name "*.log" -mtime +30 -delete
find /opt/docs/apps/opensearch/script2/logs -name "*.log" -mtime +30 -delete
```

### 긴급 상황 대응

#### 캐시 데이터 손상 시
```bash
cd /opt/docs/apps/opensearch/script2

# 1. Redis 캐시 플러시
docker exec redis-ti-cache redis-cli -p 6379 FLUSHDB

# 2. 최근 체크포인트에서 복원
./ti-cache-cli.js checkpoint --restore <checkpoint_id>

# 3. 또는 전체 재구축
./ti-cache-cli.js build --force
```

#### Cortex XDR 크롤러 중단 시
```bash
# 1. 컨테이너 재시작
docker restart cortex-xdr-crawler

# 2. 로그 확인
docker logs cortex-xdr-crawler --tail 200

# 3. 체크포인트 리셋 (필요시)
cd /opt/docs/apps/opensearch/cortex-xdr-crawler
echo '{"last_timestamp":"2025-11-20T00:00:00Z"}' > checkpoint/enhanced_unified_checkpoint.json

# 4. 수동 수집 실행
docker exec cortex-xdr-crawler python collectors/enhanced_unified_collector.py
```

#### OpenSearch 연결 실패 시
```bash
# 1. OpenSearch 상태 확인
curl -u elastic:n8n123 "http://20.41.120.173:9200/_cluster/health"

# 2. OpenSearch 재시작 (필요시)
docker restart opensearch

# 3. 인덱스 복구 (필요시)
curl -X POST -u elastic:n8n123 "http://20.41.120.173:9200/_forcemerge?max_num_segments=1"
```

### 모니터링 대시보드

#### Grafana 대시보드 (Port 3001)
```
http://localhost:3001
```

**주요 메트릭**:
- TI 캐시 히트율
- 증분 업데이트 효율성
- OpenSearch 인덱스 증가율
- Cortex XDR 수집 속도
- Redis 메모리 사용량

#### Prometheus 쿼리 (Port 9090)
```
http://localhost:9090
```

**유용한 쿼리**:
```promql
# TI 캐시 조회 속도
histogram_quantile(0.95, ti_cache_query_duration_seconds_bucket)

# Redis 메모리 사용률
redis_memory_used_bytes / redis_memory_max_bytes * 100

# OpenSearch 인덱싱 속도
rate(opensearch_index_indexing_total[5m])
```

---

## ⚡ 성능 및 최적화

### 현재 성능 메트릭

| 메트릭 | 현재 값 | 목표 | 상태 |
|-------|---------|------|------|
| **TI 캐시 조회 속도** | 0.8ms | < 1ms | ✅ 목표 달성 |
| **Bloom Filter 체크** | 0.05ms | < 0.1ms | ✅ 목표 달성 |
| **캐시 히트율** | 95.2% | > 95% | ✅ 목표 달성 |
| **증분 업데이트 시간** | 2분 | < 5분 | ✅ 목표 달성 |
| **전체 재구축 시간** | 15분 | < 30분 | ✅ 목표 달성 |
| **Cortex XDR 수집 속도** | 1,000-5,000/시간 | > 500/시간 | ✅ 목표 달성 |
| **OpenSearch 인덱싱 속도** | 10,000 docs/sec | > 5,000 docs/sec | ✅ 목표 달성 |

### 최적화 전략

#### 1. Redis 메모리 최적화
```redis
# 메모리 정책 설정
CONFIG SET maxmemory 3gb
CONFIG SET maxmemory-policy allkeys-lru

# RDB 스냅샷 비활성화 (AOF 사용)
CONFIG SET save ""
CONFIG SET appendonly yes
CONFIG SET appendfsync everysec
```

#### 2. PostgreSQL 쿼리 최적화
```sql
-- 인덱스 생성 (updated_at 증분 업데이트용)
CREATE INDEX CONCURRENTLY idx_ti_malware_updated_at
ON threat_intelligence.ti_malware(updated_at DESC);

CREATE INDEX CONCURRENTLY idx_ti_cve_updated_at
ON threat_intelligence.ti_cve(updated_at DESC);

CREATE INDEX CONCURRENTLY idx_ti_ioc_updated_at
ON threat_intelligence.ti_ioc(updated_at DESC);

-- 통계 업데이트
ANALYZE threat_intelligence.ti_malware;
ANALYZE threat_intelligence.ti_cve;
ANALYZE threat_intelligence.ti_ioc;

-- 복합 인덱스 (자주 사용하는 조회 패턴)
CREATE INDEX idx_ti_malware_hash_verdict
ON threat_intelligence.ti_malware(hash, verdict)
WHERE verdict = 'malicious';
```

#### 3. OpenSearch 샤드 최적화
```bash
# 인덱스 템플릿 설정 (샤드 수 최적화)
curl -X PUT -u elastic:n8n123 "http://20.41.120.173:9200/_index_template/cortex_xdr_template" \
  -H 'Content-Type: application/json' \
  -d '{
    "index_patterns": ["logs-cortex_xdr-*"],
    "template": {
      "settings": {
        "number_of_shards": 1,
        "number_of_replicas": 1,
        "refresh_interval": "30s",
        "codec": "best_compression"
      }
    }
  }'

# Force Merge (주간)
curl -X POST -u elastic:n8n123 "http://20.41.120.173:9200/logs-cortex_xdr-*/_forcemerge?max_num_segments=1"
```

#### 4. Bloom Filter 최적화
```javascript
// src/builders/BloomFilterBuilder.js

// 현재 설정
const config = {
  hashes: { capacity: 500000, errorRate: 0.00001 },
  ips: { capacity: 100000, errorRate: 0.00001 },
  domains: { capacity: 200000, errorRate: 0.00001 }
};

// 메모리 vs 정확도 트레이드오프
// errorRate 0.00001 → 17 해시 함수, 7.2MB (현재)
// errorRate 0.0001 → 14 해시 함수, 5.4MB (메모리 절약)
// errorRate 0.000001 → 20 해시 함수, 9.0MB (더 정확)
```

#### 5. 네트워크 최적화
```javascript
// src/adapters/PostgreSQLAdapter.js

// 커넥션 풀 설정
const pool = new Pool({
  host: 'postgres',
  port: 5432,
  database: 'authdb',
  user: 'n8n',
  password: 'n8n123',
  max: 20,              // 최대 연결 수
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000
});

// 배치 쿼리
const batchSize = 1000;
const changedRecords = await pool.query(`
  SELECT * FROM threat_intelligence.ti_malware
  WHERE updated_at > $1
  LIMIT $2
`, [lastUpdate, batchSize]);
```

### 확장성 계획

#### 단기 (3개월)
- [ ] Redis Cluster 구성 (3 master + 3 replica)
- [ ] PostgreSQL 읽기 복제본 추가
- [ ] OpenSearch 노드 확장 (3 → 5 노드)

#### 중기 (6개월)
- [ ] 외부 TI 소스 자동 수집 (VirusTotal, AbuseIPDB)
- [ ] 캐시 warming 스크립트 개발
- [ ] 실시간 위협 스코어링 엔진 추가

#### 장기 (12개월)
- [ ] ML 기반 위협 예측 모델 통합
- [ ] 글로벌 CDN 기반 TI 캐시 분산
- [ ] 자동 스케일링 (Kubernetes)

---

## 📝 참고 문서

### 내부 문서
- `/opt/docs/apps/opensearch/script2/README-TI-CACHE-REDIS.md` - TI 캐시 시스템 개요
- `/opt/docs/apps/opensearch/script2/CLAUDE.md` - script2 개발 가이드
- `/opt/docs/apps/opensearch/script2/docs/TI-CACHE-REDIS-ARCHITECTURE.md` - 아키텍처 상세
- `/opt/docs/apps/opensearch/script2/docs/TI-CACHE-TECHNICAL-DESIGN.md` - 기술 설계
- `/opt/docs/apps/opensearch/script2/docs/TI-CACHE-IMPLEMENTATION-GUIDE.md` - 구현 가이드
- `/opt/docs/apps/opensearch/script2/docs/TI-CACHE-API-SPECIFICATION.md` - API 명세
- `/opt/docs/apps/opensearch/script2/docs/TI-CACHE-OPERATIONS-MANUAL.md` - 운영 매뉴얼
- `/opt/docs/apps/opensearch/cortex-xdr-crawler/CLAUDE.md` - Cortex XDR 크롤러 가이드

### 외부 참고
- [Redis Documentation](https://redis.io/documentation)
- [RedisBloom Module](https://redis.io/docs/stack/bloom/)
- [OpenSearch Documentation](https://opensearch.org/docs/latest/)
- [Cortex XDR API Reference](https://docs-cortex.paloaltonetworks.com/r/Cortex-XDR/Cortex-XDR-API-Reference)
- [MITRE ATT&CK Framework](https://attack.mitre.org/)

---

## 🏁 결론

이 문서는 **TI (Threat Intelligence) 데이터 크롤링 시스템**의 전체 아키텍처, 데이터 플로우, 운영 방법을 상세히 기술합니다.

**핵심 요약**:
1. **데이터 수집**: Cortex XDR API → Python 크롤러 → OpenSearch
2. **TI 데이터 저장**: 외부 TI 소스 → PostgreSQL (1.5M+ 레코드)
3. **캐시 구축**: PostgreSQL + OpenSearch → Redis (Bloom Filter + Reverse Index)
4. **실시간 조회**: < 1ms 응답시간, 95%+ 캐시 히트율
5. **증분 업데이트**: 85% 효율성 (2분 vs 15분)

**운영 관리자를 위한 체크리스트**:
- ✅ 매일 02:00 증분 업데이트 자동 실행 확인
- ✅ 매일 09:00 시스템 상태 확인
- ✅ 매주 월요일 성능 메트릭 검토
- ✅ 매월 1일 전체 캐시 재구축
- ✅ 긴급 상황 대응 절차 숙지

**개발자를 위한 참고사항**:
- 모든 스크립트는 `/opt/docs/apps/opensearch/` 하위에 위치
- TI 캐시 CLI: `script2/ti-cache-cli.js`
- Cortex XDR 크롤러: `cortex-xdr-crawler/scheduler.py`
- PostgreSQL 스키마: `threat_intelligence` (26개 테이블)
- Redis TI Cache: `redis-ti-cache:6379` (외부 6380)

---

**문서 버전**: 1.0
**마지막 업데이트**: 2025-11-21
**작성자**: Claude Code (AI Assistant)
**검토자**: Security Team

이 문서에 대한 질문이나 개선 사항이 있으시면 GitHub Issue를 생성하거나 보안 팀에 문의하시기 바랍니다.
