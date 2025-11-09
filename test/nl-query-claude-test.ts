#!/usr/bin/env tsx

/**
 * Anthropic Claude 기반 NL-Query 테스트
 */

import { parseNLQuery } from '../script/nl-query-parser';
import { executeNLQuery } from '../script/opensearch-executor';

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 Claude 3.5 Sonnet NL-Query 테스트');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  const testQuery = '최근 7일간 Critical 심각도 인시던트 개수';

  try {
    console.log(`🔍 테스트 질문: "${testQuery}"`);
    console.log('');

    // 1. Claude로 파싱
    console.log('⚙️  Claude 3.5 Sonnet으로 파싱 중...');
    const params = await parseNLQuery(testQuery, {
      model: 'claude-3-5-sonnet',
      debug: true,
    });

    console.log('');
    console.log('✅ 파싱 성공!');
    console.log('   파싱 결과:', JSON.stringify(params, null, 2));
    console.log('');

    // 2. OpenSearch 쿼리 실행
    console.log('⚙️  OpenSearch 쿼리 실행 중...');
    const result = await executeNLQuery(params);

    if (result.success) {
      console.log('✅ 쿼리 성공!');
      console.log(`   총 개수: ${result.total}개`);
      console.log(`   실행 시간: ${result.took}ms`);
      console.log('');

      if (result.hits && result.hits.length > 0) {
        console.log(`   샘플 데이터 (상위 3개):`);
        result.hits.slice(0, 3).forEach((hit: any, idx: number) => {
          console.log(`   ${idx + 1}. ID: ${hit._id}`);
        });
      }
    } else {
      console.log('❌ 쿼리 실패:', result.error);
    }
  } catch (error: any) {
    console.error('');
    console.error('❌ 테스트 실패:', error.message);
    process.exit(1);
  }

  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ Claude 3.5 Sonnet 테스트 완료!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main();
