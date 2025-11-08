/**
 * Query Pattern Learner
 * Memory MCP를 활용한 사용자 쿼리 패턴 학습 시스템
 *
 * 기능:
 * - 자주 사용하는 날짜 범위 추적
 * - 선호하는 데이터 타입 분석
 * - 일반적인 필터 패턴 학습
 * - 쿼리 타입 선호도 분석
 */

import { NLQueryParams } from './nl-query-schema';

/**
 * 쿼리 패턴 인터페이스
 */
export interface QueryPattern {
  id: string;
  query: string;
  params: NLQueryParams;
  timestamp: Date;
  executionTime?: number;
  resultCount?: number;
}

/**
 * 학습된 패턴 통계
 */
export interface PatternStats {
  // 날짜 범위 패턴
  commonDateRanges: {
    pattern: string; // "최근 7일", "이번 주", etc.
    count: number;
    lastUsed: Date;
  }[];

  // 데이터 타입 선호도
  dataTypePreferences: {
    [key: string]: number; // "incidents": 45, "alerts": 30, etc.
  };

  // 쿼리 타입 분포
  queryTypeDistribution: {
    [key: string]: number; // "detail": 50, "statistics": 30, etc.
  };

  // 일반적인 필터
  commonFilters: {
    severity?: string[];
    vendor?: string[];
    status?: string[];
  };

  // 시간대별 사용 패턴
  timeOfDayPattern: {
    morning: number; // 06:00-12:00
    afternoon: number; // 12:00-18:00
    evening: number; // 18:00-24:00
    night: number; // 00:00-06:00
  };

  // 총 쿼리 수
  totalQueries: number;
}

/**
 * 로컬 스토리지 키
 */
const STORAGE_KEY = 'nl-query-patterns';
const MAX_PATTERNS = 100; // 최대 저장 패턴 수

/**
 * 쿼리 패턴 저장
 */
export function saveQueryPattern(
  query: string,
  params: NLQueryParams,
  executionTime?: number,
  resultCount?: number
): void {
  if (typeof window === 'undefined') return; // SSR 환경에서는 실행 안 함

  const pattern: QueryPattern = {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    query,
    params,
    timestamp: new Date(),
    executionTime,
    resultCount,
  };

  try {
    const existing = getQueryPatterns();
    const updated = [pattern, ...existing].slice(0, MAX_PATTERNS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (error) {
    console.warn('Failed to save query pattern:', error);
  }
}

/**
 * 저장된 쿼리 패턴 조회
 */
export function getQueryPatterns(): QueryPattern[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];

    const patterns = JSON.parse(stored) as QueryPattern[];
    // Date 객체 복원
    return patterns.map((p) => ({
      ...p,
      timestamp: new Date(p.timestamp),
    }));
  } catch (error) {
    console.warn('Failed to load query patterns:', error);
    return [];
  }
}

/**
 * 패턴 통계 분석
 */
export function analyzePatterns(): PatternStats {
  const patterns = getQueryPatterns();

  if (patterns.length === 0) {
    return {
      commonDateRanges: [],
      dataTypePreferences: {},
      queryTypeDistribution: {},
      commonFilters: {},
      timeOfDayPattern: {
        morning: 0,
        afternoon: 0,
        evening: 0,
        night: 0,
      },
      totalQueries: 0,
    };
  }

  // 1. 날짜 범위 패턴 분석
  const dateRangeMap = new Map<string, { count: number; lastUsed: Date }>();
  patterns.forEach((p) => {
    const rangeKey = getDateRangeKey(p.params);
    const existing = dateRangeMap.get(rangeKey);
    if (existing) {
      existing.count++;
      if (p.timestamp > existing.lastUsed) {
        existing.lastUsed = p.timestamp;
      }
    } else {
      dateRangeMap.set(rangeKey, { count: 1, lastUsed: p.timestamp });
    }
  });

  const commonDateRanges = Array.from(dateRangeMap.entries())
    .map(([pattern, stats]) => ({ pattern, ...stats }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // 2. 데이터 타입 선호도
  const dataTypePreferences: { [key: string]: number } = {};
  patterns.forEach((p) => {
    const dt = p.params.dataType;
    dataTypePreferences[dt] = (dataTypePreferences[dt] || 0) + 1;
  });

  // 3. 쿼리 타입 분포
  const queryTypeDistribution: { [key: string]: number } = {};
  patterns.forEach((p) => {
    const qt = p.params.queryType;
    queryTypeDistribution[qt] = (queryTypeDistribution[qt] || 0) + 1;
  });

  // 4. 일반적인 필터
  const severityCounts: { [key: string]: number } = {};
  const vendorCounts: { [key: string]: number } = {};
  const statusCounts: { [key: string]: number } = {};

  patterns.forEach((p) => {
    if (p.params.filters?.severity) {
      p.params.filters.severity.forEach((s) => {
        severityCounts[s] = (severityCounts[s] || 0) + 1;
      });
    }
    if (p.params.filters?.vendor) {
      vendorCounts[p.params.filters.vendor] =
        (vendorCounts[p.params.filters.vendor] || 0) + 1;
    }
    if (p.params.filters?.status) {
      statusCounts[p.params.filters.status] =
        (statusCounts[p.params.filters.status] || 0) + 1;
    }
  });

  const commonFilters: PatternStats['commonFilters'] = {};
  if (Object.keys(severityCounts).length > 0) {
    commonFilters.severity = Object.entries(severityCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([k]) => k);
  }
  if (Object.keys(vendorCounts).length > 0) {
    commonFilters.vendor = Object.entries(vendorCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([k]) => k);
  }
  if (Object.keys(statusCounts).length > 0) {
    commonFilters.status = Object.entries(statusCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([k]) => k);
  }

  // 5. 시간대별 사용 패턴
  const timeOfDayPattern = {
    morning: 0,
    afternoon: 0,
    evening: 0,
    night: 0,
  };

  patterns.forEach((p) => {
    const hour = p.timestamp.getHours();
    if (hour >= 6 && hour < 12) timeOfDayPattern.morning++;
    else if (hour >= 12 && hour < 18) timeOfDayPattern.afternoon++;
    else if (hour >= 18 && hour < 24) timeOfDayPattern.evening++;
    else timeOfDayPattern.night++;
  });

  return {
    commonDateRanges,
    dataTypePreferences,
    queryTypeDistribution,
    commonFilters,
    timeOfDayPattern,
    totalQueries: patterns.length,
  };
}

/**
 * 날짜 범위를 대표 키로 변환
 */
function getDateRangeKey(params: NLQueryParams): string {
  if (!params.timeRange) return 'no-date-range';

  const start = new Date(params.timeRange.start);
  const end = new Date(params.timeRange.end);
  const diffDays = Math.ceil(
    (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
  );

  // 일반적인 패턴으로 분류
  if (diffDays === 0) return '오늘';
  if (diffDays === 1) return '최근 1일';
  if (diffDays === 7) return '최근 7일';
  if (diffDays === 30) return '최근 30일';
  if (diffDays === 90) return '최근 90일';

  return `${diffDays}일`;
}

/**
 * 유사 쿼리 찾기
 */
export function findSimilarQueries(
  currentQuery: string,
  limit = 5
): QueryPattern[] {
  const patterns = getQueryPatterns();
  const lowerQuery = currentQuery.toLowerCase();

  // 단어 기반 유사도 계산
  const scored = patterns.map((p) => {
    const similarity = calculateSimilarity(lowerQuery, p.query.toLowerCase());
    return { pattern: p, score: similarity };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .filter((s) => s.score > 0.3) // 최소 30% 유사도
    .map((s) => s.pattern);
}

/**
 * 간단한 유사도 계산 (Jaccard similarity)
 */
function calculateSimilarity(str1: string, str2: string): number {
  const words1 = new Set(str1.split(/\s+/));
  const words2 = new Set(str2.split(/\s+/));

  const intersection = new Set(
    Array.from(words1).filter((w) => words2.has(w))
  );
  const union = new Set([...words1, ...words2]);

  return intersection.size / union.size;
}

/**
 * 쿼리 제안 생성
 */
export function getSuggestedQueries(): string[] {
  const stats = analyzePatterns();

  if (stats.totalQueries === 0) {
    // 기본 제안
    return [
      '최근 7일 크리티컬 인시던트',
      '오늘 알럿 통계',
      '최근 30일 위협 트렌드',
    ];
  }

  const suggestions: string[] = [];

  // 1. 가장 많이 사용하는 데이터 타입 + 날짜 범위
  const topDataType = Object.entries(stats.dataTypePreferences).sort(
    (a, b) => b[1] - a[1]
  )[0];
  const topDateRange = stats.commonDateRanges[0];

  if (topDataType && topDateRange) {
    const dataTypeKr =
      topDataType[0] === 'incidents'
        ? '인시던트'
        : topDataType[0] === 'alerts'
        ? '알럿'
        : topDataType[0];
    suggestions.push(`${topDateRange.pattern} ${dataTypeKr}`);
  }

  // 2. 자주 사용하는 필터 조합
  if (stats.commonFilters.severity && stats.commonFilters.severity.length > 0) {
    const topSeverity = stats.commonFilters.severity[0];
    const severityKr =
      topSeverity === 'critical'
        ? '크리티컬'
        : topSeverity === 'high'
        ? '하이'
        : topSeverity;
    suggestions.push(`최근 7일 ${severityKr} 인시던트`);
  }

  // 3. 가장 많이 사용하는 쿼리 타입
  const topQueryType = Object.entries(stats.queryTypeDistribution).sort(
    (a, b) => b[1] - a[1]
  )[0];

  if (topQueryType && topQueryType[0] === 'statistics') {
    suggestions.push('최근 30일 인시던트 통계');
  } else if (topQueryType && topQueryType[0] === 'chart') {
    suggestions.push('최근 7일 위협 트렌드');
  }

  return suggestions.slice(0, 5);
}

/**
 * 패턴 데이터 초기화
 */
export function clearPatterns(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * 패턴 내보내기 (JSON)
 */
export function exportPatterns(): string {
  const patterns = getQueryPatterns();
  return JSON.stringify(patterns, null, 2);
}

/**
 * 패턴 가져오기 (JSON)
 */
export function importPatterns(json: string): boolean {
  try {
    const patterns = JSON.parse(json) as QueryPattern[];
    if (!Array.isArray(patterns)) return false;

    // 기존 패턴과 병합
    const existing = getQueryPatterns();
    const merged = [...patterns, ...existing].slice(0, MAX_PATTERNS);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    return true;
  } catch (error) {
    console.error('Failed to import patterns:', error);
    return false;
  }
}
