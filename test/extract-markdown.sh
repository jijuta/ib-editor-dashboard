#!/bin/bash

# Extract just the markdown from incident investigation
OUTPUT=$(echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"nl_query","arguments":{"query":"414016 인시던트 정보","model":"azure-gpt-4o-mini","execute":true,"format":["markdown"]}},"id":1}' | npx tsx script/nl-query-mcp.js 2>/dev/null)

# Parse JSON and extract markdown field
echo "$OUTPUT" | node -e "
const data = JSON.parse(require('fs').readFileSync(0, 'utf-8'));
const result = JSON.parse(data.result.content[0].text);
console.log(result.markdown);
" 2>/dev/null || echo "Failed to extract markdown"
