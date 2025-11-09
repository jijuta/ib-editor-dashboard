#!/bin/bash

# AI 모델 선택 테스트 스크립트
# 사용법: ./test/test-with-model.sh [gemini-flash|gemini-pro]

MODEL=${1:-gemini-flash}

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🤖 NL-Query 테스트 (모델: $MODEL)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# .env.local에서 환경변수 로드
if [ -f .env.local ]; then
  echo "📝 .env.local에서 환경변수 로드..."
  set -a
  source .env.local
  set +a
  echo "✅ 사용 가능한 API 키:"

  # API 키 확인
  if [ ! -z "$GOOGLE_GENERATIVE_AI_API_KEY" ]; then
    echo "  ✅ Google Gemini: ${GOOGLE_GENERATIVE_AI_API_KEY:0:20}..."
  fi

  if [ ! -z "$ANTHROPIC_API_KEY" ]; then
    echo "  ✅ Anthropic Claude: ${ANTHROPIC_API_KEY:0:20}..."
  fi

  if [ ! -z "$AZURE_OPENAI_API_KEY" ]; then
    echo "  ✅ Azure OpenAI: ${AZURE_OPENAI_API_KEY:0:20}..."
  fi
else
  echo "⚠️  .env.local 파일 없음"
  exit 1
fi

echo ""

# 모델 설정
case $MODEL in
  gemini-flash)
    export AI_MODEL="gemini-2.0-flash"
    export AI_PROVIDER="gemini"
    echo "🎯 사용 모델: Google Gemini 2.0 Flash (빠름)"
    ;;
  gemini-pro)
    export AI_MODEL="gemini-2.5-pro"
    export AI_PROVIDER="gemini"
    echo "🎯 사용 모델: Google Gemini 2.5 Pro (정확함)"
    ;;
  claude)
    export AI_MODEL="claude-3-5-sonnet-20241022"
    export AI_PROVIDER="claude"
    echo "🎯 사용 모델: Anthropic Claude 3.5 Sonnet"
    echo "⚠️  주의: 파서가 아직 Claude를 지원하지 않습니다."
    echo "   Gemini만 지원됩니다."
    exit 1
    ;;
  azure)
    export AI_MODEL="gpt-4o-mini"
    export AI_PROVIDER="azure"
    echo "🎯 사용 모델: Azure OpenAI GPT-4o-mini"
    echo "⚠️  주의: 파서가 아직 Azure OpenAI를 지원하지 않습니다."
    echo "   Gemini만 지원됩니다."
    exit 1
    ;;
  *)
    echo "❌ 지원하지 않는 모델: $MODEL"
    echo ""
    echo "사용법:"
    echo "  ./test/test-with-model.sh [gemini-flash|gemini-pro|claude|azure]"
    echo ""
    echo "현재 지원:"
    echo "  - gemini-flash (기본, 빠름)"
    echo "  - gemini-pro (정확함)"
    echo ""
    echo "향후 지원 예정:"
    echo "  - claude (Anthropic Claude 3.5 Sonnet)"
    echo "  - azure (Azure OpenAI GPT-4o-mini)"
    exit 1
    ;;
esac

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
echo "✅ 테스트 완료! (모델: $MODEL)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
