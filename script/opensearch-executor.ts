/**
 * OpenSearch Query Executor
 * OpenSearch DSL 쿼리 실행 및 결과 처리
 */

import { Client } from '@opensearch-project/opensearch';
import { NLQueryParams } from './nl-query-schema.js';
import {
  buildOpenSearchQuery,
  buildCorrelationQuery,
  OpenSearchQuery,
  validateQuery,
  optimizeQuery,
} from './opensearch-query-builder.js';

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
