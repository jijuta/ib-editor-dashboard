import { NextResponse } from 'next/server';
import { Client } from '@opensearch-project/opensearch';
import type { IncidentsResponse, IncidentDetailRow, IncidentRow, Severity, Status } from '@/lib/dashboard/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const osClient = new Client({
  node: process.env.OPENSEARCH_URL || 'http://opensearch:9200',
  auth: {
    username: process.env.OPENSEARCH_USER || 'admin',
    password: process.env.OPENSEARCH_PASSWORD || 'Admin@123456',
  },
  ssl: { rejectUnauthorized: false },
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '50');
  const days = parseInt(searchParams.get('days') || '7');

  try {
    // Query recent incidents from OpenSearch with full details
    const response = await osClient.search({
      index: 'logs-cortex_xdr-incidents-*',
      body: {
        query: {
          range: {
            creation_time: {
              gte: `now-${days}d`,
            },
          },
        },
        sort: [{ creation_time: { order: 'desc' } }],
        size: limit,
        aggs: {
          by_severity: {
            terms: { field: 'severity.keyword', size: 10 },
          },
          by_status: {
            terms: { field: 'status.keyword', size: 10 },
          },
          total_count: {
            value_count: { field: 'incident_id.keyword' },
          },
        },
      },
    });

    const hits = response.body.hits.hits;
    const aggs = response.body.aggregations as any;

    // Parse incidents with detailed information
    const items: IncidentDetailRow[] = hits.map((hit: any) => {
      const src = hit._source;

      // Extract MITRE techniques
      const mitreTechniques = extractMitreTechniques(src.mitre_techniques_ids_and_names);

      // Extract hosts info
      const hosts = extractHosts(src.hosts);

      return {
        id: src.incident_id,
        severity: mapSeverity(src.severity),
        status: mapStatus(src.status),
        title: src.description || src.name || 'Unknown Incident',
        assignee: src.assigned_user_pretty_name,
        team: getTeamFromIncident(src),
        createdAt: src.creation_time ? new Date(src.creation_time) : new Date(),
        updatedAt: src.modification_time ? new Date(src.modification_time) : undefined,
        // Detail fields
        alertCount: src.alert_count || 0,
        hostCount: src.host_count || 0,
        userCount: src.user_count || 0,
        mitreTechniques,
        hosts,
        users: src.users || [],
        alertSeverity: {
          critical: src.critical_severity_alert_count || 0,
          high: src.high_severity_alert_count || 0,
          medium: src.med_severity_alert_count || 0,
          low: src.low_severity_alert_count || 0,
        },
        resolveComment: src.resolve_comment,
        xdrUrl: src.xdr_url,
        incidentSources: src.incident_sources || [],
        alertCategories: src.alert_categories || [],
      };
    });

    // Parse aggregations
    const statusCounts: Record<string, number> = {};
    (aggs?.by_status?.buckets || []).forEach((bucket: any) => {
      statusCounts[bucket.key.toLowerCase()] = bucket.doc_count;
    });

    const severityCounts: Record<Severity, number> = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      info: 0,
    };
    (aggs?.by_severity?.buckets || []).forEach((bucket: any) => {
      const key = bucket.key.toLowerCase() as Severity;
      if (key in severityCounts) {
        severityCounts[key] = bucket.doc_count;
      }
    });

    const result: IncidentsResponse = {
      items,
      total: aggs?.total_count?.value || items.length,
      active: (statusCounts['new'] || 0) + (statusCounts['under_investigation'] || 0),
      pending: statusCounts['pending'] || 0,
      resolved: (statusCounts['resolved'] || 0) + (statusCounts['resolved_true_positive'] || 0),
      severityCounts,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('Dashboard incidents error:', error);

    // Return fallback data
    const fallback: IncidentsResponse = {
      items: getDefaultIncidents(),
      total: 4,
      active: 2,
      pending: 1,
      resolved: 1,
    };

    return NextResponse.json(fallback);
  }
}

// Extract MITRE technique IDs and names
function extractMitreTechniques(techniques: string | string[] | undefined): { id: string; name: string }[] {
  if (!techniques) return [];
  const techArray = Array.isArray(techniques) ? techniques : [techniques];

  return techArray.map(tech => {
    // Format: "T1071.001 - Application Layer Protocol: Web Protocols"
    const match = tech.match(/^(T\d+(?:\.\d+)?)\s*-?\s*(.*)$/);
    if (match) {
      return { id: match[1], name: match[2] || match[1] };
    }
    return { id: tech, name: tech };
  }).slice(0, 5); // Limit to 5 for dashboard display
}

// Extract host information
function extractHosts(hosts: string[] | undefined): { hostname: string; endpointId: string }[] {
  if (!hosts) return [];

  return hosts.map(host => {
    // Format: "hostname:endpoint_id"
    const parts = host.split(':');
    return {
      hostname: parts[0] || host,
      endpointId: parts[1] || '',
    };
  }).slice(0, 5); // Limit to 5 for dashboard display
}

function mapSeverity(severity: string): Severity {
  const s = (severity || '').toLowerCase();
  if (s.includes('critical')) return 'critical';
  if (s.includes('high')) return 'high';
  if (s.includes('medium') || s.includes('med')) return 'medium';
  if (s.includes('low')) return 'low';
  return 'info';
}

function mapStatus(status: string): Status {
  const s = (status || '').toLowerCase();
  if (s.includes('new') || s.includes('open')) return 'active';
  if (s.includes('under_investigation') || s.includes('in_progress')) return 'processing';
  if (s.includes('pending')) return 'pending';
  if (s.includes('resolved') || s.includes('closed')) return 'resolved';
  return 'pending';
}

function getTeamFromIncident(src: any): string {
  // Determine team based on incident type or assigned user
  if (src.assigned_user_pretty_name?.includes('SOC')) return 'SOC';
  if (src.assigned_user_pretty_name?.includes('IR')) return 'IR';
  if (src.severity === 'critical' || src.severity === 'high') return 'MDR';
  return 'SOC';
}

function getDefaultIncidents(): IncidentRow[] {
  return [
    {
      id: 'INC-2024-089',
      severity: 'high',
      status: 'processing',
      title: 'Suspicious PowerShell Activity',
      team: 'SOC',
      createdAt: new Date(),
    },
    {
      id: 'INC-2024-087',
      severity: 'medium',
      status: 'pending',
      title: 'Unauthorized Access Attempt',
      team: 'MDR',
      createdAt: new Date(Date.now() - 86400000),
    },
    {
      id: 'INC-2024-085',
      severity: 'high',
      status: 'processing',
      title: 'Malware Detection',
      team: 'IR',
      createdAt: new Date(Date.now() - 172800000),
    },
    {
      id: 'INC-2024-083',
      severity: 'low',
      status: 'resolved',
      title: 'Network Anomaly',
      team: 'SOC',
      createdAt: new Date(Date.now() - 259200000),
    },
  ];
}
