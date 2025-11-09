#!/bin/bash

# NL-Query 전체 테스트 실행 스크립트

set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🧪 NL-Query 전체 테스트 실행"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# .env.local 파일에서 환경변수 로드
if [ -f .env.local ]; then
  echo "📝 .env.local 파일에서 환경변수 로드 중..."
  export $(grep -v '^#' .env.local | xargs)
  echo "✅ 환경변수 로드 완료"
else
  echo "⚠️  .env.local 파일이 없습니다. 기본 환경변수 사용"
  export GOOGLE_GENERATIVE_AI_API_KEY="AIzaSyDg7sdkC0ZQD34g5SGrWVLTOSf7eKCxcvY"
  export OPENSEARCH_URL="http://opensearch:9200"
  export OPENSEARCH_USER="admin"
  export OPENSEARCH_PASSWORD="Admin@123456"
fi
echo ""

# 1. 파서 테스트 (빠른 테스트)
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1️⃣  파서 테스트 (파싱만)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
npx tsx test/nl-query-parser-only.ts 2>&1 | grep -v "^\[NL Parser\]" || true
echo ""

# 2. 기본 테스트 (파싱 + OpenSearch 실행)
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "2️⃣  기본 테스트 (파싱 + 쿼리 실행)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
npx tsx test/nl-query-basic.ts 2>&1 | grep -v "^\[NL Parser\]" || true
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ 전체 테스트 완료!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
