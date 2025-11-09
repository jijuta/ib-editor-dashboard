#!/bin/bash

# 빠른 테스트 (export 방식)

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "⚡ NL-Query 빠른 테스트 (export 방식)"
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
  echo "⚠️  .env.local 파일 없음, 기본값 사용"
  export GOOGLE_GENERATIVE_AI_API_KEY="AIzaSyDg7sdkC0ZQD34g5SGrWVLTOSf7eKCxcvY"
  export OPENSEARCH_URL="http://opensearch:9200"
  export OPENSEARCH_USER="admin"
  export OPENSEARCH_PASSWORD="Admin@123456"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1️⃣  파서 테스트"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
npx tsx test/nl-query-parser-only.ts 2>&1 | grep -v "^\[NL Parser\]"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "2️⃣  OpenSearch 통합 테스트"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
npx tsx test/nl-query-basic.ts 2>&1 | grep -v "^\[NL Parser\]"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ 전체 테스트 완료!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
