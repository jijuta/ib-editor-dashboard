#!/bin/bash
# Pass 2: 상세 분석 (문제 있는 인시던트만)
#
# 기능:
# - Pass 1에서 needs_detailed_analysis=true인 것만 상세 분석
# - Claude Sonnet 4.5 사용 (심층 분석)
# - 배치 처리 (20개씩)
#
# Usage:
#   ./script/pass2-detailed-analysis.sh 2025-11-23

set -e

DATE=${1:-$(date -d "yesterday" +%Y-%m-%d)}
DATA_FILE="/tmp/daily_data_${DATE}.json"
CLASSIFICATION_FILE="/tmp/pass1_${DATE}/all_classifications.json"
OUTPUT_DIR="/tmp/pass2_${DATE}"

echo "==================================="
echo "[Pass 2] 상세 분석 시작"
echo "날짜: ${DATE}"
echo "==================================="
echo ""

# 파일 확인
if [ ! -f "$DATA_FILE" ]; then
  echo "❌ 데이터 파일이 없습니다: $DATA_FILE"
  exit 1
fi

if [ ! -f "$CLASSIFICATION_FILE" ]; then
  echo "❌ 분류 파일이 없습니다: $CLASSIFICATION_FILE"
  echo "먼저 pass1-classify-all.sh를 실행하세요."
  exit 1
fi

mkdir -p $OUTPUT_DIR

# 상세 분석 필요한 인시던트 ID 목록 추출
echo "상세 분석 대상 인시던트 추출 중..."

NEEDS_DETAIL_IDS=$(jq -r '[.[] | select(.needs_detailed_analysis == true) | .incident_id]' $CLASSIFICATION_FILE)
NEEDS_DETAIL_COUNT=$(echo "$NEEDS_DETAIL_IDS" | jq 'length')

echo "상세 분석 대상: ${NEEDS_DETAIL_COUNT}개"
echo ""

if [ "$NEEDS_DETAIL_COUNT" -eq 0 ]; then
  echo "✅ 상세 분석이 필요한 인시던트가 없습니다."
  echo "{}" > ${OUTPUT_DIR}/all_detailed_analysis.json
  exit 0
fi

# ID 목록으로 원본 데이터에서 해당 인시던트만 추출
jq --argjson ids "$NEEDS_DETAIL_IDS" \
  '[.all_incidents[] | select([.incident.incident_id] | inside($ids))]' \
  $DATA_FILE > ${OUTPUT_DIR}/incidents_to_analyze.json

echo "추출 완료: ${OUTPUT_DIR}/incidents_to_analyze.json"
echo ""

# 배치 처리 (한 번에 1개씩 - 상세 데이터 토큰 제한 고려)
BATCH_SIZE=1
TOTAL=$(jq 'length' ${OUTPUT_DIR}/incidents_to_analyze.json)
BATCH_COUNT=$(( (TOTAL + BATCH_SIZE - 1) / BATCH_SIZE ))

echo "배치 크기: ${BATCH_SIZE}개"
echo "배치 개수: ${BATCH_COUNT}개"
echo ""

for ((batch=0; batch<$BATCH_COUNT; batch++)); do
  START=$(( batch * BATCH_SIZE ))
  END=$(( START + BATCH_SIZE ))

  echo "-----------------------------------"
  echo "배치 $((batch+1))/$BATCH_COUNT: ${START}-${END} 상세 분석 중..."
  echo "-----------------------------------"

  BATCH_DATA=$(jq ".[${START}:${END}]" ${OUTPUT_DIR}/incidents_to_analyze.json)

  # Claude Sonnet 4.5로 심층 분석 (마크다운 블록 제거 후처리)
  cat <<EOF | claude --print --model sonnet | sed -n '/^\[/,/^\]/p' > ${OUTPUT_DIR}/detailed_batch_${batch}.json
다음 인시던트들을 상세 분석하세요:

**데이터**:
${BATCH_DATA}

---

## 각 인시던트별 상세 분석 요청

### 1. 공격 타임라인 분석

\`alerts\` 배열을 \`detection_timestamp\` 기준으로 시간순 정렬하여 공격 흐름을 파악하세요.

**출력 예시**:
\`\`\`
10:15 - 피싱 이메일 첨부파일 열람 (suspicious_email.pdf)
10:20 - 악성 매크로 실행 (MALICIOUS_MACRO alert)
10:25 - Powershell 실행으로 추가 페이로드 다운로드
10:30 - C2 서버 연결 시도 (evil.com:443)
10:35 - 데이터 유출 시도 (large outbound traffic)
\`\`\`

각 단계를 한글로 명확하게 설명하세요.

---

### 2. 파일-프로세스-네트워크 연결 추적

**목표**: 어떤 파일이 → 어떤 프로세스를 실행하고 → 어디로 연결했는지 추적

**데이터 활용**:
- \`files\`: 실행된 파일 (hash, filename, path, execution time)
- \`processes\`: 프로세스 트리 (parent-child 관계)
- \`networks\`: 네트워크 연결 (외부 IP/도메인, port, timestamp)

**출력 예시**:
\`\`\`
악성파일.exe (SHA256: abc123...)
  → powershell.exe 실행 (PID: 1234, PPID: 5678)
  → evil.com:443 연결 (10:25)
  → additional_payload.bin 다운로드
  → cmd.exe 실행 (PID: 9012)
  → 내부 네트워크 스캔 (192.168.1.0/24)
\`\`\`

전체 체인을 한글로 명확하게 요약하세요.

---

### 3. 엔드포인트 취약점 연관성

**목표**: 이 인시던트가 발생한 호스트에 취약점이 있는지, 그 취약점이 실제로 악용되었는지 분석

**데이터 활용**:
- \`endpoints\`: 호스트 정보 (hostname, OS, IP)
- \`endpoints[].cves\`: 해당 호스트의 CVE 목록
- \`ti.cves\`: CVE 상세 정보

**분석 내용**:
1. 호스트명 및 OS 버전
2. Critical/High CVE 목록
3. 이 인시던트와 CVE의 연관성
   - 예: "CVE-2024-1234 RCE 취약점이 있는 호스트에서 실제 원격 코드 실행 시도 탐지"
   - 또는: "CVE는 있지만 이 인시던트와는 무관"

**출력 예시** (한글):
\`\`\`
호스트: SERVER-DB01 (Windows Server 2019)
CVE-2024-1234 (CVSS 9.8, Critical): SMB 원격 코드 실행
CVE-2024-5678 (CVSS 7.5, High): Privilege Escalation

연관성: CVE-2024-1234 취약점을 통한 초기 침투로 추정됨.
SMB 포트(445)를 통한 악성 트래픽이 탐지되었고, 이후 권한 상승 시도가 확인됨.
\`\`\`

---

### 4. TI 매칭 결과 분석

**데이터 활용**:
- \`ti.file_hashes\`: 파일 해시 TI 매칭 결과
- \`ti.ips\`: IP/도메인 TI 매칭 결과
- \`ti.mitre\`: MITRE ATT&CK 기법 정보

**분석 내용**:
1. 파일이 알려진 악성 파일인지?
   - TI 소스 (abuse.ch, VirusTotal 등)
   - 멀웨어 패밀리 (Emotet, Trickbot 등)
   - 위협 유형 (Trojan, Ransomware 등)

2. IP/도메인이 알려진 악성인지?
   - C2 서버인지?
   - Malware Distribution인지?
   - Phishing 사이트인지?

3. MITRE ATT&CK 기법
   - 어떤 전술(Tactic)과 기법(Technique)이 사용되었는지
   - 한글 설명

**출력 예시** (한글):
\`\`\`
파일: malware.exe
- TI 매칭: abuse.ch에서 Emotet으로 확인
- 위협 유형: Banking Trojan
- 첫 발견: 2024-10-15

IP: 203.0.113.5
- TI 매칭: AlienVault OTX에서 C2 서버로 확인
- 국가: 러시아
- 신뢰도: 95%

MITRE: T1566.001 (Phishing: Spearphishing Attachment)
- 전술: Initial Access (초기 침투)
- 설명: 피싱 이메일의 악성 첨부파일을 통한 침투
\`\`\`

---

### 5. 최종 판단 및 권장 조치

**판단**:
- True Positive / False Positive / Unknown 재확인
- 실제 심각도 평가 (Critical/High/Medium/Low)
- 신뢰도 (0-100%)

**즉시 조치 필요 사항** (우선순위 순):
1. 호스트 격리
2. C2 IP 차단
3. 악성 파일 삭제
4. CVE 패치
5. 기타

**권장 대응 방안** (3-5개):
- 단기 (오늘/내일)
- 중기 (이번 주)
- 장기 (이번 달)

---

### 6. 한글 종합 요약

300-500자로 전체 내용을 요약하세요:
- 무슨 일이 일어났는지
- 얼마나 심각한지
- 비즈니스 영향은 무엇인지
- 어떻게 대응해야 하는지

경영진도 이해할 수 있는 수준으로 작성하세요.

---

## 출력 형식

JSON 배열로 응답하세요:

\`\`\`json
[
  {
    "incident_id": "414186",
    "attack_timeline_ko": "10:15 피싱 이메일 열람 → 10:20 악성 파일 실행 → ...",
    "file_process_network_chain_ko": "malware.exe → powershell.exe → evil.com:443 연결 → ...",
    "cve_correlation_ko": "CVE-2024-1234 RCE 취약점이 있는 호스트에서 실제 Exploit 시도 탐지",
    "ti_verdict_ko": "파일: Emotet 트로이얀 확인, IP: C2 서버 확인",
    "final_verdict": "true_positive",
    "verified_severity": "high",
    "confidence": 95,
    "immediate_actions": [
      "호스트 SERVER-DB01 즉시 네트워크 격리",
      "C2 IP 203.0.113.5 방화벽 차단",
      "악성 파일 malware.exe 삭제 및 전체 스캔"
    ],
    "recommended_responses": [
      "단기: CVE-2024-1234 긴급 패치 적용",
      "중기: 피싱 메일 필터 강화",
      "장기: EDR 솔루션 도입 검토"
    ],
    "summary_ko": "피싱 이메일을 통해 Emotet 트로이얀이 유입되어 C2 서버와 통신을 시도한 실제 위협입니다...",
    "business_impact_ko": "DB 서버 1대가 감염되어 약 2시간 다운타임 발생. 고객 데이터 유출 가능성은 낮으나..."
  }
]
\`\`\`

**중요**:
- 모든 설명은 한글로
- JSON 형식 엄수
- 각 필드 빠짐없이 작성
EOF

  if [ $? -eq 0 ]; then
    echo "✅ 배치 $((batch+1)) 완료"
  else
    echo "❌ 배치 $((batch+1)) 실패"
  fi
  echo ""
done

echo "-----------------------------------"
echo "모든 배치 결과 병합 중..."
echo "-----------------------------------"

# 병합
jq -s 'add' ${OUTPUT_DIR}/detailed_batch_*.json > ${OUTPUT_DIR}/all_detailed_analysis.json

echo ""
echo "==================================="
echo "✅ Pass 2 상세 분석 완료!"
echo "==================================="
echo "출력 파일: ${OUTPUT_DIR}/all_detailed_analysis.json"
echo "분석된 인시던트: ${TOTAL}개"
echo "==================================="
