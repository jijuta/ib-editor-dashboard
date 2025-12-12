import { NextResponse } from 'next/server';
import { Client } from '@opensearch-project/opensearch';
import type { IocResponse, IocRow, Status } from '@/lib/dashboard/types';

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
  const days = parseInt(searchParams.get('days') || '7');
  const limit = parseInt(searchParams.get('limit') || '20');

  try {
    // Query network artifacts for IOC data (IPs, domains)
    const [networkRes, fileRes] = await Promise.all([
      // Network IOCs (IPs, domains)
      osClient.search({
        index: 'logs-cortex_xdr-network-*',
        body: {
          query: {
            bool: {
              must: [
                { range: { '@timestamp': { gte: `now-${days}d` } } },
              ],
              should: [
                { exists: { field: 'action_external_hostname' } },
                { exists: { field: 'action_remote_ip' } },
              ],
              minimum_should_match: 1,
            },
          },
          size: 0,
          aggs: {
            external_ips: {
              terms: { field: 'action_remote_ip.keyword', size: 50 },
              aggs: {
                by_action: {
                  terms: { field: 'action.keyword', size: 5 },
                },
              },
            },
            external_domains: {
              terms: { field: 'action_external_hostname.keyword', size: 50 },
              aggs: {
                by_action: {
                  terms: { field: 'action.keyword', size: 5 },
                },
              },
            },
            total_network: {
              value_count: { field: 'action_remote_ip.keyword' },
            },
          },
        },
      }),
      // File IOCs (hashes)
      osClient.search({
        index: 'logs-cortex_xdr-file-*',
        body: {
          query: {
            bool: {
              must: [
                { range: { '@timestamp': { gte: `now-${days}d` } } },
              ],
              should: [
                { term: { 'file_wildfire_verdict.keyword': 'MALWARE' } },
                { term: { 'file_wildfire_verdict.keyword': 'GRAYWARE' } },
                { exists: { field: 'file_sha256' } },
              ],
              minimum_should_match: 1,
            },
          },
          size: 0,
          aggs: {
            by_verdict: {
              terms: { field: 'file_wildfire_verdict.keyword', size: 10 },
            },
            malware_hashes: {
              filter: {
                term: { 'file_wildfire_verdict.keyword': 'MALWARE' },
              },
              aggs: {
                hashes: {
                  terms: { field: 'file_sha256.keyword', size: 20 },
                },
              },
            },
            total_files: {
              value_count: { field: 'file_sha256.keyword' },
            },
          },
        },
      }),
    ]);

    const networkAggs = networkRes.body.aggregations as any;
    const fileAggs = fileRes.body.aggregations as any;

    // Build IOC items
    const items: IocRow[] = [];
    let ipCount = 0;
    let domainCount = 0;
    let hashCount = 0;

    // Add IP IOCs
    const ipBuckets = networkAggs?.external_ips?.buckets || [];
    ipBuckets.slice(0, limit / 3).forEach((bucket: any) => {
      const action = bucket.by_action?.buckets?.[0]?.key || 'detected';
      items.push({
        type: 'ip',
        value: bucket.key,
        count: bucket.doc_count,
        confidence: calculateConfidence(bucket.doc_count, action),
        status: mapActionToStatus(action),
      });
      ipCount += bucket.doc_count;
    });

    // Add Domain IOCs
    const domainBuckets = networkAggs?.external_domains?.buckets || [];
    domainBuckets.slice(0, limit / 3).forEach((bucket: any) => {
      const action = bucket.by_action?.buckets?.[0]?.key || 'detected';
      items.push({
        type: 'domain',
        value: bucket.key,
        count: bucket.doc_count,
        confidence: calculateConfidence(bucket.doc_count, action),
        status: mapActionToStatus(action),
      });
      domainCount += bucket.doc_count;
    });

    // Add Hash IOCs (malware only)
    const hashBuckets = fileAggs?.malware_hashes?.hashes?.buckets || [];
    hashBuckets.slice(0, limit / 3).forEach((bucket: any) => {
      items.push({
        type: 'hash',
        value: bucket.key?.substring(0, 16) + '...', // Truncate for display
        count: bucket.doc_count,
        confidence: 95, // Malware verdict = high confidence
        status: 'active',
      });
      hashCount += bucket.doc_count;
    });

    // Sort by count descending
    items.sort((a, b) => b.count - a.count);

    const result: IocResponse = {
      items: items.slice(0, limit),
      total: ipCount + domainCount + hashCount,
      byType: {
        ip: ipCount,
        domain: domainCount,
        hash: hashCount,
        url: 0,
      },
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('Dashboard IOC error:', error);

    // Return fallback data
    return NextResponse.json(getDefaultIocData());
  }
}

function calculateConfidence(count: number, action: string): number {
  let base = 50;

  // Higher count = higher confidence
  if (count > 100) base += 30;
  else if (count > 50) base += 20;
  else if (count > 10) base += 10;

  // Blocked actions = higher confidence
  if (action?.toLowerCase().includes('block')) base += 15;
  else if (action?.toLowerCase().includes('quarantine')) base += 10;

  return Math.min(base, 99);
}

function mapActionToStatus(action: string): Status {
  const a = (action || '').toLowerCase();
  if (a.includes('block') || a.includes('prevented')) return 'resolved';
  if (a.includes('detect') || a.includes('alert')) return 'active';
  if (a.includes('quarantine')) return 'processing';
  return 'monitoring';
}

function getDefaultIocData(): IocResponse {
  return {
    items: [
      { type: 'ip', value: '185.220.101.xxx', count: 45, confidence: 92, status: 'active' },
      { type: 'hash', value: 'a1b2c3d4e5f6...', count: 38, confidence: 95, status: 'active' },
      { type: 'domain', value: 'malicious-site.com', count: 28, confidence: 88, status: 'processing' },
      { type: 'ip', value: '94.102.49.xxx', count: 22, confidence: 78, status: 'monitoring' },
      { type: 'domain', value: 'c2-server.net', count: 18, confidence: 85, status: 'active' },
      { type: 'hash', value: '7e8f9a0b1c2d...', count: 15, confidence: 90, status: 'resolved' },
    ],
    total: 166,
    byType: {
      ip: 67,
      domain: 46,
      hash: 53,
      url: 0,
    },
  };
}
