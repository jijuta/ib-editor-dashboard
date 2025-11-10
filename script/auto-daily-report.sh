#!/bin/bash
##############################################
# 일간 보안 보고서 자동 생성 스크립트
# - cron job용 완전 자동화
# - 데이터 수집 → AI 분석 확인 → 보고서 생성
##############################################

set -e

# 프로젝트 디렉토리로 이동
cd "$(dirname "$0")/.."

# 색상 정의
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# 날짜 파라미터 처리 (기본값: 어제)
if [ -z "$1" ]; then
    REPORT_DATE=$(date -d "yesterday" '+%Y-%m-%d' 2>/dev/null || date -v-1d '+%Y-%m-%d' 2>/dev/null || date '+%Y-%m-%d')
else
    REPORT_DATE=$1
fi

LOG_FILE="/tmp/auto-daily-report-${REPORT_DATE}.log"

echo "" | tee -a "$LOG_FILE"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}" | tee -a "$LOG_FILE"
echo -e "${BLUE}  📊 일간 보안 보고서 자동 생성${NC}" | tee -a "$LOG_FILE"
echo -e "${BLUE}  날짜: ${REPORT_DATE}${NC}" | tee -a "$LOG_FILE"
echo -e "${BLUE}  시작: $(date '+%Y-%m-%d %H:%M:%S')${NC}" | tee -a "$LOG_FILE"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

# 1단계: 데이터 수집
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}" | tee -a "$LOG_FILE"
echo -e "${CYAN}1단계: 인시던트 데이터 수집${NC}" | tee -a "$LOG_FILE"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

npx tsx script/collect-daily-incidents-data.ts "$REPORT_DATE" 2>&1 | tee -a "$LOG_FILE"

if [ $? -ne 0 ]; then
    echo "" | tee -a "$LOG_FILE"
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}" | tee -a "$LOG_FILE"
    echo -e "${RED}❌ 데이터 수집 실패${NC}" | tee -a "$LOG_FILE"
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}" | tee -a "$LOG_FILE"
    echo "" | tee -a "$LOG_FILE"

    ERROR_MESSAGE="인시던트 데이터 수집 스크립트가 실패했습니다 (Exit Code: $?)"

    echo -e "${RED}오류 상세:${NC}" | tee -a "$LOG_FILE"
    echo -e "  ${RED}•${NC} 보고서 날짜: ${REPORT_DATE}" | tee -a "$LOG_FILE"
    echo -e "  ${RED}•${NC} 발생 시각: $(date '+%Y-%m-%d %H:%M:%S')" | tee -a "$LOG_FILE"
    echo -e "  ${RED}•${NC} 호스트: $(hostname)" | tee -a "$LOG_FILE"
    echo "" | tee -a "$LOG_FILE"

    echo -e "${YELLOW}원인 분석:${NC}" | tee -a "$LOG_FILE"
    echo -e "  1. OpenSearch 연결 실패 (opensearch:9200)" | tee -a "$LOG_FILE"
    echo -e "  2. PostgreSQL 연결 실패 (postgres:5432)" | tee -a "$LOG_FILE"
    echo -e "  3. 해당 날짜에 인시던트 데이터가 없음" | tee -a "$LOG_FILE"
    echo -e "  4. 환경 변수 설정 오류 (.env.local)" | tee -a "$LOG_FILE"
    echo "" | tee -a "$LOG_FILE"

    # Supabase 에러 알림 전송
    echo -e "${CYAN}📨 Supabase 에러 알림 전송 중...${NC}" | tee -a "$LOG_FILE"
    npx tsx script/send-error-notification.ts \
        "data_collection_failed" \
        "critical" \
        "$REPORT_DATE" \
        "$ERROR_MESSAGE" \
        2>&1 | tee -a "$LOG_FILE"

    exit 1
fi

DATA_FILE="public/reports/data/daily_incidents_data_${REPORT_DATE}.json"
if [ ! -f "$DATA_FILE" ]; then
    echo "" | tee -a "$LOG_FILE"
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}" | tee -a "$LOG_FILE"
    echo -e "${RED}❌ 데이터 파일 생성 실패${NC}" | tee -a "$LOG_FILE"
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}" | tee -a "$LOG_FILE"
    echo "" | tee -a "$LOG_FILE"

    ERROR_MESSAGE="데이터 파일을 찾을 수 없습니다: ${DATA_FILE}"

    echo -e "${RED}오류 상세:${NC}" | tee -a "$LOG_FILE"
    echo -e "  ${RED}•${NC} 파일 경로: ${DATA_FILE}" | tee -a "$LOG_FILE"
    echo -e "  ${RED}•${NC} 보고서 날짜: ${REPORT_DATE}" | tee -a "$LOG_FILE"
    echo "" | tee -a "$LOG_FILE"

    # Supabase 에러 알림 전송
    echo -e "${CYAN}📨 Supabase 에러 알림 전송 중...${NC}" | tee -a "$LOG_FILE"
    npx tsx script/send-error-notification.ts \
        "data_collection_failed" \
        "critical" \
        "$REPORT_DATE" \
        "$ERROR_MESSAGE" \
        2>&1 | tee -a "$LOG_FILE"

    exit 1
fi

echo -e "${GREEN}✅ 데이터 파일 생성 완료: ${DATA_FILE}${NC}" | tee -a "$LOG_FILE"

# 데이터 파일 유효성 검증
if ! jq empty "$DATA_FILE" 2>/dev/null; then
    echo -e "${RED}❌ 데이터 파일이 유효하지 않은 JSON 형식입니다${NC}" | tee -a "$LOG_FILE"

    npx tsx script/send-error-notification.ts \
        "data_collection_failed" \
        "high" \
        "$REPORT_DATE" \
        "데이터 파일이 손상되었습니다: ${DATA_FILE}" \
        2>&1 | tee -a "$LOG_FILE"

    exit 1
fi

INCIDENT_COUNT=$(cat "$DATA_FILE" | jq '.collected_data.incidents | length')
echo -e "${GREEN}✅ 수집된 인시던트: ${INCIDENT_COUNT}건${NC}" | tee -a "$LOG_FILE"

# 2단계: AI 분석 확인
echo "" | tee -a "$LOG_FILE"
echo -e "${PURPLE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}" | tee -a "$LOG_FILE"
echo -e "${PURPLE}2단계: AI 분석 데이터 확인${NC}" | tee -a "$LOG_FILE"
echo -e "${PURPLE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

AI_FILE="public/reports/data/ai_analysis_${REPORT_DATE}.json"

if [ ! -f "$AI_FILE" ]; then
    echo "" | tee -a "$LOG_FILE"
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}" | tee -a "$LOG_FILE"
    echo -e "${RED}❌ AI 분석 실패${NC}" | tee -a "$LOG_FILE"
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}" | tee -a "$LOG_FILE"
    echo "" | tee -a "$LOG_FILE"

    ERROR_MESSAGE="AI 분석 파일을 찾을 수 없습니다: ${AI_FILE}"

    echo -e "${RED}오류 상세:${NC}" | tee -a "$LOG_FILE"
    echo -e "  ${RED}•${NC} 파일 경로: ${AI_FILE}" | tee -a "$LOG_FILE"
    echo -e "  ${RED}•${NC} 보고서 날짜: ${REPORT_DATE}" | tee -a "$LOG_FILE"
    echo -e "  ${RED}•${NC} 발생 시각: $(date '+%Y-%m-%d %H:%M:%S')" | tee -a "$LOG_FILE"
    echo -e "  ${RED}•${NC} 호스트: $(hostname)" | tee -a "$LOG_FILE"
    echo "" | tee -a "$LOG_FILE"

    echo -e "${YELLOW}원인 분석:${NC}" | tee -a "$LOG_FILE"
    echo -e "  1. AI 분석 프롬프트가 생성되지 않았거나" | tee -a "$LOG_FILE"
    echo -e "  2. AI 분석이 수동으로 실행되지 않았거나" | tee -a "$LOG_FILE"
    echo -e "  3. AI 분석 스크립트가 실패했을 가능성" | tee -a "$LOG_FILE"
    echo "" | tee -a "$LOG_FILE"

    echo -e "${YELLOW}필수 조치:${NC}" | tee -a "$LOG_FILE"
    echo -e "  ${YELLOW}→${NC} 다음 명령어로 AI 분석 프롬프트 생성:" | tee -a "$LOG_FILE"
    echo -e "    npx tsx script/create-ai-analysis-prompt.ts ${REPORT_DATE}" | tee -a "$LOG_FILE"
    echo "" | tee -a "$LOG_FILE"
    echo -e "  ${YELLOW}→${NC} 생성된 프롬프트를 Claude Code에 붙여넣기:" | tee -a "$LOG_FILE"
    echo -e "    cat public/reports/data/ai_analysis_prompt_${REPORT_DATE}.txt" | tee -a "$LOG_FILE"
    echo "" | tee -a "$LOG_FILE"
    echo -e "  ${YELLOW}→${NC} AI 응답을 다음 경로에 저장:" | tee -a "$LOG_FILE"
    echo -e "    ${AI_FILE}" | tee -a "$LOG_FILE"
    echo "" | tee -a "$LOG_FILE"

    # Supabase 에러 알림 전송
    echo -e "${CYAN}📨 Supabase 에러 알림 전송 중...${NC}" | tee -a "$LOG_FILE"
    npx tsx script/send-error-notification.ts \
        "ai_analysis_failed" \
        "critical" \
        "$REPORT_DATE" \
        "$ERROR_MESSAGE" \
        2>&1 | tee -a "$LOG_FILE"

    # 에러 상태 파일 생성 (모니터링용)
    ERROR_STATE_FILE="/tmp/daily_report_error_${REPORT_DATE}.flag"
    cat > "$ERROR_STATE_FILE" << EOF
{
  "error_type": "ai_analysis_failed",
  "report_date": "$REPORT_DATE",
  "error_message": "$ERROR_MESSAGE",
  "timestamp": "$(date -Iseconds)",
  "hostname": "$(hostname)",
  "log_file": "$LOG_FILE"
}
EOF

    echo "" | tee -a "$LOG_FILE"
    echo -e "${RED}⚠️  보고서 생성을 중단합니다.${NC}" | tee -a "$LOG_FILE"
    echo -e "${RED}⚠️  AI 분석 완료 후 다시 실행하세요.${NC}" | tee -a "$LOG_FILE"
    echo "" | tee -a "$LOG_FILE"

    exit 1
else
    echo -e "${GREEN}✅ AI 분석 파일 발견: ${AI_FILE}${NC}" | tee -a "$LOG_FILE"

    # AI 분석 파일 유효성 검증
    if ! jq empty "$AI_FILE" 2>/dev/null; then
        echo -e "${RED}❌ AI 분석 파일이 유효하지 않은 JSON 형식입니다${NC}" | tee -a "$LOG_FILE"

        npx tsx script/send-error-notification.ts \
            "ai_analysis_failed" \
            "high" \
            "$REPORT_DATE" \
            "AI 분석 파일이 손상되었습니다: ${AI_FILE}" \
            2>&1 | tee -a "$LOG_FILE"

        exit 1
    fi

    echo -e "${GREEN}✅ AI 분석 파일 유효성 검증 통과${NC}" | tee -a "$LOG_FILE"
fi

# 3단계: 보고서 생성
echo "" | tee -a "$LOG_FILE"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}" | tee -a "$LOG_FILE"
echo -e "${GREEN}3단계: 최종 보고서 생성${NC}" | tee -a "$LOG_FILE"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

npx tsx script/generate-final-report.ts "$REPORT_DATE" 2>&1 | tee -a "$LOG_FILE"

if [ $? -ne 0 ]; then
    echo "" | tee -a "$LOG_FILE"
    echo -e "${RED}❌ 보고서 생성 실패${NC}" | tee -a "$LOG_FILE"
    exit 1
fi

# 완료
echo "" | tee -a "$LOG_FILE"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}" | tee -a "$LOG_FILE"
echo -e "${BLUE}✅ 자동 보고서 생성 완료!${NC}" | tee -a "$LOG_FILE"
echo -e "${BLUE}  완료: $(date '+%Y-%m-%d %H:%M:%S')${NC}" | tee -a "$LOG_FILE"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

echo -e "${GREEN}📁 생성된 파일:${NC}" | tee -a "$LOG_FILE"
echo -e "  ${GREEN}✓${NC} public/reports/data/daily_incidents_data_${REPORT_DATE}.json" | tee -a "$LOG_FILE"
echo -e "  ${GREEN}✓${NC} public/reports/data/ai_analysis_${REPORT_DATE}.json" | tee -a "$LOG_FILE"
echo -e "  ${GREEN}✓${NC} public/reports/daily/daily_report_${REPORT_DATE}.html" | tee -a "$LOG_FILE"
echo -e "  ${GREEN}✓${NC} public/reports/daily/daily_report_${REPORT_DATE}.md" | tee -a "$LOG_FILE"
echo -e "  ${GREEN}✓${NC} public/reports/daily/daily_report_${REPORT_DATE}.json" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

echo -e "${YELLOW}📋 로그 파일: ${LOG_FILE}${NC}" | tee -a "$LOG_FILE"
echo -e "${YELLOW}🌐 웹 접근: http://localhost:3000/reports/daily/daily_report_${REPORT_DATE}.html${NC}" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"
