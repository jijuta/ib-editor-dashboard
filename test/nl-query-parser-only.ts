#!/usr/bin/env tsx

/**
 * NL Query 파서 테스트 (OpenSearch 실행 없음)
 * 파싱만 테스트하여 빠르게 결과 확인
 */

import { parseNLQuery } from '../script/nl-query-parser.js';

async function testParserOnly() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 NL-Query 파서 테스트 (파싱만)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const testQueries = [
    // 날짜 표현식 테스트
    '오늘 발생한 인시던트',
    '어제 발생한 알럿',
    '최근 7일간 인시던트',
    '지난주 알럿',
    '이번 달 인시던트',

    // 심각도 필터 테스트
    'Critical 심각도 인시던트',
    'High severity alerts',
    '크리티컬 알럿',

    // 쿼리 타입 테스트
    '인시던트 개수',
    '알럿 목록 보여줘',
    '인시던트 차트',
    '보안 인시던트 보고서',

    // 복합 쿼리 테스트
    '최근 7일간 Critical 심각도 인시던트 개수',
    '어제 발생한 High severity 알럿 목록',
    '이번 달 Microsoft Defender 인시던트',
  ];

  let successCount = 0;
  let failCount = 0;

  for (const query of testQueries) {
    try {
      const params = await parseNLQuery(query, {
        model: 'gemini-2.0-flash',
      });

      console.log(`✅ "${query}"`);
      console.log(`   → ${params.dataType} / ${params.queryType}`);
      console.log(`   → ${params.indexPattern}`);

      if (params.filters && Object.keys(params.filters).length > 0) {
        console.log(`   → 필터: ${JSON.stringify(params.filters)}`);
      }

      console.log();
      successCount++;
    } catch (error: any) {
      console.log(`❌ "${query}"`);
      console.log(`   → 에러: ${error.message}\n`);
      failCount++;
    }
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 파싱 테스트 결과');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`✅ 성공: ${successCount}개`);
  console.log(`❌ 실패: ${failCount}개`);
  console.log(`📊 총 ${successCount + failCount}개 테스트`);

  if (failCount > 0) {
    process.exit(1);
  }
}

testParserOnly().catch((error) => {
  console.error('❌ 테스트 실패:', error.message);
  process.exit(1);
});
