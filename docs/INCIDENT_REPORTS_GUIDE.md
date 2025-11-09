# 📊 인시던트 보고서 생성 가이드

Cortex XDR 인시던트 데이터를 기반으로 일간/주간/월간 보고서를 자동 생성하는 종합 가이드입니다.

## 📚 목차

1. [개요](#개요)
2. [시스템 아키텍처](#시스템-아키텍처)
3. [일간 보고서 생성](#일간-보고서-생성)
4. [주간 보고서 생성](#주간-보고서-생성)
5. [월간 보고서 생성](#월간-보고서-생성)
6. [MCP 기반 자동화](#mcp-기반-자동화)
7. [보고서 포맷](#보고서-포맷)
8. [크론 스케줄링](#크론-스케줄링)
9. [문제 해결](#문제-해결)

---

## 개요

### 주요 기능

- **자동 데이터 수집**: OpenSearch에서 Cortex XDR 인시던트 자동 조회
- **AI 기반 분석**: MCP incident-analysis 서버로 통계 및 트렌드 분석
- **다국어 지원**: 한국어 기반 보고서 생성
- **다중 포맷**: Markdown + HTML 보고서 생성
- **스케줄링**: Cron을 통한 자동화 실행

### 보고서 유형

| 유형 | 설명 | 주기 | 출력 파일 |
|------|------|------|----------|
| 일간 | 특정 날짜의 인시던트 분석 | 매일 | `daily_report_YYYY-MM-DD.html` |
| 주간 | 7일간의 트렌드 분석 | 매주 월요일 | `weekly_report_START_END.html` |
| 월간 | 30일간의 종합 분석 | 매월 1일 | `monthly_report_YYYY-MM.html` |

---

## 시스템 아키텍처

### 데이터 흐름

```
Cortex XDR → OpenSearch → MCP Server → Report Generator → HTML/PDF
                 ↓
          PostgreSQL TI DB
```

### 주요 컴포넌트

1. **OpenSearch (20.41.120.173:9200)**
   - 인시던트 데이터 저장소
   - 7개 인덱스: incidents, alerts, files, networks, processes, endpoints, causality_chains

2. **MCP incident-analysis Server**
   - 통계 분석: `get_incident_statistics`
   - 위협 분석: `analyze_top_threats`
   - 트렌드 차트: `create_incident_trend_chart`
   - 지리 분석: `analyze_geographic_distribution`
   - 종합 보고서: `generate_incident_report`

3. **PostgreSQL TI Database**
   - MITRE ATT&CK 매핑
   - 위협 인텔 (MISP, OpenCTI)
   - IOC 분류 및 평판 데이터

---

## 일간 보고서 생성

### 기본 사용법

```bash
# 오늘 날짜로 생성
./script/generate-daily-report-mcp.sh

# 특정 날짜로 생성
./script/generate-daily-report-mcp.sh 2025-11-09
```

### 출력 예시

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  📅 일간 보안 인시던트 보고서 생성
  날짜: 2025-11-09
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1️⃣  MCP를 통한 인시던트 데이터 분석 중...
✅ 데이터 수집 완료

2️⃣  Markdown 보고서 생성 중...
✅ Markdown 보고서 생성 완료

3️⃣  HTML 보고서 생성 중...
✅ HTML 보고서 생성 완료

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ 일간 보고서 생성 완료!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📄 Markdown: /tmp/daily_report_2025-11-09.md
📄 HTML: public/reports/daily/daily_report_2025-11-09.html

🌐 접속: http://localhost:40017/reports/daily/daily_report_2025-11-09.html
```

### 일간 보고서 구성

#### 1. 당일 요약
- 총 인시던트 수
- 신규 발생 건수
- 조사 중 건수
- 해결 완료 건수

#### 2. 심각도별 분포
| 심각도 | 건수 | 긴급 조치 필요 |
|--------|------|---------------|
| Critical | X | X |
| High | XX | X |
| Medium | XX | - |
| Low | XX | - |

#### 3. 긴급 조치 필요 인시던트
- Critical/High 인시던트 상세 정보
- 현재 상태 및 조치 내역
- 담당자 정보

#### 4. 주요 탐지 유형
- Registry Links Protect
- Local Analysis Malware
- Suspicious Network Connection
- 기타 탐지 유형

#### 5. 주요 활동
- 위협 파일 탐지 (신규 악성 파일, 알려진 멀웨어)
- 네트워크 활동 (외부 연결, 차단된 IP)
- 엔드포인트 현황 (활성, 오프라인, 패치 필요)

#### 6. 주의 사항
- 증가 추세
- 새로운 공격 패턴
- 시스템 이슈

---

## 주간 보고서 생성

### 기본 사용법

```bash
# 주간 보고서 생성 (11월 3일 ~ 11월 9일)
./script/generate-weekly-report-mcp.sh 2025-11-03 2025-11-09

# 지난주 보고서 자동 생성
START_DATE=$(date -d "7 days ago" +%Y-%m-%d)
END_DATE=$(date -d "yesterday" +%Y-%m-%d)
./script/generate-weekly-report-mcp.sh $START_DATE $END_DATE
```

### 주간 보고서 구성

#### 1. 주요 통계
- 총 인시던트 수 및 일평균
- 심각도별 분포 및 트렌드
- 일별 인시던트 발생 추이

#### 2. 상위 인시던트 유형 (Top 10)
```
1. Registry Links Protect - XX건
2. Local Analysis Malware - XX건
3. Suspicious Network Connection - XX건
...
```

#### 3. MITRE ATT&CK 기법 분석
- **T1112** (Modify Registry): XX건
- **T1071.001** (Application Layer Protocol): XX건
- **T1566** (Phishing): XX건

#### 4. 주요 위협 파일 (Top 10)
| 파일명 | SHA256 | 탐지 횟수 | 위협 레벨 |
|--------|--------|----------|----------|
| ... | ... | ... | ... |

#### 5. 네트워크 위협 현황
- 총 외부 연결 시도
- 위협 IP/도메인 개수
- 상위 위협 국가

#### 6. 주요 인시던트 사례
- Critical 인시던트 상세
- High 인시던트 요약
- 조치 사항 및 결과

#### 7. 주간 트렌드 분석
- **증가 추세**: 전주 대비 증가한 항목
- **감소 추세**: 전주 대비 감소한 항목
- **새로운 패턴**: 신규 발견된 공격 패턴

#### 8. 권장사항
- **즉시 조치**: Critical/High 인시던트 처리
- **단기 개선** (1-2주): 룰 튜닝, 위협 인텔 업데이트
- **중장기 개선** (1개월+): 자동화 확대, 교육 강화

---

## 월간 보고서 생성

### 기본 사용법

```bash
# 월간 보고서 생성 (30일간)
./script/generate-weekly-report-mcp.sh 2025-10-10 2025-11-09

# 또는 주간 스크립트를 30일로 실행
START_DATE=$(date -d "30 days ago" +%Y-%m-%d)
END_DATE=$(date -d "yesterday" +%Y-%m-%d)
./script/generate-weekly-report-mcp.sh $START_DATE $END_DATE
```

### 월간 보고서 추가 항목

- **월별 비교 분석**: 전월 대비 증감률
- **장기 트렌드**: 3개월 이상 추이
- **주요 성과 지표**: KPI 달성 현황
- **경영진 요약**: 1페이지 Executive Summary

---

## MCP 기반 자동화

### MCP 도구 활용

#### 1. 통계 수집
```bash
# MCP 도구를 통한 7일간 통계
mcp__incident-analysis__get_incident_statistics --days 7
```

**결과 예시**:
```markdown
## 전체 요약
- **총 인시던트 수**: 408건
- **일평균 인시던트**: 58건
- **분석 기간**: 2025-11-02 ~ 2025-11-09

## 심각도별 분포
| 심각도 | 건수 | 비율 |
|--------|------|------|
| medium | 303 | 74.3% |
| low | 88 | 21.6% |
| high | 13 | 3.2% |
| critical | 4 | 1.0% |
```

#### 2. 상위 위협 분석
```bash
# Top 10 위협 유형 분석
mcp__incident-analysis__analyze_top_threats --days 7 --top_count 10
```

#### 3. 트렌드 차트 생성
```bash
# 일별/시간별 트렌드 차트
mcp__incident-analysis__create_incident_trend_chart --days 7 --interval 1d
```

**차트 유형**:
- 일별 트렌드 (1d)
- 시간별 트렌드 (1h)

#### 4. 지리적 분포 분석
```bash
# 국가별 인시던트 분석
mcp__incident-analysis__analyze_geographic_distribution --days 7
```

#### 5. 종합 보고서 생성
```bash
# 완전 자동화된 종합 보고서
mcp__incident-analysis__generate_incident_report --days 7 --report_title "주간 보안 보고서"
```

### MCP 도구 통합 예시

```typescript
// Node.js 스크립트에서 MCP 도구 활용
import { MCPClient } from '@modelcontextprotocol/sdk';

const client = new MCPClient();

// 통계 수집
const stats = await client.callTool('get_incident_statistics', {
  days: 7,
  index_pattern: 'logs-cortex_xdr-incidents-*'
});

// 위협 분석
const threats = await client.callTool('analyze_top_threats', {
  days: 7,
  top_count: 10
});

// 보고서 생성
const report = await client.callTool('generate_incident_report', {
  days: 7,
  report_title: '주간 보안 인시던트 분석 보고서'
});
```

---

## 보고서 포맷

### HTML 스타일

보고서는 Vercel 스타일의 모던한 디자인을 사용합니다:

```css
/* 주요 스타일 요소 */
- 폰트: -apple-system, BlinkMacSystemFont, 'Segoe UI'
- 배경: #f8fafc (라이트 그레이)
- 카드: 화이트 박스 + 그림자
- 색상:
  - Critical: #dc2626 (빨강)
  - High: #ea580c (주황)
  - Medium: #f59e0b (노랑)
  - Low: #84cc16 (초록)
```

### Markdown 포맷

```markdown
# 주간 보안 인시던트 분석 보고서

**보고 기간**: 2025-11-03 ~ 2025-11-09
**생성일시**: 2025-11-09 16:00:00
**분석 시스템**: DeFender X SIEM (MCP 자동 분석)

---

## 📊 주요 통계

### 전체 요약
- **총 인시던트**: 408건
- **일평균**: 58건
...
```

### 파일 구조

```
public/reports/
├── daily/
│   ├── daily_report_2025-11-09.html
│   ├── daily_report_2025-11-08.html
│   └── ...
├── weekly/
│   ├── weekly_report_2025-11-03_2025-11-09.html
│   ├── weekly_report_2025-10-27_2025-11-02.html
│   └── ...
└── monthly/
    ├── monthly_report_2025-11.html
    ├── monthly_report_2025-10.html
    └── ...
```

---

## 크론 스케줄링

### 자동 실행 설정

#### 1. Crontab 편집
```bash
crontab -e
```

#### 2. 스케줄 추가

```cron
# 일간 보고서: 매일 오전 9시에 전날 보고서 생성
0 9 * * * cd /www/ib-editor/my-app && ./script/generate-daily-report-mcp.sh $(date -d "yesterday" +\%Y-\%m-\%d) >> /var/log/daily-report.log 2>&1

# 주간 보고서: 매주 월요일 오전 10시에 지난주 보고서 생성
0 10 * * 1 cd /www/ib-editor/my-app && ./script/generate-weekly-report-mcp.sh $(date -d "7 days ago" +\%Y-\%m-\%d) $(date -d "yesterday" +\%Y-\%m-\%d) >> /var/log/weekly-report.log 2>&1

# 월간 보고서: 매월 1일 오전 11시에 지난달 보고서 생성
0 11 1 * * cd /www/ib-editor/my-app && ./script/generate-weekly-report-mcp.sh $(date -d "30 days ago" +\%Y-\%m-\%d) $(date -d "yesterday" +\%Y-\%m-\%d) >> /var/log/monthly-report.log 2>&1
```

#### 3. 로그 확인
```bash
# 일간 보고서 로그
tail -f /var/log/daily-report.log

# 주간 보고서 로그
tail -f /var/log/weekly-report.log
```

### Systemd Timer (대안)

```ini
# /etc/systemd/system/daily-report.service
[Unit]
Description=Daily Security Incident Report

[Service]
Type=oneshot
WorkingDirectory=/www/ib-editor/my-app
ExecStart=/www/ib-editor/my-app/script/generate-daily-report-mcp.sh
User=ubuntu
```

```ini
# /etc/systemd/system/daily-report.timer
[Unit]
Description=Daily Security Report Timer

[Timer]
OnCalendar=daily
OnCalendar=09:00
Persistent=true

[Install]
WantedBy=timers.target
```

**활성화**:
```bash
sudo systemctl daemon-reload
sudo systemctl enable daily-report.timer
sudo systemctl start daily-report.timer
```

---

## 문제 해결

### 1. OpenSearch 연결 오류

**증상**:
```
Error: connect ECONNREFUSED opensearch:9200
```

**해결**:
```bash
# /etc/hosts 확인
cat /etc/hosts | grep opensearch

# 추가 필요 시
echo "20.41.120.173 opensearch" | sudo tee -a /etc/hosts
```

### 2. MCP 도구 오류

**증상**:
```
MCP tool not found: get_incident_statistics
```

**해결**:
```bash
# .mcp.json 확인
cat .mcp.json | grep incident-analysis

# MCP 서버 재시작 (Claude Code 재시작)
```

### 3. 환경변수 누락

**증상**:
```
AZURE_OPENAI_API_KEY is not defined
```

**해결**:
```bash
# 환경변수 설정
export AZURE_OPENAI_API_KEY="your-api-key"

# .env.local에 추가
echo "AZURE_OPENAI_API_KEY=your-api-key" >> .env.local
```

### 4. 보고서 생성 실패

**증상**:
보고서 HTML이 비어있거나 데이터가 "XX"로 표시됨

**원인**:
MCP 도구가 실제 데이터를 채우지 않고 템플릿만 생성

**해결**:
```bash
# MCP 도구를 직접 호출하여 데이터 확인
npx tsx << 'EOF'
import { MCPClient } from '@modelcontextprotocol/sdk';
const stats = await client.callTool('get_incident_statistics', { days: 1 });
console.log(stats);
EOF
```

### 5. 권한 오류

**증상**:
```
Permission denied: ./script/generate-daily-report-mcp.sh
```

**해결**:
```bash
chmod +x script/generate-daily-report-mcp.sh
chmod +x script/generate-weekly-report-mcp.sh
```

---

## 추가 리소스

### 관련 문서
- [SYSTEM_OVERVIEW.md](./SYSTEM_OVERVIEW.md) - 시스템 전체 구조
- [CRON_SETUP.md](./CRON_SETUP.md) - 크론 스케줄링 상세 가이드
- [CLAUDE_CODE_REPORTS.md](./CLAUDE_CODE_REPORTS.md) - Claude Code 기반 보고서

### 스크립트 위치
```
script/
├── generate-daily-report-mcp.sh      # 일간 보고서
├── generate-weekly-report-mcp.sh     # 주간 보고서
├── generate-korean-html-report.ts    # 한국어 HTML 생성기
└── investigate-incident-cli.ts       # 개별 인시던트 조사
```

### MCP 서버 설정
```json
{
  "mcpServers": {
    "incident-analysis": {
      "command": "npx",
      "args": ["tsx", "/www/ib-editor/my-app/script/incident-analysis-mcp.js"],
      "description": "Incident Analysis MCP Server"
    }
  }
}
```

---

## 예제: 완전 자동화된 보고서 생성

### Node.js 스크립트

```typescript
#!/usr/bin/env tsx

import { execSync } from 'child_process';
import { writeFileSync } from 'fs';

// 1. 날짜 계산
const today = new Date();
const yesterday = new Date(today);
yesterday.setDate(today.getDate() - 1);
const reportDate = yesterday.toISOString().split('T')[0];

console.log(`📅 일간 보고서 생성: ${reportDate}`);

// 2. MCP 도구로 데이터 수집
console.log('📊 통계 데이터 수집 중...');
const stats = execSync(`
  echo 'mcp__incident-analysis__get_incident_statistics({ days: 1 })'
`).toString();

// 3. 보고서 생성
console.log('📝 보고서 생성 중...');
execSync(`./script/generate-daily-report-mcp.sh ${reportDate}`);

// 4. 이메일 발송 (선택)
console.log('📧 이메일 발송 중...');
execSync(`
  sendmail security-team@company.com < public/reports/daily/daily_report_${reportDate}.html
`);

console.log('✅ 완료!');
```

---

## 요약

### 핵심 명령어

```bash
# 일간 보고서
./script/generate-daily-report-mcp.sh 2025-11-09

# 주간 보고서
./script/generate-weekly-report-mcp.sh 2025-11-03 2025-11-09

# MCP 통계
mcp__incident-analysis__get_incident_statistics --days 7
mcp__incident-analysis__analyze_top_threats --days 7
mcp__incident-analysis__generate_incident_report --days 7
```

### 보고서 접속
- **일간**: http://localhost:40017/reports/daily/daily_report_YYYY-MM-DD.html
- **주간**: http://localhost:40017/reports/weekly/weekly_report_START_END.html

### 지원
문제가 발생하면 다음을 확인하세요:
1. OpenSearch 연결 상태
2. MCP 서버 설정 (.mcp.json)
3. 환경변수 설정
4. 로그 파일

---

*본 문서는 2025-11-09에 작성되었으며, DeFender X SIEM 시스템의 보고서 생성 기능을 설명합니다.*
