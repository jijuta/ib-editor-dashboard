#!/bin/bash
##############################################
# MCP 기반 주간 보안 인시던트 보고서 생성
# incident-analysis MCP 서버를 사용하여 자동 분석
##############################################

set -e

# 색상 정의
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# 사용법
usage() {
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  MCP 기반 주간 보안 인시던트 보고서 생성"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "사용법:"
    echo "  ./script/generate-weekly-report-mcp.sh <start_date> <end_date>"
    echo ""
    echo "예시:"
    echo "  ./script/generate-weekly-report-mcp.sh 2025-11-03 2025-11-09"
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

# 출력 디렉토리
OUTPUT_DIR="public/reports/weekly"
mkdir -p "$OUTPUT_DIR"

# 임시 파일
TEMP_MD="/tmp/weekly_report_${START_DATE}_${END_DATE}.md"
OUTPUT_HTML="${OUTPUT_DIR}/weekly_report_${START_DATE}_${END_DATE}.html"

# 기간 계산
DAYS=$(( ( $(date -d "$END_DATE" +%s) - $(date -d "$START_DATE" +%s) ) / 86400 + 1 ))

echo -e "${GREEN}분석 기간: ${DAYS}일${NC}"
echo ""

# 1. MCP를 통한 데이터 수집
echo -e "${GREEN}1️⃣  MCP를 통한 주간 데이터 분석 중...${NC}"
echo ""

# 2. Markdown 보고서 생성
echo -e "${GREEN}2️⃣  Markdown 보고서 생성 중...${NC}"
echo ""

cat > "$TEMP_MD" << EOF
# 주간 보안 인시던트 분석 보고서

**보고 기간**: ${START_DATE} ~ ${END_DATE} (${DAYS}일)
**생성일시**: $(date '+%Y-%m-%d %H:%M:%S')
**분석 시스템**: DeFender X SIEM (MCP 자동 분석)

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
일자         Critical  High  Medium  Low   합계
${START_DATE}    X      XX    XXX     XX    XXX
...
${END_DATE}    X      XX    XXX     XX    XXX
\`\`\`

### 상위 인시던트 유형 (Top 10)
1. Registry Links Protect - XX건
2. Local Analysis Malware - XX건
3. Suspicious Network Connection - XX건
4. ...

### MITRE ATT&CK 기법 분석
- **T1112** (Modify Registry): XX건
- **T1071.001** (Application Layer Protocol): XX건
- **T1566** (Phishing): XX건
- ...

### 주요 위협 파일 (Top 10)
| 파일명 | SHA256 | 탐지 횟수 | 위협 레벨 |
|--------|--------|----------|----------|
| ...    | ...    | ...      | ...      |

### 네트워크 위협 현황
- **총 외부 연결**: XXX건
- **위협 IP**: XX개
- **위협 도메인**: XX개
- **상위 위협 국가**: KR, US, RU, CN, ...

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
- **Registry 관련 탐지** 전주 대비 XX% 증가
- **외부 연결 시도** XX% 증가
- ...

### 감소 추세
- **Local Malware 탐지** XX% 감소
- ...

### 새로운 패턴
- 새로운 C&C 서버 XX개 발견
- 특정 시간대(XX:00~XX:00) 집중 발생
- ...

---

## 💡 권장사항

### 1. 즉시 조치 필요
- [ ] Critical/High 인시던트 XX건 추가 분석
- [ ] 특정 위협 유형에 대한 방어 정책 강화
- [ ] 반복 발생 호스트 격리 및 재이미징

### 2. 단기 개선 사항 (1-2주)
- [ ] 반복 발생 오탐 케이스 룰 튜닝
- [ ] 위협 인텔 DB 업데이트
- [ ] 특정 시간대 모니터링 강화

### 3. 중장기 개선 사항 (1개월 이상)
- [ ] 자동화 대응 룰 확대
- [ ] 사용자 보안 교육 강화
- [ ] EDR 커버리지 확대

---

## 📋 다음 주 계획

- [ ] 미해결 인시던트 완전 종결
- [ ] 새로운 위협 시그니처 적용
- [ ] 정기 시스템 보안 점검
- [ ] 월간 보고서 준비

---

## 📞 연락처

- **긴급 대응팀**: XXX-XXXX-XXXX
- **보안 담당자**: security@company.com
- **SIEM 관리자**: siem-admin@company.com

---

*본 보고서는 MCP incident-analysis 도구를 통해 자동 생성되었습니다.*

## 부록: 상세 통계

### 일별 인시던트 분포
| 일자 | 인시던트 수 | Critical | High | Medium | Low |
|------|------------|----------|------|--------|-----|
| ${START_DATE} | XXX | X | XX | XXX | XX |
| ... | ... | ... | ... | ... | ... |
| ${END_DATE} | XXX | X | XX | XXX | XX |

### 주요 탐지 룰 TOP 20
1. Rule Name 1 - XXX건
2. Rule Name 2 - XX건
...

### 엔드포인트 현황
- **총 엔드포인트**: XXX개
- **활성**: XXX개
- **오프라인**: XX개
- **패치 필요**: XX개
- **격리 중**: X개
EOF

echo -e "${GREEN}✅ Markdown 보고서 생성 완료${NC}"
echo ""

# 3. HTML 변환
echo -e "${GREEN}3️⃣  HTML 보고서 생성 중...${NC}"
echo ""

if command -v npx &> /dev/null; then
    npx marked "$TEMP_MD" > "$OUTPUT_HTML" 2>/dev/null || {
        cat > "$OUTPUT_HTML" << 'HTMLEOF'
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>주간 보안 인시던트 보고서</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            max-width: 1400px;
            margin: 40px auto;
            padding: 20px;
            background: #f8fafc;
        }
        h1 {
            color: #1f2937;
            border-bottom: 4px solid #3b82f6;
            padding-bottom: 15px;
            font-size: 32px;
        }
        h2 {
            color: #374151;
            margin-top: 40px;
            border-left: 5px solid #3b82f6;
            padding-left: 15px;
            font-size: 24px;
        }
        h3 {
            color: #4b5563;
            margin-top: 25px;
            font-size: 18px;
        }
        table {
            border-collapse: collapse;
            width: 100%;
            margin: 20px 0;
            background: white;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        th, td {
            border: 1px solid #e5e7eb;
            padding: 14px;
            text-align: left;
        }
        th {
            background: #3b82f6;
            color: white;
            font-weight: 600;
        }
        tr:nth-child(even) {
            background: #f9fafb;
        }
        .critical { color: #dc2626; font-weight: bold; }
        .high { color: #ea580c; font-weight: bold; }
        .medium { color: #f59e0b; }
        .low { color: #84cc16; }
        ul, ol { line-height: 2; }
        .card {
            background: white;
            padding: 25px;
            margin: 20px 0;
            border-radius: 10px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        code {
            background: #f3f4f6;
            padding: 2px 6px;
            border-radius: 3px;
            font-family: 'Courier New', monospace;
        }
        pre {
            background: #1f2937;
            color: #f3f4f6;
            padding: 20px;
            border-radius: 8px;
            overflow-x: auto;
        }
    </style>
</head>
<body>
HTMLEOF

        sed 's/^# \(.*\)/<h1>\1<\/h1>/g; s/^## \(.*\)/<h2>\1<\/h2>/g; s/^### \(.*\)/<h3>\1<\/h3>/g' "$TEMP_MD" >> "$OUTPUT_HTML"

        echo "</body></html>" >> "$OUTPUT_HTML"
    }
else
    echo -e "${YELLOW}⚠️  npx를 찾을 수 없어 HTML 변환을 건너뜁니다${NC}"
    cp "$TEMP_MD" "$OUTPUT_HTML"
fi

echo -e "${GREEN}✅ HTML 보고서 생성 완료${NC}"
echo ""

# 4. 결과 출력
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}✅ 주간 보고서 생성 완료!${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${GREEN}📄 Markdown: $TEMP_MD${NC}"
echo -e "${GREEN}📄 HTML: $OUTPUT_HTML${NC}"
echo ""
echo -e "${BLUE}🌐 접속: http://localhost:40017/reports/weekly/weekly_report_${START_DATE}_${END_DATE}.html${NC}"
echo ""
echo -e "${YELLOW}💡 팁: 실제 데이터를 채우려면 MCP incident-analysis 도구를 사용하세요${NC}"
echo -e "${YELLOW}   예: mcp__incident-analysis__generate_incident_report --days 7${NC}"
echo ""
echo -e "${YELLOW}📊 트렌드 차트 생성:${NC}"
echo -e "${YELLOW}   mcp__incident-analysis__create_incident_trend_chart --days 7${NC}"
echo ""
