#!/usr/bin/env tsx

/**
 * MCP 응답 디버깅 도구
 * nl-query MCP 서버의 실제 응답을 확인
 */

import { spawn } from 'child_process';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

async function debugMCPResponse() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🐛 MCP 응답 디버깅');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

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

  let stdoutBuffer = '';
  let stderrBuffer = '';

  mcp.stdout!.on('data', (data) => {
    const text = data.toString();
    stdoutBuffer += text;
    console.log('[STDOUT]', text);
  });

  mcp.stderr!.on('data', (data) => {
    const text = data.toString();
    stderrBuffer += text;
    console.error('[STDERR]', text.trim());
  });

  // 서버 시작 대기
  await new Promise(resolve => setTimeout(resolve, 1500));

  console.log('\n📤 요청: nl_query 도구 호출');
  console.log('질문: "최근 7일간 Critical 심각도 인시던트 개수"\n');

  const request = {
    jsonrpc: '2.0',
    method: 'tools/call',
    params: {
      name: 'nl_query',
      arguments: {
        query: '최근 7일간 Critical 심각도 인시던트 개수',
        model: 'azure-gpt-4o-mini',
        execute: true,
        format: ['summary'],
      },
    },
    id: 1,
  };

  stdoutBuffer = '';
  mcp.stdin!.write(JSON.stringify(request) + '\n');

  // 응답 대기
  await new Promise(resolve => setTimeout(resolve, 10000));

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📥 MCP 응답:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  if (stdoutBuffer) {
    try {
      const response = JSON.parse(stdoutBuffer.split('\n').filter(l => l.trim())[0]);
      console.log(JSON.stringify(response, null, 2));

      if (response.result?.content?.[0]?.text) {
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📋 결과 데이터:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        const resultData = JSON.parse(response.result.content[0].text);
        console.log(JSON.stringify(resultData, null, 2));

        if (resultData.summary) {
          console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.log('💬 요약:');
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
          console.log(resultData.summary);
        }
      }
    } catch (e) {
      console.log('Raw STDOUT:', stdoutBuffer);
    }
  } else {
    console.log('⚠️  응답 없음');
  }

  mcp.kill();
  console.log('\n✅ 디버깅 완료\n');
}

debugMCPResponse().catch(console.error);
