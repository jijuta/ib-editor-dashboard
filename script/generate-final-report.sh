#!/bin/bash
# Stage 3: 최종 보고서 통합 및 생성
#
# 기능:
# - Pass 1, Pass 2 결과를 통합
# - Claude Sonnet으로 최종 종합 분석
# - 일일 보고서 JSON 생성
#
# Usage:
#   ./script/generate-final-report.sh 2025-11-23

set -e

DATE=${1:-$(date -d "yesterday" +%Y-%m-%d)}
DATA_FILE="/tmp/daily_data_${DATE}.json"
CLASSIFICATION_FILE="/tmp/pass1_${DATE}/all_classifications.json"
DETAILED_FILE="/tmp/pass2_${DATE}/all_detailed_analysis.json"
OUTPUT_FILE="/tmp/final_report_${DATE}.json"

echo "==================================="
echo "[Stage 3] 최종 보고서 생성 시작"
echo "날짜: ${DATE}"
echo "==================================="
echo ""

# 파일 확인
if [ ! -f "$DATA_FILE" ]; then
  echo "❌ 데이터 파일 없음: $DATA_FILE"
  exit 1
fi

if [ ! -f "$CLASSIFICATION_FILE" ]; then
  echo "❌ 분류 파일 없음: $CLASSIFICATION_FILE"
  exit 1
fi

if [ ! -f "$DETAILED_FILE" ]; then
  echo "❌ 상세 분석 파일 없음: $DETAILED_FILE"
  exit 1
fi

echo "모든 데이터 파일 확인 완료"
echo ""

# 데이터 병합
echo "데이터 병합 중..."

jq -n \
  --slurpfile raw_data $DATA_FILE \
  --slurpfile classifications $CLASSIFICATION_FILE \
  --slurpfile detailed $DETAILED_FILE \
  '{
    metadata: $raw_data[0].metadata,
    statistics: $raw_data[0].statistics,
    all_files: $raw_data[0].all_files,
    all_networks: $raw_data[0].all_networks,
    all_hosts: $raw_data[0].all_hosts,
    all_mitre_techniques: $raw_data[0].all_mitre_techniques,
    classifications: $classifications[0],
    detailed_analysis: $detailed[0]
  }' > /tmp/merged_data_${DATE}.json

echo "✅ 데이터 병합 완료"
echo ""

# 최종 종합 분석
echo "-----------------------------------"
echo "최종 종합 분석 중... (Claude Sonnet)"
echo "-----------------------------------"
echo ""

# 최종 보고서 생성 (마크다운 블록 제거 후처리)
# JSON 블록만 추출: { 로 시작해서 } 로 끝나는 부분
cat <<EOF | claude --print --model sonnet | sed -n '/^{/,/^}/p' > $OUTPUT_FILE
다음은 ${DATE} 일일 보안 데이터의 전체 분석 결과입니다. 이를 종합하여 최종 일일 보고서를 작성하세요:

**통합 데이터**:
$(cat /tmp/merged_data_${DATE}.json)

---

# 최종 보고서 작성 요청

## 1. Executive Summary (경영진 요약, 500-700자)

다음 내용을 포함하여 경영진을 위한 요약을 작성하세요:

### 포함 내용:
- **전반적인 보안 상황**: Good / Fair / Poor
- **가장 중요한 발견사항 TOP 3**: 심각도 순
- **비즈니스 영향**:
  - 다운타임 (예상)
  - 영향받은 사용자/시스템
  - 예상 비용
- **즉각 조치 필요 사항**: 긴급도 순
- **긍정적 측면**:
  - 잘 차단된 공격
  - 전일 대비 개선된 점
  - 빠른 대응 사례

### 작성 스타일:
- 경영진도 이해할 수 있는 언어
- 기술 용어 최소화 (필요시 설명)
- 비즈니스 관점 강조
- 긍정과 부정 균형있게

---

## 2. 전체 통계 정리

\`statistics\` 및 \`classifications\`를 활용하여:

### 2.1 인시던트 통계
- 총 인시던트 수
- 전일 대비 증감 (예상치 또는 N/A)
- 심각도별 분포 (Critical/High/Medium/Low)
- 판단 결과별 분포:
  - True Positive
  - False Positive
  - Unknown (추가 조사 필요)

### 2.2 TOP 10 영향받은 호스트
- \`statistics.top_hosts\` 활용
- 각 호스트별 인시던트 수
- 특이사항 (반복 발생, 특정 패턴 등)

### 2.3 TOP 10 알럿 유형
- \`statistics.top_alert_types\` 활용
- 각 알럿 유형별 발생 횟수
- 주요 알럿 설명

---

## 3. Critical & High 인시던트 상세

\`detailed_analysis\`에서 \`verified_severity\`가 "critical" 또는 "high"인 것만 추출하여:

### 각 인시던트별:
- incident_id
- summary_ko (요약)
- verified_severity (최종 심각도)
- immediate_actions (즉시 조치)
- business_impact_ko (비즈니스 영향)

### 공통 패턴 분석:
- Critical/High 인시던트들에서 공통적으로 나타나는 패턴
- 예: "모두 피싱 이메일로 시작", "특정 호스트 반복 타겟"

---

## 4. 조사 필요 인시던트 (Unknown)

\`classifications\`에서 \`verdict\`가 "unknown"인 것들:

### 내용:
- 총 개수
- 왜 Unknown으로 분류되었는지 (간략히)
- 추가 조사 방향 제시
- 우선순위 (높음/보통/낮음)

---

## 5. False Positive 요약

\`classifications\`에서 \`verdict\`가 "false_positive"인 것들:

### 내용:
- 총 개수 및 전체 대비 비율
- 주요 False Positive 패턴:
  - 정상 업데이트로 오인: N건
  - 내부 도구 실행: N건
  - 기타 패턴
- **오탐 원인 분석**
- **오탐률 개선 방안** (3-5개)

---

## 6. 파일 위협 분석

\`all_files\`를 활용하여:

### 6.1 악성 파일 (malicious)
- 총 개수
- 상위 5개 악성 파일:
  - 해시
  - 파일명
  - 관련 인시던트 수
  - TI 정보 (멀웨어 패밀리, 위협 유형)

### 6.2 의심 파일 (suspicious)
- 총 개수
- 추가 조사 방향

### 6.3 정상/미확인 파일
- benign 개수 (통계만)
- unknown 개수 (통계만)

---

## 7. 네트워크 위협 분석

\`all_networks\`를 활용하여:

### 7.1 악성 IP/도메인
- \`external_ips\`에서 TI 매칭된 것들
- 각 IP별:
  - IP 주소
  - 위협 유형 (C2, Malware Distribution, Phishing 등)
  - 관련 인시던트 수
  - 차단 여부 및 권장 조치

### 7.2 C2 서버 후보
- 의심되는 C2 서버 목록
- 왜 C2로 의심되는지 (연결 패턴, 빈도 등)
- 영향받은 호스트 목록

### 7.3 차단 권장 목록
- 즉시 차단 필요 IP/도메인 (우선순위 순)

---

## 8. 호스트 취약점 보고

\`all_hosts\`를 활용하여 CVE가 있는 호스트만:

### 각 호스트별:
- hostname
- OS 버전
- Critical/High CVE 목록
- Exploit 가능 CVE 강조
- 패치 가능 여부
- 이 호스트에서 발생한 인시던트와의 연관성
  - 예: "CVE-2024-1234 취약점이 실제로 악용된 인시던트 발견"
- 우선순위 (1: 긴급, 2: 높음, 3: 보통)

### 패치 권장 순서
- 우선순위별로 정렬된 CVE 목록

---

## 9. MITRE ATT&CK 분석

\`all_mitre_techniques\` 및 \`detailed_analysis\`의 MITRE 정보를 활용하여:

### 9.1 가장 많이 사용된 Tactic TOP 5
- 각 Tactic별 발생 횟수
- 한글 설명

### 9.2 각 Tactic별 주요 Technique
- Technique ID 및 한글 이름
- 발생 횟수

### 9.3 공격자 전략 분석 (300-500자)
- 전체적인 공격 흐름
- 예: "대부분 Initial Access (피싱) → Execution (악성 파일) → Persistence → Exfiltration 순서"

### 9.4 방어 권장사항
- 각 Tactic별 대응 방법 (3-5개)

---

## 10. 긴급 조치 필요 사항 (체크리스트)

우선순위 순으로:

### 10.1 즉시 격리 필요 호스트
- [ ] 호스트명 (이유)
- [ ] ...

### 10.2 즉시 차단 필요 IP/도메인
- [ ] IP/도메인 (이유)
- [ ] ...

### 10.3 긴급 패치 필요 CVE
- [ ] CVE-XXXX (호스트명, 심각도)
- [ ] ...

### 10.4 추가 조사 필요 인시던트
- [ ] incident_id (이유)
- [ ] ...

---

## 11. 보안팀 권장사항

시간대별로:

### 11.1 오늘/내일 조치 (긴급)
1. ...
2. ...
3. ...

### 11.2 이번 주 조치 (중요)
1. ...
2. ...
3. ...

### 11.3 이번 달 개선 (장기)
1. ...
2. ...
3. ...

---

# 출력 형식

완전한 JSON 보고서로 응답하세요:

\`\`\`json
{
  "report_date": "${DATE}",
  "generated_at": "2025-11-24T01:30:00Z",

  "executive_summary_ko": "...",

  "overall_statistics": {
    "total_incidents": 150,
    "trend_vs_yesterday": "5% 증가 (예상)",
    "severity_breakdown": {
      "critical": 3,
      "high": 20,
      "medium": 80,
      "low": 47
    },
    "verdict_breakdown": {
      "true_positive": 25,
      "false_positive": 95,
      "unknown": 30
    },
    "top_affected_hosts": [...],
    "top_alert_types": [...]
  },

  "critical_incidents": [
    {
      "incident_id": "...",
      "summary_ko": "...",
      "verified_severity": "critical",
      "immediate_actions": [...],
      "business_impact_ko": "..."
    }
  ],

  "high_incidents": [...],

  "investigation_needed": {
    "total": 30,
    "summary_ko": "...",
    "investigation_directions": [...],
    "priority_incidents": [...]
  },

  "false_positives": {
    "total": 95,
    "percentage": "63%",
    "common_patterns": [
      "정상 Windows 업데이트로 오인: 45건",
      "내부 관리 도구 실행: 30건",
      "허용된 소프트웨어 설치: 20건"
    ],
    "root_causes": [...],
    "improvement_suggestions": [...]
  },

  "file_threats": {
    "malicious": {
      "total": 15,
      "top_files": [
        {
          "hash": "...",
          "filename": "...",
          "incident_count": 5,
          "malware_family": "Emotet",
          "threat_type": "Banking Trojan"
        }
      ]
    },
    "suspicious": {
      "total": 8,
      "investigation_needed": [...]
    },
    "benign_count": 400,
    "unknown_count": 50
  },

  "network_threats": {
    "malicious_ips": [...],
    "c2_candidates": [...],
    "block_recommendations": [
      {
        "ip": "203.0.113.5",
        "priority": 1,
        "reason": "확인된 C2 서버, 5개 호스트에서 연결 시도"
      }
    ]
  },

  "host_vulnerabilities": [
    {
      "hostname": "SERVER-DB01",
      "os_version": "Windows Server 2019",
      "critical_cves": [...],
      "exploit_available_cves": [...],
      "incident_correlation": "...",
      "patch_priority": 1
    }
  ],

  "mitre_analysis": {
    "top_tactics": [...],
    "tactics_breakdown": {...},
    "attacker_strategy_ko": "...",
    "defense_recommendations": [...]
  },

  "immediate_actions": {
    "isolate_hosts": [...],
    "block_ips": [...],
    "patch_cves": [...],
    "investigate_incidents": [...]
  },

  "recommendations": {
    "today_tomorrow": [...],
    "this_week": [...],
    "this_month": [...]
  },

  "raw_data_summary": {
    "data_file": "${DATA_FILE}",
    "classification_file": "${CLASSIFICATION_FILE}",
    "detailed_analysis_file": "${DETAILED_FILE}"
  }
}
\`\`\`

**중요**:
- 모든 텍스트는 한글로
- JSON 형식 엄수
- 모든 섹션 빠짐없이 작성
- 경영진도 이해할 수 있는 언어
- 구체적인 숫자와 예시 포함
EOF

if [ $? -eq 0 ]; then
  echo "✅ 최종 종합 분석 완료"
else
  echo "❌ 최종 종합 분석 실패"
  exit 1
fi

echo ""
echo "==================================="
echo "✅ Stage 3 완료!"
echo "==================================="
echo "출력 파일: ${OUTPUT_FILE}"
echo ""

# 파일 크기 확인
FILE_SIZE=$(du -h $OUTPUT_FILE | cut -f1)
echo "파일 크기: ${FILE_SIZE}"
echo ""

# 간단한 통계 출력
TOTAL_INC=$(jq '.overall_statistics.total_incidents' $OUTPUT_FILE 2>/dev/null || echo "N/A")
CRITICAL=$(jq '.overall_statistics.severity_breakdown.critical' $OUTPUT_FILE 2>/dev/null || echo "N/A")
HIGH=$(jq '.overall_statistics.severity_breakdown.high' $OUTPUT_FILE 2>/dev/null || echo "N/A")
TRUE_POS=$(jq '.overall_statistics.verdict_breakdown.true_positive' $OUTPUT_FILE 2>/dev/null || echo "N/A")

echo "보고서 요약:"
echo "  - 총 인시던트: ${TOTAL_INC}개"
echo "  - Critical: ${CRITICAL}개"
echo "  - High: ${HIGH}개"
echo "  - True Positive: ${TRUE_POS}개"
echo "==================================="
