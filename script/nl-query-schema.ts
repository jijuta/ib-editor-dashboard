import { z } from 'zod';

/**
 * NL-SIEM Query Parameter Schema
 * 자연어 질문을 파싱한 결과를 검증하는 Zod 스키마
 */

// 쿼리 유형 (⭐ 새로운 5가지 분류)
export const QueryTypeSchema = z.enum([
  'overview', // 현황 - 간단한 통계만 (기존 statistics 대체)
  'analysis', // 분석 - 현황 + 심층 분석 (해시/취약점/IOC/MITRE)
  'report', // 보고서 - 전문 보고서 형식
  'investigation', // 조사 - 특정 인시던트 상세 조사 (기존 detail 대체)
  'list', // 리스트 - 데이터 목록
  // 하위 호환성 유지 (deprecated)
  'statistics', // → overview로 매핑
  'detail', // → investigation 또는 list로 매핑
  'chart', // → overview 또는 analysis로 매핑
  'correlation', // 상관분석
  'ti_correlation', // TI 상관분석
  'incident_relationship', // 인시던트 관계 조회
  'ioc_to_incident', // IOC → Incidents 추적
]);

// 데이터 유형
export const DataTypeSchema = z.enum([
  'incidents', // 인시던트
  'alerts', // 알럿
  'file_artifacts', // 파일 아티팩트
  'network_artifacts', // 네트워크 아티팩트
  'endpoints', // 엔드포인트
  'ti', // 위협 인텔리전스 원본 (threat-intelligence-*)
  'ti_results', // TI 상관분석 결과 (ti-correlation-results-*) - NEW!
  'audit_logs', // 감사 로그
  'agent_audit_logs', // 에이전트 감사 로그
]);

// 심각도
export const SeveritySchema = z.enum(['critical', 'high', 'medium', 'low']);

// 집계 유형
export const AggregationTypeSchema = z.enum([
  'count', // 개수
  'sum', // 합계
  'avg', // 평균
  'terms', // 그룹별 집계
  'date_histogram', // 시간별 히스토그램
]);

// 결과 형식
export const FormatSchema = z.enum(['markdown', 'json', 'chart', 'summary']);

// 최적화 전략
export const OptimizeStrategySchema = z.enum([
  'aggregate', // 집계 우선 (통계만)
  'detail', // 상세 조회 (문서 반환)
  'auto', // 자동 선택
]);

// 시간 범위
export const TimeRangeSchema = z.object({
  start: z.string().datetime(), // ISO 8601
  end: z.string().datetime(), // ISO 8601
});

// 필터
export const FiltersSchema = z
  .object({
    severity: z.array(SeveritySchema).optional(),
    vendor: z.string().optional(), // crowdstrike, microsoft, google, etc.
    status: z.string().optional(), // new, in_progress, resolved, closed, etc.
    detection_status: z.string().optional(), // true_positive, false_positive, benign, etc.
    custom: z.record(z.any()).optional(), // 커스텀 필터
  })
  .optional();

// 메인 파라미터 스키마
export const NLQueryParamsSchema = z.object({
  // 원본 질문 (로깅용)
  originalQuery: z.string().optional(),

  // 쿼리 유형
  queryType: QueryTypeSchema,

  // 시간 범위
  timeRange: TimeRangeSchema,

  // 데이터 유형
  dataType: DataTypeSchema,

  // OpenSearch 인덱스 패턴
  indexPattern: z.string(),

  // 필터
  filters: FiltersSchema,

  // 집계 유형 (통계/차트 쿼리에만 사용)
  aggregation: AggregationTypeSchema.optional(),

  // 반환할 필드 목록 (상세 조회에만 사용)
  fields: z.array(z.string()).optional(),

  // 결과 개수 제한 ("N개 보여줘" 파싱)
  limit: z.number().int().positive().optional(),

  // 결과 형식
  format: z.array(FormatSchema),

  // 최적화 전략
  optimize: OptimizeStrategySchema,

  // 상관분석 대상 인덱스 (correlation 쿼리에만 사용)
  correlationTarget: z.string().optional(),

  // 상관분석 필드 (correlation 쿼리에만 사용)
  correlationField: z.string().optional(),

  // 인시던트 ID (incident_relationship 쿼리에만 사용)
  incident_id: z.string().optional(),

  // Artifact 타입 (incident_relationship 쿼리에만 사용)
  artifact_type: z
    .enum(['alerts', 'files', 'networks', 'processes', 'registries', 'endpoints'])
    .optional(),

  // IOC 값 (ioc_to_incident 쿼리에만 사용)
  ioc_value: z.string().optional(),

  // IOC 타입 (ioc_to_incident 쿼리에만 사용)
  ioc_type: z.enum(['ip', 'domain', 'hash']).optional(),
});

// TypeScript 타입 추출
export type QueryType = z.infer<typeof QueryTypeSchema>;
export type DataType = z.infer<typeof DataTypeSchema>;
export type Severity = z.infer<typeof SeveritySchema>;
export type AggregationType = z.infer<typeof AggregationTypeSchema>;
export type Format = z.infer<typeof FormatSchema>;
export type OptimizeStrategy = z.infer<typeof OptimizeStrategySchema>;
export type TimeRange = z.infer<typeof TimeRangeSchema>;
export type Filters = z.infer<typeof FiltersSchema>;
export type NLQueryParams = z.infer<typeof NLQueryParamsSchema>;

// =============================================================================
// QueryType Terminology Mapping (Unified Standard)
// =============================================================================

/**
 * AI Assistant Router의 Intent를 NL Parser의 QueryType으로 변환
 * @see docs/querytype-terminology-mapping.md
 */
export const INTENT_TO_QUERYTYPE: Record<string, QueryType> = {
  list: 'list',
  stats: 'overview', // stats → overview
  analyze: 'analysis', // analyze → analysis
  investigate: 'investigation', // investigate → investigation
  report: 'report',
};

/**
 * NL Parser의 QueryType을 AI Assistant Router의 Intent로 변환
 * @see docs/querytype-terminology-mapping.md
 */
export const QUERYTYPE_TO_INTENT: Record<QueryType, string> = {
  list: 'list',
  detail: 'list', // detail (deprecated) → list
  overview: 'stats',
  statistics: 'stats', // statistics (deprecated) → stats
  chart: 'stats', // chart (deprecated) → stats
  analysis: 'analyze',
  investigation: 'investigate',
  report: 'report',
  correlation: 'analyze', // correlation → analyze
  ti_correlation: 'analyze',
  incident_relationship: 'investigate',
  ioc_to_incident: 'investigate',
};

/**
 * Deprecated QueryType을 표준 QueryType으로 정규화
 */
export function normalizeQueryType(queryType: QueryType): QueryType {
  const normalized: Record<string, QueryType> = {
    statistics: 'overview', // deprecated
    detail: 'list', // deprecated
    chart: 'overview', // deprecated
  };

  return normalized[queryType] || queryType;
}

// 기본값
export const DEFAULT_PARAMS: Partial<NLQueryParams> = {
  format: ['markdown', 'json'],
  optimize: 'auto',
  filters: {},
};

/**
 * 파라미터 검증 헬퍼 함수
 */
export function validateNLQueryParams(data: unknown): NLQueryParams {
  return NLQueryParamsSchema.parse(data);
}

/**
 * 안전한 파라미터 검증 (에러 대신 결과 객체 반환)
 */
export function safeValidateNLQueryParams(data: unknown): {
  success: boolean;
  data?: NLQueryParams;
  error?: z.ZodError;
} {
  const result = NLQueryParamsSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}
