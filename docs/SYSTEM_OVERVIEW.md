# Incident Investigation System - Complete Overview

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Input Methods (4 ways)                    │
├──────────────┬──────────────┬──────────────┬─────────────────┤
│   MCP Tool   │  CLI Script  │  REST API    │  File Watcher   │
│   (Claude)   │   (Manual)   │   (HTTP)     │   (Auto)        │
└──────┬───────┴──────┬───────┴──────┬───────┴─────────┬───────┘
       │              │              │                 │
       └──────────────┴──────────────┴─────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  Core Investigation Engine                   │
├─────────────────────────────────────────────────────────────┤
│  1. OpenSearch Query (7 indices)                            │
│  2. TI Correlation (PostgreSQL)                             │
│  3. Parallel AI Analysis (7 categories)                     │
│  4. Result Storage (JSON + Markdown)                        │
└──────────────┬──────────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────┐
│                     Output Artifacts                         │
├──────────────┬──────────────┬──────────────────────────────┤
│     JSON     │   Markdown   │    AI Analysis Summary       │
│ (Full Data)  │  (Report)    │  (Verdict + Risk Score)      │
└──────────────┴──────────────┴──────────────────────────────┘
```

## System Components

### 1. MCP Tool (`nl-query-mcp.js`)
**Purpose**: Claude Code integration for interactive investigations

**Features**:
- Natural language query support
- Investigation mode for detailed analysis
- Real-time progress feedback
- Integrated with Claude UI

**Usage**:
```javascript
// From Claude Code
"Investigate incident 414186"
```

**Output**: Markdown report + JSON path displayed in Claude

---

### 2. CLI Script (`investigate-incident-cli.ts`)
**Purpose**: Manual command-line investigations

**Features**:
- Single incident investigation
- Batch processing from file
- Auto-discovery of new incidents
- Cache management (--force flag)

**Usage**:
```bash
# Single incident
npx tsx script/investigate-incident-cli.ts --incident-id 414186

# Batch processing
npx tsx script/investigate-incident-cli.ts --batch incidents.txt

# Auto-discover new incidents
npx tsx script/investigate-incident-cli.ts --auto-new --since 24h

# Force re-investigation
npx tsx script/investigate-incident-cli.ts --incident-id 414186 --force
```

**Output**: Console progress + JSON + Markdown files

---

### 3. REST API (`app/api/investigate/route.ts`)
**Purpose**: HTTP API for programmatic access

**Endpoints**:

**POST /api/investigate** - Start investigation
```json
{
  "incident_id": "414186",
  "force": false,
  "async": false
}
```

**GET /api/investigate?job_id={id}** - Check job status
```json
{
  "job_id": "uuid",
  "status": "running",
  "progress": 50
}
```

**DELETE /api/investigate?job_id={id}** - Cancel job

**Modes**:
- **Sync**: Returns results immediately (max 2 min)
- **Async**: Returns job ID, poll for results

**Usage**:
```bash
# Sync mode
curl -X POST http://localhost:3000/api/investigate \
  -H "Content-Type: application/json" \
  -d '{"incident_id": "414186"}'

# Async mode
curl -X POST http://localhost:3000/api/investigate \
  -H "Content-Type: application/json" \
  -d '{"incident_id": "414186", "async": true}'
```

**Output**: JSON response with investigation data

---

### 4. Cron Job (`cron-investigate.ts`)
**Purpose**: Automatic periodic investigations

**Features**:
- Time-based triggering (configurable interval)
- Auto-discovery of new incidents
- State persistence (tracks last run)
- Duplicate prevention
- Rate limiting

**Configuration**:
```bash
CRON_INTERVAL=60         # Run every 60 minutes
CRON_LOOKBACK=24h        # Look for incidents in last 24h
CRON_MAX_INCIDENTS=10    # Process max 10 per run
```

**Usage**:
```bash
# Run once (testing)
npx tsx script/cron-investigate.ts --once

# Run continuously
npx tsx script/cron-investigate.ts

# Via systemd (production)
sudo systemctl start incident-investigation

# Via crontab
0 * * * * /www/ib-editor/my-app/script/cron-investigate.sh --once
```

**Output**: Console logs + JSON + Markdown files + State file

---

### 5. File Watcher (`watch-incidents.ts`)
**Purpose**: Event-driven investigations triggered by file creation

**Features**:
- Real-time file system monitoring
- Debouncing (prevents duplicate triggers)
- Auto-cleanup (deletes processed files)
- Retry on failure
- Supports multiple incident IDs per file

**Watch Directory**: `./data/watch/`

**File Formats**:
- **Filename pattern**: `incident-414186.txt`
- **Content**: Just the incident ID on first line

**Usage**:
```bash
# Start watcher
npx tsx script/watch-incidents.ts

# Via systemd
sudo systemctl start incident-watcher

# Trigger investigation (create file)
echo "414186" > data/watch/incident-414186.txt
```

**Output**: Console logs + JSON + Markdown files + Auto-deletes trigger file

---

## Investigation Pipeline

### Stage 1: OpenSearch Query
**Data Sources** (7 indices):
1. `logs-cortex_xdr-incidents-*` - Incident metadata
2. `logs-cortex_xdr-alerts-*` - Related alerts
3. `logs-cortex_xdr-file-*` - File artifacts
4. `logs-cortex_xdr-network-*` - Network connections
5. `logs-cortex_xdr-process-*` - Process artifacts
6. `logs-cortex_xdr-endpoints-*` - Affected endpoints
7. `logs-cortex_xdr-va-cves-*` - CVE vulnerabilities

**Query Strategy**:
- Incident ID matching (`incident_id.keyword`)
- Exact + Fuzzy CVE matching (hostname-based)
- Time-sorted results (most recent first)
- Size limits (100-200 docs per index)

**Output**: Raw investigation data (~140KB JSON)

---

### Stage 2: TI Correlation
**Data Sources** (PostgreSQL `ioclog` schema):
1. `ioclog.ioc_simple` - File hashes + IP addresses
2. `ioclog.ti_mitre` - MITRE ATT&CK techniques
3. `ioclog.ti_cve` - CVE details

**Correlation Logic**:
- File hashes: SHA256 exact match → Verdict (threat/unknown/benign)
- IP addresses: IP exact match → Verdict + GeoIP
- MITRE: Technique ID extraction → Full technique details
- CVE: CVE ID lookup → CVSS scores + descriptions

**Verdict Classification**:
- **Threat**: `threat_level >= 50`
- **Unknown**: `1 <= threat_level < 50`
- **Benign**: `threat_level == 0`

**Output**: Enhanced investigation data with TI context

---

### Stage 3: Parallel AI Analysis
**Architecture**: 6 parallel analyzers + 1 synthesizer

**Analyzers**:
1. **Analyst Verifier** - Validates analyst's judgment
2. **File Hash Analyzer** - Assesses file threats
3. **Network Analyzer** - Analyzes network behavior
4. **MITRE Analyzer** - Evaluates ATT&CK techniques
5. **CVE Analyzer** - Validates vulnerabilities
6. **Endpoint Analyzer** - Assesses endpoint risks

**AI Model**: Azure OpenAI `gpt-4o-mini`

**Token Optimization**:
- Data filtering per category (~68% reduction)
- Estimated: 47K → 15K tokens
- Max tokens per analyzer: 500-700
- Synthesis max tokens: 1000

**Execution**:
```typescript
// Parallel execution (6 analyzers)
const [analyst, file, network, mitre, cve, endpoint] = await Promise.all([
  verifyAnalystJudgment(data),
  analyzeFileHashes(data),
  analyzeNetwork(data),
  analyzeMITRE(data),
  analyzeCVEs(data),
  analyzeEndpoints(data)
]);

// Sequential synthesis
const synthesis = await synthesizeAnalyses(incidentId, {
  analyst, file, network, mitre, cve, endpoint
});
```

**Output Structure**:
```json
{
  "final_verdict": "true_positive|false_positive|benign|needs_investigation",
  "overall_risk_score": 0-100,
  "confidence": 0.0-1.0,
  "executive_summary": "...",
  "key_findings": ["finding1", "finding2"],
  "recommendations": ["action1", "action2"],
  "reasoning": "..."
}
```

**Performance**:
- Execution time: 5-10 seconds
- Token usage: ~15K tokens (~$0.02 per incident)
- Speed improvement: 3-5x vs sequential

---

### Stage 4: Result Storage
**File Locations**: `./data/investigations/`

**Files**:
1. **JSON**: `incident_{id}_{timestamp}.json` (~140KB)
   - Complete investigation data
   - TI correlation results
   - AI analysis results
   - Full artifact lists

2. **Markdown**: `incident_{id}_{timestamp}.md` (~50KB)
   - Human-readable report
   - AI verdict + risk score
   - Threat summaries
   - Recommendations

**Caching**:
- Automatic cache lookup (by incident ID)
- `--force` flag bypasses cache
- Latest investigation file used for cache hits

---

## Performance Metrics

### Investigation Speed
| Stage | Time | Notes |
|-------|------|-------|
| OpenSearch Query | 2-4s | 7 parallel queries |
| TI Correlation | 1-2s | PostgreSQL queries |
| AI Analysis | 5-10s | 6 parallel + synthesis |
| **Total** | **8-16s** | End-to-end |

### Token Usage
| Component | Tokens | Cost (gpt-4o-mini) |
|-----------|--------|---------------------|
| Analyst Verification | ~500 | $0.0001 |
| File Hash Analysis | ~700 | $0.0001 |
| Network Analysis | ~600 | $0.0001 |
| MITRE Analysis | ~600 | $0.0001 |
| CVE Analysis | ~700 | $0.0001 |
| Endpoint Analysis | ~600 | $0.0001 |
| Synthesis | ~1000 | $0.0002 |
| **Total** | **~5.2K** | **~$0.001** |

*(Note: Actual token counts may vary based on data size)*

### Storage
| File | Size | Retention |
|------|------|-----------|
| JSON | ~140KB | Unlimited |
| Markdown | ~50KB | Unlimited |
| State | ~1KB | Persistent |

**Estimated Daily Storage** (10 incidents/day):
- JSON: 1.4 MB/day → 42 MB/month → 504 MB/year
- Markdown: 500 KB/day → 15 MB/month → 180 MB/year

---

## Deployment Scenarios

### Scenario 1: Development (Interactive)
```bash
# Use Claude Code MCP tool
"Investigate incident 414186"

# Or CLI for testing
npx tsx script/investigate-incident-cli.ts --incident-id 414186
```

**Best for**: Ad-hoc investigations, testing, exploration

---

### Scenario 2: Production (Automated)
```bash
# Deploy cron job (systemd)
sudo systemctl enable incident-investigation
sudo systemctl start incident-investigation

# Monitor logs
sudo journalctl -u incident-investigation -f
```

**Best for**: 24/7 automated monitoring, scheduled investigations

---

### Scenario 3: Integration (API)
```python
import requests

# Trigger investigation via API
response = requests.post('http://siem.example.com/api/investigate', json={
    'incident_id': '414186',
    'async': True
})

job_id = response.json()['job_id']

# Poll for results
while True:
    status = requests.get(f'http://siem.example.com/api/investigate?job_id={job_id}')
    if status.json()['status'] == 'completed':
        break
```

**Best for**: Third-party integrations, SOAR platforms, custom dashboards

---

### Scenario 4: Event-Driven (Watcher)
```bash
# Start file watcher
npx tsx script/watch-incidents.ts

# External system drops file
echo "414186" > /path/to/watch/incident-414186.txt

# Investigation triggers automatically
```

**Best for**: Integration with ticketing systems, SIEM exports, file-based triggers

---

## Security Considerations

### Authentication
- **API**: Add Bearer token authentication in production
- **Files**: Restrict watch directory permissions (700)
- **Database**: Use read-only credentials for OpenSearch/PostgreSQL

### Secrets Management
- Store credentials in `.env.local` (never commit)
- Use environment variables for production
- Rotate API keys regularly

### Network Security
- Restrict OpenSearch access (firewall rules)
- Use HTTPS for REST API in production
- VPN/bastion for remote access

---

## Troubleshooting Guide

### Common Issues

**1. "Investigation failed: Incident not found"**
```bash
# Verify incident exists in OpenSearch
curl -u admin:pass "http://opensearch:9200/logs-cortex_xdr-incidents-*/_search?q=incident_id:414186"
```

**2. "TI correlation returned no results"**
```bash
# Check PostgreSQL connection
psql -U postgres -h localhost -d ioclog -c "SELECT COUNT(*) FROM ioclog.ioc_simple;"
```

**3. "AI analysis failed: Rate limit exceeded"**
```bash
# Check Azure OpenAI quota
# Reduce CRON_MAX_INCIDENTS or increase interval
```

**4. "Disk full error"**
```bash
# Clean up old investigations
find data/investigations/ -name "*.json" -mtime +30 -delete
```

---

## Future Enhancements

### Phase 4: Advanced Features
1. **Real-time Dashboard** - Live investigation status
2. **Webhooks** - Notification on investigation complete
3. **Metrics Export** - Prometheus/Grafana integration
4. **Report Templates** - Customizable output formats
5. **Multi-tenant Support** - Per-tenant investigation queues
6. **Investigation History** - Timeline view of all investigations
7. **Bulk Operations** - Investigate multiple incidents in parallel
8. **Smart Scheduling** - ML-based priority queuing

### Phase 5: Optimization
1. **Redis Caching** - Cache TI lookups
2. **Database Connection Pooling** - Faster PostgreSQL queries
3. **Async Workers** - Bull/BullMQ job queue
4. **Horizontal Scaling** - Multiple investigation workers
5. **Incremental Updates** - Only fetch new data since last run

---

## Quick Reference

### File Structure
```
/www/ib-editor/my-app/
├── script/
│   ├── opensearch-executor.ts       # OpenSearch queries
│   ├── ti-correlator.ts             # TI database queries
│   ├── investigation-cache.ts       # File storage
│   ├── ai-data-filter.ts            # Token optimization
│   ├── ai-parallel-analyzer.ts      # AI orchestration
│   ├── ai-analyzers/                # 7 AI analyzers
│   ├── markdown-formatter.ts        # Report generation
│   ├── investigate-incident-cli.ts  # CLI tool
│   ├── cron-investigate.ts          # Cron job
│   ├── watch-incidents.ts           # File watcher
│   └── nl-query-mcp.js              # MCP server
├── app/api/investigate/
│   └── route.ts                     # REST API
├── data/
│   ├── investigations/              # Output files
│   ├── watch/                       # Watch directory
│   └── cron-state.json              # Cron state
└── docs/
    ├── SYSTEM_OVERVIEW.md           # This file
    ├── API_USAGE.md                 # API documentation
    └── CRON_SETUP.md                # Cron setup guide
```

### Environment Variables
```bash
# OpenSearch
OPENSEARCH_URL=http://opensearch:9200
OPENSEARCH_USER=admin
OPENSEARCH_PASSWORD=Admin@123456

# PostgreSQL (TI)
DATABASE_URL=postgresql://user:pass@localhost:5432/ioclog

# Azure OpenAI
AZURE_OPENAI_API_KEY=...
AZURE_OPENAI_ENDPOINT=https://....openai.azure.com/
AZURE_OPENAI_DEPLOYMENT=gpt-4o-mini

# Cron Configuration
CRON_INTERVAL=60
CRON_LOOKBACK=24h
CRON_MAX_INCIDENTS=10

# File Watcher
WATCH_DIR=./data/watch
WATCH_PATTERN=.txt
WATCH_DEBOUNCE=1000
```

### Quick Start Commands
```bash
# Test single investigation
npx tsx script/investigate-incident-cli.ts --incident-id 414186

# Start REST API (Next.js dev server)
npm run dev

# Start cron job (foreground)
npx tsx script/cron-investigate.ts

# Start file watcher
npx tsx script/watch-incidents.ts

# View results
cat data/investigations/incident_414186_*.md
```
