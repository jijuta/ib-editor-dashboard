// @ts-nocheck
/**
 * OpenSearch Query Executor
 * OpenSearch DSL 쿼리 실행 및 결과 처리
 */

import { Client } from '@opensearch-project/opensearch';
import { NLQueryParams } from './nl-query-schema';
import {
  buildOpenSearchQuery,
  buildCorrelationQuery,
  OpenSearchQuery,
  validateQuery,
  optimizeQuery,
} from './opensearch-query-builder';

/**
 * 쿼리 실행 결과
 */
export interface QueryResult {
  success: boolean;
  data?: any;
  aggregations?: any;
  hits?: any[];
  total?: number;
  took?: number; // 실행 시간 (ms)
  error?: string;
  query?: OpenSearchQuery; // 실행한 쿼리 (디버깅용)
}

/**
 * OpenSearch 에러 메시지 포맷팅 헬퍼
 */
function formatOpenSearchError(error: any): string {
  let errorMsg = '';

  // 1. 기본 에러 메시지
  if (error instanceof Error) {
    errorMsg += error.message;
  } else {
    errorMsg += String(error);
  }

  // 2. OpenSearch 응답 본문 (가장 유용한 정보)
  if (error.body) {
    try {
      const body = typeof error.body === 'string' ? JSON.parse(error.body) : error.body;

      // OpenSearch 에러 상세 정보
      if (body.error) {
        if (typeof body.error === 'string') {
          errorMsg += `\nOpenSearch Error: ${body.error}`;
        } else if (body.error.type) {
          errorMsg += `\nType: ${body.error.type}`;
          if (body.error.reason) {
            errorMsg += `\nReason: ${body.error.reason}`;
          }
          if (body.error.caused_by) {
            errorMsg += `\nCaused by: ${body.error.caused_by.type} - ${body.error.caused_by.reason}`;
          }
        }
      }
    } catch (parseError) {
      // body가 JSON이 아닌 경우 그냥 문자열로 추가
      errorMsg += `\nResponse: ${String(error.body).substring(0, 500)}`;
    }
  }

  // 3. HTTP 상태 코드
  if (error.statusCode) {
    errorMsg += `\nStatus Code: ${error.statusCode}`;
  }

  // 4. 메타 정보
  if (error.meta?.body?.error) {
    try {
      const metaError = error.meta.body.error;
      if (metaError.type && metaError.reason) {
        errorMsg += `\nMeta: ${metaError.type} - ${metaError.reason}`;
      }
    } catch (e) {
      // 무시
    }
  }

  return errorMsg;
}

/**
 * OpenSearch Executor 클래스
 */
export class OpenSearchExecutor {
  private client: Client;

  constructor() {
    this.client = new Client({
      node: process.env.OPENSEARCH_URL || 'http://opensearch:9200',
      auth: {
        username: process.env.OPENSEARCH_USER || 'admin',
        password: process.env.OPENSEARCH_PASSWORD || 'Admin@123456',
      },
      ssl: {
        rejectUnauthorized: false,
      },
    });
  }

  /**
   * NLQueryParams로 쿼리 실행
   */
  async executeNLQuery(params: NLQueryParams): Promise<QueryResult> {
    try {
      // 🔍 Investigation 타입: 인시던트 ID로 종합 조사
      if (params.queryType === 'investigation' && params.incident_id) {
        console.log(`[OpenSearch Executor] Investigation mode: ${params.incident_id}`);
        const investigation = await this.executeIncidentInvestigation(params.incident_id);

        if (!investigation.success) {
          return {
            success: false,
            error: investigation.error,
          };
        }

        // Investigation 결과를 QueryResult 형식으로 변환
        return {
          success: true,
          data: investigation,
          hits: [investigation.incident], // 인시던트 기본 정보
          total: 1,
          took: 0, // Investigation은 여러 쿼리의 합이므로 took 계산 안 함
          aggregations: investigation.summary,
        };
      }

      // 1. OpenSearch DSL 생성
      const query = buildOpenSearchQuery(params);

      // 2. 쿼리 검증
      const validation = validateQuery(query);
      if (!validation.valid) {
        return {
          success: false,
          error: `Query validation failed: ${validation.errors?.join(', ')}`,
          query,
        };
      }

      // 3. 쿼리 최적화
      const optimizedQuery = optimizeQuery(query);

      // 4. 쿼리 실행
      const result = await this.executeQuery(params.indexPattern, optimizedQuery);

      // 5. 상관분석 처리 (필요한 경우)
      if (params.queryType === 'correlation' && result.success && result.hits) {
        const correlationResult = await this.executeCorrelation(params, result.hits);
        return {
          ...result,
          correlation: correlationResult,
        };
      }

      return result;
    } catch (error) {
      console.error('[OpenSearch Executor] Error:', error);
      const errorMsg = formatOpenSearchError(error);
      return {
        success: false,
        error: errorMsg,
      };
    }
  }

  /**
   * OpenSearch DSL 쿼리 직접 실행
   */
  async executeQuery(
    indexPattern: string,
    query: OpenSearchQuery
  ): Promise<QueryResult> {
    try {
      const startTime = Date.now();

      const response = await this.client.search({
        index: indexPattern,
        body: query,
      });

      const took = Date.now() - startTime;

      // 응답 파싱
      const body = response.body;
      const hits = body.hits?.hits || [];
      const total = body.hits?.total?.value || 0;
      const aggregations = body.aggregations;

      return {
        success: true,
        data: body,
        hits: hits.map((hit: any) => hit._source),
        total,
        aggregations,
        took,
        query,
      };
    } catch (error) {
      console.error('[OpenSearch Executor] Query execution error:', error);
      const errorMsg = formatOpenSearchError(error);
      return {
        success: false,
        error: errorMsg,
        query,
      };
    }
  }

  /**
   * 상관분석 쿼리 실행
   */
  async executeCorrelation(
    params: NLQueryParams,
    primaryHits: any[]
  ): Promise<QueryResult> {
    try {
      if (!params.correlationTarget || !params.correlationField) {
        return {
          success: false,
          error: 'correlationTarget and correlationField are required',
        };
      }

      // 상관분석 쿼리 생성
      const correlationQuery = buildCorrelationQuery(params, primaryHits);

      // 상관분석 쿼리 실행
      return await this.executeQuery(params.correlationTarget, correlationQuery);
    } catch (error) {
      console.error('[OpenSearch Executor] Correlation error:', error);
      const errorMsg = formatOpenSearchError(error);
      return {
        success: false,
        error: errorMsg,
      };
    }
  }

  /**
   * 인덱스 존재 확인
   */
  async indexExists(indexPattern: string): Promise<boolean> {
    try {
      const response = await this.client.indices.exists({
        index: indexPattern,
      });
      return response.statusCode === 200;
    } catch (error) {
      console.error('[OpenSearch Executor] Index check error:', error);
      return false;
    }
  }

  /**
   * 인덱스 매핑 조회
   */
  async getIndexMapping(indexPattern: string): Promise<any> {
    try {
      const response = await this.client.indices.getMapping({
        index: indexPattern,
      });
      return response.body;
    } catch (error) {
      console.error('[OpenSearch Executor] Mapping error:', error);
      return null;
    }
  }

  /**
   * 헬스 체크
   */
  async healthCheck(): Promise<{ healthy: boolean; error?: string }> {
    try {
      const response = await this.client.cluster.health();
      return {
        healthy: response.statusCode === 200,
      };
    } catch (error) {
      return {
        healthy: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * 인시던트 종합 조사 (Investigation)
   * 인시던트 ID로 모든 관련 데이터 조회
   */
  async executeIncidentInvestigation(incidentId: string): Promise<{
    success: boolean;
    incident?: any;
    alerts?: any[];
    files?: any[];
    networks?: any[];
    processes?: any[];
    endpoints?: any[];
    summary?: {
      total_alerts: number;
      total_files: number;
      total_networks: number;
      total_processes: number;
      total_endpoints: number;
    };
    error?: string;
  }> {
    try {
      console.log(`[OpenSearch Executor] 🔍 Starting incident investigation: ${incidentId}`);

      // 1. 인시던트 기본 정보
      const incidentQuery = {
        query: {
          term: {
            'incident_id.keyword': incidentId,
          },
        },
        size: 1,
        sort: [{ '@timestamp': { order: 'desc' as const } }],
      };

      const incidentResult = await this.executeQuery(
        'logs-cortex_xdr-incidents-*',
        incidentQuery
      );

      if (!incidentResult.success || !incidentResult.hits || incidentResult.hits.length === 0) {
        return {
          success: false,
          error: `Incident ${incidentId} not found`,
        };
      }

      const incident = incidentResult.hits[0];
      console.log(`[OpenSearch Executor] ✅ Found incident: ${incident.description || 'N/A'}`);

      // 2. 관련 알림 조회
      const alertsQuery = {
        query: {
          term: {
            'incident_id.keyword': incidentId,
          },
        },
        size: 100,
        sort: [{ '@timestamp': { order: 'desc' as const } }],
      };

      const alertsResult = await this.executeQuery(
        'logs-cortex_xdr-alerts-*',
        alertsQuery
      );

      const alerts = alertsResult.success ? alertsResult.hits || [] : [];
      console.log(`[OpenSearch Executor] 📢 Found ${alerts.length} alerts`);
      if (alerts.length > 0) {
        console.log(`[OpenSearch Executor] 📢 First alert sample:`, JSON.stringify(alerts[0]).substring(0, 200));
      } else {
        console.log(`[OpenSearch Executor] ⚠️  No alerts found - Query result:`, alertsResult.success, alertsResult.total);
      }

      // 3. 파일 아티팩트 조회
      const filesResult = await this.executeQuery(
        'logs-cortex_xdr-file-*',
        alertsQuery
      );

      const files = filesResult.success ? filesResult.hits || [] : [];
      console.log(`[OpenSearch Executor] 📁 Found ${files.length} file artifacts`);
      if (files.length > 0) {
        console.log(`[OpenSearch Executor] 📁 First file sample:`, JSON.stringify(files[0]).substring(0, 200));
      } else {
        console.log(`[OpenSearch Executor] ⚠️  No files found - Query result:`, filesResult.success, filesResult.total);
      }

      // 4. 네트워크 아티팩트 조회
      const networksResult = await this.executeQuery(
        'logs-cortex_xdr-network-*',
        alertsQuery
      );

      const networks = networksResult.success ? networksResult.hits || [] : [];
      console.log(`[OpenSearch Executor] 🌐 Found ${networks.length} network artifacts`);

      // 5. 프로세스 아티팩트 조회
      const processesResult = await this.executeQuery(
        'logs-cortex_xdr-process-*',
        alertsQuery
      );

      const processes = processesResult.success ? processesResult.hits || [] : [];
      console.log(`[OpenSearch Executor] ⚙️  Found ${processes.length} process artifacts`);

      // 6. 엔드포인트 조회 (hosts 필드 기반)
      let endpoints: any[] = [];
      if (incident.hosts && Array.isArray(incident.hosts)) {
        const endpointIds = incident.hosts
          .map((host: string) => {
            if (typeof host === 'string' && host.includes(':')) {
              return host.split(':')[1];
            }
            return null;
          })
          .filter(Boolean);

        if (endpointIds.length > 0) {
          const endpointsQuery = {
            query: {
              terms: {
                'endpoint_id.keyword': endpointIds,
              },
            },
            size: 100,
            sort: [{ '@timestamp': { order: 'desc' as const } }],
          };

          const endpointsResult = await this.executeQuery(
            'logs-cortex_xdr-endpoints-*',
            endpointsQuery
          );

          endpoints = endpointsResult.success ? endpointsResult.hits || [] : [];
          console.log(`[OpenSearch Executor] 💻 Found ${endpoints.length} endpoints`);
        }
      }

      // 7. CVE 취약점 조회 (호스트 이름 기반)
      let cves: any[] = [];
      if (endpoints.length > 0) {
        console.log(`[OpenSearch Executor] 🔒 Fetching CVEs for ${endpoints.length} endpoints...`);

        const hostnames = endpoints.map(e => e.endpoint_name || e.hostname).filter(Boolean);

        if (hostnames.length > 0) {
          // 7-1. Exact match 먼저 시도
          const exactCvesQuery = {
            query: {
              bool: {
                should: hostnames.map(hostname => ({
                  term: {
                    'hostname.keyword': hostname
                  }
                })),
                minimum_should_match: 1
              }
            },
            size: 100,
            sort: [
              { cvss_score: { order: 'desc' as const } },
              { '@timestamp': { order: 'desc' as const } }
            ]
          };

          const exactCvesResult = await this.executeQuery(
            'logs-cortex_xdr-va-cves-*',
            exactCvesQuery
          );

          const exactCves = exactCvesResult.success ? (exactCvesResult.hits || []).map((cve: any) => ({
            ...cve,
            match_type: 'exact',
            confidence: 1.0
          })) : [];

          console.log(`[OpenSearch Executor] 🔒 Found ${exactCves.length} exact match CVEs`);

          // 7-2. Fuzzy match 추가 (exact match에서 찾지 못한 호스트만)
          const exactMatchedHostnames = new Set(exactCves.map((c: any) => c.hostname));
          const remainingHostnames = hostnames.filter(h => !exactMatchedHostnames.has(h));

          let fuzzyCves: any[] = [];
          if (remainingHostnames.length > 0) {
            const fuzzyCvesQuery = {
              query: {
                bool: {
                  should: remainingHostnames.map(hostname => ({
                    match: {
                      hostname: {
                        query: hostname,
                        fuzziness: 'AUTO'
                      }
                    }
                  })),
                  minimum_should_match: 1
                }
              },
              size: 100,
              sort: [
                { cvss_score: { order: 'desc' as const } },
                { '@timestamp': { order: 'desc' as const } }
              ]
            };

            const fuzzyCvesResult = await this.executeQuery(
              'logs-cortex_xdr-va-cves-*',
              fuzzyCvesQuery
            );

            fuzzyCves = fuzzyCvesResult.success ? (fuzzyCvesResult.hits || []).map((cve: any) => ({
              ...cve,
              match_type: 'fuzzy',
              confidence: 0.7  // Fuzzy match는 신뢰도 낮음
            })) : [];

            console.log(`[OpenSearch Executor] 🔒 Found ${fuzzyCves.length} fuzzy match CVEs`);
          }

          // 7-3. 결합 (exact match 우선)
          cves = [...exactCves, ...fuzzyCves];
          console.log(`[OpenSearch Executor] 🔒 Total CVEs: ${cves.length} (exact: ${exactCves.length}, fuzzy: ${fuzzyCves.length})`);
        }
      }

      console.log(`[OpenSearch Executor] ✅ Investigation complete`);

      return {
        success: true,
        incident,
        alerts,
        files,
        networks,
        processes,
        endpoints,
        cves,
        summary: {
          total_alerts: alerts.length,
          total_files: files.length,
          total_networks: networks.length,
          total_processes: processes.length,
          total_endpoints: endpoints.length,
          total_cves: cves.length,
        },
      };
    } catch (error) {
      console.error('[OpenSearch Executor] Investigation error:', error);
      const errorMsg = formatOpenSearchError(error);
      return {
        success: false,
        error: errorMsg,
      };
    }
  }

  /**
   * 클라이언트 닫기
   */
  async close(): Promise<void> {
    await this.client.close();
  }
}

/**
 * 싱글톤 인스턴스
 */
let executorInstance: OpenSearchExecutor | null = null;

export function getExecutor(): OpenSearchExecutor {
  if (!executorInstance) {
    executorInstance = new OpenSearchExecutor();
  }
  return executorInstance;
}

/**
 * 편의 함수: NL 쿼리 실행
 */
export async function executeNLQuery(
  params: NLQueryParams
): Promise<QueryResult> {
  const executor = getExecutor();
  return executor.executeNLQuery(params);
}

/**
 * 편의 함수: 직접 쿼리 실행
 */
export async function executeQuery(
  indexPattern: string,
  query: OpenSearchQuery
): Promise<QueryResult> {
  const executor = getExecutor();
  return executor.executeQuery(indexPattern, query);
}

/**
 * 편의 함수: 인시던트 조사 실행
 */
export async function executeInvestigation(
  incidentId: string
): Promise<{
  success: boolean;
  investigation_data?: any;
  error?: string;
}> {
  const executor = getExecutor();
  const result = await executor.executeIncidentInvestigation(incidentId);

  if (!result.success) {
    return {
      success: false,
      error: result.error,
    };
  }

  // Convert to InvestigationData format
  return {
    success: true,
    investigation_data: {
      incident_id: incidentId,
      timestamp: new Date().toISOString(),
      incident: result.incident,
      alerts: result.alerts || [],
      files: result.files || [],
      networks: result.networks || [],
      processes: result.processes || [],
      endpoints: result.endpoints || [],
      causality_chains: [], // TODO: Add causality chains query
      registry: [], // TODO: Add registry query
      cves: result.cves || [],
      summary: {
        total_alerts: result.summary?.total_alerts || 0,
        total_files: result.summary?.total_files || 0,
        total_networks: result.summary?.total_networks || 0,
        total_processes: result.summary?.total_processes || 0,
        total_endpoints: result.summary?.total_endpoints || 0,
        total_causality_chains: 0,
        total_registry: 0,
        total_cves: result.summary?.total_cves || 0,
      },
    },
  };
}
