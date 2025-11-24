# my-app 개발 가이드

보안 인시던트 분석 플랫폼 개발을 위한 완전한 가이드입니다.

## 목차

1. [개발 환경 설정](#개발-환경-설정)
2. [프로젝트 구조](#프로젝트-구조)
3. [컴포넌트 개발](#컴포넌트-개발)
4. [API 라우트 개발](#api-라우트-개발)
5. [스크립트 개발](#스크립트-개발)
6. [데이터베이스 작업](#데이터베이스-작업)
7. [AI 통합](#ai-통합)
8. [테스팅](#테스팅)
9. [디버깅](#디버깅)
10. [베스트 프랙티스](#베스트-프랙티스)

---

## 개발 환경 설정

### 필수 요구사항

```bash
# Node.js & npm
node --version  # v18.0.0+
npm --version   # v9.0.0+

# Git
git --version   # v2.30.0+

# Optional (recommended)
tsx --version   # TypeScript execution
jq --version    # JSON processing
```

### 초기 설정

```bash
# 1. 저장소 클론 (이미 완료됨)
cd /www/ib-editor/my-app

# 2. 의존성 설치 (CRITICAL: npm만 사용)
npm install

# 3. 환경 변수 설정
cp .env.example .env.local  # (if exists)
# 또는 .env.local 파일 생성 (아래 참조)

# 4. 데이터베이스 연결 확인
./test/quick-test.sh

# 5. 개발 서버 시작
npm run dev
```

### 환경 변수 설정 (.env.local)

```bash
# ===== OpenSearch (Remote - Required) =====
OPENSEARCH_URL=http://opensearch:9200
OPENSEARCH_USER=admin
OPENSEARCH_PASSWORD=Admin@123456

# ===== PostgreSQL (Remote - TI Database) =====
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/n8n?schema=ioclog

# ===== AI Models (Primary: Azure OpenAI) =====
AZURE_OPENAI_API_KEY=your_azure_key_here
AZURE_OPENAI_ENDPOINT=https://etech-openai.openai.azure.com/
AZURE_OPENAI_DEPLOYMENT=gpt-4o-mini
AZURE_OPENAI_API_VERSION=2024-02-15-preview

# Google Gemini (Alternative)
GOOGLE_GENERATIVE_AI_API_KEY=your_gemini_key_here
GEMINI_API_KEY=your_gemini_key_here

# Anthropic Claude (Optional)
ANTHROPIC_API_KEY=your_claude_key_here

# ===== OAuth Providers (Optional) =====
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

NAVER_CLIENT_ID=...
NAVER_CLIENT_SECRET=...

# ===== NextAuth =====
NEXTAUTH_SECRET=your_secret_here  # openssl rand -base64 32
NEXTAUTH_URL=http://localhost:40017

# ===== Supabase (Optional - Notifications) =====
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

### IDE 설정

#### VS Code (권장)

```json
// .vscode/settings.json
{
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true,
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[typescriptreact]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "files.associations": {
    "*.css": "tailwindcss"
  },
  "tailwindCSS.experimental.classRegex": [
    ["cva\\(([^)]*)\\)", "[\"'`]([^\"'`]*).*?[\"'`]"]
  ]
}
```

#### 권장 VS Code 확장

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "unifiedjs.vscode-mdx",
    "ms-vscode.vscode-typescript-next"
  ]
}
```

---

## 프로젝트 구조

### 디렉토리 구조 상세

```
/www/ib-editor/my-app/
│
├── app/                                # Next.js 16 App Router
│   ├── layout.tsx                      # Root layout (theme provider)
│   ├── page.tsx                        # Landing page
│   ├── admin/                          # Admin section
│   │   ├── layout.tsx                  # Admin layout (sidebar)
│   │   ├── page.tsx                    # Admin dashboard
│   │   └── dashboard/
│   │       └── page.tsx                # Full dashboard (16 widgets)
│   ├── login/
│   │   └── page.tsx                    # Login page
│   └── signup/
│       └── page.tsx                    # Signup page
│
├── components/                         # React components
│   ├── ui/                             # shadcn/ui primitives
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   ├── dialog.tsx
│   │   ├── table.tsx
│   │   └── [50+ more components]
│   │
│   ├── blocks/                         # Dashboard blocks
│   │   └── dashboard-01/
│   │       ├── app-sidebar.tsx
│   │       ├── chart-*.tsx
│   │       └── [widgets]
│   │
│   ├── app-sidebar.tsx                 # Main sidebar
│   ├── login-form.tsx                  # Login form
│   ├── signup-form.tsx                 # Signup form
│   ├── dashboard-grid-layout.tsx       # Responsive grid
│   └── theme-provider.tsx              # Theme context
│
├── lib/                                # Utilities
│   └── utils.ts                        # cn() helper
│
├── hooks/                              # Custom React hooks
│   └── [custom hooks]
│
├── script/                             # Backend scripts (47+)
│   ├── nl-query-parser.ts              # NL → OpenSearch DSL
│   ├── ai-parallel-analyzer.ts         # AI orchestrator
│   ├── investigate-incident-cli.ts     # CLI investigation
│   ├── collect-daily-incidents-data.ts # Daily data collection
│   └── [43+ more scripts]
│
├── test/                               # Test suite
│   ├── quick-test.sh
│   ├── test-azure.sh
│   └── [10+ test scripts]
│
├── public/                             # Static files
│   ├── reports/                        # Generated reports
│   └── assets/
│
├── data/                               # Data files
│   └── data.csv                        # Sample incident IDs
│
├── docs/                               # Documentation
│   └── OpenSearch_Index_List.md
│
├── Configuration
│   ├── .mcp.json                       # MCP servers (12)
│   ├── .env.local                      # Environment variables
│   ├── next.config.ts                  # Next.js config
│   ├── tsconfig.json                   # TypeScript config
│   ├── tailwind.config.js              # Tailwind CSS 4
│   ├── components.json                 # shadcn/ui config
│   ├── package.json                    # Dependencies
│   └── eslint.config.mjs               # ESLint rules
│
└── Documentation
    ├── CLAUDE.md
    ├── README-ARCHITECTURE.md          # 이 문서
    ├── README-DEVELOPMENT.md           # 개발 가이드
    └── [8+ more docs]
```

### Path Alias 사용

```typescript
// tsconfig.json에 정의된 경로 별칭

// ❌ Bad (상대 경로)
import { Button } from '../../../components/ui/button'
import { cn } from '../../../lib/utils'

// ✅ Good (절대 경로)
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// 사용 가능한 별칭:
// @/components → /www/ib-editor/my-app/components
// @/lib → /www/ib-editor/my-app/lib
// @/hooks → /www/ib-editor/my-app/hooks
// @/app → /www/ib-editor/my-app/app
```

---

## 컴포넌트 개발

### shadcn/ui 컴포넌트 추가

```bash
# 1. shadcn CLI로 컴포넌트 추가
npx shadcn@latest add [component-name]

# 예시:
npx shadcn@latest add dropdown-menu
npx shadcn@latest add tooltip
npx shadcn@latest add avatar

# 2. 컴포넌트는 components/ui/에 자동 생성됨
# 3. 필요시 커스터마이징
```

### 새 UI 컴포넌트 생성

```typescript
// components/ui/status-badge.tsx
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

interface StatusBadgeProps {
  status: 'critical' | 'high' | 'medium' | 'low'
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const variants = {
    critical: 'bg-red-500 text-white hover:bg-red-600',
    high: 'bg-orange-500 text-white hover:bg-orange-600',
    medium: 'bg-yellow-500 text-black hover:bg-yellow-600',
    low: 'bg-blue-500 text-white hover:bg-blue-600'
  }

  return (
    <Badge className={cn(variants[status], className)}>
      {status.toUpperCase()}
    </Badge>
  )
}
```

### 페이지 컴포넌트 생성

```typescript
// app/incidents/page.tsx
import { Suspense } from 'react'
import { IncidentTable } from '@/components/incident-table'
import { IncidentFilters } from '@/components/incident-filters'

export default async function IncidentsPage() {
  // Server Component - can fetch data directly
  const incidents = await fetchIncidents()

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">Security Incidents</h1>

      <IncidentFilters />

      <Suspense fallback={<IncidentTableSkeleton />}>
        <IncidentTable incidents={incidents} />
      </Suspense>
    </div>
  )
}

async function fetchIncidents() {
  // OpenSearch query
  const { Client } = await import('@opensearch-project/opensearch')
  const client = new Client({
    node: process.env.OPENSEARCH_URL,
    auth: {
      username: process.env.OPENSEARCH_USER!,
      password: process.env.OPENSEARCH_PASSWORD!
    }
  })

  const result = await client.search({
    index: 'logs-cortex_xdr-incidents-*',
    body: {
      query: { match_all: {} },
      size: 100,
      sort: [{ creation_time: 'desc' }]
    }
  })

  return result.body.hits.hits.map((hit: any) => hit._source)
}
```

### Client Component (Interactive)

```typescript
// components/incident-table.tsx
'use client'

import { useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { StatusBadge } from '@/components/ui/status-badge'

interface IncidentTableProps {
  incidents: Incident[]
}

export function IncidentTable({ incidents }: IncidentTableProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null)

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Incident ID</TableHead>
          <TableHead>Severity</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Created</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {incidents.map((incident) => (
          <TableRow
            key={incident.incident_id}
            onClick={() => setSelectedId(incident.incident_id)}
            className="cursor-pointer hover:bg-muted"
          >
            <TableCell className="font-mono">
              {incident.incident_id}
            </TableCell>
            <TableCell>
              <StatusBadge status={incident.severity} />
            </TableCell>
            <TableCell>{incident.status}</TableCell>
            <TableCell>
              {new Date(incident.creation_time).toLocaleDateString()}
            </TableCell>
            <TableCell>
              <Button variant="outline" size="sm">
                Investigate
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
```

### 차트 컴포넌트

```typescript
// components/severity-chart.tsx
'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface SeverityChartProps {
  data: Array<{ name: string; value: number }>
}

const COLORS = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#3b82f6'
}

export function SeverityChart({ data }: SeverityChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Incidents by Severity</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={80}
              label
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[entry.name as keyof typeof COLORS]}
                />
              ))}
            </Pie>
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
```

---

## API 라우트 개발

### REST API 엔드포인트 생성

```typescript
// app/api/incidents/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { Client } from '@opensearch-project/opensearch'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const client = new Client({
      node: process.env.OPENSEARCH_URL!,
      auth: {
        username: process.env.OPENSEARCH_USER!,
        password: process.env.OPENSEARCH_PASSWORD!
      },
      ssl: { rejectUnauthorized: false }
    })

    const result = await client.search({
      index: 'logs-cortex_xdr-incidents-*',
      body: {
        query: {
          term: { 'incident_id.keyword': params.id }
        }
      }
    })

    if (result.body.hits.hits.length === 0) {
      return NextResponse.json(
        { error: 'Incident not found' },
        { status: 404 }
      )
    }

    const incident = result.body.hits.hits[0]._source

    return NextResponse.json({ data: incident })
  } catch (error) {
    console.error('Error fetching incident:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

### 인시던트 조사 API

```typescript
// app/api/investigate/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { investigateIncident } from '@/script/investigate-incident-cli'

// POST /api/investigate
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { incident_id, mode = 'sync' } = body

    if (!incident_id) {
      return NextResponse.json(
        { error: 'incident_id is required' },
        { status: 400 }
      )
    }

    if (mode === 'async') {
      // Async mode: Start investigation in background
      const jobId = `job-${Date.now()}-${incident_id}`

      // Store job in database or memory
      // Start investigation in background (don't await)
      investigateIncident(incident_id).catch(console.error)

      return NextResponse.json({
        job_id: jobId,
        status: 'started',
        message: 'Investigation started in background'
      })
    } else {
      // Sync mode: Wait for investigation to complete
      const result = await investigateIncident(incident_id)

      return NextResponse.json({
        status: 'completed',
        result: result
      })
    }
  } catch (error) {
    console.error('Investigation error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// GET /api/investigate?job_id=xxx
export async function GET(request: NextRequest) {
  const jobId = request.nextUrl.searchParams.get('job_id')

  if (!jobId) {
    return NextResponse.json(
      { error: 'job_id is required' },
      { status: 400 }
    )
  }

  // Lookup job status from database/memory
  // const job = await getJobStatus(jobId)

  return NextResponse.json({
    job_id: jobId,
    status: 'in_progress', // or 'completed', 'failed'
    progress: 60
  })
}
```

### AI 분석 API

```typescript
// app/api/analyze/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { analyzeIncidentParallel } from '@/script/ai-parallel-analyzer'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { incident_data } = body

    if (!incident_data) {
      return NextResponse.json(
        { error: 'incident_data is required' },
        { status: 400 }
      )
    }

    // Run parallel AI analysis
    const analysis = await analyzeIncidentParallel(incident_data)

    return NextResponse.json({
      status: 'success',
      analysis: analysis
    })
  } catch (error) {
    console.error('AI analysis error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
```

---

## 스크립트 개발

### CLI 스크립트 작성

```typescript
// script/my-custom-script.ts
import { Client } from '@opensearch-project/opensearch'
import { Pool } from 'pg'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

interface ScriptOptions {
  incidentId?: string
  dateRange?: { from: string; to: string }
  verbose?: boolean
}

async function main(options: ScriptOptions) {
  console.log('Starting custom script...')

  // OpenSearch client
  const osClient = new Client({
    node: process.env.OPENSEARCH_URL!,
    auth: {
      username: process.env.OPENSEARCH_USER!,
      password: process.env.OPENSEARCH_PASSWORD!
    },
    ssl: { rejectUnauthorized: false }
  })

  // PostgreSQL client
  const pgPool = new Pool({
    connectionString: process.env.DATABASE_URL
  })

  try {
    // Your logic here
    if (options.incidentId) {
      await processIncident(osClient, pgPool, options.incidentId)
    }

    console.log('Script completed successfully')
  } catch (error) {
    console.error('Script error:', error)
    process.exit(1)
  } finally {
    await pgPool.end()
  }
}

async function processIncident(
  osClient: Client,
  pgPool: Pool,
  incidentId: string
) {
  // OpenSearch query
  const osResult = await osClient.search({
    index: 'logs-cortex_xdr-incidents-*',
    body: {
      query: {
        term: { 'incident_id.keyword': incidentId }
      }
    }
  })

  const incident = osResult.body.hits.hits[0]?._source

  if (!incident) {
    throw new Error(`Incident ${incidentId} not found`)
  }

  // PostgreSQL query
  const pgResult = await pgPool.query(
    'SELECT * FROM ioclog.ioc_log WHERE hash = $1',
    [incident.file_sha256]
  )

  console.log('Incident:', incident)
  console.log('TI Data:', pgResult.rows)
}

// Parse CLI arguments
const args = process.argv.slice(2)
const options: ScriptOptions = {
  verbose: args.includes('--verbose')
}

// --incident-id
const incidentIdIndex = args.indexOf('--incident-id')
if (incidentIdIndex !== -1) {
  options.incidentId = args[incidentIdIndex + 1]
}

// Run
main(options)
```

### Shell Wrapper 스크립트

```bash
#!/bin/bash
# script/my-custom-script.sh

set -e  # Exit on error

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_ROOT"

# Load environment variables
if [ -f .env.local ]; then
  export $(grep -v '^#' .env.local | xargs)
fi

# Check required environment variables
if [ -z "$OPENSEARCH_URL" ]; then
  echo "Error: OPENSEARCH_URL not set"
  exit 1
fi

# Run TypeScript script
echo "Running custom script..."
npx tsx "$SCRIPT_DIR/my-custom-script.ts" "$@"

echo "Script completed"
```

### 데이터 수집 스크립트 예시

```typescript
// script/collect-threat-data.ts
import { Client } from '@opensearch-project/opensearch'
import { Pool } from 'pg'
import * as fs from 'fs/promises'
import * as path from 'path'

interface ThreatData {
  date: string
  incidents: any[]
  threatFiles: any[]
  mitreAnalysis: any[]
}

async function collectThreatData(date: string): Promise<ThreatData> {
  const osClient = new Client({
    node: process.env.OPENSEARCH_URL!,
    auth: {
      username: process.env.OPENSEARCH_USER!,
      password: process.env.OPENSEARCH_PASSWORD!
    },
    ssl: { rejectUnauthorized: false }
  })

  const pgPool = new Pool({
    connectionString: process.env.DATABASE_URL
  })

  try {
    // 1. Collect incidents from OpenSearch
    const incidents = await collectIncidents(osClient, date)

    // 2. Collect threat file data from PostgreSQL
    const threatFiles = await collectThreatFiles(pgPool, incidents)

    // 3. Analyze MITRE techniques
    const mitreAnalysis = await analyzeMitreTechniques(pgPool, incidents)

    return {
      date,
      incidents,
      threatFiles,
      mitreAnalysis
    }
  } finally {
    await pgPool.end()
  }
}

async function collectIncidents(client: Client, date: string) {
  const result = await client.search({
    index: 'logs-cortex_xdr-incidents-*',
    body: {
      query: {
        range: {
          creation_time: {
            gte: `${date}T00:00:00Z`,
            lte: `${date}T23:59:59Z`
          }
        }
      },
      size: 10000
    }
  })

  return result.body.hits.hits.map((hit: any) => hit._source)
}

async function collectThreatFiles(pool: Pool, incidents: any[]) {
  const hashes = incidents
    .flatMap(i => i.file_artifacts || [])
    .map(f => f.file_sha256)
    .filter(Boolean)

  if (hashes.length === 0) return []

  const result = await pool.query(
    `SELECT * FROM ioclog.bazaar_malware
     WHERE sha256 = ANY($1)`,
    [hashes]
  )

  return result.rows
}

async function analyzeMitreTechniques(pool: Pool, incidents: any[]) {
  const techniques = incidents
    .flatMap(i => i.mitre_techniques || [])
    .filter(Boolean)

  if (techniques.length === 0) return []

  const result = await pool.query(
    `SELECT technique_id, technique_name, tactic, COUNT(*) as count
     FROM ioclog.ti_mitre
     WHERE technique_id = ANY($1)
     GROUP BY technique_id, technique_name, tactic
     ORDER BY count DESC`,
    [techniques]
  )

  return result.rows
}

// Main execution
const date = process.argv[2] || new Date().toISOString().split('T')[0]

collectThreatData(date)
  .then(async (data) => {
    const outputPath = path.join(
      __dirname,
      '../public/reports/data',
      `threat_data_${date}.json`
    )

    await fs.writeFile(outputPath, JSON.stringify(data, null, 2))
    console.log(`Threat data saved to ${outputPath}`)
  })
  .catch((error) => {
    console.error('Error collecting threat data:', error)
    process.exit(1)
  })
```

---

## 데이터베이스 작업

### OpenSearch 쿼리 패턴

```typescript
// lib/opensearch-queries.ts
import { Client } from '@opensearch-project/opensearch'

export function createOpenSearchClient() {
  return new Client({
    node: process.env.OPENSEARCH_URL!,
    auth: {
      username: process.env.OPENSEARCH_USER!,
      password: process.env.OPENSEARCH_PASSWORD!
    },
    ssl: { rejectUnauthorized: false }
  })
}

// Search by incident ID
export async function getIncidentById(incidentId: string) {
  const client = createOpenSearchClient()

  const result = await client.search({
    index: 'logs-cortex_xdr-incidents-*',
    body: {
      query: {
        term: { 'incident_id.keyword': incidentId }
      }
    }
  })

  return result.body.hits.hits[0]?._source
}

// Search with filters
export async function searchIncidents(filters: {
  severity?: string[]
  status?: string[]
  dateFrom?: string
  dateTo?: string
}) {
  const client = createOpenSearchClient()

  const must: any[] = []

  if (filters.severity && filters.severity.length > 0) {
    must.push({
      terms: { 'severity.keyword': filters.severity }
    })
  }

  if (filters.status && filters.status.length > 0) {
    must.push({
      terms: { 'status.keyword': filters.status }
    })
  }

  if (filters.dateFrom || filters.dateTo) {
    const range: any = {}
    if (filters.dateFrom) range.gte = filters.dateFrom
    if (filters.dateTo) range.lte = filters.dateTo

    must.push({
      range: { creation_time: range }
    })
  }

  const result = await client.search({
    index: 'logs-cortex_xdr-incidents-*',
    body: {
      query: {
        bool: { must }
      },
      size: 100,
      sort: [{ creation_time: 'desc' }]
    }
  })

  return result.body.hits.hits.map((hit: any) => hit._source)
}

// Aggregation query
export async function getIncidentStats(dateRange: {
  from: string
  to: string
}) {
  const client = createOpenSearchClient()

  const result = await client.search({
    index: 'logs-cortex_xdr-incidents-*',
    body: {
      query: {
        range: {
          creation_time: {
            gte: dateRange.from,
            lte: dateRange.to
          }
        }
      },
      size: 0,
      aggs: {
        by_severity: {
          terms: { field: 'severity.keyword' }
        },
        by_status: {
          terms: { field: 'status.keyword' }
        },
        by_day: {
          date_histogram: {
            field: 'creation_time',
            calendar_interval: 'day'
          }
        }
      }
    }
  })

  return {
    total: result.body.hits.total.value,
    by_severity: result.body.aggregations.by_severity.buckets,
    by_status: result.body.aggregations.by_status.buckets,
    by_day: result.body.aggregations.by_day.buckets
  }
}
```

### PostgreSQL 쿼리 패턴

```typescript
// lib/postgres-queries.ts
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
})

// Get threat intelligence for file hash
export async function getThreatIntel(hash: string) {
  const result = await pool.query(
    `SELECT * FROM ioclog.ioc_log WHERE hash = $1`,
    [hash]
  )

  return result.rows[0]
}

// Check if hash is benign (NSRL)
export async function isBenignHash(hash: string) {
  const result = await pool.query(
    `SELECT EXISTS(
      SELECT 1 FROM ioclog.nsrl_hashes WHERE sha256 = $1
    )`,
    [hash]
  )

  return result.rows[0].exists
}

// Get MITRE technique details
export async function getMitreTechnique(techniqueId: string) {
  const result = await pool.query(
    `SELECT * FROM ioclog.ti_mitre WHERE technique_id = $1`,
    [techniqueId]
  )

  return result.rows[0]
}

// Get CVE details
export async function getCVEDetails(cveId: string) {
  const result = await pool.query(
    `SELECT * FROM ioclog.cve_details WHERE cve_id = $1`,
    [cveId]
  )

  return result.rows[0]
}

// Get malware family for hash
export async function getMalwareFamily(hash: string) {
  const result = await pool.query(
    `SELECT * FROM ioclog.bazaar_malware
     WHERE sha256 = $1 OR md5 = $1`,
    [hash]
  )

  return result.rows[0]
}

// Batch query for multiple hashes
export async function getMalwareBatch(hashes: string[]) {
  if (hashes.length === 0) return []

  const result = await pool.query(
    `SELECT * FROM ioclog.bazaar_malware
     WHERE sha256 = ANY($1) OR md5 = ANY($1)`,
    [hashes]
  )

  return result.rows
}
```

---

## AI 통합

### Azure OpenAI 사용

```typescript
// lib/ai/azure-openai.ts
import { AzureOpenAI } from '@ai-sdk/azure'
import { generateText, streamText } from 'ai'

const azure = new AzureOpenAI({
  apiKey: process.env.AZURE_OPENAI_API_KEY!,
  endpoint: process.env.AZURE_OPENAI_ENDPOINT!,
  apiVersion: process.env.AZURE_OPENAI_API_VERSION!
})

export async function analyzeWithAI(prompt: string) {
  const result = await generateText({
    model: azure(process.env.AZURE_OPENAI_DEPLOYMENT!),
    prompt: prompt,
    temperature: 0.3,
    maxTokens: 2000
  })

  return result.text
}

export async function analyzeWithAIStreaming(prompt: string) {
  const result = await streamText({
    model: azure(process.env.AZURE_OPENAI_DEPLOYMENT!),
    prompt: prompt,
    temperature: 0.3
  })

  return result.textStream
}

// Structured output (JSON)
export async function analyzeWithStructuredOutput<T>(
  prompt: string,
  schema: any
): Promise<T> {
  const result = await generateText({
    model: azure(process.env.AZURE_OPENAI_DEPLOYMENT!),
    prompt: `${prompt}\n\nRespond with valid JSON matching this schema: ${JSON.stringify(schema)}`,
    temperature: 0.3,
    maxTokens: 2000
  })

  return JSON.parse(result.text)
}
```

### AI 분석기 개발

```typescript
// script/ai-analyzers/custom-analyzer.ts
import { analyzeWithStructuredOutput } from '@/lib/ai/azure-openai'

interface AnalysisResult {
  threat_level: 'critical' | 'high' | 'medium' | 'low'
  confidence: number
  findings: string[]
  recommendations: string[]
}

export async function analyzeCustomAspect(
  incidentData: any
): Promise<AnalysisResult> {
  const prompt = `
You are a cybersecurity analyst. Analyze the following incident data:

Incident ID: ${incidentData.incident_id}
Severity: ${incidentData.severity}
Description: ${incidentData.description}

File Artifacts:
${JSON.stringify(incidentData.file_artifacts, null, 2)}

Network Artifacts:
${JSON.stringify(incidentData.network_artifacts, null, 2)}

Provide analysis in JSON format:
{
  "threat_level": "critical|high|medium|low",
  "confidence": 0-100,
  "findings": ["finding1", "finding2", ...],
  "recommendations": ["rec1", "rec2", ...]
}
`

  const schema = {
    threat_level: 'string',
    confidence: 'number',
    findings: ['string'],
    recommendations: ['string']
  }

  return await analyzeWithStructuredOutput<AnalysisResult>(prompt, schema)
}
```

---

## 테스팅

### 단위 테스트

```typescript
// test/unit/nl-query-parser.test.ts
import { parseNaturalLanguageQuery } from '@/script/nl-query-parser'

describe('NL Query Parser', () => {
  test('should parse simple search query', () => {
    const result = parseNaturalLanguageQuery('Show me high severity incidents')

    expect(result).toMatchObject({
      queryType: 'search',
      dataType: 'incidents',
      filters: {
        severity: ['high']
      }
    })
  })

  test('should parse date range', () => {
    const result = parseNaturalLanguageQuery(
      'Find incidents from last 7 days'
    )

    expect(result.dateRange).toBeDefined()
    expect(result.dateRange.from).toBeDefined()
    expect(result.dateRange.to).toBeDefined()
  })

  test('should handle aggregation queries', () => {
    const result = parseNaturalLanguageQuery(
      'Count incidents by severity'
    )

    expect(result.queryType).toBe('aggregation')
    expect(result.aggregation).toMatchObject({
      field: 'severity',
      type: 'terms'
    })
  })
})
```

### 통합 테스트

```bash
#!/bin/bash
# test/integration/test-investigation-pipeline.sh

set -e

echo "Testing Investigation Pipeline..."

# 1. Test data collection
echo "1. Testing data collection..."
INCIDENT_ID="414186"
npx tsx script/opensearch-client.ts --incident-id $INCIDENT_ID --output /tmp/test-incident.json

if [ ! -f /tmp/test-incident.json ]; then
  echo "Error: Data collection failed"
  exit 1
fi

# 2. Test TI correlation
echo "2. Testing TI correlation..."
npx tsx script/ti-correlator.ts --input /tmp/test-incident.json --output /tmp/test-ti.json

# 3. Test AI analysis
echo "3. Testing AI analysis..."
npx tsx script/ai-parallel-analyzer.ts --input /tmp/test-ti.json --output /tmp/test-analysis.json

# 4. Test report generation
echo "4. Testing report generation..."
npx tsx script/generate-reports.ts --incident-id $INCIDENT_ID --analysis /tmp/test-analysis.json

echo "All tests passed!"
```

### API 테스트

```typescript
// test/api/investigate.test.ts
import { POST } from '@/app/api/investigate/route'
import { NextRequest } from 'next/server'

describe('POST /api/investigate', () => {
  test('should start investigation (sync mode)', async () => {
    const request = new NextRequest('http://localhost:40017/api/investigate', {
      method: 'POST',
      body: JSON.stringify({
        incident_id: '414186',
        mode: 'sync'
      })
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.status).toBe('completed')
    expect(data.result).toBeDefined()
  })

  test('should start investigation (async mode)', async () => {
    const request = new NextRequest('http://localhost:40017/api/investigate', {
      method: 'POST',
      body: JSON.stringify({
        incident_id: '414186',
        mode: 'async'
      })
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.status).toBe('started')
    expect(data.job_id).toBeDefined()
  })

  test('should return 400 if incident_id missing', async () => {
    const request = new NextRequest('http://localhost:40017/api/investigate', {
      method: 'POST',
      body: JSON.stringify({})
    })

    const response = await POST(request)

    expect(response.status).toBe(400)
  })
})
```

---

## 디버깅

### OpenSearch 쿼리 디버깅

```bash
# 1. 직접 쿼리 (curl)
curl -X GET "http://opensearch:9200/logs-cortex_xdr-incidents-*/_search" \
  -u admin:Admin@123456 \
  -H 'Content-Type: application/json' \
  -d '{
    "query": {"match_all": {}},
    "size": 1
  }' --insecure | jq .

# 2. 인덱스 목록 확인
curl -X GET "http://opensearch:9200/_cat/indices/logs-cortex*?v" \
  -u admin:Admin@123456 --insecure

# 3. 매핑 확인
curl -X GET "http://opensearch:9200/logs-cortex_xdr-incidents-*/_mapping" \
  -u admin:Admin@123456 --insecure | jq .
```

### PostgreSQL 디버깅

```bash
# Connect to database
PGPASSWORD=n8n123 psql -h postgres -U n8n -d n8n

# Check tables
\dt ioclog.*

# Check table schema
\d ioclog.ioc_log

# Sample query
SELECT * FROM ioclog.bazaar_malware LIMIT 5;

# Check record count
SELECT COUNT(*) FROM ioclog.bazaar_malware;
```

### Next.js 디버깅

```bash
# Development mode with verbose logging
NODE_OPTIONS='--inspect' npm run dev

# Check build errors
npm run build

# Check ESLint errors
npm run lint
```

### AI 디버깅

```bash
# Test Azure OpenAI connection
./test/test-azure.sh

# Test with verbose output
npx tsx script/ai-parallel-analyzer.ts --incident-id 414186 --verbose

# Check API rate limits
# Azure: 20 RPM → Max 3 requests per 10 seconds
```

---

## 베스트 프랙티스

### 코드 스타일

```typescript
// ✅ Good
export async function fetchIncident(id: string) {
  const client = createOpenSearchClient()

  try {
    const result = await client.search({
      index: 'logs-cortex_xdr-incidents-*',
      body: {
        query: {
          term: { 'incident_id.keyword': id }
        }
      }
    })

    return result.body.hits.hits[0]?._source
  } catch (error) {
    console.error(`Error fetching incident ${id}:`, error)
    throw error
  }
}

// ❌ Bad
function getIncident(id) {
  // No type annotations
  // No error handling
  // Synchronous code in async context
}
```

### 에러 처리

```typescript
// ✅ Good
try {
  const result = await riskyOperation()
  return result
} catch (error) {
  if (error instanceof OpenSearchError) {
    console.error('OpenSearch error:', error.message)
    // Handle OpenSearch-specific errors
  } else if (error instanceof PostgresError) {
    console.error('PostgreSQL error:', error.message)
    // Handle Postgres-specific errors
  } else {
    console.error('Unknown error:', error)
    // Handle unknown errors
  }
  throw error
}

// ❌ Bad
try {
  const result = await riskyOperation()
} catch (e) {
  console.log(e) // No specific handling
}
```

### 환경 변수

```typescript
// ✅ Good
const OPENSEARCH_URL = process.env.OPENSEARCH_URL
if (!OPENSEARCH_URL) {
  throw new Error('OPENSEARCH_URL environment variable is required')
}

// ❌ Bad
const url = process.env.OPENSEARCH_URL || 'http://localhost:9200'
// Fails silently if env var is missing
```

### 비동기 처리

```typescript
// ✅ Good - Parallel execution
const [incidents, threats, cves] = await Promise.all([
  fetchIncidents(),
  fetchThreats(),
  fetchCVEs()
])

// ❌ Bad - Sequential execution (slow)
const incidents = await fetchIncidents()
const threats = await fetchThreats()
const cves = await fetchCVEs()
```

### TypeScript Types

```typescript
// ✅ Good - Explicit types
interface Incident {
  incident_id: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  status: string
  creation_time: string
  alerts: Alert[]
}

function processIncident(incident: Incident): void {
  // Type-safe code
}

// ❌ Bad - Any types
function processIncident(incident: any) {
  // No type safety
}
```

### 파일 구조

```
✅ Good Structure:
components/
  ├── ui/              # Primitives
  ├── features/        # Feature-specific
  └── shared/          # Shared utilities

❌ Bad Structure:
components/
  ├── Button.tsx
  ├── Card.tsx
  ├── IncidentTable.tsx
  ├── LoginForm.tsx
  └── [100+ files mixed together]
```

---

## 자주 묻는 질문 (FAQ)

### Q: npm과 pnpm 중 어떤 것을 사용해야 하나요?

**A**: my-app은 **npm만 사용**하세요. package-lock.json이 있고, 스크립트가 npm 기준으로 작성되어 있습니다.

### Q: 포트 40017은 왜 사용하나요?

**A**: `/www` 모노레포의 포트 할당 정책입니다:
- ib-poral: 40014 (dev), 40013 (prod)
- my-app: 40017 (dev/prod)
- 표준 3000 포트는 충돌 위험이 있어 사용하지 않습니다.

### Q: AI 모델은 어떤 것을 사용해야 하나요?

**A**:
- **프로덕션**: Azure OpenAI gpt-4o-mini (비용 효율적)
- **개발/테스트**: Claude Code (무료)
- **대안**: Google Gemini 2.5

### Q: OpenSearch 연결이 안 됩니다.

**A**:
```bash
# 1. /etc/hosts 확인
cat /etc/hosts | grep opensearch
# Expected: 20.41.120.173 opensearch

# 2. OpenSearch 서버 확인
curl -X GET "http://opensearch:9200/_cluster/health" \
  -u admin:Admin@123456 --insecure

# 3. 환경 변수 확인
echo $OPENSEARCH_URL
```

### Q: 인시던트 조사가 실패합니다.

**A**:
```bash
# 1. 인시던트 ID 확인
curl -X GET "http://opensearch:9200/logs-cortex_xdr-incidents-*/_search" \
  -u admin:Admin@123456 \
  -H 'Content-Type: application/json' \
  -d '{"query": {"term": {"incident_id.keyword": "YOUR_ID"}}}' \
  --insecure | jq .

# 2. 로그 확인
tail -f /tmp/investigation-*.log

# 3. 수동 조사 (디버그 모드)
npx tsx script/investigate-incident-cli.ts --incident-id YOUR_ID --verbose
```

---

**다음 문서**: [README-API.md](README-API.md) - API 레퍼런스
