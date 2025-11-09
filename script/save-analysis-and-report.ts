#!/usr/bin/env node
/**
 * Save AI Analysis and Generate Report
 * Claude Code가 작성한 AI 분석을 저장하고 보고서 생성
 */

import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';
import path from 'path';

const incidentId = process.argv[2];
const analysisInput = process.argv[3];

if (!incidentId || !analysisInput) {
  console.error('Usage: npx tsx script/save-analysis-and-report.ts <incident_id> <analysis_json_or_file>');
  console.error('');
  console.error('Examples:');
  console.error('  npx tsx script/save-analysis-and-report.ts 414186 /tmp/analysis.json');
  console.error('  npx tsx script/save-analysis-and-report.ts 414186 \'{"incident_detail":"..."}\'');
  process.exit(1);
}

try {
  console.log(`\n💾 인시던트 ${incidentId} AI 분석 저장 중...\n`);

  // 분석 데이터 읽기
  let analysisJson: string;
  if (analysisInput.startsWith('{')) {
    analysisJson = analysisInput;
  } else {
    analysisJson = readFileSync(analysisInput, 'utf-8');
  }

  const analysis = JSON.parse(analysisJson);

  // 최신 데이터 파일 찾기
  const { readdirSync } = require('fs');
  const dir = path.join(process.cwd(), 'data', 'investigations');
  const files = readdirSync(dir)
    .filter((f: string) => f.startsWith(`incident_${incidentId}_`) && f.endsWith('.json'))
    .sort()
    .reverse();

  if (files.length === 0) {
    throw new Error(`인시던트 ${incidentId}의 데이터 파일을 찾을 수 없습니다.`);
  }

  const dataFile = path.join(dir, files[0]);
  const data = JSON.parse(readFileSync(dataFile, 'utf-8'));

  // Claude 분석 추가
  data.claude_analysis = {
    ...analysis,
    analyzed_at: new Date().toISOString(),
    analyzed_by: 'Claude Sonnet 4.5 (via Claude Code)',
  };

  // 업데이트된 JSON 저장
  writeFileSync(dataFile, JSON.stringify(data, null, 2), 'utf-8');
  console.log(`✅ AI 분석이 저장되었습니다: ${dataFile}\n`);

  // HTML 보고서 생성
  console.log('📝 한글 HTML 보고서 생성 중...\n');
  execSync(`npx tsx script/generate-korean-html-report.ts ${incidentId}`, {
    cwd: process.cwd(),
    stdio: 'inherit',
  });

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ 완료!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // 최신 보고서 링크 찾기
  const reportDir = path.join(process.cwd(), 'public', 'reports');
  const reportFiles = readdirSync(reportDir)
    .filter((f: string) => f.startsWith(`incident_${incidentId}_korean_`) && f.endsWith('.html'))
    .sort()
    .reverse();

  if (reportFiles.length > 0) {
    const reportDomain = process.env.REPORT_DOMAIN;
    const reportUrl = reportDomain
      ? `https://${reportDomain}/reports/${reportFiles[0]}`
      : `http://localhost:40017/reports/${reportFiles[0]}`;

    console.log(`🌐 보고서 확인: ${reportUrl}\n`);
  }

} catch (error: any) {
  console.error('\n❌ 오류:', error.message);
  console.error('\n상세 정보:', error);
  process.exit(1);
}
