# Claude Code 고품질 보고서 생성 가이드

Claude Sonnet 4.5의 강력한 추론 능력을 활용하여 고품질 HTML 보고서를 생성하는 시스템입니다.

## 목차

- [개요](#개요)
- [기존 시스템과의 차이점](#기존-시스템과의-차이점)
- [사용 방법](#사용-방법)
- [프롬프트 예시](#프롬프트-예시)
- [보고서 구조](#보고서-구조)
- [알림 설정](#알림-설정)
- [고급 사용법](#고급-사용법)

---

## 개요

### 왜 Claude Code로 보고서를 생성하나요?

| 항목 | 기존 (Azure gpt-4o-mini) | Claude Code (Sonnet 4.5) |
|------|-------------------------|-------------------------|
| **AI 모델** | gpt-4o-mini | Claude Sonnet 4.5 |
| **분석 깊이** | 얕음 (500 토큰) | 깊음 (전체 컨텍스트) |
| **추론 품질** | 기본 | 최고 수준 |
| **보고서 형식** | 마크다운만 | HTML (Tailwind + Charts) |
| **시각화** | 없음 | 차트, 타임라인, 매트릭스 |
| **대상 독자** | 보안 엔지니어 | 경영진 + 보안팀 + 엔지니어 |
| **비용** | $0.001/건 | $0.02/건 (20배 높지만 가치 있음) |

### 작동 원리

```
Claude Code CLI
    ↓
1. MCP 도구 호출: collect_report_data
    ↓
2. 데이터 수집 (AI 없음)
   - OpenSearch: 7개 인덱스 조회
   - TI 상관분석: PostgreSQL
    ↓
3. Claude Code에 데이터 반환
    ↓
4. Claude Sonnet 4.5 분석
   - 위협 패턴 식별
   - 공격 체인 분석
   - 위험도 평가
   - 권장 사항 생성
    ↓
5. HTML 보고서 생성
   - 템플릿에 데이터 삽입
   - Claude 분석 추가
   - 파일 저장
    ↓
6. 알림 전송 (선택적)
   - Supabase
   - Slack
   - Discord
```

---

## 기존 시스템과의 차이점

### 기존 CLI 시스템 (유지됨)

```bash
# 기존 방식 - Azure gpt-4o-mini 사용
npx tsx script/investigate-incident-cli.ts --incident-id 414186

# 출력
✅ Investigation complete
📁 JSON: data/investigations/incident_414186_*.json
📄 MD: data/investigations/incident_414186_*.md
```

**특징**:
- 빠름 (8-16초)
- 저렴 ($0.001/건)
- 자동화에 적합
- 기본적인 분석

### 새로운 Claude Code 시스템 (추가됨)

```bash
# 새로운 방식 - Claude Sonnet 4.5 사용
claude --print "Investigate incident 414186 and generate HTML report"

# 출력
✅ High-quality analysis complete
📁 JSON: data/investigations/incident_414186_*.json
📄 MD: data/investigations/incident_414186_*.md
🌐 HTML: data/reports/incident_414186_*.html
📊 Interactive charts, timeline, MITRE matrix
🤖 Deep analysis by Claude Sonnet 4.5
```

**특징**:
- 느림 (30-60초)
- 비싸 ($0.02/건)
- 고품질 분석
- 경영진 보고용

---

## 사용 방법

### 1. 환경 설정

```bash
# .env.local 파일에 추가 (선택적)

# Supabase 알림 (선택)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key

# Slack 알림 (선택)
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...

# Discord 알림 (선택)
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...

# 웹훅 알림 (선택)
REPORT_WEBHOOK_URL=https://your-api.com/webhooks/report
```

### 2. Claude Code 실행

```bash
# 기본 조사
claude --print "Investigate incident 414186"

# 강제 재조사
claude --print "Investigate incident 414186 with force refresh"

# 여러 인시던트
claude --print "Investigate incidents 414186, 414187, 414188"

# 자연어 쿼리
claude --print "오늘 생성된 인시던트 중 severity가 high인 것들 조사해줘"

# 주간 보고서
claude --print "Create a weekly report for incidents from last week"

# 월간 보고서
claude --print "Generate monthly report for November 2025"
```

---

## 프롬프트 예시

### 단일 인시던트 조사

```bash
claude --print "Investigate incident 414186 and generate a comprehensive HTML report"
```

**Claude가 하는 일**:
1. MCP 도구로 데이터 수집
2. 전체 데이터 분석:
   - 알림 패턴 분석
   - 파일 해시 위협 평가
   - 네트워크 활동 분석
   - MITRE ATT&CK 기법 매핑
   - CVE 취약점 평가
   - 엔드포인트 위험도 평가
3. 최종 판단:
   - TRUE_POSITIVE / FALSE_POSITIVE / BENIGN / NEEDS_INVESTIGATION
   - 위험도 점수 (0-100)
   - 신뢰도 (0-100%)
4. HTML 보고서 생성
5. 파일 저장 + 알림

### 여러 인시던트 비교 분석

```bash
claude --print "Investigate incidents 414186, 414187, 414188 and create a comparative analysis report"
```

**Claude가 추가로 하는 일**:
- 인시던트 간 공통점/차이점 분석
- 캠페인 연관성 평가
- 시간대별 패턴 분석
- 종합 위협 평가

### 날짜 범위 보고서

```bash
claude --print "Generate a security report for all high severity incidents created in the last 7 days"
```

**Claude가 하는 일**:
1. OpenSearch에서 조건에 맞는 인시던트 조회
2. 각 인시던트 데이터 수집
3. 종합 분석:
   - 주요 위협 트렌드
   - 공격 벡터 분석
   - 영향받은 자산 요약
   - 권장 대응 방안
4. 주간 요약 보고서 생성

### 월간 보안 보고서

```bash
claude --print "Create an executive monthly security report for November 2025 with trends and recommendations"
```

**Claude가 하는 일**:
1. 한 달 치 인시던트 수집
2. 통계 분석:
   - 인시던트 수 트렌드
   - Severity 분포
   - 상위 위협 유형
   - 영향받은 엔드포인트
3. 경영진 요약:
   - Executive Summary
   - Key Findings
   - Risk Assessment
   - Strategic Recommendations
4. HTML + PDF 생성 (경영진용)

---

## 보고서 구조

생성된 HTML 보고서에는 다음 섹션이 포함됩니다:

### 1. Executive Summary (요약)
- 위험도 게이지 (0-100)
- 최종 판단 배지
- 주요 통계 (알림, 파일, 네트워크, 위협)

### 2. Claude Analysis (AI 분석)
- Claude Sonnet 4.5의 상세 분석
- 위협 패턴 설명
- 공격 체인 분석
- False Positive 가능성 평가

### 3. Incident Overview (개요)
- 인시던트 기본 정보
- 타임라인
- 영향받은 시스템

### 4. MITRE ATT&CK (공격 기법)
- 검출된 ATT&CK 기법
- 전술(Tactics) 매핑
- 기법(Techniques) 상세 설명

### 5. TI Correlation (위협 인텔리전스)
- 파일 해시 매칭 (위협 여부)
- IP 주소 평판 (국가, ISP)
- CVE 취약점 상세

### 6. Key Findings (주요 발견사항)
- Claude가 식별한 핵심 발견사항
- 위협 지표
- 이상 행위

### 7. Recommendations (권장 사항)
- 즉시 대응 조치
- 장기 보안 개선 사항
- 예방 조치

### 8. Timeline Chart (타임라인)
- 시간대별 알림 분포
- 인터랙티브 차트 (Chart.js)

---

## 알림 설정

### Supabase 알림

보고서 생성 완료 시 Supabase 테이블에 메타데이터 저장:

**테이블 구조** (`incident_reports`):
```sql
CREATE TABLE incident_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id TEXT NOT NULL,
  report_type TEXT NOT NULL, -- 'single', 'multiple', 'weekly', 'monthly'
  report_path TEXT NOT NULL,
  risk_score INTEGER,
  verdict TEXT,
  generated_at TIMESTAMP WITH TIME ZONE NOT NULL,
  generated_by TEXT NOT NULL, -- 'claude-code', 'cli', 'cron'
  incident_count INTEGER,
  status TEXT DEFAULT 'completed',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**설정**:
```bash
# .env.local
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
```

### Slack 알림

보고서 생성 완료 시 Slack 메시지 전송:

**메시지 형식**:
```
🚨 Incident Report Generated

Incident ID: 414186
Verdict: TRUE_POSITIVE
Risk Score: 85/100

Report Path: data/reports/incident_414186_2025-11-08T15-30-00.html

Generated by Claude Code AI at 2025-11-08T15:30:00Z
```

**설정**:
```bash
# .env.local
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

### Discord 알림

Discord 임베드 메시지로 알림:

**설정**:
```bash
# .env.local
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR_WEBHOOK_ID/YOUR_TOKEN
```

---

## 고급 사용법

### 백그라운드 실행

장시간 실행되는 작업을 백그라운드에서 처리:

```bash
# 백그라운드 실행 (tmux/screen 사용)
tmux new -s report
claude --print "Generate monthly report for November 2025"
# Ctrl+B, D로 detach

# 나중에 확인
tmux attach -t report
```

### 배치 처리

여러 보고서를 순차적으로 생성:

```bash
# incidents.txt 파일 생성
cat > incidents.txt <<EOF
414186
414187
414188
414189
414190
EOF

# 배치 처리 스크립트
while read incident_id; do
  claude --print "Investigate incident $incident_id and generate HTML report"
done < incidents.txt
```

### 주간/월간 자동 보고서

Cron으로 정기적인 보고서 생성:

```bash
# crontab -e

# 매주 월요일 오전 9시 - 주간 보고서
0 9 * * 1 /usr/local/bin/claude --print "Generate weekly security report for last 7 days" >> /var/log/weekly-reports.log 2>&1

# 매월 1일 오전 9시 - 월간 보고서
0 9 1 * * /usr/local/bin/claude --print "Generate monthly security report for last month" >> /var/log/monthly-reports.log 2>&1
```

---

## 파일 구조

```
/www/ib-editor/my-app/
├── script/
│   ├── report-data-collector.ts      # 데이터 수집 (AI 없음)
│   ├── incident-report-mcp.js        # MCP 서버
│   └── supabase-notifier.ts          # 알림 함수
├── templates/
│   └── incident-report-template.html # HTML 템플릿
├── data/
│   ├── investigations/               # 기존 CLI 출력 (JSON + MD)
│   └── reports/                      # Claude Code 출력 (HTML)
└── docs/
    └── CLAUDE_CODE_REPORTS.md        # 이 문서
```

---

## 문제 해결

### MCP 도구가 인식되지 않을 때

```bash
# Claude Code 재시작
claude restart

# MCP 서버 목록 확인
claude mcp list

# incident-report 서버가 보이는지 확인
```

### 데이터 수집 실패

```bash
# 데이터 수집 테스트
npx tsx script/report-data-collector.ts 414186

# OpenSearch 연결 확인
curl -u admin:Admin@123456 http://opensearch:9200/_cat/indices/logs-cortex_xdr-*

# PostgreSQL 연결 확인
psql postgresql://postgres:postgres@postgres:5432/n8n -c "SELECT COUNT(*) FROM ioclog.ioc_simple;"
```

### 보고서가 생성되지 않을 때

1. **템플릿 파일 확인**:
```bash
ls -la templates/incident-report-template.html
```

2. **출력 디렉토리 생성**:
```bash
mkdir -p data/reports
```

3. **권한 확인**:
```bash
chmod 755 data/reports
```

---

## 비교표: 어떤 방법을 사용해야 할까?

| 시나리오 | 권장 방법 |
|---------|----------|
| 빠른 트리아지 | CLI (`investigate-incident-cli.ts`) |
| 자동화된 조사 (Cron) | CLI (기존 시스템) |
| 경영진 보고서 | Claude Code |
| 심층 분석 필요 | Claude Code |
| 주간/월간 리포트 | Claude Code |
| 여러 인시던트 비교 | Claude Code |
| False Positive 검증 | Claude Code |
| API 통합 | CLI 또는 REST API |
| 대량 배치 처리 | CLI (비용 효율적) |

---

## 다음 단계

1. **테스트 실행**:
```bash
claude --print "Investigate incident 414186 and generate HTML report"
```

2. **결과 확인**:
```bash
ls -la data/reports/
```

3. **HTML 보고서 열기**:
```bash
open data/reports/incident_414186_*.html
# 또는
xdg-open data/reports/incident_414186_*.html
```

4. **알림 설정** (선택적):
- Supabase 테이블 생성
- Slack/Discord 웹훅 설정
- 환경 변수 추가

---

## 참고 자료

- [SYSTEM_OVERVIEW.md](./SYSTEM_OVERVIEW.md) - 전체 시스템 구조
- [API_USAGE.md](./API_USAGE.md) - REST API 사용법
- [CRON_SETUP.md](./CRON_SETUP.md) - 자동화 설정

---

**생성 날짜**: 2025-11-08
**버전**: 1.0.0
**작성자**: Claude Code AI Assistant
