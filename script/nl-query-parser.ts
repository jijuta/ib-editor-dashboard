import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  NLQueryParams,
  validateNLQueryParams,
  safeValidateNLQueryParams,
  DataType,
  QueryType,
} from './nl-query-schema.js';
import { parseDate } from './date-parser.js';
import {
  getIndexPattern,
  getSummaryFields,
  getFullFields,
  keywordToDataType,
  normalizeVendor,
} from './index-mapping.js';

/**
 * NLU 엔진 - 자연어 질문을 파싱하여 NLQueryParams 생성
 */

// Gemini API 초기화 (lazy initialization)
let genAI: GoogleGenerativeAI | null = null;

function getGeminiAI(): GoogleGenerativeAI | null {
  if (genAI) return genAI;

  const GEMINI_API_KEY =
    process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY;

  if (!GEMINI_API_KEY) {
    console.error(
      '[NL Parser] ⚠️ GEMINI_API_KEY not found. Using fallback mode.'
    );
    return null;
  }

  genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  return genAI;
}

/**
 * 모델 선택 옵션
 */
export type GeminiModel = 'gemini-2.5-pro' | 'gemini-2.0-flash';

/**
 * 파싱 옵션
 */
export interface ParseOptions {
  model?: GeminiModel;
  referenceDate?: Date;
  debug?: boolean;
}

/**
 * AI 시스템 프롬프트 (최적화 버전)
 * 분석 기반:
 * - OpenSearch 인덱스 매핑 분석 (incidents, alerts, file_artifacts 등)
 * - 612줄 → 280줄로 축소 (54% 감소)
 * - 중복 제거 및 구조화
 * - 실제 필드명 기반 매핑 (incident_id.keyword, severity.keyword 등)
 */
const SYSTEM_PROMPT = `# NL-SIEM Query Parser

당신은 보안 분석가의 자연어 질문을 OpenSearch DSL 파라미터로 변환하는 AI입니다.

## 🎯 Core Rules (우선순위 순)

### 1️⃣ 인시던트 ID 패턴 (최우선!)
**패턴**: 6-9자리 숫자 (414011, 888-000042 등) + "인시던트|incident" 키워드

**처리**:
- queryType: "detail"
- filters.custom.incident_id.keyword: "[ID]"
- timeRange: 2024-01-01 ~ 2025-12-31 (넓게 설정)
- limit: 1
- ⚠️ "분석", "보고서" 등 다른 키워드 무시!

**예시**:
- "414011 인시던트 상세분석" → detail + filters.custom.incident_id.keyword="414011"
- "888-000042 조사" → detail + limit=1

### 2️⃣ Limit 추출 (필수!)
**패턴**: "최신 N개", "상위 N개", "N개 보여줘", "TOP N"

**처리**: limit: N (반드시 JSON에 포함!)

**예시**:
- "최신 10개" → limit: 10
- "20개 보여줘" → limit: 20

### 3️⃣ 위협 유형 필터
**패턴**: "랜섬웨어", "APT", "피싱", "T1055", "T1486" 등 MITRE 코드

**처리**: filters.custom.threat_keywords: ["ransomware", "T1486", ...]

**자동 매핑**:
- 랜섬웨어 → ["ransomware", "T1486"]
- 피싱 → ["phishing", "T1566"]
- 프로세스 인젝션 → ["process injection", "T1055"]

### 4️⃣ 알럿 카테고리 필터 (Alert Category)
**패턴**: "Malware 카테고리", "Persistence 관련", "Defense Evasion 유형" 등

**처리**: filters.custom["category.keyword"]: "Malware" | "Persistence" | "Defense Evasion" | ...

**자동 매핑**:
- Malware / 멀웨어 → category.keyword: "Malware"
- Persistence / 지속성 / 영속성 → category.keyword: "Persistence"
- Defense Evasion / 방어 회피 → category.keyword: "Defense Evasion"
- Command and Control / C2 → category.keyword: "Command and Control"
- Execution / 실행 → category.keyword: "Execution"
- Lateral Movement / 측면 이동 → category.keyword: "Lateral Movement"

**예시**:
- "Malware 카테고리 알럿 분석" → filters.custom["category.keyword"]: "Malware"
- "Persistence 관련 알럿 조사" → filters.custom["category.keyword"]: "Persistence"

### 5️⃣ 프로세스 이름 필터 (Process Name)
**패턴**: "wps.exe 실행", "powershell.exe 이벤트" 등

**처리**: filters.custom["action_process_image_name.keyword"]: "powershell.exe"

**주요 필드**:
- action_process_image_name.keyword: 실행된 프로세스 이름
- causality_actor_process_image_name.keyword: 부모 프로세스 이름

**예시**:
- "wps.exe 실행 이벤트" → filters.custom["action_process_image_name.keyword"]: "wps.exe"
- "powershell.exe 트렌드" → filters.custom["action_process_image_name.keyword"]: "powershell.exe"

## 📊 Query Type 분류 (5가지)

| Type | Keywords | Priority | Aggregation | Use Case |
|------|----------|----------|-------------|----------|
| **investigation** | ID 패턴, 조사, 상세 | 최우선 | none | 특정 인시던트 조사 |
| **overview** | 현황, 상황, 요약 | 높음 | terms | 간단한 통계 |
| **analysis** | 분석, 종합 | 중간 | multi | 심층 분석 (MITRE/IOC/CVE) |
| **report** | 보고서, 리포트 | 중간 | all | 전문 보고서 |
| **list** | 목록, 리스트, N개 | 낮음 | none | 데이터 목록 |

**우선순위**: investigation > overview > analysis > report > list

**예시**:
- "414011 인시던트 분석" → investigation (ID 우선!)
- "오늘 인시던트 현황" → overview
- "랜섬웨어 분석" → analysis (위협 유형)
- "주간 보고서" → report
- "최신 10개" → list (limit=10)

## 📝 Data Type (실제 OpenSearch 인덱스 기반)

| Keyword | dataType | Index Pattern | Key Fields |
|---------|----------|---------------|------------|
| 인시던트, incident | incidents | logs-cortex_xdr-incidents-* | incident_id.keyword, severity.keyword, status.keyword |
| 알럿, alert | alerts | logs-cortex_xdr-alerts-* | alert_id.keyword, name, incident_id.keyword |
| 파일, hash | file_artifacts | logs-cortex_xdr-file-artifacts-* | file_sha256.keyword, file_name.keyword |
| 네트워크, IP | network_artifacts | logs-cortex_xdr-network-artifacts-* | action_remote_ip.keyword |
| 엔드포인트 | endpoints | logs-cortex_xdr-endpoints | endpoint_name.keyword |
| TI 분석 | ti_results | ti-correlation-results-* | source_id.keyword |

⚠️ **중요**: 짧은 형태("files", "network") 금지! 반드시 full enum 값 사용!

## 🗓️ Time Range (간결 버전)

| Expression | Result |
|------------|--------|
| 오늘 | start: today 00:00, end: now |
| 최근 3일 | start: now-3d, end: now |
| 9월 8일~12일 | start: 2025-09-08T00:00:00Z, end: 2025-09-12T23:59:59Z |
| 이번 주 | start: 월요일 00:00, end: now |

**중요**: IOC/인시던트 ID 조회 시 timeRange 넓게 설정 (2024-01-01 ~ 2025-12-31)

## 🔍 Filters (OpenSearch 필드 매핑)

**기본 필터**:
- severity.keyword: ["critical", "high", "medium", "low"]
- status.keyword: ["new", "under_investigation", "resolved_*"]
- vendor.keyword: "crowdstrike" | "cisco" | ...

**Custom 필터** (⚠️ .keyword 필수!):
- incident_id.keyword: "414011"
- file_sha256.keyword: "abc123..."
- alert_id.keyword: "12345"

**위협 검색**:
- filters.custom.threat_keywords: ["ransomware", "T1486"] → description/MITRE 필드 검색

## 📤 JSON Output Format

**중요**: JSON만 반환! 설명 금지!

\`\`\`json
{
  "queryType": "detail",
  "dataType": "incidents",
  "timeRange": {"start": "2024-01-01T00:00:00Z", "end": "2025-12-31T23:59:59Z"},
  "filters": {"custom": {"incident_id.keyword": "414011"}},
  "limit": 1,
  "format": ["markdown", "json"]
}
\`\`\`

**1. Investigation (인시던트 ID)**
- Q: "414011 인시던트 분석"
- A: {"queryType":"detail", "filters":{"custom":{"incident_id.keyword":"414011"}}, "limit":1}

**2. Overview**
- Q: "오늘 인시던트 현황"
- A: {"queryType":"overview", "aggregation":"terms"}

**3. Analysis (위협 유형)**
- Q: "랜섬웨어 인시던트 분석"
- A: {"queryType":"analysis", "filters":{"custom":{"threat_keywords":["ransomware","T1486"]}}}

**4. List (limit 추출)**
- Q: "최신 10개 알럿"
- A: {"queryType":"detail", "dataType":"alerts", "limit":10}

**5. Report**
- Q: "주간 보안 보고서"
- A: {"queryType":"report", "aggregation":"terms"}

## 🎯 Final Notes

**중요 제약사항**:
1. JSON만 반환 (설명 금지)
2. 정확한 enum 값 사용 (dataType, queryType)
3. Keyword 필드 사용 (.keyword 접미사)
4. Limit 패턴 발견 시 반드시 설정
5. 우선순위 준수 (인시던트 ID > 위협 유형 > 일반)

이제 사용자의 질문을 파싱하세요.`;

/**
 * AI 모델 호출 (Gemini)
 */
async function callGeminiAPI(
  query: string,
  model: GeminiModel = 'gemini-2.0-flash',
  referenceDate: Date = new Date()
): Promise<string> {
  const api = getGeminiAI();
  if (!api) {
    throw new Error('Gemini API not initialized (API key missing)');
  }

  const modelInstance = api.getGenerativeModel({ model });

  const currentDate = referenceDate.toISOString();
  const userPrompt = `현재 시각: ${currentDate}\n\n사용자 질문: ${query}`;

  const result = await modelInstance.generateContent([
    { text: SYSTEM_PROMPT },
    { text: userPrompt },
  ]);

  const response = result.response;
  const text = response.text();

  return text;
}

/**
 * AI 응답에서 JSON 추출
 */
function extractJSON(text: string): any {
  // 1. JSON 코드 블록 패턴 매칭
  const codeBlockMatch = text.match(/```(?:json)?\s*\n([\s\S]*?)\n```/);
  if (codeBlockMatch) {
    try {
      return JSON.parse(codeBlockMatch[1]);
    } catch (e) {
      // 파싱 실패 시 다음 방법 시도
    }
  }

  // 2. 첫 번째 { } 객체 추출
  const objectMatch = text.match(/\{[\s\S]*\}/);
  if (objectMatch) {
    try {
      return JSON.parse(objectMatch[0]);
    } catch (e) {
      // 파싱 실패 시 다음 방법 시도
    }
  }

  // 3. 전체 텍스트를 JSON으로 파싱 시도
  try {
    return JSON.parse(text);
  } catch (e) {
    throw new Error(`Failed to extract JSON from AI response: ${text}`);
  }
}

/**
 * AI 응답 후처리 (indexPattern, fields, limit 자동 보완)
 */
function postProcessAIResponse(data: any, originalQuery: string): any {
  // 🔥 dataType 정규화 (AI가 짧은 형태로 반환할 경우 매핑)
  const dataTypeMapping: Record<string, string> = {
    'network': 'network_artifacts',
    'networks': 'network_artifacts',
    '네트워크': 'network_artifacts',
    'file': 'file_artifacts',
    'files': 'file_artifacts',
    '파일': 'file_artifacts',
    'endpoint': 'endpoints',
    '엔드포인트': 'endpoints',
    'alert': 'alerts',
    '알럿': 'alerts',
    '알림': 'alerts',
    'incident': 'incidents',
    '인시던트': 'incidents',
    'audit': 'audit_logs',
    '감사': 'audit_logs',
    'agent_audit': 'agent_audit_logs',
  };

  // AI가 반환한 dataType 정규화
  if (data.dataType && dataTypeMapping[data.dataType]) {
    const originalDataType = data.dataType;
    data.dataType = dataTypeMapping[data.dataType];
    console.log(`[NL Parser] 🔧 dataType normalized: "${originalDataType}" → "${data.dataType}"`);
  }

  const dataType = data.dataType as DataType;

  // ⭐ CRITICAL FIX: 인시던트 ID 패턴 감지 → queryType 및 timeRange 강제 수정
  // 더 강력한 패턴: 6~9자리 숫자 OR 하이픈 포함 패턴 (888-000388)
  const incidentIdMatch = originalQuery.match(/(\d{6,9}(?:-\d+)?|\d{3}-\d{6})/);
  const hasIncidentKeyword = /인시던트|incident|분석|조회|검색|찾|보여|상세|report|detail|analyze|해시|리스트/i.test(originalQuery);

  const hasIP = /\b(?:\d{1,3}\.){3}\d{1,3}\b/.test(originalQuery);
  const hasHash = /\b[a-f0-9]{32,64}\b/i.test(originalQuery);
  const hasDomain = /(?:도메인|domain)?\s*([a-z0-9-]+\.[a-z]{2,})/i.test(originalQuery);

  // 🔥 QueryType 결정 로직 개선
  const hasListKeywords = /리스트|목록|list|보여줘|찾아줘/i.test(originalQuery);
  const hasReportKeywords = /분석해줘|분석\s*결과|종합|보고서|리포트|report/i.test(originalQuery);
  const hasStatusKeywords = /현황|상태|status|요약/i.test(originalQuery);
  const hasStatsKeywords = /통계|분포|개수|몇\s*개|statistics|count/i.test(originalQuery);
  const hasChartKeywords = /차트|그래프|트렌드|추이|변화|시각화|chart|trend/i.test(originalQuery);

  // 파일 아티팩트 관련 키워드
  const hasFileArtifacts = /파일\s*(아티팩트)?|file\s*(artifact)?|hash|해시/i.test(originalQuery);
  const hasNetworkArtifacts = /네트워크\s*(아티팩트)?|network\s*(artifact)?|IP|포트/i.test(originalQuery);

  // 1. 인시던트 ID 감지 → 무조건 detail + custom filter + 넓은 범위
  if (incidentIdMatch && hasIncidentKeyword) {
    const incidentId = incidentIdMatch[1];
    console.log(`[NL Parser] 🔴 인시던트 ID 감지: ${incidentId} → AI 응답 무시하고 강제 설정`);
    console.log(`[NL Parser]   - Original queryType: ${data.queryType} → detail`);
    console.log(`[NL Parser]   - Original dataType: ${data.dataType} → incidents`);

    // AI 응답 완전 무시하고 강제 덮어쓰기
    data.queryType = 'detail';
    data.dataType = 'incidents';
    data.indexPattern = 'logs-cortex_xdr-incidents-*';
    data.timeRange = {
      start: '2024-01-01T00:00:00.000Z',
      end: '2025-12-31T23:59:59.999Z',
    };
    data.filters = {
      custom: {
        'incident_id.keyword': incidentId,
      },
    };
    data.limit = 1; // 인시던트 ID는 유니크
    data.optimize = 'detail';
    // fields는 아래에서 자동 보완됨
  }
  // 1-0. 쿼리 타입 자동 보정 (AI가 잘못 판단한 경우)
  else if (!incidentIdMatch) {
    // 파일/네트워크 아티팩트 처리
    if (hasFileArtifacts && !data.dataType) {
      data.dataType = 'file_artifacts';
      console.log(`[NL Parser] 🔧 dataType 자동 설정: file_artifacts`);
    } else if (hasNetworkArtifacts && !data.dataType) {
      data.dataType = 'network_artifacts';
      console.log(`[NL Parser] 🔧 dataType 자동 설정: network_artifacts`);
    }

    // 쿼리 타입 우선순위 결정
    if (hasListKeywords) {
      // "리스트", "목록" 등이 있으면 무조건 detail
      if (data.queryType !== 'detail') {
        console.log(`[NL Parser] 🔧 queryType 보정: ${data.queryType} → detail (리스트/목록 키워드)`);
        data.queryType = 'detail';
      }
    } else if (hasReportKeywords && !hasListKeywords) {
      // "분석해줘", "보고서" 등이 있으면 report
      if (data.queryType !== 'report') {
        console.log(`[NL Parser] 🔧 queryType 보정: ${data.queryType} → report (분석/보고서 키워드)`);
        data.queryType = 'report';
      }
    } else if (hasStatusKeywords && !hasReportKeywords && !hasListKeywords) {
      // "현황"이 단독으로 있으면 statistics
      if (data.queryType !== 'statistics' && data.queryType !== 'report') {
        console.log(`[NL Parser] 🔧 queryType 보정: ${data.queryType} → statistics (현황 키워드)`);
        data.queryType = 'statistics';
      }
    } else if (hasChartKeywords) {
      // 차트/트렌드 키워드
      if (data.queryType !== 'chart') {
        console.log(`[NL Parser] 🔧 queryType 보정: ${data.queryType} → chart (차트/트렌드 키워드)`);
        data.queryType = 'chart';
      }
    } else if (hasStatsKeywords) {
      // 통계 키워드
      if (data.queryType !== 'statistics') {
        console.log(`[NL Parser] 🔧 queryType 보정: ${data.queryType} → statistics (통계 키워드)`);
        data.queryType = 'statistics';
      }
    }
  }
  // 1-1. limit 파라미터 강제 감지 ("N개만" 패턴)
  const limitMatch = originalQuery.match(/(\d+)\s*개\s*만/);
  if (limitMatch) {
    const limitValue = parseInt(limitMatch[1], 10);
    console.log(`[NL Parser] 🟢 limit 감지: "${limitMatch[0]}" → ${limitValue}`);
    data.limit = limitValue;
  }

  // 1-2. 날짜 범위 정확도 개선 ("X월 Y일 에서 Z일까지" 패턴)
  const dateRangeMatch = originalQuery.match(/(\d+)\s*월\s*(\d+)\s*일\s*[^\d]{0,10}\s*(\d+)\s*일/);
  if (dateRangeMatch) {
    const month = parseInt(dateRangeMatch[1], 10);
    const startDay = parseInt(dateRangeMatch[2], 10);
    const endDay = parseInt(dateRangeMatch[3], 10);

    // 현재 연도 기준으로 날짜 생성 (2025년)
    const year = 2025;
    const start = new Date(Date.UTC(year, month - 1, startDay, 0, 0, 0));
    const end = new Date(Date.UTC(year, month - 1, endDay, 23, 59, 59, 999));

    console.log(`[NL Parser] 🟡 날짜 범위 감지: ${month}월 ${startDay}일~${endDay}일 → ${start.toISOString()} ~ ${end.toISOString()}`);

    data.timeRange = {
      start: start.toISOString(),
      end: end.toISOString(),
    };
  }

  // 1-3. severity 필터 강제 감지 ("하이 이상", "크리티컬" 패턴)
  const hasSeverityHighPlus = /하이\s*이상|high\s*이상|크리티컬\s*이상|critical\s*이상/i.test(originalQuery);
  const hasSeverityCritical = /크리티컬|critical/i.test(originalQuery);

  if (hasSeverityHighPlus) {
    console.log(`[NL Parser] 🔴 severity 필터 감지: "하이 이상" → ['high', 'critical']`);
    if (!data.filters) {
      data.filters = {};
    }
    data.filters.severity = ['high', 'critical'];
  } else if (hasSeverityCritical && !data.filters?.severity) {
    // AI가 이미 severity를 설정했으면 유지, 아니면 설정
    console.log(`[NL Parser] 🔴 severity 필터 감지: "크리티컬" → ['critical']`);
    if (!data.filters) {
      data.filters = {};
    }
    data.filters.severity = ['critical'];
  }

  // 1-4. 위협 유형 필터 감지 (랜섬웨어, APT, 피싱, 멀웨어 등) ⭐ NEW!
  const threatTypeKeywords = detectThreatType(originalQuery);
  if (threatTypeKeywords.length > 0) {
    console.log(`[NL Parser] 🟠 위협 유형 감지: ${threatTypeKeywords.join(', ')}`);
    if (!data.filters) {
      data.filters = {};
    }
    if (!data.filters.custom) {
      data.filters.custom = {};
    }
    data.filters.custom.threat_keywords = threatTypeKeywords;
  }

  // 1-5. 알럿 카테고리 필터 감지 (Malware, Persistence, Defense Evasion 등) ⭐ NEW!
  const alertCategory = detectAlertCategory(originalQuery);
  if (alertCategory) {
    console.log(`[NL Parser] 🟢 알럿 카테고리 감지: ${alertCategory}`);
    if (!data.filters) {
      data.filters = {};
    }
    if (!data.filters.custom) {
      data.filters.custom = {};
    }
    data.filters.custom['category.keyword'] = alertCategory;
  }

  // 1-6. 프로세스 이름 필터 감지 (wps.exe, powershell.exe 등) ⭐ NEW!
  const processName = detectProcessName(originalQuery);
  if (processName) {
    console.log(`[NL Parser] 🔵 프로세스 이름 감지: ${processName}`);
    if (!data.filters) {
      data.filters = {};
    }
    if (!data.filters.custom) {
      data.filters.custom = {};
    }
    data.filters.custom['action_process_image_name.keyword'] = processName;
  }

  // 2. IOC 패턴 감지 → timeRange만 확장
  else if (hasIP || hasHash || hasDomain) {
    console.log(`[NL Parser] 🔴 IOC 패턴 감지 → timeRange 강제 확장`);
    data.timeRange = {
      start: '2024-01-01T00:00:00.000Z',
      end: '2025-12-31T23:59:59.999Z',
    };
  }

  // indexPattern 자동 보완
  if (!data.indexPattern && dataType) {
    data.indexPattern = getIndexPattern(dataType);
  }

  // fields 자동 보완 (detail 쿼리)
  if (data.queryType === 'detail' && !data.fields && dataType) {
    const optimize = data.optimize || 'auto';
    if (optimize === 'aggregate') {
      data.fields = getSummaryFields(dataType);
    } else {
      data.fields = getFullFields(dataType);
    }
  }

  // limit 추출 (AI가 추출 못했을 경우 폴백)
  if (data.queryType === 'detail' && !data.limit) {
    const limitFromQuery = extractLimitFromQuery(originalQuery);
    if (limitFromQuery) {
      data.limit = limitFromQuery;
    }
  }

  // optimize 기본값
  if (!data.optimize) {
    if (data.queryType === 'statistics' || data.queryType === 'chart') {
      data.optimize = 'aggregate';
    } else if (data.queryType === 'detail') {
      data.optimize = 'detail';
    } else {
      data.optimize = 'auto';
    }
  }

  // format 기본값
  if (!data.format || data.format.length === 0) {
    data.format = ['markdown', 'json'];
  }

  return data;
}

/**
 * 자연어에서 limit 추출
 * "10개 보여줘", "20개만", "5개 조회" 등의 패턴
 */
function extractLimitFromQuery(query: string): number | null {
  // 패턴: 숫자 + (개|건)
  const patterns = [
    /(\d+)\s*개(?:\s*(?:보여|표시|조회|찾|검색|가져))/,
    /(\d+)\s*개(?:\s*만)?$/,
    /(\d+)\s*건(?:\s*(?:보여|표시|조회|찾|검색|가져))/,
    /최근\s*(\d+)\s*개/,
    /상위\s*(\d+)\s*개/,
  ];

  for (const pattern of patterns) {
    const match = query.match(pattern);
    if (match) {
      const limit = parseInt(match[1], 10);
      // 합리적인 범위만 허용 (1 ~ 10000)
      if (limit >= 1 && limit <= 10000) {
        return limit;
      }
    }
  }

  return null;
}

/**
 * 위협 유형 감지 (랜섬웨어, APT, 피싱, 멀웨어 등)
 * @returns 감지된 위협 키워드 배열
 */
function detectThreatType(query: string): string[] {
  const queryLower = query.toLowerCase();
  const keywords: string[] = [];

  // 0. MITRE ATT&CK T-코드 직접 감지 ⭐ NEW!
  // T1486 → ransomware
  if (/T1486/i.test(query)) {
    keywords.push('ransomware');
    keywords.push('T1486');
    keywords.push('Data Encrypted for Impact');
  }

  // T1566 → phishing
  if (/T1566/i.test(query)) {
    keywords.push('phishing');
    keywords.push('T1566');
  }

  // T1021 → lateral movement
  if (/T1021/i.test(query)) {
    keywords.push('lateral movement');
    keywords.push('T1021');
    keywords.push('Remote Services');
  }

  // T1190 → exploit
  if (/T1190/i.test(query)) {
    keywords.push('exploit');
    keywords.push('T1190');
    keywords.push('Exploit Public-Facing Application');
  }

  // T1068 → privilege escalation
  if (/T1068/i.test(query)) {
    keywords.push('privilege escalation');
    keywords.push('T1068');
  }

  // T1055 → process injection
  if (/T1055/i.test(query)) {
    keywords.push('process injection');
    keywords.push('T1055');
  }

  // T1041, T1048 → exfiltration
  if (/T1041|T1048/i.test(query)) {
    keywords.push('exfiltration');
    keywords.push(query.match(/T104[18]/i)?.[0] || 'T1041');
  }

  // T1059 → command execution
  if (/T1059/i.test(query)) {
    keywords.push('command execution');
    keywords.push('T1059');
    keywords.push('Command and Scripting Interpreter');
  }

  // T1218 → signed binary proxy execution (LOLBins)
  if (/T1218/i.test(query)) {
    keywords.push('lolbin');
    keywords.push('T1218');
    keywords.push('Signed Binary Proxy Execution');
  }

  // TA0011 → C2 (Tactic)
  if (/TA0011/i.test(query)) {
    keywords.push('command and control');
    keywords.push('TA0011');
  }

  // 1. 랜섬웨어 (키워드 기반)
  if (/랜섬웨어|ransomware|랜섬|암호화\s*공격|데이터\s*암호화/i.test(query)) {
    if (!keywords.includes('ransomware')) {
      keywords.push('ransomware');
    }
    if (!keywords.includes('T1486')) {
      keywords.push('T1486');
    }
  }

  // 2. 멀웨어 (일반)
  if (/멀웨어|malware|악성\s*코드|악성\s*프로그램|virus|바이러스|trojan|트로이목마|backdoor|백도어/i.test(query)) {
    // 이미 랜섬웨어가 포함되어 있지 않으면 추가
    if (!keywords.includes('ransomware')) {
      keywords.push('malware');
    }
  }

  // 3. APT (Advanced Persistent Threat)
  if (/APT|advanced\s*persistent\s*threat|지능형\s*지속\s*위협|APT\s*\d+/i.test(query)) {
    keywords.push('APT');
    keywords.push('advanced threat');
  }

  // 4. 피싱
  if (/피싱|phishing|스피어\s*피싱|spear\s*phishing|이메일\s*공격/i.test(query)) {
    keywords.push('phishing');
    keywords.push('T1566'); // MITRE: Phishing
  }

  // 5. 익스플로잇 / 취약점 악용
  if (/익스플로잇|exploit|CVE-\d{4}-\d+|취약점\s*악용|vulnerability\s*exploit/i.test(query)) {
    keywords.push('exploit');
    keywords.push('T1190'); // MITRE: Exploit Public-Facing Application
  }

  // 6. 측면 이동 (Lateral Movement)
  if (/측면\s*이동|lateral\s*movement|내부\s*확산|network\s*propagation/i.test(query)) {
    keywords.push('lateral movement');
    keywords.push('T1021'); // MITRE: Remote Services
  }

  // 7. 권한 상승 (Privilege Escalation)
  if (/권한\s*상승|privilege\s*escalation|권한\s*획득|elevation\s*of\s*privilege/i.test(query)) {
    keywords.push('privilege escalation');
    keywords.push('T1068'); // MITRE: Exploitation for Privilege Escalation
  }

  // 8. 데이터 유출 (Exfiltration)
  if (/데이터\s*유출|exfiltration|정보\s*유출|데이터\s*탈취|data\s*theft/i.test(query)) {
    keywords.push('exfiltration');
    keywords.push('T1041'); // MITRE: Exfiltration Over C2 Channel
  }

  // 9. C2 통신 (Command and Control)
  if (/C2|command\s*and\s*control|명령\s*제어|C&C|비정상\s*통신/i.test(query)) {
    keywords.push('command and control');
    keywords.push('TA0011'); // MITRE Tactic: Command and Control
  }

  // 10. 프로세스 인젝션
  if (/프로세스\s*인젝션|process\s*injection|코드\s*인젝션|code\s*injection/i.test(query)) {
    keywords.push('process injection');
    keywords.push('T1055'); // MITRE: Process Injection
  }

  return keywords;
}

/**
 * 알럿 카테고리 감지 (Malware, Persistence, Defense Evasion 등) ⭐ NEW!
 * @returns 감지된 카테고리 (최대 1개)
 */
function detectAlertCategory(query: string): string | null {
  const queryLower = query.toLowerCase();

  // 우선순위 순으로 검사 (구체적인 것부터)

  // 1. Malware
  if (/malware|멀웨어|악성\s*코드|악성\s*프로그램/i.test(query) && /카테고리|분류|유형|관련/i.test(query)) {
    return 'Malware';
  }

  // 2. Persistence (영속성, 지속성)
  if (/persistence|영속성|지속성/i.test(query) && /관련|카테고리|분류|유형/i.test(query)) {
    return 'Persistence';
  }

  // 3. Defense Evasion (방어 회피)
  if (/defense\s*evasion|방어\s*회피|탐지\s*회피/i.test(query)) {
    return 'Defense Evasion';
  }

  // 4. Command and Control
  if ((/command\s*and\s*control|C2|C&C|명령\s*제어/i.test(query)) && /관련|카테고리|분류|유형/i.test(query)) {
    return 'Command and Control';
  }

  // 5. Execution (실행)
  if (/execution|실행/i.test(query) && /카테고리|분류|유형|관련/i.test(query)) {
    return 'Execution';
  }

  // 6. Lateral Movement (측면 이동)
  if (/lateral\s*movement|측면\s*이동/i.test(query) && /관련|카테고리|분류|유형/i.test(query)) {
    return 'Lateral Movement';
  }

  // 7. Privilege Escalation (권한 상승)
  if (/privilege\s*escalation|권한\s*상승/i.test(query) && /관련|카테고리|분류|유형/i.test(query)) {
    return 'Privilege Escalation';
  }

  return null;
}

/**
 * 프로세스 이름 감지 (wps.exe, powershell.exe 등) ⭐ NEW!
 * @returns 감지된 프로세스 이름 (.exe 포함)
 */
function detectProcessName(query: string): string | null {
  // .exe 파일명 패턴 감지
  const exeMatch = query.match(/([a-z0-9_-]+\.exe)/i);
  if (exeMatch && /실행|이벤트|프로세스|트렌드|분석|조사/i.test(query)) {
    return exeMatch[1].toLowerCase();
  }

  // 일반 프로세스 이름 패턴 (wps, powershell, cmd 등)
  const processPatterns = [
    /powershell(?:\.exe)?/i,
    /cmd(?:\.exe)?/i,
    /wps(?:\.exe)?/i,
    /msedge(?:\.exe)?/i,
    /chrome(?:\.exe)?/i,
    /explorer(?:\.exe)?/i,
    /schtasks(?:\.exe)?/i,
    /runonce(?:\.exe)?/i,
  ];

  for (const pattern of processPatterns) {
    const match = query.match(pattern);
    if (match && /실행|이벤트|프로세스|트렌드|분석|조사/i.test(query)) {
      const processName = match[0].toLowerCase();
      // .exe가 없으면 추가
      return processName.endsWith('.exe') ? processName : `${processName}.exe`;
    }
  }

  return null;
}

/**
 * 프로그래밍 방식 파싱 (폴백)
 * AI 호출 실패 시 간단한 규칙 기반 파싱
 */
function fallbackParse(
  query: string,
  referenceDate: Date = new Date()
): Partial<NLQueryParams> {
  const queryLower = query.toLowerCase();

  // 0. ⭐ 최우선: 인시던트 ID 패턴 감지 (postProcessAIResponse와 동일 로직)
  // 하이픈 포함 패턴 지원: 414184, 888-000388
  const incidentIdMatch = query.match(/(\d{6,9}(?:-\d+)?|\d{3}-\d{6})/);
  const hasIncidentKeyword = /인시던트|incident|분석|조회|검색|찾|보여|상세|report|detail|analyze|해시|리스트/i.test(query);

  if (incidentIdMatch && hasIncidentKeyword) {
    const incidentId = incidentIdMatch[1];
    console.log(`[Fallback Parser] 🔴 인시던트 ID 감지: ${incidentId}`);

    return {
      queryType: 'detail',
      timeRange: {
        start: '2024-01-01T00:00:00.000Z',
        end: '2025-12-31T23:59:59.999Z',
      },
      dataType: 'incidents',
      indexPattern: 'logs-cortex_xdr-incidents-*',
      filters: {
        custom: {
          'incident_id.keyword': incidentId,
        },
      },
      limit: 1,
      format: ['markdown', 'json'],
      optimize: 'detail',
    };
  }

  // 1. queryType 추론
  let queryType: QueryType = 'detail';
  if (
    queryLower.includes('몇 개') ||
    queryLower.includes('얼마나') ||
    queryLower.includes('통계') ||
    queryLower.includes('집계') ||
    queryLower.includes('count')
  ) {
    queryType = 'statistics';
  } else if (
    queryLower.includes('차트') ||
    queryLower.includes('그래프') ||
    queryLower.includes('트렌드') ||
    queryLower.includes('chart')
  ) {
    queryType = 'chart';
  } else if (
    queryLower.includes('상관') ||
    queryLower.includes('연관') ||
    queryLower.includes('관계') ||
    queryLower.includes('correlation')
  ) {
    queryType = 'correlation';
  } else if (
    queryLower.includes('보고서') ||
    queryLower.includes('리포트') ||
    queryLower.includes('분석') ||
    queryLower.includes('report')
  ) {
    queryType = 'report';
  }

  // 2. 날짜 추출
  const dateRange = parseDate(query, referenceDate);
  const timeRange = dateRange || {
    start: new Date(
      referenceDate.getFullYear(),
      referenceDate.getMonth(),
      referenceDate.getDate() - 7
    ).toISOString(),
    end: referenceDate.toISOString(),
  };

  // 3. dataType 추론
  let dataType: DataType = 'incidents'; // 기본값
  const words = query.split(/\s+/);
  for (const word of words) {
    const type = keywordToDataType(word);
    if (type) {
      dataType = type;
      break;
    }
  }

  // 4. severity 추출
  const severity: Array<'critical' | 'high' | 'medium' | 'low'> = [];
  if (
    queryLower.includes('크리티컬') ||
    queryLower.includes('critical') ||
    queryLower.includes('치명적')
  ) {
    severity.push('critical');
  }
  if (
    queryLower.includes('하이') ||
    queryLower.includes('high') ||
    queryLower.includes('높음')
  ) {
    severity.push('high');
  }
  if (
    queryLower.includes('미디엄') ||
    queryLower.includes('medium') ||
    queryLower.includes('중간')
  ) {
    severity.push('medium');
  }
  if (
    queryLower.includes('로우') ||
    queryLower.includes('low') ||
    queryLower.includes('낮음')
  ) {
    severity.push('low');
  }

  // 5. vendor 추출
  let vendor: string | undefined;
  for (const word of words) {
    const normalizedVendor = normalizeVendor(word);
    if (normalizedVendor) {
      vendor = normalizedVendor;
      break;
    }
  }

  // 6. status (처리 상태) 추출 - 우선순위 높은 것부터 검사
  let status: string | undefined;
  // ⭐ 최우선: resolved_* 패턴 (명시적 상태값)
  if (
    queryLower.includes('resolved_true_positive') ||
    queryLower.includes('resolved_threat_handled') ||
    (queryLower.includes('정탐') && queryLower.includes('해결'))
  ) {
    status = 'resolved_true_positive';
  } else if (
    queryLower.includes('resolved_false_positive') ||
    (queryLower.includes('오탐') && queryLower.includes('해결'))
  ) {
    status = 'resolved_false_positive';
  } else if (
    queryLower.includes('resolved_other') ||
    queryLower.includes('기타 해결')
  ) {
    status = 'resolved_other';
  } else if (
    queryLower.includes('resolved_') // Any other resolved_* state
  ) {
    // Extract exact status value (e.g., "resolved_duplicate")
    const statusMatch = query.match(/resolved_[a-z_]+/i);
    if (statusMatch) {
      status = statusMatch[0].toLowerCase();
    }
  } else if (
    queryLower.includes('new') ||
    queryLower.includes('신규')
  ) {
    status = 'new';
  } else if (
    queryLower.includes('under_investigation') ||
    (queryLower.includes('조사') && !queryLower.includes('resolved')) ||
    (queryLower.includes('분석') && !queryLower.includes('resolved'))
  ) {
    status = 'under_investigation';
  }

  // 7. detection_status (탐지 상태) 추출
  let detection_status: string | undefined;
  if (
    queryLower.includes('true_positive') ||
    queryLower.includes('정탐')
  ) {
    detection_status = 'true_positive';
  } else if (
    queryLower.includes('false_positive') ||
    queryLower.includes('오탐')
  ) {
    detection_status = 'false_positive';
  } else if (
    queryLower.includes('benign') ||
    queryLower.includes('정상')
  ) {
    detection_status = 'benign';
  }

  // 8. 알럿 카테고리 추출 (category.keyword)
  let category: string | undefined;
  const alertCategory = detectAlertCategory(query);
  if (alertCategory) {
    category = alertCategory;
    console.log(`[Fallback Parser] 🟢 알럿 카테고리 감지: ${category}`);
  }

  // 9. 프로세스 이름 추출 (action_process_image_name.keyword)
  let processName: string | undefined;
  const detectedProcess = detectProcessName(query);
  if (detectedProcess) {
    processName = detectedProcess;
    console.log(`[Fallback Parser] 🔵 프로세스 이름 감지: ${processName}`);
  }

  // 10. 결과 조합
  const indexPattern = getIndexPattern(dataType);

  const result: Partial<NLQueryParams> = {
    originalQuery: query,
    queryType,
    timeRange,
    dataType,
    indexPattern,
    filters: {
      ...(severity.length > 0 && { severity }),
      ...(vendor && { vendor }),
      ...(status && { status }),
      ...(detection_status && { detection_status }),
      ...(category || processName
        ? {
            custom: {
              ...(category && { 'category.keyword': category }),
              ...(processName && { 'action_process_image_name.keyword': processName }),
            },
          }
        : {}),
    },
    format: ['markdown', 'json'],
    optimize: queryType === 'statistics' || queryType === 'chart' ? 'aggregate' : 'detail',
  };

  // aggregation (statistics/chart 쿼리)
  if (queryType === 'statistics') {
    result.aggregation = 'count';
  } else if (queryType === 'chart') {
    result.aggregation = 'date_histogram';
  }

  // fields (detail 쿼리)
  if (queryType === 'detail') {
    result.fields = getSummaryFields(dataType);
  }

  // limit 추출 (fallback parser에서도 limit 감지 필요!)
  const limitValue = extractLimitFromQuery(query);
  if (limitValue) {
    result.limit = limitValue;
    console.log(`[Fallback Parser] 🟢 limit 감지: ${limitValue}`);
  }

  return result;
}

/**
 * 메인 파싱 함수
 */
export async function parseNLQuery(
  query: string,
  options: ParseOptions = {}
): Promise<NLQueryParams> {
  const {
    model = 'gemini-2.0-flash',
    referenceDate = new Date(),
    debug = false,
  } = options;

  try {
    // 1. AI 호출
    if (debug) {
      console.log(`[NL Parser] Calling Gemini (${model})...`);
      console.log(`[NL Parser] Query: ${query}`);
    }

    const aiResponse = await callGeminiAPI(query, model, referenceDate);

    if (debug) {
      console.log(`[NL Parser] AI Response:\n${aiResponse}`);
    }

    // 2. JSON 추출
    const parsedJSON = extractJSON(aiResponse);

    if (debug) {
      console.log(`[NL Parser] Parsed JSON:`, parsedJSON);
    }

    // 3. 후처리 (limit 추출 포함)
    const processed = postProcessAIResponse(parsedJSON, query);

    if (debug) {
      console.log(`[NL Parser] Post-processed:`, processed);
    }

    // 🐛 DEBUG: limit 추적
    if (processed.limit) {
      console.log(`[NL Parser] 🟢 Post-process has limit=${processed.limit}, type=${typeof processed.limit}`);
    } else {
      console.log(`[NL Parser] ⚪ Post-process has NO limit`);
    }

    // 4. Zod 검증
    console.log(`[NL Parser] 🔵 Before validation, limit=${processed.limit}`);
    const validated = validateNLQueryParams(processed);
    console.log(`[NL Parser] 🔵 After validation, limit=${validated.limit}`);

    // 🐛 DEBUG: limit 추적
    if (validated.limit) {
      console.log(`[NL Parser] ✅ Validated has limit=${validated.limit}`);
    } else if (processed.limit) {
      console.log(`[NL Parser] ❌ BUG: limit was ${processed.limit} but removed after validation!`);
      console.log(`[NL Parser] ❌ Processed object:`, JSON.stringify(processed, null, 2));
      console.log(`[NL Parser] ❌ Validated object:`, JSON.stringify(validated, null, 2));
    } else {
      console.log(`[NL Parser] ⚪ No limit in both processed and validated`);
    }

    if (debug) {
      console.log(`[NL Parser] Validated:`, validated);
    }

    return validated;
  } catch (error) {
    // AI 호출 실패 시 폴백 파싱
    console.warn(
      `[NL Parser] AI parsing failed, using fallback parser: ${error}`
    );

    const fallbackResult = fallbackParse(query, referenceDate);

    console.log(`[NL Parser] 🟡 Fallback result has limit=${fallbackResult.limit}`);
    if (debug) {
      console.log(`[NL Parser] Fallback result:`, fallbackResult);
    }

    // Zod safe 검증
    console.log(`[NL Parser] 🔵 Before safe validation, limit=${fallbackResult.limit}`);
    const validation = safeValidateNLQueryParams(fallbackResult);

    if (validation.success) {
      console.log(`[NL Parser] ✅ Safe validation success, limit=${validation.data!.limit}`);
      return validation.data!;
    } else {
      console.log(`[NL Parser] ❌ Safe validation failed:`, validation.error.errors);
      throw new Error(
        `Failed to parse query: ${query}\nValidation errors: ${JSON.stringify(validation.error.errors)}`
      );
    }
  }
}

/**
 * 배치 파싱 (여러 질문 동시 처리)
 */
export async function parseNLQueries(
  queries: string[],
  options: ParseOptions = {}
): Promise<NLQueryParams[]> {
  const promises = queries.map((query) => parseNLQuery(query, options));
  return Promise.all(promises);
}

/**
 * 파싱 결과 검증 (테스트용)
 */
export function validateParsedQuery(params: NLQueryParams): {
  valid: boolean;
  errors?: string[];
} {
  const validation = safeValidateNLQueryParams(params);
  if (validation.success) {
    return { valid: true };
  } else {
    return {
      valid: false,
      errors: validation.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
    };
  }
}
