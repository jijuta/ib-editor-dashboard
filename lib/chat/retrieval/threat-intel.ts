/**
 * Threat Intelligence Search
 * Searches PostgreSQL TI database for IOCs, MITRE techniques, and CVEs
 */

import { queryN8N } from '@/lib/db/postgres-n8n';
import type { ContextSource, MITREContext, ThreatIntelContext } from '../types';

// Configuration
const DEFAULT_TOP_K = 5;

/**
 * Search MITRE ATT&CK techniques by ID or name
 * @param query - Search query (technique ID or name)
 * @param topK - Number of results
 * @returns MITRE context sources
 */
export async function searchMITRETechniques(
  query: string,
  topK: number = DEFAULT_TOP_K
): Promise<ContextSource[]> {
  try {
    // Check if query looks like a technique ID (T1xxx format)
    const isTechniqueId = /^T\d{4}/.test(query.toUpperCase());

    let results: MITREContext[];

    if (isTechniqueId) {
      // Exact match on technique ID
      results = await queryN8N<MITREContext>(
        `SELECT
          technique_id,
          technique_name,
          tactic,
          description
        FROM ioclog.ti_mitre
        WHERE technique_id ILIKE $1
        LIMIT $2`,
        [`${query}%`, topK]
      );
    } else {
      // Full-text search on name and description
      results = await queryN8N<MITREContext>(
        `SELECT
          technique_id,
          technique_name,
          tactic,
          description
        FROM ioclog.ti_mitre
        WHERE technique_name ILIKE $1
          OR description ILIKE $1
        ORDER BY
          CASE WHEN technique_name ILIKE $1 THEN 0 ELSE 1 END,
          technique_id
        LIMIT $2`,
        [`%${query}%`, topK]
      );
    }

    return results.map((mitre) => ({
      type: 'mitre' as const,
      id: `mitre:${mitre.technique_id}`,
      title: `${mitre.technique_id}: ${mitre.technique_name}`,
      content: `[${mitre.tactic}] ${mitre.description}`,
      score: 0.9, // High confidence for MITRE matches
      metadata: {
        technique_id: mitre.technique_id,
        tactic: mitre.tactic,
      },
    }));
  } catch (error) {
    console.error('[threat-intel] MITRE search error:', error);
    return [];
  }
}

/**
 * Search MITRE techniques by tactic
 * @param tactic - Tactic name (e.g., 'Execution', 'Persistence')
 * @param topK - Number of results
 */
export async function searchMITREByTactic(
  tactic: string,
  topK: number = 10
): Promise<ContextSource[]> {
  try {
    const results = await queryN8N<MITREContext>(
      `SELECT
        technique_id,
        technique_name,
        tactic,
        description
      FROM ioclog.ti_mitre
      WHERE tactic ILIKE $1
      ORDER BY incident_count DESC NULLS LAST
      LIMIT $2`,
      [`%${tactic}%`, topK]
    );

    return results.map((mitre) => ({
      type: 'mitre' as const,
      id: `mitre:${mitre.technique_id}`,
      title: `${mitre.technique_id}: ${mitre.technique_name}`,
      content: `[${mitre.tactic}] ${mitre.description}`,
      score: 0.8,
      metadata: {
        technique_id: mitre.technique_id,
        tactic: mitre.tactic,
      },
    }));
  } catch (error) {
    console.error('[threat-intel] Tactic search error:', error);
    return [];
  }
}

/**
 * Check hash against threat intelligence database
 * @param hash - SHA256 or MD5 hash
 * @returns Threat intel context if found
 */
export async function checkHashThreatIntel(
  hash: string
): Promise<ContextSource | null> {
  if (!hash || hash.length < 32) {
    return null;
  }

  try {
    const results = await queryN8N<ThreatIntelContext & { context?: Record<string, unknown> }>(
      `SELECT
        ioc_value,
        ioc_type,
        threat_level,
        severity,
        source,
        context
      FROM public.ioc_simple
      WHERE ioc_type IN ('sha256', 'md5')
        AND ioc_value = $1
      LIMIT 1`,
      [hash.toLowerCase()]
    );

    if (results.length === 0) {
      return null;
    }

    const ti = results[0];
    const verdict =
      ti.threat_level >= 50
        ? 'MALICIOUS'
        : ti.threat_level >= 1
        ? 'SUSPICIOUS'
        : 'UNKNOWN';

    return {
      type: 'threat_intel' as const,
      id: `hash:${ti.ioc_value}`,
      title: `Hash: ${ti.ioc_value.slice(0, 16)}...`,
      content: `Verdict: ${verdict}\nThreat Level: ${ti.threat_level}/100\nSeverity: ${ti.severity}\nSource: ${ti.source}`,
      score: ti.threat_level / 100,
      metadata: {
        ioc_type: ti.ioc_type,
        threat_level: ti.threat_level,
        severity: ti.severity,
        source: ti.source,
      },
    };
  } catch (error) {
    console.error('[threat-intel] Hash check error:', error);
    return null;
  }
}

/**
 * Check IP address against threat intelligence
 * @param ip - IP address
 * @returns Threat intel context if found
 */
export async function checkIPThreatIntel(
  ip: string
): Promise<ContextSource | null> {
  // Basic IP validation
  if (!ip || !/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(ip)) {
    return null;
  }

  try {
    const results = await queryN8N<ThreatIntelContext>(
      `SELECT
        ioc_value,
        ioc_type,
        threat_level,
        severity,
        source
      FROM public.ioc_simple
      WHERE ioc_type = 'ipv4'
        AND ioc_value = $1
      LIMIT 1`,
      [ip]
    );

    if (results.length === 0) {
      return null;
    }

    const ti = results[0];
    const verdict =
      ti.threat_level >= 50
        ? 'MALICIOUS'
        : ti.threat_level >= 1
        ? 'SUSPICIOUS'
        : 'UNKNOWN';

    return {
      type: 'threat_intel' as const,
      id: `ip:${ti.ioc_value}`,
      title: `IP: ${ti.ioc_value}`,
      content: `Verdict: ${verdict}\nThreat Level: ${ti.threat_level}/100\nSeverity: ${ti.severity}\nSource: ${ti.source}`,
      score: ti.threat_level / 100,
      metadata: {
        ioc_type: ti.ioc_type,
        threat_level: ti.threat_level,
        severity: ti.severity,
        source: ti.source,
      },
    };
  } catch (error) {
    console.error('[threat-intel] IP check error:', error);
    return null;
  }
}

/**
 * Search CVE details
 * @param cveId - CVE ID (e.g., 'CVE-2024-1234')
 * @returns CVE context source
 */
export async function searchCVE(
  cveId: string
): Promise<ContextSource | null> {
  if (!cveId || !cveId.toUpperCase().startsWith('CVE-')) {
    return null;
  }

  try {
    const results = await queryN8N<{
      cve_id: string;
      description: string;
      cvss_score: number;
      severity: string;
      published_date: string;
    }>(
      `SELECT
        cve_id,
        description,
        cvss_score,
        severity,
        published_date
      FROM ioclog.ti_cve
      WHERE cve_id = $1
      LIMIT 1`,
      [cveId.toUpperCase()]
    );

    if (results.length === 0) {
      return null;
    }

    const cve = results[0];

    return {
      type: 'threat_intel' as const,
      id: `cve:${cve.cve_id}`,
      title: cve.cve_id,
      content: `CVSS: ${cve.cvss_score} (${cve.severity})\n${cve.description}`,
      score: cve.cvss_score / 10,
      metadata: {
        cve_id: cve.cve_id,
        cvss_score: cve.cvss_score,
        severity: cve.severity,
        published_date: cve.published_date,
      },
    };
  } catch (error) {
    console.error('[threat-intel] CVE search error:', error);
    return null;
  }
}

/**
 * Extract entities from query text for TI lookup
 * @param text - Query text
 * @returns Extracted entities
 */
export function extractEntitiesFromQuery(text: string): {
  hashes: string[];
  ips: string[];
  cves: string[];
  mitreTechniques: string[];
} {
  // SHA256 hashes (64 hex chars)
  const sha256Regex = /\b[a-fA-F0-9]{64}\b/g;
  // MD5 hashes (32 hex chars)
  const md5Regex = /\b[a-fA-F0-9]{32}\b/g;
  // IPv4 addresses
  const ipRegex = /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g;
  // CVE IDs
  const cveRegex = /CVE-\d{4}-\d{4,7}/gi;
  // MITRE technique IDs
  const mitreRegex = /T\d{4}(?:\.\d{3})?/gi;

  const hashes = [
    ...new Set([
      ...(text.match(sha256Regex) || []),
      ...(text.match(md5Regex) || []),
    ]),
  ];

  return {
    hashes: hashes.map((h) => h.toLowerCase()),
    ips: [...new Set(text.match(ipRegex) || [])],
    cves: [...new Set(text.match(cveRegex) || [])].map((c) => c.toUpperCase()),
    mitreTechniques: [...new Set(text.match(mitreRegex) || [])].map((t) =>
      t.toUpperCase()
    ),
  };
}

/**
 * Search all TI sources based on extracted entities
 * @param query - Query text
 * @returns All relevant TI context sources
 */
export async function searchThreatIntel(query: string): Promise<ContextSource[]> {
  const entities = extractEntitiesFromQuery(query);
  const results: ContextSource[] = [];

  // Search MITRE techniques
  if (entities.mitreTechniques.length > 0) {
    for (const technique of entities.mitreTechniques.slice(0, 3)) {
      const mitreResults = await searchMITRETechniques(technique, 2);
      results.push(...mitreResults);
    }
  }

  // Check hashes
  for (const hash of entities.hashes.slice(0, 5)) {
    const hashResult = await checkHashThreatIntel(hash);
    if (hashResult) {
      results.push(hashResult);
    }
  }

  // Check IPs
  for (const ip of entities.ips.slice(0, 5)) {
    const ipResult = await checkIPThreatIntel(ip);
    if (ipResult) {
      results.push(ipResult);
    }
  }

  // Search CVEs
  for (const cve of entities.cves.slice(0, 3)) {
    const cveResult = await searchCVE(cve);
    if (cveResult) {
      results.push(cveResult);
    }
  }

  // If no entities found, try MITRE name search
  if (results.length === 0 && query.length > 5) {
    const mitreResults = await searchMITRETechniques(query, 3);
    results.push(...mitreResults);
  }

  return results;
}

/**
 * Test TI database connection
 */
export async function testThreatIntelConnection(): Promise<boolean> {
  try {
    const result = await queryN8N<{ exists: boolean }>(
      `SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'ioclog'
        AND table_name = 'ti_mitre'
      ) as exists`
    );
    return result[0]?.exists || false;
  } catch {
    return false;
  }
}
