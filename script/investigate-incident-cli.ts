#!/usr/bin/env node
// @ts-nocheck
/**
 * Investigation CLI
 * 커맨드라인에서 인시던트 조사를 실행
 *
 * Usage:
 *   npx tsx script/investigate-incident-cli.ts --incident-id 414186
 *   npx tsx script/investigate-incident-cli.ts --batch incidents.txt
 *   npx tsx script/investigate-incident-cli.ts --auto-new --since 24h
 */

import { executeInvestigation } from './opensearch-executor.js';
import { checkHashesInTI, checkIPsInTI, getMITREByTechniqueIds, getCVEDetails } from './ti-correlator.js';
import { saveInvestigation, loadInvestigation, getInvestigationPath } from './investigation-cache.js';
import { runParallelAnalysis, formatParallelAnalysisAsMarkdown } from './ai-parallel-analyzer.js';
import { formatInvestigationAsMarkdown } from './markdown-formatter.js';
import fs from 'fs/promises';
import path from 'path';

interface CLIOptions {
  incidentId?: string;
  batch?: string;
  autoNew?: boolean;
  since?: string;
  force?: boolean;
  outputDir?: string;
}

/**
 * 커맨드라인 인자 파싱
 */
function parseArgs(): CLIOptions {
  const args = process.argv.slice(2);
  const options: CLIOptions = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--incident-id':
      case '-i':
        options.incidentId = args[++i];
        break;

      case '--batch':
      case '-b':
        options.batch = args[++i];
        break;

      case '--auto-new':
        options.autoNew = true;
        break;

      case '--since':
        options.since = args[++i];
        break;

      case '--force':
      case '-f':
        options.force = true;
        break;

      case '--output':
      case '-o':
        options.outputDir = args[++i];
        break;

      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
        break;

      default:
        console.error(`Unknown argument: ${arg}`);
        printHelp();
        process.exit(1);
    }
  }

  return options;
}

/**
 * 도움말 출력
 */
function printHelp() {
  console.log(`
Investigation CLI - 인시던트 조사 자동화 도구

Usage:
  npx tsx script/investigate-incident-cli.ts [options]

Options:
  -i, --incident-id <id>     단일 인시던트 조사 (예: 414186)
  -b, --batch <file>         배치 파일에서 인시던트 목록 읽기
  --auto-new                 새 인시던트 자동 발견 및 조사
  --since <duration>         조사할 기간 (예: 24h, 7d, 30d)
  -f, --force                캐시 무시하고 재조사
  -o, --output <dir>         출력 디렉토리 지정 (기본: ./data/investigations)
  -h, --help                 도움말 표시

Examples:
  # 단일 인시던트 조사
  npx tsx script/investigate-incident-cli.ts --incident-id 414186

  # 배치 처리
  npx tsx script/investigate-incident-cli.ts --batch incidents.txt

  # 최근 24시간 내 새 인시던트 자동 조사
  npx tsx script/investigate-incident-cli.ts --auto-new --since 24h

  # 강제 재조사 (캐시 무시)
  npx tsx script/investigate-incident-cli.ts --incident-id 414186 --force
  `);
}

/**
 * 단일 인시던트 조사 실행
 */
async function investigateIncident(
  incidentId: string,
  options: CLIOptions
): Promise<{ success: boolean; path?: string; error?: string }> {
  try {
    console.log(`\n[CLI] 🔍 Investigating incident ${incidentId}...`);

    // 1. 캐시 확인 (force가 아닐 때만)
    if (!options.force) {
      const cached = await loadInvestigation(incidentId);
      if (cached) {
        const cachedPath = getInvestigationPath(incidentId);
        console.log(`[CLI] ✅ Found cached investigation: ${cachedPath}`);
        console.log(`[CLI] ℹ️  Use --force to re-investigate`);
        return { success: true, path: cachedPath };
      }
    }

    // 2. OpenSearch 조사 실행
    console.log(`[CLI] 📊 Querying OpenSearch...`);
    const investigationResult = await executeInvestigation(incidentId);

    if (!investigationResult.success) {
      throw new Error(investigationResult.error || 'Investigation failed');
    }

    const investigationData = investigationResult.investigation_data!;

    // 3. TI 상관 분석
    console.log(`[CLI] 🔗 Running TI correlation...`);
    const tiCorrelation: any = {
      file_hashes: [],
      ip_addresses: [],
      mitre_techniques: [],
      mitre_techniques_raw: [],
      cve_details: [],
    };

    // 3-1. 파일 해시 TI 매칭
    const fileHashes = investigationData.files
      .map((f: any) => f.file_sha256 || f.sha256)
      .filter(Boolean);

    if (fileHashes.length > 0) {
      console.log(`[CLI]   - Checking ${fileHashes.length} file hashes...`);
      tiCorrelation.file_hashes = await checkHashesInTI(fileHashes);
    }

    // 3-2. IP 주소 TI 매칭
    const ipAddresses = investigationData.networks
      .flatMap((n: any) => [n.dst_ip, n.action_external_ip])
      .filter(Boolean);

    if (ipAddresses.length > 0) {
      console.log(`[CLI]   - Checking ${ipAddresses.length} IP addresses...`);
      tiCorrelation.ip_addresses = await checkIPsInTI(ipAddresses);
    }

    // 3-3. MITRE 기법 조회
    const mitreStrings = investigationData.incident?.mitre_techniques_ids_and_names || [];
    tiCorrelation.mitre_techniques_raw = mitreStrings;

    const techniqueIds = mitreStrings
      .map((str: string) => {
        const match = str.match(/^(T\d{4}(?:\.\d{3})?)/);
        return match ? match[1] : null;
      })
      .filter(Boolean);

    if (techniqueIds.length > 0) {
      console.log(`[CLI]   - Fetching ${techniqueIds.length} MITRE techniques...`);
      tiCorrelation.mitre_techniques = await getMITREByTechniqueIds(techniqueIds);
    }

    // 3-4. CVE 상세 정보
    const cveIds = investigationData.cves?.map((c: any) => c.cve_id).filter(Boolean) || [];
    if (cveIds.length > 0) {
      console.log(`[CLI]   - Fetching ${cveIds.length} CVE details...`);
      tiCorrelation.cve_details = await getCVEDetails(cveIds);
    }

    investigationData.ti_correlation = tiCorrelation;

    // TI 통계 업데이트
    investigationData.summary.ti_matched_files = tiCorrelation.file_hashes.length;
    investigationData.summary.ti_matched_ips = tiCorrelation.ip_addresses.length;
    investigationData.summary.ti_threat_files = tiCorrelation.file_hashes.filter(
      (h: any) => h.verdict === 'threat'
    ).length;
    investigationData.summary.ti_threat_ips = tiCorrelation.ip_addresses.filter(
      (ip: any) => ip.verdict === 'threat'
    ).length;

    // 4. AI 병렬 분석 실행
    console.log(`[CLI] 🤖 Running parallel AI analysis...`);
    const parallelResult = await runParallelAnalysis(investigationData);

    // 5. 결과 저장
    console.log(`[CLI] 💾 Saving investigation data...`);
    const savedPath = await saveInvestigation(investigationData);

    // 6. 마크다운 생성 및 저장
    console.log(`[CLI] 📝 Generating markdown report...`);
    const relativePath = path.relative(process.cwd(), savedPath);

    let markdown = formatInvestigationAsMarkdown(investigationData, relativePath);

    if (parallelResult.success) {
      markdown += `\n---\n\n`;
      markdown += formatParallelAnalysisAsMarkdown(parallelResult);
    }

    const markdownPath = savedPath.replace('.json', '.md');
    await fs.writeFile(markdownPath, markdown, 'utf-8');

    // 7. 결과 요약 출력
    console.log(`\n[CLI] ✅ Investigation complete!`);
    console.log(`[CLI] 📁 JSON: ${savedPath}`);
    console.log(`[CLI] 📄 Markdown: ${markdownPath}`);
    console.log(`\n[CLI] 📊 Summary:`);
    console.log(`  - Incident: ${investigationData.incident_id}`);
    console.log(`  - Severity: ${investigationData.incident?.severity || 'unknown'}`);
    console.log(`  - Analyst Verdict: ${investigationData.incident?.manual_severity || 'none'}`);

    if (parallelResult.success) {
      console.log(`\n[CLI] 🤖 AI Analysis:`);
      console.log(`  - Final Verdict: ${parallelResult.synthesis.final_verdict}`);
      console.log(`  - Risk Score: ${parallelResult.synthesis.overall_risk_score}/100`);
      console.log(`  - Confidence: ${(parallelResult.synthesis.confidence * 100).toFixed(0)}%`);
      console.log(`  - Execution Time: ${parallelResult.total_execution_time_ms}ms`);
      console.log(`  - Total Tokens: ${parallelResult.total_tokens}`);
    }

    console.log(`\n[CLI] 📈 TI Correlation:`);
    console.log(`  - Files Matched: ${investigationData.summary.ti_matched_files}`);
    console.log(`  - Threat Files: ${investigationData.summary.ti_threat_files}`);
    console.log(`  - IPs Matched: ${investigationData.summary.ti_matched_ips}`);
    console.log(`  - Threat IPs: ${investigationData.summary.ti_threat_ips}`);

    return { success: true, path: savedPath };
  } catch (error) {
    console.error(`[CLI] ❌ Error investigating incident ${incidentId}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * 배치 파일에서 인시던트 목록 읽기
 */
async function readBatchFile(filePath: string): Promise<string[]> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const incidentIds = content
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#'));

    return incidentIds;
  } catch (error) {
    throw new Error(`Failed to read batch file: ${error}`);
  }
}

/**
 * 새 인시던트 자동 발견
 */
async function discoverNewIncidents(since: string): Promise<string[]> {
  console.log(`[CLI] 🔎 Discovering new incidents (since: ${since})...`);

  // TODO: OpenSearch 쿼리로 최근 인시던트 목록 가져오기
  // 현재는 placeholder
  console.warn(`[CLI] ⚠️  Auto-discovery not yet implemented`);
  return [];
}

/**
 * 배치 처리 실행
 */
async function runBatch(incidentIds: string[], options: CLIOptions) {
  console.log(`\n[CLI] 📦 Batch processing ${incidentIds.length} incidents...`);

  const results = {
    total: incidentIds.length,
    success: 0,
    failed: 0,
    skipped: 0,
  };

  for (let i = 0; i < incidentIds.length; i++) {
    const incidentId = incidentIds[i];
    console.log(`\n[CLI] [${i + 1}/${incidentIds.length}] Processing ${incidentId}...`);

    const result = await investigateIncident(incidentId, options);

    if (result.success) {
      if (result.path?.includes('cached')) {
        results.skipped++;
      } else {
        results.success++;
      }
    } else {
      results.failed++;
    }

    // Rate limiting: 1초 대기
    if (i < incidentIds.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  console.log(`\n[CLI] 📊 Batch Results:`);
  console.log(`  - Total: ${results.total}`);
  console.log(`  - Success: ${results.success}`);
  console.log(`  - Skipped (cached): ${results.skipped}`);
  console.log(`  - Failed: ${results.failed}`);
}

/**
 * Main 함수
 */
async function main() {
  console.log('[CLI] 🚀 Investigation CLI started\n');

  const options = parseArgs();

  try {
    // 단일 인시던트 조사
    if (options.incidentId) {
      await investigateIncident(options.incidentId, options);
    }
    // 배치 처리
    else if (options.batch) {
      const incidentIds = await readBatchFile(options.batch);
      await runBatch(incidentIds, options);
    }
    // 자동 발견
    else if (options.autoNew) {
      const since = options.since || '24h';
      const incidentIds = await discoverNewIncidents(since);

      if (incidentIds.length > 0) {
        await runBatch(incidentIds, options);
      } else {
        console.log('[CLI] ℹ️  No new incidents found');
      }
    }
    // 옵션 없음
    else {
      console.error('[CLI] ❌ No incident ID, batch file, or auto-discovery specified');
      printHelp();
      process.exit(1);
    }

    console.log('\n[CLI] ✅ All operations completed');
    process.exit(0);
  } catch (error) {
    console.error('[CLI] ❌ Fatal error:', error);
    process.exit(1);
  }
}

// 스크립트 직접 실행 시
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { investigateIncident, runBatch, discoverNewIncidents };
