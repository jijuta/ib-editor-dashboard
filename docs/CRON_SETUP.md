# Cron Job Setup Guide

## Overview

The automatic investigation cron job discovers new incidents and investigates them automatically at regular intervals.

## Configuration

Environment variables (set in `.env.local` or directly):

```bash
CRON_INTERVAL=60          # Run every 60 minutes
CRON_LOOKBACK=24h         # Look for incidents in last 24 hours
CRON_MAX_INCIDENTS=10     # Process max 10 incidents per run
```

## Deployment Options

### Option 1: Traditional Cron (Recommended for development)

Add to crontab:

```bash
# Edit crontab
crontab -e

# Add this line to run every hour
0 * * * * /www/ib-editor/my-app/script/cron-investigate.sh --once >> /var/log/incident-cron.log 2>&1

# Or every 30 minutes
*/30 * * * * /www/ib-editor/my-app/script/cron-investigate.sh --once >> /var/log/incident-cron.log 2>&1
```

Verify crontab:
```bash
crontab -l
```

### Option 2: Systemd Service (Recommended for production)

1. **Copy service file:**
```bash
sudo cp script/incident-investigation.service /etc/systemd/system/
```

2. **Edit service file (if needed):**
```bash
sudo nano /etc/systemd/system/incident-investigation.service
```

3. **Reload systemd:**
```bash
sudo systemctl daemon-reload
```

4. **Start service:**
```bash
sudo systemctl start incident-investigation
```

5. **Enable auto-start on boot:**
```bash
sudo systemctl enable incident-investigation
```

6. **Check status:**
```bash
sudo systemctl status incident-investigation
```

7. **View logs:**
```bash
sudo journalctl -u incident-investigation -f
```

8. **Stop service:**
```bash
sudo systemctl stop incident-investigation
```

### Option 3: PM2 Process Manager (Alternative)

1. **Install PM2 globally:**
```bash
npm install -g pm2
```

2. **Start cron job:**
```bash
cd /www/ib-editor/my-app
pm2 start script/cron-investigate.ts --name incident-cron --interpreter tsx
```

3. **Save PM2 config:**
```bash
pm2 save
pm2 startup  # Follow instructions to enable auto-start
```

4. **Manage with PM2:**
```bash
pm2 list                    # List all processes
pm2 logs incident-cron      # View logs
pm2 restart incident-cron   # Restart
pm2 stop incident-cron      # Stop
pm2 delete incident-cron    # Remove
```

### Option 4: Manual Run (Testing)

**Run once:**
```bash
npx tsx script/cron-investigate.ts --once
```

**Run in loop (foreground):**
```bash
npx tsx script/cron-investigate.ts
```

## Monitoring

### Check State File

The cron job maintains state in `data/cron-state.json`:

```bash
cat data/cron-state.json
```

Example output:
```json
{
  "last_run": "2025-11-08T14:00:00.000Z",
  "last_incident_timestamp": 1731070800000,
  "total_investigations": 150,
  "successful_investigations": 145,
  "failed_investigations": 5
}
```

### View Investigation Logs

All investigation results are saved to `data/investigations/`:

```bash
# List recent investigations
ls -lt data/investigations/ | head -20

# View investigation JSON
cat data/investigations/incident_414186_*.json

# View investigation report
cat data/investigations/incident_414186_*.md
```

### Monitor System Resources

```bash
# CPU and memory usage (systemd)
systemctl status incident-investigation

# Disk usage
du -sh data/investigations/

# Count investigations
ls data/investigations/*.json | wc -l
```

## Troubleshooting

### Cron job not running

1. **Check crontab syntax:**
```bash
crontab -l
```

2. **Check cron logs:**
```bash
tail -f /var/log/syslog | grep CRON
```

3. **Test manual execution:**
```bash
/www/ib-editor/my-app/script/cron-investigate.sh --once
```

### Systemd service fails

1. **Check service status:**
```bash
sudo systemctl status incident-investigation
```

2. **View detailed logs:**
```bash
sudo journalctl -u incident-investigation -n 100 --no-pager
```

3. **Check file permissions:**
```bash
ls -l /www/ib-editor/my-app/script/cron-investigate.ts
```

4. **Validate environment:**
```bash
sudo systemctl show incident-investigation --property=Environment
```

### No incidents discovered

1. **Check OpenSearch connectivity:**
```bash
curl -u admin:Admin@123456 http://opensearch:9200/_cat/indices/logs-cortex_xdr-incidents-*
```

2. **Verify time range:**
```bash
# The cron job looks for incidents created within CRON_LOOKBACK
# Adjust CRON_LOOKBACK if needed (e.g., "48h", "7d")
```

3. **Check existing investigations:**
```bash
# Cron job skips already investigated incidents
ls data/investigations/incident_*.json
```

### Investigations failing

1. **Check Azure OpenAI API:**
```bash
# Ensure AZURE_OPENAI_* environment variables are set
grep AZURE .env.local
```

2. **Check PostgreSQL connection:**
```bash
psql -U postgres -h localhost -d ioclog -c "SELECT COUNT(*) FROM ioclog.ioc_simple;"
```

3. **Review error logs:**
```bash
tail -f /var/log/incident-cron.log  # Traditional cron
sudo journalctl -u incident-investigation -f  # Systemd
pm2 logs incident-cron  # PM2
```

## Performance Tuning

### Adjust Interval

For more frequent checks:
```bash
# .env.local
CRON_INTERVAL=15  # Every 15 minutes
```

### Limit Incidents Per Run

To prevent overload:
```bash
# .env.local
CRON_MAX_INCIDENTS=5  # Process max 5 per run
```

### Parallel Processing

For faster batch processing, modify `cron-investigate.ts` to use `Promise.all()`:

```typescript
// Current: Sequential
for (const incidentId of toInvestigate) {
  await investigateIncident(incidentId, { force: false });
}

// Faster: Parallel (max 3 concurrent)
const chunks = chunk(toInvestigate, 3);
for (const batch of chunks) {
  await Promise.all(
    batch.map(id => investigateIncident(id, { force: false }))
  );
}
```

## Best Practices

1. **Start with hourly runs** (`CRON_INTERVAL=60`) and adjust based on incident volume
2. **Monitor disk space** in `data/investigations/` directory
3. **Set up log rotation** for cron logs
4. **Use systemd for production** deployments
5. **Test with `--once` flag** before enabling continuous mode
6. **Keep `CRON_LOOKBACK` at 24h** to avoid missing incidents
7. **Review cron-state.json** regularly to check success rate

## Cleanup

To clean up old investigations (optional):

```bash
# Delete investigations older than 30 days
find data/investigations/ -name "incident_*.json" -mtime +30 -delete
find data/investigations/ -name "incident_*.md" -mtime +30 -delete
```

## Integration with Monitoring

### Prometheus Metrics (Future Enhancement)

Export metrics for monitoring:
- `incident_investigations_total`
- `incident_investigations_success_total`
- `incident_investigations_duration_seconds`
- `incident_cron_last_run_timestamp`

### Alerting

Set up alerts for:
- Cron job failures (no runs for > 2 hours)
- High failure rate (> 20%)
- Long execution time (> 30 minutes)
- Disk space warnings (> 80% full)
