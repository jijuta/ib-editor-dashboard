#!/bin/bash

# MCP 서버로 실제 쿼리 테스트

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔍 NL-Query MCP 실제 쿼리 테스트"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

cd /www/ib-editor/my-app

# 환경변수 로드
if [ -f .env.local ]; then
  set -a
  source .env.local
  set +a
fi

# 임시 파일 생성
TMPFILE=$(mktemp)

# MCP 서버 백그라운드 실행
AZURE_OPENAI_API_KEY="$AZURE_OPENAI_API_KEY" \
AZURE_OPENAI_ENDPOINT="$AZURE_OPENAI_ENDPOINT" \
AZURE_OPENAI_DEPLOYMENT="$AZURE_OPENAI_DEPLOYMENT" \
OPENSEARCH_URL="$OPENSEARCH_URL" \
OPENSEARCH_USER="$OPENSEARCH_USER" \
OPENSEARCH_PASSWORD="$OPENSEARCH_PASSWORD" \
npx tsx script/nl-query-mcp.js > "$TMPFILE" 2>&1 &

MCP_PID=$!

# 서버 시작 대기
sleep 2

echo "📝 질문: 최근 7일간 Critical 심각도 인시던트는 몇 건인가요?"
echo ""

# tools/call 요청 (test_parse로 파싱만 테스트)
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"test_parse","arguments":{"query":"최근 7일간 Critical 심각도 인시던트는 몇 건인가요?","model":"azure-gpt-4o-mini"}},"id":3}' | \
AZURE_OPENAI_API_KEY="$AZURE_OPENAI_API_KEY" \
AZURE_OPENAI_ENDPOINT="$AZURE_OPENAI_ENDPOINT" \
AZURE_OPENAI_DEPLOYMENT="$AZURE_OPENAI_DEPLOYMENT" \
OPENSEARCH_URL="$OPENSEARCH_URL" \
OPENSEARCH_USER="$OPENSEARCH_USER" \
OPENSEARCH_PASSWORD="$OPENSEARCH_PASSWORD" \
npx tsx script/nl-query-mcp.js 2>&1 | grep -v "^\[" | head -1 | jq '.result'

# MCP 프로세스 종료
kill $MCP_PID 2>/dev/null

# 임시 파일 삭제
rm -f "$TMPFILE"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ 테스트 완료!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
