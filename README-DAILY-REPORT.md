# 일간 보안 보고서 생성 시스템

OpenSearch Cortex XDR 인시던트 데이터를 수집하고 Claude AI로 분석하여 전문적인 보안 보고서를 자동 생성합니다.

## 빠른 시작

### 1. 어제 날짜로 보고서 생성
```bash
./daily-report.sh
```

### 2. 특정 날짜로 보고서 생성
```bash
./daily-report.sh 2025-11-08
```

### 3. 도움말
```bash
./daily-report.sh --help
```

## 주요 기능

- ✅ **7개 OpenSearch 인덱스 통합**: incidents, files, networks, alerts, processes, endpoints, causality_chains
- ✅ **AI 기반 보안 분석**: Claude Code를 통한 전문가 수준의 판단
- ✅ **위협 인텔리전스 상관관계**: PostgreSQL TI 데이터베이스 매칭
- ✅ **MITRE ATT&CK 매핑**: 자동 전술/기법 분류
- ✅ **API 비용 없음**: `claude --print` 명령어 사용
- ✅ **완전 자동화**: 단일 명령으로 전체 파이프라인 실행

## 생성 파일

```
/tmp/daily_incidents_data_[날짜].json    - 수집된 원본 데이터
/tmp/ai_analysis_prompt_[날짜].txt       - AI 분석 프롬프트
/tmp/ai_analysis_[날짜].json             - AI 분석 결과 (★ 최종 보고서)
```

## 실행 예시

```bash
$ ./daily-report.sh 2025-11-08

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  📊 일간 보안 보고서 생성 시작
  날짜: 2025-11-08
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
✅ 보고서 생성 완료!

📋 AI 분석 미리보기:
  위험도: LOW (25/100)
  보안 등급: B
```

## AI 분석 결과 구조

```json
{
  "executive_summary": "종합 요약 (2-3문장)",
  "threat_assessment": {
    "overall_risk_level": "low",
    "risk_score": 25,
    "confidence": 85,
    "key_findings": [ "주요 발견사항 5개" ]
  },
  "incident_analysis": {
    "critical_incidents_summary": "...",
    "false_positive_rate": "44.3%",
    "true_threats_count": "4-6건",
    "patterns_detected": [ "탐지된 패턴들" ]
  },
  "recommendations": {
    "immediate_actions": [ "즉시 조치사항" ],
    "short_term": [ "단기 개선사항" ],
    "long_term": [ "장기 개선사항" ]
  },
  "security_posture_assessment": {
    "overall_grade": "B",
    "strengths": [ "강점" ],
    "weaknesses": [ "약점" ],
    "improvement_priority": [ "개선 우선순위" ]
  }
}
```

## 결과 분석 예시

### jq로 주요 정보 추출
```bash
# 위험도
jq '.threat_assessment.overall_risk_level' /tmp/ai_analysis_2025-11-08.json

# 주요 발견사항
jq '.threat_assessment.key_findings[]' /tmp/ai_analysis_2025-11-08.json

# 즉시 조치사항
jq '.recommendations.immediate_actions[]' /tmp/ai_analysis_2025-11-08.json

# 보안 등급
jq '.security_posture_assessment.overall_grade' /tmp/ai_analysis_2025-11-08.json
```

## 필수 요구사항

- **Node.js**: v18 이상
- **TypeScript**: tsx 런타임
- **OpenSearch**: 20.41.120.173:9200 (인시던트 데이터)
- **PostgreSQL**: postgres:5432/n8n (TI 데이터)
- **Claude CLI**: `claude` 명령어 (선택, 없으면 수동 모드)

## 환경 변수

`.env.local` 파일 생성:
```bash
OPENSEARCH_URL=http://opensearch:9200
OPENSEARCH_USER=admin
OPENSEARCH_PASSWORD=Admin@123456

POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_DB=n8n
POSTGRES_USER=n8n
POSTGRES_PASSWORD=n8n
```

## 자동화 (Cron)

매일 오전 8시 자동 실행:
```cron
0 8 * * * cd /www/ib-editor/my-app && ./daily-report.sh >> /var/log/daily-report.log 2>&1
```

## 트러블슈팅

### "claude: command not found"
```bash
# Claude CLI 설치
npm install -g @anthropic-ai/claude-cli
```

### "OpenSearch connection refused"
```bash
# OpenSearch 상태 확인
curl -u admin:Admin@123456 http://opensearch:9200/_cluster/health
```

### "No incidents found"
```bash
# 다른 날짜 시도
./daily-report.sh 2025-11-07
```

## 상세 문서

전체 매뉴얼은 다음을 참고하세요:
- [DAILY_REPORT_MANUAL.md](./docs/DAILY_REPORT_MANUAL.md) - 완전한 사용 가이드 (90+ 페이지)

## 파이프라인 구조

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
    ├─ 3단계: run-ai-analysis.ts (AI 분석)
    │   ├─ claude --print 실행
    │   ├─ JSON 파싱 및 검증
    │   └─ 출력: ai_analysis_[날짜].json ★
    │
    └─ 4단계: generate-complete-daily-report.sh (오케스트레이션)
        └─ 전체 워크플로우 자동 실행
```

## 라이선스

MIT License

## 기여

이슈 및 풀 리퀘스트 환영합니다!
