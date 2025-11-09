#!/usr/bin/env tsx

/**
 * 간단한 MCP 클라이언트 테스트
 * nl-query MCP 서버와 통신하여 쿼리 테스트
 */

import { spawn } from 'child_process';
import { config } from 'dotenv';
import { resolve } from 'path';

// .env.local 로드
config({ path: resolve(process.cwd(), '.env.local') });

interface MCPResponse {
  jsonrpc: string;
  result?: any;
  error?: any;
  id: number;
}

async function testMCP() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🧪 NL-Query MCP 통합 테스트');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  // MCP 서버 실행
  const mcp = spawn('npx', ['tsx', 'script/nl-query-mcp.js'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      AZURE_OPENAI_API_KEY: process.env.AZURE_OPENAI_API_KEY,
      AZURE_OPENAI_ENDPOINT: process.env.AZURE_OPENAI_ENDPOINT,
      AZURE_OPENAI_DEPLOYMENT: process.env.AZURE_OPENAI_DEPLOYMENT,
      OPENSEARCH_URL: process.env.OPENSEARCH_URL,
      OPENSEARCH_USER: process.env.OPENSEARCH_USER,
      OPENSEARCH_PASSWORD: process.env.OPENSEARCH_PASSWORD,
    },
  });

  let responseBuffer = '';

  mcp.stdout!.on('data', (data) => {
    responseBuffer += data.toString();
  });

  mcp.stderr!.on('data', (data) => {
    // 에러 출력은 무시 (로그용)
    console.error('[MCP Server]', data.toString().trim());
  });

  // 서버 시작 대기
  await new Promise(resolve => setTimeout(resolve, 2000));

  console.log('✅ MCP 서버 시작 완료\n');

  // Test 1: tools/list
  console.log('📋 Test 1: 도구 목록 조회');
  mcp.stdin!.write(JSON.stringify({
    jsonrpc: '2.0',
    method: 'tools/list',
    params: {},
    id: 1,
  }) + '\n');

  await new Promise(resolve => setTimeout(resolve, 1000));

  // Test 2: test_parse (파싱만)
  console.log('\n🔍 Test 2: 파싱 테스트 (쿼리 실행 안 함)');
  console.log('질문: "최근 7일간 Critical 심각도 인시던트는 몇 건인가요?"');

  responseBuffer = '';
  mcp.stdin!.write(JSON.stringify({
    jsonrpc: '2.0',
    method: 'tools/call',
    params: {
      name: 'test_parse',
      arguments: {
        query: '최근 7일간 Critical 심각도 인시던트는 몇 건인가요?',
        model: 'azure-gpt-4o-mini',
      },
    },
    id: 2,
  }) + '\n');

  // 응답 대기 (파싱은 빠름)
  await new Promise(resolve => setTimeout(resolve, 5000));

  console.log('\n✅ 파싱 완료');

  // Test 3: nl_query (실제 쿼리 실행)
  console.log('\n🚀 Test 3: 전체 쿼리 실행 (파싱 + OpenSearch)');
  console.log('질문: "최근 24시간 인시던트 개수"');

  responseBuffer = '';
  mcp.stdin!.write(JSON.stringify({
    jsonrpc: '2.0',
    method: 'tools/call',
    params: {
      name: 'nl_query',
      arguments: {
        query: '최근 24시간 인시던트 개수',
        model: 'azure-gpt-4o-mini',
        execute: true,
        format: ['summary'],
      },
    },
    id: 3,
  }) + '\n');

  // 응답 대기 (쿼리 실행 포함)
  await new Promise(resolve => setTimeout(resolve, 8000));

  console.log('\n✅ 쿼리 실행 완료');

  // MCP 서버 종료
  mcp.kill();

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ 모든 테스트 완료!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

testMCP().catch(console.error);
