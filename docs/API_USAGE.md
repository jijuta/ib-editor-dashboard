# Investigation API Usage

## REST API Endpoint

### POST /api/investigate

Start an incident investigation.

**Request Body:**
```json
{
  "incident_id": "414186",
  "force": false,          // Optional: Ignore cache (default: false)
  "async": false           // Optional: Run in background (default: false)
}
```

**Sync Mode Response (async: false):**
```json
{
  "success": true,
  "incident_id": "414186",
  "investigation": { /* Investigation data */ },
  "parallel_analysis": { /* AI analysis results */ },
  "files": {
    "json": "/path/to/incident_414186_timestamp.json",
    "markdown": "/path/to/incident_414186_timestamp.md"
  }
}
```

**Async Mode Response (async: true):**
```json
{
  "success": true,
  "job_id": "uuid-string",
  "status": "pending",
  "message": "Investigation started in background"
}
```

### GET /api/investigate?job_id={id}

Get status of a background investigation job.

**Response:**
```json
{
  "success": true,
  "job_id": "uuid-string",
  "incident_id": "414186",
  "status": "running",     // "pending" | "running" | "completed" | "failed"
  "progress": 50,          // 0-100
  "created_at": "2025-11-08T14:00:00.000Z",
  "completed_at": "2025-11-08T14:05:00.000Z",
  "result": { /* Investigation results */ },
  "error": null
}
```

### DELETE /api/investigate?job_id={id}

Cancel a running job.

**Response:**
```json
{
  "success": true,
  "message": "Job uuid-string cancelled"
}
```

## CLI Usage

### Single Investigation
```bash
npx tsx script/investigate-incident-cli.ts --incident-id 414186
```

### Force Re-investigation (ignore cache)
```bash
npx tsx script/investigate-incident-cli.ts --incident-id 414186 --force
```

### Batch Processing
Create a file `incidents.txt`:
```
414186
414187
414188
```

Run batch:
```bash
npx tsx script/investigate-incident-cli.ts --batch incidents.txt
```

### Auto-discover New Incidents
```bash
npx tsx script/investigate-incident-cli.ts --auto-new --since 24h
```

## Examples

### Example 1: Sync API Call (curl)
```bash
curl -X POST http://localhost:3000/api/investigate \
  -H "Content-Type: application/json" \
  -d '{"incident_id": "414186"}'
```

### Example 2: Async API Call (curl)
```bash
# Start investigation
curl -X POST http://localhost:3000/api/investigate \
  -H "Content-Type: application/json" \
  -d '{"incident_id": "414186", "async": true}'

# Response: {"success":true,"job_id":"abc-123","status":"pending"}

# Check status
curl "http://localhost:3000/api/investigate?job_id=abc-123"
```

### Example 3: JavaScript/TypeScript
```typescript
// Sync mode
const response = await fetch('/api/investigate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    incident_id: '414186',
    force: false
  })
});

const data = await response.json();
console.log(data.parallel_analysis.synthesis.final_verdict);

// Async mode
const asyncResponse = await fetch('/api/investigate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    incident_id: '414186',
    async: true
  })
});

const { job_id } = await asyncResponse.json();

// Poll for status
const pollStatus = async () => {
  const status = await fetch(`/api/investigate?job_id=${job_id}`);
  const data = await status.json();

  if (data.status === 'completed') {
    console.log('Investigation complete:', data.result);
  } else if (data.status === 'failed') {
    console.error('Investigation failed:', data.error);
  } else {
    setTimeout(pollStatus, 2000); // Poll every 2 seconds
  }
};

pollStatus();
```

### Example 4: Python
```python
import requests
import time

# Sync mode
response = requests.post('http://localhost:3000/api/investigate', json={
    'incident_id': '414186'
})

data = response.json()
print(f"Verdict: {data['parallel_analysis']['synthesis']['final_verdict']}")

# Async mode
async_response = requests.post('http://localhost:3000/api/investigate', json={
    'incident_id': '414186',
    'async': True
})

job_id = async_response.json()['job_id']

# Poll for completion
while True:
    status_response = requests.get(
        f'http://localhost:3000/api/investigate',
        params={'job_id': job_id}
    )
    status = status_response.json()

    if status['status'] == 'completed':
        print(f"Investigation complete: {status['result']}")
        break
    elif status['status'] == 'failed':
        print(f"Investigation failed: {status['error']}")
        break

    time.sleep(2)
```

## Output Files

All investigations are saved to `/www/ib-editor/my-app/data/investigations/`:

- **JSON**: `incident_{id}_{timestamp}.json` - Complete investigation data
- **Markdown**: `incident_{id}_{timestamp}.md` - Human-readable report

## Environment Variables

Required environment variables (in `.env.local`):

```env
# OpenSearch
OPENSEARCH_URL=http://opensearch:9200
OPENSEARCH_USER=admin
OPENSEARCH_PASSWORD=Admin@123456

# PostgreSQL (TI Database)
DATABASE_URL=postgresql://user:password@localhost:5432/ioclog

# Azure OpenAI (for AI analysis)
AZURE_OPENAI_API_KEY=your-key
AZURE_OPENAI_ENDPOINT=https://your-endpoint.openai.azure.com/
AZURE_OPENAI_DEPLOYMENT=gpt-4o-mini
```
