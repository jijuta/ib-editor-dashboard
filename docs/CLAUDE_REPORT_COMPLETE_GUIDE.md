# Claude를 사용한 보안 인시던트 보고서 생성 - 완전 가이드

> **최종 업데이트**: 2025-11-23
> **버전**: 3.0
> **상태**: ✅ 프로덕션 운영 중

---

## 📋 목차

1. [개요](#개요)
2. [Claude Code를 사용한 고품질 보고서](#claude-code를-사용한-고품질-보고서)
3. [MCP 서버 통합](#mcp-서버-통합)
4. [보고서 생성 방법](#보고서-생성-방법)
5. [보고서 유형별 가이드](#보고서-유형별-가이드)
6. [아키텍처 및 데이터 흐름](#아키텍처-및-데이터-흐름)
7. [실전 활용 예시](#실전-활용-예시)
8. [트러블슈팅](#트러블슈팅)

---

## 개요

### 🎯 시스템 목적

Cortex XDR 보안 인시던트를 **Claude AI**의 강력한 추론 능력을 활용하여 자동으로 분석하고, 경영진부터 보안 엔지니어까지 모든 이해관계자를 위한 고품질 보고서를 생성합니다.

### 🔑 핵심 특징

#### 1. 다층 AI 분석 시스템

```
레벨 1: Azure GPT-4o-mini (자동화/트리아지)
  ↓ 8-16초, $0.001/건
  ✓ 빠른 자동 분석
  ✓ 일괄 처리 최적화
  ✓ Cron 자동화

레벨 2: Claude Sonnet 4.5 (심층 분석/보고)
  ↓ 30-60초, $0.02/건
  ✓ 전체 컨텍스트 분석
  ✓ 고품질 HTML 보고서
  ✓ 경영진용 리포트
```

#### 2. 3가지 보고서 생성 방법

| 방법 | 사용 시점 | AI 모델 | 출력 형식 | 자동화 |
|------|----------|---------|----------|--------|
| **CLI 스크립트** | 자동화/대량 처리 | Azure GPT-4o-mini | JSON + MD + HTML | ✅ |
| **Claude Code MCP** | 심층 분석 필요 | Claude Sonnet 4.5 | HTML (고품질) | ❌ |
| **일간/주간 보고서** | 정기 리포트 | 선택 가능 | HTML + MD + JSON | ✅ |

#### 3. 통합 데이터 소스

- **OpenSearch**: 7개 인덱스 (incidents, alerts, files, networks, processes, endpoints, causality_chains)
- **PostgreSQL**: TI 데이터베이스 (997K malware, 884 MITRE, CVE database)
- **실시간 상관분석**: 파일 해시, IP 평판, MITRE 기법, CVE 매칭

---

## Claude Code를 사용한 고품질 보고서

### 🚀 왜 Claude Code인가?

Claude Sonnet 4.5는 보안 분석에서 다음 강점을 제공합니다:

1. **깊은 추론 능력**: 복잡한 공격 체인 분석
2. **전체 컨텍스트 이해**: 토큰 제한 없이 모든 데이터 분석
3. **자연어 이해**: 한글/영어 자유로운 프롬프트
4. **시각화 능력**: HTML + Chart.js 통합 보고서

### 📊 비교표: Azure vs Claude

| 항목 | Azure GPT-4o-mini | Claude Sonnet 4.5 |
|------|-------------------|-------------------|
| **분석 깊이** | 얕음 (500 토큰) | 깊음 (전체 컨텍스트) |
| **추론 품질** | 기본 | 최고 수준 |
| **보고서 형식** | 마크다운 | HTML (Tailwind + Charts) |
| **시각화** | 텍스트만 | 차트, 타임라인, 매트릭스 |
| **실행 시간** | 8-16초 | 30-60초 |
| **비용** | $0.001/건 | $0.02/건 |
| **자동화** | ✅ Cron/API | ❌ 수동 |
| **용도** | 대량 처리, 트리아지 | 경영진 보고, 심층 분석 |

### 🎨 Claude 보고서 특징

#### 1. Executive Summary
```
┌─────────────────────────────────────────┐
│  위험도: 85/100  [━━━━━━━━━━░░]         │
│  판정: TRUE_POSITIVE 🚨                │
│  신뢰도: 95%                            │
│                                         │
│  알럿: 5  파일: 12  네트워크: 8         │
│  위협: 3                                │
└─────────────────────────────────────────┘
```

#### 2. Claude AI 분석 섹션
- 위협 패턴 설명
- 공격 체인 분석 (Kill Chain)
- False Positive 가능성 평가
- 근거 기반 판단 (Evidence-based)

#### 3. 시각화 요소
- **타임라인 차트**: 시간대별 알럿 발생 패턴
- **MITRE 매트릭스**: 공격 기법 시각화
- **위협 분포 차트**: 파일/네트워크 위협 통계
- **CVE 심각도 차트**: 취약점 분포

#### 4. 인터랙티브 기능
- 섹션 접기/펼치기
- 클릭 가능한 IOC (Indicator of Compromise)
- 다크모드 지원
- 인쇄 최적화

---

## MCP 서버 통합

### 📡 Claude Investigation MCP

Claude Code가 인시던트를 분석하고 한글 보고서를 생성하는 전용 MCP 서버입니다.

#### 설치 (.mcp.json)

```json
{
  "claude-investigation": {
    "command": "npx",
    "args": ["tsx", "/www/ib-editor/my-app/script/claude-investigation-mcp.js"],
    "env": {
      "OPENSEARCH_URL": "http://opensearch:9200",
      "OPENSEARCH_USER": "admin",
      "OPENSEARCH_PASSWORD": "Admin@123456",
      "DATABASE_URL": "postgresql://postgres:postgres@postgres:5432/n8n?schema=ioclog"
    },
    "description": "Claude Code 전용 인시던트 조사 및 한글 보고서 생성"
  }
}
```

#### 사용 가능한 도구

##### 1. `collect_incident_data`
**목적**: AI 분석 없이 순수 데이터만 수집

**입력**:
```json
{
  "incident_id": "414186"
}
```

**출력**:
```markdown
# 인시던트 데이터 수집 완료

## 기본 정보
- **인시던트 ID**: 414186
- **심각도**: medium
- **상태**: false_positive
- **알럿 수**: 1

## 통계
- **총 파일**: 2 (위협: 1)
- **총 네트워크**: 0 (위협 IP: 0)
- **엔드포인트**: 1
- **CVE**: 100
- **MITRE 기법**: 2

## 위협 인텔리전스 요약
### 파일 해시 (상위 10개)
- bead8af7e7407b5f... (위협: threat, 레벨: 80)

### MITRE ATT&CK
- T1112: Modify Registry
- T1588.001: Obtain Capabilities: Malware

### CVE (상위 20개)
- CVE-2023-12345: HIGH
```

##### 2. `save_analysis_and_generate_report`
**목적**: Claude가 작성한 분석을 저장하고 HTML 보고서 생성

**입력**:
```json
{
  "incident_id": "414186",
  "analysis": {
    "incident_detail": "이 인시던트는 레지스트리 수정 및 악성코드 획득 행위를 포함합니다...",
    "endpoint_analysis": "엔드포인트 ktc-d111783에서 의심스러운 활동이 감지되었습니다...",
    "file_artifacts": "10개의 위협 파일이 감지되었으며, SHA256 해시 매칭 결과 malware 데이터베이스에서 확인되었습니다...",
    "network_artifacts": "87개의 네트워크 연결 중 대부분 정상이나, 3개의 의심스러운 연결이 발견되었습니다...",
    "mitre_analysis": "MITRE T1112 (레지스트리 수정) 기법이 탐지되었습니다...",
    "final_verdict": {
      "verdict": "needs_investigation",
      "risk_score": 65,
      "confidence": 85,
      "summary": "분석가가 false positive로 판단했으나, 다수의 위협 파일과 MITRE 기법이 감지되어 추가 조사가 권장됩니다.",
      "key_findings": [
        "10개의 위협 파일 감지 (threat_level >= 50)",
        "MITRE T1112 (Modify Registry) 감지",
        "MITRE T1588.001 (Obtain Capabilities: Malware) 감지",
        "100개의 CVE 매칭"
      ]
    }
  }
}
```

**출력**:
```
# 보고서 생성 완료!

## 저장된 파일
- **분석 데이터**: data/investigations/incident_414186_2025-11-23T10-30-00.json
- **HTML 보고서**: public/reports/incident_414186_korean_2025-11-23T10-30-00.html

## 웹 접속
http://localhost:40017/reports/incident_414186_korean_2025-11-23T10-30-00.html
```

---

## 보고서 생성 방법

### 방법 1: Claude Code (대화형)

#### 단계별 프로세스

**1단계: 데이터 수집**
```
프롬프트: "Investigate incident 414186 using claude-investigation MCP"
```

Claude Code가 자동으로 `collect_incident_data` 도구를 호출하여 모든 데이터를 수집합니다.

**2단계: Claude 분석 작성**

Claude가 수집된 데이터를 분석하고 다음 섹션을 작성합니다:
- 인시던트 상세 분석
- 엔드포인트 분석
- 파일 아티팩트 분석
- 네트워크 분석
- MITRE ATT&CK 분석
- 최종 종합 의견

**3단계: 보고서 생성**

Claude가 자동으로 `save_analysis_and_generate_report` 도구를 호출하여 한글 HTML 보고서를 생성합니다.

#### 프롬프트 예시

##### 기본 조사
```
"Investigate incident 414186"
```

##### 심층 분석
```
"Investigate incident 414186 and provide comprehensive threat analysis with MITRE ATT&CK mapping"
```

##### False Positive 검증
```
"Investigate incident 414186 and evaluate the likelihood of this being a false positive"
```

##### 여러 인시던트 비교
```
"Investigate incidents 414186, 414187, 414188 and analyze if they are part of the same attack campaign"
```

##### 주간 보고서
```
"Generate a weekly security report for all high severity incidents from last 7 days"
```

### 방법 2: CLI 스크립트 (자동화)

#### 단일 인시던트 조사

```bash
# 기본 조사
npx tsx script/investigate-incident-cli.ts --incident-id 414186

# 강제 재조사 (캐시 무시)
npx tsx script/investigate-incident-cli.ts --incident-id 414186 --force

# 출력
✅ Investigation complete
📁 JSON: public/reports/incident_414186_2025-11-23T10-30-00.json
📄 MD: public/reports/incident_414186_2025-11-23T10-30-00.md
🌐 HTML: public/reports/incident_414186_korean_2025-11-23T10-30-00.html
```

#### 배치 처리

```bash
# incidents.txt 파일 생성
cat > incidents.txt <<EOF
414186
414187
414188
EOF

# 배치 실행
npx tsx script/investigate-incident-cli.ts --batch incidents.txt
```

### 방법 3: REST API (통합)

#### 동기 모드 (결과 즉시 반환)

```bash
curl -X POST http://localhost:40017/api/investigate \
  -H "Content-Type: application/json" \
  -d '{
    "incident_id": "414186"
  }'
```

#### 비동기 모드 (백그라운드 실행)

```bash
# 조사 시작
curl -X POST http://localhost:40017/api/investigate \
  -H "Content-Type: application/json" \
  -d '{
    "incident_id": "414186",
    "async": true
  }'

# 응답
{
  "job_id": "abc-123",
  "status": "pending"
}

# 상태 확인
curl "http://localhost:40017/api/investigate?job_id=abc-123"

# 결과
{
  "status": "completed",
  "report_url": "/reports/incident_414186_2025-11-23T10-30-00.html"
}
```

---

## 보고서 유형별 가이드

### 1. 단일 인시던트 보고서

#### Claude Code 사용

```
프롬프트: "Investigate incident 414186 with comprehensive analysis"
```

**생성 파일**:
- `incident_414186_2025-11-23T10-30-00.json` (~140KB) - 전체 데이터
- `incident_414186_korean_2025-11-23T10-30-00.html` (~80KB) - 한글 HTML 보고서

**보고서 구성**:
1. Executive Summary (요약)
2. Claude AI 분석 (심층 분석)
3. 인시던트 개요
4. MITRE ATT&CK 매핑
5. 위협 인텔리전스 상관분석
6. 주요 발견사항
7. 권장 대응 조치
8. 타임라인 차트

### 2. 일간 보안 보고서

#### 자동 생성

```bash
# 어제 보고서
./daily-report.sh

# 특정 날짜
./daily-report.sh 2025-11-23

# AI 분석 포함
./script/auto-daily-report.sh
```

**생성 파일**:
- `public/reports/data/daily_incidents_data_2025-11-23.json` (~500KB)
- `public/reports/data/ai_analysis_2025-11-23.json` (~20KB)
- `public/reports/daily/daily_report_2025-11-23.html` (~150KB)
- `public/reports/daily/daily_report_2025-11-23.md` (~80KB)
- `public/reports/daily/daily_report_2025-11-23.json` (~520KB)

**보고서 구성**:
1. Executive Summary
2. 일일 통계 (인시던트 수, 심각도 분포)
3. 위협 평가 (Claude AI)
4. False Positive 분석
5. 주요 패턴 탐지
6. 권장 조치사항
7. 보안 태세 평가

### 3. 주간 보안 보고서

#### 자동 생성

```bash
# 지난 7일
./script/generate-weekly-report.sh

# 특정 날짜 기준 7일
./script/generate-weekly-report.sh 2025-11-23
```

**생성 파일**:
- `public/reports/weekly/weekly_report_2025-W47.html`
- `public/reports/weekly/weekly_report_2025-W47.md`
- `public/reports/weekly/weekly_report_2025-W47.json`

**보고서 구성**:
1. 주간 요약 (Executive Summary)
2. 일별 트렌드 차트
3. 전주 대비 증감율
4. Top 10 위협 유형
5. MITRE ATT&CK 기법 분포
6. 영향받은 엔드포인트
7. 보안 메트릭스
8. 주간 권장사항

### 4. 여러 인시던트 비교 분석

#### Claude Code 사용

```
프롬프트: "Investigate incidents 414186, 414187, 414188 and create a comparative analysis report"
```

**Claude가 추가로 분석하는 내용**:
- 인시던트 간 공통점/차이점
- 캠페인 연관성 평가 (APT 여부)
- 시간대별 패턴 분석
- 공통 IOC (파일 해시, IP, 도메인)
- 동일 공격자 가능성
- 종합 위협 평가

---

## 아키텍처 및 데이터 흐름

### 시스템 아키텍처

```
┌─────────────────────────────────────────────────────┐
│                  Claude Code UI                      │
│          (프롬프트 입력 → 보고서 수신)                │
└────────────────────┬────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│            Claude Investigation MCP                  │
│  • collect_incident_data                            │
│  • save_analysis_and_generate_report                │
└────────────────────┬────────────────────────────────┘
                     │
         ┌───────────┴───────────┐
         ▼                       ▼
┌──────────────────┐    ┌──────────────────┐
│   OpenSearch     │    │   PostgreSQL     │
│   (7 indices)    │    │   (TI database)  │
│                  │    │                  │
│ • incidents      │    │ • ioc_log        │
│ • alerts         │    │ • mitre          │
│ • files          │    │ • cve_details    │
│ • networks       │    │ • bazaar_malware │
│ • processes      │    │                  │
│ • endpoints      │    └──────────────────┘
│ • causality      │
└──────────────────┘
```

### 데이터 수집 프로세스

```
1️⃣ 기본 정보 수집
   ↓
   OpenSearch Query
   ├─ logs-cortex_xdr-incidents-* (인시던트 기본 정보)
   ├─ logs-cortex_xdr-alerts-* (알럿 상세)
   ├─ logs-cortex_xdr-files-* (파일 아티팩트)
   ├─ logs-cortex_xdr-networks-* (네트워크 연결)
   ├─ logs-cortex_xdr-processes-* (프로세스 실행)
   ├─ logs-cortex_xdr-endpoints-* (엔드포인트 정보)
   └─ logs-cortex_xdr-causality_chains-* (인과관계 체인)

2️⃣ TI 상관분석
   ↓
   PostgreSQL Query
   ├─ File Hash Matching (ioclog.ioc_log)
   │  └─ Verdict: threat | benign | unknown
   ├─ IP Reputation (ioclog.ioc_log)
   │  └─ GeoIP + Threat Intel
   ├─ MITRE Techniques (ioclog.mitre_techniques)
   │  └─ Technique ID, Name, Tactic
   └─ CVE Details (ioclog.cve_details)
      └─ CVSS Score, Description

3️⃣ 데이터 구조화
   ↓
   JSON 생성
   {
     "investigation": {
       "incident": {...},
       "alerts": [...],
       "files": [...],
       "networks": [...],
       "processes": [...],
       "endpoints": [...],
       "causality_chains": [...]
     },
     "ti_correlation": {
       "file_hashes": [...],
       "ip_addresses": [...],
       "mitre_techniques": [...],
       "cve_details": [...]
     },
     "summary": {...}
   }

4️⃣ Claude AI 분석
   ↓
   Claude Sonnet 4.5 Processing
   ├─ 전체 컨텍스트 분석 (토큰 제한 없음)
   ├─ 위협 패턴 식별
   ├─ 공격 체인 분석 (Kill Chain)
   ├─ False Positive 가능성 평가
   └─ 종합 판단 (verdict, risk_score, confidence)

5️⃣ 보고서 생성
   ↓
   HTML Template Rendering
   ├─ Tailwind CSS 스타일링
   ├─ Chart.js 타임라인
   ├─ MITRE 매트릭스 시각화
   └─ 인터랙티브 요소 추가
```

### Claude 분석 데이터 구조

```json
{
  "claude_analysis": {
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
      "key_findings": [
        "10개의 위협 파일 감지",
        "MITRE T1112 감지",
        "100개의 CVE 매칭"
      ]
    },
    "analyzed_at": "2025-11-23T10:30:00Z",
    "analyzed_by": "Claude Sonnet 4.5"
  }
}
```

---

## 실전 활용 예시

### 사례 1: False Positive 검증

**상황**: 보안팀이 인시던트 414186을 False Positive로 의심

**해결 (Claude Code)**:
```
프롬프트: "Investigate incident 414186 and evaluate the likelihood of this being a false positive"
```

**Claude 분석 결과**:
```markdown
## False Positive 평가

### 분석가 판단
- 초기 판단: False Positive
- 판단 근거: 레지스트리 수정이 정상 소프트웨어 업데이트로 보임

### Claude AI 재분석
1. **위협 파일 10개 감지**
   - SHA256 해시 매칭 결과 malware DB에서 확인
   - Threat Level: 80/100 (High)

2. **MITRE 기법 탐지**
   - T1112: Modify Registry (지속성 확보)
   - T1588.001: Obtain Capabilities (악성코드 획득)

3. **재평가 결론**
   - **FALSE POSITIVE 가능성: 15%**
   - **TRUE POSITIVE 가능성: 85%**
   - 권장: 즉시 엔드포인트 격리 및 상세 조사
```

### 사례 2: 캠페인 분석

**상황**: 유사한 인시던트 3건 발생, APT 캠페인 의심

**해결 (Claude Code)**:
```
프롬프트: "Investigate incidents 414186, 414187, 414188 and analyze if they are part of the same attack campaign"
```

**Claude 분석 결과**:
```markdown
## 캠페인 연관성 분석

### 공통 IOC
1. **파일 해시**
   - 3건 모두 동일한 SHA256 해시 공유
   - bead8af7e7407b5f... (malware: Trojan.Generic)

2. **네트워크 패턴**
   - 동일 C2 서버 연결: 192.168.1.100
   - 동일 포트: 8443 (HTTPS)

3. **MITRE 기법**
   - 모두 T1112 (레지스트리 수정) 사용
   - 모두 T1055 (프로세스 인젝션) 시도

### 타임라인 분석
- 414186: 2025-11-20 10:30:00
- 414187: 2025-11-20 14:15:00  (+3.75시간)
- 414188: 2025-11-20 18:45:00  (+4.5시간)
- 패턴: 4시간 간격 공격 (자동화 의심)

### 판정
✅ **동일 APT 캠페인 가능성: 95%**

권장 조치:
1. 모든 엔드포인트 즉시 격리
2. C2 IP 차단
3. 전체 네트워크 스캔
4. 침해지표 업데이트
```

### 사례 3: 주간 보안 보고 (경영진)

**상황**: 매주 월요일 경영진 보고 필요

**해결 (Cron + Claude Code)**:
```bash
# 1. Crontab 등록
0 9 * * 1 cd /www/ib-editor/my-app && ./script/generate-weekly-report.sh >> /var/log/weekly-report.log 2>&1

# 2. 매주 월요일 오전 9시 자동 생성
```

**생성된 보고서 내용**:
```markdown
# 주간 보안 보고서 (2025-W47)

## Executive Summary
- 총 인시던트: 427건 (전주 대비 +12%)
- Critical: 2건 (즉시 대응 완료)
- High: 45건 (검토 중 3건)
- False Positive 비율: 38.2% (전주 44.3% → 개선)

## 주요 위협
1. **Ransomware 시도** (2건)
   - 모두 EDR에서 차단
   - 영향받은 엔드포인트: 2대 (격리 완료)

2. **Credential Dumping** (8건)
   - MITRE T1003 탐지
   - 5건 False Positive, 3건 조사 중

## 보안 태세 평가
- 전반적 등급: B+ (전주 B → 개선)
- 강점: EDR 탐지율 향상, 대응 시간 단축
- 약점: False Positive 여전히 높음

## 권장사항
1. False Positive 튜닝 지속 (목표: 30% 이하)
2. Critical 인시던트 플레이북 점검
3. 직원 보안 교육 강화
```

### 사례 4: 자동화된 SIEM 통합

**상황**: 신규 인시던트 발생 시 자동 분석 및 티켓팅

**해결 (REST API)**:
```python
import requests
import time

def auto_investigate_new_incidents():
    """신규 인시던트 자동 조사 및 티켓 생성"""

    # 1. OpenSearch에서 신규 인시던트 조회
    new_incidents = get_new_incidents_from_opensearch()

    for incident in new_incidents:
        incident_id = incident['incident_id']
        severity = incident['severity']

        # 2. 비동기 조사 시작
        response = requests.post(
            'http://localhost:40017/api/investigate',
            json={'incident_id': incident_id, 'async': True}
        )
        job_id = response.json()['job_id']

        # 3. 완료 대기
        while True:
            status_response = requests.get(
                f'http://localhost:40017/api/investigate?job_id={job_id}'
            )
            status = status_response.json()['status']

            if status == 'completed':
                break
            time.sleep(5)

        # 4. 결과 가져오기
        result = status_response.json()
        report_url = result['report_url']
        risk_score = result['risk_score']
        verdict = result['verdict']

        # 5. 티켓팅 시스템에 자동 등록
        create_ticket(
            incident_id=incident_id,
            severity=severity,
            risk_score=risk_score,
            verdict=verdict,
            report_url=f"http://localhost:40017{report_url}"
        )

        # 6. High risk인 경우 Slack 알림
        if risk_score >= 70:
            send_slack_alert(incident_id, risk_score, verdict)

# 매 15분마다 실행
while True:
    auto_investigate_new_incidents()
    time.sleep(900)  # 15분
```

---

## 트러블슈팅

### 문제 1: "MCP 도구가 인식되지 않음"

**증상**:
```
Claude Code에서 claude-investigation MCP 도구가 보이지 않음
```

**해결**:
```bash
# 1. .mcp.json 파일 확인
cat /www/ib-editor/my-app/.mcp.json | grep claude-investigation -A 10

# 2. 스크립트 파일 존재 확인
ls -la /www/ib-editor/my-app/script/claude-investigation-mcp.js

# 3. Claude Code 완전 재시작
# (단순 새 대화가 아니라 앱 자체를 종료했다가 재시작)

# 4. 환경 변수 확인
env | grep -E "OPENSEARCH|DATABASE"
```

### 문제 2: "데이터 수집 실패"

**증상**:
```
Error: OpenSearch connection refused
```

**해결**:
```bash
# 1. OpenSearch 연결 확인
curl -u "admin:Admin@123456" "http://opensearch:9200/_cluster/health?v"

# 2. 호스트 매핑 확인
cat /etc/hosts | grep opensearch

# 3. 인시던트 존재 확인
curl -u admin:Admin@123456 "http://opensearch:9200/logs-cortex_xdr-incidents-*/_search" \
  -H 'Content-Type: application/json' \
  -d '{"query":{"match":{"incident_id":"414186"}}}'
```

### 문제 3: "TI 상관분석 실패"

**증상**:
```
Error: PostgreSQL connection failed
```

**해결**:
```bash
# 1. PostgreSQL 연결 확인
PGPASSWORD=postgres psql -h postgres -U postgres -d n8n -c "\dt ioclog.*"

# 2. TI 데이터 확인
PGPASSWORD=postgres psql -h postgres -U postgres -d n8n -c "SELECT COUNT(*) FROM ioclog.bazaar_malware"

# 3. 환경 변수 확인
echo $DATABASE_URL
```

### 문제 4: "보고서가 생성되지 않음"

**증상**:
```
Error: Cannot write to public/reports/
```

**해결**:
```bash
# 1. 디렉토리 생성
mkdir -p public/reports

# 2. 권한 확인
chmod 755 public/reports

# 3. 디스크 공간 확인
df -h public/reports/

# 4. 수동 테스트
npx tsx script/generate-korean-html-report.ts 414186
```

### 문제 5: "AI 분석 느림"

**증상**:
```
Claude 분석이 1분 이상 소요됨
```

**해결**:
- **정상**: Claude Sonnet 4.5는 전체 컨텍스트를 분석하므로 30-60초 소요
- **대안**: 빠른 분석이 필요한 경우 CLI 스크립트 사용 (Azure GPT-4o-mini, 8-16초)

```bash
# CLI 사용 (빠름)
npx tsx script/investigate-incident-cli.ts --incident-id 414186
```

### 문제 6: "Cron job이 실행되지 않음"

**증상**:
```
자동 보고서가 생성되지 않음
```

**해결**:
```bash
# 1. Cron 서비스 상태 확인
sudo systemctl status cron

# 2. Cron 로그 확인
sudo tail -f /var/log/syslog | grep CRON

# 3. 수동 실행으로 에러 확인
cd /www/ib-editor/my-app && ./script/auto-daily-report.sh

# 4. 실행 권한 확인
ls -la /www/ib-editor/my-app/script/*.sh
chmod +x /www/ib-editor/my-app/script/*.sh
```

---

## 📚 참고 자료

### 문서
- **README_INVESTIGATION.md** - 인시던트 조사 시스템 상세
- **README-DAILY-REPORT.md** - 일간 보고서 생성 가이드
- **CRON_SETUP.md** - 자동화 스케줄링 설정
- **COMPLETE_DAILY_REPORT_ARCHITECTURE.md** - 일간 보고서 아키텍처
- **AUTOMATION_PIPELINE_ANALYSIS.md** - 자동화 파이프라인 분석

### 스크립트
- `script/investigate-incident-cli.ts` - CLI 인시던트 조사
- `script/claude-investigation-mcp.js` - Claude Investigation MCP 서버
- `script/report-data-collector.ts` - 데이터 수집 (AI 없음)
- `script/generate-korean-html-report.ts` - 한글 HTML 보고서 생성
- `script/auto-daily-report.sh` - 일간 보고서 자동화

### 웹 접속
- 일간 보고서: `http://localhost:40017/reports/daily/daily_report_2025-11-23.html`
- 주간 보고서: `http://localhost:40017/reports/weekly/weekly_report_2025-W47.html`
- 개별 인시던트: `http://localhost:40017/reports/incident_414186_2025-11-23T10-30-00.html`

---

## 🎓 추가 학습 자료

### Claude Code 사용법
- **프롬프트 엔지니어링**: 명확하고 구체적인 질문
- **컨텍스트 제공**: 충분한 배경 정보
- **반복 개선**: Claude와 대화하며 보고서 품질 향상

### 보안 분석 모범 사례
- **False Positive 판단**: 여러 증거 종합 평가
- **공격 체인 분석**: Kill Chain 각 단계 확인
- **IOC 검증**: 신뢰할 수 있는 TI 소스 사용
- **시간대 분석**: 공격 패턴 및 캠페인 연관성

### 자동화 최적화
- **Cron 스케줄**: 시스템 부하가 낮은 시간대 선택
- **캐싱 활용**: 중복 조사 방지
- **병렬 처리**: 여러 인시던트 동시 분석
- **리소스 관리**: 디스크 공간 및 메모리 모니터링

---

**작성일**: 2025-11-23
**버전**: 3.0
**작성자**: Claude Code AI Assistant
**문의**: 보안팀 또는 개발팀
