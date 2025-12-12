/**
 * AI Parallel Analyzer
 * 7개 AI 분석을 병렬 실행하여 토큰 절약 및 속도 향상
 */

import { filterDataForAI, estimateTokens } from './ai-data-filter';
import { verifyAnalystJudgment } from './ai-analyzers/analyst-verifier';
import { analyzeFileHashes } from './ai-analyzers/file-hash-analyzer';
import { analyzeNetwork } from './ai-analyzers/network-analyzer';
import { analyzeMITRE } from './ai-analyzers/mitre-analyzer';
import { analyzeCVEs } from './ai-analyzers/cve-analyzer';
import { analyzeEndpoints } from './ai-analyzers/endpoint-analyzer';
import { synthesizeAnalyses } from './ai-analyzers/synthesizer';

export interface ParallelAnalysisResult {
  incident_id: string;
  analysis_timestamp: string;
  parallel_analyses: {
    analyst_verification?: any;
    file_hash_analysis?: any;
    network_analysis?: any;
    mitre_analysis?: any;
    cve_analysis?: any;
    endpoint_analysis?: any;
  };
  synthesis: any;
  total_tokens: number;
  total_execution_time_ms: number;
  success: boolean;
}

/**
 * 병렬 AI 분석 실행
 */
export async function runParallelAnalysis(
  investigationData: any
): Promise<ParallelAnalysisResult> {
  const startTime = Date.now();

  console.error(`[Parallel Analyzer] 🚀 Starting parallel AI analysis for incident ${investigationData.incident_id}`);

  try {
    // 1. 데이터 필터링 (각 카테고리별로 필요한 데이터만 추출)
    console.error(`[Parallel Analyzer] 📊 Filtering data for AI analysis...`);
    const filteredData = filterDataForAI(investigationData);

    // 토큰 예상치 로깅
    console.error(`[Parallel Analyzer] 💰 Estimated tokens:`);
    console.error(`  - Analyst: ~${estimateTokens(filteredData.analyst_verification)}`);
    console.error(`  - Files: ~${estimateTokens(filteredData.file_hash_analysis)}`);
    console.error(`  - Network: ~${estimateTokens(filteredData.network_analysis)}`);
    console.error(`  - MITRE: ~${estimateTokens(filteredData.mitre_analysis)}`);
    console.error(`  - CVE: ~${estimateTokens(filteredData.cve_analysis)}`);
    console.error(`  - Endpoints: ~${estimateTokens(filteredData.endpoint_analysis)}`);

    // 2. 병렬 분석 실행 (6개 카테고리 동시 실행)
    console.error(`[Parallel Analyzer] ⚡ Running 6 analyses in parallel...`);

    const [
      analystResult,
      fileResult,
      networkResult,
      mitreResult,
      cveResult,
      endpointResult,
    ] = await Promise.all([
      verifyAnalystJudgment(filteredData.analyst_verification),
      analyzeFileHashes(filteredData.file_hash_analysis),
      analyzeNetwork(filteredData.network_analysis),
      analyzeMITRE(filteredData.mitre_analysis),
      analyzeCVEs(filteredData.cve_analysis),
      analyzeEndpoints(filteredData.endpoint_analysis),
    ]);

    console.error(`[Parallel Analyzer] ✅ Parallel analyses complete`);
    console.error(`  - Analyst: ${analystResult.success ? '✅' : '❌'} (${analystResult.tokens_used || 0} tokens)`);
    console.error(`  - Files: ${fileResult.success ? '✅' : '❌'} (${fileResult.tokens_used || 0} tokens)`);
    console.error(`  - Network: ${networkResult.success ? '✅' : '❌'} (${networkResult.tokens_used || 0} tokens)`);
    console.error(`  - MITRE: ${mitreResult.success ? '✅' : '❌'} (${mitreResult.tokens_used || 0} tokens)`);
    console.error(`  - CVE: ${cveResult.success ? '✅' : '❌'} (${cveResult.tokens_used || 0} tokens)`);
    console.error(`  - Endpoints: ${endpointResult.success ? '✅' : '❌'} (${endpointResult.tokens_used || 0} tokens)`);

    // 3. 종합 분석 실행 (병렬 분석 결과를 입력으로)
    console.error(`[Parallel Analyzer] 🎯 Running synthesis...`);

    const synthesisResult = await synthesizeAnalyses(investigationData.incident_id, {
      analyst_verification: analystResult,
      file_hash_analysis: fileResult,
      network_analysis: networkResult,
      mitre_analysis: mitreResult,
      cve_analysis: cveResult,
      endpoint_analysis: endpointResult,
    });

    console.error(`[Parallel Analyzer] ✅ Synthesis complete (${synthesisResult.tokens_used || 0} tokens)`);

    // 4. 결과 집계
    const totalTokens =
      (analystResult.tokens_used || 0) +
      (fileResult.tokens_used || 0) +
      (networkResult.tokens_used || 0) +
      (mitreResult.tokens_used || 0) +
      (cveResult.tokens_used || 0) +
      (endpointResult.tokens_used || 0) +
      (synthesisResult.tokens_used || 0);

    const totalTime = Date.now() - startTime;

    console.error(`[Parallel Analyzer] 📊 Analysis Summary:`);
    console.error(`  - Total Tokens: ${totalTokens}`);
    console.error(`  - Total Time: ${totalTime}ms`);
    console.error(`  - Final Verdict: ${synthesisResult.final_verdict}`);
    console.error(`  - Overall Risk: ${synthesisResult.overall_risk_score}/100`);

    return {
      incident_id: investigationData.incident_id,
      analysis_timestamp: new Date().toISOString(),
      parallel_analyses: {
        analyst_verification: analystResult,
        file_hash_analysis: fileResult,
        network_analysis: networkResult,
        mitre_analysis: mitreResult,
        cve_analysis: cveResult,
        endpoint_analysis: endpointResult,
      },
      synthesis: synthesisResult,
      total_tokens: totalTokens,
      total_execution_time_ms: totalTime,
      success: true,
    };
  } catch (error) {
    console.error('[Parallel Analyzer] ❌ Error:', error);

    return {
      incident_id: investigationData.incident_id,
      analysis_timestamp: new Date().toISOString(),
      parallel_analyses: {},
      synthesis: {
        category: 'synthesis',
        success: false,
        final_verdict: 'needs_investigation',
        overall_risk_score: 50,
        error: error instanceof Error ? error.message : String(error),
      },
      total_tokens: 0,
      total_execution_time_ms: Date.now() - startTime,
      success: false,
    };
  }
}

/**
 * 병렬 분석 결과를 마크다운으로 포맷팅
 */
export function formatParallelAnalysisAsMarkdown(result: ParallelAnalysisResult): string {
  let md = `# 🤖 AI 병렬 분석 결과\n\n`;

  md += `**인시던트**: ${result.incident_id}\n`;
  md += `**분석 시간**: ${result.analysis_timestamp}\n`;
  md += `**실행 시간**: ${result.total_execution_time_ms}ms\n`;
  md += `**총 토큰**: ${result.total_tokens}\n\n`;

  md += `---\n\n`;

  // 종합 판단
  const s = result.synthesis;
  if (s && s.success) {
    md += `## 🎯 최종 판단\n\n`;
    md += `**Verdict**: \`${s.final_verdict}\`\n`;
    md += `**Overall Risk**: ${s.overall_risk_score}/100\n`;
    md += `**Confidence**: ${(s.confidence * 100).toFixed(0)}%\n\n`;
    md += `### Executive Summary\n${s.executive_summary}\n\n`;

    if (s.recommendations && s.recommendations.length > 0) {
      md += `### 📋 Recommendations\n`;
      s.recommendations.forEach((rec: string, idx: number) => {
        md += `${idx + 1}. ${rec}\n`;
      });
      md += `\n`;
    }
  }

  md += `---\n\n`;

  // 개별 분석 결과 요약
  md += `## 📊 개별 분석 요약\n\n`;

  const analyses = result.parallel_analyses;

  Object.entries(analyses).forEach(([key, analysis]: [string, any]) => {
    if (!analysis) return;

    const icon = analysis.success ? '✅' : '❌';
    const category = analysis.category || key;

    md += `### ${icon} ${category}\n`;
    md += `- **Risk Score**: ${analysis.risk_score}/10\n`;
    md += `- **Confidence**: ${(analysis.confidence * 100).toFixed(0)}%\n`;

    if (analysis.key_findings && analysis.key_findings.length > 0) {
      md += `- **Key Findings**: ${analysis.key_findings.join(', ')}\n`;
    }

    md += `- **Reasoning**: ${analysis.reasoning}\n`;
    md += `- **Tokens**: ${analysis.tokens_used || 0}\n\n`;
  });

  return md;
}
