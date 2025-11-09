#!/usr/bin/env tsx

/**
 * NL Query 기본 테스트
 * 자연어 질문 파싱 및 OpenSearch 쿼리 실행 테스트
 */

import { parseNLQuery } from '../script/nl-query-parser.js';
import { executeNLQuery } from '../script/opensearch-executor.js';

async function testBasic() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 NL-Query 기본 테스트');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const testCases = [
    {
      query: '최근 7일간 Critical 심각도 인시던트 개수',
      description: '날짜 표현 + 심각도 필터 + 통계',
    },
    {
      query: '어제 발생한 알럿 목록 보여줘',
      description: '단일 날짜 + 리스트 조회',
    },
    {
      query: '이번 달 Microsoft Defender 인시던트 개수',
      description: '월 단위 + 벤더 필터 + 통계',
    },
    {
      query: '최근 24시간 동안의 High 심각도 알럿',
      description: '시간 단위 + 심각도 필터',
    },
  ];

  let successCount = 0;
  let failCount = 0;

  for (const testCase of testCases) {
    console.log(`🔍 테스트: ${testCase.query}`);
    console.log(`   설명: ${testCase.description}\n`);

    try {
      // 1. 파싱
      const params = await parseNLQuery(testCase.query, {
        model: 'gemini-2.0-flash',
      });

      console.log('   ✅ 파싱 성공');
      console.log(`      - 쿼리 타입: ${params.queryType}`);
      console.log(`      - 데이터 타입: ${params.dataType}`);
      console.log(`      - 인덱스: ${params.indexPattern}`);
      console.log(`      - 시간 범위: ${params.timeRange.start.substring(0, 10)} ~ ${params.timeRange.end.substring(0, 10)}`);
      if (params.filters && Object.keys(params.filters).length > 0) {
        console.log(`      - 필터: ${JSON.stringify(params.filters)}`);
      }

      // 2. 쿼리 실행
      const result = await executeNLQuery(params);

      if (result.success) {
        console.log(`   ✅ 쿼리 성공: 총 ${result.total}개 (${result.took}ms)`);
        successCount++;
      } else {
        console.log(`   ❌ 쿼리 실패: ${result.error}`);
        failCount++;
      }
    } catch (error: any) {
      console.log(`   ❌ 에러: ${error.message}`);
      failCount++;
    }

    console.log();
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 테스트 결과 요약');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`✅ 성공: ${successCount}개`);
  console.log(`❌ 실패: ${failCount}개`);
  console.log(`📊 총 ${successCount + failCount}개 테스트`);

  if (failCount > 0) {
    process.exit(1);
  }
}

testBasic().catch((error) => {
  console.error('❌ 테스트 실패:', error.message);
  process.exit(1);
});
