# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Security incident analysis platform for DeFender X SIEM. Built with Next.js 16 + React 19 + TypeScript. Integrates OpenSearch (Cortex XDR incidents) and PostgreSQL (threat intelligence) for automated incident investigation, AI-powered parallel analysis, and Korean-language security reports.

**Port**: 40017
**Package Manager**: `npm` only (not pnpm)

## Commands

```bash
# Development
npm run dev                           # http://localhost:40017
npm run build && npm run start        # Production
npm run lint                          # ESLint

# Testing - NL Query System
./test/quick-test.sh                  # Parser + OpenSearch integration (recommended)
./test/test-azure.sh                  # Azure OpenAI model
./test/test-claude.sh                 # Claude model

# Incident Investigation
npx tsx script/investigate-incident-cli.ts --incident-id 414186
npx tsx script/investigate-incident-cli.ts --incident-id 414186 --force  # Ignore cache
node script/info.js 414186 --summary  # Quick lookup

# Daily Reports
./daily-report.sh                     # Yesterday's report
./daily-report.sh 2025-11-08          # Specific date
./script/auto-daily-report.sh         # With AI analysis (for cron)
```

## Architecture

### Database System

| Database | Host | Purpose |
|----------|------|---------|
| OpenSearch | `opensearch:9200` (→20.41.120.173) | Cortex XDR incidents, 7 indices: `logs-cortex_xdr-{incidents,alerts,files,networks,processes,endpoints,causality_chains}-*` |
| PostgreSQL n8n | `postgres:5432/n8n` (→20.41.120.173) | TI data in `ioclog` schema: `bazaar_malware` (997K), `ti_mitre` (884), `cve_details`, `nsrl_hashes` (9M) |
| PostgreSQL Local | `localhost:5432/postgres` | App data (users, dashboards) |

**Auth**: OpenSearch `admin:Admin@123456`, PostgreSQL `postgres:postgres`

**Host Resolution**: `opensearch` and `postgres` hostnames map to 20.41.120.173 via `/etc/hosts`

### MCP Servers (12 in `.mcp.json`)

| Category | Server | Purpose |
|----------|--------|---------|
| **Custom Security** | `nl-query` | Natural language → OpenSearch DSL (Azure GPT-4o-mini) |
| | `claude-investigation` | Incident data collection + Korean report generation |
| | `opensearch` (port 8099) | Direct OpenSearch queries |
| | `incident-analysis` (port 8100) | Statistics, trends, charts |
| **Database** | `postgres-editor` | Local app DB |
| | `postgres-siem` | SIEM dashboard DB |
| | `postgres-n8n` | TI/MITRE/CVE data |
| **Standard** | `next-devtools`, `chrome-devtools`, `context7`, `shadcn`, `memory` | Dev tools |

### Investigation Pipeline

```
Input (CLI/API/MCP)
  ↓
1. Data Collection → 7 OpenSearch indices
  ↓
2. TI Correlation → Match hashes/IPs/MITRE with PostgreSQL
  ↓
3. AI Analysis → 7 parallel analyzers (script/ai-analyzers/):
   ├── analyst-verifier.ts   (verify analyst judgments)
   ├── file-hash-analyzer.ts (file threats)
   ├── network-analyzer.ts   (network behavior)
   ├── mitre-analyzer.ts     (ATT&CK techniques)
   ├── cve-analyzer.ts       (vulnerabilities)
   ├── endpoint-analyzer.ts  (endpoint risk)
   └── synthesizer.ts        (final verdict)
  ↓
4. Caching → .cache/investigations.db (SQLite)
  ↓
5. Output → public/reports/incident_[ID]_*.{json,md,html}
```

### NL Query System

Converts natural language to OpenSearch DSL via `script/nl-query-parser.ts`:
- **Query types**: search, aggregation, filter, range, stats
- **Data types**: incidents, alerts, files, networks, processes, endpoints, causality_chains, cves
- **Date expressions**: "last 7 days", "yesterday", "3 days ago", "between X and Y", "이번 주", "지난달"
- **AI models**: Azure GPT-4o-mini (default), Gemini 2.5/2.0, Claude 3.5

## Key Files

| Component | Path |
|-----------|------|
| NL Query Parser | `script/nl-query-parser.ts` |
| Investigation CLI | `script/investigate-incident-cli.ts` |
| AI Parallel Analyzer | `script/ai-parallel-analyzer.ts` |
| TI Correlator | `script/ti-correlator.ts` |
| Daily Report | `./daily-report.sh` → `script/collect-daily-incidents-data.ts` |
| MCP: NL Query | `script/nl-query-mcp.js` |
| MCP: Investigation | `script/claude-investigation-mcp.js` |
| OpenSearch Client | `script/opensearch.ts` |

## MCP Tool Usage

```typescript
// Natural Language Query
mcp__nl_query__nl_query({
  query: "high severity incidents from last week",
  execute: true
})

// Incident Investigation (3-step workflow)
// 1. Collect data
collect_incident_data({ incident_id: "414186" })
// 2. Claude analyzes the data (manual step)
// 3. Save report
save_analysis_and_generate_report({
  incident_id: "414186",
  analysis: { /* Claude's analysis */ }
})

// Incident Statistics
mcp__incident_analysis__get_incident_statistics({ days: 7 })
mcp__incident_analysis__generate_incident_report({ days: 1 })
```

## Project Structure

```
/www/ib-editor/my-app/
├── app/                      # Next.js 16 App Router
│   ├── api/
│   │   ├── investigate/      # Investigation REST API
│   │   └── dashboard/        # Dashboard API routes
│   ├── admin/                # Admin dashboard
│   └── dashboard-test/       # Dashboard testing
├── script/                   # 45+ automation scripts
│   ├── ai-analyzers/         # 7 parallel AI analyzers
│   ├── nl-query-*.ts         # NL query system
│   ├── investigate-*.ts      # Investigation tools
│   └── *-mcp.js              # MCP server implementations
├── test/                     # Test scripts
├── public/reports/           # Generated reports output
│   ├── daily/                # Daily reports
│   └── data/                 # Collected data
└── .cache/                   # SQLite investigation cache
```

## Cron Automation

```bash
# Daily report at 1 AM
0 1 * * * cd /www/ib-editor/my-app && ./script/auto-daily-report.sh >> /var/log/daily-report.log 2>&1

# Hourly incident investigation
0 * * * * npx tsx /www/ib-editor/my-app/script/cron-investigate.ts --once
```

## Troubleshooting

```bash
# OpenSearch connectivity
curl -s "http://opensearch:9200/_cluster/health" -u admin:Admin@123456 --insecure | jq

# PostgreSQL TI data
PGPASSWORD=postgres psql -h postgres -U postgres -d n8n -c "SELECT COUNT(*) FROM ioclog.bazaar_malware"

# Clear investigation cache
rm -f .cache/investigations.db

# MCP server health
curl http://20.41.120.173:8099/health  # OpenSearch MCP
curl http://20.41.120.173:8100/health  # Incident Analysis MCP

# View generated reports
ls -la public/reports/daily/
```

## Related Documentation

- `README_INVESTIGATION.md` - Investigation system details (7 AI analyzers)
- `README-DAILY-REPORT.md` - Daily report generation
- `CRON_SETUP.md` - Automated scheduling
- `MCP_SERVERS_MANUAL.md` - Comprehensive MCP integration guide (12 servers)
- `docs/OpenSearch_Index_List.md` - Index structure reference
