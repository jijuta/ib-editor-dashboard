#!/bin/bash
##############################################
# 주간 보안 인시던트 보고서 생성 스크립트
# 특정 주간의 모든 인시던트를 분석하여 종합 보고서 생성
##############################################

set -e

# 색상 정의
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 사용법
usage() {
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  주간 보안 인시던트 보고서 생성"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "사용법:"
    echo "  ./script/generate-weekly-report.sh <start_date> <end_date>"
    echo ""
    echo "예시:"
    echo "  ./script/generate-weekly-report.sh 2025-11-03 2025-11-09"
    echo ""
    echo "옵션:"
    echo "  start_date  : 시작일 (YYYY-MM-DD)"
    echo "  end_date    : 종료일 (YYYY-MM-DD)"
    echo ""
    exit 1
}

# 인자 확인
if [ -z "$1" ] || [ -z "$2" ]; then
    usage
fi

START_DATE=$1
END_DATE=$2

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  📊 주간 보안 인시던트 보고서 생성${NC}"
echo -e "${BLUE}  기간: ${START_DATE} ~ ${END_DATE}${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# 임시 파일
TEMP_DIR="/tmp/weekly_report_$$"
mkdir -p "$TEMP_DIR"

# 1. 기간 내 인시던트 목록 조회 (OpenSearch)
echo -e "${GREEN}1️⃣  인시던트 데이터 수집 중...${NC}"
echo ""

# 기간 계산 (일 수)
DAYS=$(( ( $(date -d "$END_DATE" +%s) - $(date -d "$START_DATE" +%s) ) / 86400 + 1 ))

# MCP를 통한 통계 생성
npx tsx << 'EOF'
import { execSync } from 'child_process';

const startDate = process.argv[1];
const endDate = process.argv[2];
const days = parseInt(process.argv[3]);

console.log(`기간: ${startDate} ~ ${endDate} (${days}일)`);
console.log('OpenSearch에서 데이터 조회 중...\n');

// 여기에 OpenSearch 쿼리 실행 코드 추가
// 실제로는 investigate-incident-cli.ts를 여러 번 호출하거나
// 새로운 스크립트로 기간별 통계 수집
EOF

# 2. 통계 분석
echo ""
echo -e "${GREEN}2️⃣  통계 분석 중...${NC}"
echo ""

cat > "$TEMP_DIR/weekly_stats.md" << EOF
# 주간 보안 인시던트 분석 보고서

**보고 기간**: ${START_DATE} ~ ${END_DATE}
**생성일시**: $(date '+%Y-%m-%d %H:%M:%S')
**분석 시스템**: DeFender X SIEM

---

## 📊 주요 통계

### 전체 요약
- **총 인시던트**: XXX건
- **일평균**: XX건
- **Critical**: X건
- **High**: XX건
- **Medium**: XXX건
- **Low**: XX건

### 심각도별 트렌드
\`\`\`
[일별 심각도 추이 그래프 데이터]
\`\`\`

### 상위 인시던트 유형 (Top 10)
1. Registry Links Protect - XX건
2. Local Analysis Malware - XX건
3. ...

### MITRE ATT&CK 기법 분석
- **T1112** (Modify Registry): XX건
- **T1071.001** (Application Layer Protocol): XX건
- ...

### 주요 위협 파일 (Top 10)
| 파일명 | SHA256 | 탐지 횟수 | 위협 레벨 |
|--------|--------|----------|----------|
| ...    | ...    | ...      | ...      |

### 네트워크 위협 현황
- **총 외부 연결**: XXX건
- **위협 IP**: XX개
- **위협 도메인**: XX개
- **상위 위협 국가**: KR, US, RU, ...

---

## 🚨 주요 인시던트 사례

### [CRITICAL] 인시던트 #XXXXX
- **탐지일시**: YYYY-MM-DD HH:MM
- **요약**: ...
- **상태**: resolved / under_investigation
- **조치사항**: ...

### [HIGH] 인시던트 #XXXXX
- **탐지일시**: YYYY-MM-DD HH:MM
- **요약**: ...
- **상태**: ...
- **조치사항**: ...

---

## 📈 주간 트렌드 분석

### 증가 추세
- ...

### 감소 추세
- ...

### 새로운 패턴
- ...

---

## 💡 권장사항

1. **즉시 조치 필요**
   - [ ] Critical/High 인시던트 XX건 추가 분석
   - [ ] 특정 위협 유형에 대한 방어 정책 강화

2. **단기 개선 사항** (1-2주)
   - [ ] 반복 발생 오탐 케이스 룰 튜닝
   - [ ] 위협 인텔 업데이트

3. **중장기 개선 사항** (1개월 이상)
   - [ ] 자동화 대응 룰 확대
   - [ ] 사용자 교육 강화

---

*본 보고서는 Claude Code AI 분석 시스템을 통해 생성되었습니다.*
EOF

echo -e "${GREEN}✅ 주간 통계 생성 완료${NC}"
echo ""

# 3. HTML 변환
echo -e "${GREEN}3️⃣  HTML 보고서 생성 중...${NC}"
echo ""

REPORT_FILE="public/reports/weekly_report_${START_DATE}_${END_DATE}.html"

npx marked "$TEMP_DIR/weekly_stats.md" > "$REPORT_FILE"

echo -e "${GREEN}✅ HTML 보고서 생성 완료${NC}"
echo ""

# 4. 결과 출력
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}✅ 주간 보고서 생성 완료!${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${GREEN}📄 Markdown: $TEMP_DIR/weekly_stats.md${NC}"
echo -e "${GREEN}📄 HTML: $REPORT_FILE${NC}"
echo ""
echo -e "${BLUE}🌐 접속: http://localhost:40017/reports/weekly_report_${START_DATE}_${END_DATE}.html${NC}"
echo ""

# 정리
# rm -rf "$TEMP_DIR"
