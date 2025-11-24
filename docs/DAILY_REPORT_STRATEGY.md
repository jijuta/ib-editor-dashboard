# 일일 보안 보고서 자동 생성 전략

> **핵심**: 모든 데이터 분석 → 문제 있는 것만 상세 표시 → 정상은 통계로 요약
> **방법**: 2-Pass Analysis (분류 → 상세 분석) + claude --print 배치 처리

---

## 1. 기존 시스템 활용

### 1.1 데이터 수집 (이미 완성됨)

**`executeIncidentInvestigation(incidentId)`** - opensearch-executor.ts
```typescript
// 인시던트 1개당 7개 인덱스 데이터 수집:
{
  incident: {},           // 메타데이터
  alerts: [],            // 시간순 알럿 (공격 타임라인)
  files: [],             // 파일 아티팩트
  networks: [],          // 네트워크 아티팩트
  processes: [],         // 프로세스 아티팩트
  endpoints: [],         // 엔드포인트 + CVE
  summary: {}
}
```

**`checkHashesInTI()`, `checkIPsInTI()` 등** - ti-correlator.ts
```typescript
// PostgreSQL TI 상관분석
- 파일 해시 → bazaar_malware 매칭
- IP/도메인 → ioc_log 매칭
- MITRE 기법 → 한글 설명
- CVE → 상세 정보
```

---

## 2. 전체 파이프라인: 3-Stage

### Stage 1: 데이터 수집 및 구조화

```typescript
// script/collect-daily-incidents.ts

async function collectDailyData(date: string) {
  console.log(`[Stage 1] ${date} 데이터 수집 시작...`);

  // 1. 해당 날짜의 모든 인시던트 ID 조회
  const incidentIds = await getIncidentIdsByDate(date);
  console.log(`총 ${incidentIds.length}개 인시던트 발견`);

  // 2. 각 인시던트별 상세 데이터 수집 (기존 함수 활용)
  const allIncidents = [];

  for (const incidentId of incidentIds) {
    console.log(`  수집 중: ${incidentId}...`);

    // 기존 함수 활용 ✅
    const data = await executeIncidentInvestigation(incidentId);

    // TI 상관분석 ✅
    const fileHashes = data.files?.map(f => f.action_file_sha256).filter(Boolean) || [];
    const ips = data.networks?.map(n => n.action_external_ip).filter(Boolean) || [];
    const mitreIds = data.incident?.mitre_technique_ids || [];
    const cveIds = data.endpoints?.flatMap(e => e.cves || []) || [];

    const tiData = {
      file_hashes: await checkHashesInTI(fileHashes),
      ips: await checkIPsInTI(ips),
      mitre: await getMITREByTechniqueIds(mitreIds),
      cves: await getCVEDetails(cveIds)
    };

    allIncidents.push({
      ...data,
      ti: tiData,
      // 추가 메타데이터
      collection_time: new Date().toISOString()
    });
  }

  // 3. 섹션별 데이터 구조화
  const structuredData = {
    metadata: {
      report_date: date,
      total_incidents: allIncidents.length,
      collection_time: new Date().toISOString()
    },

    // 전체 인시던트 원본 데이터
    all_incidents: allIncidents,

    // 통계용 집계
    statistics: {
      by_severity: {
        critical: allIncidents.filter(i => i.incident.severity === 'critical').length,
        high: allIncidents.filter(i => i.incident.severity === 'high').length,
        medium: allIncidents.filter(i => i.incident.severity === 'medium').length,
        low: allIncidents.filter(i => i.incident.severity === 'low').length
      },
      by_status: {
        new: allIncidents.filter(i => i.incident.status === 'new').length,
        under_investigation: allIncidents.filter(i => i.incident.status === 'under_investigation').length,
        resolved_true_positive: allIncidents.filter(i => i.incident.manual_severity === 'true_positive').length,
        resolved_false_positive: allIncidents.filter(i => i.incident.manual_severity === 'false_positive').length
      },
      top_hosts: getTopHosts(allIncidents, 20), // 상위 20개 호스트
      alert_types: getTopAlertTypes(allIncidents, 30) // 상위 30개 알럿 유형
    },

    // 파일 해시 전체 (카테고리별)
    all_files: {
      malicious: extractFilesByVerdict(allIncidents, 'malicious'),
      suspicious: extractFilesByVerdict(allIncidents, 'suspicious'),
      benign: extractFilesByVerdict(allIncidents, 'benign'),
      unknown: extractFilesByVerdict(allIncidents, 'unknown')
    },

    // 네트워크 전체 (외부 IP/도메인)
    all_networks: {
      external_ips: extractExternalIPs(allIncidents),
      domains: extractDomains(allIncidents)
    },

    // 호스트 전체 (CVE 포함)
    all_hosts: extractAllHosts(allIncidents),

    // MITRE 기법 전체
    all_mitre_techniques: extractMITRETechniques(allIncidents)
  };

  // 4. JSON 저장
  const outputPath = `/tmp/daily_data_${date}.json`;
  await fs.writeFile(outputPath, JSON.stringify(structuredData, null, 2));

  console.log(`[Stage 1] 완료: ${outputPath}`);
  return outputPath;
}

// 헬퍼 함수들
function getTopHosts(incidents: any[], limit: number) {
  const hostMap = new Map<string, number>();

  incidents.forEach(inc => {
    inc.endpoints?.forEach((ep: any) => {
      const hostname = ep.endpoint_name;
      hostMap.set(hostname, (hostMap.get(hostname) || 0) + 1);
    });
  });

  return Array.from(hostMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([hostname, count]) => ({ hostname, incident_count: count }));
}

function extractFilesByVerdict(incidents: any[], verdict: string) {
  const files = new Map();

  incidents.forEach(inc => {
    inc.files?.forEach((file: any) => {
      const hash = file.action_file_sha256;
      if (!hash) return;

      // TI 매칭 결과 확인
      const tiMatch = inc.ti?.file_hashes?.find((t: any) => t.hash === hash);
      const fileVerdict = tiMatch?.verdict || 'unknown';

      if (fileVerdict === verdict) {
        files.set(hash, {
          hash,
          filename: file.action_file_name,
          path: file.action_file_path,
          incidents: files.has(hash)
            ? [...files.get(hash).incidents, inc.incident.incident_id]
            : [inc.incident.incident_id],
          ti_data: tiMatch
        });
      }
    });
  });

  return Array.from(files.values());
}
```

**출력**: `/tmp/daily_data_2025-11-23.json` (전체 데이터)

---

### Stage 2: 2-Pass Analysis

#### Pass 1: 전체 분류 (빠른 판단)

```bash
#!/bin/bash
# script/pass1-classify-all.sh

DATE="2025-11-23"
DATA_FILE="/tmp/daily_data_${DATE}.json"
OUTPUT_DIR="/tmp/pass1_${DATE}"

mkdir -p $OUTPUT_DIR

# 전체 인시던트 개수 확인
TOTAL=$(jq '.all_incidents | length' $DATA_FILE)
echo "총 ${TOTAL}개 인시던트 분류 시작..."

# 배치 크기 (한 번에 50개씩 처리)
BATCH_SIZE=50
BATCH_COUNT=$(( (TOTAL + BATCH_SIZE - 1) / BATCH_SIZE ))

for ((batch=0; batch<$BATCH_COUNT; batch++)); do
  START=$(( batch * BATCH_SIZE ))
  END=$(( START + BATCH_SIZE ))

  echo "배치 $((batch+1))/$BATCH_COUNT: 인시던트 ${START}-${END} 처리 중..."

  # 해당 배치의 인시던트만 추출
  BATCH_DATA=$(jq ".all_incidents[${START}:${END}]" $DATA_FILE)

  # Gemini Flash로 빠른 분류 (저렴하고 빠름)
  cat <<EOF | claude --print --model gemini-2.0-flash > ${OUTPUT_DIR}/batch_${batch}.json
다음 인시던트들을 빠르게 분류하세요:

**데이터**:
${BATCH_DATA}

**각 인시던트별 질문**:
1. **판단**: True Positive / False Positive / Unknown?
   - True Positive: 실제 위협 (C2 연결, 악성 파일 실행, 데이터 유출 등)
   - False Positive: 오탐 (정상 업데이트, 내부 도구, 허용된 행위)
   - Unknown: 추가 조사 필요 (애매한 경우)

2. **심각도 확인**: incident.severity가 맞는지 검증
   - 실제 심각도가 다르면 수정 제안

3. **상세 분석 필요 여부**: Yes / No
   - Yes: True Positive, Critical/High, Unknown
   - No: False Positive, Low

4. **빠른 이유** (50자 이내):
   - 예: "C2 연결 시도 탐지", "정상 Windows 업데이트"

**출력 형식**: JSON 배열
[
  {
    "incident_id": "414186",
    "verdict": "true_positive",
    "severity_original": "high",
    "severity_verified": "high",
    "needs_detailed_analysis": true,
    "quick_reason": "알려진 C2 서버로 연결 시도"
  },
  {
    "incident_id": "414187",
    "verdict": "false_positive",
    "severity_original": "medium",
    "severity_verified": "low",
    "needs_detailed_analysis": false,
    "quick_reason": "정상 Windows Defender 업데이트"
  }
]
EOF

  echo "배치 $((batch+1)) 완료"
done

# 모든 배치 결과 병합
echo "분류 결과 병합 중..."
jq -s 'add' ${OUTPUT_DIR}/batch_*.json > ${OUTPUT_DIR}/all_classifications.json

# 통계
TOTAL_TP=$(jq '[.[] | select(.verdict == "true_positive")] | length' ${OUTPUT_DIR}/all_classifications.json)
TOTAL_FP=$(jq '[.[] | select(.verdict == "false_positive")] | length' ${OUTPUT_DIR}/all_classifications.json)
TOTAL_UNKNOWN=$(jq '[.[] | select(.verdict == "unknown")] | length' ${OUTPUT_DIR}/all_classifications.json)
NEEDS_DETAIL=$(jq '[.[] | select(.needs_detailed_analysis == true)] | length' ${OUTPUT_DIR}/all_classifications.json)

echo "==================================="
echo "Pass 1 분류 완료!"
echo "==================================="
echo "True Positive: ${TOTAL_TP}개"
echo "False Positive: ${TOTAL_FP}개"
echo "Unknown: ${TOTAL_UNKNOWN}개"
echo "상세 분석 필요: ${NEEDS_DETAIL}개"
echo "==================================="
```

**출력**: `/tmp/pass1_2025-11-23/all_classifications.json`

#### Pass 2: 상세 분석 (문제 있는 것만)

```bash
#!/bin/bash
# script/pass2-detailed-analysis.sh

DATE="2025-11-23"
DATA_FILE="/tmp/daily_data_${DATE}.json"
CLASSIFICATION_FILE="/tmp/pass1_${DATE}/all_classifications.json"
OUTPUT_DIR="/tmp/pass2_${DATE}"

mkdir -p $OUTPUT_DIR

# 상세 분석 필요한 인시던트 ID 목록
NEEDS_DETAIL_IDS=$(jq -r '[.[] | select(.needs_detailed_analysis == true) | .incident_id] | join(" ")' $CLASSIFICATION_FILE)

echo "상세 분석 대상: $(echo $NEEDS_DETAIL_IDS | wc -w)개"

# ID 목록으로 원본 데이터에서 해당 인시던트만 추출
jq --argjson ids "$(jq '[.[] | select(.needs_detailed_analysis == true) | .incident_id]' $CLASSIFICATION_FILE)" \
  '[.all_incidents[] | select([.incident.incident_id] | inside($ids))]' \
  $DATA_FILE > ${OUTPUT_DIR}/incidents_to_analyze.json

# 배치 처리 (한 번에 20개씩)
BATCH_SIZE=20
TOTAL=$(jq 'length' ${OUTPUT_DIR}/incidents_to_analyze.json)
BATCH_COUNT=$(( (TOTAL + BATCH_SIZE - 1) / BATCH_SIZE ))

for ((batch=0; batch<$BATCH_COUNT; batch++)); do
  START=$(( batch * BATCH_SIZE ))
  END=$(( START + BATCH_SIZE ))

  echo "상세 분석 배치 $((batch+1))/$BATCH_COUNT: ${START}-${END}..."

  BATCH_DATA=$(jq ".[${START}:${END}]" ${OUTPUT_DIR}/incidents_to_analyze.json)

  # Claude Sonnet 4.5로 심층 분석
  cat <<EOF | claude --print --model sonnet-4.5 > ${OUTPUT_DIR}/detailed_batch_${batch}.json
다음 인시던트들을 상세 분석하세요:

**데이터**:
${BATCH_DATA}

**각 인시던트별 상세 분석 요청**:

### 1. 공격 타임라인 분석
- alerts를 시간순 정렬하여 공격 흐름 파악
- 각 단계별 설명 (한글)
- 예: "10:15 피싱 이메일 열람 → 10:20 악성 첨부파일 실행 → 10:25 C2 서버 연결"

### 2. 파일-프로세스-네트워크 연결 추적
- 어떤 파일이 실행되었는지 (files)
- 그 파일이 어떤 프로세스를 생성했는지 (processes, 부모-자식 관계)
- 그 프로세스가 어디로 연결했는지 (networks)
- 전체 체인을 한 문장으로 요약 (한글)
- 예: "malware.exe → powershell.exe 실행 → evil.com:443 연결 → 추가 페이로드 다운로드"

### 3. 엔드포인트 취약점 연관성
- 이 인시던트가 발생한 호스트 (endpoints)
- 해당 호스트의 CVE 취약점 목록
- 인시던트와 CVE의 연관성 분석
- 예: "CVE-2024-1234 RCE 취약점이 있는 호스트에서 실제 Exploit 시도 탐지됨"

### 4. TI 매칭 결과 분석
- 파일 해시 TI 매칭 (ti.file_hashes)
- IP/도메인 TI 매칭 (ti.ips)
- MITRE 기법 (ti.mitre)
- 알려진 위협인지, 새로운 위협인지 판단

### 5. 최종 판단 및 권장 조치
- True Positive / False Positive / Unknown 재확인
- 실제 심각도 평가 (Critical/High/Medium/Low)
- 즉시 조치 필요 사항
- 권장 대응 방안 (3-5개, 우선순위 순)

### 6. 한글 종합 요약
- 300-500자로 전체 내용 요약
- 경영진도 이해 가능한 수준
- 비즈니스 영향 포함

**출력 형식**: JSON 배열
[
  {
    "incident_id": "414186",
    "attack_timeline_ko": "...",
    "file_process_network_chain_ko": "...",
    "cve_correlation_ko": "...",
    "ti_verdict_ko": "...",
    "final_verdict": "true_positive",
    "verified_severity": "high",
    "immediate_actions": ["호스트 격리", "C2 IP 차단", "..."],
    "recommended_responses": ["...", "...", "..."],
    "summary_ko": "...",
    "business_impact_ko": "..."
  }
]
EOF

  echo "배치 $((batch+1)) 완료"
done

# 병합
jq -s 'add' ${OUTPUT_DIR}/detailed_batch_*.json > ${OUTPUT_DIR}/all_detailed_analysis.json

echo "Pass 2 상세 분석 완료!"
```

**출력**: `/tmp/pass2_2025-11-23/all_detailed_analysis.json`

---

### Stage 3: 최종 보고서 통합

```bash
#!/bin/bash
# script/generate-final-report.sh

DATE="2025-11-23"
DATA_FILE="/tmp/daily_data_${DATE}.json"
CLASSIFICATION_FILE="/tmp/pass1_${DATE}/all_classifications.json"
DETAILED_FILE="/tmp/pass2_${DATE}/all_detailed_analysis.json"
OUTPUT_FILE="/tmp/final_report_${DATE}.json"

echo "최종 보고서 생성 중..."

# 모든 데이터 병합
jq -n \
  --slurpfile raw_data $DATA_FILE \
  --slurpfile classifications $CLASSIFICATION_FILE \
  --slurpfile detailed $DETAILED_FILE \
  '{
    metadata: $raw_data[0].metadata,
    statistics: $raw_data[0].statistics,
    classifications: $classifications[0],
    detailed_analysis: $detailed[0]
  }' > /tmp/merged_data.json

# 최종 종합 분석
cat <<EOF | claude --print --model sonnet-4.5 > $OUTPUT_FILE
다음은 ${DATE} 일일 보안 데이터의 전체 분석 결과입니다. 이를 종합하여 최종 보고서를 작성하세요:

**원본 데이터**:
$(cat /tmp/merged_data.json)

---

## 요청사항

### 1. Executive Summary (경영진 요약, 500-700자)
- 전반적인 보안 상황 평가
- 가장 중요한 발견사항 TOP 3
- 비즈니스 영향 (다운타임, 영향받은 사용자, 예상 비용 등)
- 즉각 조치 필요 사항
- 긍정적 측면도 언급 (개선된 점, 잘 차단된 공격 등)

### 2. 전체 통계 정리
- 총 인시던트 수 및 전일 대비 증감
- 심각도별 분포 (Critical/High/Medium/Low)
- 판단 결과별 분포 (True Positive/False Positive/Unknown)
- TOP 10 영향받은 호스트
- TOP 10 알럿 유형

### 3. Critical & High 인시던트 상세
- detailed_analysis에서 Critical/High만 추출
- 각 인시던트별 요약 재정리
- 공통 패턴 분석

### 4. 조사 필요 인시던트 (Unknown)
- Unknown으로 분류된 것들
- 추가 조사 방향 제시

### 5. False Positive 요약
- 총 개수 및 주요 패턴
- 오탐 원인 분석
- 오탐률 개선 방안

### 6. 파일 위협 분석
- 악성 파일 목록 및 요약
- 의심 파일 목록 및 조사 방향
- 정상 파일 통계
- 미확인 파일 통계

### 7. 네트워크 위협 분석
- 악성 IP/도메인 목록
- C2 서버 후보 목록
- 차단 권장 목록
- 정상 연결 통계

### 8. 호스트 취약점 보고
- CVE가 있는 호스트만 상세 분석
- Critical/High CVE 우선순위 목록
- Exploit 가능 CVE 강조
- 패치 권장 순서

### 9. MITRE ATT&CK 분석
- 가장 많이 사용된 Tactic TOP 5
- 각 Tactic별 주요 Technique
- 공격자 전략 분석
- 방어 권장사항

### 10. 긴급 조치 필요 사항 (체크리스트)
- [ ] 즉시 격리 필요 호스트
- [ ] 즉시 차단 필요 IP/도메인
- [ ] 긴급 패치 필요 CVE
- [ ] 추가 조사 필요 인시던트

### 11. 보안팀 권장사항 (우선순위 순)
- 오늘/내일 조치
- 이번 주 조치
- 이번 달 개선

---

**출력 형식**: 완전한 JSON 보고서
{
  "report_date": "${DATE}",
  "generated_at": "...",

  "executive_summary_ko": "...",

  "overall_statistics": {
    "total_incidents": 150,
    "severity_breakdown": {...},
    "verdict_breakdown": {...},
    "top_affected_hosts": [...],
    "top_alert_types": [...]
  },

  "critical_incidents": [
    {
      "incident_id": "...",
      "summary_ko": "...",
      "immediate_actions": [...],
      ...
    }
  ],

  "high_incidents": [...],

  "investigation_needed": [...],

  "false_positives": {
    "total": 100,
    "common_patterns": [...],
    "improvement_suggestions": [...]
  },

  "file_threats": {
    "malicious": [...],
    "suspicious": [...],
    "benign_count": 400,
    "unknown_count": 50
  },

  "network_threats": {
    "malicious_ips": [...],
    "c2_candidates": [...],
    "block_recommendations": [...]
  },

  "host_vulnerabilities": [
    {
      "hostname": "...",
      "critical_cves": [...],
      "exploit_available": [...],
      "patch_priority": 1,
      ...
    }
  ],

  "mitre_analysis": {
    "top_tactics": [...],
    "attacker_strategy_ko": "...",
    "defense_recommendations_ko": [...]
  },

  "immediate_actions_checklist": {
    "isolate_hosts": [...],
    "block_ips": [...],
    "patch_cves": [...],
    "investigate_incidents": [...]
  },

  "recommendations": {
    "today_tomorrow": [...],
    "this_week": [...],
    "this_month": [...]
  }
}
EOF

echo "최종 보고서 생성 완료: $OUTPUT_FILE"

# HTML/Markdown 생성
npx tsx script/convert-to-html.ts --input $OUTPUT_FILE --output /www/ib-editor/my-app/public/reports/daily/daily_report_${DATE}.html

echo "==================================="
echo "일일 보고서 생성 완료!"
echo "==================================="
echo "JSON: $OUTPUT_FILE"
echo "HTML: /www/ib-editor/my-app/public/reports/daily/daily_report_${DATE}.html"
```

---

## 3. 전체 실행 스크립트

```bash
#!/bin/bash
# script/auto-daily-report-v2.sh

DATE=${1:-$(date -d "yesterday" +%Y-%m-%d)}

echo "==================================="
echo "일일 보고서 자동 생성: $DATE"
echo "==================================="

# Stage 1: 데이터 수집 (2-3분)
echo ""
echo "[Stage 1] 데이터 수집 중..."
npx tsx script/collect-daily-incidents.ts --date $DATE

# Stage 2: 2-Pass Analysis
echo ""
echo "[Stage 2-1] Pass 1: 전체 분류 중... (Gemini Flash)"
./script/pass1-classify-all.sh $DATE

echo ""
echo "[Stage 2-2] Pass 2: 상세 분석 중... (Claude Sonnet)"
./script/pass2-detailed-analysis.sh $DATE

# Stage 3: 최종 보고서
echo ""
echo "[Stage 3] 최종 보고서 생성 중..."
./script/generate-final-report.sh $DATE

echo ""
echo "==================================="
echo "✅ 완료!"
echo "==================================="
```

---

## 4. 예상 실행 시간 및 비용

| Stage | 작업 | 인시던트 150개 기준 | AI 호출 | 비용 |
|-------|------|---------------------|---------|------|
| Stage 1 | 데이터 수집 | 2-3분 | 0회 | $0 |
| Pass 1 | 전체 분류 (Gemini Flash) | 1-2분 | 3회 (50개씩) | ~$0.01 |
| Pass 2 | 상세 분석 (Sonnet, 50개만) | 3-5분 | 3회 (20개씩) | ~$0.50 |
| Stage 3 | 최종 종합 (Sonnet) | 1-2분 | 1회 | ~$0.10 |
| **총합** | | **7-12분** | **7회** | **~$0.61** |

**기존 방식 대비**:
- 시간: 50-60분 → 7-12분 (5배 빠름)
- 비용: $50-100 → $0.61 (100배 저렴)

---

## 5. Cron 자동화

```bash
# crontab -e
0 1 * * * cd /www/ib-editor/my-app && ./script/auto-daily-report-v2.sh >> /var/log/daily-report.log 2>&1
```

---

이 전략이 맞나요? 이제 코드 작성 시작할까요?
