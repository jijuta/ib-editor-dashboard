#!/usr/bin/env node

/**
 * NL-Query MCP Server
 *
 * 자연어 질문을 OpenSearch 쿼리로 변환하고 실행하는 MCP 서버
 *
 * Tools:
 * 1. nl_query - 자연어 질문 → 파싱 → OpenSearch 쿼리 실행
 * 2. test_parse - 파싱만 테스트 (쿼리 실행 안 함)
 */

import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';
import { parseNLQuery } from './nl-query-parser.js';
import { executeNLQuery } from './opensearch-executor.js';

// Load environment variables
const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../.env') });
config({ path: resolve(__dirname, '../.env.local') });

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false,
});

// MCP 도구 목록
const TOOLS = [
  {
    name: 'nl_query',
    description: '자연어 질문을 OpenSearch 쿼리로 변환하고 실행합니다',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: '자연어 질문 (한국어 또는 영어)',
        },
        model: {
          type: 'string',
          description: 'AI 모델 선택',
          enum: ['gemini-2.5-pro', 'gemini-2.0-flash'],
          default: 'gemini-2.0-flash',
        },
        execute: {
          type: 'boolean',
          description: '쿼리 실행 여부 (false면 파싱만)',
          default: true,
        },
        format: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['markdown', 'json', 'summary'],
          },
          description: '결과 형식',
          default: ['markdown', 'json'],
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'test_parse',
    description: '자연어 질문 파싱만 테스트 (쿼리 실행 안 함)',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: '자연어 질문',
        },
        model: {
          type: 'string',
          description: 'AI 모델 선택',
          enum: ['gemini-2.5-pro', 'gemini-2.0-flash'],
          default: 'gemini-2.0-flash',
        },
      },
      required: ['query'],
    },
  },
];

/**
 * nl_query 도구 실행
 */
async function executeNLQueryTool(args) {
  const {
    query,
    model = 'gemini-2.0-flash',
    execute = true,
    format = ['markdown', 'json'],
  } = args;

  try {
    // 1. 파싱
    console.error(`[NL-Query MCP] Parsing query: ${query}`);
    const params = await parseNLQuery(query, { model });

    console.error(`[NL-Query MCP] Parsed params:`, JSON.stringify(params, null, 2));

    // 2. 쿼리 실행 (execute=true인 경우)
    if (!execute) {
      return {
        success: true,
        message: 'Parsing only (execute=false)',
        params,
      };
    }

    console.error(`[NL-Query MCP] Executing query on index: ${params.indexPattern}`);
    const result = await executeNLQuery(params);

    if (!result.success) {
      return {
        success: false,
        error: result.error,
        params,
      };
    }

    console.error(`[NL-Query MCP] Query executed successfully. Total: ${result.total}, Took: ${result.took}ms`);

    // 3. 결과 포맷팅
    const formattedResult = {
      success: true,
      query,
      params,
      result: {
        total: result.total,
        took: result.took,
        hits: result.hits,
        aggregations: result.aggregations,
      },
    };

    // 4. 형식별 출력
    if (format.includes('markdown')) {
      formattedResult.markdown = formatResultAsMarkdown(result, params);
    }

    if (format.includes('summary')) {
      formattedResult.summary = formatResultAsSummary(result, params, query);
    }

    return formattedResult;
  } catch (error) {
    console.error('[NL-Query MCP] Error:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * test_parse 도구 실행
 */
async function executeTestParse(args) {
  const { query, model = 'gemini-2.0-flash' } = args;

  try {
    console.error(`[NL-Query MCP] Testing parse: ${query}`);
    const params = await parseNLQuery(query, { model, debug: true });

    return {
      success: true,
      query,
      params,
      message: 'Parsing successful (test mode)',
    };
  } catch (error) {
    console.error('[NL-Query MCP] Parse error:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * 결과를 마크다운으로 포맷팅
 */
function formatResultAsMarkdown(result, params) {
  let markdown = '';

  // 1. 쿼리 정보
  markdown += `## 쿼리 결과\n\n`;
  markdown += `- **쿼리 타입**: ${params.queryType}\n`;
  markdown += `- **데이터 유형**: ${params.dataType}\n`;
  markdown += `- **인덱스**: ${params.indexPattern}\n`;
  markdown += `- **총 개수**: ${result.total}\n`;
  markdown += `- **실행 시간**: ${result.took}ms\n\n`;

  // 2. 집계 결과
  if (result.aggregations) {
    markdown += `### 집계 결과\n\n`;
    markdown += '```json\n';
    markdown += JSON.stringify(result.aggregations, null, 2);
    markdown += '\n```\n\n';
  }

  // 3. 샘플 문서
  if (result.hits && result.hits.length > 0) {
    markdown += `### 샘플 문서 (상위 ${Math.min(5, result.hits.length)}개)\n\n`;
    markdown += '```json\n';
    markdown += JSON.stringify(result.hits.slice(0, 5), null, 2);
    markdown += '\n```\n\n';
  }

  return markdown;
}

/**
 * 결과를 요약으로 포맷팅
 */
function formatResultAsSummary(result, params, query) {
  if (params.queryType === 'statistics' || params.queryType === 'chart') {
    return `질문: "${query}"\n\n답변: 총 ${result.total}개의 ${params.dataType} 데이터가 발견되었습니다.`;
  } else if (params.queryType === 'detail') {
    return `질문: "${query}"\n\n답변: ${result.total}개의 ${params.dataType} 데이터를 조회했습니다. 상위 ${Math.min(result.hits?.length || 0, 10)}개를 표시합니다.`;
  } else if (params.queryType === 'report') {
    return `질문: "${query}"\n\n답변: ${params.dataType} 보고서를 생성했습니다. 총 ${result.total}개의 데이터를 분석했습니다.`;
  } else {
    return `질문: "${query}"\n\n답변: 쿼리가 성공적으로 실행되었습니다.`;
  }
}

// MCP 프로토콜 핸들러
rl.on('line', async (line) => {
  let request = null;
  try {
    request = JSON.parse(line);

    if (request.method === 'initialize') {
      const safeId = request.id !== null && request.id !== undefined ? request.id : 0;
      const response = {
        jsonrpc: '2.0',
        result: {
          protocolVersion: '2024-11-05',
          capabilities: {
            tools: {},
          },
          serverInfo: {
            name: 'nl-query-mcp',
            version: '1.0.0',
          },
        },
        id: safeId,
      };
      console.log(JSON.stringify(response));
    } else if (request.method === 'tools/list') {
      const response = {
        jsonrpc: '2.0',
        result: {
          tools: TOOLS,
        },
        id: request.id !== null && request.id !== undefined ? request.id : 0,
      };
      console.log(JSON.stringify(response));
    } else if (request.method === 'prompts/list') {
      const response = {
        jsonrpc: '2.0',
        result: {
          prompts: [],
        },
        id: request.id !== null && request.id !== undefined ? request.id : 0,
      };
      console.log(JSON.stringify(response));
    } else if (request.method === 'resources/list') {
      const response = {
        jsonrpc: '2.0',
        result: {
          resources: [],
        },
        id: request.id !== null && request.id !== undefined ? request.id : 0,
      };
      console.log(JSON.stringify(response));
    } else if (request.method === 'tools/call') {
      const { name, arguments: args } = request.params;

      console.error(`[NL-Query MCP] Tool call: ${name}`);

      let result;
      if (name === 'nl_query') {
        result = await executeNLQueryTool(args);
      } else if (name === 'test_parse') {
        result = await executeTestParse(args);
      } else {
        throw new Error(`Unknown tool: ${name}`);
      }

      const safeRequestId = request.id !== null && request.id !== undefined ? request.id : 0;

      const response = {
        jsonrpc: '2.0',
        result,
        id: safeRequestId,
      };
      console.log(JSON.stringify(response));
    } else {
      throw new Error(`Unknown method: ${request.method}`);
    }
  } catch (error) {
    let requestId = null;
    try {
      if (request && typeof request.id !== 'undefined') {
        requestId = request.id;
      }
    } catch {
      requestId = null;
    }

    console.error(`[NL-Query MCP] Error: ${error.message}`);

    const safeRequestId = requestId !== null ? requestId : 0;

    const errorResponse = {
      jsonrpc: '2.0',
      error: {
        code: -32603,
        message: error.message,
      },
      id: safeRequestId,
    };
    console.log(JSON.stringify(errorResponse));
  }
});

process.on('SIGINT', () => {
  console.error('[NL-Query MCP] Terminated');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.error('[NL-Query MCP] Terminated');
  process.exit(0);
});

console.error('[NL-Query MCP] Server started');
