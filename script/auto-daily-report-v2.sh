#!/bin/bash
# 일일 보고서 자동 생성 - 전체 파이프라인
#
# 3-Stage 파이프라인:
#   Stage 1: 데이터 수집 (collect-daily-incidents.ts)
#   Stage 2-1: Pass 1 전체 분류 (pass1-classify-all.sh)
#   Stage 2-2: Pass 2 상세 분석 (pass2-detailed-analysis.sh)
#   Stage 3: 최종 보고서 생성 (generate-final-report.sh)
#
# Usage:
#   ./script/auto-daily-report-v2.sh              # 어제 날짜
#   ./script/auto-daily-report-v2.sh 2025-11-23   # 특정 날짜

set -e

DATE=${1:-$(date -d "yesterday" +%Y-%m-%d)}
START_TIME=$(date +%s)

echo "╔════════════════════════════════════════════════════╗"
echo "║     일일 보안 보고서 자동 생성 (v2.0)              ║"
echo "╚════════════════════════════════════════════════════╝"
echo ""
echo "날짜: ${DATE}"
echo "시작 시간: $(date)"
echo ""

# 로그 파일
LOG_DIR="/tmp/daily-reports"
mkdir -p $LOG_DIR
LOG_FILE="${LOG_DIR}/daily_report_${DATE}.log"

exec > >(tee -a $LOG_FILE)
exec 2>&1

echo "로그 파일: ${LOG_FILE}"
echo ""

# Stage 1: 데이터 수집
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Stage 1: 데이터 수집"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

STAGE1_START=$(date +%s)

if npx tsx script/collect-daily-incidents.ts --date $DATE; then
  STAGE1_END=$(date +%s)
  STAGE1_DURATION=$((STAGE1_END - STAGE1_START))
  echo ""
  echo "✅ Stage 1 완료 (소요 시간: ${STAGE1_DURATION}초)"
else
  echo ""
  echo "❌ Stage 1 실패"
  exit 1
fi

echo ""

# Stage 2-1: Pass 1 전체 분류
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Stage 2-1: Pass 1 - 전체 인시던트 분류"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

PASS1_START=$(date +%s)

if ./script/pass1-classify-all.sh $DATE; then
  PASS1_END=$(date +%s)
  PASS1_DURATION=$((PASS1_END - PASS1_START))
  echo ""
  echo "✅ Pass 1 완료 (소요 시간: ${PASS1_DURATION}초)"
else
  echo ""
  echo "❌ Pass 1 실패"
  exit 1
fi

echo ""

# Stage 2-2: Pass 2 상세 분석
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Stage 2-2: Pass 2 - 상세 분석"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

PASS2_START=$(date +%s)

if ./script/pass2-detailed-analysis.sh $DATE; then
  PASS2_END=$(date +%s)
  PASS2_DURATION=$((PASS2_END - PASS2_START))
  echo ""
  echo "✅ Pass 2 완료 (소요 시간: ${PASS2_DURATION}초)"
else
  echo ""
  echo "❌ Pass 2 실패"
  exit 1
fi

echo ""

# Stage 3: 최종 보고서 생성
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Stage 3: 최종 보고서 생성"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

STAGE3_START=$(date +%s)

if ./script/generate-final-report.sh $DATE; then
  STAGE3_END=$(date +%s)
  STAGE3_DURATION=$((STAGE3_END - STAGE3_START))
  echo ""
  echo "✅ Stage 3 완료 (소요 시간: ${STAGE3_DURATION}초)"
else
  echo ""
  echo "❌ Stage 3 실패"
  exit 1
fi

echo ""

# HTML 변환 (선택적)
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "추가: HTML 보고서 생성"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# HTML 변환 스크립트가 있다면 실행
if [ -f "script/convert-to-html.ts" ]; then
  if npx tsx script/convert-to-html.ts --input /tmp/final_report_${DATE}.json --output /www/ib-editor/my-app/public/reports/daily/daily_report_${DATE}.html; then
    echo "✅ HTML 보고서 생성 완료"
  else
    echo "⚠️  HTML 변환 실패 (JSON 보고서는 정상 생성됨)"
  fi
else
  echo "⚠️  HTML 변환 스크립트 없음 (script/convert-to-html.ts)"
  echo "   JSON 보고서만 생성됨"
fi

echo ""

# 완료
END_TIME=$(date +%s)
TOTAL_DURATION=$((END_TIME - START_TIME))
MINUTES=$((TOTAL_DURATION / 60))
SECONDS=$((TOTAL_DURATION % 60))

echo "╔════════════════════════════════════════════════════╗"
echo "║              보고서 생성 완료!                      ║"
echo "╚════════════════════════════════════════════════════╝"
echo ""
echo "날짜: ${DATE}"
echo "종료 시간: $(date)"
echo ""
echo "소요 시간:"
echo "  - Stage 1 (데이터 수집): ${STAGE1_DURATION}초"
echo "  - Pass 1 (전체 분류): ${PASS1_DURATION}초"
echo "  - Pass 2 (상세 분석): ${PASS2_DURATION}초"
echo "  - Stage 3 (최종 보고서): ${STAGE3_DURATION}초"
echo "  - 총 소요 시간: ${MINUTES}분 ${SECONDS}초"
echo ""
echo "생성된 파일:"
echo "  - 원본 데이터: /tmp/daily_data_${DATE}.json"
echo "  - 분류 결과: /tmp/pass1_${DATE}/all_classifications.json"
echo "  - 상세 분석: /tmp/pass2_${DATE}/all_detailed_analysis.json"
echo "  - 최종 보고서: /tmp/final_report_${DATE}.json"

if [ -f "/www/ib-editor/my-app/public/reports/daily/daily_report_${DATE}.html" ]; then
  echo "  - HTML 보고서: /www/ib-editor/my-app/public/reports/daily/daily_report_${DATE}.html"
fi

echo ""
echo "로그: ${LOG_FILE}"
echo ""
echo "════════════════════════════════════════════════════"
