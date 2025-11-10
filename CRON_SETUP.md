# 일간 보안 보고서 자동 생성 - Cron Job 설정 가이드

## 자동화 스크립트

`script/auto-daily-report.sh` - 완전 자동화 스크립트

### 기능
1. **데이터 수집**: OpenSearch에서 일간 인시던트 데이터 수집
2. **AI 분석 확인**: AI 분석 파일이 있으면 사용, 없으면 기본 템플릿 생성
3. **보고서 생성**: HTML, Markdown, JSON 형식 보고서 생성

### 수동 실행 테스트

```bash
cd /www/ib-editor/my-app

# 어제 날짜로 보고서 생성
./script/auto-daily-report.sh

# 특정 날짜로 보고서 생성
./script/auto-daily-report.sh 2025-11-10
```

### 생성되는 파일

```
public/reports/data/
  ├── daily_incidents_data_2025-11-10.json  # 수집된 데이터
  └── ai_analysis_2025-11-10.json            # AI 분석 (자동 또는 수동)

public/reports/daily/
  ├── daily_report_2025-11-10.html           # HTML 보고서
  ├── daily_report_2025-11-10.md             # Markdown 보고서
  └── daily_report_2025-11-10.json           # JSON 통합 보고서

/tmp/
  └── auto-daily-report-2025-11-10.log       # 실행 로그
```

## Cron Job 설정

### 옵션 1: 매일 새벽 1시 자동 실행 (권장)

```bash
# crontab 편집
crontab -e

# 아래 라인 추가 (매일 01:00에 어제 보고서 자동 생성)
0 1 * * * cd /www/ib-editor/my-app && ./script/auto-daily-report.sh >> /var/log/daily-report.log 2>&1
```

### 옵션 2: 매일 오전 9시 실행

```bash
# 매일 09:00에 실행
0 9 * * * cd /www/ib-editor/my-app && ./script/auto-daily-report.sh >> /var/log/daily-report.log 2>&1
```

### 옵션 3: 주말 제외 (월-금만 실행)

```bash
# 월-금 오전 8시에 실행
0 8 * * 1-5 cd /www/ib-editor/my-app && ./script/auto-daily-report.sh >> /var/log/daily-report.log 2>&1
```

### 옵션 4: 주간 보고서 (매주 월요일)

```bash
# 매주 월요일 오전 9시에 지난주 보고서 생성
0 9 * * 1 cd /www/ib-editor/my-app && ./script/auto-weekly-report.sh >> /var/log/weekly-report.log 2>&1
```

## Cron Job 검증

### 1. Cron 설정 확인

```bash
# 현재 cron job 목록 확인
crontab -l
```

### 2. 로그 확인

```bash
# 실행 로그 확인
tail -f /var/log/daily-report.log

# 상세 로그 (날짜별)
tail -f /tmp/auto-daily-report-$(date -d "yesterday" '+%Y-%m-%d').log
```

### 3. 수동 테스트

```bash
# cron job과 동일한 명령어로 테스트
cd /www/ib-editor/my-app && ./script/auto-daily-report.sh
```

## 환경 변수 (필수)

Cron job에서 환경 변수가 로드되지 않을 수 있으므로, `.env.local` 파일이 프로젝트 루트에 있는지 확인하세요.

```bash
# .env.local 파일 위치
/www/ib-editor/my-app/.env.local
```

### 필수 환경 변수

```env
# OpenSearch (Remote - Incident Data)
OPENSEARCH_URL=http://opensearch:9200
OPENSEARCH_USER=admin
OPENSEARCH_PASSWORD=Admin@123456

# PostgreSQL (Remote - TI Database)
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_DATABASE=n8n
POSTGRES_USER=n8n
POSTGRES_PASSWORD=n8n

# AI Provider (Optional - for future AI analysis automation)
GOOGLE_GENERATIVE_AI_API_KEY=AIzaSy...
```

## AI 분석 자동화 (고급)

현재는 AI 분석 JSON을 수동으로 작성하거나 기본 템플릿을 사용합니다.

### 수동 AI 분석 작성

```bash
# AI 분석 프롬프트 생성 (구식 방법)
npx tsx script/create-ai-analysis-prompt.ts 2025-11-10

# 생성된 프롬프트를 Claude Code에 붙여넣고 응답을 복사
cat /tmp/ai_analysis_prompt_2025-11-10.txt

# 응답을 JSON으로 저장
# public/reports/data/ai_analysis_2025-11-10.json
```

### 향후 개선 사항

- [ ] Gemini/Claude API를 사용한 완전 자동 AI 분석
- [ ] 주간/월간 보고서 자동 생성
- [ ] 이메일/Slack 자동 발송
- [ ] 대시보드 실시간 업데이트

## 문제 해결

### cron job이 실행되지 않을 때

```bash
# cron 서비스 상태 확인
sudo systemctl status cron

# cron 로그 확인
sudo tail -f /var/log/syslog | grep CRON

# 수동 실행으로 에러 확인
cd /www/ib-editor/my-app && ./script/auto-daily-report.sh
```

### 권한 문제

```bash
# 실행 권한 확인
ls -la /www/ib-editor/my-app/script/auto-daily-report.sh

# 실행 권한 부여
chmod +x /www/ib-editor/my-app/script/auto-daily-report.sh
```

### OpenSearch 연결 실패

```bash
# OpenSearch 연결 테스트
curl -u "admin:Admin@123456" "http://opensearch:9200/_cat/health?v"
```

## 모니터링

### 보고서 생성 성공 여부 확인

```bash
# 최근 생성된 보고서 확인
ls -lt /www/ib-editor/my-app/public/reports/daily/ | head -5

# 오늘 생성된 보고서가 있는지 확인
YESTERDAY=$(date -d "yesterday" '+%Y-%m-%d')
ls -l /www/ib-editor/my-app/public/reports/daily/daily_report_${YESTERDAY}.*
```

### 웹 브라우저에서 확인

```
http://localhost:3000/reports/daily/daily_report_YYYY-MM-DD.html
```

## 백업

보고서 파일은 매일 생성되므로 주기적으로 백업하는 것을 권장합니다:

```bash
# 일주일 이상 된 보고서 압축
cd /www/ib-editor/my-app/public/reports
tar -czf daily_reports_archive_$(date '+%Y%m').tar.gz daily/*.html daily/*.md daily/*.json
```
