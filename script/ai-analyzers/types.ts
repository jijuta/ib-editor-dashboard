/**
 * AI Analyzer Types
 * 모든 분석기가 공유하는 타입 정의
 */

export interface AnalysisResult {
  category: string;
  success: boolean;
  confidence: number;
  risk_score: number;  // 0-10
  key_findings: string[];
  reasoning: string;
  tokens_used?: number;
  execution_time_ms?: number;
  error?: string;
}

export interface AnalystVerificationResult extends AnalysisResult {
  category: 'analyst_judgment';
  agrees_with_analyst: boolean;
}

export interface FileHashAnalysisResult extends AnalysisResult {
  category: 'file_artifacts';
  threat_count: number;
  suspicious_count: number;
  critical_files: string[];
}

export interface NetworkAnalysisResult extends AnalysisResult {
  category: 'network_connections';
  suspicious_ips: number;
  malicious_connections: string[];
}

export interface MITREAnalysisResult extends AnalysisResult {
  category: 'mitre_techniques';
  techniques_verified: string[];
  relevant_techniques: number;
}

export interface CVEAnalysisResult extends AnalysisResult {
  category: 'cve_vulnerabilities';
  verified_cves: number;
  false_positives: number;
  critical_vulnerabilities: string[];
}

export interface EndpointAnalysisResult extends AnalysisResult {
  category: 'endpoint_vulnerability';
  vulnerable_endpoints: number;
  high_risk_endpoints: string[];
}

export interface SynthesisResult extends AnalysisResult {
  category: 'synthesis';
  final_verdict: 'true_positive' | 'false_positive' | 'benign' | 'needs_investigation';
  overall_risk_score: number;  // 0-100
  executive_summary: string;
  recommendations: string[];
}
