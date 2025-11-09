#!/usr/bin/env node
/**
 * Create Analysis Prompt for Claude Code
 * Claude Code가 바로 분석할 수 있도록 프롬프트 생성
 */

import { readFileSync, writeFileSync } from 'fs';
import path from 'path';

const incidentId = process.argv[2];

if (!incidentId) {
  console.error('Usage: npx tsx script/create-analysis-prompt.ts <incident_id>');
  process.exit(1);
}

// 최신 JSON 파일 찾기
const { readdirSync } = require('fs');
const dir = path.join(process.cwd(), 'data', 'investigations');
const files = readdirSync(dir)
  .filter((f: string) => f.startsWith(`incident_${incidentId}_`) && f.endsWith('.json'))
  .sort()
  .reverse();

if (files.length === 0) {
  console.error('❌ 데이터 파일을 찾을 수 없습니다. 먼저 조사를 실행하세요:');
  console.error(`   npx tsx script/investigate-incident-cli.ts --incident-id ${incidentId}`);
  process.exit(1);
}

const dataFile = path.join(dir, files[0]);
const data = JSON.parse(readFileSync(dataFile, 'utf-8'));

const incident = data.incident || {};
const summary = data.summary || {};
const ti = data.ti_correlation || {};

// 프롬프트 생성
const prompt = `인시던트 ${incidentId} AI 분석 요청

다음 데이터를 바탕으로 보안 인시던트를 분석하고, 각 섹션별 AI 의견을 한글로 작성해주세요.

## 📋 인시던트 정보
- ID: ${incidentId}
- 심각도: ${incident.severity}
- 상태: ${incident.status}
- 설명: ${incident.description}
- 분석가 판단: ${incident.resolve_comment || '없음'}

## 📊 통계
- 총 알럿: ${summary.total_alerts}
- 파일: ${summary.total_files} (위협: ${summary.ti_threat_files})
- 네트워크: ${summary.total_networks} (위협 IP: ${summary.ti_threat_ips})
- 엔드포인트: ${summary.total_endpoints}
- CVE: ${summary.total_cves}
- MITRE 기법: ${ti.mitre_techniques?.length || 0}

## 🔴 위협 파일 (상위 10개)
${ti.file_hashes?.filter((f: any) => f.verdict === 'threat').slice(0, 10).map((f: any, i: number) =>
  `${i + 1}. Hash: ${f.hash.substring(0, 32)}...\n   위협 레벨: ${f.threat_level}\n   분류: ${f.classification || 'Unknown'}`
).join('\n\n') || '위협 파일 없음'}

## 🎯 MITRE ATT&CK 기법
${ti.mitre_techniques?.map((m: any) =>
  `- ${m.technique_id}: ${m.name}\n  전술: ${m.tactic}\n  설명: ${m.description?.substring(0, 100)}...`
).join('\n\n') || 'MITRE 기법 없음'}

## 🌐 네트워크 아티팩트 (상위 10개)
${data.networks?.slice(0, 10).map((n: any, i: number) =>
  `${i + 1}. 타입: ${n.type}\n   주소: ${n.network_url || n.network_remote_ip || n.network_domain || 'N/A'}\n   국가: ${n.country}\n   평판: ${n.reputation}`
).join('\n\n') || '네트워크 데이터 없음'}

## 💻 엔드포인트
${data.endpoints?.map((e: any) =>
  `- 호스트: ${e.endpoint_name}\n  OS: ${e.endpoint_type}\n  상태: ${e.endpoint_status}`
).join('\n\n') || '엔드포인트 정보 없음'}

## 🔒 CVE 취약점 (상위 10개)
${ti.cve_details?.slice(0, 10).map((c: any) =>
  `- ${c.cve_id}: ${c.severity || 'N/A'}\n  ${c.description?.substring(0, 100)}...`
).join('\n\n') || 'CVE 정보 없음'}

---

## ✍️ 작성해야 할 AI 분석 (한글로 작성):

다음 JSON 형식으로 분석을 작성해주세요:

\`\`\`json
{
  "incident_detail": "인시던트 상세 분석 의견 (분석가 판단을 고려하여 200-300자로 작성)",
  "file_artifacts": "파일 아티팩트 분석 의견 (${summary.ti_threat_files}개 위협 파일에 대한 의견, 200-300자)",
  "network_artifacts": "네트워크 아티팩트 분석 의견 (${summary.total_networks}개 연결에 대한 의견, 200-300자)",
  "mitre_analysis": "MITRE ATT&CK 분석 의견 (탐지된 ${ti.mitre_techniques?.length || 0}개 기법 분석, 200-300자)",
  "endpoint_analysis": "엔드포인트 분석 의견 (${summary.total_endpoints}개 엔드포인트와 ${summary.total_cves}개 CVE 분석, 200-300자)",
  "final_verdict": {
    "verdict": "false_positive 또는 true_positive 또는 needs_investigation",
    "risk_score": 0-100 사이 숫자,
    "confidence": 0-100 사이 신뢰도,
    "summary": "전체 분석을 종합한 최종 의견 (300-500자)",
    "key_findings": [
      "주요 발견 사항 1",
      "주요 발견 사항 2",
      "주요 발견 사항 3"
    ]
  }
}
\`\`\`

분석 작성 후 다음 명령어로 저장하세요:
\`\`\`bash
cat > /tmp/analysis_${incidentId}.json << 'EOF'
<위에서 작성한 JSON>
EOF

npx tsx script/save-analysis-and-report.ts ${incidentId} /tmp/analysis_${incidentId}.json
\`\`\`
`;

// 프롬프트 저장
const promptFile = `/tmp/incident_${incidentId}_prompt.txt`;
writeFileSync(promptFile, prompt, 'utf-8');

console.log(prompt);
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`✅ 프롬프트가 저장되었습니다: ${promptFile}`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
