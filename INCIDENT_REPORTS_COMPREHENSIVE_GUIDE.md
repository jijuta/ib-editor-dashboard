# 🔐 보안 인시던트 보고서 시스템 - 완전 가이드

> **최종 업데이트**: 2025-11-10
> **버전**: 2.0
> **상태**: ✅ 프로덕션 운영 중

---

## 📋 목차

1. [시스템 개요](#시스템-개요)
2. [인시던트 조사 시스템](#인시던트-조사-시스템)
3. [일간 보고서 시스템](#일간-보고서-시스템)
4. [주간 보고서 시스템](#주간-보고서-시스템)
5. [Claude Code 통합](#claude-code-통합)
6. [자동화 및 스케줄링](#자동화-및-스케줄링)
7. [아키텍처](#아키텍처)
8. [트러블슈팅](#트러블슈팅)

---

## 시스템 개요

이 시스템은 **Cortex XDR 보안 인시던트**를 자동으로 조사하고 분석하여 다양한 형식의 보고서를 생성합니다.

### 🎯 핵심 기능

#### 1️⃣ 단일 인시던트 심층 조사
- **7개 OpenSearch 인덱스** 통합 조회
- **PostgreSQL TI 데이터베이스** 상관분석
- **7개 병렬 AI 분석기** (Azure OpenAI gpt-4o-mini)
- **실행 시간**: 8-16초
- **출력 형식**: JSON + Markdown + HTML

#### 2️⃣ 일간 보안 보고서
- **하루 전체 인시던트** 집계 및 분석
- **Claude AI 전문가 분석** (선택)
- **위험도 평가 및 권장사항**
- **실행 주기**: 매일 새벽 1시 (Cron)
- **출력 형식**: HTML + Markdown + JSON

#### 3️⃣ 주간 보안 보고서
- **7일간 트렌드 분석**
- **경영진용 Executive Summary**
- **보안 태세 평가**
- **실행 주기**: 매주 월요일 오전 9시
- **출력 형식**: HTML + PDF (선택)

#### 4️⃣ Claude Code 고품질 보고서
- **Claude Sonnet 4.5** 심층 분석
- **Tailwind CSS + Chart.js** 시각화
- **인터랙티브 HTML** 보고서
- **실행 방법**: 수동 (Claude Code UI)
- **출력 형식**: HTML (고품질)

---

## 인시던트 조사 시스템

### 📊 시스템 아키텍처

```
┌─────────────────────────────────────────────────────────────┐
│                    Input Methods                             │
│   MCP Tool │ CLI Script │ REST API │ File Watcher           │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│              Investigation Pipeline                          │
│                                                              │
│  1️⃣ OpenSearch Query (7 indices)                           │
│     • logs-cortex_xdr-incidents-*                           │
│     • logs-cortex_xdr-alerts-*                              │
│     • logs-cortex_xdr-files-*                               │
│     • logs-cortex_xdr-networks-*                            │
│     • logs-cortex_xdr-processes-*                           │
│     • logs-cortex_xdr-endpoints-*                           │
│     • logs-cortex_xdr-causality_chains-*                    │
│                                                              │
│  2️⃣ TI Correlation (PostgreSQL)                            │
│     • File hashes → ioclog.ioc_log (Threat/Unknown/Benign) │
│     • IP addresses → GeoIP + Threat Intel                   │
│     • MITRE techniques → ioclog.mitre_techniques            │
│     • CVEs → ioclog.cve_details (CVSS + Description)        │
│                                                              │
│  3️⃣ Parallel AI Analysis (Azure OpenAI)                    │
│     ┌─────────────────────────────────────┐                │
│     │ Analyst Verifier                    │ ─┐             │
│     │ File Hash Analyzer                  │  │             │
│     │ Network Analyzer                    │  │             │
│     │ MITRE Analyzer                      │  ├─→ Promise.all│
│     │ CVE Analyzer                        │  │             │
│     │ Endpoint Analyzer                   │ ─┘             │
│     └─────────────────────────────────────┘                │
│                   ↓                                          │
│     ┌─────────────────────────────────────┐                │
│     │ Synthesizer (Final Verdict)         │                │
│     └─────────────────────────────────────┘                │
│     • Token optimization (68% reduction)                    │
│     • Execution time: 5-10 seconds                          │
│                                                              │
│  4️⃣ Result Storage                                          │
│     • JSON (full data, ~140KB)                              │
│     • Markdown (human-readable report, ~50KB)               │
│     • HTML (Korean report, ~80KB)                           │
└─────────────────────────────────────────────────────────────┘
```

### 🚀 사용 방법

#### 방법 1: CLI 스크립트

```bash
# 단일 인시던트 조사
npx tsx script/investigate-incident-cli.ts --incident-id 414186

# 캐시 무시 (강제 재조사)
npx tsx script/investigate-incident-cli.ts --incident-id 414186 --force

# 배치 처리
echo "414186\n414187\n414188" > incidents.txt
npx tsx script/investigate-incident-cli.ts --batch incidents.txt

# 최근 24시간 내 신규 인시던트 자동 발견
npx tsx script/investigate-incident-cli.ts --auto-new --since 24h
```

#### 방법 2: Claude Code (MCP)

```
Investigate incident 414186
```

#### 방법 3: REST API

**동기 모드** (결과 즉시 반환):
```bash
curl -X POST http://localhost:40017/api/investigate \
  -H "Content-Type: application/json" \
  -d '{"incident_id": "414186"}'
```

**비동기 모드** (백그라운드 실행):
```bash
# 조사 시작
curl -X POST http://localhost:40017/api/investigate \
  -H "Content-Type: application/json" \
  -d '{"incident_id": "414186", "async": true}'
# 응답: {"job_id": "abc-123", "status": "pending"}

# 상태 확인
curl "http://localhost:40017/api/investigate?job_id=abc-123"

# 작업 취소
curl -X DELETE "http://localhost:40017/api/investigate?job_id=abc-123"
```

#### 방법 4: File Watcher (이벤트 기반)

```bash
# Watcher 시작
npx tsx script/watch-incidents.ts

# 다른 터미널에서 트리거 파일 생성
echo "414186" > data/watch/incident-414186.txt

# 자동으로 조사 시작 → 완료 시 파일 삭제
```

#### 방법 5: Cron Job (자동화)

```bash
# Foreground (테스트)
npx tsx script/cron-investigate.ts --once

# Background (Production)
sudo systemctl start incident-investigation
```

### 📁 출력 파일

**위치**: `public/reports/`

```bash
public/reports/
├── incident_414186_2025-11-10T14-35-57.json         # 전체 데이터 (~140KB)
├── incident_414186_2025-11-10T14-35-57.md           # 마크다운 리포트 (~50KB)
└── incident_414186_korean_2025-11-10T14-35-57.html  # 한글 HTML 보고서 (~80KB)
```

### 🤖 AI 분석 결과 예시

```json
{
  "final_verdict": "needs_investigation",
  "overall_risk_score": 65,
  "confidence": 0.85,
  "executive_summary": "이 인시던트는 레지스트리 수정 및 악성코드 획득 행위를 포함하며, 10개의 위협 파일과 2개의 MITRE 기법이 감지되었습니다. 추가 조사가 필요합니다.",
  "key_findings": [
    "10개의 위협 파일 감지 (threat_level >= 50)",
    "MITRE T1112 (Modify Registry) 감지",
    "MITRE T1588.001 (Obtain Capabilities: Malware) 감지",
    "100개의 CVE 매칭 (대부분 fuzzy match)"
  ],
  "recommendations": [
    "위협 파일 격리 및 상세 분석 수행",
    "레지스트리 변경 사항 검토",
    "엔드포인트 CVE 패칭 진행",
    "네트워크 연결 모니터링 강화"
  ],
  "reasoning": "분석가가 false positive로 판단했으나, 다수의 위협 파일과 MITRE 기법이 감지되어 추가 조사가 권장됩니다."
}
```

### 📊 성능 지표

| 항목 | 값 | 비고 |
|------|------|------|
| **실행 시간** | 8-16초 | 전체 파이프라인 |
| **토큰 사용** | ~5.2K | 분석당 (68% 절감) |
| **비용** | ~$0.001 | gpt-4o-mini 기준 |
| **병렬 처리** | 6개 동시 | 3-5x 속도 향상 |
| **JSON 크기** | ~140KB | 전체 데이터 |
| **Markdown 크기** | ~50KB | 리포트 |

---

## 일간 보고서 시스템

### 📅 개요

매일 발생한 전체 인시던트를 집계하고 분석하여 일일 보안 현황 보고서를 생성합니다.

### 🚀 빠른 시작

```bash
# 어제 날짜로 보고서 생성
./daily-report.sh

# 특정 날짜로 보고서 생성
./daily-report.sh 2025-11-10

# 자동화 스크립트 (AI 분석 자동 포함/제외)
./script/auto-daily-report.sh

# 특정 날짜 자동 보고서
./script/auto-daily-report.sh 2025-11-10
```

### 📊 파이프라인

```
daily-report.sh
    │
    ├─ 1단계: collect-daily-incidents-data.ts (데이터 수집)
    │   ├─ OpenSearch 7개 인덱스 쿼리
    │   ├─ PostgreSQL TI/MITRE 매칭
    │   └─ 출력: daily_incidents_data_[날짜].json
    │
    ├─ 2단계: create-ai-analysis-prompt.ts (프롬프트 생성)
    │   ├─ 데이터 구조화
    │   ├─ JSON 템플릿 포함
    │   └─ 출력: ai_analysis_prompt_[날짜].txt
    │
    ├─ 3단계: run-ai-analysis.ts (AI 분석) [선택적]
    │   ├─ claude --print 실행 또는
    │   ├─ 기본 템플릿 사용
    │   └─ 출력: ai_analysis_[날짜].json ★
    │
    └─ 4단계: generate-final-report.ts (보고서 생성)
        ├─ HTML 보고서 (Tailwind CSS)
        ├─ Markdown 보고서
        └─ JSON 통합 보고서
```

### 📁 생성 파일

```bash
public/reports/data/
├── daily_incidents_data_2025-11-10.json  # 수집된 원본 데이터 (~500KB)
└── ai_analysis_2025-11-10.json            # AI 분석 결과 (~20KB)

public/reports/daily/
├── daily_report_2025-11-10.html           # HTML 보고서 (~150KB)
├── daily_report_2025-11-10.md             # Markdown 보고서 (~80KB)
└── daily_report_2025-11-10.json           # JSON 통합 보고서 (~520KB)

/tmp/
└── auto-daily-report-2025-11-10.log       # 실행 로그
```

### 🎯 AI 분석 결과 구조

```json
{
  "executive_summary": "2025-11-10 발생한 61건의 인시던트 중 44.3%가 False Positive로 판단되었으며, 4-6건의 실제 위협이 확인되었습니다.",

  "threat_assessment": {
    "overall_risk_level": "low",
    "risk_score": 25,
    "confidence": 85,
    "key_findings": [
      "Critical 심각도: 0건",
      "High 심각도: 8건 (주로 레지스트리 수정)",
      "Medium 심각도: 35건",
      "Low 심각도: 18건",
      "False Positive 비율: 44.3%"
    ]
  },

  "incident_analysis": {
    "critical_incidents_summary": "Critical 심각도 인시던트 없음",
    "false_positive_rate": "44.3%",
    "true_threats_count": "4-6건",
    "patterns_detected": [
      "레지스트리 수정 (MITRE T1112) - 8건",
      "악성코드 획득 (MITRE T1588.001) - 3건",
      "프로세스 인젝션 의심 - 2건"
    ]
  },

  "recommendations": {
    "immediate_actions": [
      "High 심각도 8건 중 False Positive가 아닌 2-3건 우선 검토",
      "MITRE T1112 패턴의 정상 행위 whitelist 추가",
      "CVE 패칭 우선순위: CVE-2023-XXXX (CVSS 9.8)"
    ],
    "short_term": [
      "False Positive 패턴 튜닝 (현재 44.3% → 목표 30%)",
      "EDR 룰 최적화 (레지스트리 수정 관련)",
      "엔드포인트 에이전트 업데이트 확인"
    ],
    "long_term": [
      "MITRE ATT&CK 커버리지 확대",
      "TI 데이터베이스 주기적 업데이트",
      "자동화된 플레이북 구축"
    ]
  },

  "security_posture_assessment": {
    "overall_grade": "B",
    "strengths": [
      "EDR 커버리지 양호 (29,578 incidents 수집)",
      "TI 상관분석 활발 (PostgreSQL 통합)",
      "자동화 시스템 안정적 운영"
    ],
    "weaknesses": [
      "False Positive 비율 높음 (44.3%)",
      "Critical 인시던트 대응 프로세스 미검증",
      "주간/월간 트렌드 분석 부재"
    ],
    "improvement_priority": [
      "1순위: False Positive 튜닝",
      "2순위: 고심각도 인시던트 플레이북",
      "3순위: 트렌드 분석 대시보드"
    ]
  }
}
```

### 🔧 실행 예시

```bash
$ ./daily-report.sh 2025-11-10

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  📊 일간 보안 보고서 생성 시작
  날짜: 2025-11-10
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1단계: 데이터 수집
✅ 61건의 인시던트 조회 완료
✅ 20개 인시던트 상세 분석 완료

2단계: AI 분석 프롬프트 생성
✅ 프롬프트 생성 완료 (9,197자)

3단계: Claude AI 분석 실행
🤖 Claude AI 분석 실행 중...
✅ AI 분석 완료!

4단계: 최종 보고서 생성
✅ HTML 보고서 생성 완료!
✅ Markdown 보고서 생성 완료!
✅ JSON 보고서 생성 완료!

📋 AI 분석 미리보기:
  위험도: LOW (25/100)
  보안 등급: B
  False Positive: 44.3%

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ 보고서 생성 완료!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📄 생성된 파일:
  • public/reports/daily/daily_report_2025-11-10.html
  • public/reports/daily/daily_report_2025-11-10.md
  • public/reports/daily/daily_report_2025-11-10.json

🌐 웹 브라우저에서 확인:
  http://localhost:40017/reports/daily/daily_report_2025-11-10.html
```

---

## 주간 보고서 시스템

### 📅 개요

7일간의 인시던트 트렌드를 분석하여 주간 보안 현황 보고서를 생성합니다.

### 🚀 사용 방법

```bash
# 지난 7일 주간 보고서
./script/generate-weekly-report.sh

# 특정 날짜 기준 7일 보고서
./script/generate-weekly-report.sh 2025-11-10

# MCP 버전
./script/generate-weekly-report-mcp.sh
```

### 📁 생성 파일

```bash
public/reports/weekly/
├── weekly_report_2025-W45.html           # HTML 보고서
├── weekly_report_2025-W45.md             # Markdown 보고서
└── weekly_report_2025-W45.json           # JSON 데이터
```

### 📊 주간 보고서 내용

1. **Executive Summary**
   - 주간 총 인시던트 수
   - 전주 대비 증감율
   - 주요 위협 트렌드

2. **일별 트렌드 차트**
   - 일별 인시던트 발생 건수
   - 심각도별 분포

3. **Top 10 위협**
   - MITRE ATT&CK 기법
   - 공격 벡터
   - 영향받은 엔드포인트

4. **보안 메트릭**
   - 평균 대응 시간
   - False Positive 비율
   - 해결률

5. **권장 사항**
   - 즉시 조치사항
   - 중장기 개선사항

---

## Claude Code 통합

### 🎯 고품질 보고서 생성

Claude Sonnet 4.5의 강력한 추론 능력을 활용한 심층 분석 보고서입니다.

### 🚀 사용 방법

```bash
# 단일 인시던트 조사
claude --print "Investigate incident 414186"

# 여러 인시던트 조사
claude --print "Investigate incidents 414186, 414187, 414188"

# 주간 보고서
claude --print "Generate weekly security report for last 7 days"

# False Positive 검증
claude --print "Investigate incident 414186 and evaluate the likelihood of this being a false positive"
```

### 📊 프로세스

```
사용자 프롬프트
    ↓
Claude Code
    ↓
MCP: collect_report_data
    ↓
데이터 수집 (OpenSearch + TI)
    ↓
Claude Code로 데이터 반환
    ↓
Claude Sonnet 4.5 분석
    ↓
HTML 보고서 생성
    ↓
파일 저장 + 알림
```

### 🎨 보고서 특징

- **Tailwind CSS** 스타일링
- **Chart.js** 타임라인 차트
- **인터랙티브** 요소 (접기/펼치기)
- **인쇄 최적화**
- **다크모드** 지원

### 📁 출력

```bash
data/reports/
├── incident_414186_2025-11-10T16-30-00.html  # Claude 분석 포함 (~200KB)
└── incident_414186_2025-11-10T16-30-00.json  # 원본 데이터 (~140KB)
```

### 📊 기존 시스템 vs Claude Code 시스템

| 기능 | CLI 자동화 | Claude Code |
|------|-----------|---------------------|
| **AI 모델** | Azure gpt-4o-mini | Claude Sonnet 4.5 |
| **분석 깊이** | 얕음 (500 토큰) | 깊음 (전체 컨텍스트) |
| **보고서 형식** | 마크다운 | HTML (Tailwind + Charts) |
| **시각화** | 없음 | 차트, 타임라인, 매트릭스 |
| **속도** | 빠름 (8-16초) | 느림 (30-60초) |
| **비용** | 저렴 ($0.001) | 비쌈 ($0.02) |
| **용도** | 자동화, 트리아지 | 경영진 보고, 심층 분석 |
| **상태** | ✅ 유지됨 | ✅ 추가됨 |

**결론**: 두 시스템 모두 사용 가능하며, 상황에 따라 선택할 수 있습니다.

---

## 자동화 및 스케줄링

### 🕐 Cron Job 설정

#### 옵션 1: 일간 보고서 (매일 새벽 1시)

```bash
# crontab 편집
crontab -e

# 아래 라인 추가
0 1 * * * cd /www/ib-editor/my-app && ./script/auto-daily-report.sh >> /var/log/daily-report.log 2>&1
```

#### 옵션 2: 주간 보고서 (매주 월요일 오전 9시)

```bash
# 매주 월요일 오전 9시에 지난주 보고서 생성
0 9 * * 1 cd /www/ib-editor/my-app && ./script/generate-weekly-report.sh >> /var/log/weekly-report.log 2>&1
```

#### 옵션 3: 인시던트 자동 조사 (매시간)

```bash
# 매시 정각 실행
0 * * * * cd /www/ib-editor/my-app && npx tsx script/cron-investigate.ts --once >> /var/log/incident-cron.log 2>&1
```

#### 옵션 4: 주말 제외 (월-금만 실행)

```bash
# 월-금 오전 8시에 실행
0 8 * * 1-5 cd /www/ib-editor/my-app && ./script/auto-daily-report.sh >> /var/log/daily-report.log 2>&1
```

### ✅ Cron Job 검증

```bash
# 현재 cron job 목록 확인
crontab -l

# 실행 로그 확인
tail -f /var/log/daily-report.log

# 수동 테스트
cd /www/ib-editor/my-app && ./script/auto-daily-report.sh
```

### 🔔 알림 설정 (선택적)

#### Supabase

```bash
# .env.local
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
```

**테이블 생성**:
```sql
CREATE TABLE incident_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id TEXT NOT NULL,
  report_type TEXT NOT NULL,
  report_path TEXT NOT NULL,
  risk_score INTEGER,
  verdict TEXT,
  generated_at TIMESTAMP WITH TIME ZONE NOT NULL,
  generated_by TEXT NOT NULL,
  incident_count INTEGER,
  status TEXT DEFAULT 'completed',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Slack

```bash
# .env.local
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
```

#### Discord

```bash
# .env.local
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
```

---

## 아키텍처

### 📁 프로젝트 구조

```
/www/ib-editor/my-app/
├── script/                                # 47+ 자동화 스크립트
│   ├── investigate-incident-cli.ts        # CLI 인시던트 조사
│   ├── cron-investigate.ts                # Cron Job 자동 조사
│   ├── watch-incidents.ts                 # File Watcher
│   │
│   ├── collect-daily-incidents-data.ts    # 일간 데이터 수집
│   ├── create-ai-analysis-prompt.ts       # AI 프롬프트 생성
│   ├── run-ai-analysis.ts                 # AI 분석 실행
│   ├── generate-final-report.ts           # 최종 보고서 생성
│   │
│   ├── auto-daily-report.sh               # 일간 보고서 자동화
│   ├── generate-weekly-report.sh          # 주간 보고서
│   │
│   ├── nl-query-parser.ts                 # 자연어 → DSL 변환
│   ├── nl-query-mcp.js                    # NL Query MCP 서버
│   ├── incident-report-mcp.js             # Incident Report MCP 서버
│   ├── claude-investigation-mcp.js        # Claude Investigation MCP 서버
│   │
│   ├── opensearch-executor.ts             # OpenSearch 쿼리 엔진
│   ├── ti-correlator.ts                   # TI 상관 분석 (PostgreSQL)
│   ├── investigation-cache.ts             # 결과 저장/로드
│   ├── ai-data-filter.ts                  # 토큰 최적화 필터
│   ├── ai-parallel-analyzer.ts            # AI 병렬 오케스트레이터
│   │
│   └── ai-analyzers/                      # 7개 AI 분석기
│       ├── analyst-verifier.ts            # 분석가 검증
│       ├── file-hash-analyzer.ts          # 파일 위협 분석
│       ├── network-analyzer.ts            # 네트워크 분석
│       ├── mitre-analyzer.ts              # MITRE 분석
│       ├── cve-analyzer.ts                # CVE 검증
│       ├── endpoint-analyzer.ts           # 엔드포인트 분석
│       └── synthesizer.ts                 # 종합 판단
│
├── public/reports/                        # 생성된 보고서
│   ├── data/                              # 원본 데이터 (JSON)
│   ├── daily/                             # 일간 보고서 (HTML/MD/JSON)
│   ├── weekly/                            # 주간 보고서
│   └── incident_*/                        # 개별 인시던트 분석
│
├── test/                                  # 테스트 스크립트
│   ├── quick-test.sh                      # 빠른 테스트
│   ├── test-azure.sh                      # Azure OpenAI 테스트
│   └── test-mcp-*.sh                      # MCP 서버 테스트
│
├── .mcp.json                              # MCP 서버 설정 (11개)
├── .env.local                             # 환경 변수
│
├── daily-report.sh                        # 일간 보고서 메인 스크립트
│
└── 문서/
    ├── README_INVESTIGATION.md            # 인시던트 조사 시스템
    ├── README-DAILY-REPORT.md             # 일간 보고서
    ├── CRON_SETUP.md                      # Cron Job 설정
    ├── CLAUDE_REPORTS_README.md           # Claude Code 보고서
    └── INCIDENT_REPORTS_COMPREHENSIVE_GUIDE.md  # 이 파일 ★
```

### 🗄️ 데이터베이스

#### 1. OpenSearch (`opensearch:9200` → `20.41.120.173:9200`)

**인덱스**:
- `logs-cortex_xdr-incidents-*` - 인시던트 (~29,578건)
- `logs-cortex_xdr-alerts-*` - 알럿
- `logs-cortex_xdr-files-*` - 파일
- `logs-cortex_xdr-networks-*` - 네트워크 연결
- `logs-cortex_xdr-processes-*` - 프로세스
- `logs-cortex_xdr-endpoints-*` - 엔드포인트
- `logs-cortex_xdr-causality_chains-*` - 인과관계 체인

**인증**: `admin:Admin@123456`

#### 2. PostgreSQL n8n (`postgres:5432/n8n` → `20.41.120.173`)

**스키마**: `ioclog`

**테이블**:
- `ioclog.ioc_log` - IOC 로그 (파일 해시, IP 주소)
- `ioclog.mitre_techniques` - MITRE ATT&CK 기법
- `ioclog.cve_details` - CVE 상세 정보

#### 3. PostgreSQL Editor (`localhost:5432/postgres`)

**테이블**:
- `users` - 사용자 관리
- `dashboard_config` - 대시보드 설정
- `saved_queries` - 저장된 쿼리

### 🔧 MCP 서버 (12개)

**표준 서버**:
1. `next-devtools` - Next.js 개발 도구
2. `chrome-devtools` - 브라우저 디버깅
3. `context7` - 라이브러리 문서
4. `shadcn` - shadcn/ui 컴포넌트
5. `memory` - 지속적 지식 그래프

**데이터베이스 서버**:
6. `postgres-editor` - 로컬 에디터 DB (`localhost:5432/postgres`)
7. `postgres-siem` - SIEM DB (`localhost:5432/siem_db`)
8. `postgres-n8n` - n8n TI DB (`postgres:5432/n8n`)

**커스텀 보안 서버** ⭐:
9. `opensearch` - OpenSearch 쿼리 인터페이스 (포트 8099)
10. `incident-analysis` - 통계, 트렌드, 위협 분석 (포트 8100)
11. `nl-query` - 자연어 → OpenSearch DSL 변환기
12. `claude-investigation` - Claude 기반 한글 보고서 생성

---

### 📘 MCP 서버 상세 설명

#### 1. `next-devtools` MCP
**설명**: Next.js 16+ 개발 도구 (MCP는 기본 활성화)

**사용 예시**:
```
"Show me the Next.js runtime information"
"List all Next.js routes"
"Get Next.js build diagnostics"
```

**도구**:
- `discover_servers` - 실행 중인 Next.js 서버 찾기
- `list_tools` - 사용 가능한 MCP 도구 목록
- `call_tool` - Next.js 런타임 도구 호출

#### 2. `chrome-devtools` MCP
**설명**: Chrome DevTools Protocol - 브라우저 디버깅 및 성능 분석

**사용 예시**:
```
"Take a screenshot of the page"
"Get console messages"
"Analyze network requests"
"Start performance trace"
```

**도구**:
- `navigate_page` - 페이지 이동
- `take_screenshot` - 스크린샷 캡처
- `list_console_messages` - 콘솔 로그 조회
- `list_network_requests` - 네트워크 요청 조회
- `performance_start_trace` - 성능 추적 시작

#### 3. `context7` MCP
**설명**: 최신 라이브러리 문서 (Next.js, React, TypeScript, OpenSearch, Prisma 등)

**사용 예시**:
```
"use context7: Show me Next.js App Router documentation"
"use context7: How do I use React hooks?"
"use context7: OpenSearch query DSL examples"
```

**도구**:
- `resolve-library-id` - 라이브러리 ID 검색
- `get-library-docs` - 문서 가져오기

#### 4. `shadcn` MCP
**설명**: shadcn/ui 컴포넌트 관리

**사용 예시**:
```
"List available shadcn components"
"Show me the button component example"
"Add shadcn dialog component"
```

**도구**:
- `get_project_registries` - 레지스트리 목록
- `search_items_in_registries` - 컴포넌트 검색
- `view_items_in_registries` - 컴포넌트 상세 정보
- `get_item_examples_from_registries` - 사용 예시
- `get_add_command_for_items` - 설치 명령어

#### 5. `memory` MCP
**설명**: 지속적 지식 그래프 - 대화 간 정보 기억

**사용 예시**:
```
"Remember that incident 414186 is a false positive"
"What do you know about user john_doe?"
"Create a knowledge graph for this project"
```

**도구**:
- `create_entities` - 엔티티 생성
- `create_relations` - 관계 생성
- `add_observations` - 관찰 추가
- `search_nodes` - 노드 검색
- `read_graph` - 전체 그래프 읽기

#### 6-8. PostgreSQL MCP 서버
**설명**: PostgreSQL 데이터베이스 쿼리

**사용 예시**:
```sql
-- postgres-n8n 예시
"Query the n8n database: SELECT COUNT(*) FROM ioclog.ioc_log WHERE threat_verdict = 'threat'"
"Show me recent IOC logs from PostgreSQL"
```

**도구**:
- `query` - SQL 쿼리 실행 (읽기 전용)

#### 9. `opensearch` MCP ⭐
**설명**: OpenSearch MCP - 보안 로그 검색 및 쿼리 (원격 서버 포트 8099)

**연결 정보**:
- URL: `http://20.41.120.173:8099`
- 인덱스: `logs-cortex_xdr-*`

**사용 예시**:
```
"Search OpenSearch for high severity incidents"
"Get incident 414186 from OpenSearch"
"Count alerts from last 7 days"
```

**도구**:
- `Index_Lister` - 인덱스 목록 조회
- `IndexMappingTool` - 인덱스 매핑 정보
- `Index_Searcher` - Query DSL 검색
- `Cluster_Health_Checker` - 클러스터 상태
- `CountTool` - 문서 카운트
- `MsearchTool` - 다중 검색

**예제**:
```json
{
  "tool": "Index_Searcher",
  "parameters": {
    "index": "logs-cortex_xdr-incidents-*",
    "query": {
      "query": {
        "bool": {
          "must": [
            {"match": {"incident_id": "414186"}}
          ]
        }
      }
    }
  }
}
```

#### 10. `incident-analysis` MCP ⭐
**설명**: 인시던트 분석 MCP - 통계, 트렌드, 차트, 위협 분석, 보고서 생성 (원격 서버 포트 8100)

**연결 정보**:
- URL: `http://20.41.120.173:8100`
- 언어: 한국어 출력

**사용 예시**:
```
"Show me incident statistics for last 7 days"
"Create incident trend chart"
"Analyze top threats"
"Generate comprehensive incident report"
```

**도구**:
1. **get_incident_statistics**
   - 인시던트 통계 데이터를 마크다운 테이블로 생성
   - 파라미터:
     - `index_pattern` (기본: `logs-cortex_xdr-incidents-*`)
     - `days` (기본: 7일)
     - `severity_field` (기본: `severity`)

2. **create_incident_trend_chart**
   - 시간별/일별 트렌드 차트 생성
   - 파라미터:
     - `index_pattern`
     - `days` (기본: 7일)
     - `interval` (`1h` 또는 `1d`)

3. **analyze_top_threats**
   - 상위 위협 유형 분석 및 차트 생성
   - 파라미터:
     - `index_pattern`
     - `days` (기본: 7일)
     - `threat_field` (기본: `threat_type`)
     - `top_count` (기본: 10개)

4. **generate_incident_report**
   - 종합 인시던트 분석 보고서 생성
   - 파라미터:
     - `index_pattern`
     - `days` (기본: 7일)
     - `report_title` (기본: "보안 인시던트 분석 보고서")

5. **analyze_geographic_distribution**
   - 지리적 분포 분석 및 시각화
   - 파라미터:
     - `index_pattern`
     - `days` (기본: 7일)
     - `geo_field` (기본: `geoip.country_name`)

**예제**:
```json
{
  "tool": "get_incident_statistics",
  "parameters": {
    "index_pattern": "logs-cortex_xdr-incidents-*",
    "days": 7,
    "severity_field": "severity"
  }
}
```

**출력 예시**:
```markdown
# 인시던트 통계 (최근 7일)

| 심각도 | 건수 | 비율 |
|--------|------|------|
| Critical | 0 | 0.0% |
| High | 8 | 13.1% |
| Medium | 35 | 57.4% |
| Low | 18 | 29.5% |
| **총계** | **61** | **100%** |
```

#### 11. `nl-query` MCP ⭐
**설명**: NL-Query MCP - 자연어 질문을 OpenSearch 쿼리로 변환하고 실행

**연결 정보**:
- 스크립트: `/www/ib-editor/my-app/script/nl-query-mcp.js`
- AI 모델: Azure OpenAI `gpt-4o-mini` (기본)

**사용 예시**:
```
"최근 7일간 Critical 심각도 인시던트 개수"
"어제 발생한 알럿 목록 보여줘"
"이번 달 인시던트 보고서"
"지난주 High 심각도 Microsoft Defender 인시던트"
```

**도구**:
1. **nl_query**
   - 자연어 질문을 OpenSearch 쿼리로 변환하고 실행
   - 파라미터:
     - `query` (필수) - 자연어 질문 (한국어 또는 영어)
     - `model` (선택) - AI 모델 (기본: `azure-gpt-4o-mini`)
       - `azure-gpt-4o-mini` (권장)
       - `claude-3-5-sonnet`
       - `gemini-2.0-flash`
       - `azure-gpt-35-turbo`
       - `claude-3-haiku`
       - `gemini-2.5-pro`
     - `execute` (선택) - 쿼리 실행 여부 (기본: `true`)
     - `format` (선택) - 결과 형식 (기본: `["markdown", "json"]`)

2. **test_parse**
   - 파싱만 테스트 (쿼리 실행 안 함)
   - 파라미터:
     - `query` (필수) - 자연어 질문
     - `model` (선택) - AI 모델

**지원 기능**:
- **30+ 날짜 표현**: "어제", "지난주", "최근 7일", "3일 전", "이번 달"
- **8가지 데이터 타입**: incidents, alerts, files, networks, processes, endpoints, causality_chains, cves
- **5가지 쿼리 타입**: search, aggregation, filter, range, stats

**예제**:
```json
{
  "tool": "nl_query",
  "parameters": {
    "query": "최근 7일간 Critical 심각도 인시던트 개수",
    "model": "azure-gpt-4o-mini",
    "execute": true,
    "format": ["markdown", "json"]
  }
}
```

**파싱 결과 예시**:
```json
{
  "queryType": "aggregation",
  "dataTypes": ["incidents"],
  "indexPattern": "logs-cortex_xdr-incidents-*",
  "filters": [
    {
      "field": "severity",
      "operator": "equals",
      "value": "critical"
    }
  ],
  "dateRange": {
    "from": "now-7d",
    "to": "now"
  }
}
```

**실행 결과 예시**:
```markdown
# 쿼리 결과

**총 건수**: 0건

## 인덱스
- logs-cortex_xdr-incidents-*

## 필터
- severity = critical
- @timestamp: 최근 7일

## 실행 시간
23ms
```

#### 12. `claude-investigation` MCP ⭐
**설명**: Claude Investigation - Claude Code가 직접 인시던트를 분석하고 한글 보고서 생성

**연결 정보**:
- 스크립트: `/www/ib-editor/my-app/script/claude-investigation-mcp.js`
- 출력: 한글 HTML 보고서

**사용 프로세스**:
```
1. collect_incident_data로 데이터 수집
   ↓
2. Claude Code가 데이터를 분석하고 AI 의견 작성
   ↓
3. save_analysis_and_generate_report로 보고서 생성
```

**사용 예시**:
```
"Investigate incident 414186 using claude-investigation MCP"
```

**도구**:
1. **collect_incident_data**
   - 인시던트 데이터 수집 (AI 분석 없이 원본 데이터만)
   - 파라미터:
     - `incident_id` (필수) - 인시던트 ID
   - 출력:
     - 인시던트 상세 정보
     - 알럿, 파일, 네트워크, 프로세스, 엔드포인트
     - TI 상관분석 결과
     - MITRE ATT&CK 매핑
     - CVE 상세 정보

2. **save_analysis_and_generate_report**
   - Claude가 작성한 AI 분석 의견을 저장하고 한글 HTML 보고서 생성
   - 파라미터:
     - `incident_id` (필수)
     - `analysis` (필수) - Claude가 작성한 분석 객체
       - `incident_detail` - 인시던트 상세 분석 (한글)
       - `endpoint_analysis` - 엔드포인트 분석 (한글)
       - `file_artifacts` - 파일 아티팩트 분석 (한글)
       - `network_artifacts` - 네트워크 분석 (한글)
       - `mitre_analysis` - MITRE ATT&CK 분석 (한글)
       - `final_verdict` - 최종 종합 의견
         - `verdict` - 판정 (`false_positive`, `true_positive`, `needs_investigation`)
         - `risk_score` - 위험 점수 (0-100)
         - `confidence` - 신뢰도 (0-100)
         - `summary` - 종합 요약 (한글)
         - `key_findings` - 주요 발견사항 목록

**예제**:
```json
// 1단계: 데이터 수집
{
  "tool": "collect_incident_data",
  "parameters": {
    "incident_id": "414186"
  }
}

// 2단계: Claude가 분석 작성 (프롬프트 예시)
"위 데이터를 분석하여 다음 형식으로 한글 보고서를 작성해주세요:
- incident_detail: 인시던트 상세 분석
- endpoint_analysis: 엔드포인트 분석
- file_artifacts: 파일 아티팩트 분석
- network_artifacts: 네트워크 분석
- mitre_analysis: MITRE ATT&CK 분석
- final_verdict: 최종 판정 (verdict, risk_score, confidence, summary, key_findings)"

// 3단계: 보고서 생성
{
  "tool": "save_analysis_and_generate_report",
  "parameters": {
    "incident_id": "414186",
    "analysis": {
      "incident_detail": "이 인시던트는...",
      "endpoint_analysis": "엔드포인트 ktc-d111783에서...",
      "file_artifacts": "10개의 위협 파일이 감지...",
      "network_artifacts": "87개의 네트워크 연결...",
      "mitre_analysis": "MITRE T1112 (레지스트리 수정)...",
      "final_verdict": {
        "verdict": "needs_investigation",
        "risk_score": 65,
        "confidence": 85,
        "summary": "추가 조사가 필요합니다.",
        "key_findings": ["10개의 위협 파일 감지", "MITRE T1112 감지"]
      }
    }
  }
}
```

**출력 파일**:
```bash
public/reports/
└── incident_414186_korean_2025-11-10T14-35-57.html  # 한글 HTML 보고서 (~80KB)
```

---

### 🔧 MCP 서버 설정 (.mcp.json)

전체 MCP 서버 설정은 `/www/ib-editor/my-app/.mcp.json` 파일에 정의되어 있습니다.

**주요 환경 변수**:
```json
{
  "nl-query": {
    "env": {
      "AZURE_OPENAI_ENDPOINT": "https://etech-openai.openai.azure.com/",
      "AZURE_OPENAI_DEPLOYMENT": "gpt-4o-mini",
      "OPENSEARCH_URL": "http://opensearch:9200",
      "OPENSEARCH_USER": "admin",
      "OPENSEARCH_PASSWORD": "Admin@123456"
    }
  },
  "claude-investigation": {
    "env": {
      "OPENSEARCH_URL": "http://opensearch:9200",
      "OPENSEARCH_USER": "admin",
      "OPENSEARCH_PASSWORD": "Admin@123456",
      "DATABASE_URL": "postgresql://postgres:postgres@postgres:5432/n8n?schema=ioclog"
    }
  }
}
```

**MCP 서버 재시작**:
`.mcp.json` 파일을 수정한 후에는 **Claude Code를 완전히 재시작**해야 합니다 (단순 새 대화가 아니라 앱 자체를 종료했다가 재시작).

---

### 📚 MCP 사용 예시

#### 예시 1: 자연어 쿼리 → 결과

```
"최근 7일간 Critical 심각도 인시던트 개수"
```

**처리 과정**:
1. Claude Code가 `nl-query` MCP 도구 인식
2. `nl_query` 도구 호출
3. 자연어 → OpenSearch DSL 변환 (Azure OpenAI)
4. OpenSearch 쿼리 실행
5. Markdown + JSON 결과 반환

#### 예시 2: 인시던트 통계 + 차트

```
"Show me incident statistics and trend chart for last 7 days"
```

**처리 과정**:
1. `incident-analysis` MCP 도구 인식
2. `get_incident_statistics` 호출 → 마크다운 테이블
3. `create_incident_trend_chart` 호출 → 차트 생성
4. 통합 결과 반환

#### 예시 3: Claude 심층 분석

```
"Investigate incident 414186 using claude-investigation"
```

**처리 과정**:
1. `collect_incident_data` 호출 → 원본 데이터 수집
2. Claude가 데이터 분석 및 AI 의견 작성
3. `save_analysis_and_generate_report` 호출 → 한글 HTML 보고서 생성
4. 파일 경로 반환

---

## 트러블슈팅

### ❌ 일반적인 문제

#### 1. "Incident not found"

```bash
# OpenSearch 연결 확인
curl -u admin:Admin@123456 "http://opensearch:9200/_cat/indices/logs-cortex_xdr-incidents-*"

# 인시던트 존재 확인
curl -u admin:Admin@123456 "http://opensearch:9200/logs-cortex_xdr-incidents-*/_search" \
  -H 'Content-Type: application/json' \
  -d '{"query":{"match":{"incident_id":"414186"}}}'
```

#### 2. "TI correlation failed"

```bash
# PostgreSQL 연결 확인
psql -U postgres -h postgres -d n8n -c "SELECT COUNT(*) FROM ioclog.ioc_log;"

# 환경 변수 확인
echo $DATABASE_URL
```

#### 3. "AI analysis failed"

```bash
# Azure OpenAI API 키 확인
env | grep AZURE_OPENAI

# API 연결 테스트
curl -H "api-key: $AZURE_OPENAI_API_KEY" "$AZURE_OPENAI_ENDPOINT/openai/deployments?api-version=2023-05-15"
```

#### 4. "Disk full"

```bash
# 30일 이상 된 파일 삭제
find public/reports/ -name "*.json" -mtime +30 -delete
find public/reports/ -name "*.md" -mtime +30 -delete

# 디스크 사용량 확인
du -sh public/reports/*
```

#### 5. "cron job이 실행되지 않음"

```bash
# cron 서비스 상태 확인
sudo systemctl status cron

# cron 로그 확인
sudo tail -f /var/log/syslog | grep CRON

# 수동 실행으로 에러 확인
cd /www/ib-editor/my-app && ./script/auto-daily-report.sh
```

#### 6. "권한 문제"

```bash
# 실행 권한 확인
ls -la /www/ib-editor/my-app/script/*.sh

# 실행 권한 부여
chmod +x /www/ib-editor/my-app/script/*.sh
```

#### 7. "OpenSearch connection refused"

```bash
# OpenSearch 상태 확인
curl -u "admin:Admin@123456" "http://opensearch:9200/_cluster/health?v"

# 호스트 매핑 확인
cat /etc/hosts | grep opensearch
```

#### 8. "MCP 도구가 인식되지 않음"

```bash
# Claude Code 완전 재시작 필요
# (단순 새 대화가 아니라 앱 자체를 종료했다가 재시작)

# .mcp.json 경로 확인
cat /www/ib-editor/my-app/.mcp.json | grep nl-query -A 10

# 스크립트 파일 존재 확인
ls -la /www/ib-editor/my-app/script/nl-query-mcp.js
```

---

## 📚 관련 문서

- **README_INVESTIGATION.md** - 인시던트 조사 시스템 상세 문서
- **README-DAILY-REPORT.md** - 일간 보고서 생성 가이드
- **CRON_SETUP.md** - 자동화 스케줄링 설정
- **CLAUDE_REPORTS_README.md** - Claude Code 고품질 보고서
- **NEXT_CONVERSATION.md** - 다음 대화 재개 가이드
- **CLAUDE.md** - Claude Code 프로젝트 가이드

---

## 🎓 사용 사례

### 사례 1: SOC 분석가 (Interactive)

**상황**: 보안팀이 인시던트 414186을 False Positive로 의심

**해결**:
```bash
# Claude Code에서
"Investigate incident 414186"

# 또는 CLI로
npx tsx script/investigate-incident-cli.ts --incident-id 414186
```

**결과**: 8-16초 내에 JSON + Markdown + HTML 보고서 생성

### 사례 2: 자동화된 SIEM (Production)

**상황**: 매일 새벽 1시에 전날 인시던트 자동 분석

**해결**:
```bash
# Crontab 등록
0 1 * * * cd /www/ib-editor/my-app && ./script/auto-daily-report.sh >> /var/log/daily-report.log 2>&1
```

**결과**: HTML + Markdown + JSON 보고서 자동 생성

### 사례 3: 외부 시스템 연동 (API)

**상황**: 티켓팅 시스템에서 신규 인시던트 수신 시 자동 조사

**해결**:
```python
import requests

# 티켓팅 시스템에서 신규 인시던트 수신 시
response = requests.post('http://localhost:40017/api/investigate', json={
    'incident_id': ticket.incident_id,
    'async': True
})

# 결과를 티켓에 자동 첨부
```

### 사례 4: 파일 기반 트리거 (Watcher)

**상황**: SIEM이 CSV 내보내기 → 자동 조사

**해결**:
```bash
# SIEM이 CSV 내보내기 → 스크립트가 incident ID 추출 → 파일 생성
cat incidents_export.csv | awk -F',' '{print $1}' | while read id; do
    echo "$id" > data/watch/incident-$id.txt
done

# File Watcher가 자동으로 모든 인시던트 조사
```

### 사례 5: 경영진 주간 보고 (Executive)

**상황**: 매주 월요일 경영진에게 주간 보안 현황 보고

**해결**:
```bash
# Crontab 등록
0 9 * * 1 cd /www/ib-editor/my-app && ./script/generate-weekly-report.sh >> /var/log/weekly-report.log 2>&1
```

**결과**: Executive Summary + 트렌드 차트 + 권장사항

---

## 🚀 빠른 참조

### 명령어 치트시트

```bash
# 인시던트 조사
npx tsx script/investigate-incident-cli.ts --incident-id 414186

# 일간 보고서 (어제)
./daily-report.sh

# 일간 보고서 (특정 날짜)
./daily-report.sh 2025-11-10

# 주간 보고서
./script/generate-weekly-report.sh

# 자동화 일간 보고서
./script/auto-daily-report.sh

# 빠른 테스트
./test/quick-test.sh

# Cron Job (테스트)
npx tsx script/cron-investigate.ts --once

# File Watcher
npx tsx script/watch-incidents.ts
```

### 웹 브라우저 접근

```
# 일간 보고서
http://localhost:40017/reports/daily/daily_report_2025-11-10.html

# 주간 보고서
http://localhost:40017/reports/weekly/weekly_report_2025-W45.html

# 개별 인시던트
http://localhost:40017/reports/incident_414186_2025-11-10T14-35-57.html
```

### 로그 확인

```bash
# 일간 보고서 로그
tail -f /var/log/daily-report.log

# 주간 보고서 로그
tail -f /var/log/weekly-report.log

# 인시던트 조사 로그
tail -f /var/log/incident-cron.log

# 상세 로그 (날짜별)
tail -f /tmp/auto-daily-report-2025-11-10.log
```

---

## 📊 성능 요약

| 시스템 | 실행 시간 | 비용 | 출력 형식 | 자동화 |
|--------|----------|------|----------|--------|
| **인시던트 조사** | 8-16초 | $0.001 | JSON + MD + HTML | ✅ Cron/API/Watcher |
| **일간 보고서** | 30-60초 | $0.02 (AI 포함) | HTML + MD + JSON | ✅ Cron |
| **주간 보고서** | 2-3분 | $0.10 (AI 포함) | HTML + MD + JSON | ✅ Cron |
| **Claude Code 보고서** | 30-60초 | $0.02 | HTML (고품질) | ❌ 수동 |

---

## ✅ 체크리스트

### 초기 설정

- [ ] `.env.local` 파일 생성 및 환경 변수 설정
- [ ] OpenSearch 연결 테스트
- [ ] PostgreSQL 연결 테스트
- [ ] Azure OpenAI API 키 설정
- [ ] 스크립트 실행 권한 부여 (`chmod +x script/*.sh`)

### 수동 테스트

- [ ] 단일 인시던트 조사 성공
- [ ] 일간 보고서 생성 성공
- [ ] 주간 보고서 생성 성공
- [ ] Claude Code MCP 도구 인식

### 자동화 설정

- [ ] Cron job 등록 (일간 보고서)
- [ ] Cron job 등록 (주간 보고서)
- [ ] Cron job 등록 (인시던트 자동 조사)
- [ ] 로그 디렉토리 생성 (`/var/log/`)
- [ ] 디스크 공간 모니터링 설정

### 알림 설정 (선택)

- [ ] Supabase 테이블 생성
- [ ] Slack 웹훅 설정
- [ ] Discord 웹훅 설정
- [ ] 이메일 SMTP 설정

---

## 📞 지원

문제가 발생하면:

1. **로그 확인**:
   ```bash
   # CLI
   npx tsx script/investigate-incident-cli.ts --incident-id 414186 2>&1 | tee debug.log

   # 일간 보고서
   tail -f /var/log/daily-report.log

   # Cron
   sudo journalctl -u cron -f
   ```

2. **환경 변수 확인**:
   ```bash
   cat .env.local | grep -E "OPENSEARCH|AZURE|DATABASE"
   ```

3. **상태 파일 확인**:
   ```bash
   ls -lh public/reports/ | tail -20
   ```

---

**구축 일자**: 2025-11-10
**버전**: 2.0.0
**상태**: ✅ 프로덕션 운영 중
**작성자**: Claude Code AI Assistant
