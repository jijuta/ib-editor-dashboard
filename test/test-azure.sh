#!/bin/bash

# Azure OpenAI 테스트 스크립트

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "⚡ Azure OpenAI NL-Query 테스트"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# .env.local에서 환경변수 로드
if [ -f .env.local ]; then
  echo "📝 .env.local에서 환경변수 로드..."
  set -a
  source .env.local
  set +a
  echo "✅ 환경변수 로드 완료"
else
  echo "⚠️  .env.local 파일 없음"
  exit 1
fi

echo ""
echo "🔍 Azure OpenAI로 파싱 테스트 시작..."
echo ""

npx tsx test/nl-query-azure-test.ts

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ 테스트 완료!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
