# 일간 보안 보고서 자동화 시스템 구축 현황

**작성일**: 2025-11-10
**작업 상태**: AI 분석 대기 중

---

## 📋 목차

1. [완료된 작업](#완료된-작업)
2. [현재 상황](#현재-상황)
3. [다음 단계](#다음-단계)
4. [시스템 구조](#시스템-구조)
5. [문제 해결 이력](#문제-해결-이력)

---

## ✅ 완료된 작업

### 1. 에러 처리 시스템 구현

**사용자 피드백 반영**: "에러를 다른걸로 대체 하게 되면 알 수가 없잖아"

#### 구현된 기능

- **Supabase 에러 알림 시스템**
  - 테이블: `error_notifications` (SQL 스키마 완성)
  - 에러 유형: `ai_analysis_failed`, `data_collection_failed`, `report_generation_failed`
  - 심각도: `critical`, `high`, `medium`, `low`
  - RLS 정책, 인덱스, 뷰, 함수 완비

- **에러 알림 전송 스크립트**
  - 파일: `script/send-error-notification.ts`
  - Supabase REST API 연동
  - 전송 실패 시 로컬 백업: `/tmp/error_notification_*.json`

- **자동 보고서 생성 스크립트 개선**
  - 파일: `script/auto-daily-report.sh`
  - ❌ 기본 템플릿 자동 생성 제거 (에러 마스킹 방지)
  - ✅ 상세한 에러 로깅 추가
  - ✅ 원인 분석 및 조치 가이드 제공
  - ✅ Supabase 알림 전송
  - ✅ 에러 플래그 파일 생성
  - ✅ JSON 유효성 검증 (jq)
  - ✅ 스크립트 종료 (exit 1)

### 2. CVE 추출 로직 개선

- Endpoint 데이터가 없을 때 Description/Alerts에서 CVE 패턴 추출
- 정규식: `/CVE-\d{4}-\d{4,7}/gi`
- Host 통계 추출: `hostname:guid` 형식 파싱

### 3. MITRE Attack Chain 분석 추가

- 7단계 공격 체인 분석
  1. Initial Access
  2. Execution
  3. Persistence
  4. Privilege Escalation
  5. Defense Evasion
  6. Collection
  7. Command & Control

- Kill Chain 완성도 평가
- HTML/Markdown 시각화

### 4. 데이터 수집 완료

| 날짜 | 인시던트 | 파일 크기 | 데이터 파일 | AI 프롬프트 | AI 분석 | 보고서 |
|------|----------|-----------|-------------|-------------|---------|--------|
| 2025-08-24 | 10건 | 268KB | ✅ | ✅ (7,845자) | ❌ | ❌ |
| 2025-09-07 | 11건 | 440KB | ✅ | ✅ (9,162자) | ❌ | ❌ |
| 2025-09-12 | 28건 | 1.3MB | ✅ | ✅ (11,936자) | ❌ | ❌ |
| 2025-11-09 | 125건 | 3.3MB | ✅ | ✅ (10,091자) | ❌ | ❌ |
| 2025-11-10 | 13건 | 381KB | ✅ | ✅ | ✅ | ✅ |

---

## 🔍 현재 상황

### Supabase 연동 상태

**문제**: `error_notifications` 테이블 404 에러

```
❌ Supabase 알림 전송 실패
   오류: Supabase API 오류 (404): {}
   📁 로컬 로그 저장: /tmp/error_notification_*.json
```

**원인**: Supabase에 테이블이 생성되지 않음

**영향**: 에러 알림은 로컬 파일로 백업되어 시스템 동작에는 문제 없음

**해결 방법**: `supabase_error_notifications.sql` 실행 필요

### AI 분석 대기 중

4개 날짜의 AI 분석 프롬프트가 생성되어 대기 중:

```
public/reports/data/ai_analysis_prompt_2025-08-24.txt
public/reports/data/ai_analysis_prompt_2025-09-07.txt
public/reports/data/ai_analysis_prompt_2025-09-12.txt
public/reports/data/ai_analysis_prompt_2025-11-09.txt
```

---

## 🚀 다음 단계

### 1단계: Supabase 테이블 생성 (선택)

```bash
# Supabase SQL Editor에서 실행
cat supabase_error_notifications.sql
```

### 2단계: AI 분석 실행 (필수)

**옵션 A: 자동 실행 (Gemini 2.5)**

```bash
# 각 날짜별로 실행 (약 5-10분 소요)
npx tsx script/run-ai-analysis.ts 2025-08-24
npx tsx script/run-ai-analysis.ts 2025-09-07
npx tsx script/run-ai-analysis.ts 2025-09-12
npx tsx script/run-ai-analysis.ts 2025-11-09
```

**옵션 B: 수동 실행 (Claude Code)**

```bash
# 프롬프트 확인
cat public/reports/data/ai_analysis_prompt_2025-08-24.txt

# Claude Code에 붙여넣기 후
# 응답을 public/reports/data/ai_analysis_2025-08-24.json에 저장
```

### 3단계: 보고서 생성

AI 분석 완료 후:

```bash
# 개별 날짜
./script/auto-daily-report.sh 2025-08-24

# 또는 모두 실행
for date in 2025-08-24 2025-09-07 2025-09-12 2025-11-09; do
  ./script/auto-daily-report.sh $date
done
```

### 4단계: Cron Job 설정

```bash
# crontab 편집
crontab -e

# 매일 새벽 1시 자동 실행
0 1 * * * cd /www/ib-editor/my-app && ./script/auto-daily-report.sh >> /var/log/daily-report-cron.log 2>&1
```

---

## 🏗️ 시스템 구조

### 파일 구조

```
/www/ib-editor/my-app/
├── script/
│   ├── collect-daily-incidents-data.ts      # 1단계: 데이터 수집
│   ├── create-ai-analysis-prompt.ts          # 2단계: 프롬프트 생성
│   ├── run-ai-analysis.ts                    # 3단계: AI 분석 (자동)
│   ├── generate-final-report.ts              # 4단계: 보고서 생성
│   ├── send-error-notification.ts            # 에러 알림 전송
│   └── auto-daily-report.sh                  # 통합 자동화 스크립트
├── public/reports/
│   ├── data/
│   │   ├── daily_incidents_data_*.json       # 수집된 인시던트 데이터
│   │   ├── ai_analysis_prompt_*.txt          # AI 분석 프롬프트
│   │   └── ai_analysis_*.json                # AI 분석 결과
│   └── daily/
│       ├── daily_report_*.html               # 최종 보고서 (HTML)
│       ├── daily_report_*.md                 # 최종 보고서 (Markdown)
│       └── daily_report_*.json               # 최종 보고서 (JSON)
├── supabase_error_notifications.sql          # Supabase 테이블 스키마
└── CRON_SETUP.md                             # Cron 설정 가이드
```

### 데이터 흐름

```
OpenSearch (logs-cortex_xdr-incidents-*)
  ↓
[1] collect-daily-incidents-data.ts
  ↓
daily_incidents_data_*.json (인시던트 + 알럿 + 네트워크)
  ↓
[2] create-ai-analysis-prompt.ts
  ↓
ai_analysis_prompt_*.txt (프롬프트 텍스트)
  ↓
[3] run-ai-analysis.ts (Gemini 2.5) 또는 수동 (Claude Code)
  ↓
ai_analysis_*.json (AI 분석 결과)
  ↓
[4] generate-final-report.ts
  ↓
daily_report_*.html/md/json (최종 보고서)
```

### 에러 처리 흐름

```
auto-daily-report.sh 실행
  ↓
단계별 검증 (데이터 파일, AI 분석 파일)
  ↓
에러 발생 시
  ↓
1. 상세 로그 출력 (파일 경로, 날짜, 호스트, 타임스탬프)
2. 원인 분석 출력 (3가지 가능한 원인)
3. 필수 조치 가이드 출력
4. send-error-notification.ts 호출
  ↓
Supabase 전송 시도
  ↓
성공: error_notifications 테이블에 기록
실패: /tmp/error_notification_*.json에 백업
  ↓
에러 플래그 파일 생성: /tmp/daily_report_error_*.flag
  ↓
스크립트 종료 (exit 1)
```

---

## 🔧 문제 해결 이력

### 1. 엔드포인트 및 CVE 추출 실패

**문제**: Endpoint 데이터가 없어서 CVE 추출 안 됨

**해결**: Description/Alerts 필드에서 정규식으로 CVE 추출

```typescript
const cvePattern = /CVE-\d{4}-\d{4,7}/gi;
const matches = description.match(cvePattern);
```

**파일**: `script/generate-final-report.ts:303-369`

### 2. 위험 해시 누락

**문제**: `7858f3b387fba2121cdc2e3762037a93ec3f2b961c872fb32de7a41188262e08` 해시가 보고서에 미표시

**원인**: 888-000525 인시던트가 초기 수집에서 누락 (8건 → 13건)

**해결**: 데이터 재수집 및 AI 분석 업데이트

### 3. MITRE 공격 체인 분석 누락

**문제**: "MITRE 공격 체인 분석이 없습니다" 표시

**원인**: `ai.mitre_attack_analysis?.attack_chain_assessment` 필드명 오류

**해결**:
- AI 분석 JSON에 `attack_chain` 객체 추가 (7단계)
- HTML 시각화 (Purple Gradient Flowchart)
- Kill Chain 완성도 평가 (85%)

**파일**: `script/generate-final-report.ts:1137-1228`

### 4. 에러 마스킹 문제 (Critical)

**사용자 피드백**: "AI 분석 확인: AI 분석 파일이 없으면 기본 템플릿 자동 생성? 이건 아니야"

**문제**: AI 분석 실패 시 기본 템플릿 생성으로 에러 숨김

**해결**:
1. 기본 템플릿 생성 로직 완전 제거
2. 상세한 에러 로깅 추가
3. Supabase 에러 알림 시스템 구현
4. 에러 플래그 파일 생성
5. 스크립트 종료 (exit 1)

**파일**: `script/auto-daily-report.sh:134-194`

---

## 📊 통계

### 에러 발생 현황

| 날짜 | 에러 유형 | 심각도 | 상태 | 에러 플래그 | 로컬 백업 |
|------|-----------|--------|------|-------------|-----------|
| 2025-08-24 | ai_analysis_failed | critical | Supabase 전송 실패 (404) | ✅ | ✅ |
| 2025-09-07 | ai_analysis_failed | critical | Supabase 전송 실패 (404) | ✅ | ✅ |
| 2025-09-12 | ai_analysis_failed | critical | Supabase 전송 실패 (404) | ✅ | ✅ |
| 2025-11-09 | ai_analysis_failed | critical | Supabase 전송 실패 (404) | ✅ | ✅ |

### 스크립트 실행 로그

```
/tmp/auto-daily-report-2025-08-24.log (19KB)
/tmp/auto-daily-report-2025-09-07.log (6.1KB)
/tmp/auto-daily-report-2025-09-12.log (6.7KB)
/tmp/auto-daily-report-2025-11-09.log (9.9KB)
/tmp/auto-daily-report-2025-11-10.log (7.1KB) ✅ 성공
```

---

## 💡 참고 사항

### 환경 변수

`.env.local` 파일 필요:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
GOOGLE_GENERATIVE_AI_API_KEY=your-gemini-key
OPENSEARCH_URL=http://opensearch:9200
OPENSEARCH_USER=admin
OPENSEARCH_PASSWORD=Admin@123456
```

### 수동 검증 명령어

```bash
# 에러 플래그 확인
find /tmp -name "daily_report_error_*.flag" | sort

# 에러 알림 백업 확인
find /tmp -name "error_notification_*.json" | sort

# 로그 확인
tail -f /tmp/auto-daily-report-*.log

# 데이터 파일 확인
ls -lh public/reports/data/daily_incidents_data_*.json

# AI 분석 프롬프트 확인
ls -lh public/reports/data/ai_analysis_prompt_*.txt

# AI 분석 결과 확인
ls -lh public/reports/data/ai_analysis_*.json

# 최종 보고서 확인
ls -lh public/reports/daily/daily_report_*.html
```

### Supabase 에러 조회 쿼리

테이블 생성 후 사용 가능:

```sql
-- 미처리 에러 조회
SELECT * FROM unacknowledged_errors;

-- 특정 날짜 에러 조회
SELECT * FROM error_notifications WHERE report_date = '2025-11-09';

-- Critical 에러만 조회
SELECT * FROM error_notifications WHERE severity = 'critical' ORDER BY created_at DESC;

-- 에러 인지 처리
SELECT acknowledge_error(123, 'admin@example.com', 'AI 분석 수동 완료');

-- 최근 24시간 에러 통계
SELECT error_type, severity, COUNT(*) as count
FROM error_notifications
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY error_type, severity
ORDER BY count DESC;
```

---

## 🎯 요약

**완료**: 에러 처리 시스템, 데이터 수집, AI 프롬프트 생성
**대기 중**: AI 분석 실행 (4개 날짜)
**선택 사항**: Supabase 테이블 생성

다음 작업 시 AI 분석만 실행하면 모든 날짜의 보고서 생성 가능! 🚀
