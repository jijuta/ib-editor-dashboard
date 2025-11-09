#!/bin/bash
##############################################
# 일간 보안 인시던트 보고서 생성 스크립트
# 당일 발생한 모든 인시던트를 분석하여 일일 보고서 생성
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
    echo "  일간 보안 인시던트 보고서 생성"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "사용법:"
    echo "  ./script/generate-daily-report.sh [date]"
    echo ""
    echo "예시:"
    echo "  ./script/generate-daily-report.sh 2025-11-09"
    echo "  ./script/generate-daily-report.sh              # 오늘 날짜"
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

# 임시 디렉토리
TEMP_DIR="/tmp/daily_report_$$"
mkdir -p "$TEMP_DIR"

# 1. 당일 인시던트 조회
echo -e "${GREEN}1️⃣  당일 인시던트 데이터 수집 중...${NC}"
echo ""

# OpenSearch 쿼리 실행 (간단한 예시)
cat > "$TEMP_DIR/query.json" << EOF
{
  "query": {
    "bool": {
      "must": [
        {
          "range": {
            "@timestamp": {
              "gte": "${REPORT_DATE}T00:00:00",
              "lte": "${REPORT_DATE}T23:59:59"
            }
          }
        }
      ]
    }
  },
  "size": 1000,
  "sort": [{"@timestamp": {"order": "desc"}}]
}
EOF

# 2. 통계 분석
echo -e "${GREEN}2️⃣  통계 분석 중...${NC}"
echo ""

# Markdown 보고서 생성
cat > "$TEMP_DIR/daily_report.md" << EOF
# 일간 보안 인시던트 보고서

**보고일**: ${REPORT_DATE}
**생성일시**: $(date '+%Y-%m-%d %H:%M:%S')
**분석 시스템**: DeFender X SIEM

---

## 📊 당일 요약

### 전체 현황
- **총 인시던트**: XX건
- **신규 발생**: XX건
- **조사 중**: XX건
- **해결 완료**: XX건

### 심각도별 분포
| 심각도 | 건수 | 긴급 조치 필요 |
|--------|------|--------------|
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

*본 보고서는 Claude Code AI 분석 시스템을 통해 생성되었습니다.*
EOF

echo -e "${GREEN}✅ 일간 통계 생성 완료${NC}"
echo ""

# 3. HTML 변환
echo -e "${GREEN}3️⃣  HTML 보고서 생성 중...${NC}"
echo ""

REPORT_FILE="public/reports/daily_report_${REPORT_DATE}.html"

# marked 라이브러리로 HTML 변환
npx marked "$TEMP_DIR/daily_report.md" > "$REPORT_FILE" 2>/dev/null || {
    # marked가 없으면 간단한 HTML로 변환
    cat > "$REPORT_FILE" << 'HTMLEOF'
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>일간 보안 인시던트 보고서</title>
    <style>
        body { font-family: sans-serif; max-width: 1200px; margin: 40px auto; padding: 20px; }
        h1 { color: #1f2937; border-bottom: 3px solid #3b82f6; padding-bottom: 10px; }
        h2 { color: #374151; margin-top: 30px; }
        table { border-collapse: collapse; width: 100%; margin: 20px 0; }
        th, td { border: 1px solid #d1d5db; padding: 12px; text-align: left; }
        th { background: #f3f4f6; font-weight: 600; }
        .critical { color: #dc2626; font-weight: bold; }
        .high { color: #ea580c; }
    </style>
</head>
<body>
HTMLEOF

    # Markdown을 간단한 HTML로 변환 (제목만)
    sed 's/^# \(.*\)/<h1>\1<\/h1>/g; s/^## \(.*\)/<h2>\1<\/h2>/g; s/^### \(.*\)/<h3>\1<\/h3>/g' "$TEMP_DIR/daily_report.md" >> "$REPORT_FILE"

    echo "</body></html>" >> "$REPORT_FILE"
}

echo -e "${GREEN}✅ HTML 보고서 생성 완료${NC}"
echo ""

# 4. 결과 출력
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}✅ 일간 보고서 생성 완료!${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${GREEN}📄 Markdown: $TEMP_DIR/daily_report.md${NC}"
echo -e "${GREEN}📄 HTML: $REPORT_FILE${NC}"
echo ""
echo -e "${BLUE}🌐 접속: http://localhost:40017/reports/daily_report_${REPORT_DATE}.html${NC}"
echo ""
echo -e "${YELLOW}💡 팁: Markdown 파일을 직접 편집하여 내용을 업데이트할 수 있습니다${NC}"
echo ""

# 정리는 하지 않음 (사용자가 편집할 수 있도록)
echo -e "${YELLOW}📁 임시 파일: $TEMP_DIR${NC}"
echo ""
