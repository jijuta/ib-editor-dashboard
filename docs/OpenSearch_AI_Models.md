# OpenSearch AI Models - DeFender X SIEM

> **생성일**: 2025-10-25
> **MCP Server**: opensearch-mcp-inbridge
> **총 AI 모델 수**: 12개
> **모델 그룹**: 4개
> **커넥터**: 13개

## 📑 목차

- [1. 개요](#1-개요)
- [2. 모델 그룹](#2-모델-그룹)
- [3. NVIDIA 모델](#3-nvidia-모델)
- [4. Google AI 모델](#4-google-ai-모델)
- [5. Azure OpenAI 모델](#5-azure-openai-모델)
- [6. 모델 용도별 분류](#6-모델-용도별-분류)
- [7. API 엔드포인트](#7-api-엔드포인트)
- [8. 모델 사용 예시](#8-모델-사용-예시)
- [9. 배포 설정](#9-배포-설정)
- [10. 참고 문서](#10-참고-문서)

---

## 1. 개요

**DeFender X SIEM**은 OpenSearch의 ML 플러그인을 활용하여 **12개의 AI 모델**을 통합 운영하고 있습니다. 이 모델들은 보안 위협 분석, 자연어 처리, 텍스트 임베딩 등 다양한 용도로 활용됩니다.

### 1.1 주요 특징

- ✅ **모든 모델 DEPLOYED 상태**: 12개 모델 전부 활성 상태
- 🔄 **자동 배포**: Deploy to all nodes 활성화
- 🏢 **4개 제공업체**: NVIDIA, Google AI, Azure OpenAI, 자체 보안 모델
- 🔐 **암호화된 자격증명**: AWS KMS 암호화 적용
- 🌐 **REST API 제공**: OpenSearch ML API를 통한 모델 호출

### 1.2 모델 통계

| 카테고리 | 수량 |
|----------|------|
| Chat/대화 모델 | 7개 |
| Embedding 모델 | 5개 |
| NVIDIA 모델 | 5개 |
| Google AI 모델 | 4개 |
| Azure OpenAI 모델 | 3개 |
| 보안 특화 모델 | 2개 (LLaMA Guard) |

---

## 2. 모델 그룹

OpenSearch ML은 모델을 그룹으로 관리하여 버전 관리 및 액세스 제어를 수행합니다.

### 2.1 전체 모델 그룹 목록

| 그룹 ID | 그룹명 | 설명 | 최신 버전 | 생성일 | 상태 |
|---------|--------|------|-----------|--------|------|
| `cV_hWJkBAyy3p1KfIPag` | **nvidia_models** | NVIDIA AI Models Group | v5 | 2025-08-18 | Public |
| `Pl_fWJkBAyy3p1KfjPZ7` | **azure_openai_models** | Azure OpenAI Models Group | v8 | 2025-08-18 | Public |
| `Tl_gWJkBAyy3p1KfJ_bQ` | **google_ai_models** | Google AI Models Group | v0 | 2025-08-18 | Public |
| `DEKTZpgBtwkfXv5mZMCX` | **security_analysis_models** | Models for security threat analysis | v0 | 2024-12-01 | Public |

### 2.2 그룹별 모델 수

```
nvidia_models           : 5개
azure_openai_models     : 4개
google_ai_models        : 4개
security_analysis_models: 0개 (예약됨)
```

---

## 3. NVIDIA 모델

NVIDIA는 **NVIDIA AI Foundation** 및 **Meta LLaMA** 기반 모델을 제공합니다.

### 3.1 DeepSeek-v3.1 Chat (최신 ⭐)

**모델 ID**: `6WB-WpkBAyy3p1KfSkqP`

| 속성 | 값 |
|------|-----|
| **이름** | nvidia_deepseek-v3_1_chat |
| **버전** | v5 |
| **상태** | ✅ DEPLOYED |
| **알고리즘** | REMOTE |
| **모델명** | `deepseek-ai/deepseek-v3_1` |
| **생성일** | 2025-10-19 07:38:50 |
| **최종 배포** | 2025-10-19 07:40:10 |
| **커넥터 ID** | `02B9WpkBAyy3p1KfYUqw` |
| **엔드포인트** | `https://integrate.api.nvidia.com/v1/chat/completions` |

**특징**:
- NVIDIA의 최신 DeepSeek 3.1 채팅 모델
- 고성능 추론 능력
- 보안 분석 및 위협 인텔리전스 처리에 최적화

**파라미터**:
```json
{
  "model": "deepseek-ai/deepseek-v3_1",
  "max_tokens": 512,
  "temperature": 0.7
}
```

---

### 3.2 LLaMA Guard 4 12B Chat (v4)

**모델 ID**: `f2ArWZkBAyy3p1KfKgY4`

| 속성 | 값 |
|------|-----|
| **이름** | nvidia_llama-guard-4-12b_chat |
| **버전** | v4 |
| **상태** | ✅ DEPLOYED |
| **모델명** | `meta/llama-guard-4-12b` |
| **생성일** | 2025-10-18 16:14:10 |
| **커넥터 ID** | `bmAqWZkBAyy3p1KfmgZ1` |

**특징**:
- Meta의 LLaMA Guard 보안 모델
- 콘텐츠 필터링 및 보안 정책 적용
- 유해 콘텐츠 탐지

**활용 사례**:
- 사용자 입력 검증
- 악성 코드 설명 필터링
- 보안 정책 위반 탐지

---

### 3.3 LLaMA Guard 4 12B Chat (v3)

**모델 ID**: `s2AnWZkBAyy3p1KfrQV6`

| 속성 | 값 |
|------|-----|
| **이름** | nvidia_llama-guard-4-12b_chat |
| **버전** | v3 |
| **상태** | ✅ DEPLOYED |
| **모델명** | `meta/llama-guard-4-12b` |
| **생성일** | 2025-10-18 16:10:31 |
| **커넥터 ID** | `lWAmWZkBAyy3p1KfyAXX` |

**설명**: v4와 동일한 모델의 이전 버전 (호환성 유지용)

---

### 3.4 LLaMA 3.1 8B Instruct Chat

**모델 ID**: `xWAdWZkBAyy3p1KfzAO5`

| 속성 | 값 |
|------|-----|
| **이름** | nvidia_llama_chat |
| **버전** | v2 |
| **상태** | ✅ DEPLOYED |
| **모델명** | `meta/llama-3.1-8b-instruct` |
| **생성일** | 2025-10-18 16:00:26 |
| **커넥터 ID** | `tGAdWZkBAyy3p1KfIgPW` |

**특징**:
- Meta의 LLaMA 3.1 8B 매개변수 모델
- 일반 대화 및 보안 질의응답
- 경량화된 추론 성능

**활용 사례**:
- 보안 인시던트 요약
- MITRE ATT&CK 기술 설명
- 위협 분석 리포트 생성

---

### 3.5 NVIDIA Embedding (NV-Embed-v1)

**모델 ID**: `gWAbWZkBAyy3p1Kf6QP_`

| 속성 | 값 |
|------|-----|
| **이름** | nvidia-embedding |
| **버전** | v1 |
| **상태** | ✅ DEPLOYED |
| **모델명** | `nvidia/nv-embed-v1` |
| **생성일** | 2025-10-18 15:57:54 |
| **커넥터 ID** | `bGAbWZkBAyy3p1KfEAPn` |
| **엔드포인트** | `https://integrate.api.nvidia.com/v1/embeddings` |

**특징**:
- 텍스트를 고차원 벡터로 변환
- 시맨틱 검색 및 유사도 분석
- 위협 인텔리전스 클러스터링

**활용 사례**:
- 인시던트 유사도 분석
- 보안 이벤트 클러스터링
- RAG (Retrieval-Augmented Generation) 파이프라인

---

## 4. Google AI 모델

Google의 **Gemini** 시리즈 모델을 통합하여 다양한 AI 기능을 제공합니다.

### 4.1 Gemini 2.0 Flash (최신 ⭐)

**모델 ID**: `PmASWpkBAyy3p1Kf8zUd`

| 속성 | 값 |
|------|-----|
| **이름** | Google Text 2.0 |
| **버전** | v8 |
| **상태** | ✅ DEPLOYED |
| **모델명** | `gemini-2.0-flash` |
| **생성일** | 2025-10-19 05:41:22 |
| **커넥터 ID** | `MWASWpkBAyy3p1KfJDWy` |
| **엔드포인트** | `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent` |

**특징**:
- 빠른 응답 속도 (Flash 시리즈)
- 최신 Gemini 2.0 아키텍처
- 멀티모달 입력 지원 (텍스트 우선)

**파라미터**:
```json
{
  "model": "gemini-2.0-flash",
  "contents": [
    {
      "parts": [
        {
          "text": "Analyze this security incident"
        }
      ]
    }
  ]
}
```

---

### 4.2 Gemini 2.5 Pro (Advanced Reasoning)

**모델 ID**: `sWAYWZkBAyy3p1KfLAIM`

| 속성 | 값 |
|------|-----|
| **이름** | Google Think 2.5 |
| **버전** | v7 |
| **상태** | ✅ DEPLOYED |
| **모델명** | `gemini-2.5-pro` |
| **생성일** | 2025-10-18 15:54:58 |
| **커넥터 ID** | `sWATWZkBAyy3p1KfIgHp` |

**특징**:
- 고급 추론 능력 (Advanced Reasoning)
- 복잡한 보안 시나리오 분석
- 장문의 컨텍스트 처리

**활용 사례**:
- 복잡한 공격 체인 분석
- APT 캠페인 인과관계 추론
- 위협 시나리오 시뮬레이션

---

### 4.3 Gemini 2.5 Flash (Fast Chat)

**모델 ID**: `e2AWWZkBAyy3p1KfiAKZ`

| 속성 | 값 |
|------|-----|
| **이름** | Google Text 2.5 |
| **버전** | v6 |
| **상태** | ✅ DEPLOYED |
| **모델명** | `gemini-2.5-flash` |
| **생성일** | 2025-10-18 15:51:15 |
| **커넥터 ID** | `p2ASWZkBAyy3p1Kf1gGW` |

**특징**:
- 빠른 채팅 응답
- 실시간 보안 질의응답
- 경량화된 추론

---

### 4.4 Gemini Embedding 2.5

**모델 ID**: `12AUWZkBAyy3p1KfYgG0`

| 속성 | 값 |
|------|-----|
| **이름** | Google embedding 2.5 |
| **버전** | v5 |
| **상태** | ✅ DEPLOYED |
| **모델명** | `gemini-embedding-001` |
| **생성일** | 2025-10-18 15:48:19 |
| **커넥터 ID** | `mGASWZkBAyy3p1KfZgFO` |
| **엔드포인트** | `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent` |

**특징**:
- 텍스트 임베딩 생성
- 시맨틱 검색 최적화
- 다국어 지원

**요청 형식**:
```json
{
  "model": "models/gemini-embedding-001",
  "content": {
    "parts": [
      {
        "text": "Security threat analysis"
      }
    ]
  }
}
```

---

## 5. Azure OpenAI 모델

Microsoft Azure를 통해 OpenAI 모델을 사용합니다.

### 5.1 GPT-4.1 Fixed

**모델 ID**: `818KWZkBAyy3p1Kfi_8B`

| 속성 | 값 |
|------|-----|
| **이름** | Azure GPT-4.1 Fixed |
| **버전** | v4 |
| **상태** | ✅ DEPLOYED |
| **배포명** | `gpt-4.1` |
| **생성일** | 2025-10-18 15:38:32 |
| **커넥터 ID** | `4V8KWZkBAyy3p1KfKf9c` |
| **엔드포인트** | `https://etech-openai.openai.azure.com/openai/deployments/gpt-4.1/chat/completions` |
| **API 버전** | 2025-01-01-preview |

**특징**:
- 수정된 Azure OpenAI GPT-4.1
- 높은 정확도의 채팅 응답
- 보안 리포트 생성에 최적화

**파라미터**:
```json
{
  "messages": [
    {
      "role": "user",
      "content": "Explain MITRE ATT&CK T1055"
    }
  ],
  "max_tokens": 800,
  "temperature": 0
}
```

---

### 5.2 Text-Embedding-Ada-002 (v2)

**모델 ID**: `V1_5WJkBAyy3p1KfN_zY`

| 속성 | 값 |
|------|-----|
| **이름** | Azure OpenAI text-embedding-ada-002-2 |
| **버전** | v2 |
| **상태** | ✅ DEPLOYED |
| **배포명** | `text-embedding-ada-002` |
| **생성일** | 2025-10-18 15:19:41 |
| **커넥터 ID** | `QV_4WJkBAyy3p1KfWfzq` |
| **API 버전** | 2023-05-15 |

**특징**:
- OpenAI의 text-embedding-ada-002 모델
- 1536차원 벡터 생성
- 높은 정확도의 시맨틱 검색

**활용 사례**:
- 보안 문서 검색
- 위협 인텔리전스 매칭
- 유사 인시던트 탐지

---

### 5.3 Text-Embedding-Ada-002 (v1)

**모델 ID**: `v1_vWJkBAyy3p1KfzvoO`

| 속성 | 값 |
|------|-----|
| **이름** | Azure OpenAI text-embedding-ada-002 |
| **버전** | v1 |
| **상태** | ✅ DEPLOYED |
| **생성일** | 2025-10-18 15:15:17 |
| **커넥터 ID** | `ZV_rWJkBAyy3p1Kfrvhe` |

**설명**: v2와 동일한 모델의 이전 버전 (호환성 유지용)

---

## 6. 모델 용도별 분류

### 6.1 Chat/대화 모델 (7개)

| 모델명 | 제공업체 | 주요 용도 |
|--------|---------|-----------|
| DeepSeek-v3.1 | NVIDIA | 고성능 보안 분석 |
| LLaMA Guard 4 (v4) | NVIDIA/Meta | 보안 필터링 |
| LLaMA Guard 4 (v3) | NVIDIA/Meta | 보안 필터링 (레거시) |
| LLaMA 3.1 8B | NVIDIA/Meta | 일반 대화 |
| Gemini 2.0 Flash | Google | 빠른 응답 |
| Gemini 2.5 Pro | Google | 고급 추론 |
| Gemini 2.5 Flash | Google | 빠른 채팅 |
| GPT-4.1 | Azure OpenAI | 리포트 생성 |

### 6.2 Embedding 모델 (5개)

| 모델명 | 제공업체 | 벡터 차원 | 주요 용도 |
|--------|---------|-----------|-----------|
| NV-Embed-v1 | NVIDIA | 1024 | 시맨틱 검색 |
| Gemini Embedding 2.5 | Google | 768 | 다국어 임베딩 |
| text-embedding-ada-002 (v2) | Azure OpenAI | 1536 | 고정확도 검색 |
| text-embedding-ada-002 (v1) | Azure OpenAI | 1536 | 호환성 유지 |

### 6.3 보안 특화 모델 (2개)

| 모델명 | 기능 | 버전 |
|--------|------|------|
| LLaMA Guard 4 12B | 콘텐츠 필터링, 보안 정책 적용 | v3, v4 |

**보안 정책 카테고리**:
- S1: Violent Crimes
- S2: Non-Violent Crimes
- S3: Sex-Related Crimes
- S4: Child Sexual Exploitation
- S5: Defamation
- S6: Specialized Advice
- S7: Privacy
- S8: Intellectual Property
- S9: Indiscriminate Weapons
- S10: Hate
- S11: Suicide & Self-Harm
- S12: Sexual Content
- S13: Elections

---

## 7. API 엔드포인트

### 7.1 NVIDIA API

**베이스 URL**:
```
https://integrate.api.nvidia.com/v1
```

**Chat Completions**:
```
POST /v1/chat/completions
```

**Embeddings**:
```
POST /v1/embeddings
```

**인증**:
```
Authorization: Bearer ${NVIDIA_API_KEY}
```

---

### 7.2 Google Gemini API

**베이스 URL**:
```
https://generativelanguage.googleapis.com/v1beta/models
```

**Generate Content**:
```
POST /models/{model}:generateContent
```

**Embed Content**:
```
POST /models/{model}:embedContent
```

**인증**:
```
x-goog-api-key: ${GOOGLE_API_KEY}
```

---

### 7.3 Azure OpenAI API

**베이스 URL**:
```
https://etech-openai.openai.azure.com/openai/deployments
```

**Chat Completions**:
```
POST /deployments/{deployment-name}/chat/completions?api-version={api-version}
```

**Embeddings**:
```
POST /deployments/{deployment-name}/embeddings?api-version={api-version}
```

**인증**:
```
api-key: ${AZURE_OPENAI_API_KEY}
```

---

## 8. 모델 사용 예시

### 8.1 OpenSearch ML API를 통한 Chat 모델 호출

#### NVIDIA DeepSeek-v3.1 Chat

```bash
POST /_plugins/_ml/models/6WB-WpkBAyy3p1KfSkqP/_predict
```

```json
{
  "parameters": {
    "messages": [
      {
        "role": "system",
        "content": "You are a security analyst specializing in MITRE ATT&CK framework."
      },
      {
        "role": "user",
        "content": "Explain the technique T1055 (Process Injection) and provide detection methods."
      }
    ],
    "max_tokens": 512,
    "temperature": 0.7
  }
}
```

**응답 예시**:
```json
{
  "inference_results": [
    {
      "output": [
        {
          "name": "response",
          "dataAsMap": {
            "response": "T1055 Process Injection is a technique where adversaries inject code into the address space of a separate live process..."
          }
        }
      ]
    }
  ]
}
```

---

#### Google Gemini 2.5 Pro

```bash
POST /_plugins/_ml/models/sWAYWZkBAyy3p1KfLAIM/_predict
```

```json
{
  "parameters": {
    "input": "Analyze the following security incident and provide MITRE ATT&CK mapping:\n\nA suspicious PowerShell command was executed with encoded parameters, followed by network connections to a known malicious IP address."
  }
}
```

---

#### Azure GPT-4.1

```bash
POST /_plugins/_ml/models/818KWZkBAyy3p1Kfi_8B/_predict
```

```json
{
  "parameters": {
    "messages": [
      {
        "role": "user",
        "content": "Generate a comprehensive security incident report for incident ID 500455"
      }
    ],
    "max_tokens": 800,
    "temperature": 0
  }
}
```

---

### 8.2 Embedding 모델 호출

#### NVIDIA NV-Embed-v1

```bash
POST /_plugins/_ml/models/gWAbWZkBAyy3p1Kf6QP_/_predict
```

```json
{
  "parameters": {
    "input": [
      "Malicious PowerShell script execution detected",
      "Suspicious registry modification observed",
      "Unauthorized network connection to external IP"
    ]
  }
}
```

**응답 예시**:
```json
{
  "inference_results": [
    {
      "output": [
        {
          "name": "embedding",
          "data": [0.123, -0.456, 0.789, ...]
        }
      ]
    }
  ]
}
```

---

#### Google Gemini Embedding 2.5

```bash
POST /_plugins/_ml/models/12AUWZkBAyy3p1KfYgG0/_predict
```

```json
{
  "parameters": {
    "input": "Security threat analysis for ransomware attack"
  }
}
```

---

#### Azure text-embedding-ada-002

```bash
POST /_plugins/_ml/models/V1_5WJkBAyy3p1KfN_zY/_predict
```

```json
{
  "parameters": {
    "input": "MITRE ATT&CK technique T1059.001 PowerShell execution"
  }
}
```

---

### 8.3 LLaMA Guard 보안 필터링

```bash
POST /_plugins/_ml/models/f2ArWZkBAyy3p1KfKgY4/_predict
```

```json
{
  "parameters": {
    "messages": [
      {
        "role": "user",
        "content": "How can I create a backdoor in a Windows system?"
      }
    ],
    "max_tokens": 512,
    "temperature": 0.7
  }
}
```

**응답 예시** (유해 콘텐츠 필터링):
```json
{
  "inference_results": [
    {
      "output": [
        {
          "name": "response",
          "dataAsMap": {
            "response": "unsafe\nS2"
          }
        }
      ]
    }
  ]
}
```

**결과 해석**:
- `unsafe`: 안전하지 않은 콘텐츠
- `S2`: Non-Violent Crimes (비폭력 범죄)

---

## 9. 배포 설정

### 9.1 공통 배포 설정

모든 모델은 동일한 배포 설정을 사용합니다:

| 설정 항목 | 값 |
|-----------|-----|
| **Deploy to all nodes** | ✅ Yes |
| **Planning worker node count** | 1 |
| **Current worker node count** | 1 |
| **Worker node ID** | `arPZWtaSTq6jhrxSkZSeOQ` |
| **Auto redeploy retry times** | 0 |
| **Model state** | DEPLOYED |
| **Is hidden** | ❌ No |

### 9.2 노드 정보

**Worker Node ID**: `arPZWtaSTq6jhrxSkZSeOQ`

이 노드에서 모든 ML 모델이 실행됩니다.

### 9.3 재배포 정책

- **자동 재배포**: 비활성화 (`auto_redeploy_retry_times: 0`)
- **수동 재배포**: OpenSearch ML API를 통해 수동으로 재배포 가능

**재배포 명령어**:
```bash
POST /_plugins/_ml/models/{model_id}/_deploy
```

---

## 10. 참고 문서

### 10.1 OpenSearch ML 문서

- [OpenSearch ML Plugin](https://opensearch.org/docs/latest/ml-commons-plugin/)
- [ML Models API](https://opensearch.org/docs/latest/ml-commons-plugin/api/)
- [Remote Models](https://opensearch.org/docs/latest/ml-commons-plugin/remote-models/)

### 10.2 AI 제공업체 문서

#### NVIDIA
- [NVIDIA AI Foundation](https://www.nvidia.com/en-us/ai-data-science/foundation-models/)
- [NVIDIA NIM API](https://docs.nvidia.com/nim/)

#### Google Gemini
- [Google AI Gemini API](https://ai.google.dev/docs)
- [Gemini Models](https://ai.google.dev/models/gemini)

#### Azure OpenAI
- [Azure OpenAI Service](https://learn.microsoft.com/azure/ai-services/openai/)
- [GPT-4 Models](https://learn.microsoft.com/azure/ai-services/openai/concepts/models#gpt-4)

#### Meta LLaMA
- [LLaMA Guard](https://ai.meta.com/llama/llama-guard/)
- [LLaMA 3.1](https://ai.meta.com/llama/)

### 10.3 프로젝트 문서

- [CLAUDE.md](/www/ib-poral/CLAUDE.md) - 프로젝트 전체 가이드
- [MCP_README.md](/www/ib-poral/docs/MCP_README.md) - MCP 서버 사용 가이드
- [OpenSearch_Index_List.md](/www/ib-poral/docs/OpenSearch_Index_List.md) - 인덱스 목록

---

## 11. 모델 관리 명령어

### 11.1 모델 목록 조회

```bash
GET /_plugins/_ml/models
```

### 11.2 특정 모델 정보 조회

```bash
GET /_plugins/_ml/models/{model_id}
```

### 11.3 모델 배포

```bash
POST /_plugins/_ml/models/{model_id}/_deploy
```

### 11.4 모델 언디플로이

```bash
POST /_plugins/_ml/models/{model_id}/_undeploy
```

### 11.5 모델 삭제

```bash
DELETE /_plugins/_ml/models/{model_id}
```

### 11.6 모델 그룹 조회

```bash
GET /_plugins/_ml/model_groups
```

### 11.7 커넥터 조회

```bash
GET /_plugins/_ml/connectors
```

---

## 12. 보안 고려사항

### 12.1 API 키 관리

모든 AI 모델의 API 키는 **AWS KMS**를 통해 암호화되어 저장됩니다.

**암호화 예시**:
```
AgV4hdfaGVNWCyV9Q2vWDYVYDk3mWu+FPSRbZ4c3KDLaofAAXwABABVhd3MtY3J5cHRvLXB1YmxpYy1rZXk...
```

### 12.2 액세스 제어

모든 모델 그룹은 `access: "public"`으로 설정되어 있지만, OpenSearch의 **Security 플러그인**을 통해 역할 기반 액세스 제어(RBAC)를 적용할 수 있습니다.

**권장 역할 설정**:
- `ml_full_access`: 모델 관리 및 사용 가능
- `ml_readonly_access`: 모델 조회만 가능
- `ml_predict_access`: 모델 예측(추론)만 가능

### 12.3 LLaMA Guard 보안 필터링

**LLaMA Guard 4** 모델을 사용하여 모든 사용자 입력을 필터링하는 것을 권장합니다.

**필터링 파이프라인 예시**:
```
사용자 입력 → LLaMA Guard 필터링 → 안전한 입력만 다른 모델로 전달
```

---

## 13. 성능 최적화

### 13.1 모델 선택 가이드

| 용도 | 추천 모델 | 이유 |
|------|-----------|------|
| 빠른 채팅 응답 | Gemini 2.0 Flash | 낮은 지연시간 |
| 복잡한 분석 | Gemini 2.5 Pro | 고급 추론 능력 |
| 보안 리포트 생성 | Azure GPT-4.1 | 높은 정확도 |
| 시맨틱 검색 | Azure ada-002 v2 | 1536차원 고정확도 |
| 보안 필터링 | LLaMA Guard 4 v4 | 보안 정책 적용 |
| 대규모 배치 처리 | NVIDIA DeepSeek-v3.1 | 고성능 추론 |

### 13.2 캐싱 전략

자주 사용되는 쿼리는 **Redis** 또는 **OpenSearch 캐시**에 저장하여 API 호출 비용을 절감할 수 있습니다.

**캐싱 예시**:
```javascript
const cacheKey = `ml_predict_${modelId}_${hash(input)}`;
const cached = await redis.get(cacheKey);
if (cached) return JSON.parse(cached);

const result = await mlPredict(modelId, input);
await redis.setex(cacheKey, 3600, JSON.stringify(result)); // 1시간 캐싱
return result;
```

---

## 14. 비용 최적화

### 14.1 모델별 비용 (예상)

| 모델 | 제공업체 | 비용 (1M 토큰) | 적용일 |
|------|---------|----------------|--------|
| DeepSeek-v3.1 | NVIDIA | $0.30 | 2025-10 |
| LLaMA 3.1 8B | NVIDIA | $0.20 | 2025-10 |
| Gemini 2.0 Flash | Google | $0.15 | 2025-10 |
| Gemini 2.5 Pro | Google | $1.25 | 2025-10 |
| GPT-4.1 | Azure | $5.00 | 2025-10 |
| ada-002 | Azure | $0.10 | 2025-10 |

**참고**: 실제 비용은 제공업체 정책에 따라 변경될 수 있습니다.

### 14.2 비용 절감 전략

1. **모델 선택**: 복잡도에 따라 적절한 모델 선택
2. **캐싱**: 동일한 쿼리 결과 재사용
3. **배치 처리**: 여러 요청을 묶어서 처리
4. **프롬프트 최적화**: 불필요한 토큰 제거
5. **Embedding 재사용**: 동일한 텍스트의 임베딩 재사용

---

## 15. 문제 해결

### 15.1 모델 배포 실패

**증상**: 모델 상태가 `DEPLOY_FAILED`

**해결 방법**:
1. 커넥터 설정 확인
2. API 키 유효성 검증
3. 네트워크 연결 확인
4. 로그 확인: `/_plugins/_ml/tasks/{task_id}`

### 15.2 API 호출 실패

**증상**: `401 Unauthorized` 또는 `403 Forbidden`

**해결 방법**:
1. API 키 갱신
2. AWS KMS 암호화 키 확인
3. OpenSearch Security 역할 확인

### 15.3 느린 응답 시간

**증상**: 모델 응답 시간 > 10초

**해결 방법**:
1. 더 빠른 모델 사용 (Flash 시리즈)
2. `max_tokens` 파라미터 감소
3. 캐싱 적용
4. 배치 크기 조정

---

**생성 도구**: Claude Code + opensearch-mcp-inbridge
**최종 업데이트**: 2025-10-25
**버전**: 1.0
