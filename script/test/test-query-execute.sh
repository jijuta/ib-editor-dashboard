#!/bin/bash

# nl-query MCP 실제 쿼리 실행 테스트

echo "=== NL-Query Execution Test ==="
echo ""

# OpenSearch 연결 확인
echo "🔍 Step 1: OpenSearch 연결 확인"
curl -s -u admin:Admin@123456 http://opensearch:9200/_cluster/health | jq -r '"✅ Cluster: \(.cluster_name), Status: \(.status)"'
echo ""

# 인덱스 존재 확인
echo "📋 Step 2: 인덱스 확인"
curl -s -u admin:Admin@123456 http://opensearch:9200/_cat/indices/logs-cortex_xdr-incidents-* | head -3
echo ""

# 테스트 쿼리 실행
echo "🚀 Step 3: NL-Query 실행 (파싱 + OpenSearch 쿼리)"
cat > script/test/query-execute.json << 'EOF'
{
  "jsonrpc":"2.0",
  "method":"tools/call",
  "params":{
    "name":"nl_query",
    "arguments":{
      "query":"최근 7일간 인시던트 통계",
      "model":"gemini-2.0-flash",
      "execute":true,
      "format":["markdown","json"]
    }
  },
  "id":1
}
EOF

cat script/test/query-execute.json | npx tsx script/nl-query-mcp.js 2>&1 | jq -r '
  if .result.success then
    "✅ Success!\n" +
    "Query: \(.result.query)\n" +
    "Total Results: \(.result.result.total)\n" +
    "Execution Time: \(.result.result.took)ms\n" +
    "Index: \(.result.params.indexPattern)"
  else
    "❌ Failed: \(.result.error)"
  end
'

echo ""
echo "=== Test Complete ==="
