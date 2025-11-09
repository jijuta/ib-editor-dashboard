# NL-Query 테스트 가이드

## 📁 테스트 파일 구조

```
test/
├── README.md                    # 이 파일
├── nl-query-parser-only.ts      # 파서 테스트 (빠름)
├── nl-query-basic.ts            # 기본 테스트 (파싱 + OpenSearch)
├── quick-test.sh                # 빠른 테스트 (.env.local 자동 로드) ⭐ 추천
├── test-with-model.sh           # AI 모델 선택 테스트 (Gemini Flash/Pro)
├── compare-models.sh            # 모델 성능 비교 (Flash vs Pro)
└── run-all-tests.sh             # 전체 테스트 실행 스크립트
```

## 🧪 테스트 실행 방법

### ⭐ 가장 쉬운 방법 (.env.local 자동 로드)

```bash
cd /www/ib-editor/my-app
./test/quick-test.sh
```

이 스크립트는:
- `.env.local` 파일에서 자동으로 환경변수 로드
- 파서 테스트 + OpenSearch 통합 테스트 모두 실행
- 로그 필터링으로 깔끔한 출력

### 🤖 AI 모델 선택 테스트

현재 지원: **Google Gemini** (2.0 Flash, 2.5 Pro)
향후 지원 예정: Anthropic Claude, Azure OpenAI

```bash
cd /www/ib-editor/my-app

# Gemini 2.0 Flash (빠름, 기본값)
./test/test-with-model.sh gemini-flash

# Gemini 2.5 Pro (정확함)
./test/test-with-model.sh gemini-pro

# 모델 성능 비교
./test/compare-models.sh
```

**.env.local에서 자동 감지되는 API 키:**
- ✅ Google Gemini: `GOOGLE_GENERATIVE_AI_API_KEY`
- ⏳ Anthropic Claude: `ANTHROPIC_API_KEY` (향후 지원)
- ⏳ Azure OpenAI: `AZURE_OPENAI_API_KEY` (향후 지원)

---

### 1. 빠른 파서 테스트 (OpenSearch 실행 안 함)

**방법 1: .env.local 사용 (가장 편함):**

```bash
cd /www/ib-editor/my-app
npx dotenv -e .env.local -- npx tsx test/nl-query-parser-only.ts
```

**방법 2: 환경변수 직접 입력:**

```bash
cd /www/ib-editor/my-app
GOOGLE_GENERATIVE_AI_API_KEY="AIzaSyDg7sdkC0ZQD34g5SGrWVLTOSf7eKCxcvY" npx tsx test/nl-query-parser-only.ts
```

**방법 3: 현재 셸에서 export (세션 유지):**

```bash
cd /www/ib-editor/my-app
export GOOGLE_GENERATIVE_AI_API_KEY="AIzaSyDg7sdkC0ZQD34g5SGrWVLTOSf7eKCxcvY"
npx tsx test/nl-query-parser-only.ts
```

**Fallback 모드 (환경변수 없음):**

```bash
cd /www/ib-editor/my-app
npx tsx test/nl-query-parser-only.ts
```

> ⚠️ Fallback 모드는 간단한 규칙 기반 파싱만 수행합니다. 복잡한 질문은 Gemini AI를 사용하세요.

**테스트 내용:**
- 15개 자연어 질문 파싱
- 날짜 표현식, 심각도 필터, 쿼리 타입 등 검증
- 실행 시간: ~10초

### 2. 기본 테스트 (파싱 + OpenSearch 실행)

```bash
cd /www/ib-editor/my-app
GOOGLE_GENERATIVE_AI_API_KEY="AIzaSyDg7sdkC0ZQD34g5SGrWVLTOSf7eKCxcvY" \
OPENSEARCH_URL="http://opensearch:9200" \
OPENSEARCH_USER="admin" \
OPENSEARCH_PASSWORD="Admin@123456" \
npx tsx test/nl-query-basic.ts
```

**테스트 내용:**
- 4개 대표 케이스 (날짜, 필터, 통계, 리스트)
- 실제 OpenSearch 쿼리 실행 및 결과 검증
- 실행 시간: ~15초

### 3. 전체 테스트 (모든 테스트 실행)

**방법 A: quick-test.sh (추천)**

```bash
cd /www/ib-editor/my-app
./test/quick-test.sh
```

**방법 B: run-all-tests.sh**

```bash
cd /www/ib-editor/my-app
./test/run-all-tests.sh
```

**테스트 내용:**
- 파서 테스트 + 기본 테스트 모두 실행
- `.env.local`에서 환경변수 자동 로드
- 실행 시간: ~25초

---

## 💡 환경변수 관리

### .env.local 파일 사용 (권장)

프로젝트 루트에 `.env.local` 파일이 있으면 자동으로 로드됩니다:

```bash
# .env.local
GOOGLE_GENERATIVE_AI_API_KEY=AIzaSyDg7sdkC0ZQD34g5SGrWVLTOSf7eKCxcvY
OPENSEARCH_URL=http://opensearch:9200
OPENSEARCH_USER=admin
OPENSEARCH_PASSWORD=Admin@123456
```

### 현재 셸에서 export

한 번만 설정하면 세션 동안 유지됩니다:

```bash
export GOOGLE_GENERATIVE_AI_API_KEY="AIzaSyDg7sdkC0ZQD34g5SGrWVLTOSf7eKCxcvY"
export OPENSEARCH_URL="http://opensearch:9200"
export OPENSEARCH_USER="admin"
export OPENSEARCH_PASSWORD="Admin@123456"

# 이후 환경변수 없이 실행 가능
npx tsx test/nl-query-parser-only.ts
npx tsx test/nl-query-basic.ts
```

### 일회성 실행

매번 환경변수를 입력하는 방식:

```bash
GOOGLE_GENERATIVE_AI_API_KEY="..." npx tsx test/nl-query-parser-only.ts
```

## ✅ 테스트 성공 확인

모든 테스트가 성공하면 다음과 같이 표시됩니다:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 테스트 결과 요약
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ 성공: 4개
❌ 실패: 0개
📊 총 4개 테스트
```

## 🔧 해결된 문제

### ❌ 이전 문제
- Gemini API의 날짜 형식 검증 오류
- Fallback 파서로만 동작

### ✅ 해결 방법
- `nl-query-schema.ts`의 TimeRangeSchema 수정
- `z.string().datetime()` → `z.string()` (유연한 검증)
- OpenSearch 스키마는 변경하지 않음 (코드 레벨만 수정)

## 📊 테스트 결과

| 테스트 케이스 | 파싱 | OpenSearch | 결과 |
|--------------|------|-----------|------|
| 최근 7일간 Critical 인시던트 | ✅ | ✅ | 17개 (43ms) |
| 어제 발생한 알럿 목록 | ✅ | ✅ | 10,000개 (29ms) |
| 이번 달 Microsoft 인시던트 | ✅ | ✅ | 0개 (15ms) |
| 최근 24시간 High 알럿 | ✅ | ✅ | 10,000개 (34ms) |

## 🎯 다음 단계: MCP 통합

테스트가 모두 성공했으므로 이제 MCP 서버로 통합할 준비가 되었습니다.

### Claude Code 재시작 후 테스트

1. **Claude Code 종료**
2. **Claude Code 재시작**
3. **새 대화 시작 시 다음 프롬프트 사용:**

```
/www/ib-editor/my-app 프로젝트에서 nl-query MCP 서버가 설정되어 있습니다.
test/README.md를 확인하고, 다음 자연어 질문을 MCP 도구로 테스트해주세요:

"최근 7일간 Critical 심각도 인시던트 개수"
```

### 또는 간단하게:

```
nl-query MCP 테스트: "최근 7일간 Critical 심각도 인시던트 개수"
```

## 📝 추가 정보

### 지원되는 자연어 표현

**날짜:**
- 오늘, 어제, 그저께
- 최근 N일, 최근 N시간
- 이번 주, 지난주
- 이번 달, 지난달

**데이터 타입:**
- incidents, alerts, file_artifacts, network_artifacts, endpoints

**쿼리 타입:**
- 개수, 통계 → statistics
- 목록, 리스트 → detail/list
- 차트, 트렌드 → chart
- 보고서 → report

**필터:**
- Critical, High, Medium, Low 심각도
- 벤더명 (Microsoft, CrowdStrike, etc.)

## 🐛 문제 해결

### 환경변수 오류
```bash
# .env 파일 생성
cat > .env.local << EOF
GOOGLE_GENERATIVE_AI_API_KEY=AIzaSyDg7sdkC0ZQD34g5SGrWVLTOSf7eKCxcvY
OPENSEARCH_URL=http://opensearch:9200
OPENSEARCH_USER=admin
OPENSEARCH_PASSWORD=Admin@123456
EOF
```

### OpenSearch 연결 실패
```bash
# OpenSearch 상태 확인
curl -u admin:Admin@123456 http://opensearch:9200/_cluster/health
```

### TypeScript 컴파일 오류
```bash
# 모듈 재설치
pnpm install
```
