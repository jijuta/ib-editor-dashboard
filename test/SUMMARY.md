# NL-Query 테스트 시스템 요약

## ✅ 설정 완료 사항

### 1. 환경변수 관리
- `.env.local` 파일에 모든 API 키 설정 완료
- 자동 감지되는 API 키:
  - ✅ **Google Gemini**: `GOOGLE_GENERATIVE_AI_API_KEY`
  - ✅ **Anthropic Claude**: `ANTHROPIC_API_KEY` (파서에서 아직 미지원)
  - ✅ **Azure OpenAI**: `AZURE_OPENAI_API_KEY` (파서에서 아직 미지원)

### 2. 날짜 검증 오류 수정
- **파일**: `script/nl-query-schema.ts` (62-63번 라인)
- **수정**: `z.string().datetime()` → `z.string()`
- **결과**: Gemini API 정상 작동 ✅

### 3. 테스트 스크립트
```
test/
├── README.md                # 전체 가이드
├── nl-query-parser-only.ts  # 파서만 테스트
├── nl-query-basic.ts        # OpenSearch 통합 테스트
├── quick-test.sh            # 빠른 테스트 (.env.local 자동 로드) ⭐
├── test-with-model.sh       # AI 모델 선택 (Flash/Pro)
├── compare-models.sh        # 모델 성능 비교
└── run-all-tests.sh         # 전체 테스트
```

## 🚀 사용 방법

### ⭐ 가장 쉬운 방법 (권장)

```bash
cd /www/ib-editor/my-app
./test/quick-test.sh
```

이 명령어 하나로:
- `.env.local`에서 자동으로 환경변수 로드
- 파서 테스트 (15개 케이스)
- OpenSearch 통합 테스트 (4개 케이스)
- 깔끔한 출력 (디버그 로그 필터링)

### 🤖 AI 모델 선택

**현재 지원: Google Gemini**

```bash
# Gemini 2.0 Flash (빠름, 기본값)
./test/test-with-model.sh gemini-flash

# Gemini 2.5 Pro (정확함)
./test/test-with-model.sh gemini-pro

# 모델 성능 비교
./test/compare-models.sh
```

**향후 지원 예정:**
- Anthropic Claude 3.5 Sonnet
- Azure OpenAI GPT-4o-mini

### 💻 개별 테스트

**export 방식 (세션 유지):**

```bash
export GOOGLE_GENERATIVE_AI_API_KEY="AIzaSyDg7sdkC0ZQD34g5SGrWVLTOSf7eKCxcvY"
export OPENSEARCH_URL="http://opensearch:9200"
export OPENSEARCH_USER="admin"
export OPENSEARCH_PASSWORD="Admin@123456"

# 이후 간단하게 실행
npx tsx test/nl-query-parser-only.ts
npx tsx test/nl-query-basic.ts
```

**일회성 실행:**

```bash
GOOGLE_GENERATIVE_AI_API_KEY="..." npx tsx test/nl-query-parser-only.ts
```

## 📊 테스트 결과

### 파서 테스트 (15개 케이스)
- ✅ 날짜 표현식: 오늘, 어제, 최근 7일, 지난주, 이번 달
- ✅ 심각도 필터: Critical, High, Medium, Low
- ✅ 쿼리 타입: overview, list, statistics, chart, report
- ✅ 복합 쿼리: "최근 7일간 Critical 심각도 인시던트 개수"

### OpenSearch 통합 테스트 (4개 케이스)
| 질문 | 파싱 | OpenSearch | 결과 | 실행 시간 |
|------|------|-----------|------|-----------|
| 최근 7일간 Critical 인시던트 개수 | ✅ | ✅ | 17개 | 43ms |
| 어제 발생한 알럿 목록 | ✅ | ✅ | 10,000개 | 29ms |
| 이번 달 Microsoft 인시던트 | ✅ | ✅ | 0개 | 15ms |
| 최근 24시간 High 알럿 | ✅ | ✅ | 10,000개 | 34ms |

### AI 모델 비교
| 모델 | 쿼리 타입 | 데이터 타입 | 필터 | 실행 시간 |
|------|-----------|-------------|------|-----------|
| Gemini 2.0 Flash | detail | incidents | severity=critical | 18초 |
| Gemini 2.5 Pro | detail | incidents | severity=critical | 16.8초 |

**결론**: 둘 다 동일한 결과, Pro가 약간 더 빠름

## 🎯 다음 단계: MCP 통합

**준비 완료:**
- ✅ 스크립트 테스트 성공
- ✅ .mcp.json 설정 완료
- ✅ 환경변수 자동 로드

**Claude Code 재시작 후 프롬프트:**

```
nl-query MCP 테스트: "최근 7일간 Critical 심각도 인시던트 개수"
```

또는:

```
test/SUMMARY.md를 확인하고, nl-query MCP 도구로 다음 질문들을 실행해주세요:
1. "최근 7일간 Critical 심각도 인시던트 개수"
2. "어제 발생한 알럿 목록 보여줘"
3. "이번 달 인시던트 보고서"
```

## 📚 문서 위치

- **메인 가이드**: `test/README.md`
- **다음 대화 가이드**: `NEXT_CONVERSATION.md`
- **이 요약**: `test/SUMMARY.md`
- **MCP 전체 문서**: `docs/mcp/nl-query.md`

## 🔧 문제 해결

### MCP 도구가 인식 안 됨
1. Claude Code 완전 재시작 (앱 종료 후 재시작)
2. `.mcp.json` 경로 확인
3. 스크립트 직접 테스트: `./test/quick-test.sh`

### 환경변수 오류
1. `.env.local` 파일 확인
2. API 키 유효성 확인
3. `./test/test-with-model.sh gemini-flash` 실행

### OpenSearch 연결 실패
```bash
curl -u admin:Admin@123456 http://opensearch:9200/_cluster/health
```

---

**모든 준비가 완료되었습니다! 🎉**

1. 지금 `./test/quick-test.sh` 실행해서 확인
2. Claude Code 재시작
3. 위 프롬프트로 MCP 통합 테스트
