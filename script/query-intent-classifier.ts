/**
 * Query Intent Classifier
 *
 * 3-Tier Hybrid Approach for Query Detection:
 * 1. Quick Keyword Check (~1ms, 80% cases)
 * 2. AI Classification (~300ms, 20% cases)
 * 3. Fallback to conservative approach
 *
 * Accuracy target: 95%+
 * Cost: ~$0.000045/query (75% reduction from current)
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || '');

// =============================================================================
// TIER 1: Quick Keyword Check (Fast Path)
// =============================================================================

/**
 * 빠른 키워드 기반 체크
 * - 확실한 긍정 케이스: 쿼리 키워드 + (시간/심각도/벤더) 조합
 * - 확실한 부정 케이스: 대화형 표현만 있는 경우
 * - 불확실: null 반환 → Tier 2로 이동
 */
function quickKeywordCheck(message: string): boolean | null {
  const lowerMessage = message.toLowerCase();

  // ===== 확실한 긍정 케이스 =====

  // 1. 데이터 조회 동작어 (데이터를 보여주는 의도)
  const showDataKeywords = [
    '찾아', '검색', '조회', '표시', '보여', '출력', '리스트', '목록',
    'show', 'display', 'list', 'find', 'search'
  ];

  // 2. 설명 요청 동작어 (개념/방법 설명 요청)
  const explainKeywords = [
    '알려', '설명', '방법', '어떻게', '뭐야', '무엇',
    'explain', 'how', 'what', 'tell me about'
  ];

  // 3. 시간 표현 (30개)
  const timeKeywords = [
    '오늘', '어제', '최근', '이번주', '지난주', '이번달', '지난달',
    '시간', '일', '주', '월', '년',
    '1시간', '24시간', '7일', '30일', '90일',
    '전', '후', '이내', '동안', '부터', '까지',
    'today', 'yesterday', 'recent', 'last', 'this week', 'last week',
    'hour', 'day', 'week', 'month'
  ];

  // 4. 심각도/상태 필터 (12개)
  const severityKeywords = [
    '크리티컬', 'critical', '높은', 'high', '중간', 'medium', '낮은', 'low',
    '긴급', 'urgent', '심각', 'severe'
  ];

  // 5. 벤더 이름 (8개)
  const vendorKeywords = [
    'cortex', 'xdr', 'crowdstrike', 'falcon', 'microsoft', 'defender',
    'cisco', 'fortinet', 'wazuh', 'google', 'aws'
  ];

  // 6. 데이터 타입 (8개)
  const dataTypeKeywords = [
    '인시던트', 'incident', '알럿', 'alert', '탐지', 'detection',
    '위협', 'threat', '엔드포인트', 'endpoint', 'ioc', 'ttp'
  ];

  // 7. 쿼리 타입 (5개)
  const queryTypeKeywords = [
    '통계', 'statistics', '상세', 'detail', '차트', 'chart',
    '리포트', 'report', '보고서', '상관분석', 'correlation'
  ];

  // 8. MITRE ATT&CK 패턴 및 인시던트 ID 패턴
  const mitrePattern = /T\d{4}(\.\d{3})?/i;
  const incidentIdPattern = /\d{6,9}(-\d+)?/; // 414011, 888-000042 등

  // ===== 긍정 조합 체크 =====
  const hasShowData = showDataKeywords.some(kw => lowerMessage.includes(kw));
  const hasExplainOnly = explainKeywords.some(kw => lowerMessage.includes(kw)) && !hasShowData;
  const hasTime = timeKeywords.some(kw => lowerMessage.includes(kw));
  const hasSeverity = severityKeywords.some(kw => lowerMessage.includes(kw));
  const hasVendor = vendorKeywords.some(kw => lowerMessage.includes(kw));
  const hasDataType = dataTypeKeywords.some(kw => lowerMessage.includes(kw));
  const hasQueryType = queryTypeKeywords.some(kw => lowerMessage.includes(kw));
  const hasMitre = mitrePattern.test(message);
  const hasIncidentId = incidentIdPattern.test(message);

  // ===== 확실한 부정 케이스 (먼저 체크!) =====

  // 1. 설명/정의 요청 패턴 (데이터 조회 아님)
  const explanationPatterns = [
    /란\s*무엇|란\s*뭐/i, // "인시던트란 무엇"
    /가\s*뭐야|가\s*무엇/i, // "인시던트가 뭐야"
    /^(뭐|무엇|어떻게|왜|what|how)\s/i, // 질문으로 시작
    /차이.*뭐|차이.*무엇/i, // "차이가 뭐야"
    /방법.*알려|how\s+to/i, // "방법 알려줘"
  ];

  const isExplanationRequest = explanationPatterns.some(pattern => pattern.test(lowerMessage));

  // 2. 대화형 표현만 있는 경우
  const conversationalOnlyPatterns = [
    /^(안녕|hi|hello|감사|thank)/i,
    /^(그래|응|네|아니|yes|no|ok)$/i,
    /^도와줘|^help me/i
  ];

  const isConversationalOnly = conversationalOnlyPatterns.some(pattern =>
    pattern.test(lowerMessage.trim())
  );

  // 설명 요청이면서 데이터 언급이 없으면 FALSE
  if (isExplanationRequest && !hasDataType && !hasIncidentId) {
    return false; // 확실한 설명 요청
  }

  // 순수 대화형이면 FALSE
  if (isConversationalOnly) {
    return false; // 확실한 대화
  }

  // ===== 확실한 긍정 케이스 =====

  // 인시던트 ID 패턴이 있으면 무조건 TRUE (최우선!)
  if (hasIncidentId && (hasDataType || /인시던트|incident/i.test(lowerMessage))) {
    return true; // 확실한 인시던트 조회
  }

  // 강한 긍정 신호 (2개 이상 조합)
  const positiveSignals = [
    hasShowData,
    hasTime,
    hasSeverity,
    hasVendor,
    hasDataType,
    hasQueryType,
    hasMitre
  ].filter(Boolean).length;

  // 데이터 조회 동작어 + 데이터 타입 = 확실한 쿼리
  if (hasShowData && hasDataType) {
    return true;
  }

  // 2개 이상 조합이면 쿼리
  if (positiveSignals >= 2) {
    return true;
  }

  // ===== 불확실한 케이스 =====
  // 예: "최근 랜섬웨어 인시던트 분석" (시간 + 위협유형 + 데이터타입, but no 조회 동작어)
  // → AI로 판단 필요
  return null;
}

// =============================================================================
// TIER 2: AI Classification (Slow Path)
// =============================================================================

interface AIClassificationResult {
  isQuery: boolean;
  confidence: number;
  reasoning?: string;
}

/**
 * AI 기반 쿼리 의도 분류
 * - Gemini 2.0 Flash 사용 (빠르고 저렴: ~$0.000045/query)
 * - 시스템 프롬프트: 쿼리 vs 대화 이진 분류
 */
async function classifyWithAI(message: string): Promise<AIClassificationResult> {
  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-exp',
      generationConfig: {
        temperature: 0.1, // 낮은 온도로 일관성 확보
        maxOutputTokens: 100,
      }
    });

    const systemPrompt = `
# Role
당신은 보안 쿼리 의도 분류 전문가입니다.

# Task
사용자 메시지를 분석하여 "데이터 쿼리 의도"인지 "일반 대화"인지 분류하세요.

# Classification Criteria

## Query Intent (TRUE)
사용자가 **보안 데이터를 조회/분석하려는 의도**가 있는 경우:

**강한 긍정 신호**:
- 인시던트 ID 패턴: "414011", "888-000042" 등 6-9자리 숫자
- 데이터 조회 동작: "보여줘", "검색해줘", "찾아줘", "출력", "리스트", "목록"
- 시간 범위: "오늘", "최근", "지난주", "24시간", "9월 8일"
- 필터 조건: "크리티컬", "높은 심각도", "Cortex", "랜섬웨어"
- 데이터 타입: "인시던트", "알럿", "탐지", "위협"
- 통계/분석: "몇 개", "통계", "차트", "보고서", "상관분석"
- MITRE 코드: "T1486", "T1059.001"

**판단 기준**:
- 인시던트 ID + 데이터 타입 언급 → 무조건 TRUE
- 데이터 조회 동작 + 데이터 타입 → TRUE
- 위 신호 2개 이상 조합 → TRUE

## Conversational Intent (FALSE)
사용자가 **일반적인 대화** 또는 **개념 설명 요청**을 하는 경우:

**강한 부정 신호**:
- 인사: "안녕", "Hi", "Hello"
- 감사: "고마워", "Thank you"
- 단순 응답: "응", "네", "아니", "ok"
- 정의 질문: "~란 무엇", "~가 뭐야", "~는 뭐"
- 방법 질문: "어떻게 해", "방법 알려줘", "how to"
- 개념 설명: "차이가 뭐야", "설명해줘" (데이터 언급 없음)

**판단 기준**:
- "~란 무엇" / "~가 뭐야" 패턴 → FALSE
- "어떻게", "방법" 등 절차 질문 (데이터 언급 없음) → FALSE
- 인사/감사 표현만 → FALSE

# Special Cases (중요!)

**TRUE 케이스**:
- "최근 랜섬웨어 인시던트 분석" → TRUE (시간 + 위협 + 데이터타입)
- "414011 인시던트 상세" → TRUE (ID + 데이터타입)
- "오늘 크리티컬 알럿 보여줘" → TRUE (시간 + 심각도 + 데이터 + 동작어)
- "인시던트 10개 보여줘" → TRUE (데이터 + 동작어)

**FALSE 케이스**:
- "인시던트가 뭐야?" → FALSE (정의 질문)
- "인시던트와 알럿 차이" → FALSE (개념 비교)
- "어떻게 조회해?" → FALSE (사용법 질문)
- "랜섬웨어란?" → FALSE (용어 설명)
- "안녕" → FALSE (인사)

**주의사항**:
- "알려줘" 단독 → 애매함 (문맥 필요)
- "알려줘" + 데이터 타입 → TRUE
- "알려줘" + 개념 질문 → FALSE

# Output Format (JSON only)
{
  "isQuery": true | false,
  "confidence": 0.0 ~ 1.0,
  "reasoning": "판단 근거 (1-2문장)"
}
`;

    const prompt = `${systemPrompt}

# User Message
"${message}"

# Your Classification (JSON only)`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    // JSON 파싱
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('[AI Classifier] Failed to parse JSON:', responseText);
      return { isQuery: true, confidence: 0.5 }; // 보수적 폴백
    }

    const classification = JSON.parse(jsonMatch[0]);

    return {
      isQuery: classification.isQuery,
      confidence: classification.confidence || 0.5,
      reasoning: classification.reasoning
    };

  } catch (error) {
    console.error('[AI Classifier] Error:', error);
    // 오류 시 중립적으로 판단 (false positive/negative 균형)
    // 간단한 휴리스틱: 데이터 타입 키워드 있으면 쿼리, 없으면 대화
    const hasDataKeyword = /(인시던트|알럿|엔드포인트|위협|탐지|incident|alert|endpoint|threat|detection)/i.test(message);
    return {
      isQuery: hasDataKeyword,
      confidence: 0.4 // 낮은 신뢰도로 표시
    };
  }
}

// =============================================================================
// Main Hybrid Classifier
// =============================================================================

export interface QueryIntentResult {
  isQuery: boolean;
  method: 'quick-keyword' | 'ai-classification' | 'fallback';
  confidence: number;
  processingTime: number;
  details?: {
    reasoning?: string;
  };
}

/**
 * 하이브리드 쿼리 의도 탐지
 *
 * @param message - 사용자 메시지
 * @returns QueryIntentResult - 쿼리 여부, 탐지 방법, 신뢰도, 처리 시간
 */
export async function detectQueryIntent(message: string): Promise<QueryIntentResult> {
  const startTime = Date.now();

  // TIER 1: Quick Keyword Check (~1ms)
  const quickResult = quickKeywordCheck(message);

  if (quickResult !== null) {
    const processingTime = Date.now() - startTime;
    return {
      isQuery: quickResult,
      method: 'quick-keyword',
      confidence: quickResult ? 0.95 : 0.9, // 빠른 경로는 높은 신뢰도
      processingTime,
    };
  }

  // TIER 2: AI Classification (~300ms)
  const aiResult = await classifyWithAI(message);
  const processingTime = Date.now() - startTime;

  return {
    isQuery: aiResult.isQuery,
    method: 'ai-classification',
    confidence: aiResult.confidence,
    processingTime,
    details: {
      reasoning: aiResult.reasoning,
    },
  };
}

/**
 * 배치 분류 (여러 메시지 동시 처리)
 *
 * @param messages - 메시지 배열
 * @returns 분류 결과 배열
 */
export async function batchDetectQueryIntent(messages: string[]): Promise<QueryIntentResult[]> {
  return Promise.all(messages.map(msg => detectQueryIntent(msg)));
}
