#!/usr/bin/env tsx
/**
 * AI 분석 프롬프트 생성기
 * 수집된 데이터를 바탕으로 Claude Code가 분석할 수 있는 프롬프트 생성
 * 출력: 텍스트 프롬프트 파일 (claude --print용)
 */

import { readFileSync, writeFileSync } from 'fs';

// 날짜 파라미터
const args = process.argv.slice(2);
const reportDate = args[0] || new Date(Date.now() - 86400000).toISOString().split('T')[0];

console.log('');
console.log('\x1b[35m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m');
console.log('\x1b[35m  🤖 AI 분석 프롬프트 생성\x1b[0m');
console.log(`\x1b[35m  날짜: ${reportDate}\x1b[0m`);
console.log('\x1b[35m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m');
console.log('');

// 1. 데이터 로드
console.log('\x1b[32m1️⃣  데이터 로드 중...\x1b[0m');

const dataFile = `public/reports/data/daily_incidents_data_${reportDate}.json`;

let data: any;
try {
  data = JSON.parse(readFileSync(dataFile, 'utf-8'));
} catch (error) {
  console.error(`\x1b[31m❌ 데이터 파일을 찾을 수 없습니다: ${dataFile}\x1b[0m`);
  console.log('');
  console.log('\x1b[33m먼저 데이터 수집을 실행하세요:\x1b[0m');
  console.log(`\x1b[33m  npx tsx script/collect-daily-incidents-data.ts ${reportDate}\x1b[0m`);
  console.log('');
  process.exit(1);
}

console.log(`✅ 데이터 로드 완료`);

// 2. AI 분석 프롬프트 생성
console.log('');
console.log('\x1b[32m2️⃣  프롬프트 생성 중...\x1b[0m');

const aiData = data.ai_analysis_data;

const prompt = `# 일간 보안 인시던트 분석 요청

당신은 보안 분석 전문가입니다. 아래 데이터를 분석하고 전문적인 보안 판단을 제공해주세요.

## 분석 날짜
**${reportDate}**

## 전체 개요

- **총 인시던트**: ${aiData.summary.total_incidents}건
- **Critical**: ${aiData.summary.critical_count}건
- **High**: ${aiData.summary.high_count}건
- **Medium**: ${aiData.summary.medium_count}건
- **Low**: ${aiData.summary.low_count}건

## 상위 위협 인시던트 (Top 10)

${aiData.top_incidents.map((inc: any, idx: number) => `
### ${idx + 1}. [${inc.severity.toUpperCase()}] 인시던트 #${inc.incident_id}

**설명**: ${inc.description}

**분석가 판단**: ${inc.resolve_comment || '없음'}

**파일 분석**:
- 총 파일: ${inc.files_summary.total}개
- 위협 파일: ${inc.files_summary.threat_count}개
- 파일 유형: ${inc.files_summary.file_types.join(', ') || 'N/A'}

**네트워크 분석**:
- 총 연결: ${inc.network_summary.total}건
- 고유 IP: ${inc.network_summary.unique_ips.length}개
- 고유 도메인: ${inc.network_summary.unique_domains.length}개
- 국가: ${inc.network_summary.countries.join(', ') || 'N/A'}

**MITRE ATT&CK**:
- 기법: ${inc.mitre_techniques.join(', ') || '없음'}
- 전술: ${inc.mitre_tactics.join(', ') || '없음'}

**엔드포인트 CVE**: ${inc.endpoint_cves.slice(0, 5).map((cve: string) => cve).join(', ') || '없음'}

**알럿 수**: ${inc.alerts_count}개
`).join('\n---\n')}

## 통계 분석

### 심각도별 분포
${Object.entries(aiData.statistics.by_severity).map(([severity, count]) => `- **${severity}**: ${count}건`).join('\n')}

### 상태별 분포
${Object.entries(aiData.statistics.by_status).map(([status, count]) => `- **${status}**: ${count}건`).join('\n')}

### 주요 탐지 유형 (Top 10)
${Object.entries(aiData.statistics.by_detection_type)
  .sort(([, a]: any, [, b]: any) => b - a)
  .slice(0, 10)
  .map(([type, count], idx) => `${idx + 1}. **${type}**: ${count}건`)
  .join('\n')}

### 주요 호스트 (Top 10)
${Object.entries(aiData.statistics.by_host)
  .sort(([, a]: any, [, b]: any) => b - a)
  .slice(0, 10)
  .map(([host, count], idx) => `${idx + 1}. **${host}**: ${count}건`)
  .join('\n')}

## 위협 인텔리전스 분석

- **분석된 해시**: ${aiData.threat_intelligence.total_hashes_analyzed}개
- **위협 파일**: ${aiData.threat_intelligence.threat_files.length}개
- **의심 파일**: ${aiData.threat_intelligence.suspicious_files.length}개

### 위협 파일 상세 (Top 10)
${aiData.threat_intelligence.threat_files.slice(0, 10).map((file: any, idx: number) => `
${idx + 1}. **${file.file_name || 'Unknown'}**
   - Hash: \`${file.hash.substring(0, 16)}...\`
   - 위협 레벨: ${file.threat_level}
   - 분류: ${file.classification}
   - 출처: ${file.threat_intel_sources?.join(', ') || 'Unknown'}
`).join('\n')}

## MITRE ATT&CK 분석

### 탐지된 기법 수
- **총 ${aiData.mitre_attack.techniques.length}개 기법**

### 전술별 분포
${Object.entries(aiData.mitre_attack.tactics_distribution)
  .sort(([, a]: any, [, b]: any) => b - a)
  .map(([tactic, count], idx) => `${idx + 1}. **${tactic}**: ${count}건`)
  .join('\n')}

### 주요 기법 (Top 10)
${aiData.mitre_attack.techniques.slice(0, 10).map((tech: any, idx: number) => `
${idx + 1}. **${tech.technique_id}: ${tech.technique_name}**
   - 전술: ${tech.tactic}
   - 설명: ${(tech.description || '').substring(0, 100)}...
`).join('\n')}

## 네트워크 위협 분석

- **총 연결**: ${aiData.statistics.network.total_connections}건
- **고유 IP**: ${aiData.statistics.network.unique_ips.size}개
- **고유 도메인**: ${aiData.statistics.network.unique_domains.size}개

### 국가별 분포 (Top 10)
${Object.entries(aiData.statistics.network.countries)
  .sort(([, a]: any, [, b]: any) => b - a)
  .slice(0, 10)
  .map(([country, count], idx) => `${idx + 1}. **${country}**: ${count}건`)
  .join('\n')}

---

## 🤖 분석 요청사항

위 데이터를 바탕으로 다음을 분석하고 **JSON 형식**으로 응답해주세요:

\`\`\`json
{
  "executive_summary": "당일 보안 상황 종합 요약 (2-3문장)",

  "threat_assessment": {
    "overall_risk_level": "critical|high|medium|low",
    "risk_score": 0-100,
    "confidence": 0-100,
    "key_findings": [
      "주요 발견사항 1",
      "주요 발견사항 2",
      "주요 발견사항 3"
    ]
  },

  "incident_analysis": {
    "critical_incidents_summary": "Critical/High 인시던트 분석",
    "false_positive_rate": "오탐률 추정 (%)",
    "true_threats_count": "실제 위협으로 판단되는 건수",
    "patterns_detected": [
      "탐지된 패턴 1",
      "탐지된 패턴 2"
    ]
  },

  "threat_intelligence_insights": {
    "malware_families": ["발견된 멀웨어 패밀리"],
    "attack_vectors": ["공격 벡터"],
    "threat_actors": ["위협 행위자 (추정)"],
    "ioc_summary": "IOC 요약"
  },

  "mitre_attack_analysis": {
    "primary_tactics": ["주요 전술 Top 3"],
    "primary_techniques": ["주요 기법 Top 5"],
    "attack_chain_analysis": "공격 체인 분석",
    "defense_gaps": ["발견된 방어 공백"]
  },

  "network_threat_analysis": {
    "suspicious_countries": ["의심스러운 국가"],
    "c2_indicators": ["C&C 서버 징후"],
    "data_exfiltration_risk": "데이터 유출 위험도",
    "lateral_movement": "내부 이동 징후"
  },

  "recommendations": {
    "immediate_actions": [
      "즉시 조치사항 1",
      "즉시 조치사항 2"
    ],
    "short_term": [
      "단기 개선사항 1",
      "단기 개선사항 2"
    ],
    "long_term": [
      "중장기 개선사항 1",
      "중장기 개선사항 2"
    ]
  },

  "trending_analysis": {
    "increasing_threats": ["증가 추세 위협"],
    "decreasing_threats": ["감소 추세 위협"],
    "new_attack_patterns": ["새로운 공격 패턴"],
    "comparison_notes": "전일/전주 대비 비교 의견"
  },

  "security_posture_assessment": {
    "strengths": ["강점"],
    "weaknesses": ["약점"],
    "overall_grade": "A|B|C|D|F",
    "improvement_priority": ["개선 우선순위"]
  }
}
\`\`\`

**중요**: 반드시 위 JSON 형식으로 응답해주세요. 추가 설명은 JSON 내부 필드에 포함시켜주세요.
`;

console.log(`✅ 프롬프트 생성 완료 (${prompt.length}자)`);

// 3. 프롬프트 저장
console.log('');
console.log('\x1b[32m3️⃣  프롬프트 저장 중...\x1b[0m');

const promptFile = `public/reports/data/ai_analysis_prompt_${reportDate}.txt`;
writeFileSync(promptFile, prompt);

console.log(`✅ 프롬프트 저장: ${promptFile}`);

// 4. 실행 가이드 출력
console.log('');
console.log('\x1b[35m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m');
console.log('\x1b[35m✅ AI 분석 프롬프트 생성 완료!\x1b[0m');
console.log('\x1b[35m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m');
console.log('');
console.log('\x1b[33m다음 단계: Claude AI 분석 실행\x1b[0m');
console.log('');
console.log('\x1b[36m📋 방법 1: claude 명령어 사용 (권장)\x1b[0m');
console.log(`\x1b[32m  cat ${promptFile} | claude --print > public/reports/data/ai_analysis_${reportDate}.json\x1b[0m`);
console.log('');
console.log('\x1b[36m📋 방법 2: 스크립트 사용\x1b[0m');
console.log(`\x1b[32m  npx tsx script/run-ai-analysis.ts ${reportDate}\x1b[0m`);
console.log('');
console.log('\x1b[33m💡 팁: claude 명령어가 없으면 방법 2를 사용하세요\x1b[0m');
console.log('');
