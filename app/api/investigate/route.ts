/**
 * Investigation API Endpoint
 * POST /api/investigate
 *
 * Body:
 *   - incident_id: string (required)
 *   - force: boolean (optional, default: false)
 *   - async: boolean (optional, default: false)
 *
 * Response:
 *   - Sync mode: Full investigation results
 *   - Async mode: Job ID and status
 */

import { NextRequest, NextResponse } from 'next/server';
import { executeInvestigation } from '@/script/opensearch-executor';
import {
  checkHashesInTI,
  checkIPsInTI,
  getMITREByTechniqueIds,
  getCVEDetails,
} from '@/script/ti-correlator';
import { saveInvestigation, loadInvestigation } from '@/script/investigation-cache';
import { runParallelAnalysis } from '@/script/ai-parallel-analyzer';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Job storage (in production, use Redis or a database)
const jobs = new Map<
  string,
  {
    incident_id: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    progress: number;
    result?: any;
    error?: string;
    created_at: string;
    completed_at?: string;
  }
>();

/**
 * POST /api/investigate
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { incident_id, force = false, async: asyncMode = false } = body;

    // Validate incident_id
    if (!incident_id || typeof incident_id !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'incident_id is required and must be a string',
        },
        { status: 400 }
      );
    }

    // Async mode: Create job and return immediately
    if (asyncMode) {
      const jobId = uuidv4();

      jobs.set(jobId, {
        incident_id,
        status: 'pending',
        progress: 0,
        created_at: new Date().toISOString(),
      });

      // Run investigation in background (non-blocking)
      runInvestigationJob(jobId, incident_id, force).catch(error => {
        console.error(`[API] Job ${jobId} failed:`, error);
        const job = jobs.get(jobId);
        if (job) {
          job.status = 'failed';
          job.error = error instanceof Error ? error.message : String(error);
          job.completed_at = new Date().toISOString();
        }
      });

      return NextResponse.json({
        success: true,
        job_id: jobId,
        status: 'pending',
        message: 'Investigation started in background',
      });
    }

    // Sync mode: Run investigation and return results
    const result = await runInvestigation(incident_id, force);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      incident_id,
      investigation: result.investigation,
      parallel_analysis: result.parallel_analysis,
      files: {
        json: result.json_path,
        markdown: result.markdown_path,
      },
    });
  } catch (error) {
    console.error('[API] Investigation error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/investigate?job_id={id}
 * Get job status for async investigations
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const jobId = searchParams.get('job_id');

  if (!jobId) {
    return NextResponse.json(
      {
        success: false,
        error: 'job_id parameter is required',
      },
      { status: 400 }
    );
  }

  const job = jobs.get(jobId);

  if (!job) {
    return NextResponse.json(
      {
        success: false,
        error: 'Job not found',
      },
      { status: 404 }
    );
  }

  // Clean up completed jobs older than 1 hour
  if (
    job.status === 'completed' &&
    job.completed_at &&
    Date.now() - new Date(job.completed_at).getTime() > 3600000
  ) {
    jobs.delete(jobId);
    return NextResponse.json({
      success: true,
      job_id: jobId,
      status: 'expired',
      message: 'Job expired (completed over 1 hour ago)',
    });
  }

  return NextResponse.json({
    success: true,
    job_id: jobId,
    incident_id: job.incident_id,
    status: job.status,
    progress: job.progress,
    created_at: job.created_at,
    completed_at: job.completed_at,
    result: job.result,
    error: job.error,
  });
}

/**
 * DELETE /api/investigate?job_id={id}
 * Cancel a running job
 */
export async function DELETE(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const jobId = searchParams.get('job_id');

  if (!jobId) {
    return NextResponse.json(
      {
        success: false,
        error: 'job_id parameter is required',
      },
      { status: 400 }
    );
  }

  const job = jobs.get(jobId);

  if (!job) {
    return NextResponse.json(
      {
        success: false,
        error: 'Job not found',
      },
      { status: 404 }
    );
  }

  // Can only cancel pending or running jobs
  if (job.status !== 'pending' && job.status !== 'running') {
    return NextResponse.json(
      {
        success: false,
        error: `Cannot cancel job with status: ${job.status}`,
      },
      { status: 400 }
    );
  }

  jobs.delete(jobId);

  return NextResponse.json({
    success: true,
    message: `Job ${jobId} cancelled`,
  });
}

/**
 * Run investigation (core logic)
 */
async function runInvestigation(
  incidentId: string,
  force: boolean
): Promise<{
  success: boolean;
  investigation?: any;
  parallel_analysis?: any;
  json_path?: string;
  markdown_path?: string;
  error?: string;
}> {
  try {
    // 1. Check cache (if not force)
    if (!force) {
      const cached = await loadInvestigation(incidentId);
      if (cached) {
        return {
          success: true,
          investigation: cached,
          json_path: path.join(process.cwd(), 'data', 'investigations', `incident_${incidentId}_*.json`),
          markdown_path: path.join(process.cwd(), 'data', 'investigations', `incident_${incidentId}_*.md`),
        };
      }
    }

    // 2. Run OpenSearch investigation
    const investigationResult = await executeInvestigation(incidentId);

    if (!investigationResult.success) {
      return {
        success: false,
        error: investigationResult.error || 'Investigation failed',
      };
    }

    const investigationData = investigationResult.investigation_data!;

    // 3. TI correlation
    const tiCorrelation: any = {
      file_hashes: [],
      ip_addresses: [],
      mitre_techniques: [],
      mitre_techniques_raw: [],
      cve_details: [],
    };

    // 3-1. File hashes
    const fileHashes = investigationData.files
      .map((f: any) => f.file_sha256 || f.sha256)
      .filter(Boolean);

    if (fileHashes.length > 0) {
      tiCorrelation.file_hashes = await checkHashesInTI(fileHashes);
    }

    // 3-2. IP addresses
    const ipAddresses = investigationData.networks
      .flatMap((n: any) => [n.dst_ip, n.action_external_ip])
      .filter(Boolean);

    if (ipAddresses.length > 0) {
      tiCorrelation.ip_addresses = await checkIPsInTI(ipAddresses);
    }

    // 3-3. MITRE techniques
    const mitreStrings = investigationData.incident?.mitre_techniques_ids_and_names || [];
    tiCorrelation.mitre_techniques_raw = mitreStrings;

    const techniqueIds = mitreStrings
      .map((str: string) => {
        const match = str.match(/^(T\d{4}(?:\.\d{3})?)/);
        return match ? match[1] : null;
      })
      .filter(Boolean);

    if (techniqueIds.length > 0) {
      tiCorrelation.mitre_techniques = await getMITREByTechniqueIds(techniqueIds);
    }

    // 3-4. CVE details
    const cveIds = investigationData.cves?.map((c: any) => c.cve_id).filter(Boolean) || [];
    if (cveIds.length > 0) {
      tiCorrelation.cve_details = await getCVEDetails(cveIds);
    }

    investigationData.ti_correlation = tiCorrelation;

    // Update TI stats
    investigationData.summary.ti_matched_files = tiCorrelation.file_hashes.length;
    investigationData.summary.ti_matched_ips = tiCorrelation.ip_addresses.length;
    investigationData.summary.ti_threat_files = tiCorrelation.file_hashes.filter(
      (h: any) => h.verdict === 'threat'
    ).length;
    investigationData.summary.ti_threat_ips = tiCorrelation.ip_addresses.filter(
      (ip: any) => ip.verdict === 'threat'
    ).length;

    // 4. Parallel AI analysis
    const parallelResult = await runParallelAnalysis(investigationData);

    // 5. Save results
    const savedPath = await saveInvestigation(investigationData);
    const markdownPath = savedPath.replace('.json', '.md');

    // Generate markdown (simplified for now)
    const markdown = generateMarkdownSummary(investigationData, parallelResult);
    await fs.writeFile(markdownPath, markdown, 'utf-8');

    return {
      success: true,
      investigation: investigationData,
      parallel_analysis: parallelResult,
      json_path: savedPath,
      markdown_path: markdownPath,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Run investigation job (background)
 */
async function runInvestigationJob(jobId: string, incidentId: string, force: boolean) {
  const job = jobs.get(jobId);
  if (!job) return;

  try {
    job.status = 'running';
    job.progress = 10;

    const result = await runInvestigation(incidentId, force);

    if (!result.success) {
      job.status = 'failed';
      job.error = result.error;
    } else {
      job.status = 'completed';
      job.progress = 100;
      job.result = {
        incident_id: incidentId,
        investigation: result.investigation,
        parallel_analysis: result.parallel_analysis,
        files: {
          json: result.json_path,
          markdown: result.markdown_path,
        },
      };
    }

    job.completed_at = new Date().toISOString();
  } catch (error) {
    job.status = 'failed';
    job.error = error instanceof Error ? error.message : String(error);
    job.completed_at = new Date().toISOString();
  }
}

/**
 * Generate markdown summary (simplified)
 */
function generateMarkdownSummary(investigation: any, parallelAnalysis: any): string {
  let md = `# Investigation Report: ${investigation.incident_id}\n\n`;

  md += `## AI Analysis\n\n`;
  if (parallelAnalysis.success) {
    md += `- **Verdict**: ${parallelAnalysis.synthesis.final_verdict}\n`;
    md += `- **Risk Score**: ${parallelAnalysis.synthesis.overall_risk_score}/100\n`;
    md += `- **Confidence**: ${(parallelAnalysis.synthesis.confidence * 100).toFixed(0)}%\n`;
    md += `- **Execution Time**: ${parallelAnalysis.total_execution_time_ms}ms\n`;
    md += `- **Total Tokens**: ${parallelAnalysis.total_tokens}\n\n`;

    md += `### Executive Summary\n${parallelAnalysis.synthesis.executive_summary}\n\n`;
  }

  md += `## Summary Statistics\n\n`;
  md += `| Category | Count |\n`;
  md += `|----------|-------|\n`;
  md += `| Alerts | ${investigation.summary.total_alerts} |\n`;
  md += `| Files | ${investigation.summary.total_files} |\n`;
  md += `| Networks | ${investigation.summary.total_networks} |\n`;
  md += `| Endpoints | ${investigation.summary.total_endpoints} |\n`;
  md += `| CVEs | ${investigation.summary.total_cves} |\n`;
  md += `| TI Threat Files | ${investigation.summary.ti_threat_files || 0} |\n`;
  md += `| TI Threat IPs | ${investigation.summary.ti_threat_ips || 0} |\n\n`;

  return md;
}
