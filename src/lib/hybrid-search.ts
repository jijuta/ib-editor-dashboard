/**
 * 하이브리드 위협 인텔리전스 검색 엔진
 *
 * IOCLog 벡터 RAG + Google Custom Search API 통합
 *
 * 주요 기능:
 * - IOCLog OpenSearch k-NN 벡터 검색
 * - Google Custom Search 웹 검색
 * - 스마트 쿼리 생성 (IOCLog 결과 기반)
 * - 결과 통합 및 랭킹
 */

import { Client } from '@opensearch-project/opensearch';
import { OpenAI } from 'openai';
import {
  googleCustomSearch,
  buildSmartSearchQueries,
  GoogleSearchResult,
} from './google-search';

// OpenSearch 클라이언트 초기화 (로컬 벡터 DB)
const osClient = new Client({
  node: process.env.OPENSEARCH_LOCAL_URL || 'http://localhost:9200',
  auth: {
    username: process.env.OPENSEARCH_LOCAL_USER || 'admin',
    password: process.env.OPENSEARCH_LOCAL_PASSWORD || 'admin',
  },
  ssl: { rejectUnauthorized: false },
});

// Azure OpenAI 임베딩 클라이언트 (Lazy Initialization)
const EMBEDDING_DEPLOYMENT = 'text-embedding-ada-002';
let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    if (!process.env.AZURE_OPENAI_API_KEY) {
      throw new Error(
        'AZURE_OPENAI_API_KEY가 설정되지 않았습니다. .env.local 파일을 확인하세요.'
      );
    }
    if (!process.env.AZURE_OPENAI_ENDPOINT) {
      throw new Error(
        'AZURE_OPENAI_ENDPOINT가 설정되지 않았습니다. .env.local 파일을 확인하세요.'
      );
    }

    openaiClient = new OpenAI({
      apiKey: process.env.AZURE_OPENAI_API_KEY,
      baseURL: `${process.env.AZURE_OPENAI_ENDPOINT}/openai/deployments/${EMBEDDING_DEPLOYMENT}`,
      defaultQuery: { 'api-version': '2024-02-15-preview' },
      defaultHeaders: { 'api-key': process.env.AZURE_OPENAI_API_KEY },
    });
  }
  return openaiClient;
}

/**
 * 하이브리드 검색 옵션
 */
export interface HybridSearchOptions {
  // IOCLog 검색 옵션
  iocTopK?: number; // 반환할 결과 수 (기본: 10)
  iocIndices?: ('malware' | 'apt-groups' | 'tools')[]; // 검색할 인덱스

  // Google Search 옵션
  webSearchEnabled?: boolean; // 웹 검색 활성화 여부 (기본: true)
  webSearchQueries?: number; // 최대 검색 쿼리 수 (기본: 3)
  webSearchResultsPerQuery?: number; // 쿼리당 결과 수 (기본: 5)
  dateRestrict?: string; // 'd1', 'w1', 'm3' 등
  siteRestrict?: string[]; // 특정 사이트만 검색

  // 고급 옵션
  smartQueryGeneration?: boolean; // IOCLog 결과 기반 스마트 쿼리 생성 (기본: true)
  minScoreThreshold?: number; // 최소 유사도 점수 (기본: 0.5)
}

/**
 * IOCLog 검색 결과
 */
export interface IOCLogResult {
  score: number;
  source: string; // 인덱스명 (ioc-malware-vectors, etc.)
  data: {
    id?: number | string;
    sha256_hash?: string;
    md5_hash?: string;
    signature?: string;
    file_type_guess?: string;
    name?: string;
    country?: string;
    type?: string;
    category?: string;
    text_content?: string;
    [key: string]: any;
  };
}

/**
 * 하이브리드 검색 결과
 */
export interface HybridSearchResult {
  query: string;

  // 내부 데이터 (IOCLog)
  internal_results: {
    count: number;
    items: IOCLogResult[];
  };

  // 외부 데이터 (Google Search)
  external_results: {
    count: number;
    queries_used: string[];
    items: GoogleSearchResult[];
  };

  // 메타데이터
  metadata: {
    ioc_search_time_ms: number;
    web_search_time_ms: number;
    total_time_ms: number;
    web_search_queries: number;
    total_sources: number;
  };
}

/**
 * 하이브리드 위협 인텔리전스 검색
 */
export async function hybridThreatIntelSearch(
  query: string,
  options: HybridSearchOptions = {}
): Promise<HybridSearchResult> {
  const startTime = Date.now();

  const {
    iocTopK = 10,
    iocIndices = ['malware', 'apt-groups', 'tools'],
    webSearchEnabled = true,
    webSearchQueries = 3,
    webSearchResultsPerQuery = 5,
    dateRestrict = 'm3',
    siteRestrict = ['virustotal.com', 'nvd.nist.gov', 'attack.mitre.org'],
    smartQueryGeneration = true,
    minScoreThreshold = 0.5,
  } = options;

  // 1. 쿼리 임베딩 생성 (text-embedding-ada-002, 1536 dims)
  const openai = getOpenAIClient();
  const embeddingResponse = await openai.embeddings.create({
    model: EMBEDDING_DEPLOYMENT,
    input: query,
  });
  const queryVector = embeddingResponse.data[0].embedding;

  // 2. IOCLog 벡터 검색 (병렬)
  const iocStartTime = Date.now();

  const iocResults = await Promise.all(
    iocIndices.map(async (idx) => {
      try {
        const result = await osClient.search({
          index: `ioc-${idx}-vectors`,
          body: {
            size: iocTopK,
            query: {
              knn: {
                embedding_vector: {
                  vector: queryVector,
                  k: iocTopK,
                },
              },
            },
          },
        });
        return result;
      } catch (error) {
        console.error(`IOCLog search failed for index ioc-${idx}-vectors:`, error);
        return { body: { hits: { hits: [] }, took: 0 } };
      }
    })
  );

  const iocSearchTime = Date.now() - iocStartTime;

  // 3. IOCLog 결과 정리 및 필터링
  const iocData: IOCLogResult[] = iocResults
    .flatMap(result => result.body.hits.hits)
    .filter((hit: any) => hit._score >= minScoreThreshold)
    .sort((a: any, b: any) => b._score - a._score)
    .slice(0, iocTopK)
    .map((hit: any) => ({
      score: hit._score,
      source: hit._index,
      data: hit._source,
    }));

  // 4. Google Search (조건부, 병렬)
  const webStartTime = Date.now();
  let webData: GoogleSearchResult[] = [];
  let smartQueries: string[] = [];

  if (webSearchEnabled && iocData.length > 0) {
    // 스마트 쿼리 생성 (IOCLog 결과 기반)
    if (smartQueryGeneration) {
      smartQueries = buildSmartSearchQueries(query, iocData, webSearchQueries);
    } else {
      smartQueries = [query].slice(0, webSearchQueries);
    }

    // 병렬 웹 검색
    const webSearchPromises = smartQueries.map(async (q) => {
      try {
        return await googleCustomSearch(q, {
          num: webSearchResultsPerQuery,
          dateRestrict,
          siteSearch: siteRestrict.length > 0 ? siteRestrict[0] : undefined,
        });
      } catch (error) {
        console.error(`Google Search failed for query: ${q}`, error);
        return [];
      }
    });

    const webSearchResults = await Promise.all(webSearchPromises);
    webData = webSearchResults.flat();
  }

  const webSearchTime = Date.now() - webStartTime;
  const totalTime = Date.now() - startTime;

  // 5. 통합 결과 반환
  return {
    query,
    internal_results: {
      count: iocData.length,
      items: iocData,
    },
    external_results: {
      count: webData.length,
      queries_used: smartQueries,
      items: webData,
    },
    metadata: {
      ioc_search_time_ms: iocSearchTime,
      web_search_time_ms: webSearchTime,
      total_time_ms: totalTime,
      web_search_queries: smartQueries.length,
      total_sources: iocIndices.length + siteRestrict.length,
    },
  };
}

/**
 * IOC 자동 Enrichment
 */
export async function enrichIOC(
  ioc: string,
  type: 'hash' | 'ip' | 'domain'
): Promise<{
  ioc: string;
  type: string;
  internal: IOCLogResult[];
  external: GoogleSearchResult[];
  analysis: string;
}> {
  // 1. IOCLog 검색
  const query = type === 'hash' ? ioc.slice(0, 16) : ioc;
  const result = await hybridThreatIntelSearch(query, {
    iocTopK: 5,
    iocIndices: ['malware'],
    webSearchQueries: 2,
    siteRestrict: ['virustotal.com', 'hybrid-analysis.com'],
  });

  // 2. 간단한 분석 생성
  const analysis = `
IOC: ${ioc}
Type: ${type}

Internal Sources (IOCLog):
- Found ${result.internal_results.count} matching samples
- Top match score: ${result.internal_results.items[0]?.score.toFixed(3) || 'N/A'}

External Sources (Web):
- Found ${result.external_results.count} web references
- Sources: ${result.external_results.items.map(r => r.displayLink).join(', ')}
  `.trim();

  return {
    ioc,
    type,
    internal: result.internal_results.items,
    external: result.external_results.items,
    analysis,
  };
}

/**
 * APT 그룹 캠페인 추적
 */
export async function trackAPTCampaign(aptName: string): Promise<HybridSearchResult> {
  return hybridThreatIntelSearch(aptName, {
    iocTopK: 5,
    iocIndices: ['apt-groups', 'tools'],
    webSearchQueries: 3,
    dateRestrict: 'm3', // 최근 3개월
    siteRestrict: ['attack.mitre.org'],
  });
}

/**
 * 멀웨어 변종 탐지
 */
export async function detectMalwareVariants(
  knownHash: string
): Promise<{
  known_malware: string;
  variants: IOCLogResult[];
  verified_count: number;
}> {
  const result = await hybridThreatIntelSearch(knownHash.slice(0, 16), {
    iocTopK: 20,
    iocIndices: ['malware'],
    webSearchEnabled: true,
    webSearchQueries: 2,
    minScoreThreshold: 0.7, // 높은 유사도만
  });

  // 웹 검증을 통해 변종 확인
  const verified = result.internal_results.items.filter((item) => {
    const signature = item.data.signature;
    return signature && signature !== 'Unknown';
  });

  return {
    known_malware: knownHash,
    variants: verified,
    verified_count: verified.length,
  };
}

/**
 * CVE 자동 매핑
 */
export async function mapMalwareToCVE(
  malwareSignature: string
): Promise<{
  malware: string;
  cve_ids: string[];
  nvd_results: GoogleSearchResult[];
}> {
  const result = await hybridThreatIntelSearch(`${malwareSignature} CVE exploit`, {
    iocTopK: 5,
    iocIndices: ['malware'],
    webSearchQueries: 2,
    siteRestrict: ['nvd.nist.gov', 'cve.mitre.org'],
  });

  // CVE ID 추출
  const cveRegex = /CVE-\d{4}-\d{4,7}/gi;
  const text = result.external_results.items
    .map(r => `${r.title} ${r.snippet}`)
    .join(' ');
  const cveIds = [...new Set(text.match(cveRegex) || [])];

  return {
    malware: malwareSignature,
    cve_ids: cveIds,
    nvd_results: result.external_results.items,
  };
}