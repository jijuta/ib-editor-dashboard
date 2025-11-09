# 다음 대화 재개 가이드

## 🎯 현재 상태

✅ **완료된 작업:**
1. nl-query MCP 서버 파일 복사 완료 (`/www/ib-poral` → `/www/ib-editor/my-app/script/`)
2. 날짜 검증 오류 수정 (`nl-query-schema.ts` - Zod 스키마만 수정, OpenSearch 스키마는 변경 안 함)
3. 테스트 스크립트 작성 완료 (`test/` 디렉토리)
4. 모든 테스트 성공 (4/4 테스트 통과)
5. .mcp.json 설정 완료 (올바른 경로 설정)

✅ **테스트 결과:**
- 파서 테스트: 15개 케이스 모두 성공
- OpenSearch 통합 테스트: 4개 케이스 모두 성공
- 실행 시간: 15~43ms (매우 빠름)

## 🚀 다음 단계: MCP 통합 테스트

### ⚠️ 중요: Claude Code 재시작 필요

`.mcp.json` 파일을 수정했으므로 MCP 서버를 인식하려면 **Claude Code를 재시작**해야 합니다.

### 재시작 후 사용할 프롬프트

#### 옵션 1: 상세한 설명 포함 (권장)

```
/www/ib-editor/my-app 프로젝트에 nl-query MCP 서버가 설정되어 있습니다.

test/README.md를 확인하고, 다음 자연어 질문을 MCP 도구로 실행해주세요:

1. "최근 7일간 Critical 심각도 인시던트 개수"
2. "어제 발생한 알럿 목록 보여줘"
3. "이번 달 인시던트 보고서"

각 질문에 대해:
- 파싱 결과 (쿼리 타입, 데이터 타입, 인덱스)
- OpenSearch 실행 결과 (총 개수, 실행 시간)
를 보여주세요.
```

#### 옵션 2: 간단한 테스트

```
nl-query MCP 도구를 사용해서 "최근 7일간 Critical 심각도 인시던트 개수"를 조회해주세요.
```

#### 옵션 3: 최소 프롬프트

```
"최근 7일간 Critical 심각도 인시던트 개수" (nl-query MCP 사용)
```

## 📋 테스트 시나리오

MCP 서버가 정상 작동하면 다음과 같이 테스트할 수 있습니다:

### 1단계: 기본 쿼리
```
"오늘 발생한 인시던트"
```

### 2단계: 필터링
```
"최근 24시간 High 심각도 알럿"
```

### 3단계: 통계
```
"이번 달 인시던트 개수"
```

### 4단계: 복합 쿼리
```
"지난주 발생한 Critical 심각도 Microsoft Defender 인시던트 보고서"
```

## 🔧 문제 해결

### MCP 도구가 인식되지 않는 경우

1. **Claude Code 완전 재시작 확인**
   - 단순 새 대화가 아니라 Claude Code 앱 자체를 종료했다가 다시 시작

2. **.mcp.json 경로 확인**
   ```bash
   cat /www/ib-editor/my-app/.mcp.json | grep nl-query -A 10
   ```

   올바른 경로:
   ```json
   "args": [
     "tsx",
     "/www/ib-editor/my-app/script/nl-query-mcp.js"
   ]
   ```

3. **스크립트 파일 존재 확인**
   ```bash
   ls -la /www/ib-editor/my-app/script/nl-query-mcp.js
   ls -la /www/ib-editor/my-app/script/nl-query-parser.ts
   ls -la /www/ib-editor/my-app/script/opensearch-executor.ts
   ```

4. **직접 테스트로 확인**
   ```bash
   cd /www/ib-editor/my-app
   ./test/run-all-tests.sh
   ```

### MCP 서버가 시작은 되지만 오류가 발생하는 경우

```bash
# 환경변수 확인
cat /www/ib-editor/my-app/.mcp.json | grep -A 4 '"env"'

# 수동으로 MCP 서버 테스트
echo '{"jsonrpc":"2.0","method":"tools/list","params":{},"id":1}' | \
GOOGLE_GENERATIVE_AI_API_KEY="AIzaSyDg7sdkC0ZQD34g5SGrWVLTOSf7eKCxcvY" \
npx tsx /www/ib-editor/my-app/script/nl-query-mcp.js
```

## 📚 참고 문서

- **테스트 가이드:** `/www/ib-editor/my-app/test/README.md`
- **MCP 설명:** `/www/ib-editor/my-app/docs/mcp/nl-query.md`
- **스키마 수정 내역:** `script/nl-query-schema.ts` (62-63번 라인)

## 💡 유용한 명령어

### 빠른 테스트 (.env.local 자동 로드) ⭐ 추천

```bash
cd /www/ib-editor/my-app
./test/quick-test.sh
```

### 스크립트 테스트 (MCP 없이)

**방법 1: export 사용 (한 번만 설정)**

```bash
cd /www/ib-editor/my-app

# 현재 셸에서 환경변수 설정
export GOOGLE_GENERATIVE_AI_API_KEY="AIzaSyDg7sdkC0ZQD34g5SGrWVLTOSf7eKCxcvY"
export OPENSEARCH_URL="http://opensearch:9200"
export OPENSEARCH_USER="admin"
export OPENSEARCH_PASSWORD="Admin@123456"

# 이후 환경변수 없이 실행 가능
npx tsx test/nl-query-parser-only.ts
npx tsx test/nl-query-basic.ts
```

**방법 2: 일회성 실행**

```bash
cd /www/ib-editor/my-app
GOOGLE_GENERATIVE_AI_API_KEY="AIzaSyDg7sdkC0ZQD34g5SGrWVLTOSf7eKCxcvY" \
OPENSEARCH_URL="http://opensearch:9200" \
OPENSEARCH_USER="admin" \
OPENSEARCH_PASSWORD="Admin@123456" \
npx tsx test/nl-query-basic.ts
```

### MCP 서버 수동 테스트
```bash
cd /www/ib-editor/my-app
echo '{"jsonrpc":"2.0","method":"tools/list","params":{},"id":1}' | \
GOOGLE_GENERATIVE_AI_API_KEY="AIzaSyDg7sdkC0ZQD34g5SGrWVLTOSf7eKCxcvY" \
OPENSEARCH_URL="http://opensearch:9200" \
OPENSEARCH_USER="admin" \
OPENSEARCH_PASSWORD="Admin@123456" \
npx tsx script/nl-query-mcp.js
```

## ✅ 성공 기준

MCP 통합이 성공하면:
1. Claude Code에서 `mcp__nl-query__nl_query` 도구 인식
2. 자연어 질문 입력 시 자동으로 파싱
3. OpenSearch 쿼리 자동 실행
4. Markdown + JSON 형식으로 결과 반환

---

**다음 대화에서 위 프롬프트를 사용하세요!**
