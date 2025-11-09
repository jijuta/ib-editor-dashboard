# 일간 보안 보고서 생성 시스템 매뉴얼

## 목차
1. [시스템 개요](#시스템-개요)
2. [특징](#특징)
3. [시스템 아키텍처](#시스템-아키텍처)
4. [필수 요구사항](#필수-요구사항)
5. [설치 및 설정](#설치-및-설정)
6. [사용 방법](#사용-방법)
7. [생성 파일 설명](#생성-파일-설명)
8. [파이프라인 상세](#파이프라인-상세)
9. [트러블슈팅](#트러블슈팅)
10. [고급 사용법](#고급-사용법)
11. [자동화 설정](#자동화-설정)

---

## 시스템 개요

**일간 보안 보고서 생성 시스템**은 OpenSearch에 저장된 Cortex XDR 인시던트 데이터를 수집하고, AI(Claude)를 활용하여 전문적인 보안 분석을 수행한 후, 종합 보고서를 생성하는 자동화 파이프라인입니다.

### 핵심 가치

- **데이터 기반 분석**: 7개 OpenSearch 인덱스에서 종합 데이터 수집
- **AI 기반 인사이트**: Claude AI를 통한 전문가 수준의 보안 판단
- **API 없는 AI 실행**: `claude --print` 명령어로 API 비용 없이 실행
- **위협 인텔리전스 상관관계**: PostgreSQL TI 데이터베이스와 연동
- **MITRE ATT&CK 매핑**: 자동화된 전술/기법 분석
- **완전 자동화**: 단일 명령으로 전체 파이프라인 실행

---

## 특징

### 1. 고급 데이터 수집
- **7개 인덱스 통합**: incidents, files, networks, alerts, processes, endpoints, causality_chains
- **상위 20개 인시던트 상세 분석**: Critical/High 우선 정렬
- **파일 해시 TI 상관관계**: PostgreSQL 위협 인텔리전스 매칭
- **MITRE ATT&CK 매핑**: 기법/전술 자동 분류
- **통계 집계**: 심각도, 상태, 탐지 유형, 호스트별 분석

### 2. AI 기반 분석
- **Claude Code 통합**: `claude --print` 명령어 활용
- **전문가 수준 판단**: 보안 분석가 관점의 종합 평가
- **위협 평가**: 위험도, 위험 점수, 신뢰도 계산
- **패턴 탐지**: 공격 패턴, 오탐 패턴, 트렌드 분석
- **실행 가능한 권고**: 즉시/단기/장기 조치사항 제공

### 3. 종합 보고서
- **보안 등급 평가**: A~F 등급 자동 산출
- **강점/약점 분석**: 보안 태세 종합 평가
- **우선순위 제시**: 개선 우선순위 자동 정렬
- **JSON 형식 출력**: 추가 처리 및 시각화 용이

---

## 시스템 아키텍처

```
┌─────────────────────────────────────────────────────────────┐
│                     Daily Report Pipeline                    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ 1. 데이터 수집 (collect-daily-incidents-data.ts)            │
├─────────────────────────────────────────────────────────────┤
│ • OpenSearch 7개 인덱스 쿼리                                 │
│ • PostgreSQL TI/MITRE 상관관계 분석                         │
│ • 통계 집계 및 데이터 정규화                                │
│                                                               │
│ 입력: 날짜 (YYYY-MM-DD)                                      │
│ 출력: /tmp/daily_incidents_data_[날짜].json                 │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. AI 프롬프트 생성 (create-ai-analysis-prompt.ts)          │
├─────────────────────────────────────────────────────────────┤
│ • 수집 데이터를 AI 분석용 프롬프트로 변환                   │
│ • 구조화된 JSON 응답 템플릿 포함                            │
│ • 상위 10개 인시던트 상세 포함                              │
│                                                               │
│ 입력: /tmp/daily_incidents_data_[날짜].json                 │
│ 출력: /tmp/ai_analysis_prompt_[날짜].txt                    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Claude AI 분석 (run-ai-analysis.ts)                      │
├─────────────────────────────────────────────────────────────┤
│ • claude --print 명령어 실행                                │
│ • JSON 응답 파싱 및 검증                                    │
│ • 전문가 수준의 보안 분석 수행                              │
│                                                               │
│ 입력: /tmp/ai_analysis_prompt_[날짜].txt                    │
│ 출력: /tmp/ai_analysis_[날짜].json                          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. 파이프라인 오케스트레이션                                │
│    (generate-complete-daily-report.sh / daily-report.sh)     │
├─────────────────────────────────────────────────────────────┤
│ • 전체 워크플로우 자동 실행                                 │
│ • 진행 상황 시각화                                          │
│ • 에러 핸들링 및 폴백                                       │
│ • 결과 요약 출력                                            │
└─────────────────────────────────────────────────────────────┘
```

---

## 필수 요구사항

### 1. 소프트웨어
- **Node.js**: v18 이상
- **TypeScript**: v5 이상 (tsx 런타임)
- **Bash**: v4 이상
- **curl**: HTTP 요청용
- **jq**: JSON 파싱용 (선택)
- **Claude CLI**: `claude` 명령어 (자동 설치 가능)

### 2. 데이터베이스
- **OpenSearch**: 20.41.120.173:9200 (또는 opensearch:9200)
  - 인증: admin:Admin@123456
  - 필수 인덱스:
    - `logs-cortex_xdr-incidents-*`
    - `logs-cortex_xdr-files-*`
    - `logs-cortex_xdr-networks-*`
    - `logs-cortex_xdr-alerts-*`
    - `logs-cortex_xdr-processes-*`
    - `logs-cortex_xdr-endpoints-*`
    - `logs-cortex_xdr-causality_chains-*`

- **PostgreSQL**: postgres:5432/n8n
  - 인증: n8n:n8n (환경에 따라 다름)
  - 필수 테이블:
    - `file_hashes` (위협 인텔리전스)
    - `mitre_attack` (MITRE ATT&CK 데이터)

### 3. 환경 변수
프로젝트 루트에 `.env.local` 파일 생성:

```bash
# OpenSearch 설정
OPENSEARCH_URL=http://opensearch:9200
OPENSEARCH_USER=admin
OPENSEARCH_PASSWORD=Admin@123456

# PostgreSQL 설정 (TI 데이터베이스)
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_DB=n8n
POSTGRES_USER=n8n
POSTGRES_PASSWORD=n8n
```

---

## 설치 및 설정

### 1. 프로젝트 클론
```bash
cd /www/ib-editor/my-app
```

### 2. 의존성 설치
```bash
npm install
```

### 3. 스크립트 실행 권한 부여
```bash
chmod +x daily-report.sh
chmod +x script/generate-complete-daily-report.sh
chmod +x script/collect-daily-incidents-data.ts
chmod +x script/create-ai-analysis-prompt.ts
chmod +x script/run-ai-analysis.ts
```

### 4. Claude CLI 설치 (선택)
```bash
npm install -g @anthropic-ai/claude-cli
```

> **참고**: Claude CLI가 없어도 실행 가능합니다. 스크립트가 수동 입력 모드로 전환됩니다.

### 5. 데이터베이스 연결 테스트
```bash
# OpenSearch 테스트
curl -u admin:Admin@123456 http://opensearch:9200/_cluster/health

# PostgreSQL 테스트
psql -h postgres -U n8n -d n8n -c "SELECT COUNT(*) FROM file_hashes;"
```

---

## 사용 방법

### 기본 사용법

#### 1. 어제 날짜로 보고서 생성
```bash
./daily-report.sh
```

#### 2. 특정 날짜로 보고서 생성
```bash
./daily-report.sh 2025-11-08
```

#### 3. 도움말 보기
```bash
./daily-report.sh --help
```

### 실행 예시

```bash
$ ./daily-report.sh 2025-11-08

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  📊 일간 보안 보고서 생성 시작
  날짜: 2025-11-08
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1단계: 데이터 수집
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1️⃣  인시던트 조회 중...
✅ 61건의 인시던트 조회 완료

2️⃣  상위 인시던트 상세 분석 중...
   분석 중: 888-000447 (medium)
   분석 중: 888-000449 (medium)
   ...
✅ 20개 인시던트 상세 분석 완료

3️⃣  TI 상관관계 분석 중...
✅ TI 매칭: 0개

4️⃣  MITRE ATT&CK 분석 중...
✅ MITRE 매칭: 6개

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2단계: AI 분석 프롬프트 생성
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ 프롬프트 생성 완료 (9,197자)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
3단계: Claude AI 분석 실행
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🤖 Claude AI 분석 실행 중...
   (이 작업은 1-2분 소요될 수 있습니다)

✅ AI 분석 완료!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ 보고서 생성 완료!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📁 생성된 파일:
  ✓ /tmp/daily_incidents_data_2025-11-08.json
  ✓ /tmp/ai_analysis_prompt_2025-11-08.txt
  ✓ /tmp/ai_analysis_2025-11-08.json

📋 AI 분석 미리보기:
  위험도: LOW (25/100)
  보안 등급: B
```

---

## 생성 파일 설명

### 1. daily_incidents_data_[날짜].json
**위치**: `/tmp/daily_incidents_data_[날짜].json`
**크기**: 약 200-500KB

**구조**:
```json
{
  "collected_data": {
    "incidents": [
      {
        "incident": { /* 인시던트 원본 데이터 */ },
        "files": [ /* 관련 파일 */ ],
        "networks": [ /* 네트워크 연결 */ ],
        "alerts": [ /* 알럿 */ ],
        "processes": [ /* 프로세스 */ ],
        "endpoints": [ /* 엔드포인트 */ ],
        "causality": [ /* 인과관계 체인 */ ]
      }
    ],
    "ti_data": [ /* 위협 인텔리전스 매칭 */ ],
    "mitre_data": [ /* MITRE ATT&CK 데이터 */ ]
  },
  "ai_analysis_data": {
    "summary": { /* 전체 요약 */ },
    "top_incidents": [ /* 상위 10개 인시던트 */ ],
    "statistics": { /* 통계 */ },
    "threat_intelligence": { /* TI 분석 */ },
    "mitre_attack": { /* MITRE 분석 */ }
  }
}
```

**용도**:
- 원본 데이터 보관
- 추가 분석/처리 원본
- 감사 추적

### 2. ai_analysis_prompt_[날짜].txt
**위치**: `/tmp/ai_analysis_prompt_[날짜].txt`
**크기**: 약 10-20KB

**내용**:
- 수집된 데이터 요약
- 상위 10개 인시던트 상세
- 통계 분석
- MITRE ATT&CK 분석
- AI 분석 요청사항 (JSON 템플릿 포함)

**용도**:
- Claude AI 입력
- 수동 분석 시 참고
- 프롬프트 디버깅

### 3. ai_analysis_[날짜].json
**위치**: `/tmp/ai_analysis_[날짜].json`
**크기**: 약 8-15KB

**구조**:
```json
{
  "executive_summary": "종합 요약 (2-3문장)",
  "threat_assessment": {
    "overall_risk_level": "critical|high|medium|low",
    "risk_score": 0-100,
    "confidence": 0-100,
    "key_findings": [ /* 주요 발견사항 */ ]
  },
  "incident_analysis": {
    "critical_incidents_summary": "...",
    "false_positive_rate": "...",
    "true_threats_count": "...",
    "patterns_detected": [ /* 패턴 */ ]
  },
  "threat_intelligence_insights": {
    "malware_families": [ /* 멀웨어 패밀리 */ ],
    "attack_vectors": [ /* 공격 벡터 */ ],
    "threat_actors": [ /* 위협 행위자 */ ],
    "ioc_summary": "..."
  },
  "mitre_attack_analysis": {
    "primary_tactics": [ /* 주요 전술 */ ],
    "primary_techniques": [ /* 주요 기법 */ ],
    "attack_chain_analysis": "...",
    "defense_gaps": [ /* 방어 공백 */ ]
  },
  "network_threat_analysis": {
    "suspicious_countries": [ /* 의심 국가 */ ],
    "c2_indicators": [ /* C2 서버 징후 */ ],
    "data_exfiltration_risk": "...",
    "lateral_movement": "..."
  },
  "recommendations": {
    "immediate_actions": [ /* 즉시 조치 */ ],
    "short_term": [ /* 단기 개선 */ ],
    "long_term": [ /* 장기 개선 */ ]
  },
  "trending_analysis": {
    "increasing_threats": [ /* 증가 위협 */ ],
    "decreasing_threats": [ /* 감소 위협 */ ],
    "new_attack_patterns": [ /* 신규 패턴 */ ],
    "comparison_notes": "..."
  },
  "security_posture_assessment": {
    "strengths": [ /* 강점 */ ],
    "weaknesses": [ /* 약점 */ ],
    "overall_grade": "A|B|C|D|F",
    "improvement_priority": [ /* 개선 우선순위 */ ]
  }
}
```

**용도**:
- 보안 태세 평가
- 경영진 보고
- 대응 계획 수립
- 트렌드 분석

---

## 파이프라인 상세

### 1단계: 데이터 수집
**스크립트**: `script/collect-daily-incidents-data.ts`

**처리 과정**:
1. **인시던트 조회**: OpenSearch에서 해당 날짜 인시던트 검색
2. **정렬 및 필터링**: Critical/High 우선, 최신순 정렬, 상위 20개 선택
3. **상세 데이터 수집**: 각 인시던트별로 7개 인덱스 쿼리
4. **TI 상관관계**: PostgreSQL에서 파일 해시 매칭
5. **MITRE 매핑**: ATT&CK 기법/전술 조회
6. **통계 집계**: 심각도, 상태, 탐지 유형, 호스트별 집계
7. **데이터 정규화**: AI 분석용 구조화

**주요 기능**:
- **자동 재시도**: curl 실패 시 재시도 로직
- **대용량 처리**: maxBuffer 50MB 설정
- **에러 핸들링**: PostgreSQL 연결 실패 시 graceful degradation

### 2단계: AI 프롬프트 생성
**스크립트**: `script/create-ai-analysis-prompt.ts`

**처리 과정**:
1. **데이터 로드**: 1단계 출력 파일 읽기
2. **프롬프트 구성**:
   - 분석 날짜 및 전체 개요
   - 상위 10개 인시던트 상세 (파일, 네트워크, MITRE, CVE)
   - 통계 분석 (심각도, 상태, 탐지 유형, 호스트)
   - 위협 인텔리전스 분석
   - MITRE ATT&CK 분석
   - 네트워크 위협 분석
3. **JSON 템플릿 포함**: AI 응답 형식 지정
4. **파일 저장**: 텍스트 프롬프트 파일 생성

**프롬프트 구조**:
- Markdown 형식
- 구조화된 섹션
- 명확한 분석 요청사항
- JSON 응답 템플릿

### 3단계: Claude AI 분석
**스크립트**: `script/run-ai-analysis.ts`

**처리 과정**:
1. **claude 명령어 확인**: `which claude` 실행
2. **자동 실행 모드** (claude 사용 가능):
   - `cat [프롬프트] | claude --print` 실행
   - JSON 블록 추출 (```json ... ```)
   - JSON 파싱 검증
   - 결과 파일 저장
3. **수동 실행 모드** (claude 없음):
   - 프롬프트 출력
   - 사용자에게 Claude Code에 붙여넣기 안내
   - Enter 대기
   - 결과 파일 확인

**타임아웃**: 5분 (300,000ms)
**최대 버퍼**: 10MB

### 4단계: 파이프라인 오케스트레이션
**스크립트**: `script/generate-complete-daily-report.sh`, `daily-report.sh`

**처리 과정**:
1. 환경 검증 (날짜 형식, 디렉토리 등)
2. 1단계 실행 및 결과 확인
3. 2단계 실행 및 결과 확인
4. 3단계 실행 (자동/수동)
5. 결과 요약 출력
6. jq 가용 시 AI 분석 미리보기

**에러 핸들링**:
- 각 단계별 종료 코드 확인
- 실패 시 명확한 에러 메시지
- 필수 파일 존재 여부 검증

---

## 트러블슈팅

### 1. "Top-level await is not supported" 오류
**원인**: TypeScript CJS 출력 형식에서 top-level await 미지원

**해결**:
```bash
# 이미 수정됨 - async IIFE로 래핑됨
# 최신 버전 pull 또는 재설치
git pull origin main
```

### 2. "OpenSearch connection refused" 오류
**원인**: OpenSearch 서버 연결 불가

**해결**:
```bash
# 1. OpenSearch 상태 확인
curl -u admin:Admin@123456 http://opensearch:9200/_cluster/health

# 2. 네트워크 확인
ping opensearch

# 3. /etc/hosts 확인
cat /etc/hosts | grep opensearch

# 4. 환경 변수 확인
echo $OPENSEARCH_URL
```

### 3. "PostgreSQL authentication failed" 경고
**원인**: PostgreSQL 연결 실패 (TI/MITRE 조회)

**영향**: TI 상관관계 분석 불가, MITRE 상세 정보 없음 (보고서는 생성됨)

**해결**:
```bash
# 1. PostgreSQL 연결 테스트
psql -h postgres -U n8n -d n8n

# 2. 비밀번호 확인
echo $POSTGRES_PASSWORD

# 3. /etc/hosts 확인
cat /etc/hosts | grep postgres

# 4. 권한 확인
psql -h postgres -U n8n -d n8n -c "\dt"
```

### 4. "claude: command not found"
**원인**: Claude CLI 미설치

**영향**: 수동 실행 모드로 전환 (프롬프트 출력 → Claude Code 붙여넣기)

**해결**:
```bash
# Claude CLI 설치
npm install -g @anthropic-ai/claude-cli

# 설치 확인
which claude
```

### 5. "No incidents found" 메시지
**원인**: 해당 날짜에 인시던트 데이터 없음

**해결**:
```bash
# 1. 인시던트 존재 확인
curl -u admin:Admin@123456 \
  -H "Content-Type: application/json" \
  -X POST "http://opensearch:9200/logs-cortex_xdr-incidents-*/_search" \
  -d '{"query":{"range":{"@timestamp":{"gte":"2025-11-08T00:00:00","lt":"2025-11-09T00:00:00"}}}, "size":0}'

# 2. 다른 날짜 시도
./daily-report.sh 2025-11-07
```

### 6. AI 분석 JSON 파싱 실패
**원인**: Claude 응답이 JSON 형식 아님

**해결**:
```bash
# 1. 원본 응답 확인
cat /tmp/ai_analysis_2025-11-08.json

# 2. 수동 수정 후 재실행
# JSON 부분만 복사하여 파일 재작성
```

---

## 고급 사용법

### 개별 스크립트 실행

#### 1. 데이터 수집만 실행
```bash
npx tsx script/collect-daily-incidents-data.ts 2025-11-08
```

#### 2. AI 프롬프트만 생성
```bash
npx tsx script/create-ai-analysis-prompt.ts 2025-11-08
```

#### 3. AI 분석만 실행
```bash
npx tsx script/run-ai-analysis.ts 2025-11-08
```

### 결과 분석

#### jq를 사용한 JSON 분석
```bash
# 위험도 확인
jq '.threat_assessment.overall_risk_level' /tmp/ai_analysis_2025-11-08.json

# 주요 발견사항
jq '.threat_assessment.key_findings[]' /tmp/ai_analysis_2025-11-08.json

# 즉시 조치사항
jq '.recommendations.immediate_actions[]' /tmp/ai_analysis_2025-11-08.json

# 보안 등급
jq '.security_posture_assessment.overall_grade' /tmp/ai_analysis_2025-11-08.json

# 전체 예쁘게 출력
jq . /tmp/ai_analysis_2025-11-08.json
```

#### Python을 사용한 분석
```python
import json

with open('/tmp/ai_analysis_2025-11-08.json') as f:
    data = json.load(f)

# 위험 점수
print(f"Risk Score: {data['threat_assessment']['risk_score']}/100")

# 주요 발견사항
for finding in data['threat_assessment']['key_findings']:
    print(f"• {finding}")

# 개선 우선순위
for i, priority in enumerate(data['security_posture_assessment']['improvement_priority'], 1):
    print(f"{i}. {priority}")
```

### 배치 실행

#### 여러 날짜 동시 실행
```bash
#!/bin/bash
# batch-reports.sh

START_DATE="2025-11-01"
END_DATE="2025-11-08"

current_date="$START_DATE"
while [[ "$current_date" < "$END_DATE" ]] || [[ "$current_date" == "$END_DATE" ]]; do
    echo "Generating report for $current_date..."
    ./daily-report.sh "$current_date"
    current_date=$(date -I -d "$current_date + 1 day")
done

echo "All reports generated!"
```

#### 주간 보고서 생성 (7일치)
```bash
#!/bin/bash
# weekly-report.sh

END_DATE=$(date -d "yesterday" '+%Y-%m-%d')
START_DATE=$(date -d "$END_DATE - 7 days" '+%Y-%m-%d')

for i in {0..6}; do
    REPORT_DATE=$(date -d "$START_DATE + $i days" '+%Y-%m-%d')
    ./daily-report.sh "$REPORT_DATE"
done
```

---

## 자동화 설정

### Cron을 사용한 일일 자동 실행

#### 1. Crontab 편집
```bash
crontab -e
```

#### 2. 매일 오전 8시 실행 (어제 데이터)
```cron
0 8 * * * cd /www/ib-editor/my-app && ./daily-report.sh >> /var/log/daily-report.log 2>&1
```

#### 3. 평일만 실행 (월-금)
```cron
0 8 * * 1-5 cd /www/ib-editor/my-app && ./daily-report.sh >> /var/log/daily-report.log 2>&1
```

#### 4. 주간 보고서 (매주 월요일 오전 9시)
```cron
0 9 * * 1 cd /www/ib-editor/my-app && ./weekly-report.sh >> /var/log/weekly-report.log 2>&1
```

### Systemd Timer를 사용한 자동화

#### 1. Service 파일 생성
```bash
sudo nano /etc/systemd/system/daily-report.service
```

```ini
[Unit]
Description=Daily Security Report Generator
After=network.target opensearch.service postgresql.service

[Service]
Type=oneshot
User=ubuntu
WorkingDirectory=/www/ib-editor/my-app
ExecStart=/www/ib-editor/my-app/daily-report.sh
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

#### 2. Timer 파일 생성
```bash
sudo nano /etc/systemd/system/daily-report.timer
```

```ini
[Unit]
Description=Daily Security Report Timer
Requires=daily-report.service

[Timer]
OnCalendar=*-*-* 08:00:00
Persistent=true

[Install]
WantedBy=timers.target
```

#### 3. 활성화
```bash
sudo systemctl daemon-reload
sudo systemctl enable daily-report.timer
sudo systemctl start daily-report.timer

# 상태 확인
sudo systemctl status daily-report.timer
```

### Docker Compose 통합

```yaml
# docker-compose.yml
services:
  daily-report:
    image: node:18
    volumes:
      - /www/ib-editor/my-app:/app
    working_dir: /app
    command: bash -c "while true; do ./daily-report.sh && sleep 86400; done"
    environment:
      - OPENSEARCH_URL=http://opensearch:9200
      - OPENSEARCH_USER=admin
      - OPENSEARCH_PASSWORD=Admin@123456
      - POSTGRES_HOST=postgres
      - POSTGRES_PORT=5432
      - POSTGRES_DB=n8n
      - POSTGRES_USER=n8n
      - POSTGRES_PASSWORD=n8n
    depends_on:
      - opensearch
      - postgres
```

---

## 데이터 보존 및 정리

### 자동 정리 스크립트
```bash
#!/bin/bash
# cleanup-old-reports.sh

# 30일 이상 된 보고서 삭제
find /tmp -name "daily_incidents_data_*.json" -mtime +30 -delete
find /tmp -name "ai_analysis_prompt_*.txt" -mtime +30 -delete
find /tmp -name "ai_analysis_*.json" -mtime +30 -delete

echo "Old reports cleaned up!"
```

### 장기 보관
```bash
#!/bin/bash
# archive-reports.sh

ARCHIVE_DIR="/archive/security-reports"
mkdir -p "$ARCHIVE_DIR"

# 7일 이상 된 보고서를 아카이브로 이동
find /tmp -name "ai_analysis_*.json" -mtime +7 -exec mv {} "$ARCHIVE_DIR/" \;

# 압축
tar -czf "$ARCHIVE_DIR/reports-$(date +%Y-%m).tar.gz" "$ARCHIVE_DIR"/*.json
rm "$ARCHIVE_DIR"/*.json
```

---

## 성능 최적화

### 1. 데이터 수집 최적화
```typescript
// collect-daily-incidents-data.ts
// size 파라미터 조정 (기본 20개)
const topCount = process.env.TOP_INCIDENTS_COUNT || 20;
```

### 2. 병렬 처리
```bash
# 여러 날짜를 병렬로 처리
for date in 2025-11-{01..08}; do
    ./daily-report.sh "$date" &
done
wait
```

### 3. 캐싱
```bash
# Redis 캐싱 (추후 구현 예정)
# 동일 날짜 재요청 시 캐시된 결과 반환
```

---

## FAQ

### Q1: Claude CLI 없이 사용 가능한가요?
**A**: 네, 수동 모드로 전환됩니다. 프롬프트가 출력되면 Claude Code에 붙여넣고, JSON 응답을 `/tmp/ai_analysis_[날짜].json`에 저장하면 됩니다.

### Q2: API 비용이 발생하나요?
**A**: 아니오, `claude --print` 명령어를 사용하여 Claude Code를 통해 실행하므로 별도 API 비용이 없습니다.

### Q3: 실시간 보고서 생성이 가능한가요?
**A**: 현재는 일간 보고서만 지원합니다. 실시간 대시보드는 `/www/ib-poral` 프로젝트를 참고하세요.

### Q4: 주간/월간 보고서도 생성 가능한가요?
**A**: 네, 날짜 범위를 조정하여 여러 일간 보고서를 종합하는 방식으로 구현 가능합니다 (추후 구현 예정).

### Q5: 다른 보안 제품과 연동 가능한가요?
**A**: 현재는 Cortex XDR만 지원합니다. 다른 제품은 인덱스 매핑을 수정하여 연동 가능합니다.

---

## 참고 문서

- [INCIDENT_REPORTS_GUIDE.md](./INCIDENT_REPORTS_GUIDE.md) - 인시던트 보고서 전체 가이드
- [OpenSearch Query DSL](https://opensearch.org/docs/latest/query-dsl/) - 쿼리 문법
- [MITRE ATT&CK](https://attack.mitre.org/) - 전술/기법 참고
- [Cortex XDR API](https://docs-cortex.paloaltonetworks.com/) - 인덱스 구조

---

## 지원 및 문의

문제가 발생하거나 개선 제안이 있으시면:
- GitHub Issues: [프로젝트 이슈 페이지]
- 로그 확인: `/var/log/daily-report.log`
- 디버그 모드: `bash -x ./daily-report.sh 2025-11-08`

---

## 변경 이력

### v1.0.0 (2025-11-09)
- 초기 릴리스
- 4단계 파이프라인 구현
- Claude AI 통합
- TI/MITRE 상관관계 분석
- 단일 실행 스크립트 (`daily-report.sh`)
