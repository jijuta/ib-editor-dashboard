#!/bin/bash
# Quick Investigation - 인시던트 조사 및 한글 보고서 생성

if [ -z "$1" ]; then
  echo "Usage: ./script/quick-investigate.sh <incident_id>"
  exit 1
fi

INCIDENT_ID=$1

echo ""
echo "🔍 인시던트 $INCIDENT_ID 조사 시작..."
echo ""

# 1. 데이터 수집 (AI 분석 없이)
echo "1️⃣  데이터 수집 중..."
npx tsx script/investigate-incident-cli.ts --incident-id "$INCIDENT_ID" 2>&1 | grep -E "\[CLI\]"

# 2. 한글 보고서 생성
echo ""
echo "2️⃣  한글 보고서 생성 중..."
npx tsx script/generate-korean-html-report.ts "$INCIDENT_ID" 2>&1 | grep -E "\[Korean Report\]"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ 완료!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 최신 보고서 찾기
LATEST_REPORT=$(ls -t public/reports/incident_${INCIDENT_ID}_korean_*.html 2>/dev/null | head -1)

if [ -n "$LATEST_REPORT" ]; then
  FILENAME=$(basename "$LATEST_REPORT")
  echo "📄 보고서: $LATEST_REPORT"
  echo ""

  # 도메인 설정 확인
  if [ -n "$REPORT_DOMAIN" ]; then
    echo "🌐 외부 접속: https://$REPORT_DOMAIN/reports/$FILENAME"
  else
    echo "🌐 로컬 접속: http://localhost:40017/reports/$FILENAME"
  fi
  echo ""
else
  echo "❌ 보고서를 찾을 수 없습니다."
  exit 1
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "💡 참고:"
echo "   - AI 분석 의견은 현재 포함되지 않았습니다"
echo "   - Claude Code로 AI 분석을 추가하려면:"
echo "     claude --print \"Investigate incident $INCIDENT_ID\""
echo ""
