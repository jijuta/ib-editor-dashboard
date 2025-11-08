/**
 * OpenSearch Query Builder
 * NLQueryParams → OpenSearch DSL 변환
 */

import { NLQueryParams } from './nl-query-schema.js';

/**
 * OpenSearch Query DSL 인터페이스
 */
export interface OpenSearchQuery {
  query: any;
  _source?: string[] | boolean;
  aggs?: any;
  size?: number;
  sort?: any[];
  collapse?: {
    field: string;
    inner_hits?: {
      name: string;
      size: number;
    };
  };
}

/**
 * 집계 결과 인터페이스
 */
export interface AggregationConfig {
  field: string;
  type: 'count' | 'sum' | 'avg' | 'terms' | 'date_histogram';
  interval?: string; // date_histogram용
  size?: number; // terms용
}

/**
 * 데이터 타입별 중복 제거 필드 매핑
 */
const DEDUPLICATION_FIELDS: Record<string, string> = {
  incidents: 'incident_id.keyword',
  alerts: 'alert_id.keyword',
  hosts: 'host.name.keyword',
  endpoints: 'endpoint_id.keyword',
  files: 'file.hash.sha256.keyword',
  ti_results: 'source_id.keyword',
};

/**
 * 데이터 타입별 날짜 필드 매핑
 * ⚠️ CRITICAL: Cortex XDR incidents use detection_time, NOT @timestamp!
 */
const TIMESTAMP_FIELDS: Record<string, string> = {
  incidents: 'detection_time', // Cortex XDR 인시던트
  alerts: 'detection_time', // Cortex XDR 알럿
  file_artifacts: 'file_event_timestamp', // 파일 아티팩트
  network_artifacts: 'network_event_timestamp', // 네트워크 아티팩트
  endpoints: 'last_seen', // 엔드포인트
  ti: '@timestamp', // 위협 인텔리전스
  ti_results: '@timestamp', // TI 상관분석 결과
  audit_logs: '@timestamp', // 감사 로그
  agent_audit_logs: '@timestamp', // 에이전트 감사 로그
};

/**
 * 데이터 타입에 맞는 타임스탬프 필드 반환
 */
function getTimestampField(dataType: string): string {
  return TIMESTAMP_FIELDS[dataType] || '@timestamp';
}

/**
 * 지능형 Limit 계산
 * - 날짜 범위에 따라 동적 조정
 * - 데이터 타입에 따라 조정
 * - 쿼리 타입에 따라 조정
 */
function calculateIntelligentLimit(params: NLQueryParams): number {
  const { queryType, timeRange, dataType, limit } = params;

  // 1. 명시적 limit이 있으면 우선 사용
  if (limit) {
    return Math.min(limit, 10000); // OpenSearch 최대값
  }

  // 2. 집계 쿼리는 size=0
  if (queryType === 'statistics' || queryType === 'chart') {
    return 0;
  }

  // 3. 날짜 범위 계산 (일 단위)
  let rangeDays = 7; // 기본값
  if (timeRange) {
    const start = new Date(timeRange.start);
    const end = new Date(timeRange.end);
    const diffMs = end.getTime() - start.getTime();
    rangeDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  }

  // 4. 데이터 타입별 기본 limit
  const baseLimit: Record<string, number> = {
    incidents: 100,
    alerts: 500,
    endpoints: 200,
    hosts: 100,
    files: 300,
    file_artifacts: 300,
    network_artifacts: 100,
    ti_results: 100,
    ti: 50,
  };

  const base = baseLimit[dataType] || 100;

  // 5. 날짜 범위에 따라 조정
  // - 1일: 1x
  // - 1주일(7일): 1x
  // - 1개월(30일): 0.5x
  // - 3개월(90일): 0.3x
  // - 1년 이상: 0.2x
  let multiplier = 1.0;
  if (rangeDays <= 1) {
    multiplier = 1.5; // 하루치는 좀 더 많이
  } else if (rangeDays <= 7) {
    multiplier = 1.0;
  } else if (rangeDays <= 30) {
    multiplier = 0.7;
  } else if (rangeDays <= 90) {
    multiplier = 0.4;
  } else {
    multiplier = 0.2;
  }

  const calculated = Math.floor(base * multiplier);

  // 6. 최소/최대 범위 적용
  return Math.max(10, Math.min(calculated, 10000));
}

/**
 * 중복 제거 적용 여부 판단
 */
function shouldApplyDeduplication(params: NLQueryParams): boolean {
  const { queryType, dataType, optimize } = params;

  // 1. 집계 쿼리는 중복 제거 불필요
  if (queryType === 'statistics' || queryType === 'chart') {
    return false;
  }

  // 2. optimize 설정이 'detail'이면 적용 안 함
  if (optimize === 'detail') {
    return false;
  }

  // 3. 중복 제거 필드가 정의된 데이터 타입만
  return !!DEDUPLICATION_FIELDS[dataType];
}

/**
 * NLQueryParams → OpenSearch DSL 변환
 */
export function buildOpenSearchQuery(params: NLQueryParams): OpenSearchQuery {
  const { queryType, timeRange, filters, aggregation, fields, optimize, dataType } = params;

  // 데이터 타입에 맞는 타임스탬프 필드 선택
  const timestampField = getTimestampField(dataType);

  // 기본 쿼리 구조
  const query: OpenSearchQuery = {
    query: {
      bool: {
        must: [],
        filter: [],
      },
    },
  };

  // 1. 시간 범위 필터 (데이터 타입별 필드 사용)
  // ⭐ CRITICAL: 인시던트 ID가 있으면 시간 필터 제거 (ID는 유니크)
  const hasIncidentId = filters?.custom?.['incident_id.keyword'] || filters?.custom?.['alert_id.keyword'];

  if (timeRange && !hasIncidentId) {
    // Cortex XDR uses millisecond timestamps (epoch_millis), not ISO strings
    const isMillisecondField = ['detection_time', 'creation_time', 'modification_time', 'last_seen'].includes(timestampField);

    // ⭐ CRITICAL: detection_time이 null인 경우도 포함 (should 쿼리 사용)
    // detection_time이 시간 범위 내에 있거나 null이면 포함
    query.query.bool.filter.push({
      bool: {
        should: [
          {
            range: {
              [timestampField]: isMillisecondField ? {
                gte: new Date(timeRange.start).getTime(), // Convert to epoch millis
                lte: new Date(timeRange.end).getTime(),
              } : {
                gte: timeRange.start, // ISO string for @timestamp fields
                lte: timeRange.end,
              },
            },
          },
          {
            bool: {
              must_not: {
                exists: {
                  field: timestampField,
                },
              },
            },
          },
        ],
        minimum_should_match: 1,
      },
    });
  }

  // 2. Severity 필터
  if (filters?.severity && filters.severity.length > 0) {
    query.query.bool.filter.push({
      terms: {
        severity: filters.severity,
      },
    });
  }

  // 3. Vendor 필터
  if (filters?.vendor) {
    query.query.bool.filter.push({
      term: {
        vendor: filters.vendor,
      },
    });
  }

  // 4. Status 필터 (처리 상태)
  if (filters?.status) {
    query.query.bool.filter.push({
      term: {
        'status.keyword': filters.status,
      },
    });
  }

  // 5. Detection Status 필터 (탐지 상태: 정탐/오탐)
  if (filters?.detection_status) {
    query.query.bool.filter.push({
      term: {
        'detection_status.keyword': filters.detection_status,
      },
    });
  }

  // 6. Custom 필터
  if (filters?.custom) {
    Object.entries(filters.custom).forEach(([field, value]) => {
      // 필드명 정규화 (alias 처리)
      let normalizedField = field;

      // process_name.keyword → action_process_image_name.keyword
      if (field === 'process_name.keyword' || field === 'process_name') {
        normalizedField = 'action_process_image_name.keyword';
        console.log(`[OpenSearch Query Builder] 🔵 필드명 정규화: ${field} → ${normalizedField}`);
      }

      // 위협 키워드는 별도 처리 (should 쿼리)
      if (normalizedField === 'threat_keywords' && Array.isArray(value)) {
        // 위협 키워드는 should 쿼리로 처리 (OR 조건)
        // description, alert_categories, mitre_techniques 등에서 검색
        const shouldClauses = value.flatMap((keyword) => [
          { match_phrase: { description: { query: keyword, boost: 2.0 } } },
          { match: { 'alert_categories': { query: keyword, boost: 1.5 } } },
          { match: { 'mitre_techniques_ids_and_names': { query: keyword, boost: 1.2 } } },
          { match: { 'mitre_tactics_ids_and_names': { query: keyword, boost: 1.0 } } },
        ]);

        if (!query.query.bool.should) {
          query.query.bool.should = [];
        }
        query.query.bool.should.push(...shouldClauses);
        query.query.bool.minimum_should_match = 1;

        console.log(`[OpenSearch Query Builder] 🟠 위협 키워드 필터 적용: ${value.join(', ')}`);
      } else if (Array.isArray(value)) {
        query.query.bool.filter.push({
          terms: {
            [normalizedField]: value,
          },
        });
      } else {
        query.query.bool.filter.push({
          term: {
            [normalizedField]: value,
          },
        });
      }
    });
  }

  // 6. 쿼리 타입별 처리
  if (queryType === 'statistics' || queryType === 'chart') {
    // 집계 쿼리: size=0 (문서 반환 안 함)
    query.size = 0;

    // 집계 추가
    if (aggregation) {
      query.aggs = buildAggregation(aggregation, params, timestampField);
    } else {
      // 🔥 aggregation 파라미터가 없으면 자동으로 종합 분석 적용
      query.aggs = buildReportAggregations(params, timestampField);
    }
  } else if (queryType === 'detail') {
    // 상세 조회: 지능형 limit 적용
    query.size = calculateIntelligentLimit(params);
    query.sort = [{ [timestampField]: { order: 'desc', unmapped_type: 'date' } }];

    // 필드 선택 (토큰 최적화)
    if (fields && fields.length > 0) {
      query._source = fields;
    }

    // 중복 제거 적용
    if (shouldApplyDeduplication(params)) {
      const collapseField = DEDUPLICATION_FIELDS[dataType];
      query.collapse = {
        field: collapseField,
        inner_hits: {
          name: 'latest',
          size: 1, // 각 그룹에서 최신 1개만
        },
      };
    }
  } else if (queryType === 'correlation') {
    // 상관분석: 지능형 limit 적용 (최대 1000)
    const intelligentLimit = calculateIntelligentLimit(params);
    query.size = Math.min(intelligentLimit * 2, 1000); // 상관분석은 좀 더 많이
    query.sort = [{ [timestampField]: { order: 'desc', unmapped_type: 'date' } }];

    if (fields && fields.length > 0) {
      query._source = fields;
    }
  } else if (queryType === 'report') {
    // 보고서: 샘플 문서 (지능형 limit의 20% 또는 최대 100)
    const intelligentLimit = calculateIntelligentLimit(params);
    query.size = Math.min(Math.floor(intelligentLimit * 0.2), 100);
    query.sort = [{ [timestampField]: { order: 'desc', unmapped_type: 'date' } }];

    // 보고서용 집계 추가
    query.aggs = buildReportAggregations(params, timestampField);

    if (fields && fields.length > 0) {
      query._source = fields;
    }

    // 보고서도 중복 제거 적용 (샘플의 다양성 증가)
    if (shouldApplyDeduplication(params)) {
      const collapseField = DEDUPLICATION_FIELDS[dataType];
      query.collapse = {
        field: collapseField,
        inner_hits: {
          name: 'latest',
          size: 1,
        },
      };
    }
  }

  // 빈 must 배열 제거
  if (query.query.bool.must.length === 0) {
    delete query.query.bool.must;
  }

  // 빈 filter 배열 제거
  if (query.query.bool.filter.length === 0) {
    delete query.query.bool.filter;
  }

  return query;
}

/**
 * 집계 생성
 */
function buildAggregation(
  aggregationType: string,
  params: NLQueryParams,
  timestampField: string = '@timestamp'
): any {
  const { dataType } = params;

  switch (aggregationType) {
    case 'count':
      // 전체 개수
      return {
        total_count: {
          value_count: {
            field: '_id',
          },
        },
      };

    case 'terms':
      // 그룹별 집계 (심각도별)
      return {
        by_severity: {
          terms: {
            field: 'severity.keyword',
            size: 10,
            missing: 'unknown',
          },
        },
      };

    case 'date_histogram':
      // 시간별 히스토그램
      // ⭐ CRITICAL: detection_time은 long 타입이므로 time_zone 사용 불가
      const isMillisecondField = ['detection_time', 'creation_time', 'modification_time', 'last_seen'].includes(timestampField);

      return {
        over_time: {
          date_histogram: {
            field: timestampField,
            calendar_interval: '1d',
            // Only add time_zone for @timestamp fields (date type)
            ...(isMillisecondField ? {} : { time_zone: 'Asia/Seoul' }),
          },
          aggs: {
            by_severity: {
              terms: {
                field: 'severity.keyword',
                size: 10,
                missing: 'unknown',
              },
            },
          },
        },
      };

    case 'sum':
      // 합계 (예: 알럿 개수 합)
      return {
        total_sum: {
          sum: {
            field: 'alert_count',
          },
        },
      };

    case 'avg':
      // 평균
      return {
        average: {
          avg: {
            field: 'alert_count',
          },
        },
      };

    default:
      // 기본: count
      return {
        total_count: {
          value_count: {
            field: '_id',
          },
        },
      };
  }
}

/**
 * 보고서용 다중 집계 (🔥 대폭 강화 - 10+ 분석 항목)
 */
function buildReportAggregations(params: NLQueryParams, timestampField: string = '@timestamp'): any {
  const { dataType } = params;

  // ⭐ CRITICAL: detection_time은 long 타입이므로 time_zone 사용 불가
  const isMillisecondField = ['detection_time', 'creation_time', 'modification_time', 'last_seen'].includes(timestampField);

  return {
    // ===== 공통 집계 (모든 데이터 타입) =====

    // 1. 심각도별 집계
    by_severity: {
      terms: {
        field: 'severity.keyword',
        size: 10,
        missing: 'unknown',
      },
    },

    // 2. 시간별 트렌드 (일별)
    over_time: {
      date_histogram: {
        field: timestampField,
        calendar_interval: '1d',
        // Only add time_zone for @timestamp fields (date type)
        ...(isMillisecondField ? {} : { time_zone: 'Asia/Seoul' }),
      },
      aggs: {
        by_severity: {
          terms: {
            field: 'severity.keyword',
            size: 10,
            missing: 'unknown',
          },
        },
      },
    },

    // 3. 시간대별 분포 (시간별 - 0~23시)
    hourly_distribution: {
      date_histogram: {
        field: timestampField,
        calendar_interval: '1h',
        ...(isMillisecondField ? {} : { time_zone: 'Asia/Seoul' }),
        format: 'HH',
      },
    },

    // 4. 요일별 분포
    day_of_week: {
      date_histogram: {
        field: timestampField,
        calendar_interval: '1d',
        ...(isMillisecondField ? {} : { time_zone: 'Asia/Seoul' }),
        format: 'E', // Mon, Tue, Wed...
      },
    },

    // 5. 벤더별 집계
    by_vendor: {
      terms: {
        field: 'vendor.keyword',
        size: 10,
        missing: 'unknown',
      },
    },

    // ===== 인시던트 전용 집계 =====
    ...(dataType === 'incidents' && {
      // 6. 처리 상태별 집계
      by_status: {
        terms: {
          field: 'status.keyword',
          size: 15,
          missing: 'unknown',
        },
      },

      // 7. 정탐/오탐 분류
      by_detection_type: {
        filters: {
          filters: {
            true_positive: {
              match: {
                'status.keyword': 'resolved_threat_handled',
              },
            },
            false_positive: {
              match: {
                'status.keyword': 'resolved_false_positive',
              },
            },
            under_investigation: {
              terms: {
                'status.keyword': ['new', 'under_investigation'],
              },
            },
            other: {
              bool: {
                must_not: [
                  {
                    terms: {
                      'status.keyword': [
                        'resolved_threat_handled',
                        'resolved_false_positive',
                        'new',
                        'under_investigation',
                      ],
                    },
                  },
                ],
              },
            },
          },
        },
      },

      // 8. 호스트별 분포 (Top 20)
      by_host: {
        terms: {
          field: 'host_name.keyword',
          size: 20,
          missing: 'unknown',
        },
      },

      // 9. 사용자별 분포 (담당자)
      by_assigned_user: {
        terms: {
          field: 'assigned_user_mail.keyword',
          size: 15,
          missing: 'unassigned',
        },
      },

      // 10. 알럿 개수별 분포
      alert_count_distribution: {
        histogram: {
          field: 'alert_count',
          interval: 5, // 0-5, 6-10, 11-15...
          min_doc_count: 1,
        },
      },

      // 11. 호스트 개수별 분포
      host_count_distribution: {
        histogram: {
          field: 'host_count',
          interval: 1,
          min_doc_count: 1,
        },
      },

      // 12. MITRE ATT&CK 기법 (인시던트도 있음)
      by_mitre_technique: {
        terms: {
          field: 'mitre_technique_id_and_name.keyword',
          size: 20,
          missing: 'unknown',
        },
      },

      // 13. MITRE ATT&CK 전술
      by_mitre_tactic: {
        terms: {
          field: 'mitre_tactic.keyword',
          size: 15,
          missing: 'unknown',
        },
      },

      // 14. 코멘트 유무 분포
      has_comments: {
        filters: {
          filters: {
            with_comments: {
              range: {
                notes_count: {
                  gt: 0,
                },
              },
            },
            without_comments: {
              bool: {
                should: [
                  {
                    bool: {
                      must_not: {
                        exists: {
                          field: 'notes_count',
                        },
                      },
                    },
                  },
                  {
                    term: {
                      notes_count: 0,
                    },
                  },
                ],
              },
            },
          },
        },
      },

      // 15. 평균 대응 시간 (생성 → 해결)
      avg_resolution_time: {
        avg: {
          script: {
            source: `
              if (doc.containsKey('resolve_timestamp') && doc.containsKey('creation_time')) {
                return (doc['resolve_timestamp'].value.millis - doc['creation_time'].value.millis) / 3600000.0;
              }
              return null;
            `,
            lang: 'painless',
          },
        },
      },
    }),

    // ===== 얼럿 전용 집계 =====
    ...(dataType === 'alerts' && {
      // 16. MITRE ATT&CK 기법 (알럿)
      by_mitre_technique: {
        terms: {
          field: 'mitre_technique_id.keyword',
          size: 20,
          missing: 'unknown',
        },
      },
      by_mitre_tactic: {
        terms: {
          field: 'mitre_tactic.keyword',
          size: 20,
          missing: 'unknown',
        },
      },

      // 17. 얼럿 타입별
      by_alert_type: {
        terms: {
          field: 'alert_type.keyword',
          size: 15,
          missing: 'unknown',
        },
      },

      // 18. 탐지 소스별
      by_source: {
        terms: {
          field: 'source.keyword',
          size: 10,
          missing: 'unknown',
        },
      },

      // 19. 호스트별 (얼럿)
      by_host: {
        terms: {
          field: 'host_name.keyword',
          size: 20,
          missing: 'unknown',
        },
      },

      // 20. 사용자별 (얼럿)
      by_user: {
        terms: {
          field: 'user_name.keyword',
          size: 15,
          missing: 'unknown',
        },
      },
    }),

    // ===== 엔드포인트 전용 집계 =====
    ...(dataType === 'endpoints' && {
      // 21. 운영체제별
      by_os: {
        terms: {
          field: 'os_type.keyword',
          size: 10,
          missing: 'unknown',
        },
      },

      // 22. 에이전트 상태별
      by_agent_status: {
        terms: {
          field: 'endpoint_status.keyword',
          size: 10,
          missing: 'unknown',
        },
      },

      // 23. 격리 상태별
      by_isolation_status: {
        terms: {
          field: 'is_isolated',
          size: 2,
        },
      },

      // 24. 에이전트 버전별
      by_agent_version: {
        terms: {
          field: 'agent_version.keyword',
          size: 10,
          missing: 'unknown',
        },
      },
    }),

    // 6. TI 상관분석 결과 집계 (ti_results인 경우)
    ...(params.dataType === 'ti_results' && {
      by_risk_level: {
        terms: {
          field: 'risk_level.keyword',
          size: 10,
          order: { _key: 'desc' }, // CRITICAL → INFO 순
        },
      },
      by_threat_score: {
        histogram: {
          field: 'threat_score',
          interval: 20, // 0-20, 21-40, 41-60, 61-80, 81-100
        },
      },
      total_ti_matches: {
        sum: {
          script: {
            source: 'doc.containsKey("ti_matches") && doc["ti_matches"].size() > 0 ? doc["ti_matches"].size() : 0',
            lang: 'painless',
          },
        },
      },
      matched_hash_count: {
        sum: {
          script: {
            source:
              'doc.containsKey("matched_hashes") && doc["matched_hashes"].size() > 0 ? doc["matched_hashes"].size() : 0',
            lang: 'painless',
          },
        },
      },
      matched_ip_count: {
        sum: {
          script: {
            source:
              'doc.containsKey("matched_ips") && doc["matched_ips"].size() > 0 ? doc["matched_ips"].size() : 0',
            lang: 'painless',
          },
        },
      },
      matched_cve_count: {
        sum: {
          script: {
            source:
              'doc.containsKey("matched_cves") && doc["matched_cves"].size() > 0 ? doc["matched_cves"].size() : 0',
            lang: 'painless',
          },
        },
      },
    }),
  };
}

/**
 * 상관분석 쿼리 생성
 */
export function buildCorrelationQuery(
  params: NLQueryParams,
  primaryResults: any[]
): OpenSearchQuery {
  const { correlationField, correlationTarget } = params;

  if (!correlationField || primaryResults.length === 0) {
    throw new Error('Correlation field and primary results are required');
  }

  // 1차 결과에서 correlation field 값 추출
  const correlationValues = primaryResults
    .map((doc) => doc._source[correlationField])
    .filter((v) => v !== undefined && v !== null);

  if (correlationValues.length === 0) {
    throw new Error('No correlation values found in primary results');
  }

  // 상관분석 쿼리
  return {
    query: {
      bool: {
        filter: [
          {
            terms: {
              [correlationField]: correlationValues,
            },
          },
        ],
      },
    },
    size: 10000,
    sort: [{ '@timestamp': 'desc' }],
  };
}

/**
 * 쿼리 DSL을 문자열로 변환 (디버깅용)
 */
export function queryToString(query: OpenSearchQuery): string {
  return JSON.stringify(query, null, 2);
}

/**
 * 쿼리 검증
 */
export function validateQuery(query: OpenSearchQuery): {
  valid: boolean;
  errors?: string[];
} {
  const errors: string[] = [];

  // 1. query 필드 필수
  if (!query.query) {
    errors.push('query field is required');
  }

  // 2. bool 구조 검증
  if (query.query && !query.query.bool) {
    errors.push('query.bool is required');
  }

  // 3. size 범위 검증
  if (query.size !== undefined) {
    if (query.size < 0) {
      errors.push('size must be >= 0');
    }
    if (query.size > 10000) {
      errors.push('size must be <= 10000');
    }
  }

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
  };
}

/**
 * 쿼리 최적화 힌트
 */
export function optimizeQuery(query: OpenSearchQuery): OpenSearchQuery {
  const optimized = { ...query };

  // 1. 집계 쿼리인 경우 size=0
  if (optimized.aggs && optimized.size === undefined) {
    optimized.size = 0;
  }

  // 2. _source false로 집계만 (집계 쿼리)
  if (optimized.size === 0 && !optimized._source) {
    optimized._source = false;
  }

  // 3. sort 없으면 기본 추가 (상세 조회)
  if (optimized.size && optimized.size > 0 && !optimized.sort) {
    optimized.sort = [{ '@timestamp': 'desc' }];
  }

  return optimized;
}

/**
 * 쿼리 통계 (디버깅/모니터링용)
 */
export interface QueryStats {
  hasTimeRange: boolean;
  filterCount: number;
  isAggregation: boolean;
  estimatedDocuments: number;
  hasSourceFiltering: boolean;
  hasSorting: boolean;
}

export function getQueryStats(query: OpenSearchQuery): QueryStats {
  const filterCount = query.query?.bool?.filter?.length || 0;
  const hasTimeRange = query.query?.bool?.filter?.some(
    (f: any) => f.range && f.range['@timestamp']
  );

  return {
    hasTimeRange: hasTimeRange || false,
    filterCount,
    isAggregation: query.size === 0 && !!query.aggs,
    estimatedDocuments: query.size || 0,
    hasSourceFiltering: !!query._source,
    hasSorting: !!query.sort,
  };
}
