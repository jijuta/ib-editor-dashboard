#!/bin/bash
# Pass 1: 전체 인시던트 빠른 분류
#
# 기능:
# - 모든 인시던트를 True Positive / False Positive / Unknown으로 분류
# - Gemini Flash 사용 (빠르고 저렴)
# - 배치 처리 (50개씩)
#
# Usage:
#   ./script/pass1-classify-all.sh 2025-11-23

set -e

DATE=${1:-$(date -d "yesterday" +%Y-%m-%d)}
DATA_FILE="/tmp/daily_data_${DATE}.json"
OUTPUT_DIR="/tmp/pass1_${DATE}"

echo "==================================="
echo "[Pass 1] 전체 인시던트 분류 시작"
echo "날짜: ${DATE}"
echo "==================================="
echo ""

# 데이터 파일 확인
if [ ! -f "$DATA_FILE" ]; then
  echo "❌ 데이터 파일이 없습니다: $DATA_FILE"
  echo "먼저 collect-daily-incidents.ts를 실행하세요."
  exit 1
fi

mkdir -p $OUTPUT_DIR

# 전체 인시던트 개수 확인
TOTAL=$(jq '.all_incidents | length' $DATA_FILE)
echo "총 ${TOTAL}개 인시던트 분류 시작..."
echo ""

# 배치 크기 (한 번에 10개씩 처리 - 토큰 제한 고려)
BATCH_SIZE=10
BATCH_COUNT=$(( (TOTAL + BATCH_SIZE - 1) / BATCH_SIZE ))

echo "배치 크기: ${BATCH_SIZE}개"
echo "배치 개수: ${BATCH_COUNT}개"
echo ""

for ((batch=0; batch<$BATCH_COUNT; batch++)); do
  START=$(( batch * BATCH_SIZE ))
  END=$(( START + BATCH_SIZE ))

  echo "-----------------------------------"
  echo "배치 $((batch+1))/$BATCH_COUNT: 인시던트 ${START}-${END} 처리 중..."
  echo "-----------------------------------"

  # 해당 배치의 인시던트만 추출 (분류에 필요한 필드만)
  BATCH_DATA=$(jq ".all_incidents[${START}:${END}] | map({
    incident_id: .incident.incident_id,
    severity: .incident.severity,
    status: .incident.status,
    description: .incident.description,
    alert_names: (.alerts | map(.alert_name)),
    alert_categories: (.alerts | map(.category)),
    host_names: (.endpoints | map(.endpoint_name)),
    file_count: (.files | length),
    network_count: (.networks | length),
    process_count: (.processes | length),
    summary: .summary
  })" $DATA_FILE)

  # Haiku로 빠른 분류 (마크다운 블록 제거 후처리)
  cat <<EOF | claude --print --model haiku | sed -n '/^\[/,/^\]/p' > ${OUTPUT_DIR}/batch_${batch}.json
다음 인시던트들을 빠르게 분류하세요:

**데이터**:
${BATCH_DATA}

---

## 분류 기준

### True Positive (실제 위협)
- 악성 파일 실행 확인
- 알려진 C2 서버 연결
- 데이터 유출 시도
- Exploit 시도
- 랜섬웨어 행위
- 비정상 프로세스 실행
- 악성 도메인 접속

### False Positive (오탐)
- 정상 Windows/소프트웨어 업데이트
- 허용된 내부 도구 실행
- 정상 관리 작업
- 알려진 안전한 파일/도메인
- 설정 변경으로 인한 알럿

### Unknown (추가 조사 필요)
- 판단하기 애매한 경우
- 정보 부족
- 새로운 패턴
- 의심스럽지만 확실하지 않음

---

## 각 인시던트별 분석 요청

1. **판단**: True Positive / False Positive / Unknown?

2. **심각도 검증**:
   - incident.severity 필드 확인
   - 실제 심각도가 다르면 수정 제안
   - Critical / High / Medium / Low

3. **상세 분석 필요 여부**: Yes / No
   - Yes: True Positive, Critical/High, Unknown
   - No: False Positive, Low, 명확한 경우

4. **빠른 이유** (50자 이내):
   - 왜 이렇게 판단했는지 간단히 설명
   - 예: "알려진 C2 서버 연결", "Windows Defender 정상 업데이트"

---

## 출력 형식

JSON 배열로 응답하세요. 각 인시던트별로:

\`\`\`json
[
  {
    "incident_id": "414186",
    "verdict": "true_positive",
    "severity_original": "high",
    "severity_verified": "high",
    "needs_detailed_analysis": true,
    "quick_reason": "알려진 C2 서버(evil.com)로 연결 시도"
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
\`\`\`

**중요**:
- 반드시 JSON 배열 형식으로만 응답
- 모든 인시던트에 대해 분류 제공
- verdict는 "true_positive", "false_positive", "unknown" 중 하나
- needs_detailed_analysis는 true 또는 false

**절대 금지**:
- 마크다운 형식 사용 금지
- 설명 텍스트 추가 금지
- \`\`\`json 코드 블록 사용 금지
- 순수 JSON만 출력할 것

**응답 형식**: [ { ... }, { ... } ] 형태의 순수 JSON 배열만
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

# 모든 배치 결과 병합
jq -s 'add' ${OUTPUT_DIR}/batch_*.json > ${OUTPUT_DIR}/all_classifications.json

# 통계 계산
TOTAL_TP=$(jq '[.[] | select(.verdict == "true_positive")] | length' ${OUTPUT_DIR}/all_classifications.json)
TOTAL_FP=$(jq '[.[] | select(.verdict == "false_positive")] | length' ${OUTPUT_DIR}/all_classifications.json)
TOTAL_UNKNOWN=$(jq '[.[] | select(.verdict == "unknown")] | length' ${OUTPUT_DIR}/all_classifications.json)
NEEDS_DETAIL=$(jq '[.[] | select(.needs_detailed_analysis == true)] | length' ${OUTPUT_DIR}/all_classifications.json)

echo ""
echo "==================================="
echo "✅ Pass 1 분류 완료!"
echo "==================================="
echo "출력 파일: ${OUTPUT_DIR}/all_classifications.json"
echo ""
echo "분류 결과:"
echo "  - True Positive: ${TOTAL_TP}개"
echo "  - False Positive: ${TOTAL_FP}개"
echo "  - Unknown: ${TOTAL_UNKNOWN}개"
echo ""
echo "상세 분석 필요: ${NEEDS_DETAIL}개"
echo "==================================="
