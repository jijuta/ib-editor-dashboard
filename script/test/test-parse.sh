#!/bin/bash

# nl-query MCP 파싱 테스트 스크립트

echo "=== NL-Query MCP Test Suite ==="
echo ""

# 테스트 1: 기본 통계 쿼리
echo "📊 Test 1: 기본 통계 쿼리"
cat > /tmp/test1.json << 'EOF'
{"jsonrpc":"2.0","method":"tools/call","params":{"name":"test_parse","arguments":{"query":"최근 7일간 인시던트 통계","model":"gemini-2.0-flash"}},"id":1}
EOF
cat /tmp/test1.json | npx tsx ../nl-query-mcp.js 2>&1 | jq -r '.result.params | "✅ Query Type: \(.queryType), Data Type: \(.dataType), Time Range: \(.timeRange.start) ~ \(.timeRange.end)"'
echo ""

# 테스트 2: 심각도 필터
echo "🔴 Test 2: 심각도 필터"
cat > /tmp/test2.json << 'EOF'
{"jsonrpc":"2.0","method":"tools/call","params":{"name":"test_parse","arguments":{"query":"최근 7일간 Critical과 High 심각도 인시던트 개수","model":"gemini-2.0-flash"}},"id":2}
EOF
cat /tmp/test2.json | npx tsx ../nl-query-mcp.js 2>&1 | jq -r '.result.params | "✅ Severity Filter: \(.filters.severity)"'
echo ""

# 테스트 3: 벤더 필터
echo "🏢 Test 3: 벤더 필터"
cat > /tmp/test3.json << 'EOF'
{"jsonrpc":"2.0","method":"tools/call","params":{"name":"test_parse","arguments":{"query":"이번 주 CrowdStrike 알럿 목록","model":"gemini-2.0-flash"}},"id":3}
EOF
cat /tmp/test3.json | npx tsx ../nl-query-mcp.js 2>&1 | jq -r '.result.params | "✅ Vendor: \(.vendorFilter // "none"), Data Type: \(.dataType)"'
echo ""

# 테스트 4: 날짜 표현식
echo "📅 Test 4: 다양한 날짜 표현식"
for query in "어제 발생한 인시던트" "이번 달 알럿 통계" "최근 30일간 데이터"; do
  echo "Query: '$query'"
  cat > /tmp/test-date.json << EOF
{"jsonrpc":"2.0","method":"tools/call","params":{"name":"test_parse","arguments":{"query":"$query","model":"gemini-2.0-flash"}},"id":4}
EOF
  cat /tmp/test-date.json | npx tsx ../nl-query-mcp.js 2>&1 | jq -r '.result.params.timeRange | "  ✅ \(.start) ~ \(.end)"'
done
echo ""

# 테스트 5: 도구 목록 확인
echo "🔧 Test 5: MCP 도구 목록"
echo '{"jsonrpc":"2.0","method":"tools/list","params":{},"id":5}' | npx tsx ../nl-query-mcp.js 2>&1 | jq -r '.result.tools[] | "  ✅ \(.name): \(.description)"'
echo ""

echo "=== All Tests Complete ==="

# Cleanup
rm -f /tmp/test*.json
