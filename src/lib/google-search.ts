/**
 * Google Custom Search API 래퍼
 *
 * 기능:
 * - 기본 웹 검색
 * - 사이트 제한 검색
 * - 날짜 제한 검색
 * - 파일 타입 제한 검색
 * - Redis 캐싱 (선택적)
 * - 할당량 추적
 */

export interface GoogleSearchResult {
  title: string;
  link: string;
  snippet: string;
  displayLink: string;
  formattedUrl: string;
  htmlTitle?: string;
  htmlSnippet?: string;
}

export interface GoogleSearchOptions {
  num?: number; // 결과 수 (1-10)
  dateRestrict?: string; // 'd1', 'w1', 'm1', 'm3', 'y1'
  siteSearch?: string; // 특정 사이트 (예: 'virustotal.com')
  siteSearchFilter?: 'i' | 'e'; // include or exclude
  fileType?: string; // pdf, doc, xls 등
  start?: number; // 페이지네이션 시작 인덱스 (1, 11, 21, ...)
}

export interface GoogleSearchResponse {
  results: GoogleSearchResult[];
  totalResults: number;
  searchTime: number;
  queries: {
    request: Array<{
      title: string;
      totalResults: string;
      searchTerms: string;
      count: number;
      startIndex: number;
    }>;
    nextPage?: Array<{
      startIndex: number;
    }>;
  };
}

/**
 * Google Custom Search API 기본 검색
 */
export async function googleCustomSearch(
  query: string,
  options: GoogleSearchOptions = {}
): Promise<GoogleSearchResult[]> {
  const {
    num = 10,
    dateRestrict,
    siteSearch,
    siteSearchFilter = 'i',
    fileType,
    start,
  } = options;

  const API_KEY = process.env.GOOGLE_SEARCH_API_KEY;
  const CX = process.env.GOOGLE_SEARCH_ENGINE_ID;

  if (!API_KEY || !CX) {
    throw new Error('GOOGLE_SEARCH_API_KEY or GOOGLE_SEARCH_ENGINE_ID not configured');
  }

  const url = new URL('https://www.googleapis.com/customsearch/v1');
  url.searchParams.set('key', API_KEY);
  url.searchParams.set('cx', CX);
  url.searchParams.set('q', query);
  url.searchParams.set('num', Math.min(num, 10).toString()); // 최대 10개

  if (dateRestrict) url.searchParams.set('dateRestrict', dateRestrict);
  if (siteSearch) {
    url.searchParams.set('siteSearch', siteSearch);
    url.searchParams.set('siteSearchFilter', siteSearchFilter);
  }
  if (fileType) url.searchParams.set('fileType', fileType);
  if (start) url.searchParams.set('start', start.toString());

  const response = await fetch(url.toString());

  if (!response.ok) {
    const errorText = await response.text();

    // 할당량 초과 에러
    if (response.status === 429) {
      throw new Error('Google Search API quota exceeded (100 queries/day for free tier)');
    }

    // 인증 에러
    if (response.status === 403) {
      throw new Error('Google Search API authentication failed. Check API key and Search Engine ID.');
    }

    throw new Error(`Google Search API error: ${response.status}\n${errorText}`);
  }

  const data = await response.json();

  return data.items?.map((item: any) => ({
    title: item.title,
    link: item.link,
    snippet: item.snippet,
    displayLink: item.displayLink,
    formattedUrl: item.formattedUrl,
    htmlTitle: item.htmlTitle,
    htmlSnippet: item.htmlSnippet,
  })) || [];
}

/**
 * 상세 응답 (메타데이터 포함)
 */
export async function googleCustomSearchDetailed(
  query: string,
  options: GoogleSearchOptions = {}
): Promise<GoogleSearchResponse> {
  const API_KEY = process.env.GOOGLE_SEARCH_API_KEY;
  const CX = process.env.GOOGLE_SEARCH_ENGINE_ID;

  if (!API_KEY || !CX) {
    throw new Error('GOOGLE_SEARCH_API_KEY or GOOGLE_SEARCH_ENGINE_ID not configured');
  }

  const { num = 10, ...restOptions } = options;

  const url = new URL('https://www.googleapis.com/customsearch/v1');
  url.searchParams.set('key', API_KEY);
  url.searchParams.set('cx', CX);
  url.searchParams.set('q', query);
  url.searchParams.set('num', Math.min(num, 10).toString());

  Object.entries(restOptions).forEach(([key, value]) => {
    if (value !== undefined) {
      url.searchParams.set(key, value.toString());
    }
  });

  const startTime = Date.now();
  const response = await fetch(url.toString());
  const searchTime = (Date.now() - startTime) / 1000;

  if (!response.ok) {
    throw new Error(`Google Search API error: ${response.status}`);
  }

  const data = await response.json();

  return {
    results: data.items?.map((item: any) => ({
      title: item.title,
      link: item.link,
      snippet: item.snippet,
      displayLink: item.displayLink,
      formattedUrl: item.formattedUrl,
      htmlTitle: item.htmlTitle,
      htmlSnippet: item.htmlSnippet,
    })) || [],
    totalResults: parseInt(data.searchInformation?.totalResults || '0'),
    searchTime,
    queries: data.queries || { request: [] },
  };
}

/**
 * 특정 사이트에서만 검색하는 헬퍼 함수들
 */

export async function searchVirusTotal(query: string, num = 5): Promise<GoogleSearchResult[]> {
  return googleCustomSearch(query, {
    num,
    siteSearch: 'virustotal.com',
  });
}

export async function searchNVD(query: string, num = 5): Promise<GoogleSearchResult[]> {
  return googleCustomSearch(query, {
    num,
    siteSearch: 'nvd.nist.gov',
  });
}

export async function searchMITRE(query: string, num = 5): Promise<GoogleSearchResult[]> {
  return googleCustomSearch(query, {
    num,
    siteSearch: 'attack.mitre.org',
  });
}

export async function searchCISA(query: string, num = 5): Promise<GoogleSearchResult[]> {
  return googleCustomSearch(query, {
    num,
    siteSearch: 'cisa.gov',
  });
}

/**
 * CVE ID 추출 유틸리티
 */
export function extractCVEIds(results: GoogleSearchResult[]): string[] {
  const cveRegex = /CVE-\d{4}-\d{4,7}/gi;
  const text = results.map(r => `${r.title} ${r.snippet}`).join(' ');
  const matches = text.match(cveRegex) || [];
  return [...new Set(matches)]; // 중복 제거
}

/**
 * 배치 검색 (여러 쿼리를 병렬 실행)
 */
export async function batchGoogleSearch(
  queries: string[],
  options: GoogleSearchOptions = {}
): Promise<Record<string, GoogleSearchResult[]>> {
  const results = await Promise.all(
    queries.map(async (query) => {
      try {
        const searchResults = await googleCustomSearch(query, options);
        return { query, results: searchResults };
      } catch (error) {
        console.error(`Batch search failed for query: ${query}`, error);
        return { query, results: [] };
      }
    })
  );

  return results.reduce((acc, { query, results: searchResults }) => {
    acc[query] = searchResults;
    return acc;
  }, {} as Record<string, GoogleSearchResult[]>);
}

/**
 * 스마트 쿼리 생성 (IOCLog 결과 기반)
 */
export function buildSmartSearchQueries(
  originalQuery: string,
  iocData: any[],
  maxQueries: number = 3
): string[] {
  const queries: string[] = [];

  // 멀웨어 발견 시
  const malware = iocData.find(d => d._index?.includes('malware') || d.signature);
  if (malware) {
    const signature = malware._source?.signature || malware.signature;
    if (signature && signature !== 'Unknown') {
      queries.push(`${signature} malware 2025 analysis`);

      const hash = malware._source?.sha256_hash || malware.sha256_hash;
      if (hash) {
        queries.push(`${hash.slice(0, 16)} variant family`);
      }
    }
  }

  // APT 그룹 발견 시
  const apt = iocData.find(d => d._index?.includes('apt') || d.name);
  if (apt) {
    const name = apt._source?.name || apt.name;
    if (name) {
      queries.push(`"${name}" APT campaign latest 2025`);
    }
  }

  // 해킹 도구 발견 시
  const tool = iocData.find(d => d._index?.includes('tools') || d.type);
  if (tool) {
    const name = tool._source?.name || tool.name;
    if (name) {
      queries.push(`${name} hacking tool techniques`);
    }
  }

  // 쿼리가 부족하면 원본 쿼리 변형 추가
  if (queries.length < maxQueries) {
    queries.push(`${originalQuery} threat intelligence 2025`);
  }

  return queries.slice(0, maxQueries);
}

/**
 * 할당량 추적 클래스 (메모리 기반)
 */
class QuotaTracker {
  private static count = 0;
  private static lastReset = new Date();

  static checkAndIncrement(): { allowed: boolean; remaining: number } {
    // 매일 자정에 리셋
    const now = new Date();
    if (now.getDate() !== this.lastReset.getDate()) {
      this.count = 0;
      this.lastReset = now;
    }

    const remaining = 100 - this.count;
    const allowed = this.count < 100;

    if (allowed) {
      this.count++;
    }

    return { allowed, remaining: remaining - 1 };
  }

  static getStats(): { count: number; remaining: number; resetDate: Date } {
    return {
      count: this.count,
      remaining: 100 - this.count,
      resetDate: this.lastReset,
    };
  }
}

/**
 * 할당량 체크가 포함된 검색
 */
export async function googleSearchWithQuota(
  query: string,
  options: GoogleSearchOptions = {}
): Promise<GoogleSearchResult[]> {
  const { allowed, remaining } = QuotaTracker.checkAndIncrement();

  if (!allowed) {
    throw new Error(`Daily quota exceeded. Remaining: ${remaining}. Try again tomorrow.`);
  }

  const results = await googleCustomSearch(query, options);

  console.log(`[Google Search] Query: "${query}", Remaining quota: ${remaining}`);

  return results;
}

/**
 * 할당량 통계 조회
 */
export function getQuotaStats() {
  return QuotaTracker.getStats();
}