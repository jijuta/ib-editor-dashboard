#!/bin/bash
##############################################
# 일간 보안 보고서 생성 - 단일 실행 스크립트
# 사용법: ./daily-report.sh [날짜]
##############################################

set -e

# 프로젝트 디렉토리로 이동
cd "$(dirname "$0")"

# 색상 정의
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# 날짜 파라미터 처리
if [ -z "$1" ]; then
    REPORT_DATE=$(date -d "yesterday" '+%Y-%m-%d' 2>/dev/null || date -v-1d '+%Y-%m-%d' 2>/dev/null || date '+%Y-%m-%d')
    echo ""
    echo -e "${YELLOW}📅 날짜를 지정하지 않아 어제 날짜로 설정됩니다: ${REPORT_DATE}${NC}"
    echo ""
else
    REPORT_DATE=$1
fi

# 도움말
if [ "$1" == "-h" ] || [ "$1" == "--help" ]; then
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  📊 일간 보안 보고서 생성기${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo "사용법:"
    echo "  ./daily-report.sh [날짜]"
    echo ""
    echo "옵션:"
    echo "  날짜          YYYY-MM-DD 형식 (선택, 기본값: 어제)"
    echo "  -h, --help    이 도움말 표시"
    echo ""
    echo "예제:"
    echo "  ./daily-report.sh              # 어제 날짜로 보고서 생성"
    echo "  ./daily-report.sh 2025-11-08   # 특정 날짜로 보고서 생성"
    echo ""
    echo "생성 파일:"
    echo "  /tmp/daily_incidents_data_[날짜].json              - 수집된 데이터"
    echo "  /tmp/ai_analysis_prompt_[날짜].txt                 - AI 분석 프롬프트"
    echo "  /tmp/ai_analysis_[날짜].json                       - AI 분석 결과"
    echo "  public/reports/daily/daily_report_[날짜].html      - HTML 보고서"
    echo "  public/reports/daily/daily_report_[날짜].md        - Markdown 보고서"
    echo "  public/reports/daily/daily_report_[날짜].json      - JSON 통합 보고서"
    echo ""
    echo "웹 접근:"
    echo "  http://localhost:3000/reports/daily/daily_report_[날짜].html"
    echo ""
    exit 0
fi

# 메인 파이프라인 실행
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  📊 일간 보안 보고서 생성 시작${NC}"
echo -e "${BLUE}  날짜: ${REPORT_DATE}${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# 전체 파이프라인 실행
./script/generate-complete-daily-report.sh "$REPORT_DATE"

# 결과 확인
if [ -f "/tmp/ai_analysis_${REPORT_DATE}.json" ]; then
    echo ""
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}✅ 보고서 생성 완료!${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "${BLUE}📁 생성된 파일:${NC}"
    echo -e "  ${GREEN}✓${NC} /tmp/daily_incidents_data_${REPORT_DATE}.json"
    echo -e "  ${GREEN}✓${NC} /tmp/ai_analysis_prompt_${REPORT_DATE}.txt"
    echo -e "  ${GREEN}✓${NC} /tmp/ai_analysis_${REPORT_DATE}.json"
    echo -e "  ${GREEN}✓${NC} public/reports/daily/daily_report_${REPORT_DATE}.html"
    echo -e "  ${GREEN}✓${NC} public/reports/daily/daily_report_${REPORT_DATE}.md"
    echo -e "  ${GREEN}✓${NC} public/reports/daily/daily_report_${REPORT_DATE}.json"
    echo ""

    # AI 분석 결과 미리보기
    if command -v jq &> /dev/null; then
        echo -e "${BLUE}📋 AI 분석 미리보기:${NC}"
        echo ""

        RISK_LEVEL=$(jq -r '.threat_assessment.overall_risk_level' "/tmp/ai_analysis_${REPORT_DATE}.json")
        RISK_SCORE=$(jq -r '.threat_assessment.risk_score' "/tmp/ai_analysis_${REPORT_DATE}.json")
        GRADE=$(jq -r '.security_posture_assessment.overall_grade' "/tmp/ai_analysis_${REPORT_DATE}.json")

        case $RISK_LEVEL in
            critical) COLOR=$RED ;;
            high) COLOR=$YELLOW ;;
            medium) COLOR=$YELLOW ;;
            low) COLOR=$GREEN ;;
            *) COLOR=$NC ;;
        esac

        echo -e "  위험도: ${COLOR}${RISK_LEVEL^^}${NC} (${RISK_SCORE}/100)"
        echo -e "  보안 등급: ${GREEN}${GRADE}${NC}"
        echo ""

        echo -e "${YELLOW}💡 전체 분석 결과 확인:${NC}"
        echo -e "  cat /tmp/ai_analysis_${REPORT_DATE}.json | jq"
        echo ""

        echo -e "${YELLOW}🌐 웹 브라우저에서 보고서 열기:${NC}"
        echo -e "  ${CYAN}http://localhost:3000/reports/daily/daily_report_${REPORT_DATE}.html${NC}"
        echo ""
    fi
else
    echo ""
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${RED}❌ 보고서 생성 실패${NC}"
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "${YELLOW}다음을 확인하세요:${NC}"
    echo -e "  1. OpenSearch 연결 (opensearch:9200)"
    echo -e "  2. PostgreSQL 연결 (postgres:5432)"
    echo -e "  3. 해당 날짜에 인시던트 데이터가 있는지"
    echo ""
    exit 1
fi
