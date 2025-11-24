# MCP 서버 완전 매뉴얼

**작성일**: 2025-11-11
**버전**: 1.0
**프로젝트**: DeFender X SIEM - AI 기반 보안 인시던트 분석 시스템

---

## 📋 목차

1. [개요](#개요)
2. [MCP 서버 목록](#mcp-서버-목록)
3. [표준 MCP 서버 (5개)](#표준-mcp-서버)
4. [데이터베이스 MCP 서버 (3개)](#데이터베이스-mcp-서버)
5. [커스텀 보안 MCP 서버 (4개)](#커스텀-보안-mcp-서버)
6. [사용 시나리오](#사용-시나리오)
7. [트러블슈팅](#트러블슈팅)

---

## 개요

이 프로젝트는 **12개의 MCP (Model Context Protocol) 서버**를 통합하여 Claude Code가 다양한 데이터 소스와 도구에 실시간으로 접근할 수 있습니다.

### MCP란?

**Model Context Protocol (MCP)**는 AI 모델이 외부 데이터와 도구에 접근할 수 있도록 하는 표준화된 프로토콜입니다.

**핵심 개념**:
- **서버**: 데이터나 기능을 제공하는 독립적인 프로세스
- **도구(Tools)**: 서버가 제공하는 함수/기능
- **리소스(Resources)**: 서버가 제공하는 데이터/문서
- **프롬프트(Prompts)**: 사전 정의된 프롬프트 템플릿

### 설정 파일

**위치**: `.mcp.json` (프로젝트 루트)

```json
{
  "mcpServers": {
    "서버이름": {
      "command": "실행 명령어",
      "args": ["인자1", "인자2"],
      "env": {
        "환경변수": "값"
      },
      "description": "서버 설명"
    }
  }
}
```

---

## MCP 서버 목록

### 전체 구성 (12개)

| 분류 | 서버 이름 | 주요 기능 | 데이터 소스 |
|------|----------|----------|------------|
| **표준 MCP (5개)** | | | |
| | next-devtools | Next.js 16 개발 도구 | Next.js 런타임 |
| | chrome-devtools | 브라우저 자동화 | Chrome DevTools Protocol |
| | context7 | 최신 라이브러리 문서 | Upstash API |
| | memory | 지식 그래프 저장소 | 로컬 파일 시스템 |
| | shadcn | shadcn/ui 컴포넌트 | shadcn Registry |
| **데이터베이스 MCP (3개)** | | | |
| | postgres-editor | 에디터 데이터베이스 | localhost:5432/postgres |
| | postgres-siem | SIEM 대시보드 DB | localhost:5432/siem_db |
| | postgres-n8n | TI/MITRE/CVE 데이터 | postgres:5432/n8n |
| **커스텀 보안 MCP (4개)** | | | |
| | opensearch | 보안 로그 검색 | 20.41.120.173:9200 |
| | incident-analysis | 인시던트 통계/차트 | OpenSearch + PostgreSQL |
| | nl-query | 자연어 쿼리 변환 | OpenSearch + AI |
| | claude-investigation | 인시던트 심층 분석 | OpenSearch + PostgreSQL + AI |

---

## 표준 MCP 서버

### 1. next-devtools

**개요**: Next.js 16 개발 도구 및 문서 검색

**명령어**:
```bash
npx -y next-devtools-mcp@latest
```

**주요 기능**:
- `init`: Next.js DevTools 초기화 및 문서 로드
- `nextjs_docs`: Next.js 공식 문서 검색 및 조회
- `nextjs_runtime`: 실행 중인 Next.js 서버 런타임 정보 조회
- `upgrade_nextjs_16`: Next.js 16으로 업그레이드 가이드
- `enable_cache_components`: Cache Components 모드 마이그레이션
- `browser_eval`: 브라우저 자동화 (페이지 로드, 에러 수집)

**사용 예시**:
```typescript
// Next.js 문서 검색
mcp__next_devtools__nextjs_docs({
  action: 'search',
  query: 'server actions',
  routerType: 'app'
})

// 런타임 정보 조회 (dev 서버 실행 중)
mcp__next_devtools__nextjs_runtime({
  action: 'discover_servers'
})
```

**리소스**: Next.js 공식 문서 (https://nextjs.org/docs)

---

### 2. chrome-devtools

**개요**: Chrome 브라우저 자동화 및 성능 분석

**명령어**:
```bash
npx -y chrome-devtools-mcp@latest
```

**주요 기능**:
- 페이지 탐색 및 스크린샷
- 콘솔 로그 수집 (에러, 경고)
- 네트워크 요청 모니터링
- 성능 분석 (Lighthouse)
- 요소 클릭, 입력, 드래그
- 브라우저 에뮬레이션 (모바일, CPU 쓰로틀링)

**사용 예시**:
```typescript
// 페이지 로드 및 콘솔 에러 확인
mcp__chrome_devtools__navigate_page({
  type: 'url',
  url: 'http://localhost:40017'
})

mcp__chrome_devtools__list_console_messages({
  types: ['error', 'warn']
})

// 스크린샷 촬영
mcp__chrome_devtools__take_screenshot({
  fullPage: true,
  format: 'png'
})
```

**리소스**: Chrome DevTools Protocol

---

### 3. context7

**개요**: 최신 라이브러리 문서 실시간 조회

**명령어**:
```bash
npx -y @upstash/context7-mcp
```

**주요 기능**:
- `resolve-library-id`: 라이브러리 이름 → Context7 ID 변환
- `get-library-docs`: 라이브러리 문서 조회

**지원 라이브러리**:
- Next.js, React, TypeScript
- OpenSearch, Prisma, PostgreSQL
- Tailwind CSS, shadcn/ui
- Claude AI, OpenAI

**사용 예시**:
```typescript
// Next.js 문서 조회
const libraryId = await mcp__context7__resolve_library_id({
  libraryName: 'Next.js'
})

const docs = await mcp__context7__get_library_docs({
  context7CompatibleLibraryID: libraryId.id,
  topic: 'server actions',
  tokens: 5000
})
```

**리소스**: Context7 API (Upstash)

---

### 4. memory

**개요**: 지식 그래프 기반 영구 메모리

**명령어**:
```bash
npx -y @modelcontextprotocol/server-memory
```

**주요 기능**:
- `create_entities`: 엔티티 생성 (이름, 타입, 관찰사항)
- `create_relations`: 엔티티 간 관계 생성
- `add_observations`: 엔티티에 관찰사항 추가
- `delete_entities`: 엔티티 삭제
- `read_graph`: 전체 지식 그래프 읽기
- `search_nodes`: 키워드로 노드 검색
- `open_nodes`: 특정 노드 상세 조회

**사용 예시**:
```typescript
// 인시던트 엔티티 생성
mcp__memory__create_entities({
  entities: [{
    name: 'Incident-888-000485',
    entityType: 'SecurityIncident',
    observations: [
      'Critical severity malware detection',
      'Detected on 2025-11-09',
      'Host: rnd-d308242'
    ]
  }]
})

// 관계 생성
mcp__memory__create_relations({
  relations: [{
    from: 'Incident-888-000485',
    to: 'Malware-Family-X',
    relationType: 'detected_threat'
  }]
})
```

**저장 위치**: `~/.mcp/memory/` (로컬 파일 시스템)

---

### 5. shadcn

**개요**: shadcn/ui 컴포넌트 관리

**명령어**:
```bash
npx shadcn@latest mcp
```

**주요 기능**:
- `get_project_registries`: 프로젝트 레지스트리 목록
- `list_items_in_registries`: 컴포넌트 목록 조회
- `search_items_in_registries`: 컴포넌트 검색
- `view_items_in_registries`: 컴포넌트 상세 정보
- `get_item_examples_from_registries`: 사용 예시 조회
- `get_add_command_for_items`: 컴포넌트 설치 명령어

**사용 예시**:
```typescript
// shadcn 컴포넌트 검색
mcp__shadcn__search_items_in_registries({
  registries: ['@shadcn'],
  query: 'button'
})

// 컴포넌트 추가 명령어
mcp__shadcn__get_add_command_for_items({
  items: ['@shadcn/button', '@shadcn/card']
})
// 결과: npx shadcn@latest add button card
```

**리소스**: shadcn/ui Registry

---

## 데이터베이스 MCP 서버

### 6. postgres-editor

**개요**: 에디터 데이터베이스 (로컬)

**연결 정보**:
```
Host: localhost
Port: 5432
Database: postgres
User: postgres
Password: postgres
Schema: public
```

**명령어**:
```bash
npx -y @modelcontextprotocol/server-postgres \
  "postgresql://postgres:postgres@localhost:5432/postgres?schema=public"
```

**주요 테이블**:
- 일반 애플리케이션 데이터

**사용 예시**:
```typescript
// 테이블 조회
mcp__postgres_editor__query({
  sql: 'SELECT * FROM information_schema.tables WHERE table_schema = \'public\' LIMIT 10'
})
```

**리소스**: PostgreSQL localhost:5432/postgres

---

### 7. postgres-siem

**개요**: SIEM 대시보드 데이터베이스

**연결 정보**:
```
Host: localhost
Port: 5432
Database: siem_db
User: opensearch
Password: opensearch123
Schema: public
```

**명령어**:
```bash
npx -y @modelcontextprotocol/server-postgres \
  "postgresql://opensearch:opensearch123@localhost:5432/siem_db?schema=public"
```

**주요 테이블**:
- `User`: 사용자 계정
- `DashboardConfig`: 대시보드 설정
- `Query`: 저장된 쿼리
- `Alert`: 알럿 설정

**사용 예시**:
```typescript
// 사용자 목록 조회
mcp__postgres_siem__query({
  sql: 'SELECT id, email, name, role FROM "User" ORDER BY created_at DESC LIMIT 10'
})

// 대시보드 설정 조회
mcp__postgres_siem__query({
  sql: 'SELECT * FROM "DashboardConfig" WHERE user_id = $1',
  params: ['user-id-here']
})
```

**리소스**: PostgreSQL localhost:5432/siem_db

---

### 8. postgres-n8n

**개요**: TI/MITRE/CVE 데이터베이스 (n8n 워크플로우)

**연결 정보**:
```
Host: postgres (→ 20.41.120.173 via /etc/hosts)
Port: 5432
Database: n8n
User: postgres
Password: postgres
Schema: ioclog
```

**명령어**:
```bash
npx -y @modelcontextprotocol/server-postgres \
  "postgresql://postgres:postgres@postgres:5432/n8n?schema=ioclog"
```

**주요 테이블**:
- `ioc_log`: IOC (Indicators of Compromise) 로그
- `threat_intelligence`: 위협 인텔리전스 데이터
- `mitre_attack`: MITRE ATT&CK 기법 정보
- `cve_database`: CVE 취약점 데이터
- `nsrl_hashes`: NSRL benign hash (9M 해시)
- `microsoft_sysinternals`: Microsoft Sysinternals 도구 해시

**사용 예시**:
```typescript
// SHA256 해시로 TI 조회
mcp__postgres_n8n__query({
  sql: `
    SELECT * FROM ioclog.threat_intelligence
    WHERE sha256 = $1
    LIMIT 1
  `,
  params: ['해시값']
})

// MITRE 기법 조회
mcp__postgres_n8n__query({
  sql: `
    SELECT technique_id, technique_name, tactic, description
    FROM ioclog.mitre_attack
    WHERE technique_id = ANY($1)
  `,
  params: [['T1055', 'T1106']]
})

// NSRL benign hash 확인
mcp__postgres_n8n__query({
  sql: `
    SELECT sha256 FROM ioclog.nsrl_hashes
    WHERE sha256 = $1
  `,
  params: ['해시값']
})
```

**리소스**: PostgreSQL postgres:5432/n8n (→ 20.41.120.173)

---

## 커스텀 보안 MCP 서버

### 9. opensearch

**개요**: OpenSearch 보안 로그 검색 MCP 서버

**연결 정보**:
```
URL: http://20.41.120.173:9200
User: admin
Password: Admin@123456
MCP Server: http://20.41.120.173:8099
```

**명령어**:
```bash
opensearch-mcp-inbridge
```

**환경변수**:
```bash
MCP_SERVER_URL=http://20.41.120.173:8099
```

**주요 인덱스**:
- `logs-cortex_xdr-incidents-*`: Cortex XDR 인시던트 (~29,578건)
- `logs-cortex_xdr-alerts-*`: Cortex XDR 알럿
- `logs-*`: 기타 보안 로그

**주요 기능**:
- `Index_Lister`: 인덱스 목록 및 상세 정보
- `IndexMappingTool`: 인덱스 매핑 조회
- `Index_Searcher`: Query DSL 검색
- `CountTool`: 문서 개수 카운트
- `MsearchTool`: 다중 검색 (배치)
- `ExplainTool`: 쿼리 설명
- `GetShardsTool`: 샤드 정보
- `Cluster_Health_Checker`: 클러스터 상태

**사용 예시**:
```typescript
// 인덱스 목록 조회
mcp__opensearch__Index_Lister({
  include_detail: true
})

// 인시던트 검색 (최근 7일)
mcp__opensearch__Index_Searcher({
  index: 'logs-cortex_xdr-incidents-*',
  query: {
    bool: {
      must: [
        {
          range: {
            '@timestamp': {
              gte: 'now-7d/d',
              lt: 'now/d'
            }
          }
        },
        {
          term: {
            'severity': 'critical'
          }
        }
      ]
    }
  }
})

// 문서 개수
mcp__opensearch__CountTool({
  index: 'logs-cortex_xdr-incidents-*',
  body: {
    query: {
      match_all: {}
    }
  }
})
```

**리소스**: Remote OpenSearch (20.41.120.173:9200)

---

### 10. incident-analysis

**개요**: 인시던트 통계, 차트, 보고서 생성

**연결 정보**:
```
MCP Server: http://20.41.120.173:8100
Data Source: OpenSearch + PostgreSQL
```

**명령어**:
```bash
incident-analysis-inbridge
```

**환경변수**:
```bash
MCP_SERVER_URL=http://20.41.120.173:8100
```

**주요 기능**:

#### 1. `get_incident_statistics`
인시던트 통계 생성 (Markdown 테이블)

**파라미터**:
- `days` (number): 분석 일수 (기본: 7일)
- `index_pattern` (string): 인덱스 패턴 (기본: logs-cortex_xdr-incidents-*)
- `severity_field` (string): 심각도 필드명 (기본: severity)

**사용 예시**:
```typescript
mcp__incident_analysis__get_incident_statistics({
  days: 1,
  index_pattern: 'logs-cortex_xdr-incidents-*',
  severity_field: 'severity'
})

// 결과:
// | 심각도 | 건수 |
// |--------|------|
// | critical | 3 |
// | high | 22 |
// | medium | 80 |
// | low | 20 |
```

#### 2. `create_incident_trend_chart`
인시던트 추세 차트 생성

**파라미터**:
- `days` (number): 분석 일수
- `index_pattern` (string): 인덱스 패턴
- `interval` (string): 시간 간격 (1h, 1d)

**사용 예시**:
```typescript
// 일별 트렌드
mcp__incident_analysis__create_incident_trend_chart({
  days: 7,
  index_pattern: 'logs-cortex_xdr-incidents-*',
  interval: '1d'
})

// 시간별 트렌드
mcp__incident_analysis__create_incident_trend_chart({
  days: 1,
  interval: '1h'
})
```

#### 3. `analyze_top_threats`
상위 위협 분석

**파라미터**:
- `days` (number): 분석 일수
- `index_pattern` (string): 인덱스 패턴
- `threat_field` (string): 위협 유형 필드명 (기본: threat_type)
- `top_count` (number): 상위 개수 (기본: 10)

**사용 예시**:
```typescript
mcp__incident_analysis__analyze_top_threats({
  days: 7,
  index_pattern: 'logs-cortex_xdr-incidents-*',
  threat_field: 'detection_type',
  top_count: 10
})
```

#### 4. `generate_incident_report`
종합 인시던트 보고서 생성

**파라미터**:
- `days` (number): 분석 일수
- `index_pattern` (string): 인덱스 패턴
- `report_title` (string): 보고서 제목

**사용 예시**:
```typescript
mcp__incident_analysis__generate_incident_report({
  days: 1,
  index_pattern: 'logs-cortex_xdr-incidents-*',
  report_title: '일간 보안 인시던트 보고서'
})

// 결과: Markdown 보고서
// - 전체 통계
// - 심각도별 분포
// - 상위 위협 Top 10
// - 권고사항
```

#### 5. `analyze_geographic_distribution`
지리적 분포 분석

**파라미터**:
- `days` (number): 분석 일수
- `index_pattern` (string): 인덱스 패턴
- `geo_field` (string): 지리 정보 필드명 (기본: geoip.country_name)

**사용 예시**:
```typescript
mcp__incident_analysis__analyze_geographic_distribution({
  days: 7,
  index_pattern: 'logs-cortex_xdr-incidents-*',
  geo_field: 'geoip.country_name'
})
```

**리소스**:
- OpenSearch (인시던트 데이터)
- PostgreSQL (TI 상관분석)

---

### 11. nl-query

**개요**: 자연어 질문을 OpenSearch 쿼리로 변환 및 실행

**연결 정보**:
```
OpenSearch: http://opensearch:9200 (→ 20.41.120.173)
AI: Azure OpenAI (gpt-4o-mini)
```

**명령어**:
```bash
npx tsx /www/ib-editor/my-app/script/nl-query-mcp.js
```

**환경변수**:
```bash
AZURE_OPENAI_ENDPOINT=https://etech-openai.openai.azure.com/
AZURE_OPENAI_DEPLOYMENT=gpt-4o-mini
AZURE_OPENAI_API_VERSION=2024-02-15-preview
OPENSEARCH_URL=http://opensearch:9200
OPENSEARCH_USER=admin
OPENSEARCH_PASSWORD=Admin@123456
```

**주요 기능**:

#### 1. `nl_query`
자연어 질문 → OpenSearch 쿼리 변환 및 실행

**파라미터**:
- `query` (string, required): 자연어 질문 (한국어 또는 영어)
- `model` (string): AI 모델 선택 (기본: azure-gpt-4o-mini)
  - `azure-gpt-4o-mini` (기본, 빠름)
  - `claude-3-5-sonnet` (높은 품질)
  - `gemini-2.0-flash` (빠른 속도)
  - `azure-gpt-35-turbo`
  - `claude-3-haiku`
  - `gemini-2.5-pro`
- `execute` (boolean): 쿼리 실행 여부 (기본: true)
- `format` (array): 결과 형식 (기본: ['markdown', 'json'])
  - `markdown`: 테이블 형식
  - `json`: JSON 형식
  - `summary`: 요약

**사용 예시**:
```typescript
// 한국어 질문
mcp__nl_query__nl_query({
  query: '최근 7일간 critical 심각도 인시던트를 호스트별로 집계해줘',
  model: 'azure-gpt-4o-mini',
  format: ['markdown', 'json'],
  execute: true
})

// 영어 질문
mcp__nl_query__nl_query({
  query: 'Show me top 10 hosts with most incidents in the last 24 hours',
  execute: true
})

// False Positive 비율 조회
mcp__nl_query__nl_query({
  query: '오늘 오탐률은 얼마야?',
  format: ['summary']
})
```

**지원하는 자연어 표현**:

**날짜 표현 (30+ 패턴)**:
- 절대: "2025-11-09", "오늘", "어제", "이번 주", "지난달"
- 상대: "최근 7일", "지난 3시간", "30분 전부터", "한 달 전"
- 범위: "11월 1일부터 11월 10일까지", "2주 전부터 어제까지"

**데이터 타입 (8가지)**:
- incidents, alerts, logs, events, threats, vulnerabilities, users, hosts

**쿼리 유형 (5가지)**:
- 검색 (search): "critical 인시던트 찾아줘"
- 집계 (aggregation): "호스트별로 집계해줘"
- 카운트 (count): "인시던트 개수는?"
- 통계 (statistics): "평균, 최대, 최소 값"
- 트렌드 (trend): "시간별 추이"

#### 2. `test_parse`
파싱만 테스트 (쿼리 실행 안 함)

**파라미터**:
- `query` (string, required): 자연어 질문
- `model` (string): AI 모델 선택

**사용 예시**:
```typescript
mcp__nl_query__test_parse({
  query: '지난주 멀웨어 인시던트 개수',
  model: 'azure-gpt-4o-mini'
})

// 결과: OpenSearch Query DSL만 반환
{
  "query": {
    "bool": {
      "must": [
        { "range": { "@timestamp": { "gte": "now-7d/d" } } },
        { "match": { "detection_type": "malware" } }
      ]
    }
  },
  "size": 0,
  "aggs": {
    "incident_count": { "value_count": { "field": "incident.incident_id" } }
  }
}
```

**실제 쿼리 예시**:

```typescript
// 예시 1: 최근 24시간 Critical 인시던트
mcp__nl_query__nl_query({
  query: '최근 24시간 critical 인시던트 목록'
})

// 예시 2: 호스트별 인시던트 집계
mcp__nl_query__nl_query({
  query: '이번 주 가장 많은 인시던트가 발생한 호스트 top 10'
})

// 예시 3: 오탐률 계산
mcp__nl_query__nl_query({
  query: '오늘 false positive로 처리된 인시던트 비율',
  format: ['summary']
})

// 예시 4: 심각도별 분포
mcp__nl_query__nl_query({
  query: '지난 7일 심각도별 인시던트 수'
})

// 예시 5: 특정 호스트 검색
mcp__nl_query__nl_query({
  query: 'rnd-d308242 호스트에서 발생한 인시던트'
})
```

**리소스**:
- OpenSearch (인시던트 데이터)
- Azure OpenAI (자연어 파싱)

**소스코드**: `/www/ib-editor/my-app/script/nl-query-mcp.js` (47KB)

---

### 12. claude-investigation

**개요**: Claude Code가 직접 인시던트를 분석하고 한글 보고서 생성

**연결 정보**:
```
OpenSearch: http://opensearch:9200 (→ 20.41.120.173)
PostgreSQL: postgresql://postgres:postgres@postgres:5432/n8n?schema=ioclog
```

**명령어**:
```bash
npx tsx /www/ib-editor/my-app/script/claude-investigation-mcp.js
```

**환경변수**:
```bash
OPENSEARCH_URL=http://opensearch:9200
OPENSEARCH_USER=admin
OPENSEARCH_PASSWORD=Admin@123456
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/n8n?schema=ioclog
```

**주요 기능**:

#### 1. `collect_incident_data`
인시던트 원본 데이터 수집 (AI 분석 없이)

**파라미터**:
- `incident_id` (string, required): 인시던트 ID (예: "888-000485")

**반환 데이터**:
```typescript
{
  incident: {
    incident_id: "888-000485",
    severity: "critical",
    status: "resolved",
    description: "Local Analysis Malware detected",
    creation_time: "2025-11-09T10:30:00Z",
    host_name: "rnd-d308242",
    user_name: "good\\subin_jung"
  },
  alerts: [
    {
      alert_id: "123456",
      alert_name: "Local Analysis Malware",
      action: "DETECTED",
      severity: "critical"
    }
  ],
  file_artifacts: [
    {
      file_path: "C:\\Users\\...",
      file_sha256: "abc123...",
      file_md5: "def456...",
      file_size: 102400,
      file_type: "PE32",
      wildfire_verdict: "benign",
      ti_correlation: {
        isBenign: true,
        source: "nsrl",
        confidence: 100
      }
    }
  ],
  network_artifacts: [
    {
      remote_ip: "8.8.8.8",
      remote_port: 443,
      protocol: "https",
      country: "United States",
      threat_intel: {
        reputation: "clean"
      }
    }
  ],
  mitre_techniques: [
    {
      technique_id: "T1055",
      technique_name: "Process Injection",
      tactic: "Defense Evasion",
      description: "..."
    }
  ],
  endpoint_cves: []
}
```

**사용 예시**:
```typescript
// 1단계: 데이터 수집
const data = await mcp__claude_investigation__collect_incident_data({
  incident_id: '888-000485'
})

// Claude Code가 데이터를 보고 직접 분석
console.log('인시던트 데이터:', data)
```

#### 2. `save_analysis_and_generate_report`
Claude Code가 작성한 AI 분석 저장 및 HTML 보고서 생성

**파라미터**:
- `incident_id` (string, required): 인시던트 ID
- `analysis` (object, required): Claude가 작성한 AI 분석 의견

**analysis 객체 구조**:
```typescript
{
  incident_detail: string,           // 인시던트 상세 분석 (한글)
  file_artifacts: string,            // 파일 아티팩트 분석 (한글)
  network_artifacts: string,         // 네트워크 아티팩트 분석 (한글)
  mitre_analysis: string,            // MITRE ATT&CK 분석 (한글)
  endpoint_analysis: string,         // 엔드포인트 분석 (한글)
  final_verdict: {
    verdict: 'false_positive' | 'true_positive' | 'needs_investigation',
    risk_score: number,              // 0-100
    confidence: number,              // 0-100
    summary: string,                 // 종합 분석 요약 (한글)
    key_findings: string[]           // 주요 발견사항 목록
  }
}
```

**사용 예시**:
```typescript
// 2단계: Claude Code가 분석 수행
const analysis = {
  incident_detail: `
    이 인시던트는 rnd-d308242 호스트에서 Local Analysis Malware 탐지 알럿이 발생한 사례입니다.
    탐지 시각은 2025-11-09 10:30:00이며, Critical 심각도로 분류되었습니다.

    분석 결과, 실제 악성코드가 아닌 정상 파일의 오탐으로 판단됩니다.
  `,
  file_artifacts: `
    총 2개의 파일이 분석되었으며, 모두 WildFire에서 Benign으로 판정되었습니다.

    1. C:\\Users\\subin_jung\\Downloads\\setup.exe
       - SHA256: abc123...
       - WildFire: Benign
       - NSRL 데이터베이스에 등록된 정상 파일
       - Microsoft 정식 서명 확인

    위협 지표 없음.
  `,
  network_artifacts: `
    네트워크 연결 없음. 로컬에서만 실행된 파일입니다.
  `,
  mitre_analysis: `
    T1055 (Process Injection) 기법이 탐지되었으나, 이는 정상 설치 프로그램의
    일반적인 동작으로, 악의적인 의도는 확인되지 않았습니다.
  `,
  endpoint_analysis: `
    엔드포인트: rnd-d308242
    사용자: good\\subin_jung
    OS: Windows 10

    호스트 상태 정상. 추가 의심 활동 없음.
  `,
  final_verdict: {
    verdict: 'false_positive',
    risk_score: 15,
    confidence: 95,
    summary: '정상 파일의 오탐. 실제 위협 없음.',
    key_findings: [
      'WildFire 분석 결과 Benign',
      'NSRL 데이터베이스 등록 파일',
      'Microsoft 정식 서명 확인',
      '악의적인 네트워크 활동 없음'
    ]
  }
}

// 3단계: 분석 저장 및 보고서 생성
await mcp__claude_investigation__save_analysis_and_generate_report({
  incident_id: '888-000485',
  analysis
})

// 결과:
// 1. JSON 저장: public/reports/incident_888-000485_korean_2025-11-09T10-30-00-000Z.json
// 2. HTML 생성: public/reports/incident_888-000485_korean_2025-11-09T10-30-00-000Z.html
// 3. URL: http://localhost:40017/reports/incident_888-000485_korean_2025-11-09T10-30-00-000Z.html
```

**전체 워크플로우**:
```typescript
// 완전한 인시던트 분석 워크플로우

// 1️⃣ 데이터 수집
const incidentData = await mcp__claude_investigation__collect_incident_data({
  incident_id: '888-000485'
})

// 2️⃣ Claude Code가 데이터 분석 (AI 사고)
// - 인시던트 상세 검토
// - 파일 아티팩트 위협 평가
// - 네트워크 활동 분석
// - MITRE 기법 매핑
// - 엔드포인트 상태 확인

// 3️⃣ 분석 의견 작성
const myAnalysis = {
  incident_detail: '...',
  file_artifacts: '...',
  network_artifacts: '...',
  mitre_analysis: '...',
  endpoint_analysis: '...',
  final_verdict: {
    verdict: 'false_positive',
    risk_score: 15,
    confidence: 95,
    summary: '...',
    key_findings: [...]
  }
}

// 4️⃣ 보고서 생성
await mcp__claude_investigation__save_analysis_and_generate_report({
  incident_id: '888-000485',
  analysis: myAnalysis
})

// 5️⃣ 완료!
console.log('보고서 생성: http://localhost:40017/reports/incident_888-000485_korean_*.html')
```

**생성되는 보고서 구조**:

**JSON 파일** (`public/reports/incident_*_korean_*.json`):
```json
{
  "incident": { /* 인시던트 상세 */ },
  "alerts": [ /* 알럿 목록 */ ],
  "file_artifacts": [ /* 파일 상세 + TI 상관분석 */ ],
  "network_artifacts": [ /* 네트워크 연결 + 지리정보 */ ],
  "mitre_techniques": [ /* MITRE 기법 상세 */ ],
  "endpoint_cves": [ /* CVE 취약점 */ ],
  "ai_analysis": {
    "incident_detail": "...",
    "file_artifacts": "...",
    "network_artifacts": "...",
    "mitre_analysis": "...",
    "endpoint_analysis": "...",
    "final_verdict": { ... }
  }
}
```

**HTML 파일** (`public/reports/incident_*_korean_*.html`):
- Tailwind CSS 4 스타일
- 한글 전문 보안 보고서
- 섹션:
  - 요약 (Summary)
  - 인시던트 상세 (Incident Detail)
  - 파일 아티팩트 분석 (File Artifacts)
  - 네트워크 아티팩트 분석 (Network Artifacts)
  - MITRE ATT&CK 매핑
  - 엔드포인트 분석
  - 최종 판정 (Final Verdict)
  - AI 분석 의견 (각 섹션별 한글 분석)

**리소스**:
- OpenSearch (인시던트 데이터)
- PostgreSQL (TI/MITRE/CVE 상관분석)
- 로컬 파일 시스템 (보고서 저장)

**소스코드**: `/www/ib-editor/my-app/script/claude-investigation-mcp.js` (11KB)

---

## 사용 시나리오

### 시나리오 1: 일간 보안 보고서 생성

```typescript
// 1. 인시던트 통계
const stats = await mcp__incident_analysis__get_incident_statistics({
  days: 1,
  index_pattern: 'logs-cortex_xdr-incidents-*'
})

// 2. 트렌드 차트
const trend = await mcp__incident_analysis__create_incident_trend_chart({
  days: 7,
  interval: '1d'
})

// 3. 상위 위협
const threats = await mcp__incident_analysis__analyze_top_threats({
  days: 1,
  top_count: 10
})

// 4. 지리적 분포
const geo = await mcp__incident_analysis__analyze_geographic_distribution({
  days: 1
})

// 5. 종합 보고서
const report = await mcp__incident_analysis__generate_incident_report({
  days: 1,
  report_title: '일간 보안 인시던트 보고서'
})
```

---

### 시나리오 2: Critical 인시던트 심층 분석

```typescript
// 1. Critical 인시던트 검색 (nl-query)
const criticalList = await mcp__nl_query__nl_query({
  query: '오늘 critical 심각도 인시던트 목록',
  format: ['json']
})

// 2. 각 인시던트 상세 분석
for (const incident of criticalList.incidents) {
  // 2-1. 데이터 수집
  const data = await mcp__claude_investigation__collect_incident_data({
    incident_id: incident.incident_id
  })

  // 2-2. Claude Code가 AI 분석 수행
  const analysis = {
    incident_detail: '...',
    file_artifacts: '...',
    network_artifacts: '...',
    mitre_analysis: '...',
    endpoint_analysis: '...',
    final_verdict: {
      verdict: 'true_positive',
      risk_score: 85,
      confidence: 90,
      summary: '...',
      key_findings: [...]
    }
  }

  // 2-3. 보고서 생성
  await mcp__claude_investigation__save_analysis_and_generate_report({
    incident_id: incident.incident_id,
    analysis
  })
}
```

---

### 시나리오 3: 자연어 쿼리로 애드혹 분석

```typescript
// 질문 1: 오탐률
const falsePositiveRate = await mcp__nl_query__nl_query({
  query: '이번 주 오탐률은?'
})

// 질문 2: 가장 많은 인시던트 호스트
const topHosts = await mcp__nl_query__nl_query({
  query: '지난 7일 가장 많은 인시던트가 발생한 호스트 top 10'
})

// 질문 3: 특정 위협 유형
const malwareIncidents = await mcp__nl_query__nl_query({
  query: '최근 24시간 멀웨어 관련 인시던트'
})

// 질문 4: 심각도별 분포
const severityDistribution = await mcp__nl_query__nl_query({
  query: '오늘 심각도별 인시던트 개수'
})
```

---

### 시나리오 4: TI 상관분석

```typescript
// 1. 인시던트 검색
const incidents = await mcp__opensearch__Index_Searcher({
  index: 'logs-cortex_xdr-incidents-*',
  query: {
    range: {
      '@timestamp': { gte: 'now-1d/d' }
    }
  }
})

// 2. 파일 해시 추출
const hashes = incidents.hits.hits.flatMap(hit =>
  hit._source.file_artifacts?.map(f => f.file_sha256) || []
)

// 3. TI 조회 (PostgreSQL n8n)
for (const hash of hashes) {
  const tiResult = await mcp__postgres_n8n__query({
    sql: `
      SELECT * FROM ioclog.threat_intelligence
      WHERE sha256 = $1
    `,
    params: [hash]
  })

  if (tiResult.rows.length > 0) {
    console.log('위협 발견:', tiResult.rows[0])
  }
}
```

---

### 시나리오 5: MITRE ATT&CK 매핑

```typescript
// 1. 인시던트의 MITRE 기법 수집
const incident = await mcp__claude_investigation__collect_incident_data({
  incident_id: '888-000485'
})

const techniqueIds = incident.mitre_techniques.map(t => t.technique_id)

// 2. MITRE 상세 정보 조회
const mitreDetails = await mcp__postgres_n8n__query({
  sql: `
    SELECT technique_id, technique_name, tactic, description, mitigation
    FROM ioclog.mitre_attack
    WHERE technique_id = ANY($1)
  `,
  params: [techniqueIds]
})

// 3. 전술별 그룹핑
const tacticGroups = mitreDetails.rows.reduce((acc, row) => {
  if (!acc[row.tactic]) acc[row.tactic] = []
  acc[row.tactic].push(row)
  return acc
}, {})

console.log('공격 전술 분석:', tacticGroups)
```

---

### 시나리오 6: 대시보드 데이터 저장

```typescript
// 1. 커스텀 쿼리 저장 (SIEM DB)
await mcp__postgres_siem__query({
  sql: `
    INSERT INTO "Query" (user_id, name, query_text, query_type)
    VALUES ($1, $2, $3, $4)
  `,
  params: [
    'user-123',
    'Critical Incidents Last 7 Days',
    'severity:critical AND @timestamp:[now-7d TO now]',
    'opensearch'
  ]
})

// 2. 대시보드 설정 저장
await mcp__postgres_siem__query({
  sql: `
    INSERT INTO "DashboardConfig" (user_id, dashboard_name, layout, widgets)
    VALUES ($1, $2, $3, $4)
  `,
  params: [
    'user-123',
    'Security Overview',
    'grid',
    JSON.stringify([
      { type: 'incidents_chart', size: 'large' },
      { type: 'top_threats', size: 'medium' }
    ])
  ]
})
```

---

### 시나리오 7: Next.js 개발 디버깅

```typescript
// 1. Next.js 문서 검색
const docs = await mcp__next_devtools__nextjs_docs({
  action: 'search',
  query: 'server actions error handling',
  routerType: 'app'
})

// 2. 런타임 에러 확인
const runtime = await mcp__next_devtools__nextjs_runtime({
  action: 'list_tools',
  port: '40017'
})

// 3. 브라우저 콘솔 에러 수집
await mcp__next_devtools__browser_eval({
  action: 'start',
  browser: 'chrome',
  headless: false
})

await mcp__next_devtools__browser_eval({
  action: 'navigate',
  url: 'http://localhost:40017/dashboard'
})

const consoleErrors = await mcp__next_devtools__browser_eval({
  action: 'console_messages',
  errorsOnly: true
})
```

---

## 트러블슈팅

### 문제 1: MCP 서버 실행 실패

**증상**:
```
MCP server xxx not found
```

**해결**:
```bash
# 1. MCP 설정 확인
cat .mcp.json

# 2. 서버 스크립트 존재 확인
ls -la script/*-mcp.js

# 3. Node.js 버전 확인 (v18+ 필요)
node --version

# 4. 수동 실행 테스트
npx tsx script/nl-query-mcp.js
```

---

### 문제 2: OpenSearch 연결 실패

**증상**:
```
Error: connect ECONNREFUSED 20.41.120.173:9200
```

**해결**:
```bash
# 1. OpenSearch 서버 상태 확인
curl http://opensearch:9200

# 2. /etc/hosts 확인
cat /etc/hosts | grep opensearch
# opensearch → 20.41.120.173

# 3. 네트워크 연결 확인
ping opensearch

# 4. 환경변수 확인
echo $OPENSEARCH_URL
```

---

### 문제 3: PostgreSQL 연결 실패

**증상**:
```
Error: connect ECONNREFUSED postgres:5432
```

**해결**:
```bash
# 1. PostgreSQL 상태 확인
systemctl status postgresql

# 2. n8n DB 연결 테스트
psql -h postgres -U postgres -d n8n

# 3. DATABASE_URL 확인
echo $DATABASE_URL

# 4. /etc/hosts 확인
cat /etc/hosts | grep postgres
```

---

### 문제 4: nl-query AI 파싱 실패

**증상**:
```
Error: AI model failed to parse query
```

**해결**:
```bash
# 1. Azure OpenAI 키 확인
echo $AZURE_OPENAI_API_KEY

# 2. 엔드포인트 확인
curl $AZURE_OPENAI_ENDPOINT

# 3. 다른 모델로 재시도
mcp__nl_query__nl_query({
  query: '...',
  model: 'gemini-2.0-flash'  # Azure 대신 Gemini 사용
})

# 4. 파싱만 테스트
mcp__nl_query__test_parse({
  query: '...'
})
```

---

### 문제 5: claude-investigation 보고서 생성 실패

**증상**:
```
Error: Failed to generate report
```

**해결**:
```bash
# 1. 데이터 수집 테스트
mcp__claude_investigation__collect_incident_data({
  incident_id: '888-000485'
})

# 2. analysis 객체 구조 확인
# final_verdict 필수 체크

# 3. public/reports 디렉토리 권한 확인
ls -la public/reports/

# 4. 디스크 공간 확인
df -h /www/ib-editor/my-app/public/reports/
```

---

### 문제 6: incident-analysis MCP 타임아웃

**증상**:
```
Error: Request timeout
```

**해결**:
```bash
# 1. MCP 서버 상태 확인
curl http://20.41.120.173:8100/health

# 2. days 파라미터 줄이기
mcp__incident_analysis__get_incident_statistics({
  days: 1  # 7 → 1로 감소
})

# 3. index_pattern 좁히기
mcp__incident_analysis__get_incident_statistics({
  index_pattern: 'logs-cortex_xdr-incidents-2025.11.09'  # 특정 날짜만
})
```

---

### 문제 7: memory 지식 그래프 손상

**증상**:
```
Error: Failed to read graph
```

**해결**:
```bash
# 1. 저장 위치 확인
ls -la ~/.mcp/memory/

# 2. 백업 복구 (있는 경우)
cp ~/.mcp/memory/backup.json ~/.mcp/memory/graph.json

# 3. 새로 시작 (주의: 기존 데이터 삭제)
rm -rf ~/.mcp/memory/
```

---

## 참고 자료

### 관련 문서
- **AUTOMATION_PIPELINE_ANALYSIS.md**: 자동화 파이프라인 분석
- **COMPLETE_DAILY_REPORT_ARCHITECTURE.md**: 완전한 아키텍처 가이드
- **CLAUDE.md**: 프로젝트 가이드

### 웹 인터페이스
- **문서 포털**: http://localhost:40017/reports/
- **아키텍처 가이드**: http://localhost:40017/reports/COMPLETE_DAILY_REPORT_ARCHITECTURE.html
- **일간 보고서**: http://localhost:40017/reports/daily/

### 외부 링크
- **MCP 공식 문서**: https://modelcontextprotocol.io/
- **OpenSearch 문서**: https://opensearch.org/docs/
- **Cortex XDR 문서**: https://docs-cortex.paloaltonetworks.com/

---

**작성자**: Claude Code (Sonnet 4.5)
**버전**: 1.0
**마지막 업데이트**: 2025-11-11

🤖 **DeFender X SIEM - AI 기반 보안 인시던트 분석 시스템**
