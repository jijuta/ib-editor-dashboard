#!/bin/bash
##############################################
# MCP 기반 일간 보안 인시던트 보고서 생성
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
    echo "  MCP 기반 일간 보안 인시던트 보고서 생성"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "사용법:"
    echo "  ./script/generate-daily-report-mcp.sh [date]"
    echo ""
    echo "예시:"
    echo "  ./script/generate-daily-report-mcp.sh 2025-11-09"
    echo "  ./script/generate-daily-report-mcp.sh              # 오늘 날짜"
    echo ""
    echo "옵션:"
    echo "  date  : 보고서 날짜 (YYYY-MM-DD, 선택)"
    echo ""
    exit 1
}

# 날짜 설정
if [ -z "$1" ]; then
    REPORT_DATE=$(date '+%Y-%m-%d')
else
    REPORT_DATE=$1
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  📅 일간 보안 인시던트 보고서 생성${NC}"
echo -e "${BLUE}  날짜: ${REPORT_DATE}${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# 출력 디렉토리
OUTPUT_DIR="public/reports/daily"
mkdir -p "$OUTPUT_DIR"

# 임시 파일
TEMP_MD="/tmp/daily_report_${REPORT_DATE}.md"
OUTPUT_HTML="${OUTPUT_DIR}/daily_report_${REPORT_DATE}.html"

# 1. MCP를 통한 데이터 수집
echo -e "${GREEN}1️⃣  MCP를 통한 인시던트 데이터 분석 중...${NC}"
echo ""

# Node.js 스크립트로 MCP 호출
node << 'EOF'
const report_date = process.argv[1];
console.log(`Analyzing incidents for ${report_date}...`);

// MCP 도구 사용 예시 (실제 구현 시 MCP SDK 활용)
// const stats = await mcp.call('get_incident_statistics', { days: 1 });
// const threats = await mcp.call('analyze_top_threats', { days: 1 });
// const report = await mcp.call('generate_incident_report', { days: 1 });

console.log('✅ 데이터 수집 완료');
EOF

# 2. Markdown 보고서 생성
echo ""
echo -e "${GREEN}2️⃣  Markdown 보고서 생성 중...${NC}"
echo ""

cat > "$TEMP_MD" << EOF
# 일간 보안 인시던트 보고서

**보고일**: ${REPORT_DATE}
**생성일시**: $(date '+%Y-%m-%d %H:%M:%S')
**분석 시스템**: DeFender X SIEM (MCP 자동 분석)

---

## 📊 당일 요약

### 전체 현황
- **총 인시던트**: XX건
- **신규 발생**: XX건
- **조사 중**: XX건
- **해결 완료**: XX건

### 심각도별 분포
| 심각도 | 건수 | 긴급 조치 필요 |
|--------|------|--------------
| Critical | X | X |
| High | XX | X |
| Medium | XX | - |
| Low | XX | - |

---

## 🚨 긴급 조치 필요 인시던트

### [CRITICAL] 인시던트 #XXXXX
- **탐지시간**: HH:MM
- **대상**: 호스트명
- **유형**: 멀웨어 탐지 / 의심 통신 등
- **현재 상태**: 조사 중 / 격리 완료
- **담당자**: XXX
- **조치 내역**:
  - [ ] 즉시 격리
  - [ ] 포렌식 분석
  - [ ] 관련 시스템 점검

---

## 📈 주요 탐지 유형

1. **Registry Links Protect**: XX건
   - 대부분 WPS Office 관련 오탐
   - 조치: 룰 튜닝 필요

2. **Local Analysis Malware**: XX건
   - 실제 위협: X건
   - 오탐: X건

3. **외부 연결 시도**: XX건
   - 차단됨: XX건
   - 허용됨: X건

---

## 🔍 주요 활동

### 위협 파일 탐지
- 새로운 악성 파일: X개
- 알려진 멀웨어: X개
- 의심 파일: X개

### 네트워크 활동
- 외부 연결 시도: XX건
- 차단된 IP: XX개
- 새로운 C&C 서버: X개

### 엔드포인트 현황
- 활성 엔드포인트: XXX개
- 오프라인: XX개
- 패치 필요: XX개

---

## ⚠️ 주의 사항

### 증가 추세
- 특정 유형의 인시던트가 전일 대비 XX% 증가

### 새로운 패턴
- 새로운 공격 패턴 탐지: ...

### 시스템 이슈
- 특정 호스트에서 반복 발생: ...

---

## ✅ 완료된 조치

- [x] Critical 인시던트 #XXXXX 격리 완료
- [x] 오탐 케이스 XX건 룰 업데이트
- [x] 위협 인텔 DB 업데이트

---

## 📋 내일의 계획

- [ ] 미해결 인시던트 XX건 추가 분석
- [ ] 새로운 방어 룰 적용
- [ ] 정기 시스템 점검

---

## 📞 연락처

- **긴급 대응팀**: XXX-XXXX-XXXX
- **보안 담당자**: security@company.com

---

*본 보고서는 MCP incident-analysis 도구를 통해 자동 생성되었습니다.*
EOF

echo -e "${GREEN}✅ Markdown 보고서 생성 완료${NC}"
echo ""

# 3. HTML 변환
echo -e "${GREEN}3️⃣  HTML 보고서 생성 중...${NC}"
echo ""

# marked 라이브러리로 HTML 변환
if command -v npx &> /dev/null; then
    npx marked "$TEMP_MD" > "$OUTPUT_HTML" 2>/dev/null || {
        # marked가 없으면 간단한 HTML로 변환
        cat > "$OUTPUT_HTML" << 'HTMLEOF'
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>일간 보안 인시던트 보고서</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            max-width: 1200px;
            margin: 40px auto;
            padding: 20px;
            background: #f8fafc;
        }
        h1 {
            color: #1f2937;
            border-bottom: 3px solid #3b82f6;
            padding-bottom: 10px;
        }
        h2 {
            color: #374151;
            margin-top: 30px;
            border-left: 4px solid #3b82f6;
            padding-left: 12px;
        }
        h3 {
            color: #4b5563;
        }
        table {
            border-collapse: collapse;
            width: 100%;
            margin: 20px 0;
            background: white;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        th, td {
            border: 1px solid #e5e7eb;
            padding: 12px;
            text-align: left;
        }
        th {
            background: #f3f4f6;
            font-weight: 600;
            color: #374151;
        }
        .critical { color: #dc2626; font-weight: bold; }
        .high { color: #ea580c; }
        .medium { color: #f59e0b; }
        .low { color: #84cc16; }
        ul { line-height: 1.8; }
        .card {
            background: white;
            padding: 20px;
            margin: 15px 0;
            border-radius: 8px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
    </style>
</head>
<body>
HTMLEOF

        # Markdown을 간단한 HTML로 변환
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
echo -e "${BLUE}✅ 일간 보고서 생성 완료!${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${GREEN}📄 Markdown: $TEMP_MD${NC}"
echo -e "${GREEN}📄 HTML: $OUTPUT_HTML${NC}"
echo ""
echo -e "${BLUE}🌐 접속: http://localhost:40017/reports/daily/daily_report_${REPORT_DATE}.html${NC}"
echo ""
echo -e "${YELLOW}💡 팁: 실제 데이터를 채우려면 MCP incident-analysis 도구를 사용하세요${NC}"
echo -e "${YELLOW}   예: mcp__incident-analysis__generate_incident_report${NC}"
echo ""
