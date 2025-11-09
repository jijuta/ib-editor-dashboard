#!/usr/bin/env tsx

import { spawn } from 'child_process';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

async function testIncidentInvestigation() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔍 Incident Investigation Test');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const mcp = spawn('npx', ['tsx', 'script/nl-query-mcp.js'], {
    cwd: process.cwd(),
    env: process.env,
  });

  let stdoutBuffer = '';

  mcp.stdout!.on('data', (data) => {
    stdoutBuffer += data.toString();
  });

  mcp.stderr!.on('data', (data) => {
    console.error('[MCP]', data.toString().trim());
  });

  // 서버 시작 대기
  await new Promise(resolve => setTimeout(resolve, 2000));

  console.log('\n📤 요청: 인시던트 414016 조사');
  console.log('질문: "414016 인시던트 정보"\n');

  const request = {
    jsonrpc: '2.0',
    method: 'tools/call',
    params: {
      name: 'nl_query',
      arguments: {
        query: '414016 인시던트 정보',
        model: 'azure-gpt-4o-mini',
        execute: true,
        format: ['markdown', 'summary'],
      },
    },
    id: 1,
  };

  stdoutBuffer = '';
  mcp.stdin!.write(JSON.stringify(request) + '\n');

  // 응답 대기 (investigation은 시간이 오래 걸릴 수 있음)
  await new Promise(resolve => setTimeout(resolve, 15000));

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📥 MCP 응답:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  if (stdoutBuffer) {
    try {
      const lines = stdoutBuffer.split('\n').filter(l => l.trim());
      const response = JSON.parse(lines[lines.length - 1]);
      
      if (response.result?.content?.[0]?.text) {
        const resultData = JSON.parse(response.result.content[0].text);
        
        console.log('✅ Success:', resultData.success);
        
        if (resultData.markdown) {
          console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.log('📋 Markdown 보고서 (처음 3000자):');
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
          console.log(resultData.markdown.substring(0, 3000));
          console.log('\n... (전체 보고서 길이:', resultData.markdown.length, 'bytes)');
        }
        
        if (resultData.summary) {
          console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.log('💬 요약:');
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
          console.log(resultData.summary);
        }
      }
    } catch (e: any) {
      console.log('⚠️  파싱 실패:', e.message);
      console.log('Raw output (first 2000 chars):', stdoutBuffer.substring(0, 2000));
    }
  } else {
    console.log('⚠️  응답 없음');
  }

  mcp.kill();
  console.log('\n✅ 테스트 완료\n');
}

testIncidentInvestigation().catch(console.error);
