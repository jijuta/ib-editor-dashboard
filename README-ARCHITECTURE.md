# my-app 아키텍처 가이드

보안 인시던트 분석 및 리포팅 플랫폼의 전체 아키텍처 문서입니다.

## 목차

1. [시스템 개요](#시스템-개요)
2. [기술 스택](#기술-스택)
3. [4-데이터베이스 시스템](#4-데이터베이스-시스템)
4. [핵심 기능 아키텍처](#핵심-기능-아키텍처)
5. [데이터 흐름](#데이터-흐름)
6. [AI 통합 패턴](#ai-통합-패턴)
7. [MCP 서버 통합](#mcp-서버-통합)
8. [배포 아키텍처](#배포-아키텍처)

---

## 시스템 개요

### 핵심 목적

**보안 인시던트 자동 분석 및 리포팅 플랫폼**

- Cortex XDR 인시던트 데이터 (29,578개 인시던트)
- 위협 인텔리전스 데이터베이스 연동 (997K 멀웨어 레코드)
- AI 기반 병렬 분석 (7개 분석기)
- 일일/주간 보안 리포트 자동 생성
- 자연어 쿼리 시스템 (OpenSearch DSL 변환)

### 주요 특징

- **Enterprise-Grade**: 프로덕션 환경에서 180+ 테넌트 지원
- **AI-Powered**: Azure OpenAI, Google Gemini, Anthropic Claude 통합
- **Multi-Database**: OpenSearch (2개) + PostgreSQL (3개) 연동
- **Automation**: CLI, API, Cron, 파일 워처, MCP 5가지 실행 방식
- **Korean Support**: 한국어 리포트, 국내 OAuth 제공자

---

## 기술 스택

### 프론트엔드

```
Next.js 16.0.1 (App Router)
  ├─ React 19.2.0 (Server Components)
  ├─ TypeScript 5 (strict mode)
  ├─ Tailwind CSS 4 (PostCSS)
  └─ shadcn/ui (New York style)
      ├─ @radix-ui/* (11 packages)
      ├─ lucide-react (600+ icons)
      ├─ next-themes (dark mode)
      └─ Recharts 2.15.4 (8+ chart types)
```

### 백엔드

```
Node.js 18+
  ├─ OpenSearch 3.5.1 client
  ├─ PostgreSQL 16 (pg 8.16.3)
  ├─ Better-SQLite3 (local cache)
  └─ Express (API routes)
```

### AI/LLM

```
Vercel AI SDK 5.0.89
  ├─ Azure OpenAI (gpt-4o-mini) - PRIMARY
  ├─ Google Gemini 2.5
  ├─ Anthropic Claude (Sonnet 4.5)
  └─ OpenAI (legacy)
```

### 데이터 시각화

```
Recharts 2.15.4
  ├─ Area Chart
  ├─ Bar Chart
  ├─ Line Chart
  ├─ Pie Chart
  ├─ Radar Chart
  ├─ Radial Chart
  ├─ Scatter Chart
  └─ Composed Chart

React Grid Layout 1.5.2
  ├─ Drag & Drop
  ├─ Responsive Breakpoints
  └─ LocalStorage Persistence

React Masonry CSS 1.0.16
  └─ Pinterest-style layout
```

---

## 4-데이터베이스 시스템

### 1. Remote OpenSearch (인시던트 데이터)

```yaml
Host: opensearch:9200 (→ 20.41.120.173 via /etc/hosts)
Auth: admin / Admin@123456
Purpose: Cortex XDR 보안 인시던트

Indices (7):
  - logs-cortex_xdr-incidents-*       # 29,578 incidents
  - logs-cortex_xdr-alerts-*          # 알림
  - logs-cortex_xdr-files-*           # 파일 아티팩트
  - logs-cortex_xdr-networks-*        # 네트워크 연결
  - logs-cortex_xdr-processes-*       # 프로세스 실행
  - logs-cortex_xdr-endpoints-*       # 엔드포인트 데이터
  - logs-cortex_xdr-causality_chains-*# 공격 체인

Document Count: ~29,578 incidents
Total Size: ~50GB
Retention: 90 days
```

### 2. Local OpenSearch (벡터 검색)

```yaml
Host: localhost:9200
Purpose: IOC 벡터 검색 (k-NN)
External URL: https://defenderxs.in-bridge.com/opensearch/

Vectors: 1.36M IOC embeddings
Dimensions: 768 (BERT-based)
Use Case: 유사도 기반 위협 탐지

Indices:
  - ioc-vectors-*
  - threat-similarity-*
```

### 3. Remote PostgreSQL - n8n (위협 인텔리전스)

```yaml
Host: postgres:5432 (→ 20.41.120.173 via /etc/hosts)
Database: n8n
Schema: ioclog
Auth: n8n / n8n123 (OR postgres / postgres)

Tables:
  ioclog.bazaar_malware:
    - 997,000 rows (멀웨어 해시)
    - Columns: sha256, md5, file_name, signature, file_type

  ioclog.ti_mitre:
    - 884 rows (MITRE ATT&CK techniques)
    - Columns: technique_id, technique_name, tactic, description

  ioclog.ioc_log:
    - IOC 로그 (enrichment 데이터)
    - Columns: hash, ip, domain, threat_level, first_seen, last_seen

  ioclog.cve_details:
    - CVE 데이터베이스
    - Columns: cve_id, cvss_score, description, published_date

  ioclog.nsrl_hashes:
    - 9,000,000 rows (NSRL benign hash database)
    - Purpose: False positive 감소
```

### 4. Local PostgreSQL - Editor (애플리케이션)

```yaml
Host: localhost:5432
Database: postgres
Schema: public

Tables (inferred):
  - users              # 사용자 계정
  - sessions           # 세션 관리
  - dashboard_configs  # 대시보드 레이아웃
  - saved_queries      # 저장된 쿼리
  - alerts_config      # 알림 설정
  - investigation_jobs # 조사 작업 큐
```

### 데이터베이스 연결 흐름

```
┌─────────────────────────────────────────────────────────────┐
│                        my-app                                │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────┐    ┌──────────────────┐               │
│  │ OpenSearch Client│    │ PostgreSQL Pool  │               │
│  └────────┬─────────┘    └────────┬─────────┘               │
│           │                       │                          │
└───────────┼───────────────────────┼──────────────────────────┘
            │                       │
            ├───────────────┬───────┼───────────────┬─────────
            │               │       │               │
            v               v       v               v
    ┌──────────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
    │ Remote       │ │ Local    │ │ Remote   │ │ Local    │
    │ OpenSearch   │ │OpenSearch│ │PostgreSQL│ │PostgreSQL│
    │ :9200        │ │ :9200    │ │ :5432    │ │ :5432    │
    │              │ │          │ │          │ │          │
    │ Incidents    │ │ Vectors  │ │ TI Data  │ │ App Data │
    └──────────────┘ └──────────┘ └──────────┘ └──────────┘
```

---

## 핵심 기능 아키텍처

### 1. 인시던트 조사 파이프라인 (5단계)

```
┌──────────────────────────────────────────────────────────────┐
│              Incident Investigation Pipeline                  │
└──────────────────────────────────────────────────────────────┘

Stage 1: Data Collection (30-60초)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Input: incident_id (e.g., "414186")

  Query 7 OpenSearch Indices:
    1. logs-cortex_xdr-incidents-*
    2. logs-cortex_xdr-alerts-*
    3. logs-cortex_xdr-files-*
    4. logs-cortex_xdr-networks-*
    5. logs-cortex_xdr-processes-*
    6. logs-cortex_xdr-endpoints-*
    7. logs-cortex_xdr-causality_chains-*

  Output: Structured JSON (~140KB)
    - Incident details
    - 1-5 alerts
    - 0-2 file artifacts
    - 0-50 network connections
    - 0-10 processes
    - 0-5 endpoints
    - 0-1 causality chain

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Stage 2: Threat Intelligence Correlation (PostgreSQL)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  File Hash Analysis:
    1. Query ioclog.ioc_log (threat/unknown/benign)
    2. Check NSRL benign hash DB (9M hashes)
    3. Vector search (k-NN similarity, 1.36M vectors)
    4. Calculate threat score (0-100)

  MITRE ATT&CK Mapping:
    - Query ioclog.ti_mitre (884 techniques)
    - Match technique IDs from alerts
    - Build attack chain visualization

  CVE Matching:
    - Query ioclog.cve_details
    - Get CVSS scores
    - Assess vulnerability severity

  IP Geolocation:
    - GeoIP lookup
    - Threat feed correlation

  Output: Enriched JSON with TI data

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Stage 3: Parallel AI Analysis (5-10초)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Orchestrator (ai-parallel-analyzer.ts):
    Promise.all([
      1. analyst-verifier.ts     → Analyst 판단 검증
      2. file-hash-analyzer.ts   → 파일 위협도 분석
      3. network-analyzer.ts     → 네트워크 패턴 분석
      4. mitre-analyzer.ts       → MITRE 기법 매핑
      5. cve-analyzer.ts         → CVE 취약점 검증
      6. endpoint-analyzer.ts    → 엔드포인트 위험도
      7. synthesizer.ts          → 최종 판정 종합
    ])

  Token Optimization:
    - ai-data-filter.ts → 68% 토큰 감소
    - Top incidents only (not all data)
    - Selective field inclusion

  AI Model: Azure OpenAI gpt-4o-mini
    - Cost: ~$0.005-0.01 per incident
    - Speed: 5-10 seconds (parallel)
    - Quality: 90%+ accuracy

  Output: AI Analysis JSON
    {
      verdict: "true_positive" | "false_positive" | "unknown",
      risk_score: 85,          // 0-100
      confidence: 90,          // 0-100
      summary: "...",
      key_findings: ["...", "..."],
      recommendations: ["...", "..."]
    }

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Stage 4: Report Generation (5-10초)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Three Output Formats:

  1. JSON (~140KB)
     - Full incident data + AI analysis
     - Machine-readable
     - API integration ready

  2. Markdown (~50KB)
     - Human-readable summary
     - GitHub-flavored markdown
     - Quick review format

  3. HTML (~80KB)
     - Korean language professional report
     - Tailwind CSS styling
     - Print-ready format

  Storage: public/reports/incident_[ID]_[timestamp].*

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Stage 5: Caching & Logging (SQLite)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Local SQLite Cache (.cache/investigations.db):
    - Store investigation results
    - Prevent duplicate analysis
    - Fast lookup for reports

  Tables:
    - investigations (id, incident_id, status, result, created_at)
    - cache_hits (incident_id, timestamp)
```

### 2. 일일 리포트 파이프라인 (4단계)

```
┌──────────────────────────────────────────────────────────────┐
│                Daily Report Generation Pipeline               │
└──────────────────────────────────────────────────────────────┘

Stage 1: Data Collection (collect-daily-incidents-data.ts)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Time Range: Yesterday 00:00 - 23:59

  OpenSearch Aggregation:
    - Query all 7 indices
    - Filter by date range
    - Aggregate by severity, status, detection_type

  TI Correlation:
    - File hash lookup (all files)
    - MITRE technique mapping
    - CVE database matching
    - Network threat analysis (by country)

  Statistics Calculation:
    - Total incidents
    - Severity distribution (critical/high/medium/low)
    - Status distribution (new/under_investigation/resolved)
    - Detection type (behavioral/signature/ML)
    - Top threat files (malware families)
    - Top MITRE techniques
    - Geographic distribution

  Output: daily_incidents_data_[YYYY-MM-DD].json (~381KB)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Stage 2: AI Analysis Prompt (create-ai-analysis-prompt.ts)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Structured Prompt (~9KB):
    1. Date Context
       - Report date, day of week
       - Business context

    2. Top 10 Incidents (Detailed)
       - Full incident details
       - TI enrichment
       - MITRE mapping

    3. Statistics
       - Severity distribution
       - Status distribution
       - Detection type analysis
       - Affected hosts

    4. TI Analysis
       - Top threat files (hash + family)
       - Malware campaigns

    5. MITRE Techniques
       - Top 10 techniques
       - Tactic distribution

    6. Network Threats
       - Country-based analysis
       - Suspicious domains/IPs

  Output: ai_analysis_prompt_[YYYY-MM-DD].txt (~9.3KB)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Stage 3: AI Analysis (3 Methods)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Method A: claude CLI (Recommended for Cron)
    cat prompt.txt | claude --print > analysis.json

    - Automatic JSON extraction
    - 60-120 seconds
    - Cron-automation ready
    - Cost: ~$0.01-0.05/report

  Method B: Claude Code (Manual, Free)
    - Copy prompt → Claude Code UI
    - AI generates analysis
    - Copy JSON → save manually
    - 2-3 minutes manual work
    - Cost: $0 (free Sonnet 4.5)

  Method C: Azure OpenAI (SDK)
    - run-ai-analysis.ts script
    - Azure OpenAI gpt-4o-mini
    - 30-60 seconds
    - Cost: ~$0.005-0.01/report

  AI Output JSON:
    {
      executive_summary: "...",
      threat_assessment: {
        risk_level: "high",
        risk_score: 75,
        key_findings: ["...", "..."]
      },
      incident_analysis: {
        false_positive_rate: 0.7,
        patterns: ["..."]
      },
      ti_insights: {
        malware_families: ["...", "..."],
        campaigns: ["..."]
      },
      mitre_analysis: {
        top_techniques: ["T1059", "T1055", ...],
        attack_chain: "..."
      },
      network_threat_analysis: {
        geographic_distribution: {...},
        suspicious_ips: [...]
      },
      recommendations: {
        immediate: ["...", "..."],
        short_term: ["..."],
        long_term: ["..."]
      },
      security_posture: {
        grade: "B",
        strengths: ["..."],
        weaknesses: ["..."]
      }
    }

  Output: ai_analysis_[YYYY-MM-DD].json (~4.2KB)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Stage 4: Report Generation (generate-final-report.ts)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  HTML Report (~99KB):
    - Tailwind CSS 4 styling
    - Responsive design
    - Print-optimized

    Sections:
      1. Header (date, metadata)
      2. Executive Summary (AI narrative)
      3. Key Findings (bullet points)
      4. Statistics (charts via Chart.js)
         - Severity pie chart
         - Status bar chart
         - Detection type distribution
      5. Critical/High Incidents (25+ items)
      6. File Artifact Analysis (threat files)
      7. Network Artifact Analysis (by country)
      8. MITRE ATT&CK Analysis (techniques)
      9. CVE Analysis (vulnerabilities)
      10. Recommendations (3-tier)
      11. Security Posture (grade + assessment)
      12. Footer (AI disclaimer)

  Markdown Report (~4.9KB):
    - Condensed version
    - GitHub-flavored markdown
    - Links to HTML for details

  JSON Report (~14KB):
    - Structured data
    - API integration ready

  Output:
    public/reports/daily/
      ├─ daily_report_[YYYY-MM-DD].html
      ├─ daily_report_[YYYY-MM-DD].md
      └─ daily_report_[YYYY-MM-DD].json
```

---

## 데이터 흐름

### 인시던트 조사 데이터 흐름

```
┌─────────────────────────────────────────────────────────────┐
│                     Trigger Methods (5)                      │
├─────────────────────────────────────────────────────────────┤
│  1. CLI      │ npx tsx script/investigate-incident-cli.ts   │
│  2. MCP Tool │ Claude Code UI                               │
│  3. API      │ POST /api/investigate                        │
│  4. Cron     │ Scheduled automation                         │
│  5. Watcher  │ File system event                            │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           v
        ┌──────────────────────────────────┐
        │   OpenSearch Client (Remote)     │
        │   opensearch-client.ts           │
        └──────────┬───────────────────────┘
                   │
                   ├─ Query 7 Indices
                   │
                   v
        ┌──────────────────────────────────┐
        │   PostgreSQL TI Correlator       │
        │   ti-correlator.ts               │
        └──────────┬───────────────────────┘
                   │
                   ├─ ioclog.ioc_log (hash lookup)
                   ├─ ioclog.ti_mitre (technique mapping)
                   ├─ ioclog.cve_details (CVE matching)
                   │
                   v
        ┌──────────────────────────────────┐
        │   AI Parallel Analyzer           │
        │   ai-parallel-analyzer.ts        │
        └──────────┬───────────────────────┘
                   │
                   ├─ Promise.all([7 analyzers])
                   │
                   v
        ┌──────────────────────────────────┐
        │   Report Generator               │
        │   generate-reports.ts            │
        └──────────┬───────────────────────┘
                   │
                   ├─ JSON (~140KB)
                   ├─ Markdown (~50KB)
                   ├─ HTML (~80KB)
                   │
                   v
        ┌──────────────────────────────────┐
        │   Local Cache (SQLite)           │
        │   .cache/investigations.db       │
        └──────────────────────────────────┘
```

### 일일 리포트 데이터 흐름

```
┌─────────────────────────────────────────────────────────────┐
│                 Execution Modes (3)                          │
├─────────────────────────────────────────────────────────────┤
│  1. Interactive   │ generate-complete-daily-report.sh       │
│  2. Automated     │ auto-daily-report.sh (Cron)             │
│  3. MCP Template  │ generate-daily-report-mcp.sh            │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           v
        ┌──────────────────────────────────┐
        │   Data Collector                 │
        │   collect-daily-incidents-data.ts│
        └──────────┬───────────────────────┘
                   │
                   ├─ OpenSearch: 7 indices aggregation
                   ├─ PostgreSQL: TI correlation
                   │
                   v
        ┌──────────────────────────────────┐
        │   AI Prompt Creator              │
        │   create-ai-analysis-prompt.ts   │
        └──────────┬───────────────────────┘
                   │
                   ├─ Structured 9KB prompt
                   │
                   v
        ┌──────────────────────────────────┐
        │   AI Analysis (3 options)        │
        ├──────────────────────────────────┤
        │  A. claude CLI                   │
        │  B. Claude Code (manual)         │
        │  C. Azure OpenAI                 │
        └──────────┬───────────────────────┘
                   │
                   ├─ AI analysis JSON
                   │
                   v
        ┌──────────────────────────────────┐
        │   Report Generator               │
        │   generate-final-report.ts       │
        └──────────┬───────────────────────┘
                   │
                   ├─ HTML (Tailwind)
                   ├─ Markdown
                   ├─ JSON
                   │
                   v
        ┌──────────────────────────────────┐
        │   public/reports/daily/          │
        │   - HTML, MD, JSON files         │
        └──────────────────────────────────┘
```

---

## AI 통합 패턴

### 병렬 AI 분석 아키텍처

```typescript
// ai-parallel-analyzer.ts

export async function analyzeIncidentParallel(
  incidentData: IncidentData
): Promise<AIAnalysisResult> {

  // Token optimization: 68% reduction
  const filteredData = filterDataForAI(incidentData);

  // 7 parallel analyzers
  const [
    analystVerdict,
    fileAnalysis,
    networkAnalysis,
    mitreAnalysis,
    cveAnalysis,
    endpointAnalysis,
    synthesis
  ] = await Promise.all([
    analyzeAnalystJudgment(filteredData),    // 1
    analyzeFileHashes(filteredData),         // 2
    analyzeNetworkBehavior(filteredData),    // 3
    analyzeMitreMapping(filteredData),       // 4
    analyzeCVEs(filteredData),               // 5
    analyzeEndpoints(filteredData),          // 6
    synthesizeFinalVerdict(filteredData)     // 7 (uses results 1-6)
  ]);

  return {
    verdict: synthesis.verdict,
    risk_score: synthesis.risk_score,
    confidence: synthesis.confidence,
    details: {
      analyst_verification: analystVerdict,
      file_analysis: fileAnalysis,
      network_analysis: networkAnalysis,
      mitre_analysis: mitreAnalysis,
      cve_analysis: cveAnalysis,
      endpoint_analysis: endpointAnalysis
    },
    summary: synthesis.summary,
    key_findings: synthesis.key_findings,
    recommendations: synthesis.recommendations
  };
}
```

### 토큰 최적화 전략

```typescript
// ai-data-filter.ts

export function filterDataForAI(data: IncidentData) {
  return {
    // Only include top incidents (not all)
    incidents: data.incidents.slice(0, 10),

    // Selective fields (not all 163 fields)
    alerts: data.alerts.map(alert => ({
      severity: alert.severity,
      name: alert.name,
      description: alert.description,
      mitre_techniques: alert.mitre_techniques
      // Exclude: raw logs, full causality, etc.
    })),

    // Top threat files only
    files: data.files
      .filter(f => f.is_malicious)
      .slice(0, 5),

    // Top malicious networks
    networks: data.networks
      .filter(n => n.threat_level > 50)
      .slice(0, 10)
  };
}

// Result: 68% token reduction
// Before: ~15,000 tokens
// After: ~4,800 tokens
// Cost savings: 68%
```

### AI 모델 선택 전략

```yaml
Primary Model: Azure OpenAI gpt-4o-mini
  Use Case:
    - Daily reports
    - Incident analysis
    - Batch processing

  Pros:
    - Cost-effective (~$0.005-0.01/task)
    - Fast (30-120 seconds)
    - Reliable API
    - Good quality (90%+ accuracy)

  Cons:
    - Requires API key
    - Rate limits (20 RPM)

Secondary Model: Claude (via claude CLI)
  Use Case:
    - Manual analysis
    - Cron automation (if available)
    - High-quality analysis

  Pros:
    - Best quality analysis
    - Automatic JSON extraction
    - Cron-ready (pipe input)

  Cons:
    - Requires claude CLI installation
    - Manual setup

Tertiary Model: Google Gemini 2.5
  Use Case:
    - Fallback option
    - Cost comparison

  Pros:
    - Competitive pricing
    - Fast API

  Cons:
    - Newer model (less tested)
```

---

## MCP 서버 통합

### 12개 MCP 서버 아키텍처

```yaml
Standard MCP Servers (5):
  1. next-devtools:
      Purpose: Next.js 16 documentation & runtime
      Provider: @nextjs/mcp
      Use: Development help, API reference

  2. chrome-devtools:
      Purpose: Browser automation & performance
      Provider: @chrome/mcp
      Use: Testing, debugging

  3. context7:
      Purpose: Real-time library documentation
      Provider: Upstash
      Use: Latest package docs

  4. memory:
      Purpose: Persistent knowledge graph
      Provider: @memory/mcp
      Use: Session memory, context retention

  5. shadcn:
      Purpose: shadcn/ui component registry
      Provider: @shadcn/mcp
      Use: Component installation, customization

Database MCP Servers (3):
  6. postgres-editor:
      Host: localhost:5432/postgres
      Purpose: Application database
      Use: User management, configs

  7. postgres-siem:
      Host: localhost:5432/siem_db
      Purpose: SIEM database
      Use: Legacy data (if applicable)

  8. postgres-n8n:
      Host: postgres:5432/n8n (→ 20.41.120.173)
      Purpose: Threat intelligence database
      Schema: ioclog
      Use: TI correlation, MITRE, CVE

Custom Security MCP Servers (4):
  9. opensearch:
      URL: http://20.41.120.173:8099
      Type: HTTP Proxy
      Package: opensearch-mcp-inbridge
      Tools: 8 tools
        - Index_Lister
        - Index_Searcher
        - Cluster_Health_Checker
        - IndexMappingTool
        - GetShardsTool
        - CountTool
        - MsearchTool
        - ExplainTool

  10. incident-analysis:
      URL: http://20.41.120.173:8100
      Type: HTTP Server (Express)
      Package: incident-analysis-mcp
      Tools: 5 tools
        - get_incident_statistics
        - create_incident_trend_chart
        - analyze_top_threats
        - analyze_geographic_distribution
        - generate_incident_report

  11. nl-query:
      Type: Node.js MCP Server
      Script: script/nl-query-mcp.js
      Tools: 1 tool
        - nl_query (Natural Language → OpenSearch DSL)

      Parameters:
        - query: string (natural language)
        - model: "azure-gpt-4o-mini" | "gemini-2.5" | "claude"
        - execute: boolean (run query or just convert)
        - format: "markdown" | "json" | "table"

  12. claude-investigation:
      Type: Custom MCP
      Purpose: Claude-powered incident analysis
      Tools: 3 tools
        - collect_incident_data(incident_id)
        - analyze_incident(data) → Korean analysis
        - save_analysis_and_generate_report(incident_id, analysis)
```

### MCP 사용 패턴

```typescript
// Example 1: Natural Language Query via MCP

// User in Claude Code:
"Show me high severity incidents from last week"

// MCP Tool Call:
nl_query({
  query: "Show me high severity incidents from last week",
  model: "azure-gpt-4o-mini",
  execute: true,
  format: "markdown"
})

// Behind the scenes:
1. NL Parser converts to OpenSearch DSL
2. Date parser: "last week" → 2025-11-11 to 2025-11-18
3. Execute query against logs-cortex_xdr-incidents-*
4. Format results as markdown table
5. Return to Claude Code UI

// Example 2: Incident Analysis via MCP

// Step 1: Collect data
collect_incident_data({
  incident_id: "414186"
})

// Step 2: Claude analyzes and writes Korean report
// (This happens in Claude's context)

// Step 3: Save analysis
save_analysis_and_generate_report({
  incident_id: "414186",
  analysis: {
    incident_detail: "...",
    endpoint_analysis: "...",
    file_artifacts: "...",
    network_artifacts: "...",
    mitre_analysis: "...",
    final_verdict: {
      verdict: "true_positive",
      risk_score: 85,
      confidence: 90,
      summary: "...",
      key_findings: ["..."]
    }
  }
})

// Output: HTML report in Korean
```

---

## 배포 아키텍처

### 개발 환경

```bash
# Port Configuration
Development: npm run dev    → http://localhost:40017
Production:  npm start       → http://localhost:40017

# Why 40017?
- Avoids conflict with standard Next.js port 3000
- Avoids conflict with ib-poral (40014 dev, 40013 prod)
- Part of /www monorepo port allocation strategy
```

### 네트워크 구성

```
/etc/hosts Mapping:
  opensearch → 20.41.120.173
  postgres   → 20.41.120.173

Firewall Rules:
  - Allow 40017 (my-app)
  - Allow 9200 (OpenSearch)
  - Allow 5432 (PostgreSQL)
  - Allow 8099 (OpenSearch MCP)
  - Allow 8100 (Incident Analysis MCP)

External Access:
  - https://defenderxs.in-bridge.com/opensearch/
    → Proxies to localhost:9200 (local OpenSearch)
```

### 프로세스 관리 (개발 중 고려사항)

```bash
# 현재는 pm2 사용 안함 (ib-poral과 다름)
# 프로덕션 배포 시 고려:

pm2 start npm --name "my-app" -- start
pm2 save
pm2 startup

# 또는 systemd service:
[Unit]
Description=my-app Security Platform
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/www/ib-editor/my-app
ExecStart=/usr/bin/npm start
Restart=always

[Install]
WantedBy=multi-user.target
```

### Cron 자동화

```bash
# /etc/cron.d/my-app-daily-report

# Daily report at 1 AM
0 1 * * * ubuntu cd /www/ib-editor/my-app && ./script/auto-daily-report.sh >> /var/log/my-app/daily-report.log 2>&1

# Weekly report on Monday at 2 AM
0 2 * * 1 ubuntu cd /www/ib-editor/my-app && ./script/generate-weekly-report.sh >> /var/log/my-app/weekly-report.log 2>&1

# Automated investigation every 6 hours
0 */6 * * * ubuntu cd /www/ib-editor/my-app && npx tsx script/cron-investigate.ts --once >> /var/log/my-app/cron-investigate.log 2>&1
```

### 환경 변수 관리

```bash
# .env.local (350+ lines)
# NEVER commit this file!

# Required Environment Variables:
OPENSEARCH_URL=http://opensearch:9200
OPENSEARCH_USER=admin
OPENSEARCH_PASSWORD=Admin@123456

DATABASE_URL=postgresql://postgres:postgres@postgres:5432/n8n?schema=ioclog

AZURE_OPENAI_API_KEY=...
AZURE_OPENAI_ENDPOINT=https://etech-openai.openai.azure.com/
GOOGLE_GENERATIVE_AI_API_KEY=...

# 50+ more environment variables for:
# - OAuth providers (Google, Naver, Kakao, etc.)
# - AI models (Azure, Google, Claude, OpenAI)
# - External APIs (Cortex XDR, Supabase, etc.)
```

---

## 성능 최적화

### 병렬 처리

```yaml
AI Analysis:
  Sequential Time: 35-70 seconds (7 analyzers × 5-10s each)
  Parallel Time: 5-10 seconds (Promise.all)
  Speedup: 3-5x

Database Queries:
  Batch Operations: Bulk OpenSearch queries
  Connection Pooling: PostgreSQL pg pool
  Local Caching: SQLite for investigation results
```

### 토큰 비용 최적화

```yaml
Before Optimization:
  Tokens per Incident: ~15,000
  Cost per Incident: $0.015-0.03

After Optimization (ai-data-filter.ts):
  Tokens per Incident: ~4,800
  Cost per Incident: $0.005-0.01
  Savings: 68%

Daily Report:
  Before: ~50,000 tokens → $0.05-0.10
  After: ~16,000 tokens → $0.01-0.05
  Savings: 68%
```

### 캐싱 전략

```yaml
SQLite Local Cache:
  Location: .cache/investigations.db
  Purpose: Store investigation results
  TTL: 7 days

  Benefits:
    - Prevent duplicate AI analysis
    - Fast report regeneration
    - Offline access to results

LocalStorage (Frontend):
  Purpose: Dashboard layout persistence
  Data: Widget positions, sizes, visibility
  Size: <1MB
```

---

## 보안 고려사항

### 인증 & 권한

```yaml
OAuth Providers (7):
  - Google
  - Naver
  - Kakao
  - Microsoft
  - Salesforce
  - Zoom
  - Facebook

NextAuth.js v5:
  - Session management
  - JWT tokens
  - CSRF protection
```

### 데이터 보호

```yaml
Sensitive Data:
  - Never commit .env.local
  - API keys in environment variables only
  - No credentials in code

Database Security:
  - PostgreSQL: Role-based access
  - OpenSearch: Basic auth (consider upgrading to SAML/OIDC)

File Permissions:
  - Reports: public/reports/ (644)
  - Scripts: script/ (755)
  - Configs: .env.local (600)
```

### API 보안

```yaml
Rate Limiting:
  - Azure OpenAI: 20 RPM
  - Google Gemini: 60 RPM
  - Cortex XDR API: 100 RPM

Error Handling:
  - Sentry integration for error tracking
  - Supabase notifications for critical errors
  - Log rotation (prevent disk fill)
```

---

## 모니터링 & 로깅

### 로그 위치

```bash
# Application Logs
/var/log/my-app/
  ├─ daily-report.log           # Daily report generation
  ├─ weekly-report.log          # Weekly reports
  ├─ cron-investigate.log       # Automated investigations
  └─ error.log                  # Application errors

# Temporary Logs
/tmp/
  ├─ auto-daily-report-[date].log
  └─ investigation-[id].log
```

### 메트릭 수집 (향후 고려)

```yaml
Key Metrics:
  - Investigation duration (p50, p95, p99)
  - AI analysis cost per incident
  - False positive rate
  - Report generation time
  - Database query performance

Tools (suggested):
  - Prometheus + Grafana
  - OpenTelemetry
  - DataDog
```

---

## 확장성 고려사항

### 수평 확장

```yaml
Current: Single server

Future Scaling:
  - Load balancer (Nginx/HAProxy)
  - Multiple app instances
  - Shared Redis for session storage
  - Message queue (RabbitMQ/Redis) for investigation jobs
  - Separate AI analysis workers
```

### 데이터베이스 확장

```yaml
OpenSearch:
  - Index lifecycle management (ILM)
  - Rollover policies
  - Snapshot/restore strategy

PostgreSQL:
  - Read replicas
  - Partitioning (by date range)
  - Archive old TI data
```

---

## 트러블슈팅 체크리스트

### 데이터베이스 연결 문제

```bash
# OpenSearch
curl -X GET "http://opensearch:9200/_cluster/health" \
  -u admin:Admin@123456 --insecure

# PostgreSQL
PGPASSWORD=n8n123 psql -h postgres -U n8n -d n8n \
  -c "SELECT COUNT(*) FROM ioclog.ioc_log"

# Host resolution
cat /etc/hosts | grep -E "(opensearch|postgres)"
```

### AI 분석 실패

```bash
# Check API keys
echo $AZURE_OPENAI_API_KEY
echo $GOOGLE_GENERATIVE_AI_API_KEY

# Test Azure OpenAI
./test/test-azure.sh

# Test Claude
./test/test-claude.sh

# Check rate limits (Azure)
# 20 RPM → ~3 requests/10 seconds max
```

### 리포트 생성 실패

```bash
# Validate JSON files
jq . public/reports/data/daily_incidents_data_2025-11-10.json
jq . public/reports/data/ai_analysis_2025-11-10.json

# Check file permissions
ls -la public/reports/

# Disk space
df -h /www/ib-editor/my-app/public/reports/

# Manual regeneration
npx tsx script/generate-final-report.ts 2025-11-10
```

---

## 추가 리소스

### 문서

- `CLAUDE.md` - 프로젝트 가이드
- `README_INVESTIGATION.md` - 조사 시스템 상세
- `README-DAILY-REPORT.md` - 일일 리포트 가이드
- `CRON_SETUP.md` - Cron 설정
- `MCP_SERVERS_MANUAL.md` - MCP 서버 매뉴얼

### 외부 문서

- [Next.js 16 Documentation](https://nextjs.org/docs)
- [OpenSearch Documentation](https://opensearch.org/docs/)
- [Vercel AI SDK](https://sdk.vercel.ai/docs)
- [shadcn/ui](https://ui.shadcn.com/)
- [MITRE ATT&CK](https://attack.mitre.org/)

---

**마지막 업데이트**: 2025-11-20
**작성자**: In-Bridge Security Team
**버전**: 2.0
