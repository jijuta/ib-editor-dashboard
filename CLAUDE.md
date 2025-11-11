# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This is a **security incident analysis and reporting platform** built with Next.js 16, React 19, and TypeScript. The application integrates with **OpenSearch** (Cortex XDR security incidents) and **PostgreSQL** (threat intelligence data) to provide automated incident investigation, AI-powered analysis, and daily security reports. The project includes 11 MCP servers and 47+ TypeScript scripts for security automation.

**Important**: This runs on **port 40017** (not 3000) to avoid conflicts with other services in the `/www` monorepo.

## Commands

### Development
```bash
npm run dev          # Start dev server (port 40017)
npm run build        # Production build
npm run start        # Start production server (port 40017)
npm run lint         # Run ESLint
```

### Testing (Natural Language Query System)
```bash
# Quick parser + OpenSearch integration tests
./test/quick-test.sh

# Parser only (no OpenSearch queries)
npx tsx test/nl-query-parser-only.ts

# Full integration test
npx tsx test/nl-query-basic.ts

# Azure OpenAI test
./test/test-azure.sh

# Claude AI test
./test/test-claude.sh

# MCP server test
./test/test-mcp-direct.sh
```

### Incident Investigation
```bash
# Single incident investigation (CLI)
npx tsx script/investigate-incident-cli.ts --incident-id 414186

# Quick investigation script
./script/quick-investigate.sh

# Background automated investigation (cron)
npx tsx script/cron-investigate.ts --once

# Watch for new incidents (file watcher)
npx tsx script/watch-incidents.ts
```

### Daily Reports
```bash
# Generate daily report (yesterday)
./daily-report.sh

# Generate for specific date
./daily-report.sh 2025-11-08

# Automated script with AI analysis
./script/auto-daily-report.sh

# Weekly report
./script/generate-weekly-report.sh
```

## Architecture

### Three-Database System

1. **OpenSearch** (`opensearch:9200`)
   - Maps to `20.41.120.173:9200` via `/etc/hosts`
   - Auth: `admin:Admin@123456`
   - Security incidents from Cortex XDR (~29,578 incidents)
   - Index patterns: `logs-cortex_xdr-incidents-*`, `logs-cortex_xdr-alerts-*`, etc.
   - 7 indices: incidents, alerts, files, networks, processes, endpoints, causality_chains

2. **PostgreSQL - n8n** (`postgres:5432/n8n`)
   - Maps to `20.41.120.173` via `/etc/hosts`
   - Schema: `ioclog`
   - Threat intelligence data: IOC logs, MITRE ATT&CK, CVE database, GeoIP
   - Tables: `ioclog.ioc_log`, `ioclog.mitre_techniques`, `ioclog.cve_details`

3. **PostgreSQL - Editor** (`localhost:5432/postgres`)
   - Local database for application data
   - User management, dashboard configs, saved queries

### MCP Server Integration

11 MCP servers configured in `.mcp.json`:

**Standard Servers:**
1. `next-devtools` - Next.js development tools
2. `chrome-devtools` - Browser debugging and performance
3. `context7` - Up-to-date library documentation
4. `shadcn` - shadcn/ui component management
5. `memory` - Persistent knowledge graph

**Database Servers:**
6. `postgres-editor` - Local editor database (localhost:5432/postgres)
7. `postgres-siem` - SIEM database (localhost:5432/siem_db)
8. `postgres-n8n` - n8n TI database (postgres:5432/n8n)

**Custom Security Servers:**
9. `opensearch` - OpenSearch query interface (port 8099)
10. `incident-analysis` - Statistics, trends, threat analysis (port 8100)
11. `nl-query` - Natural language to OpenSearch DSL converter
12. `claude-investigation` - Claude-powered incident analysis and Korean report generation

### Key Technologies

- **Framework**: Next.js 16.0.1 (App Router) + React 19.2.0
- **Language**: TypeScript 5 (target: ES2017, strict mode)
- **UI**: Tailwind CSS 4, shadcn/ui (New York style), lucide-react icons
- **Database**: OpenSearch 3.5.1, PostgreSQL (pg 8.16.3)
- **AI**: Vercel AI SDK 5.0.89, Azure OpenAI, Google Gemini, Anthropic Claude
- **Data Viz**: Recharts 2.15.4, React Grid Layout 1.5.2
- **Security**: Better-sqlite3 12.4.1 (local caching)

## Project Structure

### Core Directories

```
/www/ib-editor/my-app/
├── app/                           # Next.js 16 App Router
│   ├── admin/                     # Admin dashboard
│   ├── login/                     # Authentication
│   └── signup/                    # User registration
├── components/                     # React components
│   └── ui/                        # shadcn/ui components (New York style)
├── lib/                           # Shared utilities
│   └── utils.ts                   # cn() helper (tailwind-merge + clsx)
├── script/                        # 47+ automation scripts
│   ├── nl-query-*.ts              # Natural language query system (8 files)
│   ├── ai-*.ts                    # AI analyzers (7 files)
│   ├── investigate-*.ts           # Incident investigation (5 files)
│   ├── opensearch*.ts             # OpenSearch clients (3 files)
│   ├── generate-*-report.ts       # Report generation (6 files)
│   └── *.sh                       # Shell automation scripts (9 files)
├── test/                          # Test suite
│   ├── quick-test.sh              # Fast parser + integration tests
│   ├── test-azure.sh              # Azure OpenAI tests
│   └── test-mcp-*.sh              # MCP server tests
└── public/reports/                # Generated security reports
    ├── data/                      # Raw incident data (JSON)
    ├── daily/                     # Daily reports (HTML/MD/JSON)
    └── incident_*/                # Individual incident analysis
```

### Critical Scripts

**Natural Language Query System:**
- `nl-query-parser.ts` - Converts natural language to OpenSearch DSL (supports 30+ date expressions, 8 data types)
- `nl-query-mcp.js` - MCP server for NL query interface
- `opensearch-executor.ts` - Executes OpenSearch queries
- `date-parser.ts` - Advanced date parsing ("last week", "3 days ago", etc.)
- `index-mapping.ts` - Index pattern and field mapping

**AI Incident Analysis (Parallel System):**
- `ai-parallel-analyzer.ts` - Orchestrator for 7 parallel analyzers
- `ai-analyzers/analyst-verifier.ts` - Verifies analyst judgments
- `ai-analyzers/file-hash-analyzer.ts` - File threat analysis
- `ai-analyzers/network-analyzer.ts` - Network behavior analysis
- `ai-analyzers/mitre-analyzer.ts` - MITRE ATT&CK technique analysis
- `ai-analyzers/cve-analyzer.ts` - Vulnerability verification
- `ai-analyzers/endpoint-analyzer.ts` - Endpoint risk assessment
- `ai-analyzers/synthesizer.ts` - Final verdict synthesis

**Investigation Pipeline:**
- `investigate-incident-cli.ts` - CLI tool for single incident investigation
- `ti-correlator.ts` - Threat intelligence correlation (PostgreSQL)
- `investigation-cache.ts` - Local SQLite caching
- `info.js` - Quick incident lookup tool

**Report Generation:**
- `collect-daily-incidents-data.ts` - Collect daily incident data
- `generate-final-report.ts` - Generate HTML/Markdown reports
- `generate-korean-html-report.ts` - Korean language reports
- `markdown-formatter.ts` - Markdown beautification

**Automation:**
- `cron-investigate.ts` - Cron job for automated investigation
- `watch-incidents.ts` - File system watcher for event-driven triggers
- `auto-daily-report.sh` - Complete daily report automation
- `quick-investigate.sh` - Fast investigation wrapper

## Environment Configuration

### Required Environment Variables (.env.local)

```bash
# OpenSearch (Remote - Cortex XDR Incidents)
OPENSEARCH_URL=http://opensearch:9200
OPENSEARCH_USER=admin
OPENSEARCH_PASSWORD=Admin@123456

# PostgreSQL (Remote - Threat Intelligence)
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/n8n?schema=ioclog

# AI Models
AZURE_OPENAI_API_KEY=your_azure_openai_api_key_here
AZURE_OPENAI_ENDPOINT=https://etech-openai.openai.azure.com/
AZURE_OPENAI_DEPLOYMENT=gpt-4o-mini
AZURE_OPENAI_API_VERSION=2024-02-15-preview

GOOGLE_GENERATIVE_AI_API_KEY=AIzaSyDg7sdkC0ZQD34g5SGrWVLTOSf7eKCxcvY
GEMINI_API_KEY=AIzaSyDg7sdkC0ZQD34g5SGrWVLTOSf7eKCxcvY
```

### Host Mapping

The following hosts map to `20.41.120.173` in `/etc/hosts`:
- `opensearch` (port 9200)
- `postgres` (port 5432)

## Development Workflow

### Working with Natural Language Queries

The NL query system converts natural language to OpenSearch DSL:

**Supported Query Types:**
- `search` - Full-text search
- `aggregation` - Group/count queries
- `filter` - Exact match filtering
- `range` - Date/numeric ranges
- `stats` - Statistical analysis

**Supported Data Types:**
- `incidents`, `alerts`, `files`, `networks`, `processes`, `endpoints`, `causality_chains`, `cves`

**Date Expression Examples:**
- "last 7 days", "yesterday", "last week"
- "between 2025-11-01 and 2025-11-08"
- "3 days ago", "2 hours ago"

### Incident Investigation Workflow

1. **Data Collection**: Query 7 OpenSearch indices for incident
2. **TI Correlation**: Match file hashes, IPs, MITRE techniques, CVEs with PostgreSQL
3. **AI Analysis**: Run 6 parallel analyzers + 1 synthesizer (Azure OpenAI)
4. **Result Storage**: Save JSON (full data, ~140KB) and Markdown (report, ~50KB)

**Output Locations:**
- JSON: `public/reports/incident_[ID]_[timestamp].json`
- Markdown: `public/reports/incident_[ID]_[timestamp].md`
- HTML: `public/reports/incident_[ID]_korean_[timestamp].html`

### Daily Report Automation

**Cron Schedule** (recommended):
```bash
# Add to crontab (crontab -e)
0 1 * * * cd /www/ib-editor/my-app && ./script/auto-daily-report.sh >> /var/log/daily-report.log 2>&1
```

**Generated Files:**
- `public/reports/data/daily_incidents_data_[date].json` - Raw data
- `public/reports/data/ai_analysis_[date].json` - AI analysis
- `public/reports/daily/daily_report_[date].html` - HTML report
- `public/reports/daily/daily_report_[date].md` - Markdown report
- `public/reports/daily/daily_report_[date].json` - Unified JSON report

## TypeScript Configuration

- **Path Alias**: `@/*` resolves to project root
- **JSX Runtime**: `react-jsx` (new JSX transform, no React import needed)
- **Target**: ES2017 with strict mode
- **Module Resolution**: bundler (Next.js 16 optimized)

## MCP Usage Patterns

### Using nl-query MCP Tool

```typescript
// Via MCP tool
nl_query({
  query: "Show me high severity incidents from last week",
  model: "azure-gpt-4o-mini",
  execute: true,
  format: "markdown"
})
```

### Using claude-investigation MCP Tool

```typescript
// Step 1: Collect data
collect_incident_data({
  incident_id: "414186"
})

// Step 2: Claude analyzes data and writes analysis

// Step 3: Save and generate report
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
```

## Important Notes

1. **Port Configuration**: Always use port 40017 (not 3000) for dev and production
2. **Host Resolution**: `opensearch` and `postgres` hostnames map to 20.41.120.173
3. **Package Manager**: Use `npm` (both package-lock.json and pnpm-lock.yaml exist, but scripts use npm)
4. **AI Model Default**: Azure OpenAI `gpt-4o-mini` is the primary model (cost-effective)
5. **OpenSearch Auth**: Always use `admin:Admin@123456` credentials
6. **Report Storage**: Reports go to `public/reports/` (NOT `/tmp/`)
7. **Caching**: SQLite database at `.cache/investigations.db` for performance
8. **Token Optimization**: AI analyzers use filtered data (68% reduction) for cost efficiency
9. **Parallel Execution**: 7 AI analyzers run in parallel (3-5x speed improvement)
10. **Korean Language**: Investigation reports are generated in Korean for Korean security teams

## Related Documentation

- `README_INVESTIGATION.md` - Detailed incident investigation system documentation
- `README-DAILY-REPORT.md` - Daily report generation guide
- `CRON_SETUP.md` - Automated report scheduling
- `CLAUDE_REPORTS_README.md` - Claude-powered investigation reports
- `NEXT_CONVERSATION.md` - Development roadmap and conversation context
