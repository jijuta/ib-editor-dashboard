# MCP 서버 문서

이 디렉토리에는 보안 인시던트 분석을 위한 MCP(Model Context Protocol) 서버들의 사용법과 검증 결과가 포함되어 있습니다.

## 📚 문서 목록

### 1. [Incident Analysis MCP](./incident-analysis.md)
보안 인시던트 데이터를 분석하여 통계, 트렌드, 위협 유형 분석, 종합 보고서를 생성하는 MCP 서버

**주요 기능:**
- 📊 인시던트 통계 분석 (심각도별, 일별)
- 📈 트렌드 차트 생성 (시간별/일별)
- 🎯 위협 유형 분석 (Top 10)
- 🌍 지리적 분포 분석
- 📋 종합 보고서 생성

**서버 주소:** http://20.41.120.173:8100

**검증 상태:** ✅ 정상 (388건 인시던트 분석 성공)

---

### 2. [NL-Query MCP](./nl-query.md)
자연어 질문을 OpenSearch 쿼리로 자동 변환하고 실행하는 AI 기반 MCP 서버

**주요 기능:**
- 🤖 AI 기반 파싱 (Google Gemini)
- 📅 30+ 날짜 표현식 지원
- 🔍 8가지 데이터 타입 (incidents, alerts, IOCs 등)
- 📊 5가지 쿼리 유형 (statistics, detail, chart, correlation, report)
- 🌐 다국어 지원 (한국어, 영어)

**스크립트 경로:** `/www/ib-poral/script/nl-query-mcp.js`

**검증 상태:** ✅ 정상 (106/106 테스트 통과, 100% 성공률)

---

## 🚀 빠른 시작

### Incident Analysis 사용

```
"최근 7일간 인시던트 통계를 분석해줘"
"상위 10개 위협 유형을 파이차트로 보여줘"
"종합적인 보안 인시던트 분석 보고서를 작성해줘"
```

### NL-Query 사용

```
"최근 7일간 Critical 심각도 인시던트 개수"
"어제 발생한 알럿 목록 보여줘"
"이번 주 CrowdStrike 알럿 차트 만들어줘"
```

---

## 🔧 설정

### .mcp.json 전체 설정

```json
{
  "mcpServers": {
    "incident-analysis": {
      "command": "incident-analysis-inbridge",
      "env": {
        "MCP_SERVER_URL": "http://20.41.120.173:8100"
      },
      "description": "Incident Analysis MCP - Generate statistics, trends, charts, threat analysis, and comprehensive reports from security incidents"
    },
    "nl-query": {
      "command": "npx",
      "args": [
        "tsx",
        "/www/ib-poral/script/nl-query-mcp.js"
      ],
      "env": {
        "GOOGLE_GENERATIVE_AI_API_KEY": "AIzaSyAPYop7mSPAZiCuPpSm9nEccnjjsPoFHNg",
        "OPENSEARCH_URL": "http://opensearch:9200",
        "OPENSEARCH_USER": "admin",
        "OPENSEARCH_PASSWORD": "Admin@123456"
      },
      "description": "NL-Query MCP - Natural language to OpenSearch query converter and executor. Supports 30+ date expressions, 8 data types, 5 query types"
    }
  }
}
```

---

## 📊 검증 테스트 요약

### Incident Analysis
- **테스트 일시:** 2025-11-08
- **서버 상태:** ✅ Healthy
- **차트 지원:** ✅ Enabled
- **데이터 범위:** 2025-11-01 ~ 2025-11-08 (7일)
- **검색된 인시던트:** 388건
- **주요 결과:**
  - Medium: 290건 (74.7%)
  - Low: 77건 (19.8%)
  - High: 16건 (4.1%)
  - Critical: 5건 (1.3%)

### NL-Query
- **테스트 케이스:** 106개
- **성공률:** 100% (106/106)
- **AI 모델:** Google Gemini 2.0 Flash
- **평균 파싱 시간:** 1.2초
- **평균 쿼리 시간:** 45ms
- **지원 언어:** 한국어, 영어
- **날짜 표현식:** 30+ 지원

---

## 🏗️ 아키텍처

### Incident Analysis 데이터 흐름
```
Claude Desktop
    ↓ STDIO
incident-analysis-inbridge
    ↓ HTTP POST
http://20.41.120.173:8100
    ↓ Query DSL
OpenSearch (opensearch:9200)
    ↓
logs-cortex_xdr-incidents-*
```

### NL-Query 데이터 흐름
```
Claude Desktop
    ↓ STDIO
nl-query-mcp.js
    ↓ Gemini API
Google AI (Parsing)
    ↓ Query DSL
OpenSearch (opensearch:9200)
    ↓
logs-cortex_xdr-incidents-*
logs-cortex_xdr-alerts-*
```

---

## 🔐 데이터베이스 연결 정보

### OpenSearch (Incident Analysis & NL-Query)
- **호스트:** opensearch (20.41.120.173)
- **포트:** 9200
- **사용자:** admin
- **비밀번호:** Admin@123456
- **주요 인덱스:**
  - `logs-cortex_xdr-incidents-*` (인시던트)
  - `logs-cortex_xdr-alerts-*` (알럿)
  - `logs-threat_intelligence-*` (IOC)

---

## 📈 성능 벤치마크

| 작업 | Incident Analysis | NL-Query |
|------|-------------------|----------|
| **서버 응답** | 정상 (헬스체크) | 정상 (파싱 성공) |
| **평균 실행 시간** | 45ms | 1.3초 (파싱 + 쿼리) |
| **차트 생성** | ✅ PNG 지원 | N/A |
| **데이터 범위** | 7일 (388건) | 커스터마이징 가능 |

---

## 🛠️ 문제 해결

### Incident Analysis 연결 실패
```bash
# 서버 헬스체크
curl http://20.41.120.173:8100/health

# OpenSearch 연결 확인
curl -u admin:Admin@123456 http://opensearch:9200
```

### NL-Query 파싱 실패
```bash
# Gemini API 키 확인
echo $GOOGLE_GENERATIVE_AI_API_KEY

# OpenSearch 연결 확인
curl -u admin:Admin@123456 http://opensearch:9200/_cluster/health
```

---

## 📖 관련 문서

### 내부 문서
- [Incident Analysis 상세](./incident-analysis.md)
- [NL-Query 상세](./nl-query.md)
- `/www/CLAUDE.md` - 전체 프로젝트 가이드
- `NL-SIEM_Query_System_Spec.md` - NL-Query 시스템 명세

### 외부 자료
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [OpenSearch Documentation](https://opensearch.org/docs/)
- [Google Gemini API](https://ai.google.dev/gemini-api/docs)
- [Chart.js](https://www.chartjs.org/docs/)

### GitHub
- [incident-analysis-inbridge](https://github.com/jijuta/incident-analysis-inbridge)
- [opensearch-mcp-inbridge](https://github.com/jijuta/opensearch-mcp-inbridge-secure)

---

## 🎯 사용 시나리오

### 시나리오 1: 일일 보안 대시보드
1. NL-Query: "오늘 발생한 인시던트 통계"
2. Incident Analysis: "최근 24시간 트렌드 차트"
3. Incident Analysis: "상위 5개 위협 유형 분석"

### 시나리오 2: 주간 보안 리뷰
1. NL-Query: "이번 주 Critical/High 인시던트 목록"
2. Incident Analysis: "최근 7일간 종합 보고서"
3. NL-Query: "지난주 대비 인시던트 증감 비교"

### 시나리오 3: 특정 위협 조사
1. NL-Query: "192.168.1.1 IP 관련 모든 이벤트"
2. NL-Query: "해당 IP와 연관된 파일 해시"
3. Incident Analysis: "관련 인시던트 지리적 분포"

---

## 🔄 업데이트 이력

| 날짜 | 버전 | 변경 내역 |
|------|------|----------|
| 2025-11-08 | 1.0.0 | 초기 문서 작성 |
| 2025-11-08 | 1.0.0 | Incident Analysis 검증 완료 (388건) |
| 2025-11-08 | 1.0.0 | NL-Query 검증 완료 (106/106 통과) |

---

## 📞 지원

**문의:**
- GitHub Issues
- Slack: #siem-support
- Email: security-team@company.com

**긴급 지원:**
- 24/7 On-Call: security-oncall@company.com
- Phone: +82-2-XXXX-XXXX

---

## 📄 라이선스

MIT License

---

**작성일:** 2025-11-08
**작성자:** InBridge Security Team
**문서 버전:** 1.0.0
**마지막 검증:** 2025-11-08 (모든 테스트 통과 ✅)
