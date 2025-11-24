# Claude --print 다단계 분석 전략

> **목적**: `claude --print`를 여러 섹션으로 나눠 실행 → JSON 수집 → 다시 종합하여 고품질 보고서 생성
> **기반**: 기존 `investigate-incident-cli.ts`, `opensearch-executor.ts` 활용

---

## 1. 기존 시스템 분석

### 1.1 현재 데이터 수집 구조 (opensearch-executor.ts)

**`executeIncidentInvestigation(incidentId)` 함수**가 이미 완벽하게 데이터 수집 중:

```typescript
// 반환 구조:
{
  incident: {},           // 인시던트 메타데이터
  alerts: [],            // 시간순 알럿 (공격 타임라인)
  files: [],             // 파일 아티팩트 (해시, 실행시간, 경로)
  networks: [],          // 네트워크 아티팩트 (도메인, IP, 연결시간)
  processes: [],         // 프로세스 아티팩트 (부모-자식 관계)
  endpoints: [],         // 엔드포인트 (호스트 + CVE)
  summary: {
    total_alerts: N,
    total_files: N,
    total_networks: N,
    total_processes: N,
    total_endpoints: N
  }
}
```

**✅ 이미 완성됨** - 7개 인덱스 모두 수집, 상관관계 포함

### 1.2 현재 TI 상관분석 (ti-correlator.ts)

```typescript
// PostgreSQL n8n DB에서 TI 매칭
checkHashesInTI(hashes)        // 파일 해시 → bazaar_malware 매칭
checkIPsInTI(ips)              // IP/도메인 → ioc_log 매칭
getMITREByTechniqueIds(ids)    // MITRE 기법 → 한글 설명
getCVEDetails(cveIds)          // CVE → 상세 정보
```

**✅ 이미 완성됨** - PostgreSQL TI 데이터 완벽 활용

### 1.3 현재 AI 분석 (ai-parallel-analyzer.ts)

```typescript
// 7개 병렬 AI 분석 + 1개 종합
runParallelAnalysis(investigationData) → {
  analyst_verifier,      // 분석가 판단 검증
  file_hash_analyzer,    // 파일 위협 분석
  network_analyzer,      // 네트워크 행위 분석
  mitre_analyzer,        // MITRE 기법 분석
  cve_analyzer,          // CVE 취약점 검증
  endpoint_analyzer,     // 엔드포인트 위험 평가
  synthesizer            // 최종 종합 판단
}
```

**✅ 이미 완성됨** - Azure OpenAI로 7개 분석기 병렬 실행

---

## 2. 문제점: 왜 보고서 품질이 낮은가?

### 현재 방식 (investigate-incident-cli.ts)
```
1개 인시던트 → 데이터 수집 → AI 병렬 분석 → Markdown 생성
```

**문제**:
1. ❌ **단일 AI 호출**: 7개 분석기 각각 1번씩만 호출 → 깊이 부족
2. ❌ **섹션 구분 없음**: 모든 데이터를 한 번에 던짐 → 토큰 낭비, 분석 얕음
3. ❌ **재분석 불가**: 특정 부분만 다시 분석 못 함
4. ❌ **일일 보고서 구조 없음**: 개별 인시던트만 분석, 일별 통합 없음

### 목표 방식 (claude --print 다단계)
```
여러 인시던트 → 섹션별 데이터 준비 → 섹션별 claude --print
→ JSON 수집 → 다시 종합 claude --print → 최종 보고서
```

**장점**:
1. ✅ **섹션별 심층 분석**: 각 섹션마다 독립적인 AI 분석
2. ✅ **토큰 효율**: 필요한 데이터만 선택적 전달
3. ✅ **재분석 가능**: 특정 섹션만 다시 실행 가능
4. ✅ **일일 보고서 구조**: 여러 인시던트 → 카테고리별 정리 → 통합 보고서

---

## 3. 핵심 전략: 3-Stage Pipeline

### Stage 1: 데이터 수집 및 전처리 (기존 코드 활용)

```typescript
// script/collect-daily-data.ts
async function collectDailyIncidents(date: string) {
  // 1. 해당 날짜의 모든 인시던트 ID 수집
  const incidentIds = await getIncidentIdsByDate(date);

  // 2. 각 인시던트별 상세 데이터 수집 (기존 함수 활용)
  const allIncidents = [];
  for (const incidentId of incidentIds) {
    const data = await executeIncidentInvestigation(incidentId); // ← 기존 함수
    const tiData = await correlateTI(data); // ← 기존 함수
    allIncidents.push({ ...data, ti: tiData });
  }

  // 3. 섹션별 데이터 준비
  return {
    // 섹션 1: 전체 요약
    summary: {
      total_incidents: allIncidents.length,
      by_severity: groupBySeverity(allIncidents),
      by_status: groupByStatus(allIncidents),
      top_hosts: getTopHosts(allIncidents)
    },

    // 섹션 2: TOP 10 인시던트 (심각도 + 복잡도 기준)
    top_incidents: allIncidents
      .sort((a, b) => calculateComplexityScore(b) - calculateComplexityScore(a))
      .slice(0, 10)
      .map(inc => ({
        incident_id: inc.incident.incident_id,
        description: inc.incident.description,
        severity: inc.incident.severity,

        // 공격 타임라인 (알럿 시간순 정렬)
        attack_timeline: inc.alerts
          .sort((a, b) => new Date(a.detection_timestamp) - new Date(b.detection_timestamp))
          .map(a => ({
            time: a.detection_timestamp,
            alert_name: a.alert_name,
            action: a.action_type
          })),

        // 파일 실행 추적
        file_execution_chain: traceFileExecution(inc.files, inc.processes),

        // 네트워크 연결 추적
        network_connections: inc.networks.map(n => ({
          time: n.connection_timestamp,
          domain: n.action_external_hostname,
          ip: n.action_external_ip,
          process: findRelatedProcess(inc.processes, n)
        })),

        // 호스트 취약점
        host_cves: inc.endpoints.map(e => ({
          hostname: e.endpoint_name,
          cves: e.cves || [],
          os_version: e.os_version
        })),

        // TI 매칭 결과
        ti_matches: inc.ti
      })),

    // 섹션 3: 파일 해시 분석 (카테고리별)
    file_analysis: {
      malicious: extractMaliciousFiles(allIncidents),
      suspicious: extractSuspiciousFiles(allIncidents),
      benign: extractBenignFiles(allIncidents),
      unknown: extractUnknownFiles(allIncidents)
    },

    // 섹션 4: 네트워크 위협 (외부 IP/도메인)
    network_threats: {
      malicious_ips: extractMaliciousIPs(allIncidents),
      suspicious_domains: extractSuspiciousDomains(allIncidents),
      c2_candidates: identifyC2Candidates(allIncidents)
    },

    // 섹션 5: 호스트별 취약점 요약
    host_vulnerabilities: groupCVEsByHost(allIncidents),

    // 섹션 6: MITRE ATT&CK 매핑
    mitre_techniques: extractMITRETechniques(allIncidents),

    // 섹션 7: 주요 발견사항 (자동 추출)
    key_findings: {
      high_risk_patterns: detectHighRiskPatterns(allIncidents),
      recurring_issues: detectRecurringIssues(allIncidents),
      anomalies: detectAnomalies(allIncidents)
    }
  };
}
```

**출력**: `/tmp/daily_data_2025-11-23.json` (모든 섹션별 데이터)

---

### Stage 2: 섹션별 Claude --print 실행

```bash
#!/bin/bash
# script/analyze-sections.sh

DATE="2025-11-23"
DATA_FILE="/tmp/daily_data_${DATE}.json"
OUTPUT_DIR="/tmp/section_analysis_${DATE}"

mkdir -p $OUTPUT_DIR

# 섹션 1: 전체 요약 분석
echo "섹션 1: 전체 요약 분석 중..."
cat <<EOF | claude --print --model sonnet-4.5 > ${OUTPUT_DIR}/section1_summary.json
다음 일일 인시던트 데이터의 전체 요약을 분석하세요:

$(jq '.summary' $DATA_FILE)

**요청사항**:
1. 전일 대비 증감 추세 분석 (인시던트 수, 심각도 분포)
2. 가장 주목해야 할 지표 3가지
3. 전반적인 보안 상태 평가 (Good/Fair/Poor)
4. 한 문단 요약 (200-300자, 한글)

**출력 형식**: JSON
{
  "trend_analysis": "...",
  "top_3_metrics": ["...", "...", "..."],
  "security_status": "Fair",
  "summary_ko": "..."
}
EOF

# 섹션 2: TOP 10 인시던트 상세 분석
echo "섹션 2: TOP 10 인시던트 분석 중..."
cat <<EOF | claude --print --model sonnet-4.5 > ${OUTPUT_DIR}/section2_top_incidents.json
다음 TOP 10 인시던트를 각각 분석하세요:

$(jq '.top_incidents' $DATA_FILE)

**요청사항** (각 인시던트별):
1. **공격 흐름 분석**: attack_timeline을 보고 시간순 공격 단계 설명
   - 예: "10:15 초기 침투 (피싱 이메일) → 10:20 악성 파일 실행 → 10:25 C2 연결"

2. **파일-프로세스-네트워크 연결 추적**:
   - file_execution_chain: 어떤 파일이 어떤 프로세스를 실행했는지
   - network_connections: 그 프로세스가 어디로 연결했는지
   - 예: "악성파일.exe → powershell.exe 실행 → evil.com:443 연결"

3. **CVE 취약점 영향**: host_cves를 보고 이 인시던트와 관련된 취약점이 있는지

4. **TI 매칭 결과**: ti_matches를 보고 알려진 위협인지 판단

5. **최종 판단**: True Positive / False Positive / 추가 조사 필요

6. **한글 요약** (300-500자)

**출력 형식**: JSON 배열
[
  {
    "incident_id": "414186",
    "attack_flow_ko": "...",
    "file_process_network_chain_ko": "...",
    "cve_impact_ko": "...",
    "ti_verdict_ko": "...",
    "final_verdict": "true_positive",
    "summary_ko": "..."
  },
  ...
]
EOF

# 섹션 3: 파일 해시 분석 (악성/의심/정상/미확인 별도 분석)
echo "섹션 3-1: 악성 파일 분석 중..."
cat <<EOF | claude --print --model gemini-2.0-flash > ${OUTPUT_DIR}/section3_malicious_files.json
다음 악성으로 확인된 파일들을 분석하세요:

$(jq '.file_analysis.malicious' $DATA_FILE)

**요청사항**:
1. 각 파일별 위협 유형 (트로이얀, 랜섬웨어, 스파이웨어 등)
2. TI 소스에서 보고된 내용 요약
3. 어떤 인시던트에서 발견되었는지
4. 권장 조치 (격리, 삭제, 추가 조사 등)
5. 한글 요약 (파일당 100-200자)

**출력 형식**: JSON
EOF

echo "섹션 3-2: 의심 파일 분석 중..."
cat <<EOF | claude --print --model gemini-2.0-flash > ${OUTPUT_DIR}/section3_suspicious_files.json
다음 의심스러운 파일들을 분석하세요:

$(jq '.file_analysis.suspicious' $DATA_FILE)

**요청사항**:
1. 왜 의심스러운지 (낮은 평판, 비정상 경로 등)
2. 추가 조사가 필요한 이유
3. 샌드박스 분석 권장 여부
4. 한글 요약

**출력 형식**: JSON
EOF

# 섹션 4: 네트워크 위협 분석
echo "섹션 4: 네트워크 위협 분석 중..."
cat <<EOF | claude --print --model gemini-2.0-flash > ${OUTPUT_DIR}/section4_network_threats.json
다음 네트워크 위협을 분석하세요:

$(jq '.network_threats' $DATA_FILE)

**요청사항**:
1. **악성 IP 분석**:
   - 각 IP별 위협 유형 (C2, Malware Distribution, Phishing 등)
   - 어떤 호스트에서 연결 시도했는지
   - 차단 여부 및 권장 조치

2. **의심 도메인 분석**:
   - 도메인 평판
   - DNS 조회 이력
   - 관련 인시던트

3. **C2 후보 식별**:
   - 왜 C2로 의심되는지 (비콘 패턴, 연결 빈도 등)
   - 영향받은 호스트 목록
   - 긴급 대응 필요 여부

**출력 형식**: JSON
EOF

# 섹션 5: 호스트 취약점 분석
echo "섹션 5: 호스트별 CVE 분석 중..."
cat <<EOF | claude --print --model gemini-2.0-flash > ${OUTPUT_DIR}/section5_host_cves.json
다음 호스트별 CVE 취약점을 분석하세요:

$(jq '.host_vulnerabilities' $DATA_FILE)

**요청사항** (호스트별):
1. 총 CVE 개수 및 심각도 분포
2. Critical/High CVE 중 Exploit 가능한 것 강조
3. 패치 가능 여부
4. 이 호스트에서 발생한 인시던트와의 연관성
   - 예: "CVE-2024-1234 취약점이 있는 호스트에서 실제로 Exploit 시도 인시던트 발생"
5. 우선순위 패치 권장 목록
6. 한글 요약 (호스트당 200-300자)

**출력 형식**: JSON
EOF

# 섹션 6: MITRE ATT&CK 분석
echo "섹션 6: MITRE ATT&CK 기법 분석 중..."
cat <<EOF | claude --print --model sonnet-4.5 > ${OUTPUT_DIR}/section6_mitre.json
다음 MITRE ATT&CK 기법들을 분석하세요:

$(jq '.mitre_techniques' $DATA_FILE)

**요청사항**:
1. 가장 많이 사용된 Tactic TOP 5 (Initial Access, Execution, Persistence 등)
2. 각 Tactic별 주요 Technique 및 한글 설명
3. 공격자 전략 분석
   - 예: "대부분 Initial Access → Execution → Persistence 순서로 진행"
4. 방어 권장사항 (각 Tactic별 대응 방법)
5. MITRE 히트맵 데이터 (시각화용)

**출력 형식**: JSON
{
  "top_tactics": [...],
  "tactics_breakdown": {...},
  "attacker_strategy_ko": "...",
  "defense_recommendations_ko": [...],
  "heatmap_data": [
    { "tactic": "Initial Access", "technique": "T1566.001", "count": 15 },
    ...
  ]
}
EOF

# 섹션 7: 주요 발견사항
echo "섹션 7: 주요 발견사항 분석 중..."
cat <<EOF | claude --print --model sonnet-4.5 > ${OUTPUT_DIR}/section7_key_findings.json
다음 주요 발견사항을 분석하세요:

$(jq '.key_findings' $DATA_FILE)

**요청사항**:
1. **고위험 패턴**:
   - high_risk_patterns를 보고 반복되는 공격 패턴 식별
   - 예: "동일한 악성 파일이 5개 호스트에서 발견됨"

2. **재발 이슈**:
   - recurring_issues를 보고 계속 발생하는 문제 파악
   - 예: "매일 같은 피싱 이메일 차단됨 → 사용자 교육 필요"

3. **이상 징후**:
   - anomalies를 보고 평소와 다른 점 분석
   - 예: "평소보다 3배 많은 외부 연결 시도"

4. **종합 평가** (300-500자 한글)

**출력 형식**: JSON
EOF

echo "모든 섹션 분석 완료!"
ls -lh $OUTPUT_DIR/
```

**출력**: `/tmp/section_analysis_2025-11-23/*.json` (7개 섹션별 AI 분석 결과)

---

### Stage 3: 종합 보고서 생성

```bash
#!/bin/bash
# script/synthesize-report.sh

DATE="2025-11-23"
SECTION_DIR="/tmp/section_analysis_${DATE}"
FINAL_OUTPUT="/tmp/final_report_${DATE}.json"

echo "최종 보고서 종합 중..."

# 모든 섹션 분석 결과를 하나로 합침
jq -s '{
  section1_summary: .[0],
  section2_top_incidents: .[1],
  section3_malicious_files: .[2],
  section3_suspicious_files: .[3],
  section4_network_threats: .[4],
  section5_host_cves: .[5],
  section6_mitre: .[6],
  section7_key_findings: .[7]
}' \
  ${SECTION_DIR}/section1_summary.json \
  ${SECTION_DIR}/section2_top_incidents.json \
  ${SECTION_DIR}/section3_malicious_files.json \
  ${SECTION_DIR}/section3_suspicious_files.json \
  ${SECTION_DIR}/section4_network_threats.json \
  ${SECTION_DIR}/section5_host_cves.json \
  ${SECTION_DIR}/section6_mitre.json \
  ${SECTION_DIR}/section7_key_findings.json \
  > /tmp/merged_sections.json

# 최종 종합 분석 (모든 섹션을 다시 보고 통합)
cat <<EOF | claude --print --model sonnet-4.5 > $FINAL_OUTPUT
다음은 오늘(${DATE})의 7개 섹션별 분석 결과입니다. 이를 종합하여 최종 일일 보안 보고서를 작성하세요:

$(cat /tmp/merged_sections.json)

**요청사항**:

1. **경영진 요약** (Executive Summary, 500-700자):
   - 전반적인 보안 상황
   - 가장 중요한 발견사항 3가지
   - 비즈니스 영향 (다운타임, 영향받은 사용자 등)
   - 즉각 조치 필요 사항

2. **전체 통계**:
   - 총 인시던트 수
   - 심각도별 분포 (Critical/High/Medium/Low)
   - 처리 상태 (True Positive/False Positive/In Progress)
   - TOP 5 영향받은 호스트

3. **위협 동향**:
   - 주요 공격 유형
   - 반복 패턴
   - 전일 대비 변화

4. **긴급 조치 필요 사항** (우선순위 순):
   - [ ] 즉시 격리 필요 호스트 목록
   - [ ] 즉시 차단 필요 IP/도메인 목록
   - [ ] 긴급 패치 필요 CVE 목록

5. **보안팀 권장사항** (3-5개):
   - 단기 조치 (오늘/내일)
   - 중기 개선 (이번 주)
   - 장기 전략 (이번 달)

6. **섹션별 요약 재정리**:
   - 각 섹션의 핵심 내용을 2-3줄로 압축
   - 일관된 톤으로 재작성

**출력 형식**: JSON (최종 보고서 구조)
{
  "report_date": "${DATE}",
  "executive_summary_ko": "...",
  "overall_statistics": {...},
  "threat_trends_ko": "...",
  "immediate_actions": [...],
  "recommendations": [...],
  "section_summaries": {
    "summary": "...",
    "top_incidents": "...",
    "file_analysis": "...",
    "network_threats": "...",
    "host_vulnerabilities": "...",
    "mitre_analysis": "...",
    "key_findings": "..."
  },

  // 각 섹션의 원본 분석 결과도 포함
  "detailed_sections": {
    "section1": $(cat ${SECTION_DIR}/section1_summary.json),
    "section2": $(cat ${SECTION_DIR}/section2_top_incidents.json),
    "section3_malicious": $(cat ${SECTION_DIR}/section3_malicious_files.json),
    "section3_suspicious": $(cat ${SECTION_DIR}/section3_suspicious_files.json),
    "section4": $(cat ${SECTION_DIR}/section4_network_threats.json),
    "section5": $(cat ${SECTION_DIR}/section5_host_cves.json),
    "section6": $(cat ${SECTION_DIR}/section6_mitre.json),
    "section7": $(cat ${SECTION_DIR}/section7_key_findings.json)
  }
}
EOF

echo "최종 보고서 생성 완료: $FINAL_OUTPUT"

# HTML 보고서 생성 (기존 템플릿 활용)
npx tsx script/generate-html-report.ts --input $FINAL_OUTPUT --output /www/ib-editor/my-app/public/reports/daily/daily_report_${DATE}.html

echo "보고서 생성 완료!"
echo "- JSON: $FINAL_OUTPUT"
echo "- HTML: /www/ib-editor/my-app/public/reports/daily/daily_report_${DATE}.html"
```

---

## 4. 전체 파이프라인 실행

```bash
#!/bin/bash
# script/auto-daily-report-v2.sh

DATE=${1:-$(date -d "yesterday" +%Y-%m-%d)}

echo "==================================="
echo "일일 보고서 생성 시작: $DATE"
echo "==================================="

# Stage 1: 데이터 수집
echo ""
echo "Stage 1: 데이터 수집 중..."
npx tsx script/collect-daily-data.ts --date $DATE

# Stage 2: 섹션별 분석
echo ""
echo "Stage 2: 섹션별 AI 분석 중..."
./script/analyze-sections.sh $DATE

# Stage 3: 종합 보고서
echo ""
echo "Stage 3: 최종 보고서 생성 중..."
./script/synthesize-report.sh $DATE

echo ""
echo "==================================="
echo "일일 보고서 생성 완료!"
echo "==================================="
```

---

## 5. 예상 실행 시간 및 비용

| Stage | 작업 | 예상 시간 | AI 호출 |
|-------|------|----------|---------|
| Stage 1 | 데이터 수집 (100개 인시던트) | 2-3분 | 0회 |
| Stage 2 | 섹션별 분석 (7개 섹션) | 3-5분 | 7회 (병렬) |
| Stage 3 | 최종 종합 | 1-2분 | 1회 |
| **총합** | | **6-10분** | **8회** |

**비용 절감**:
- 기존: 100개 인시던트 × 7개 분석기 = 700회 AI 호출
- 개선: 7개 섹션 + 1개 종합 = 8회 AI 호출
- **절감률: 98.9%**

---

## 6. 다음 작업

1. `script/collect-daily-data.ts` 작성
   - 기존 `executeIncidentInvestigation()` 활용
   - 섹션별 데이터 구조화

2. `script/analyze-sections.sh` 작성
   - 각 섹션별 프롬프트 정교화
   - `claude --print` 에러 핸들링

3. `script/synthesize-report.sh` 작성
   - 최종 종합 프롬프트
   - HTML 템플릿 연동

4. Cron 자동화
   ```
   0 1 * * * cd /www/ib-editor/my-app && ./script/auto-daily-report-v2.sh
   ```

이 방식이 맞나요?
