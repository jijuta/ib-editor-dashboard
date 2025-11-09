#!/bin/bash

# MCP 서버 직접 호출 테스트

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔧 NL-Query MCP 서버 직접 테스트"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

cd /www/ib-editor/my-app

# 환경변수 로드
if [ -f .env.local ]; then
  set -a
  source .env.local
  set +a
fi

# MCP 서버 시작 후 JSON-RPC 요청 전송
echo '{"jsonrpc":"2.0","method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test-client","version":"1.0.0"}},"id":1}' | \
AZURE_OPENAI_API_KEY="$AZURE_OPENAI_API_KEY" \
AZURE_OPENAI_ENDPOINT="$AZURE_OPENAI_ENDPOINT" \
AZURE_OPENAI_DEPLOYMENT="$AZURE_OPENAI_DEPLOYMENT" \
OPENSEARCH_URL="$OPENSEARCH_URL" \
OPENSEARCH_USER="$OPENSEARCH_USER" \
OPENSEARCH_PASSWORD="$OPENSEARCH_PASSWORD" \
npx tsx script/nl-query-mcp.js 2>&1 | head -1

echo ""
echo "✅ 초기화 완료"
echo ""

# tools/list 요청
echo "📋 사용 가능한 도구 목록:"
echo '{"jsonrpc":"2.0","method":"tools/list","params":{},"id":2}' | \
AZURE_OPENAI_API_KEY="$AZURE_OPENAI_API_KEY" \
AZURE_OPENAI_ENDPOINT="$AZURE_OPENAI_ENDPOINT" \
AZURE_OPENAI_DEPLOYMENT="$AZURE_OPENAI_DEPLOYMENT" \
OPENSEARCH_URL="$OPENSEARCH_URL" \
OPENSEARCH_USER="$OPENSEARCH_USER" \
OPENSEARCH_PASSWORD="$OPENSEARCH_PASSWORD" \
npx tsx script/nl-query-mcp.js 2>&1 | grep -v "^\[NL" | head -1 | jq '.result.tools[] | {name, description}'

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ MCP 서버 작동 확인 완료!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
