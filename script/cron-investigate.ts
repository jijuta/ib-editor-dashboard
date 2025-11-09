#!/usr/bin/env node
/**
 * Cron Job for Automatic Incident Investigation
 * 주기적으로 새 인시던트를 발견하고 자동 조사
 *
 * Usage:
 *   npx tsx script/cron-investigate.ts
 *
 * Environment Variables:
 *   CRON_INTERVAL: Investigation interval in minutes (default: 60)
 *   CRON_LOOKBACK: How far back to look for incidents (default: 24h)
 *   CRON_MAX_INCIDENTS: Max incidents to process per run (default: 10)
 */

import { executeQuery } from './opensearch-executor.js';
import { investigateIncident } from './investigate-incident-cli.js';
import { getInvestigationPath } from './investigation-cache.js';
import fs from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';

const CRON_INTERVAL = parseInt(process.env.CRON_INTERVAL || '60', 10); // minutes
const CRON_LOOKBACK = process.env.CRON_LOOKBACK || '24h';
const CRON_MAX_INCIDENTS = parseInt(process.env.CRON_MAX_INCIDENTS || '10', 10);
const STATE_FILE = path.join(process.cwd(), 'data', 'cron-state.json');

interface CronState {
  last_run: string;
  last_incident_timestamp: number;
  total_investigations: number;
  successful_investigations: number;
  failed_investigations: number;
}

/**
 * Load cron state from file
 */
async function loadState(): Promise<CronState> {
  try {
    if (existsSync(STATE_FILE)) {
      const content = await fs.readFile(STATE_FILE, 'utf-8');
      return JSON.parse(content);
    }
  } catch (error) {
    console.error('[Cron] Failed to load state:', error);
  }

  // Default state
  return {
    last_run: new Date(0).toISOString(),
    last_incident_timestamp: 0,
    total_investigations: 0,
    successful_investigations: 0,
    failed_investigations: 0,
  };
}

/**
 * Save cron state to file
 */
async function saveState(state: CronState): Promise<void> {
  try {
    const dir = path.dirname(STATE_FILE);
    if (!existsSync(dir)) {
      await fs.mkdir(dir, { recursive: true });
    }

    await fs.writeFile(STATE_FILE, JSON.stringify(state, null, 2), 'utf-8');
  } catch (error) {
    console.error('[Cron] Failed to save state:', error);
  }
}

/**
 * Parse lookback duration to milliseconds
 */
function parseDuration(duration: string): number {
  const match = duration.match(/^(\d+)([hdm])$/);
  if (!match) {
    throw new Error(`Invalid duration format: ${duration}`);
  }

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case 'm':
      return value * 60 * 1000;
    case 'h':
      return value * 60 * 60 * 1000;
    case 'd':
      return value * 24 * 60 * 60 * 1000;
    default:
      throw new Error(`Invalid duration unit: ${unit}`);
  }
}

/**
 * Discover new incidents since last run
 */
async function discoverNewIncidents(state: CronState): Promise<string[]> {
  try {
    console.log('[Cron] 🔎 Discovering new incidents...');

    // Calculate time range
    const now = Date.now();
    const lookbackMs = parseDuration(CRON_LOOKBACK);
    const sinceTime = Math.max(now - lookbackMs, state.last_incident_timestamp);

    console.log('[Cron] 📅 Time range:', {
      from: new Date(sinceTime).toISOString(),
      to: new Date(now).toISOString(),
    });

    // Query OpenSearch for new incidents
    const query = {
      query: {
        range: {
          creation_time: {
            gte: sinceTime,
            lte: now,
          },
        },
      },
      size: CRON_MAX_INCIDENTS,
      sort: [{ creation_time: { order: 'desc' as const } }],
      _source: ['incident_id', 'creation_time', 'severity', 'status'],
    };

    const result = await executeQuery('logs-cortex_xdr-incidents-*', query);

    if (!result.success || !result.hits || result.hits.length === 0) {
      console.log('[Cron] ℹ️  No new incidents found');
      return [];
    }

    const incidents = result.hits.map((hit: any) => hit.incident_id);
    console.log(`[Cron] ✅ Found ${incidents.length} new incidents`);

    return incidents;
  } catch (error) {
    console.error('[Cron] ❌ Error discovering incidents:', error);
    return [];
  }
}

/**
 * Filter out already investigated incidents
 */
function filterAlreadyInvestigated(incidentIds: string[]): string[] {
  const uninvestigated = incidentIds.filter(id => {
    const path = getInvestigationPath(id);
    return path === null; // Not investigated if no cache file exists
  });

  console.log(`[Cron] 📊 ${incidentIds.length} total, ${uninvestigated.length} uninvestigated`);

  return uninvestigated;
}

/**
 * Run cron job once
 */
async function runCronJob(): Promise<void> {
  console.log('\n[Cron] 🚀 Starting automatic investigation job');
  console.log(`[Cron] ⚙️  Config: interval=${CRON_INTERVAL}m, lookback=${CRON_LOOKBACK}, max=${CRON_MAX_INCIDENTS}`);

  const state = await loadState();
  console.log('[Cron] 📊 Previous state:', state);

  try {
    // 1. Discover new incidents
    const newIncidents = await discoverNewIncidents(state);

    if (newIncidents.length === 0) {
      console.log('[Cron] ✅ No new incidents to investigate');
      state.last_run = new Date().toISOString();
      await saveState(state);
      return;
    }

    // 2. Filter out already investigated
    const toInvestigate = filterAlreadyInvestigated(newIncidents);

    if (toInvestigate.length === 0) {
      console.log('[Cron] ✅ All incidents already investigated');
      state.last_run = new Date().toISOString();
      await saveState(state);
      return;
    }

    // 3. Investigate each incident
    console.log(`[Cron] 🔍 Investigating ${toInvestigate.length} incidents...`);

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < toInvestigate.length; i++) {
      const incidentId = toInvestigate[i];
      console.log(`\n[Cron] [${i + 1}/${toInvestigate.length}] Processing ${incidentId}...`);

      try {
        const result = await investigateIncident(incidentId, { force: false });

        if (result.success) {
          successCount++;
          console.log(`[Cron] ✅ ${incidentId} investigated successfully`);
        } else {
          failCount++;
          console.error(`[Cron] ❌ ${incidentId} failed: ${result.error}`);
        }
      } catch (error) {
        failCount++;
        console.error(`[Cron] ❌ ${incidentId} error:`, error);
      }

      // Rate limiting: 2초 대기
      if (i < toInvestigate.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    // 4. Update state
    state.last_run = new Date().toISOString();
    state.last_incident_timestamp = Date.now();
    state.total_investigations += toInvestigate.length;
    state.successful_investigations += successCount;
    state.failed_investigations += failCount;

    await saveState(state);

    console.log('\n[Cron] 📊 Job Summary:');
    console.log(`  - Total Processed: ${toInvestigate.length}`);
    console.log(`  - Successful: ${successCount}`);
    console.log(`  - Failed: ${failCount}`);
    console.log(`  - Success Rate: ${((successCount / toInvestigate.length) * 100).toFixed(1)}%`);
    console.log(`\n[Cron] 📈 All-Time Stats:  - Total: ${state.total_investigations}`);
    console.log(`  - Successful: ${state.successful_investigations}`);
    console.log(`  - Failed: ${state.failed_investigations}`);
  } catch (error) {
    console.error('[Cron] ❌ Job failed:', error);
  }

  console.log('[Cron] ✅ Job complete\n');
}

/**
 * Run cron job in loop
 */
async function runCronLoop(): Promise<void> {
  console.log('[Cron] 🔄 Starting cron loop');
  console.log(`[Cron] ⏰ Running every ${CRON_INTERVAL} minutes`);

  while (true) {
    try {
      await runCronJob();
    } catch (error) {
      console.error('[Cron] ❌ Unexpected error:', error);
    }

    // Wait for next interval
    const waitMs = CRON_INTERVAL * 60 * 1000;
    console.log(`[Cron] ⏳ Waiting ${CRON_INTERVAL} minutes until next run...`);
    await new Promise(resolve => setTimeout(resolve, waitMs));
  }
}

/**
 * Main entry point
 */
async function main() {
  const args = process.argv.slice(2);

  // One-shot mode: Run once and exit
  if (args.includes('--once')) {
    await runCronJob();
    process.exit(0);
  }

  // Loop mode: Run continuously
  await runCronLoop();
}

// Handle signals
process.on('SIGINT', () => {
  console.log('\n[Cron] 🛑 Received SIGINT, exiting...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n[Cron] 🛑 Received SIGTERM, exiting...');
  process.exit(0);
});

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('[Cron] ❌ Fatal error:', error);
    process.exit(1);
  });
}

export { runCronJob, discoverNewIncidents };
