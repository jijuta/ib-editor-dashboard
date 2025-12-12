#!/bin/bash
# RAG Chat API Test Script
# Tests the chat API endpoints

BASE_URL="${BASE_URL:-http://localhost:40017}"

echo "==================================="
echo "RAG Chat API Test"
echo "Base URL: $BASE_URL"
echo "==================================="

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Test 1: Health Check
echo -e "\n${YELLOW}[Test 1] Health Check${NC}"
HEALTH_RESPONSE=$(curl -s "$BASE_URL/api/chat/health")
if echo "$HEALTH_RESPONSE" | grep -q '"status"'; then
    echo -e "${GREEN}✓ Health endpoint working${NC}"
    echo "$HEALTH_RESPONSE" | head -c 500
else
    echo -e "${RED}✗ Health endpoint failed${NC}"
fi

# Test 2: Create Session
echo -e "\n\n${YELLOW}[Test 2] Create Session${NC}"
SESSION_RESPONSE=$(curl -s -X POST "$BASE_URL/api/chat/sessions" \
    -H "Content-Type: application/json" \
    -d '{"user_id": "test-user", "workspace": "default", "title": "Test Session"}')

if echo "$SESSION_RESPONSE" | grep -q '"id"'; then
    SESSION_ID=$(echo "$SESSION_RESPONSE" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
    echo -e "${GREEN}✓ Session created: $SESSION_ID${NC}"
else
    echo -e "${RED}✗ Session creation failed${NC}"
    echo "$SESSION_RESPONSE"
fi

# Test 3: List Sessions
echo -e "\n${YELLOW}[Test 3] List Sessions${NC}"
SESSIONS_RESPONSE=$(curl -s "$BASE_URL/api/chat/sessions?user_id=test-user&include_stats=true")
if echo "$SESSIONS_RESPONSE" | grep -q '"sessions"'; then
    echo -e "${GREEN}✓ Sessions listed${NC}"
    SESSION_COUNT=$(echo "$SESSIONS_RESPONSE" | grep -o '"sessions":\[[^]]*\]' | grep -o '"id"' | wc -l)
    echo "  Found $SESSION_COUNT sessions"
else
    echo -e "${RED}✗ Session listing failed${NC}"
fi

# Test 4: Chat Streaming
echo -e "\n${YELLOW}[Test 4] Chat Streaming (POST /api/chat)${NC}"
echo "Sending: 'T1059 PowerShell 공격이란?'"
echo "---"
CHAT_RESPONSE=$(curl -s -N "$BASE_URL/api/chat" \
    -H "Content-Type: application/json" \
    -d '{"message": "T1059 PowerShell 공격이란?", "workspace": "default"}' \
    --max-time 30)

if [ -n "$CHAT_RESPONSE" ]; then
    echo -e "${GREEN}✓ Chat response received${NC}"
    # Show first 500 chars of response
    echo "$CHAT_RESPONSE" | head -c 500
    echo "..."
else
    echo -e "${RED}✗ Chat request failed or timed out${NC}"
fi

# Test 5: Get Session Detail (if session was created)
if [ -n "$SESSION_ID" ]; then
    echo -e "\n\n${YELLOW}[Test 5] Get Session Detail${NC}"
    DETAIL_RESPONSE=$(curl -s "$BASE_URL/api/chat/sessions/$SESSION_ID")
    if echo "$DETAIL_RESPONSE" | grep -q '"session"'; then
        echo -e "${GREEN}✓ Session detail retrieved${NC}"
    else
        echo -e "${RED}✗ Session detail failed${NC}"
    fi

    # Test 6: Delete Session
    echo -e "\n${YELLOW}[Test 6] Delete Session${NC}"
    DELETE_RESPONSE=$(curl -s -X DELETE "$BASE_URL/api/chat/sessions/$SESSION_ID")
    if echo "$DELETE_RESPONSE" | grep -q '"success":true'; then
        echo -e "${GREEN}✓ Session deleted${NC}"
    else
        echo -e "${RED}✗ Session deletion failed${NC}"
    fi
fi

echo -e "\n\n==================================="
echo "Test Complete"
echo "==================================="
