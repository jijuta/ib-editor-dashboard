#!/usr/bin/env npx tsx

/**
 * Test MITRE Technique ID Extraction
 */

import { getMITREByTechniqueIds } from '../script/ti-correlator.js';

async function main() {
  console.log('🧪 Testing MITRE Technique ID Extraction\n');

  // 인시던트 414186의 MITRE 정보
  const mitreStrings = [
    'T1112 - Modify Registry',
    'T1588.001 - Obtain Capabilities: Malware',
  ];

  console.log('📝 인시던트 원본 MITRE 정보:');
  mitreStrings.forEach((str, idx) => {
    console.log(`  ${idx + 1}. ${str}`);
  });

  // Technique ID 추출
  const techniqueIds = mitreStrings
    .map((str) => {
      const match = str.match(/^(T\d{4}(?:\.\d{3})?)/);
      return match ? match[1] : null;
    })
    .filter(Boolean);

  console.log('\n🔍 추출된 Technique IDs:');
  console.log(`  ${techniqueIds.join(', ')}\n`);

  // PostgreSQL에서 상세 정보 조회
  console.log('🔍 PostgreSQL에서 상세 정보 조회 중...\n');
  const details = await getMITREByTechniqueIds(techniqueIds);

  console.log(`✅ 조회 결과: ${details.length}/${techniqueIds.length} 개 찾음\n`);

  details.forEach((m, idx) => {
    console.log(`${idx + 1}. ${m.technique_id}: ${m.technique_name}`);
    console.log(`   - Tactic: ${m.tactic}`);
    console.log(`   - 과거 발생: ${m.incident_count}회`);
    console.log(`   - URL: ${m.mitre_url}\n`);
  });

  if (details.length < techniqueIds.length) {
    const found = new Set(details.map((m) => m.technique_id));
    const missing = techniqueIds.filter((id) => !found.has(id));
    console.log(`⚠️  TI DB에 없는 기법: ${missing.join(', ')}`);
  }
}

main().catch(console.error);
