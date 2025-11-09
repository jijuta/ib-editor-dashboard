#!/usr/bin/env node
/**
 * Incident Investigation with AI Prompt
 * Claude Code가 분석할 수 있도록 데이터를 수집하고 프롬프트 생성
 */

import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import path from 'path';

const incidentId = process.argv[2];

if (!incidentId) {
  console.error('Usage: npx tsx script/investigate-with-prompt.ts <incident_id>');
  process.exit(1);
}

console.log(`\n🔍 인시던트 ${incidentId} 조사 중...\n`);

// 1. 데이터 수집 (AI 분석 없이)
console.log('1️⃣ 데이터 수집 중...');
const cwd = process.cwd();
execSync(`npx tsx script/investigate-incident-cli.ts --incident-id ${incidentId}`, {
  cwd,
  stdio: 'inherit',
});

// 2. 최신 JSON 파일 찾기
const { readdirSync } = require('fs');
const dir = path.join(cwd, 'data', 'investigations');
const files = readdirSync(dir)
  .filter((f: string) => f.startsWith(`incident_${incidentId}_`) && f.endsWith('.json'))
  .sort()
  .reverse();

if (files.length === 0) {
  console.error('❌ 데이터 파일을 찾을 수 없습니다.');
  process.exit(1);
}

const dataFile = path.join(dir, files[0]);
const data = JSON.parse(readFileSync(dataFile, 'utf-8'));

// 3. AI 분석 프롬프트 생성
const incident = data.incident || {};
const summary = data.summary || {};
const ti = data.ti_correlation || {};
const networks = data.networks || [];
const files_data = data.files || [];

console.log(`\n✅ 데이터 수집 완료\n`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📊 AI 분석 작성 가이드');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

console.log(`## 인시던트 ${incidentId} 분석 요청\n`);

console.log('### 📋 기본 정보');
console.log(`- **인시던트 ID**: ${incidentId}`);
console.log(`- **심각도**: ${incident.severity}`);
console.log(`- **상태**: ${incident.status}`);
console.log(`- **설명**: ${incident.description}`);
console.log(`- **분석가 판단**: ${incident.resolve_comment || '없음'}\n`);

console.log('### 📊 통계');
console.log(`- **총 알럿**: ${summary.total_alerts}`);
console.log(`- **파일**: ${summary.total_files} (위협: ${summary.ti_threat_files})`);
console.log(`- **네트워크**: ${summary.total_networks} (위협 IP: ${summary.ti_threat_ips})`);
console.log(`- **엔드포인트**: ${summary.total_endpoints}`);
console.log(`- **CVE**: ${summary.total_cves}`);
console.log(`- **MITRE 기법**: ${ti.mitre_techniques?.length || 0}\n`);

console.log('### 🔴 위협 파일 (상위 5개)');
ti.file_hashes?.filter((f: any) => f.verdict === 'threat').slice(0, 5).forEach((f: any, i: number) => {
  console.log(`${i + 1}. ${f.hash.substring(0, 32)}... (위협 레벨: ${f.threat_level})`);
});

console.log('\n### 🎯 MITRE ATT&CK');
ti.mitre_techniques?.forEach((m: any) => {
  console.log(`- ${m.technique_id}: ${m.name}`);
});

console.log('\n### 🌐 네트워크 (상위 5개)');
networks.slice(0, 5).forEach((n: any, i: number) => {
  const addr = n.network_url || n.network_remote_ip || n.network_domain;
  console.log(`${i + 1}. ${n.type}: ${addr} (국가: ${n.country})`);
});

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('✍️  다음 형식으로 AI 분석을 작성해주세요 (한글):');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

const analysisTemplate = `
{
  "incident_detail": "인시던트 상세 분석 의견 (200-300자)",
  "file_artifacts": "파일 아티팩트 분석 의견 (200-300자)",
  "network_artifacts": "네트워크 아티팩트 분석 의견 (200-300자)",
  "mitre_analysis": "MITRE ATT&CK 분석 의견 (200-300자)",
  "endpoint_analysis": "엔드포인트 분석 의견 (200-300자)",
  "final_verdict": {
    "verdict": "false_positive | true_positive | needs_investigation",
    "risk_score": 0-100,
    "confidence": 0-100,
    "summary": "종합 분석 요약 (300-500자)",
    "key_findings": [
      "주요 발견 사항 1",
      "주요 발견 사항 2",
      "주요 발견 사항 3"
    ]
  }
}`;

console.log(analysisTemplate);

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('💾 분석 저장 방법:');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
console.log(`분석을 작성한 후 다음 명령어로 저장하세요:\n`);
console.log(`npx tsx script/save-analysis.ts ${incidentId} '<분석 JSON>'\n`);
console.log(`또는 파일로 저장:\n`);
console.log(`echo '<분석 JSON>' > /tmp/analysis.json`);
console.log(`npx tsx script/save-analysis.ts ${incidentId} /tmp/analysis.json\n`);

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
console.log(`📁 전체 데이터: ${dataFile}\n`);
