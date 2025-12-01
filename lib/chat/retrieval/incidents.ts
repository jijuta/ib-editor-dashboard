/**
 * OpenSearch Incident Search
 * Searches Cortex XDR incidents for relevant context
 */

import { Client } from '@opensearch-project/opensearch';
import type { ContextSource, IncidentContext } from '../types';

// OpenSearch client singleton
let client: Client | null = null;

function getClient(): Client {
  if (!client) {
    client = new Client({
      node: process.env.OPENSEARCH_URL || 'http://opensearch:9200',
      auth: {
        username: process.env.OPENSEARCH_USER || 'admin',
        password: process.env.OPENSEARCH_PASSWORD || 'Admin@123456',
      },
      ssl: {
        rejectUnauthorized: false,
      },
    });
  }
  return client;
}

// Configuration
const INCIDENTS_INDEX = 'logs-cortex_xdr-incidents-*';
const DEFAULT_TOP_K = 5;

/**
 * Search incidents by text query
 * @param query - Search query text
 * @param options - Search options
 * @returns Relevant incident context sources
 */
export async function searchIncidents(
  query: string,
  options: {
    topK?: number;
    severity?: string[];
    daysBack?: number;
  } = {}
): Promise<ContextSource[]> {
  const { topK = DEFAULT_TOP_K, severity, daysBack = 30 } = options;

  try {
    const opensearch = getClient();

    const must: object[] = [
      {
        multi_match: {
          query,
          fields: [
            'description^3',
            'incident_name^2',
            'host_name',
            'user_name',
            'alerts.alert_name',
            'mitre_technique_id_causer',
          ],
          type: 'best_fields',
          fuzziness: 'AUTO',
        },
      },
    ];

    // Add date filter
    must.push({
      range: {
        creation_time: {
          gte: `now-${daysBack}d`,
        },
      },
    });

    // Add severity filter if specified
    if (severity && severity.length > 0) {
      must.push({
        terms: {
          'severity.keyword': severity,
        },
      });
    }

    const response = await opensearch.search({
      index: INCIDENTS_INDEX,
      body: {
        query: {
          bool: {
            must,
          },
        },
        sort: [
          { _score: { order: 'desc' } },
          { creation_time: { order: 'desc' } },
        ],
        size: topK,
        _source: [
          'incident_id',
          'description',
          'severity',
          'status',
          'incident_name',
          'host_name',
          'user_name',
          'creation_time',
          'mitre_technique_id_causer',
        ],
      },
    });

    const hits = response.body.hits?.hits || [];

    return hits
      .filter((hit) => hit._source !== undefined)
      .map((hit) => {
        const source = hit._source as IncidentContext & {
          incident_name?: string;
          host_name?: string;
          user_name?: string;
          mitre_technique_id_causer?: string;
        };

        // Build content summary
        const parts: string[] = [];
        if (source.description) parts.push(source.description);
        if (source.incident_name) parts.push(`Incident: ${source.incident_name}`);
        if (source.host_name) parts.push(`Host: ${source.host_name}`);
        if (source.user_name) parts.push(`User: ${source.user_name}`);
        if (source.mitre_technique_id_causer) {
          parts.push(`MITRE: ${source.mitre_technique_id_causer}`);
        }

        return {
          type: 'incident' as const,
          id: `incident:${source.incident_id}`,
          title: source.incident_name || `Incident ${source.incident_id}`,
          content: parts.join('\n'),
          score: ((hit._score as number | undefined) ?? 1) / 10, // Normalize score
          metadata: {
            incident_id: source.incident_id,
            severity: source.severity,
            status: source.status,
            created_time: source.created_time,
          },
        };
      });
  } catch (error) {
    console.error('[incidents] Search error:', error);
    return [];
  }
}

/**
 * Search incidents by MITRE technique ID
 * @param techniqueId - MITRE ATT&CK technique ID (e.g., 'T1059')
 * @param topK - Number of results
 * @returns Relevant incident context sources
 */
export async function searchIncidentsByMITRE(
  techniqueId: string,
  topK: number = 3
): Promise<ContextSource[]> {
  try {
    const opensearch = getClient();

    const response = await opensearch.search({
      index: INCIDENTS_INDEX,
      body: {
        query: {
          bool: {
            should: [
              { match: { 'mitre_technique_id_causer': techniqueId } },
              { match: { 'alerts.mitre_technique_id': techniqueId } },
            ],
            minimum_should_match: 1,
          },
        },
        sort: [{ creation_time: { order: 'desc' } }],
        size: topK,
        _source: [
          'incident_id',
          'description',
          'severity',
          'status',
          'incident_name',
          'mitre_technique_id_causer',
          'creation_time',
        ],
      },
    });

    const hits = response.body.hits?.hits || [];

    return hits
      .filter((hit) => hit._source !== undefined)
      .map((hit) => {
        const source = hit._source as IncidentContext & {
          incident_name?: string;
          mitre_technique_id_causer?: string;
        };

        return {
          type: 'incident' as const,
          id: `incident:${source.incident_id}`,
          title: source.incident_name || `Incident ${source.incident_id}`,
          content: source.description || '',
          score: 0.8, // Fixed score for MITRE matches
          metadata: {
            incident_id: source.incident_id,
            severity: source.severity,
            status: source.status,
            mitre_technique: source.mitre_technique_id_causer,
          },
        };
      });
  } catch (error) {
    console.error('[incidents] MITRE search error:', error);
    return [];
  }
}

/**
 * Search incidents by entity (host, user, IP, hash)
 * @param entity - Entity value to search
 * @param entityType - Type of entity
 * @param topK - Number of results
 */
export async function searchIncidentsByEntity(
  entity: string,
  entityType: 'host' | 'user' | 'ip' | 'hash',
  topK: number = 3
): Promise<ContextSource[]> {
  const fieldMap: Record<string, string[]> = {
    host: ['host_name.keyword', 'endpoints.endpoint_name'],
    user: ['user_name.keyword', 'users.user_name'],
    ip: ['host_ip', 'network_artifacts.remote_ip'],
    hash: ['file_artifacts.sha256', 'file_artifacts.md5'],
  };

  const fields = fieldMap[entityType] || ['*'];

  try {
    const opensearch = getClient();

    const should = fields.map((field) => ({
      term: { [field]: entity },
    }));

    const response = await opensearch.search({
      index: INCIDENTS_INDEX,
      body: {
        query: {
          bool: {
            should,
            minimum_should_match: 1,
          },
        },
        sort: [{ creation_time: { order: 'desc' } }],
        size: topK,
        _source: [
          'incident_id',
          'description',
          'severity',
          'status',
          'incident_name',
          'creation_time',
        ],
      },
    });

    const hits = response.body.hits?.hits || [];

    return hits
      .filter((hit) => hit._source !== undefined)
      .map((hit) => {
        const source = hit._source as IncidentContext & { incident_name?: string };

        return {
          type: 'incident' as const,
          id: `incident:${source.incident_id}`,
          title: source.incident_name || `Incident ${source.incident_id}`,
          content: source.description || '',
          score: 0.7,
          metadata: {
            incident_id: source.incident_id,
            severity: source.severity,
            entity_type: entityType,
            entity_value: entity,
          },
        };
      });
  } catch (error) {
    console.error('[incidents] Entity search error:', error);
    return [];
  }
}

/**
 * Test OpenSearch connection
 */
export async function testOpenSearchConnection(): Promise<boolean> {
  try {
    const opensearch = getClient();
    const response = await opensearch.cluster.health();
    return response.body.status !== 'red';
  } catch {
    return false;
  }
}

/**
 * Get incident count for date range
 */
export async function getIncidentCount(daysBack: number = 7): Promise<number> {
  try {
    const opensearch = getClient();
    const response = await opensearch.count({
      index: INCIDENTS_INDEX,
      body: {
        query: {
          range: {
            creation_time: {
              gte: `now-${daysBack}d`,
            },
          },
        },
      },
    });
    return response.body.count || 0;
  } catch {
    return 0;
  }
}
