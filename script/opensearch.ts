// @ts-nocheck
import { Client } from '@opensearch-project/opensearch'

class OpenSearchService {
  public client: Client

  constructor() {
    this.client = new Client({
      node: process.env.OPENSEARCH_URL || 'http://opensearch:9200',
      auth: {
        username: process.env.OPENSEARCH_USER || 'admin',
        password: process.env.OPENSEARCH_PASSWORD || 'Admin@123456'
      },
      ssl: {
        rejectUnauthorized: false
      }
    })
  }

  // Get recent events for a specific vendor or all vendors
  async getRecentEvents(vendor?: string, limit = 100) {
    const index = vendor ? `logs-${vendor.toLowerCase()}-*` : 'logs-*'
    
    try {
      const response = await this.client.search({
        index,
        body: {
          query: {
            range: {
              '@timestamp': {
                gte: 'now-5m'
              }
            }
          },
          sort: [{ '@timestamp': { order: 'desc' } }],
          size: limit
        }
      })
      
      return response.body.hits.hits
    } catch (error) {
      console.error('Error fetching recent events:', error)
      return []
    }
  }

  // Get statistics for each vendor
  async getVendorStats(vendor?: string) {
    const vendors = vendor ? [vendor] : ['crowdstrike', 'cisco', 'fortinet', 'cortex']
    const stats: any = {}
    
    for (const v of vendors) {
      try {
        // Get total count
        const countResponse = await this.client.count({
          index: `logs-${v}-*`
        })
        
        // Get severity aggregation
        const severityResponse = await this.client.search({
          index: `logs-${v}-*`,
          body: {
            size: 0,
            aggs: {
              severity: {
                terms: {
                  field: 'severity.keyword',
                  size: 10
                }
              }
            }
          }
        })
        
        // Get recent events count (last 24h)
        const recentResponse = await this.client.count({
          index: `logs-${v}-*`,
          body: {
            query: {
              range: {
                '@timestamp': {
                  gte: 'now-24h'
                }
              }
            }
          }
        })
        
        stats[v] = {
          total: countResponse.body.count || 0,
          recent24h: recentResponse.body.count || 0,
          severity: severityResponse.body.aggregations?.severity?.buckets || [],
          critical: 0,
          high: 0,
          medium: 0,
          low: 0
        }
        
        // Parse severity counts
        stats[v].severity.forEach((bucket: any) => {
          const sev = bucket.key.toLowerCase()
          if (sev === 'critical') stats[v].critical = bucket.doc_count
          else if (sev === 'high') stats[v].high = bucket.doc_count
          else if (sev === 'medium') stats[v].medium = bucket.doc_count
          else if (sev === 'low') stats[v].low = bucket.doc_count
        })
      } catch (error) {
        console.error(`Error fetching stats for ${v}:`, error)
        stats[v] = {
          total: 0,
          recent24h: 0,
          severity: [],
          critical: 0,
          high: 0,
          medium: 0,
          low: 0
        }
      }
    }
    
    return stats
  }

  // Get time series data for charts
  async getTimeSeriesData(interval = '1h', duration = '24h') {
    try {
      const response = await this.client.search({
        index: 'logs-*',
        body: {
          size: 0,
          query: {
            range: {
              '@timestamp': {
                gte: `now-${duration}`
              }
            }
          },
          aggs: {
            timeline: {
              date_histogram: {
                field: '@timestamp',
                fixed_interval: interval
              },
              aggs: {
                by_vendor: {
                  terms: {
                    field: '_index',
                    size: 10
                  }
                }
              }
            }
          }
        }
      })
      
      return response.body.aggregations?.timeline?.buckets || []
    } catch (error) {
      console.error('Error fetching time series data:', error)
      return []
    }
  }

  // Get MITRE ATT&CK statistics
  async getMitreStats() {
    try {
      const response = await this.client.search({
        index: 'logs-*',
        body: {
          size: 0,
          aggs: {
            techniques: {
              terms: {
                field: 'mitre_techniques.keyword',
                size: 20
              }
            },
            tactics: {
              terms: {
                field: 'mitre_tactics.keyword',
                size: 15
              }
            }
          }
        }
      })
      
      return {
        techniques: response.body.aggregations?.techniques?.buckets || [],
        tactics: response.body.aggregations?.tactics?.buckets || []
      }
    } catch (error) {
      console.error('Error fetching MITRE stats:', error)
      return { techniques: [], tactics: [] }
    }
  }

  // Search events with custom query
  async searchEvents(params: {
    vendor?: string
    severity?: string[]
    from?: string
    to?: string
    query?: string
    size?: number
  }) {
    const must: any[] = []
    
    // Build query conditions
    if (params.from || params.to) {
      const range: any = {}
      if (params.from) range.gte = params.from
      if (params.to) range.lte = params.to
      must.push({ range: { '@timestamp': range } })
    }
    
    if (params.severity && params.severity.length > 0) {
      must.push({ terms: { 'severity.keyword': params.severity } })
    }
    
    if (params.query) {
      must.push({
        query_string: {
          query: params.query,
          default_field: '*'
        }
      })
    }
    
    const index = params.vendor ? `logs-${params.vendor.toLowerCase()}-*` : 'logs-*'
    
    try {
      const response = await this.client.search({
        index,
        body: {
          query: {
            bool: {
              must: must.length > 0 ? must : [{ match_all: {} }]
            }
          },
          sort: [{ '@timestamp': { order: 'desc' } }],
          size: params.size || 100
        }
      })
      
      return response.body.hits.hits
    } catch (error) {
      console.error('Error searching events:', error)
      return []
    }
  }

  // Get incidents for a vendor
  async getIncidents(vendor: string) {
    const index = `logs-${vendor.toLowerCase()}-incidents-*`
    
    try {
      const response = await this.client.search({
        index,
        body: {
          query: {
            match_all: {}
          },
          sort: [{ '@timestamp': { order: 'desc' } }],
          size: 50
        }
      })
      
      const incidents = response.body.hits.hits || []
      
      // Count by status
      const statusCounts = {
        active: 0,
        new: 0,
        resolved: 0,
        total: incidents.length
      }
      
      incidents.forEach((incident: any) => {
        const status = incident._source?.status?.toLowerCase() || ''
        if (status === 'new' || status === 'open') statusCounts.new++
        else if (status === 'active' || status === 'in_progress') statusCounts.active++
        else if (status === 'resolved' || status === 'closed') statusCounts.resolved++
      })
      
      return {
        incidents,
        ...statusCounts
      }
    } catch (error) {
      console.error('Error fetching incidents:', error)
      return { incidents: [], active: 0, new: 0, resolved: 0, total: 0 }
    }
  }

  // Get detections for CrowdStrike
  async getDetections(params: {
    severity?: string[]
    limit?: number
  } = {}) {
    try {
      const must: any[] = []
      
      if (params.severity && params.severity.length > 0) {
        must.push({ terms: { 'severity.keyword': params.severity } })
      }
      
      const response = await this.client.search({
        index: 'logs-crowdstrike-detections-*',
        body: {
          query: {
            bool: {
              must: must.length > 0 ? must : [{ match_all: {} }]
            }
          },
          sort: [{ '@timestamp': { order: 'desc' } }],
          size: params.limit || 100
        }
      })
      
      return response.body.hits.hits
    } catch (error) {
      console.error('Error fetching detections:', error)
      return []
    }
  }

  // Get host information
  async getHosts(vendor: string) {
    const index = `logs-${vendor.toLowerCase()}-hosts-*`
    
    try {
      const response = await this.client.search({
        index,
        body: {
          size: 0,
          aggs: {
            unique_hosts: {
              cardinality: {
                field: 'hostname.keyword'
              }
            },
            host_list: {
              terms: {
                field: 'hostname.keyword',
                size: 100
              }
            }
          }
        }
      })
      
      return {
        total: response.body.aggregations?.unique_hosts?.value || 0,
        hosts: response.body.aggregations?.host_list?.buckets || []
      }
    } catch (error) {
      console.error('Error fetching hosts:', error)
      return { total: 0, hosts: [] }
    }
  }
}

// Export singleton instance
export const opensearch = new OpenSearchService()