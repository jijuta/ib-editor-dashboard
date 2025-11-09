#!/bin/bash
##############################################
# 완전한 일간 보안 보고서 생성 파이프라인
# - 데이터 수집 → AI 분석 → 보고서 생성
##############################################

set -e

# 색상 정의
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# 사용법
usage() {
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  완전한 일간 보안 보고서 생성"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "사용법:"
    echo "  ./script/generate-complete-daily-report.sh [date]"
    echo ""
    echo "예시:"
    echo "  ./script/generate-complete-daily-report.sh 2025-11-08"
    echo "  ./script/generate-complete-daily-report.sh              # 어제 날짜"
    echo ""
    echo "옵션:"
    echo "  date  : 보고서 날짜 (YYYY-MM-DD, 선택)"
    echo ""
    exit 1
}

# 날짜 설정
if [ -z "$1" ]; then
    REPORT_DATE=$(date -d "yesterday" '+%Y-%m-%d' 2>/dev/null || date -v-1d '+%Y-%m-%d' 2>/dev/null || date '+%Y-%m-%d')
else
    REPORT_DATE=$1
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  📊 완전한 일간 보안 보고서 생성${NC}"
echo -e "${BLUE}  날짜: ${REPORT_DATE}${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# 1단계: 데이터 수집
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}1단계: 데이터 수집${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

npx tsx script/collect-daily-incidents-data.ts "$REPORT_DATE"

if [ $? -ne 0 ]; then
    echo ""
    echo -e "${YELLOW}❌ 데이터 수집 실패${NC}"
    exit 1
fi

# 2단계: AI 분석 프롬프트 생성
echo ""
echo -e "${PURPLE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${PURPLE}2단계: AI 분석 프롬프트 생성${NC}"
echo -e "${PURPLE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

npx tsx script/create-ai-analysis-prompt.ts "$REPORT_DATE"

if [ $? -ne 0 ]; then
    echo ""
    echo -e "${YELLOW}❌ 프롬프트 생성 실패${NC}"
    exit 1
fi

# 3단계: AI 분석 실행
echo ""
echo -e "${PURPLE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${PURPLE}3단계: Claude AI 분석 실행${NC}"
echo -e "${PURPLE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo -e "${YELLOW}💡 이 단계에서는 Claude Code에 직접 분석을 요청합니다${NC}"
echo ""

# claude 명령어 확인
if command -v claude &> /dev/null; then
    echo -e "${GREEN}✅ claude 명령어 발견 - 자동 실행${NC}"
    echo ""
    npx tsx script/run-ai-analysis.ts "$REPORT_DATE"
else
    echo -e "${YELLOW}⚠️  claude 명령어 없음 - 수동 실행 필요${NC}"
    echo ""
    echo -e "${CYAN}📋 다음 중 하나를 선택하세요:${NC}"
    echo ""
    echo -e "${GREEN}방법 1: 프롬프트를 Claude Code에 직접 붙여넣기${NC}"
    echo -e "  1. /tmp/ai_analysis_prompt_${REPORT_DATE}.txt 파일 열기"
    echo -e "  2. 내용을 Claude Code에 붙여넣기"
    echo -e "  3. JSON 응답을 /tmp/ai_analysis_${REPORT_DATE}.json 에 저장"
    echo ""
    echo -e "${GREEN}방법 2: claude 명령어 설치 후 재실행${NC}"
    echo -e "  npm install -g @anthropic-ai/claude-cli"
    echo ""

    # 프롬프트 파일 경로 출력
    PROMPT_FILE="/tmp/ai_analysis_prompt_${REPORT_DATE}.txt"

    echo ""
    echo -e "${YELLOW}━━━━━━━━ 프롬프트 미리보기 (처음 30줄) ━━━━━━━━${NC}"
    head -30 "$PROMPT_FILE"
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""

    # 사용자 입력 대기
    echo -e "${CYAN}AI 분석이 완료되면 Enter를 누르세요...${NC}"
    read -r

    # AI 분석 파일 확인
    if [ ! -f "/tmp/ai_analysis_${REPORT_DATE}.json" ]; then
        echo ""
        echo -e "${YELLOW}❌ AI 분석 파일을 찾을 수 없습니다${NC}"
        echo -e "${YELLOW}   /tmp/ai_analysis_${REPORT_DATE}.json 에 저장했는지 확인하세요${NC}"
        echo ""
        exit 1
    fi
fi

# 4단계: 최종 보고서 생성
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}4단계: 최종 보고서 생성${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

npx tsx script/generate-final-report.ts "$REPORT_DATE"

if [ $? -ne 0 ]; then
    echo ""
    echo -e "${YELLOW}❌ 최종 보고서 생성 실패${NC}"
    exit 1
fi

# 간단한 요약 출력
if [ -f "/tmp/ai_analysis_${REPORT_DATE}.json" ]; then
    echo -e "${CYAN}━━━━━━━━━━ AI 분석 요약 ━━━━━━━━━━${NC}"
    echo ""

    # JSON에서 주요 정보 추출 (jq 사용)
    if command -v jq &> /dev/null; then
        echo -e "${GREEN}종합 요약:${NC}"
        jq -r '.executive_summary // "N/A"' "/tmp/ai_analysis_${REPORT_DATE}.json"
        echo ""

        echo -e "${GREEN}위험도:${NC}"
        echo -e "  - 레벨: $(jq -r '.threat_assessment.overall_risk_level // "N/A"' "/tmp/ai_analysis_${REPORT_DATE}.json")"
        echo -e "  - 점수: $(jq -r '.threat_assessment.risk_score // "N/A"' "/tmp/ai_analysis_${REPORT_DATE}.json")/100"
        echo -e "  - 신뢰도: $(jq -r '.threat_assessment.confidence // "N/A"' "/tmp/ai_analysis_${REPORT_DATE}.json")%"
        echo ""

        echo -e "${GREEN}주요 발견사항:${NC}"
        jq -r '.threat_assessment.key_findings[]? // empty' "/tmp/ai_analysis_${REPORT_DATE}.json" | while read -r finding; do
            echo -e "  • $finding"
        done
        echo ""
    else
        echo -e "${YELLOW}⚠️  jq 명령어 없음 - JSON 파일을 직접 확인하세요${NC}"
        echo -e "  cat /tmp/ai_analysis_${REPORT_DATE}.json | python3 -m json.tool"
    fi

    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}✅ 전체 파이프라인 완료!${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${GREEN}📁 최종 생성 파일:${NC}"
echo -e "  ${GREEN}✓${NC} public/reports/daily/daily_report_${REPORT_DATE}.html"
echo -e "  ${GREEN}✓${NC} public/reports/daily/daily_report_${REPORT_DATE}.md"
echo -e "  ${GREEN}✓${NC} public/reports/daily/daily_report_${REPORT_DATE}.json"
echo ""
echo -e "${YELLOW}💡 로컬 파일 열기:${NC}"
echo -e "  ${CYAN}xdg-open public/reports/daily/daily_report_${REPORT_DATE}.html${NC}"
echo ""
echo -e "${YELLOW}🌐 웹 브라우저 접근:${NC}"
echo -e "  ${CYAN}http://localhost:3000/reports/daily/daily_report_${REPORT_DATE}.html${NC}"
echo ""
