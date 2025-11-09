# Incident Investigation System

완전 자동화된 인시던트 조사 및 AI 분석 시스템

## 🎯 주요 기능

### ✅ 완료된 기능 (All Phases Complete)

**Phase 1: 버그 수정 및 기능 개선**
- ✅ 파일 해시 표시 버그 수정 (threat/unknown/benign 모두 표시)
- ✅ CVE 매칭 개선 (Exact vs Fuzzy 구분, confidence 점수 추가)
- ✅ IP 주소 TI 상관 분석 추가

**Phase 2: 병렬 AI 분석 시스템**
- ✅ 데이터 필터링 (카테고리별 최적화, 68% 토큰 절감)
- ✅ 7개 AI 분석기 구현 (병렬 실행)
  - Analyst Verifier (분석가 판단 검증)
  - File Hash Analyzer (파일 위협 분석)
  - Network Analyzer (네트워크 행위 분석)
  - MITRE Analyzer (ATT&CK 기법 분석)
  - CVE Analyzer (취약점 검증)
  - Endpoint Analyzer (엔드포인트 위험도 분석)
  - Synthesizer (종합 판단)
- ✅ 병렬 오케스트레이터 (Promise.all, 3-5x 속도 향상)
- ✅ MCP 서버 통합 (Claude Code UI에서 사용 가능)

**Phase 3: 백그라운드 처리 시스템**
- ✅ CLI 스크립트 (수동 실행, 배치 처리)
- ✅ REST API (동기/비동기 모드)
- ✅ Cron Job (주기적 자동 조사)
- ✅ File Watcher (이벤트 기반 트리거)

## 🚀 빠른 시작

### 1. 단일 인시던트 조사 (CLI)
```bash
npx tsx script/investigate-incident-cli.ts --incident-id 414186
```

### 2. Claude Code에서 사용 (MCP)
```
Investigate incident 414186
```

### 3. REST API 호출
```bash
curl -X POST http://localhost:3000/api/investigate \
  -H "Content-Type: application/json" \
  -d '{"incident_id": "414186"}'
```

### 4. 자동 조사 활성화 (Cron)
```bash
# Foreground (테스트)
npx tsx script/cron-investigate.ts --once

# Background (Production)
sudo systemctl start incident-investigation
```

## 📊 시스템 아키텍처

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
│     • Incidents, Alerts, Files, Networks                    │
│     • Processes, Endpoints, CVEs                            │
│                                                              │
│  2️⃣ TI Correlation (PostgreSQL)                            │
│     • File hashes → Threat/Unknown/Benign                   │
│     • IP addresses → GeoIP + Threat Intel                   │
│     • MITRE techniques → Full ATT&CK details                │
│     • CVEs → CVSS scores + Descriptions                     │
│                                                              │
│  3️⃣ Parallel AI Analysis (Azure OpenAI)                    │
│     • 6 parallel analyzers + 1 synthesizer                  │
│     • Token optimization (68% reduction)                    │
│     • Execution time: 5-10 seconds                          │
│                                                              │
│  4️⃣ Result Storage                                          │
│     • JSON (full data, ~140KB)                              │
│     • Markdown (human-readable report, ~50KB)               │
└─────────────────────────────────────────────────────────────┘
```

## 📁 프로젝트 구조

```
/www/ib-editor/my-app/
├── script/
│   ├── opensearch-executor.ts        # OpenSearch 쿼리 엔진
│   ├── ti-correlator.ts              # TI 상관 분석 (PostgreSQL)
│   ├── investigation-cache.ts        # 결과 저장/로드
│   ├── ai-data-filter.ts             # 토큰 최적화 필터
│   ├── ai-parallel-analyzer.ts       # AI 병렬 오케스트레이터
│   ├── ai-analyzers/                 # 7개 AI 분석기
│   │   ├── analyst-verifier.ts       # 분석가 검증
│   │   ├── file-hash-analyzer.ts     # 파일 위협 분석
│   │   ├── network-analyzer.ts       # 네트워크 분석
│   │   ├── mitre-analyzer.ts         # MITRE 분석
│   │   ├── cve-analyzer.ts           # CVE 검증
│   │   ├── endpoint-analyzer.ts      # 엔드포인트 분석
│   │   └── synthesizer.ts            # 종합 판단
│   ├── markdown-formatter.ts         # 리포트 생성
│   ├── investigate-incident-cli.ts   # CLI 도구
│   ├── cron-investigate.ts           # Cron Job
│   ├── watch-incidents.ts            # File Watcher
│   └── nl-query-mcp.js               # MCP 서버
├── app/api/investigate/
│   └── route.ts                      # REST API 엔드포인트
├── data/
│   ├── investigations/               # 조사 결과 (JSON + MD)
│   ├── watch/                        # File Watcher 디렉토리
│   └── cron-state.json               # Cron 상태
└── docs/
    ├── SYSTEM_OVERVIEW.md            # 전체 시스템 개요
    ├── API_USAGE.md                  # API 사용법
    └── CRON_SETUP.md                 # Cron 설정 가이드
```

## 🔧 환경 설정

### 필수 환경 변수 (`.env.local`)

```bash
# OpenSearch (Remote - Incident Data)
OPENSEARCH_URL=http://opensearch:9200
OPENSEARCH_USER=admin
OPENSEARCH_PASSWORD=Admin@123456

# PostgreSQL (TI Database)
DATABASE_URL=postgresql://user:pass@localhost:5432/ioclog

# Azure OpenAI (AI Analysis)
AZURE_OPENAI_API_KEY=your-key-here
AZURE_OPENAI_ENDPOINT=https://your-endpoint.openai.azure.com/
AZURE_OPENAI_DEPLOYMENT=gpt-4o-mini

# Cron Configuration (Optional)
CRON_INTERVAL=60            # 실행 간격 (분)
CRON_LOOKBACK=24h           # 검색 기간
CRON_MAX_INCIDENTS=10       # 최대 처리 개수

# File Watcher (Optional)
WATCH_DIR=./data/watch
WATCH_PATTERN=.txt
WATCH_DEBOUNCE=1000
```

## 📖 사용 방법

### CLI 사용 예제

```bash
# 1. 단일 인시던트 조사
npx tsx script/investigate-incident-cli.ts --incident-id 414186

# 2. 캐시 무시 (강제 재조사)
npx tsx script/investigate-incident-cli.ts --incident-id 414186 --force

# 3. 배치 처리
echo "414186\n414187\n414188" > incidents.txt
npx tsx script/investigate-incident-cli.ts --batch incidents.txt

# 4. 최근 24시간 내 신규 인시던트 자동 발견
npx tsx script/investigate-incident-cli.ts --auto-new --since 24h
```

### REST API 사용 예제

**동기 모드** (결과 즉시 반환):
```bash
curl -X POST http://localhost:3000/api/investigate \
  -H "Content-Type: application/json" \
  -d '{"incident_id": "414186"}'
```

**비동기 모드** (백그라운드 실행):
```bash
# 조사 시작
curl -X POST http://localhost:3000/api/investigate \
  -H "Content-Type: application/json" \
  -d '{"incident_id": "414186", "async": true}'
# 응답: {"job_id": "abc-123", "status": "pending"}

# 상태 확인
curl "http://localhost:3000/api/investigate?job_id=abc-123"

# 작업 취소
curl -X DELETE "http://localhost:3000/api/investigate?job_id=abc-123"
```

### Cron Job 설정

**Option 1: Systemd (Production)**
```bash
# 서비스 설치
sudo cp script/incident-investigation.service /etc/systemd/system/
sudo systemctl daemon-reload

# 시작 및 활성화
sudo systemctl start incident-investigation
sudo systemctl enable incident-investigation

# 상태 확인
sudo systemctl status incident-investigation

# 로그 모니터링
sudo journalctl -u incident-investigation -f
```

**Option 2: Crontab (Simple)**
```bash
# crontab 편집
crontab -e

# 매시 정각 실행
0 * * * * /www/ib-editor/my-app/script/cron-investigate.sh --once >> /var/log/incident-cron.log 2>&1
```

### File Watcher 사용

```bash
# Watcher 시작
npx tsx script/watch-incidents.ts

# 다른 터미널에서 트리거 파일 생성
echo "414186" > data/watch/incident-414186.txt

# 자동으로 조사 시작 → 완료 시 파일 삭제
```

## 📊 성능 지표

| 항목 | 값 | 비고 |
|------|------|------|
| **실행 시간** | 8-16초 | 전체 파이프라인 |
| **토큰 사용** | ~5.2K | 분석당 (68% 절감) |
| **비용** | ~$0.001 | gpt-4o-mini 기준 |
| **병렬 처리** | 6개 동시 | 3-5x 속도 향상 |
| **JSON 크기** | ~140KB | 전체 데이터 |
| **Markdown 크기** | ~50KB | 리포트 |

## 🎯 AI 분석 결과 예시

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

## 📈 출력 파일 예시

### JSON 파일 (`incident_414186_2025-11-08T14-35-57.json`)
```json
{
  "incident_id": "414186",
  "timestamp": "2025-11-08T14:35:57.123Z",
  "incident": { /* 인시던트 메타데이터 */ },
  "alerts": [ /* 100개 알림 */ ],
  "files": [ /* 100개 파일 */ ],
  "networks": [ /* 87개 네트워크 연결 */ ],
  "endpoints": [ /* 1개 엔드포인트 */ ],
  "cves": [ /* 100개 CVE */ ],
  "ti_correlation": {
    "file_hashes": [ /* 9개 매칭 */ ],
    "ip_addresses": [ /* 0개 매칭 */ ],
    "mitre_techniques": [ /* 2개 기법 */ ],
    "cve_details": [ /* 23개 상세 */ ]
  },
  "summary": { /* 통계 */ }
}
```

### Markdown 파일 (`incident_414186_2025-11-08T14-35-57.md`)
```markdown
# 🔍 Incident Investigation: 414186

## 📋 Incident Overview
- **ID**: 414186
- **Severity**: high
- **Status**: resolved_false_positive
- **Hosts**: ktc-d111783
- **Users**: administrator

**MITRE Techniques**:
- T1112 - Modify Registry
- T1588.001 - Obtain Capabilities: Malware

## 🤖 AI 병렬 분석 결과

**최종 판단**: needs_investigation
**위험도**: 65/100
**신뢰도**: 85%

### Executive Summary
이 인시던트는 레지스트리 수정 및 악성코드 획득 행위를 포함하며...

### 📋 Recommendations
1. 위협 파일 격리 및 상세 분석 수행
2. 레지스트리 변경 사항 검토
3. 엔드포인트 CVE 패칭 진행

## 🗂️ File Hash TI Correlation
- 🔴 위협 (Threat): 10개
- ⚠️ 미확인 (Unknown): 90개
- ✅ 안전 (Benign): 0개
```

## 🛠️ 트러블슈팅

### 일반적인 문제

**1. "Incident not found"**
```bash
# OpenSearch 연결 확인
curl -u admin:Admin@123456 "http://opensearch:9200/_cat/indices/logs-cortex_xdr-incidents-*"
```

**2. "TI correlation failed"**
```bash
# PostgreSQL 연결 확인
psql -U postgres -h localhost -d ioclog -c "SELECT COUNT(*) FROM ioclog.ioc_simple;"
```

**3. "AI analysis failed"**
```bash
# Azure OpenAI API 키 확인
env | grep AZURE_OPENAI

# API 연결 테스트
curl -H "api-key: $AZURE_OPENAI_API_KEY" "$AZURE_OPENAI_ENDPOINT/openai/deployments?api-version=2023-05-15"
```

**4. "Disk full"**
```bash
# 30일 이상 된 파일 삭제
find data/investigations/ -name "*.json" -mtime +30 -delete
find data/investigations/ -name "*.md" -mtime +30 -delete
```

## 📚 추가 문서

- [SYSTEM_OVERVIEW.md](docs/SYSTEM_OVERVIEW.md) - 전체 시스템 아키텍처 및 상세 설명
- [API_USAGE.md](docs/API_USAGE.md) - REST API 사용법 및 예제
- [CRON_SETUP.md](docs/CRON_SETUP.md) - Cron Job 설정 및 모니터링

## 🎓 사용 사례

### 사례 1: SOC 분석가 (Interactive)
```bash
# Claude Code에서
"Investigate incident 414186"

# 또는 CLI로
npx tsx script/investigate-incident-cli.ts --incident-id 414186
```

### 사례 2: 자동화된 SIEM (Production)
```bash
# Systemd로 Cron Job 실행
sudo systemctl start incident-investigation

# 매시간 자동으로 신규 인시던트 조사
```

### 사례 3: 외부 시스템 연동 (API)
```python
import requests

# 티켓팅 시스템에서 신규 인시던트 수신 시
response = requests.post('http://siem/api/investigate', json={
    'incident_id': ticket.incident_id,
    'async': True
})

# 결과를 티켓에 자동 첨부
```

### 사례 4: 파일 기반 트리거 (Watcher)
```bash
# SIEM이 CSV 내보내기 → 스크립트가 incident ID 추출 → 파일 생성
cat incidents_export.csv | awk -F',' '{print $1}' | while read id; do
    echo "$id" > data/watch/incident-$id.txt
done

# File Watcher가 자동으로 모든 인시던트 조사
```

## 🚀 향후 계획 (Phase 4+)

- [ ] Real-time Dashboard (실시간 조사 상태)
- [ ] Webhooks (조사 완료 알림)
- [ ] Prometheus Metrics (성능 모니터링)
- [ ] Report Templates (커스텀 리포트)
- [ ] Multi-tenant Support (테넌트별 큐)
- [ ] Redis Caching (TI 조회 캐싱)
- [ ] Horizontal Scaling (워커 분산)

## 📞 지원

문제가 발생하면 다음을 확인하세요:

1. **로그 확인**:
   ```bash
   # CLI
   npx tsx script/investigate-incident-cli.ts --incident-id 414186 2>&1 | tee debug.log

   # Systemd
   sudo journalctl -u incident-investigation -n 100

   # File Watcher
   npx tsx script/watch-incidents.ts 2>&1 | tee watcher.log
   ```

2. **환경 변수 확인**:
   ```bash
   cat .env.local | grep -E "OPENSEARCH|AZURE|DATABASE"
   ```

3. **상태 파일 확인**:
   ```bash
   cat data/cron-state.json
   ls -lh data/investigations/ | tail -20
   ```

---

**구축 일자**: 2025-11-08
**버전**: 1.0.0
**상태**: Production Ready ✅
