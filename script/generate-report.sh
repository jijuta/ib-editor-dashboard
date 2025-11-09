#!/bin/bash
##############################################
# 보안 인시던트 AI 분석 보고서 생성 스크립트
# 인시던트 조사 → AI 분석 → 한글 HTML 보고서 생성
##############################################

set -e  # 오류 발생 시 즉시 종료

# 색상 정의
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 사용법 출력
usage() {
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  보안 인시던트 AI 분석 보고서 생성"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "사용법:"
    echo "  ./script/generate-report.sh <incident_id> [domain]"
    echo ""
    echo "예시:"
    echo "  ./script/generate-report.sh 414186"
    echo "  ./script/generate-report.sh 414186 defenderxs.in-bridge.com"
    echo ""
    echo "옵션:"
    echo "  incident_id  : 분석할 인시던트 ID (필수)"
    echo "  domain       : 보고서 접속 도메인 (선택, 기본: localhost:40017)"
    echo ""
    exit 1
}

# 인자 확인
if [ -z "$1" ]; then
    usage
fi

INCIDENT_ID=$1
DOMAIN=${2:-"localhost:40017"}

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  🔍 인시던트 ${INCIDENT_ID} AI 분석 보고서 생성${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# 1단계: 데이터 수집
echo -e "${GREEN}1️⃣  데이터 수집 중...${NC}"
echo ""
npx tsx script/investigate-incident-cli.ts --incident-id "$INCIDENT_ID"

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ 데이터 수집 실패${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}✅ 데이터 수집 완료${NC}"
echo ""

# 2단계: AI 분석 프롬프트 생성
echo -e "${GREEN}2️⃣  AI 분석 프롬프트 생성 중...${NC}"
echo ""
npx tsx script/create-analysis-prompt.ts "$INCIDENT_ID" > /tmp/incident_${INCIDENT_ID}_prompt_output.txt

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ 프롬프트 생성 실패${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}✅ 프롬프트 생성 완료: /tmp/incident_${INCIDENT_ID}_prompt.txt${NC}"
echo ""

# 3단계: AI 분석 (Claude Code로 수동 분석 필요)
echo -e "${YELLOW}3️⃣  AI 분석 생성 필요${NC}"
echo ""
echo -e "${YELLOW}다음 명령어를 실행하여 AI 분석을 생성하세요:${NC}"
echo ""
echo -e "${BLUE}claude --print \"$(cat /tmp/incident_${INCIDENT_ID}_prompt.txt | head -1)\"${NC}"
echo ""
echo -e "${YELLOW}또는 Claude Code에서 직접 분석을 작성한 후:${NC}"
echo ""
echo -e "cat > /tmp/analysis_${INCIDENT_ID}.json << 'EOF'"
echo "{"
echo "  \"incident_detail\": \"인시던트 상세 분석 (200-300자)\","
echo "  \"file_artifacts\": \"파일 아티팩트 분석 (200-300자)\","
echo "  \"network_artifacts\": \"네트워크 분석 (200-300자)\","
echo "  \"mitre_analysis\": \"MITRE 분석 (200-300자)\","
echo "  \"endpoint_analysis\": \"엔드포인트 분석 (200-300자)\","
echo "  \"final_verdict\": {"
echo "    \"verdict\": \"false_positive or true_positive or needs_investigation\","
echo "    \"risk_score\": 15,"
echo "    \"confidence\": 95,"
echo "    \"summary\": \"최종 의견 (300-500자)\","
echo "    \"key_findings\": ["
echo "      \"주요 발견 사항 1\","
echo "      \"주요 발견 사항 2\","
echo "      \"주요 발견 사항 3\""
echo "    ]"
echo "  }"
echo "}"
echo "EOF"
echo ""
echo -e "${GREEN}그런 다음 이 스크립트를 --continue 옵션으로 다시 실행:${NC}"
echo -e "${BLUE}./script/generate-report.sh $INCIDENT_ID $DOMAIN --continue${NC}"
echo ""

# --continue 옵션 확인
if [ "$3" = "--continue" ]; then
    echo ""
    echo -e "${GREEN}4️⃣  AI 분석 저장 및 보고서 생성 중...${NC}"
    echo ""

    if [ ! -f "/tmp/analysis_${INCIDENT_ID}.json" ]; then
        echo -e "${RED}❌ AI 분석 파일을 찾을 수 없습니다: /tmp/analysis_${INCIDENT_ID}.json${NC}"
        exit 1
    fi

    npx tsx script/save-analysis-and-report.ts "$INCIDENT_ID" "/tmp/analysis_${INCIDENT_ID}.json"

    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ 보고서 생성 실패${NC}"
        exit 1
    fi

    echo ""
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}✅ 완료! 보고서가 생성되었습니다.${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""

    # 최신 보고서 찾기
    LATEST_REPORT=$(ls -t public/reports/incident_${INCIDENT_ID}_korean_*.html 2>/dev/null | head -1)

    if [ -n "$LATEST_REPORT" ]; then
        FILENAME=$(basename "$LATEST_REPORT")

        if [ "$DOMAIN" = "localhost:40017" ]; then
            echo -e "${BLUE}🌐 로컬 접속: http://localhost:40017/reports/$FILENAME${NC}"
        else
            echo -e "${BLUE}🌐 외부 접속: https://$DOMAIN/reports/$FILENAME${NC}"
        fi
        echo ""
    else
        echo -e "${RED}❌ 보고서 파일을 찾을 수 없습니다.${NC}"
        exit 1
    fi
fi

echo ""
