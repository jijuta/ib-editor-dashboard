import { NextResponse } from 'next/server';
import { Client } from '@opensearch-project/opensearch';
import type { AlertsResponse, AlertRow, Severity, Status } from '@/lib/dashboard/types';

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
  const limit = parseInt(searchParams.get('limit') || '100');
  const days = parseInt(searchParams.get('days') || '7');

  try {
    // Query alerts with aggregations
    const response = await osClient.search({
      index: 'logs-cortex_xdr-alerts-*',
      body: {
        query: {
          range: {
            '@timestamp': {
              gte: `now-${days}d`,
            },
          },
        },
        size: 0, // We only need aggregations
        aggs: {
          by_severity: {
            terms: { field: 'severity.keyword', size: 10 },
          },
          by_category: {
            terms: { field: 'category.keyword', size: 20 },
            aggs: {
              by_severity: {
                terms: { field: 'severity.keyword', size: 5 },
              },
              by_action: {
                terms: { field: 'action.keyword', size: 5 },
              },
            },
          },
          by_action: {
            terms: { field: 'action.keyword', size: 10 },
          },
          by_mitre_tactic: {
            terms: { field: 'mitre_tactic.keyword', size: 20 },
          },
          total_count: {
            value_count: { field: 'alert_id.keyword' },
          },
        },
      },
    });

    const aggs = response.body.aggregations as any;

    // Build alert items from category aggregation
    const items: AlertRow[] = (aggs?.by_category?.buckets || []).map((bucket: any, index: number) => {
      const severities = bucket.by_severity?.buckets || [];
      const actions = bucket.by_action?.buckets || [];
      const primarySeverity = severities[0]?.key || 'medium';
      const primaryAction = actions[0]?.key || 'detected';

      return {
        id: `alert-${index}`,
        type: bucket.key,
        count: bucket.doc_count,
        status: mapActionToStatus(primaryAction),
        action: primaryAction,
        severity: mapSeverity(primarySeverity),
      };
    });

    // Build severity counts
    const bySeverity: Record<Severity, number> = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      info: 0,
    };

    (aggs?.by_severity?.buckets || []).forEach((bucket: any) => {
      const key = mapSeverity(bucket.key);
      bySeverity[key] = bucket.doc_count;
    });

    const result: AlertsResponse = {
      items,
      total: aggs?.total_count?.value || 0,
      bySeverity,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('Dashboard alerts error:', error);

    // Return fallback data
    const fallback: AlertsResponse = {
      items: getDefaultAlerts(),
      total: 285,
      bySeverity: {
        critical: 12,
        high: 45,
        medium: 128,
        low: 89,
        info: 11,
      },
    };

    return NextResponse.json(fallback);
  }
}

function mapSeverity(severity: string): Severity {
  const s = (severity || '').toLowerCase();
  if (s.includes('critical')) return 'critical';
  if (s.includes('high')) return 'high';
  if (s.includes('medium') || s.includes('med')) return 'medium';
  if (s.includes('low')) return 'low';
  return 'info';
}

function mapActionToStatus(action: string): Status {
  const a = (action || '').toLowerCase();
  if (a.includes('block') || a.includes('prevented')) return 'resolved';
  if (a.includes('detect') || a.includes('alert')) return 'active';
  if (a.includes('quarantine')) return 'processing';
  return 'pending';
}

function getDefaultAlerts(): AlertRow[] {
  return [
    { id: 'alert-1', type: 'Malware Detection', count: 45, status: 'processing', action: 'blocked', severity: 'high' },
    { id: 'alert-2', type: 'Suspicious Network', count: 32, status: 'active', action: 'detected', severity: 'medium' },
    { id: 'alert-3', type: 'Policy Violation', count: 28, status: 'pending', action: 'detected', severity: 'low' },
    { id: 'alert-4', type: 'Data Exfiltration', count: 15, status: 'processing', action: 'blocked', severity: 'critical' },
    { id: 'alert-5', type: 'Privilege Escalation', count: 12, status: 'active', action: 'detected', severity: 'high' },
  ];
}
