# Claude CLI를 사용한 완전 자동화 보고서 생성 가이드

> **최종 업데이트**: 2025-11-23
> **버전**: 1.0
> **목적**: `claude --print` 명령어를 사용한 사용자 개입 없는 완전 자동화

---

## 📋 목차

1. [개요](#개요)
2. [claude --print 자동화 방식](#claude---print-자동화-방식)
3. [단일 인시던트 자동 보고서](#단일-인시던트-자동-보고서)
4. [일간 보고서 완전 자동화](#일간-보고서-완전-자동화)
5. [주간/월간 보고서 자동화](#주간월간-보고서-자동화)
6. [Cron 자동화 설정](#cron-자동화-설정)
7. [트러블슈팅](#트러블슈팅)

---

## 개요

### 🎯 목표

**사용자 개입 없이** Claude AI를 사용하여 자동으로 보고서를 생성하는 완전 자동화 시스템을 구축합니다.

### 🔑 핵심 개념

#### Claude Code UI vs Claude CLI

| 방식 | 사용자 개입 | 자동화 | 용도 |
|------|-----------|--------|------|
| **Claude Code UI** | ✅ 필요 (대화형) | ❌ 불가능 | 대화형 심층 분석 |
| **claude --print** | ❌ 불필요 | ✅ 완전 자동화 | Cron, 스크립트 자동화 |

#### claude --print 작동 원리

```bash
# 프롬프트를 stdin으로 전달하면 결과를 stdout으로 반환
echo "Analyze this data" | claude --print

# 파일에서 프롬프트 읽기
cat prompt.txt | claude --print

# 결과를 파일로 저장
cat prompt.txt | claude --print > result.json
```

### 🚀 3가지 자동화 시나리오

1. **단일 인시던트 자동 분석**: 특정 인시던트 ID 입력 → AI 분석 → HTML 보고서
2. **일간 보고서 자동 생성**: 어제 전체 인시던트 → AI 종합 분석 → 일일 보고서
3. **주간/월간 보고서**: 7일/30일 데이터 → 트렌드 분석 → 경영진 보고서

---

## claude --print 자동화 방식

### 1단계: Claude CLI 설치

```bash
# NPM으로 설치
npm install -g @anthropic-ai/claude-cli

# 설치 확인
which claude
claude --version

# API 키 설정 (환경 변수)
export ANTHROPIC_API_KEY="sk-ant-your-api-key-here"

# 또는 ~/.bashrc에 추가
echo 'export ANTHROPIC_API_KEY="sk-ant-your-api-key-here"' >> ~/.bashrc
source ~/.bashrc
```

### 2단계: 기본 사용법

```bash
# 간단한 프롬프트
echo "What is the capital of France?" | claude --print

# 긴 프롬프트 (파일 사용)
cat > prompt.txt << 'EOF'
Analyze the following security incident data and provide:
1. Threat assessment
2. Risk score (0-100)
3. Recommendations

Data: {...}
EOF

cat prompt.txt | claude --print
```

### 3단계: JSON 응답 파싱

```bash
# Claude 응답에서 JSON 추출
cat prompt.txt | claude --print | \
  sed -n '/```json/,/```/p' | \
  sed '1d;$d' > result.json

# 또는 TypeScript로 파싱
npx tsx script/run-ai-analysis.ts <date>
```

---

## 단일 인시던트 자동 보고서

### 방법 1: 직접 claude --print 사용

```bash
#!/bin/bash
# auto-investigate-incident.sh

INCIDENT_ID=$1

# 1. 데이터 수집
echo "📊 데이터 수집 중..."
npx tsx script/report-data-collector.ts "$INCIDENT_ID" > /tmp/incident_${INCIDENT_ID}_data.json

# 2. AI 분석 프롬프트 생성
cat > /tmp/incident_${INCIDENT_ID}_prompt.txt << EOF
다음 보안 인시던트 데이터를 분석하여 JSON 형식으로 응답하세요:

\`\`\`json
{
  "incident_detail": "인시던트 상세 분석 (한글, 200-300자)",
  "file_artifacts": "파일 아티팩트 분석 (한글, 200-300자)",
  "network_artifacts": "네트워크 분석 (한글, 200-300자)",
  "mitre_analysis": "MITRE ATT&CK 분석 (한글, 200-300자)",
  "endpoint_analysis": "엔드포인트 분석 (한글, 200-300자)",
  "final_verdict": {
    "verdict": "false_positive | true_positive | needs_investigation",
    "risk_score": 0-100,
    "confidence": 0-100,
    "summary": "최종 의견 (한글, 300-500자)",
    "key_findings": ["발견 사항 1", "발견 사항 2", ...]
  }
}
\`\`\`

인시던트 데이터:
$(cat /tmp/incident_${INCIDENT_ID}_data.json)
EOF

# 3. Claude AI 분석 실행
echo "🤖 Claude AI 분석 중..."
cat /tmp/incident_${INCIDENT_ID}_prompt.txt | claude --print | \
  sed -n '/```json/,/```/p' | \
  sed '1d;$d' > /tmp/analysis_${INCIDENT_ID}.json

# 4. HTML 보고서 생성
echo "📄 보고서 생성 중..."
npx tsx script/save-analysis-and-report.ts "$INCIDENT_ID" "/tmp/analysis_${INCIDENT_ID}.json"

echo "✅ 완료!"
echo "📁 보고서: public/reports/incident_${INCIDENT_ID}_korean_*.html"
```

**실행**:
```bash
chmod +x auto-investigate-incident.sh
./auto-investigate-incident.sh 414186
```

### 방법 2: 기존 스크립트 사용 (권장)

시스템에 이미 구현된 자동화 스크립트를 사용합니다.

```bash
# 완전 자동화 (claude --print 사용)
npx tsx script/investigate-incident-cli.ts --incident-id 414186 --with-claude

# 또는 generate-report.sh 사용 (2단계)
./script/generate-report.sh 414186

# Step 1 완료 후 claude --print 실행
cat /tmp/incident_414186_prompt.txt | claude --print > /tmp/analysis_414186.json

# Step 2 완료
./script/generate-report.sh 414186 --continue
```

---

## 일간 보고서 완전 자동화

### 전체 파이프라인

```
1. 데이터 수집 (collect-daily-incidents-data.ts)
   ↓
2. AI 프롬프트 생성 (create-ai-analysis-prompt.ts)
   ↓
3. Claude AI 분석 (run-ai-analysis.ts - claude --print 사용)
   ↓
4. 최종 보고서 생성 (generate-final-report.ts)
```

### 완전 자동화 스크립트

```bash
#!/bin/bash
# auto-daily-report-full.sh

# 날짜 설정 (기본값: 어제)
REPORT_DATE=${1:-$(date -d "yesterday" +%Y-%m-%d)}

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  📊 일간 보안 보고서 자동 생성"
echo "  날짜: $REPORT_DATE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 1단계: 데이터 수집
echo "1️⃣  데이터 수집 중..."
npx tsx script/collect-daily-incidents-data.ts "$REPORT_DATE"

if [ $? -ne 0 ]; then
    echo "❌ 데이터 수집 실패"
    exit 1
fi

echo "✅ 데이터 수집 완료"
echo ""

# 2단계: AI 프롬프트 생성
echo "2️⃣  AI 분석 프롬프트 생성 중..."
npx tsx script/create-ai-analysis-prompt.ts "$REPORT_DATE"

if [ $? -ne 0 ]; then
    echo "❌ 프롬프트 생성 실패"
    exit 1
fi

echo "✅ 프롬프트 생성 완료"
echo ""

# 3단계: Claude AI 분석 (완전 자동화)
echo "3️⃣  Claude AI 분석 실행 중..."
npx tsx script/run-ai-analysis.ts "$REPORT_DATE"

if [ $? -ne 0 ]; then
    echo "❌ AI 분석 실패"
    exit 1
fi

echo "✅ AI 분석 완료"
echo ""

# 4단계: 최종 보고서 생성
echo "4️⃣  최종 보고서 생성 중..."
npx tsx script/generate-final-report.ts "$REPORT_DATE"

if [ $? -ne 0 ]; then
    echo "❌ 보고서 생성 실패"
    exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ 일간 보고서 생성 완료!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📁 생성된 파일:"
echo "  • public/reports/daily/daily_report_${REPORT_DATE}.html"
echo "  • public/reports/daily/daily_report_${REPORT_DATE}.md"
echo "  • public/reports/daily/daily_report_${REPORT_DATE}.json"
echo ""
echo "🌐 웹 접속:"
echo "  http://localhost:40017/reports/daily/daily_report_${REPORT_DATE}.html"
echo ""
```

**실행**:
```bash
# 어제 보고서
./auto-daily-report-full.sh

# 특정 날짜
./auto-daily-report-full.sh 2025-11-23
```

### run-ai-analysis.ts 내부 동작

```typescript
// script/run-ai-analysis.ts 핵심 로직

// 1. 프롬프트 파일 읽기
const promptFile = `public/reports/data/ai_analysis_prompt_${reportDate}.txt`;
const prompt = readFileSync(promptFile, 'utf-8');

// 2. claude --print 실행
const result = execSync(`cat ${promptFile} | claude --print`, {
  encoding: 'utf-8',
  maxBuffer: 10 * 1024 * 1024, // 10MB
  timeout: 300000, // 5분
});

// 3. JSON 추출
const jsonMatch = result.match(/```json\s*([\s\S]*?)\s*```/);
const jsonResult = jsonMatch ? jsonMatch[1] : result;

// 4. JSON 파싱
const parsedResult = JSON.parse(jsonResult);

// 5. 결과 저장
const outputFile = `public/reports/data/ai_analysis_${reportDate}.json`;
writeFileSync(outputFile, JSON.stringify(parsedResult, null, 2));
```

---

## 주간/월간 보고서 자동화

### 주간 보고서 자동화

```bash
#!/bin/bash
# auto-weekly-report.sh

# 지난 7일 날짜 계산
END_DATE=$(date +%Y-%m-%d)
START_DATE=$(date -d "7 days ago" +%Y-%m-%d)

echo "📊 주간 보고서 생성: $START_DATE ~ $END_DATE"
echo ""

# 1. 주간 데이터 수집
echo "1️⃣  7일간 데이터 수집 중..."
npx tsx script/collect-weekly-data.ts "$START_DATE" "$END_DATE"

# 2. AI 프롬프트 생성
cat > /tmp/weekly_report_prompt.txt << EOF
다음 7일간의 보안 인시던트 데이터를 분석하여 주간 보고서를 작성하세요:

**요구사항**:
1. Executive Summary (경영진 요약)
2. 주간 통계 (인시던트 수, 심각도 분포)
3. 전주 대비 증감율
4. Top 10 위협 유형
5. MITRE ATT&CK 기법 분포
6. 보안 메트릭스 (평균 대응 시간, False Positive 비율)
7. 권장 사항 (즉시 조치, 중장기 개선)

**출력 형식**: JSON
\`\`\`json
{
  "executive_summary": "...",
  "weekly_statistics": {...},
  "trend_analysis": {...},
  "top_threats": [...],
  "mitre_distribution": {...},
  "security_metrics": {...},
  "recommendations": {...}
}
\`\`\`

데이터:
$(cat public/reports/data/weekly_data_${START_DATE}_${END_DATE}.json)
EOF

# 3. Claude AI 분석
echo "2️⃣  Claude AI 주간 분석 중..."
cat /tmp/weekly_report_prompt.txt | claude --print | \
  sed -n '/```json/,/```/p' | \
  sed '1d;$d' > /tmp/weekly_analysis.json

# 4. HTML 보고서 생성
echo "3️⃣  주간 보고서 생성 중..."
npx tsx script/generate-weekly-html-report.ts "$START_DATE" "$END_DATE" "/tmp/weekly_analysis.json"

echo "✅ 완료!"
echo "📁 보고서: public/reports/weekly/weekly_report_$(date +%Y-W%V).html"
```

### 월간 보고서 자동화

```bash
#!/bin/bash
# auto-monthly-report.sh

# 지난 달 계산
LAST_MONTH=$(date -d "last month" +%Y-%m)
YEAR=$(echo $LAST_MONTH | cut -d- -f1)
MONTH=$(echo $LAST_MONTH | cut -d- -f2)

echo "📊 월간 보고서 생성: $LAST_MONTH"
echo ""

# 1. 월간 데이터 수집
echo "1️⃣  ${MONTH}월 데이터 수집 중..."
npx tsx script/collect-monthly-data.ts "$YEAR" "$MONTH"

# 2. AI 프롬프트 생성
cat > /tmp/monthly_report_prompt.txt << EOF
다음 ${MONTH}월 전체 보안 인시던트 데이터를 분석하여 월간 보고서를 작성하세요:

**경영진 보고서 요구사항**:
1. Executive Summary (핵심 요약)
2. 월간 보안 태세 평가 (A-F 등급)
3. 주요 보안 사건 (Critical/High)
4. 월간 트렌드 분석 (전월 대비)
5. 위협 인텔리전스 요약
6. 투자 권장 사항 (보안 예산, 인력, 솔루션)
7. 다음 달 전략 방향

**출력 형식**: JSON + 경영진 친화적 서술

데이터:
$(cat public/reports/data/monthly_data_${YEAR}-${MONTH}.json)
EOF

# 3. Claude AI 분석 (경영진용)
echo "2️⃣  Claude AI 월간 분석 중 (경영진 보고서)..."
cat /tmp/monthly_report_prompt.txt | claude --print > /tmp/monthly_analysis_raw.txt

# JSON 추출
cat /tmp/monthly_analysis_raw.txt | \
  sed -n '/```json/,/```/p' | \
  sed '1d;$d' > /tmp/monthly_analysis.json

# 4. HTML + PDF 보고서 생성
echo "3️⃣  월간 보고서 생성 중 (HTML + PDF)..."
npx tsx script/generate-monthly-html-report.ts "$YEAR" "$MONTH" "/tmp/monthly_analysis.json"
npx tsx script/generate-monthly-pdf-report.ts "$YEAR" "$MONTH"  # PDF 변환

echo "✅ 완료!"
echo "📁 보고서:"
echo "  • public/reports/monthly/monthly_report_${YEAR}-${MONTH}.html"
echo "  • public/reports/monthly/monthly_report_${YEAR}-${MONTH}.pdf"
```

---

## Cron 자동화 설정

### 일간 보고서 자동화 (매일 새벽 1시)

```bash
# crontab 편집
crontab -e

# 추가
0 1 * * * cd /www/ib-editor/my-app && ./auto-daily-report-full.sh >> /var/log/daily-report-auto.log 2>&1
```

**로그 확인**:
```bash
tail -f /var/log/daily-report-auto.log
```

### 주간 보고서 자동화 (매주 월요일 오전 8시)

```bash
# crontab 편집
crontab -e

# 추가
0 8 * * 1 cd /www/ib-editor/my-app && ./auto-weekly-report.sh >> /var/log/weekly-report-auto.log 2>&1
```

### 월간 보고서 자동화 (매월 1일 오전 9시)

```bash
# crontab 편집
crontab -e

# 추가
0 9 1 * * cd /www/ib-editor/my-app && ./auto-monthly-report.sh >> /var/log/monthly-report-auto.log 2>&1
```

### 완전 자동화 Cron 설정 예시

```bash
# /etc/crontab 또는 crontab -e

# 환경 변수 설정 (Claude API Key)
ANTHROPIC_API_KEY=sk-ant-your-api-key-here
SHELL=/bin/bash
PATH=/usr/local/bin:/usr/bin:/bin

# 일간 보고서 (매일 새벽 1시)
0 1 * * * ubuntu cd /www/ib-editor/my-app && ./auto-daily-report-full.sh >> /var/log/daily-report.log 2>&1

# 주간 보고서 (매주 월요일 오전 8시)
0 8 * * 1 ubuntu cd /www/ib-editor/my-app && ./auto-weekly-report.sh >> /var/log/weekly-report.log 2>&1

# 월간 보고서 (매월 1일 오전 9시)
0 9 1 * * ubuntu cd /www/ib-editor/my-app && ./auto-monthly-report.sh >> /var/log/monthly-report.log 2>&1

# 특정 인시던트 자동 조사 (매시간 - 신규 인시던트 발견 시)
0 * * * * ubuntu cd /www/ib-editor/my-app && ./auto-investigate-new-incidents.sh >> /var/log/auto-investigate.log 2>&1
```

### 신규 인시던트 자동 발견 및 조사

```bash
#!/bin/bash
# auto-investigate-new-incidents.sh

# 지난 1시간 내 신규 인시던트 조회
NEW_INCIDENTS=$(curl -s -X GET "http://opensearch:9200/logs-cortex_xdr-incidents-*/_search" \
  -u admin:Admin@123456 \
  -H 'Content-Type: application/json' \
  -d '{
    "query": {
      "range": {
        "creation_time": {
          "gte": "now-1h",
          "lte": "now"
        }
      }
    },
    "size": 100,
    "_source": ["incident_id", "severity"]
  }' --insecure | jq -r '.hits.hits[]._source.incident_id')

# 각 인시던트 자동 조사
for INCIDENT_ID in $NEW_INCIDENTS; do
    echo "🔍 자동 조사: $INCIDENT_ID"
    ./auto-investigate-incident.sh "$INCIDENT_ID"
done

echo "✅ 완료: $(echo "$NEW_INCIDENTS" | wc -l)건 조사"
```

---

## 트러블슈팅

### 문제 1: claude 명령어를 찾을 수 없음

**증상**:
```
bash: claude: command not found
```

**해결**:
```bash
# Claude CLI 설치 확인
which claude

# 없으면 설치
npm install -g @anthropic-ai/claude-cli

# PATH 확인
echo $PATH

# PATH에 추가 (필요 시)
export PATH="$PATH:/usr/local/bin"
```

### 문제 2: ANTHROPIC_API_KEY 설정 안 됨

**증상**:
```
Error: ANTHROPIC_API_KEY environment variable is not set
```

**해결**:
```bash
# API 키 설정
export ANTHROPIC_API_KEY="sk-ant-your-api-key-here"

# 영구 설정 (~/.bashrc)
echo 'export ANTHROPIC_API_KEY="sk-ant-your-api-key-here"' >> ~/.bashrc
source ~/.bashrc

# Cron에서 사용 시 crontab에 직접 추가
crontab -e

# 상단에 추가
ANTHROPIC_API_KEY=sk-ant-your-api-key-here
```

### 문제 3: JSON 파싱 실패

**증상**:
```
Error: JSON.parse() - Unexpected token
```

**해결**:

Claude 응답이 ```json 블록으로 감싸지지 않은 경우:

```bash
# 수동으로 JSON 추출
cat /tmp/claude_response.txt | \
  grep -A 1000 '{' | \
  grep -B 1000 '}' > /tmp/extracted.json

# 또는 jq로 검증
cat /tmp/claude_response.txt | jq '.' > /tmp/validated.json
```

run-ai-analysis.ts가 자동으로 처리하지만, 실패 시 수동 확인:

```typescript
// run-ai-analysis.ts에 이미 구현된 fallback
try {
  parsedResult = JSON.parse(jsonResult);
} catch (parseError) {
  // JSON 파싱 실패 시 원본 저장
  parsedResult = {
    raw_response: jsonResult,
    parse_error: 'JSON 파싱 실패 - 수동 확인 필요',
  };
}
```

### 문제 4: claude --print 타임아웃

**증상**:
```
Error: Command timeout (300000ms)
```

**해결**:

```typescript
// run-ai-analysis.ts timeout 늘리기
const result = execSync(`cat ${promptFile} | claude --print`, {
  encoding: 'utf-8',
  timeout: 600000, // 5분 → 10분
});
```

### 문제 5: Cron에서 실행 안 됨

**증상**:
```
Cron job이 실행되지 않거나 실패
```

**해결**:

```bash
# 1. Cron 로그 확인
sudo tail -f /var/log/syslog | grep CRON

# 2. 수동 실행으로 에러 확인
cd /www/ib-editor/my-app
./auto-daily-report-full.sh

# 3. 실행 권한 확인
chmod +x auto-daily-report-full.sh
chmod +x script/*.sh

# 4. 절대 경로 사용
# crontab에서 상대 경로 대신 절대 경로 사용
0 1 * * * cd /www/ib-editor/my-app && /www/ib-editor/my-app/auto-daily-report-full.sh

# 5. 환경 변수 명시
# crontab 상단에 추가
ANTHROPIC_API_KEY=sk-ant-your-api-key-here
SHELL=/bin/bash
PATH=/usr/local/bin:/usr/bin:/bin
```

### 문제 6: 보고서 생성은 되지만 빈 파일

**증상**:
```
보고서 HTML 파일이 생성되지만 내용이 비어있음
```

**해결**:

```bash
# 1. AI 분석 결과 확인
cat public/reports/data/ai_analysis_2025-11-23.json

# 2. 빈 파일이면 claude --print 재실행
cat public/reports/data/ai_analysis_prompt_2025-11-23.txt | claude --print

# 3. 로그 확인
tail -f /var/log/daily-report-auto.log
```

---

## 📚 참고 자료

### 관련 스크립트

- `script/run-ai-analysis.ts` - Claude AI 분석 자동 실행
- `script/create-ai-analysis-prompt.ts` - AI 프롬프트 생성
- `script/generate-final-report.ts` - 최종 보고서 생성
- `script/collect-daily-incidents-data.ts` - 일간 데이터 수집
- `script/report-data-collector.ts` - 인시던트 데이터 수집

### 문서

- `README-DAILY-REPORT.md` - 일간 보고서 상세 가이드
- `COMPLETE_DAILY_REPORT_ARCHITECTURE.md` - 보고서 시스템 아키텍처
- `AUTOMATION_PIPELINE_ANALYSIS.md` - 자동화 파이프라인 분석
- `CRON_SETUP.md` - Cron 설정 가이드

### 웹 접속

- 일간 보고서: `http://localhost:40017/reports/daily/daily_report_2025-11-23.html`
- 주간 보고서: `http://localhost:40017/reports/weekly/weekly_report_2025-W47.html`
- 월간 보고서: `http://localhost:40017/reports/monthly/monthly_report_2025-11.html`

---

## 🎓 Best Practices

### 1. API 키 관리

```bash
# ❌ 나쁜 예: 스크립트에 하드코딩
ANTHROPIC_API_KEY="sk-ant-..."

# ✅ 좋은 예: 환경 변수
export ANTHROPIC_API_KEY="sk-ant-..."

# ✅ 더 좋은 예: .env 파일
echo 'ANTHROPIC_API_KEY=sk-ant-...' > .env
source .env
```

### 2. 에러 처리

```bash
# ✅ 항상 exit code 확인
npx tsx script/run-ai-analysis.ts "$DATE"
if [ $? -ne 0 ]; then
    echo "❌ 실패"
    # 알림 전송 (Slack, Email 등)
    exit 1
fi
```

### 3. 로그 관리

```bash
# ✅ 로그 파일 크기 관리 (logrotate)
# /etc/logrotate.d/daily-report
/var/log/daily-report-auto.log {
    daily
    rotate 30
    compress
    missingok
    notifempty
}
```

### 4. 디스크 공간 관리

```bash
# ✅ 30일 이상 된 보고서 자동 삭제
find public/reports/ -name "*.html" -mtime +30 -delete
find public/reports/ -name "*.json" -mtime +30 -delete
```

---

**작성일**: 2025-11-23
**버전**: 1.0
**작성자**: Claude Code AI Assistant
**목적**: claude --print를 사용한 완전 자동화 보고서 생성
