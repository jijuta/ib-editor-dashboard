#!/bin/bash

# 여러 AI 모델 비교 테스트
# Gemini 2.0 Flash vs Gemini 2.5 Pro

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔬 AI 모델 비교 테스트"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# .env.local 로드
if [ -f .env.local ]; then
  set -a
  source .env.local
  set +a
else
  echo "❌ .env.local 파일이 없습니다."
  exit 1
fi

TEST_QUERY="최근 7일간 Critical 심각도 인시던트 개수"

echo "📝 테스트 질문: \"$TEST_QUERY\""
echo ""

# Gemini 2.0 Flash 테스트
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1️⃣  Gemini 2.0 Flash (빠름)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
FLASH_START=$(date +%s%N)

FLASH_RESULT=$(npx tsx --eval "
import { parseNLQuery } from './script/nl-query-parser.js';

(async () => {
  const result = await parseNLQuery('$TEST_QUERY', {
    model: 'gemini-2.0-flash'
  });

  console.log('✅ 쿼리 타입:', result.queryType);
  console.log('✅ 데이터 타입:', result.dataType);
  console.log('✅ 필터:', JSON.stringify(result.filters));
})();
" 2>&1 | grep -v "^\[NL Parser\]")

FLASH_END=$(date +%s%N)
FLASH_TIME=$(( (FLASH_END - FLASH_START) / 1000000 ))

echo "$FLASH_RESULT"
echo "⏱️  실행 시간: ${FLASH_TIME}ms"
echo ""

# Gemini 2.5 Pro 테스트
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "2️⃣  Gemini 2.5 Pro (정확함)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
PRO_START=$(date +%s%N)

PRO_RESULT=$(npx tsx --eval "
import { parseNLQuery } from './script/nl-query-parser.js';

(async () => {
  const result = await parseNLQuery('$TEST_QUERY', {
    model: 'gemini-2.5-pro'
  });

  console.log('✅ 쿼리 타입:', result.queryType);
  console.log('✅ 데이터 타입:', result.dataType);
  console.log('✅ 필터:', JSON.stringify(result.filters));
})();
" 2>&1 | grep -v "^\[NL Parser\]")

PRO_END=$(date +%s%N)
PRO_TIME=$(( (PRO_END - PRO_START) / 1000000 ))

echo "$PRO_RESULT"
echo "⏱️  실행 시간: ${PRO_TIME}ms"
echo ""

# 비교 요약
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 비교 요약"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Gemini 2.0 Flash: ${FLASH_TIME}ms"
echo "Gemini 2.5 Pro:   ${PRO_TIME}ms"

if [ $FLASH_TIME -lt $PRO_TIME ]; then
  DIFF=$(( PRO_TIME - FLASH_TIME ))
  echo "✅ Flash가 ${DIFF}ms 더 빠릅니다"
else
  DIFF=$(( FLASH_TIME - PRO_TIME ))
  echo "✅ Pro가 ${DIFF}ms 더 빠릅니다"
fi
