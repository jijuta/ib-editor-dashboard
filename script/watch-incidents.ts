#!/usr/bin/env node
/**
 * File Watcher for Automatic Incident Investigation
 * 지정된 디렉토리를 모니터링하여 새 인시던트 파일 감지 시 자동 조사
 *
 * Usage:
 *   npx tsx script/watch-incidents.ts
 *
 * Environment Variables:
 *   WATCH_DIR: Directory to watch (default: ./data/watch)
 *   WATCH_PATTERN: File pattern to match (default: *.txt)
 *   WATCH_DEBOUNCE: Debounce time in ms (default: 1000)
 */

import { watch } from 'fs';
import { readFile, unlink, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { investigateIncident } from './investigate-incident-cli.js';

const WATCH_DIR = process.env.WATCH_DIR || path.join(process.cwd(), 'data', 'watch');
const WATCH_PATTERN = process.env.WATCH_PATTERN || '.txt';
const WATCH_DEBOUNCE = parseInt(process.env.WATCH_DEBOUNCE || '1000', 10);

// Track processed files to avoid duplicates
const processedFiles = new Set<string>();

// Debounce timers for each file
const debounceTimers = new Map<string, NodeJS.Timeout>();

/**
 * Parse incident ID from filename or file content
 */
function parseIncidentId(filename: string, content?: string): string | null {
  // Try filename first: incident-414186.txt → 414186
  const filenameMatch = filename.match(/incident[_-]?(\d+)/i);
  if (filenameMatch) {
    return filenameMatch[1];
  }

  // Try content if provided
  if (content) {
    const lines = content.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length > 0 && /^\d+$/.test(lines[0])) {
      return lines[0];
    }
  }

  return null;
}

/**
 * Process a single file
 */
async function processFile(filepath: string): Promise<void> {
  const filename = path.basename(filepath);

  // Check if already processed
  if (processedFiles.has(filepath)) {
    console.log(`[Watch] ⏭️  Already processed: ${filename}`);
    return;
  }

  try {
    console.log(`[Watch] 📄 Processing file: ${filename}`);

    // Read file content
    const content = await readFile(filepath, 'utf-8');
    const incidentId = parseIncidentId(filename, content);

    if (!incidentId) {
      console.error(`[Watch] ❌ Could not parse incident ID from: ${filename}`);
      return;
    }

    console.log(`[Watch] 🔍 Investigating incident: ${incidentId}`);

    // Mark as processed
    processedFiles.add(filepath);

    // Run investigation
    const result = await investigateIncident(incidentId, { force: false });

    if (result.success) {
      console.log(`[Watch] ✅ Investigation complete: ${incidentId}`);
      console.log(`[Watch] 📁 Results: ${result.path}`);

      // Delete source file after successful investigation
      try {
        await unlink(filepath);
        console.log(`[Watch] 🗑️  Deleted source file: ${filename}`);
      } catch (error) {
        console.error(`[Watch] ⚠️  Could not delete file: ${error}`);
      }
    } else {
      console.error(`[Watch] ❌ Investigation failed: ${incidentId}`);
      console.error(`[Watch] 📄 Error: ${result.error}`);

      // Remove from processed set so it can be retried
      processedFiles.delete(filepath);
    }
  } catch (error) {
    console.error(`[Watch] ❌ Error processing ${filename}:`, error);

    // Remove from processed set so it can be retried
    processedFiles.delete(filepath);
  }
}

/**
 * Handle file system event
 */
function handleFileEvent(eventType: string, filename: string | null): void {
  if (!filename) return;

  // Filter by pattern
  if (!filename.endsWith(WATCH_PATTERN)) {
    return;
  }

  const filepath = path.join(WATCH_DIR, filename);

  console.log(`[Watch] 📡 Event: ${eventType} - ${filename}`);

  // Only process file creation/modification
  if (eventType !== 'rename' && eventType !== 'change') {
    return;
  }

  // Check if file exists (rename event can be delete)
  if (!existsSync(filepath)) {
    console.log(`[Watch] ⏭️  File does not exist (likely deleted): ${filename}`);
    return;
  }

  // Debounce: Clear existing timer
  const existingTimer = debounceTimers.get(filepath);
  if (existingTimer) {
    clearTimeout(existingTimer);
  }

  // Set new timer
  const timer = setTimeout(() => {
    debounceTimers.delete(filepath);
    processFile(filepath).catch(error => {
      console.error(`[Watch] ❌ Unhandled error:`, error);
    });
  }, WATCH_DEBOUNCE);

  debounceTimers.set(filepath, timer);
}

/**
 * Scan existing files in watch directory
 */
async function scanExistingFiles(): Promise<void> {
  try {
    console.log(`[Watch] 🔎 Scanning existing files in ${WATCH_DIR}...`);

    if (!existsSync(WATCH_DIR)) {
      console.log(`[Watch] ℹ️  Watch directory does not exist yet`);
      return;
    }

    const fs = require('fs');
    const files = fs.readdirSync(WATCH_DIR);

    const matchingFiles = files.filter((f: string) => f.endsWith(WATCH_PATTERN));

    console.log(`[Watch] 📊 Found ${matchingFiles.length} existing files`);

    if (matchingFiles.length > 0) {
      console.log(`[Watch] 🚀 Processing existing files...`);

      for (const file of matchingFiles) {
        const filepath = path.join(WATCH_DIR, file);
        await processFile(filepath);

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      console.log(`[Watch] ✅ Existing files processed`);
    }
  } catch (error) {
    console.error('[Watch] ❌ Error scanning existing files:', error);
  }
}

/**
 * Start file watcher
 */
async function startWatcher(): Promise<void> {
  console.log('[Watch] 🚀 Starting file watcher');
  console.log(`[Watch] 📂 Watch directory: ${WATCH_DIR}`);
  console.log(`[Watch] 🔍 File pattern: *${WATCH_PATTERN}`);
  console.log(`[Watch] ⏱️  Debounce: ${WATCH_DEBOUNCE}ms`);

  // Create watch directory if it doesn't exist
  if (!existsSync(WATCH_DIR)) {
    console.log(`[Watch] 📁 Creating watch directory...`);
    await mkdir(WATCH_DIR, { recursive: true });
  }

  // Scan existing files first
  await scanExistingFiles();

  // Start watching
  console.log('[Watch] 👀 Watching for new files...\n');

  const watcher = watch(WATCH_DIR, { recursive: false }, (eventType, filename) => {
    handleFileEvent(eventType, filename);
  });

  watcher.on('error', error => {
    console.error('[Watch] ❌ Watcher error:', error);
  });

  // Keep process alive
  process.on('SIGINT', () => {
    console.log('\n[Watch] 🛑 Received SIGINT, closing watcher...');
    watcher.close();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('\n[Watch] 🛑 Received SIGTERM, closing watcher...');
    watcher.close();
    process.exit(0);
  });
}

/**
 * Main entry point
 */
async function main() {
  try {
    await startWatcher();
  } catch (error) {
    console.error('[Watch] ❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { startWatcher, processFile };
