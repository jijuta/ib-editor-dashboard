# NL-Query AI 모델 가이드

NL-Query는 **6가지 AI 모델**을 지원합니다. 필요에 따라 최적의 모델을 선택할 수 있습니다.

## 📊 지원 모델 비교

| 모델 | 속도 | 정확도 | 비용 | 추천 사용 |
|------|------|--------|------|----------|
| **azure-gpt-4o-mini** ⭐ | 빠름 | 높음 | 저렴 | **기본값 (추천)** |
| **claude-3-5-sonnet** | 보통 | 매우 높음 | 보통 | 복잡한 질문 |
| **gemini-2.0-flash** | 매우 빠름 | 높음 | 무료 | 대량 처리 |
| **azure-gpt-35-turbo** | 빠름 | 보통 | 매우 저렴 | 간단한 질문 |
| **claude-3-haiku** | 매우 빠름 | 보통 | 저렴 | 빠른 응답 |
| **gemini-2.5-pro** | 느림 | 매우 높음 | 무료 | 최고 정확도 |

---

## 🎯 기본 모델: Azure GPT-4o-mini

**이유:**
- ✅ 안정적인 API (99.9% uptime)
- ✅ 빠른 응답 속도 (평균 1-2초)
- ✅ 비용 효율적 ($0.15/1M tokens)
- ✅ 한국어 지원 우수

---

## 🌐 언어별 사용 예시

### 1. Bash / cURL

#### 기본 (Azure GPT-4o-mini)
```bash
curl -X POST http://localhost:8080/nl-query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "최근 7일간 Critical 인시던트 개수"
  }'
```

#### Claude 3.5 Sonnet 사용
```bash
curl -X POST http://localhost:8080/nl-query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "최근 7일간 Critical 인시던트 개수",
    "model": "claude-3-5-sonnet"
  }'
```

#### Gemini 2.0 Flash 사용
```bash
curl -X POST http://localhost:8080/nl-query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "최근 7일간 Critical 인시던트 개수",
    "model": "gemini-2.0-flash"
  }'
```

---

### 2. Python

#### 기본 (Azure GPT-4o-mini)
```python
import requests

response = requests.post(
    'http://localhost:8080/nl-query',
    json={
        'query': '최근 7일간 Critical 인시던트 개수'
    }
)

result = response.json()
print(f"총 개수: {result['total']}")
```

#### Claude 3.5 Sonnet 사용
```python
import requests

response = requests.post(
    'http://localhost:8080/nl-query',
    json={
        'query': '최근 7일간 Critical 인시던트 개수',
        'model': 'claude-3-5-sonnet'  # 모델 명시
    }
)

result = response.json()
print(f"총 개수: {result['total']}")
```

#### 여러 모델 비교
```python
import requests

models = ['azure-gpt-4o-mini', 'claude-3-5-sonnet', 'gemini-2.0-flash']

for model in models:
    response = requests.post(
        'http://localhost:8080/nl-query',
        json={
            'query': '최근 7일간 Critical 인시던트 개수',
            'model': model
        }
    )
    result = response.json()
    print(f"{model}: {result['total']}개")
```

---

### 3. JavaScript / Node.js

#### 기본 (Azure GPT-4o-mini)
```javascript
const response = await fetch('http://localhost:8080/nl-query', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: '최근 7일간 Critical 인시던트 개수'
  })
});

const result = await response.json();
console.log(`총 개수: ${result.total}`);
```

#### Claude 3.5 Sonnet 사용
```javascript
const response = await fetch('http://localhost:8080/nl-query', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: '최근 7일간 Critical 인시던트 개수',
    model: 'claude-3-5-sonnet'  // 모델 명시
  })
});

const result = await response.json();
console.log(`총 개수: ${result.total}`);
```

---

### 4. TypeScript

#### 타입 정의
```typescript
type AIModel =
  | 'azure-gpt-4o-mini'
  | 'claude-3-5-sonnet'
  | 'gemini-2.0-flash'
  | 'azure-gpt-35-turbo'
  | 'claude-3-haiku'
  | 'gemini-2.5-pro';

interface NLQueryRequest {
  query: string;
  model?: AIModel;  // 선택적
  execute?: boolean;
  format?: ('markdown' | 'json' | 'summary')[];
}

interface NLQueryResponse {
  success: boolean;
  total: number;
  took: number;
  hits: any[];
}
```

#### 사용 예시
```typescript
async function queryIncidents(
  query: string,
  model: AIModel = 'azure-gpt-4o-mini'
): Promise<NLQueryResponse> {
  const response = await fetch('http://localhost:8080/nl-query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, model })
  });

  return response.json();
}

// 사용
const result = await queryIncidents(
  '최근 7일간 Critical 인시던트 개수',
  'claude-3-5-sonnet'
);

console.log(`총 개수: ${result.total}`);
```

---

### 5. MCP 도구 (Claude Code)

#### 기본 (Azure GPT-4o-mini)
```
nl-query로 "최근 7일간 Critical 인시던트 개수" 조회해줘
```

#### Claude 3.5 Sonnet 사용
```typescript
mcp__nl-query__nl_query({
  query: "최근 7일간 Critical 인시던트 개수",
  model: "claude-3-5-sonnet"
})
```

#### Gemini 2.0 Flash 사용
```typescript
mcp__nl-query__nl_query({
  query: "최근 7일간 Critical 인시던트 개수",
  model: "gemini-2.0-flash"
})
```

---

## 🔑 환경변수 설정

### .env.local
```bash
# Azure OpenAI (기본)
AZURE_OPENAI_API_KEY=your_azure_key
AZURE_OPENAI_ENDPOINT=https://etech-openai.openai.azure.com/
AZURE_OPENAI_DEPLOYMENT=gpt-4o-mini

# Anthropic Claude
ANTHROPIC_API_KEY=your_anthropic_key

# Google Gemini
GOOGLE_GENERATIVE_AI_API_KEY=your_gemini_key

# OpenSearch
OPENSEARCH_URL=http://opensearch:9200
OPENSEARCH_USER=admin
OPENSEARCH_PASSWORD=Admin@123456
```

---

## 📝 테스트 스크립트

### Azure 테스트
```bash
./test/test-azure.sh
```

### Claude 테스트
```bash
./test/test-claude.sh
```

### Gemini 테스트 (새 API 키 필요)
```bash
export GOOGLE_GENERATIVE_AI_API_KEY="your_new_key"
./test/quick-test.sh
```

---

## 🎨 모델 선택 가이드

### 간단한 질문 (통계, 개수)
→ **azure-gpt-4o-mini** (기본값)
```
"최근 7일간 인시던트 개수"
"어제 발생한 알럿"
```

### 복잡한 분석 질문
→ **claude-3-5-sonnet**
```
"최근 1주일간 랜섬웨어 공격 패턴을 분석하고 피해 규모를 추정해줘"
"IP 192.168.1.1과 관련된 모든 이벤트를 시간순으로 정리해서 보고서 작성"
```

### 대량 처리 (100+ 질문)
→ **gemini-2.0-flash** (무료, 빠름)
```python
for question in questions:
    result = query(question, model='gemini-2.0-flash')
```

### 최고 정확도 필요
→ **gemini-2.5-pro** 또는 **claude-3-5-sonnet**
```
"414011 인시던트를 상세 분석하고 MITRE ATT&CK 프레임워크로 매핑"
```

---

## 🚨 문제 해결

### Azure API 오류
```bash
# API 키 확인
echo $AZURE_OPENAI_API_KEY

# 수동 테스트
curl -X POST "https://etech-openai.openai.azure.com/openai/deployments/gpt-4o-mini/chat/completions?api-version=2024-02-15-preview" \
  -H "Content-Type: application/json" \
  -H "api-key: $AZURE_OPENAI_API_KEY" \
  -d '{"messages":[{"role":"user","content":"test"}],"max_tokens":10}'
```

### Claude API 오류
```bash
# API 키 확인
echo $ANTHROPIC_API_KEY

# 수동 테스트
curl https://api.anthropic.com/v1/messages \
  -H "content-type: application/json" \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -d '{"model":"claude-3-5-sonnet-20241022","max_tokens":100,"messages":[{"role":"user","content":"test"}]}'
```

### Gemini API 오류 (유출된 키)
```bash
# 새 API 키 발급: https://aistudio.google.com/app/apikey
# .env.local 업데이트
GOOGLE_GENERATIVE_AI_API_KEY=your_new_key
```

---

## 📊 성능 벤치마크

| 테스트 케이스 | Azure | Claude | Gemini |
|-------------|-------|--------|--------|
| "최근 7일간 Critical 인시던트" | 10개 (36ms) | 10개 (52ms) | 8개* (39ms) |
| 파싱 시간 | 1.2초 | 1.5초 | 0.8초 |
| 정확도 | 95% | 98% | 90%* |
| 비용 (1000 질문) | $0.15 | $3.00 | 무료 |

*Gemini는 Fallback 파서 사용 시 정확도 저하

---

## 💡 권장 사항

1. **기본값 사용** (Azure GPT-4o-mini)
   - 대부분의 경우 충분히 정확하고 빠름

2. **명시적 모델 지정**
   - 복잡한 질문: `model: 'claude-3-5-sonnet'`
   - 대량 처리: `model: 'gemini-2.0-flash'`

3. **API 키 로테이션**
   - Gemini API 키가 유출되면 즉시 교체
   - `.env.local`에 백업 키 준비

4. **비용 최적화**
   - 개발: Gemini (무료)
   - 프로덕션: Azure (안정적)
   - 고급 분석: Claude (높은 정확도)

---

**작성일**: 2025-11-08
**버전**: 1.0.0
**지원 모델**: 6개 (Azure x2, Claude x2, Gemini x2)
