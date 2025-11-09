#!/bin/bash

# Quick incident test
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"nl_query","arguments":{"query":"414016 인시던트 정보","model":"azure-gpt-4o-mini","execute":true,"format":["summary"]}},"id":1}' | npx tsx script/nl-query-mcp.js 2>&1 | grep -A 1000 '"result":'
