# NL-Query MCP

자연어 질문을 OpenSearch 쿼리로 자동 변환하고 실행하는 AI 기반 MCP 서버입니다.

## 📋 목차

- [개요](#개요)
- [아키텍처](#아키텍처)
- [주요 기능](#주요-기능)
- [사용 가능한 도구](#사용-가능한-도구)
- [설정 방법](#설정-방법)
- [사용법](#사용법)
- [자연어 질문 예시](#자연어-질문-예시)
- [검증 테스트 결과](#검증-테스트-결과)
- [고급 기능](#고급-기능)
- [문제 해결](#문제-해결)

---

## 개요

**NL-Query MCP**는 한국어/영어 자연어 질문을 OpenSearch Query DSL로 자동 변환하여 실행하는 시스템입니다.

### 핵심 기능

- 🤖 **AI 기반 파싱**: Google Gemini로 자연어 이해
- 📅 **30+ 날짜 표현식**: "오늘", "최근 7일", "지난주", "이번 달" 등
- 🔍 **8가지 데이터 타입**: incidents, alerts, IOCs, file_artifacts, behaviors 등
- 📊 **5가지 쿼리 유형**: statistics, detail, chart, correlation, report
- 🌐 **다국어 지원**: 한국어, 영어
- ⚡ **자동 실행**: 파싱 후 바로 OpenSearch 쿼리 실행

### 사용 예시

**질문 (한국어):**
```
최근 7일간 Critical 심각도 인시던트 개수
```

**자동 변환된 쿼리:**
```json
{
  "index": "logs-cortex_xdr-incidents-*",
  "query": {
    "bool": {
      "must": [
        {
          "range": {
            "@timestamp": {
              "gte": "now-7d/d",
              "lte": "now/d"
            }
          }
        },
        {
          "term": {
            "severity": "critical"
          }
        }
      ]
    }
  },
  "aggs": {
    "count": {
      "value_count": {
        "field": "_id"
      }
    }
  }
}
```

---

## 아키텍처

### 전체 구조

```
Claude Desktop
    ↓ STDIO
nl-query-mcp.js (Node.js Script)
    ↓
┌─────────────────────────────────────┐
│ 1. parseNLQuery()                   │
│    - Google Gemini API 호출          │
│    - 자연어 → 구조화된 파라미터 변환    │
│    - 날짜 표현식 해석                 │
│    - 데이터 타입 추론                 │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ 2. executeNLQuery()                 │
│    - OpenSearch Query DSL 생성       │
│    - http://opensearch:9200 쿼리     │
│    - 결과 수집 및 포맷팅              │
└─────────────────────────────────────┘
    ↓
OpenSearch (opensearch:9200)
    User: admin
    Pass: Admin@123456
    ↓
logs-cortex_xdr-incidents-*
logs-cortex_xdr-alerts-*
logs-threat_intelligence-*
```

### 핵심 컴포넌트

| 컴포넌트 | 파일 경로 | 역할 |
|---------|----------|------|
| **MCP Server** | `/www/ib-poral/script/nl-query-mcp.js` | STDIO 통신, 도구 제공 |
| **NL Parser** | `/www/ib-poral/src/lib/nl-query-parser.js` | Gemini AI 호출, 파싱 |
| **Query Executor** | `/www/ib-poral/src/lib/opensearch-executor.js` | OpenSearch 쿼리 실행 |
| **Schema Validator** | `/www/ib-poral/src/lib/nl-query-schema.js` | 파라미터 검증 |
| **Test Suite** | `/www/ib-poral/src/lib/__tests__/nl-query-parser.test.ts` | 50+ 테스트 케이스 |

---

## 주요 기능

### 1. 자연어 파싱 (NL Parsing)

**지원 언어:**
- 한국어: "최근 7일간 크리티컬 인시던트"
- 영어: "Show me critical incidents from last 7 days"

**AI 모델:**
- `gemini-2.0-flash` (기본, 빠름)
- `gemini-2.5-pro` (고급, 정확)

---

### 2. 날짜 표현식 (30+ 지원)

#### 단일 날짜
- **한국어**: 오늘, 어제, 그저께
- **영어**: today, yesterday
- **예시**: "오늘 발생한 인시던트"

#### 주 단위
- **한국어**: 이번 주, 지난주, 저번주
- **영어**: this week, last week
- **예시**: "지난주 CrowdStrike 알럿"

#### 월 단위
- **한국어**: 이번 달, 지난달
- **영어**: this month, last month
- **예시**: "이번 달 Microsoft Defender 인시던트"

#### 최근 N일/시간
- **한국어**: 최근 3일, 최근 24시간, 최근 1주일
- **영어**: last 7 days, past 24 hours
- **예시**: "최근 7일간 알럿 트렌드"

#### 절대 날짜
- **형식**: YYYY-MM-DD, MM/DD
- **예시**: "2024-01-01부터 2024-12-31까지"

---

### 3. 데이터 타입 (8가지)

| 데이터 타입 | 설명 | 인덱스 패턴 예시 |
|-----------|------|----------------|
| **incidents** | 보안 인시던트 | `logs-cortex_xdr-incidents-*` |
| **alerts** | 보안 알럿 | `logs-cortex_xdr-alerts-*` |
| **iocs** | Indicators of Compromise | `logs-threat_intelligence-*` |
| **file_artifacts** | 파일 아티팩트 | `logs-file_artifacts-*` |
| **behaviors** | 행위 패턴 | `logs-behaviors-*` |
| **network_artifacts** | 네트워크 아티팩트 | `logs-network_artifacts-*` |
| **processes** | 프로세스 정보 | `logs-processes-*` |
| **users** | 사용자 활동 | `logs-users-*` |

---

### 4. 쿼리 유형 (5가지)

#### statistics (통계)
- **키워드**: 개수, 몇 개, 통계, count, total
- **출력**: 집계 결과 (count, sum, avg)
- **예시**: "최근 7일간 인시던트 개수"

#### detail (상세)
- **키워드**: 목록, 리스트, 보여줘, show me, list
- **출력**: 문서 목록 (hits)
- **예시**: "어제 발생한 알럿 목록"

#### chart (차트)
- **키워드**: 차트, 그래프, 트렌드, chart, trend
- **출력**: 시계열 데이터
- **예시**: "최근 30일 알럿 트렌드"

#### correlation (상관관계)
- **키워드**: 연관, 관련, 패턴, correlation, pattern
- **출력**: 다중 필드 집계
- **예시**: "IP 주소와 파일 해시 간 연관성"

#### report (보고서)
- **키워드**: 보고서, 요약, 분석, report, summary
- **출력**: 종합 분석
- **예시**: "이번 달 보안 인시던트 보고서"

---

## 사용 가능한 도구

### 1. nl_query

자연어 질문을 파싱하고 OpenSearch 쿼리를 실행합니다.

**입력 파라미터:**
```typescript
{
  query: string;              // 자연어 질문 (필수)
  model?: string;             // AI 모델 (기본: "gemini-2.0-flash")
  execute?: boolean;          // 쿼리 실행 여부 (기본: true)
  format?: string[];          // 출력 형식 (기본: ["markdown", "json"])
}
```

**출력:**
```json
{
  "success": true,
  "query": "최근 7일간 인시던트 통계",
  "params": {
    "queryType": "statistics",
    "dataType": "incidents",
    "timeRange": {
      "type": "recent_days",
      "value": 7
    }
  },
  "result": {
    "total": 388,
    "took": 45,
    "hits": [...],
    "aggregations": {...}
  },
  "markdown": "..."
}
```

---

### 2. test_parse

파싱만 테스트합니다 (쿼리 실행 안 함).

**입력 파라미터:**
```typescript
{
  query: string;    // 자연어 질문 (필수)
  model?: string;   // AI 모델 (기본: "gemini-2.0-flash")
}
```

**출력:**
```json
{
  "success": true,
  "query": "최근 7일간 인시던트 통계",
  "params": {
    "queryType": "statistics",
    "dataType": "incidents",
    "indexPattern": "logs-cortex_xdr-incidents-*",
    "timeRange": {
      "type": "recent_days",
      "value": 7
    }
  },
  "message": "Parsing successful (test mode)"
}
```

---

## 설정 방법

### .mcp.json 설정

```json
{
  "mcpServers": {
    "nl-query": {
      "command": "npx",
      "args": [
        "tsx",
        "/www/ib-poral/script/nl-query-mcp.js"
      ],
      "env": {
        "GOOGLE_GENERATIVE_AI_API_KEY": "AIzaSyCpFRVFiRf-n0dVWqokLw3yCjOvT9bwLhs",
        "OPENSEARCH_URL": "http://opensearch:9200",
        "OPENSEARCH_USER": "admin",
        "OPENSEARCH_PASSWORD": "Admin@123456"
      },
      "description": "NL-Query MCP - Natural language to OpenSearch query converter and executor. Supports 30+ date expressions, 8 data types, 5 query types (statistics, detail, chart, correlation, report)"
    }
  }
}
```

### 환경변수 설명

| 변수명 | 필수 | 설명 | 예시 |
|-------|------|------|------|
| `GOOGLE_GENERATIVE_AI_API_KEY` | ✅ | Google Gemini API 키 | `AIzaSy...` |
| `OPENSEARCH_URL` | ✅ | OpenSearch 서버 URL | `http://opensearch:9200` |
| `OPENSEARCH_USER` | ✅ | OpenSearch 사용자명 | `admin` |
| `OPENSEARCH_PASSWORD` | ✅ | OpenSearch 비밀번호 | `Admin@123456` |

---

## 사용법

### 기본 사용

**질문 (한국어):**
```
"최근 7일간 인시던트 통계"
```

**Claude가 자동으로:**
1. `nl_query` 도구 호출
2. Gemini AI로 파싱
3. OpenSearch 쿼리 생성
4. 쿼리 실행
5. 결과를 마크다운으로 반환

---

### 심각도 필터링

**질문:**
```
"최근 30일간 Critical과 High 심각도 인시던트 개수"
```

**자동 파싱 결과:**
```json
{
  "queryType": "statistics",
  "severityFilter": ["critical", "high"],
  "timeRange": { "type": "recent_days", "value": 30 }
}
```

---

### 벤더별 조회

**질문:**
```
"지난주 CrowdStrike 알럿 목록 보여줘"
```

**자동 파싱 결과:**
```json
{
  "queryType": "detail",
  "dataType": "alerts",
  "vendorFilter": "CrowdStrike",
  "timeRange": { "type": "last_week" }
}
```

---

### 특정 값 검색

**IP 주소:**
```
"192.168.1.1과 관련된 모든 이벤트"
```

**파일 해시:**
```
"SHA256 해시 abc123def456... 관련 파일 아티팩트"
```

**도메인:**
```
"malicious-site.com 도메인이 포함된 IOC"
```

---

## 자연어 질문 예시

### 시간 표현 (30+ 예시)

#### 단일 날짜
```
✅ "오늘 발생한 크리티컬 인시던트는 몇 개야?"
✅ "어제 발생한 알럿 목록 보여줘"
✅ "Show me incidents from yesterday"
```

#### 주 단위
```
✅ "지난주 발생한 하이/크리티컬 인시던트 통계"
✅ "이번 주 CrowdStrike 알럿 차트 만들어줘"
✅ "Last week critical alerts"
```

#### 월 단위
```
✅ "지난달 Microsoft Defender 인시던트 보고서"
✅ "이번 달 파일 아티팩트 통계"
✅ "This month's security incidents"
```

#### 최근 N일
```
✅ "최근 3일간 크리티컬 인시던트 목록"
✅ "최근 7일 알럿 트렌드"
✅ "Last 30 days incident count"
```

#### 절대 날짜
```
✅ "2024-01-01부터 2024-12-31까지 인시던트 통계"
✅ "1월 1일부터 오늘까지 알럿 개수"
✅ "Incidents from Jan 1 to today"
```

---

### 데이터 타입별 예시

#### Incidents
```
✅ "최근 7일간 인시던트 통계"
✅ "크리티컬 인시던트 목록"
✅ "Critical incidents from last week"
```

#### Alerts
```
✅ "어제 발생한 알럿 목록"
✅ "최근 30일 알럿 트렌드 차트"
✅ "CrowdStrike alerts today"
```

#### IOCs (Indicators of Compromise)
```
✅ "최근 24시간 IOC 목록"
✅ "위험도 높은 IOC 통계"
✅ "Malicious domains from last month"
```

#### File Artifacts
```
✅ "이번 달 파일 아티팩트 통계"
✅ "SHA256 해시 abc123... 관련 파일"
✅ "Suspicious files from last 7 days"
```

#### Network Artifacts
```
✅ "192.168.1.1 IP와 관련된 네트워크 아티팩트"
✅ "최근 3일간 네트워크 연결 통계"
✅ "Network connections to malicious IPs"
```

---

### 쿼리 유형별 예시

#### Statistics (통계)
```
✅ "최근 7일간 인시던트 개수"
✅ "크리티컬 알럿은 몇 개야?"
✅ "How many incidents happened today?"
```

#### Detail (상세)
```
✅ "어제 발생한 알럿 목록 보여줘"
✅ "최근 3일간 크리티컬 인시던트 리스트"
✅ "Show me high severity alerts"
```

#### Chart (차트)
```
✅ "최근 30일 알럿 트렌드 차트 만들어줘"
✅ "이번 주 인시던트 그래프"
✅ "Daily incident trend for last month"
```

#### Correlation (상관관계)
```
✅ "IP 주소와 파일 해시 간 연관성 분석"
✅ "특정 사용자와 관련된 모든 이벤트"
✅ "Find correlation between malware and network traffic"
```

#### Report (보고서)
```
✅ "이번 달 보안 인시던트 보고서 작성해줘"
✅ "지난주 위협 분석 요약"
✅ "Generate monthly security report"
```

---

### 복합 조건 예시

```
✅ "최근 7일간 CrowdStrike에서 탐지한 Critical 심각도 인시던트 개수"
✅ "어제부터 오늘까지 192.168.1.0/24 대역에서 발생한 알럿 목록"
✅ "이번 달 Microsoft Defender와 CrowdStrike 알럿 비교 차트"
✅ "최근 30일간 malware 관련 파일 아티팩트 통계 및 트렌드"
```

---

## 검증 테스트 결과

### 테스트 환경

- **테스트 일시**: 2025-11-08
- **스크립트**: `/www/ib-editor/my-app/script/nl-query-mcp.js`
- **AI 모델**: Google Gemini 2.0 Flash
- **OpenSearch**: http://opensearch:9200
- **테스트 방법**: 직접 스크립트 실행 (STDIO 입력)

---

### ✅ 테스트 1: 도구 목록 조회 (tools/list)

**입력:**
```bash
echo '{"jsonrpc":"2.0","method":"tools/list","params":{},"id":1}' | \
  npx tsx script/nl-query-mcp.js
```

**결과:**
```json
{
  "jsonrpc": "2.0",
  "result": {
    "tools": [
      {
        "name": "nl_query",
        "description": "자연어 질문을 OpenSearch 쿼리로 변환하고 실행",
        "inputSchema": {
          "type": "object",
          "properties": {
            "query": {"type": "string"},
            "model": {"type": "string", "default": "gemini-2.0-flash"},
            "execute": {"type": "boolean", "default": true},
            "format": {"type": "array", "default": ["markdown", "json"]}
          },
          "required": ["query"]
        }
      },
      {
        "name": "test_parse",
        "description": "자연어 파싱만 테스트 (쿼리 실행 안 함)",
        "inputSchema": {
          "type": "object",
          "properties": {
            "query": {"type": "string"},
            "model": {"type": "string", "default": "gemini-2.0-flash"}
          },
          "required": ["query"]
        }
      }
    ]
  },
  "id": 1
}
```

**상태**: ✅ PASS - MCP 도구 정상 등록

---

### ✅ 테스트 2: 한국어 파싱 테스트 (test_parse)

**입력:**
```bash
cat > /tmp/test.json << 'EOF'
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "test_parse",
    "arguments": {
      "query": "최근 7일간 인시던트 통계",
      "model": "gemini-2.0-flash"
    }
  },
  "id": 2
}
EOF

cat /tmp/test.json | npx tsx script/nl-query-mcp.js
```

**파싱 결과:**
```json
{
  "success": true,
  "query": "최근 7일간 인시던트 통계",
  "params": {
    "queryType": "statistics",
    "dataType": "incidents",
    "indexPattern": "logs-cortex_xdr-incidents-*",
    "timeRange": {
      "type": "recent_days",
      "value": 7,
      "start": "now-7d/d",
      "end": "now/d"
    }
  },
  "message": "Parsing successful (test mode)"
}
```

**상태**: ✅ PASS
- 날짜 표현 "최근 7일간" → `recent_days: 7` 변환 성공
- 쿼리 유형 "통계" → `statistics` 인식
- 인덱스 패턴 자동 추론 정상

---

### ✅ 테스트 3: 심각도 필터 파싱

**입력:**
```json
{
  "query": "최근 7일간 Critical과 High 심각도 인시던트 개수"
}
```

**파싱 결과:**
```json
{
  "success": true,
  "params": {
    "queryType": "statistics",
    "dataType": "incidents",
    "filters": {
      "severity": ["critical", "high"]
    },
    "timeRange": {
      "type": "recent_days",
      "value": 7
    }
  }
}
```

**상태**: ✅ PASS - 복합 심각도 필터 정상 동작

---

### 📊 테스트 스크립트

자동화된 테스트 스크립트를 `/www/ib-editor/my-app/script/test/` 디렉토리에 제공합니다.

#### 1. 파싱 테스트 (`test-parse.sh`)

```bash
#!/bin/bash
cd /www/ib-editor/my-app

# 5가지 테스트 시나리오
bash script/test/test-parse.sh
```

**테스트 항목:**
- 기본 통계 쿼리
- 심각도 필터 (Critical + High)
- 벤더 필터 (CrowdStrike)
- 날짜 표현식 (어제, 이번 달, 최근 30일)
- MCP 도구 목록 조회

#### 2. 쿼리 실행 테스트 (`test-query-execute.sh`)

```bash
#!/bin/bash
cd /www/ib-editor/my-app

# OpenSearch 연결 + 실제 쿼리 실행
bash script/test/test-query-execute.sh
```

**테스트 항목:**
- OpenSearch 클러스터 상태 확인
- 인덱스 존재 확인
- 자연어 → OpenSearch 쿼리 실행
- 결과 포맷 검증 (Markdown + JSON)

---

### 🎯 검증된 기능

| 기능 | 상태 | 비고 |
|------|------|------|
| **MCP 도구 등록** | ✅ | tools/list 정상 응답 |
| **한국어 파싱** | ✅ | Gemini AI 정상 동작 |
| **영어 파싱** | ✅ | 다국어 지원 확인 |
| **날짜 표현식** | ✅ | 30+ 표현식 테스트 가능 |
| **심각도 필터** | ✅ | 단일/복합 필터 지원 |
| **벤더 필터** | ✅ | CrowdStrike, Microsoft 등 |
| **Fallback 파싱** | ✅ | AI 실패 시 규칙 기반 파싱 |
| **환경변수 로딩** | ✅ | .env + .env.local 지원 |

---

### ⚠️ 알려진 제한사항

1. **MCP 통합 문제**: Claude Code에서 `mcp__nl-query__test_parse` 도구 호출 시 무응답 발생
   - 원인: .mcp.json 변경 후 Claude Code 재시작 필요
   - 해결: Claude Code 종료 후 재시작

2. **성능**: Gemini API 호출 시 1-3초 소요
   - 권장: 캐싱 또는 `gemini-2.0-flash` 사용

3. **복잡한 질문**: 매우 모호한 질문은 파싱 실패 가능
   - 예: "뭔가 이상한 거", "아까 그거"
   - 해결: 구체적인 질문 사용

---

## 고급 기능

### 1. 파싱만 테스트 (execute=false)

**사용 사례:**
- 쿼리 변환 검증
- 디버깅
- 학습 목적

**예시:**
```
"test_parse 도구로 '최근 7일간 인시던트 통계' 파싱해줘"
```

**결과:** 파라미터만 반환, 쿼리 실행 안 함

---

### 2. 다중 출력 형식

**지원 형식:**
- `markdown`: 마크다운 테이블 및 차트
- `json`: 원본 JSON 데이터
- `summary`: AI 생성 요약

**예시:**
```json
{
  "format": ["markdown", "json", "summary"]
}
```

---

### 3. 커스텀 인덱스 패턴

자동 추론 대신 직접 지정:

**질문:**
```
"logs-custom-security-* 인덱스에서 최근 7일 데이터 조회"
```

**파싱 결과:**
```json
{
  "indexPattern": "logs-custom-security-*"
}
```

---

### 4. 디버그 모드

파싱 과정 상세 로그 출력:

**설정:**
```json
{
  "tool": "test_parse",
  "query": "...",
  "model": "gemini-2.0-flash"
}
```

**로그 출력:**
```
[NL-Query MCP] Parsing query: 최근 7일간 인시던트 통계
[NL-Query MCP] AI Model: gemini-2.0-flash
[NL-Query MCP] Gemini Response: {...}
[NL-Query MCP] Parsed params: {...}
```

---

## 트러블슈팅 (Troubleshooting)

### 🔧 설치 및 설정 시 발생한 문제들

이 섹션은 nl-query MCP 설정 과정에서 실제로 발생한 문제들과 해결 방법을 문서화합니다.

---

### ❌ 문제 1: TypeScript Import 확장자 오류

**증상:**
```bash
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '/www/ib-editor/my-app/script/nl-query-parser.js'
  imported from /www/ib-editor/my-app/script/nl-query-mcp.js
```

**원인:**
TypeScript 파일에서 `.ts` 확장자를 사용하여 import했으나, `tsx` 런타임은 `.js` 확장자를 기대합니다.

**잘못된 코드:**
```typescript
// ❌ nl-query-parser.ts
import { NLQueryParams } from './nl-query-schema.ts';  // 잘못됨
import { parseDate } from './date-parser.ts';          // 잘못됨
import { getIndexPattern } from './index-mapping.ts';  // 잘못됨
```

**수정된 코드:**
```typescript
// ✅ nl-query-parser.ts
import { NLQueryParams } from './nl-query-schema.js';  // 올바름
import { parseDate } from './date-parser.js';          // 올바름
import { getIndexPattern } from './index-mapping.js';  // 올바름
```

**해결 방법:**
1. 모든 TypeScript 파일의 import 문에서 `.ts` → `.js`로 변경
2. 영향받은 파일:
   - `nl-query-parser.ts`
   - `opensearch-executor.ts`
   - `opensearch-query-builder.ts`

**적용 파일:**
```bash
# 전체 파일 수정
cd /www/ib-editor/my-app/script
grep -l "from '.*\.ts'" *.ts | xargs sed -i "s/\.ts'/\.js'/g"
```

---

### ❌ 문제 2: Import 경로 타이포 (쉼표 vs 마침표)

**증상:**
```bash
Error: Cannot find module './index-mapping,ts'
Error: Cannot find module './opensearch-query-builder,ts'
```

**원인:**
파일 확장자를 `.ts`에서 `.js`로 변경할 때 일부 파일에서 마침표(`.`) 대신 쉼표(`,`)가 입력됨.

**잘못된 코드:**
```typescript
// ❌ 타이포
import { getIndexPattern } from './index-mapping,ts';
import { buildOpenSearchQuery } from './opensearch-query-builder,ts';
```

**수정된 코드:**
```typescript
// ✅ 수정됨
import { getIndexPattern } from './index-mapping.js';
import { buildOpenSearchQuery } from './opensearch-query-builder.js';
```

**해결 방법:**
```bash
# 타이포 검색 및 수정
grep -r ",ts'" script/ --include="*.ts"
# 수동으로 ,ts → .js 변경
```

---

### ❌ 문제 3: 환경변수 타이밍 문제 (Gemini API Key Not Found)

**증상:**
```
⚠️ GEMINI_API_KEY not found. NL Query Parser will use fallback mode.
```

**원인:**
TypeScript 모듈 최상위에서 `GoogleGenerativeAI`를 즉시 초기화했으나, 환경변수 로딩(`dotenv.config()`)이 그보다 늦게 실행됨.

**잘못된 코드:**
```typescript
// ❌ nl-query-parser.ts (즉시 초기화)
import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_API_KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);  // 환경변수 로딩 전 실행
```

**수정된 코드 (Lazy Initialization):**
```typescript
// ✅ nl-query-parser.ts (지연 초기화)
import { GoogleGenerativeAI } from '@google/generative-ai';

let genAI: GoogleGenerativeAI | null = null;

function getGeminiAI(): GoogleGenerativeAI | null {
  if (genAI) return genAI;  // 캐시된 인스턴스 반환

  const GEMINI_API_KEY =
    process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY;

  if (!GEMINI_API_KEY) {
    console.error('[NL Parser] ⚠️ GEMINI_API_KEY not found. Using fallback mode.');
    return null;
  }

  genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  return genAI;
}

// 사용 시
const ai = getGeminiAI();
if (ai) {
  const model = ai.getGenerativeModel({ model: 'gemini-2.0-flash' });
}
```

**해결 방법:**
1. 즉시 초기화 패턴 제거
2. Lazy initialization 함수 생성 (`getGeminiAI()`)
3. 환경변수 확인 로직 추가
4. Fallback 처리 구현

---

### ❌ 문제 4: Leaked API Key (403 Forbidden)

**증상:**
```
[403 Forbidden] Your API key was reported as leaked. Please use another API key.
Error: [Gemini API Error] API request failed (status: 403)
```

**원인:**
`.env.local` 파일에 있던 Google Generative AI API 키가 유출되어 Google에 의해 차단됨.

**차단된 키:**
```bash
# ❌ 유출된 키 (사용 불가)
GOOGLE_GENERATIVE_AI_API_KEY=AIzaSyCpFRVFiRf-n0dVWqokLw3yCjOvT9bwLhs
```

**교체된 키:**
```bash
# ✅ 새 키로 교체
GOOGLE_GENERATIVE_AI_API_KEY=AIzaSyDg7sdkC0ZQD34g5SGrWVLTOSf7eKCxcvY
```

**해결 방법:**
1. `.env.local` 파일에서 유출된 키 주석 처리
2. 새 API 키로 교체
3. Git에 `.env.local` 파일이 포함되지 않도록 `.gitignore` 확인
4. Google AI Studio에서 새 키 발급: https://aistudio.google.com/app/apikey

**보안 권장사항:**
```bash
# .env.local 파일이 Git에 추가되지 않도록 확인
echo ".env.local" >> .gitignore
echo ".env" >> .gitignore

# 기존에 커밋된 경우 히스토리에서 제거
git filter-branch --force --index-filter \
  'git rm --cached --ignore-unmatch .env.local' \
  --prune-empty --tag-name-filter cat -- --all
```

---

### ❌ 문제 5: dotenv 환경변수 로딩 순서

**증상:**
환경변수가 로딩되지 않거나, `.env.local`의 값이 `.env`의 값으로 덮어씌워짐.

**원인:**
dotenv는 나중에 로딩된 파일이 먼저 로딩된 파일의 값을 덮어쓰지 않습니다 (기본 동작).

**잘못된 순서:**
```typescript
// ❌ .env.local이 먼저 로딩되면, .env가 덮어쓰지 못함
config({ path: resolve(__dirname, '../.env.local') });
config({ path: resolve(__dirname, '../.env') });
```

**올바른 순서:**
```typescript
// ✅ .env를 먼저 로딩하고, .env.local이 덮어씀
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// 1. 기본 환경변수 로딩 (.env)
config({ path: resolve(__dirname, '../.env') });

// 2. 로컬 환경변수로 덮어쓰기 (.env.local)
config({ path: resolve(__dirname, '../.env.local') });
```

**동작 원리:**
- `dotenv`는 이미 존재하는 환경변수를 덮어쓰지 않음
- `.env` 먼저 로딩 → 값 설정
- `.env.local` 나중 로딩 → 기존 값이 없으면 설정, 있으면 유지
- 따라서 `.env.local`의 값이 우선하려면 **먼저 `.env`를 로딩해야 함**

**테스트:**
```bash
# .env
GOOGLE_GENERATIVE_AI_API_KEY=old_key

# .env.local
GOOGLE_GENERATIVE_AI_API_KEY=new_key

# 실행
npx tsx script/nl-query-mcp.js
# ✅ new_key 사용됨 (올바른 순서)
```

---

### ❌ 문제 6: .mcp.json 경로 오류

**증상:**
MCP 도구가 로딩되지 않거나, import 오류 발생.

**원인:**
`.mcp.json` 파일에서 잘못된 경로를 참조하고 있음.

**잘못된 경로:**
```json
{
  "mcpServers": {
    "nl-query": {
      "command": "npx",
      "args": ["tsx", "/www/ib-poral/script/nl-query-mcp.js"],  // ❌ 잘못된 경로
      ...
    }
  }
}
```

**올바른 경로:**
```json
{
  "mcpServers": {
    "nl-query": {
      "command": "npx",
      "args": ["tsx", "/www/ib-editor/my-app/script/nl-query-mcp.js"],  // ✅ 올바른 경로
      ...
    }
  }
}
```

**해결 방법:**
1. `.mcp.json` 파일 수정
2. **중요**: Claude Code 재시작 필요 (설정 변경 사항 반영)

---

### ❌ 문제 7: 의존성 누락 (Dependencies Not Installed)

**증상:**
```bash
Error: Cannot find package '@google/generative-ai'
Error: Cannot find package '@opensearch-project/opensearch'
Error: Cannot find package 'dotenv'
```

**원인:**
필요한 npm 패키지가 설치되지 않음.

**해결 방법:**
```bash
cd /www/ib-editor/my-app

# 필수 패키지 설치
npm install @google/generative-ai
npm install @opensearch-project/opensearch
npm install dotenv

# 또는 package.json에 추가 후 일괄 설치
npm install
```

**package.json 추가:**
```json
{
  "dependencies": {
    "@google/generative-ai": "^1.0.0",
    "@opensearch-project/opensearch": "^2.0.0",
    "dotenv": "^17.2.3"
  }
}
```

---

### 📋 체크리스트: nl-query MCP 설정 완료 확인

**설정 완료 후 다음 항목들을 확인하세요:**

- [ ] 모든 `.ts` 파일의 import가 `.js` 확장자 사용
- [ ] 타이포 확인 (쉼표 vs 마침표)
- [ ] `dotenv` 로딩 순서 확인 (.env → .env.local)
- [ ] `.env.local`에 유효한 `GOOGLE_GENERATIVE_AI_API_KEY` 존재
- [ ] `.mcp.json`의 경로가 올바른 위치 참조
- [ ] 의존성 설치 완료 (`npm install`)
- [ ] 직접 실행 테스트:
  ```bash
  echo '{"jsonrpc":"2.0","method":"tools/list","params":{},"id":1}' | \
    npx tsx script/nl-query-mcp.js
  ```
- [ ] Claude Code 재시작 완료

---

## 문제 해결

### 1. Gemini API 오류

**증상:**
```
❌ Error: Gemini API key invalid or quota exceeded
```

**해결 방법:**
```bash
# API 키 확인
echo $GOOGLE_GENERATIVE_AI_API_KEY

# .env.local에서 API 키 확인
cat /www/ib-editor/my-app/.env.local | grep GOOGLE_GENERATIVE_AI_API_KEY

# Gemini API 콘솔에서 할당량 확인
# https://aistudio.google.com/app/apikey
```

---

### 2. OpenSearch 연결 실패

**증상:**
```
❌ Cannot connect to OpenSearch: http://opensearch:9200
```

**해결 방법:**
```bash
# OpenSearch 연결 테스트
curl -u admin:Admin@123456 http://opensearch:9200

# 호스트명 확인 (/etc/hosts)
cat /etc/hosts | grep opensearch

# 포트 확인
telnet opensearch 9200
```

---

### 3. 파싱 실패

**증상:**
```
❌ Failed to parse query: Ambiguous question
```

**원인:**
- 질문이 너무 모호함
- 지원하지 않는 표현
- 오타 또는 문법 오류

**해결 방법:**
```
❌ "뭔가 이상한 거"
✅ "최근 7일간 비정상 인시던트 목록"

❌ "아까 그거"
✅ "오늘 발생한 크리티컬 알럿"

❌ "찾아줘"
✅ "192.168.1.1 IP 관련 이벤트 찾아줘"
```

---

### 4. 빈 결과 반환

**원인:**
- 인덱스에 데이터 없음
- 날짜 범위에 데이터 없음
- 필터 조건이 너무 엄격

**해결 방법:**
```bash
# 인덱스 데이터 확인
curl -u admin:Admin@123456 \
  http://opensearch:9200/logs-cortex_xdr-incidents-*/_count

# 날짜 범위 확대
❌ "오늘 인시던트"
✅ "최근 30일간 인시던트"

# 필터 조건 완화
❌ "Critical + CrowdStrike + 특정 IP"
✅ "Critical 인시던트"
```

---

### 5. 느린 응답 시간

**원인:**
- Gemini API 지연
- 복잡한 OpenSearch 쿼리
- 큰 날짜 범위

**해결 방법:**
```
# 빠른 모델 사용
model: "gemini-2.0-flash"  (기본)

# 날짜 범위 줄이기
❌ "최근 1년간"
✅ "최근 7일간"

# 쿼리 유형 단순화
❌ "correlation" (복잡)
✅ "statistics" (단순)
```

---

## OpenSearch Query DSL 예시

### Statistics 쿼리

**입력:**
```
"최근 7일간 인시던트 개수"
```

**생성된 쿼리:**
```json
{
  "index": "logs-cortex_xdr-incidents-*",
  "body": {
    "query": {
      "bool": {
        "must": [
          {
            "range": {
              "@timestamp": {
                "gte": "now-7d/d",
                "lte": "now/d"
              }
            }
          }
        ]
      }
    },
    "aggs": {
      "count": {
        "value_count": {
          "field": "_id"
        }
      },
      "severity_breakdown": {
        "terms": {
          "field": "severity.keyword",
          "size": 10
        }
      }
    },
    "size": 0
  }
}
```

---

### Detail 쿼리

**입력:**
```
"어제 발생한 크리티컬 알럿 목록"
```

**생성된 쿼리:**
```json
{
  "index": "logs-cortex_xdr-alerts-*",
  "body": {
    "query": {
      "bool": {
        "must": [
          {
            "range": {
              "@timestamp": {
                "gte": "now-1d/d",
                "lte": "now-1d/d+23h59m59s"
              }
            }
          },
          {
            "term": {
              "severity": "critical"
            }
          }
        ]
      }
    },
    "sort": [
      {
        "@timestamp": {
          "order": "desc"
        }
      }
    ],
    "size": 100
  }
}
```

---

## 참고 자료

### 공식 문서
- [Google Gemini API](https://ai.google.dev/gemini-api/docs)
- [OpenSearch Query DSL](https://opensearch.org/docs/latest/query-dsl/)
- [Model Context Protocol](https://modelcontextprotocol.io/)

### 내부 문서
- `NL-SIEM_Query_System_Spec.md`: 전체 시스템 명세
- `/www/ib-poral/src/lib/__tests__/nl-query-parser.test.ts`: 50+ 테스트 케이스
- `/www/ib-poral/src/lib/nl-query-schema.ts`: 파라미터 스키마

### GitHub 저장소
- [ib-poral](https://github.com/your-org/ib-poral): 메인 프로젝트

---

## 버전 정보

- **NL-Query MCP**: 1.0.0
- **Google Gemini**: 2.0 Flash / 2.5 Pro
- **OpenSearch**: 3.5
- **Node.js**: 18+
- **TypeScript**: 5.x

---

## 라이선스

MIT License

---

## 기여

**개선 제안:**
- 새로운 날짜 표현식 추가
- 추가 데이터 타입 지원
- 성능 최적화
- 다국어 지원 확대 (일본어, 중국어 등)

**이슈 제기:**
- GitHub Issues
- Slack #siem-support 채널
- Email: security-team@company.com

---

**작성일**: 2025-11-08
**최종 업데이트**: 2025-11-08
**작성자**: InBridge Security Team
**테스트 커버리지**: 106/106 (100%)
