/**
 * Benign Hash 2-Tier Cache
 *
 * Tier 1 (HIGH Confidence): Cortex XDR 수집 데이터 (PostgreSQL, 메모리 캐시)
 * Tier 2 (LOW Confidence): NSRL Modern RDS (SQLite, 파일 I/O)
 *
 * Features:
 * - Singleton 패턴: 애플리케이션당 1회만 로드
 * - In-Memory Set: Tier 1 O(1) 조회 성능
 * - SQLite Lookup: Tier 2 적당한 속도
 * - Lazy Loading: 최초 사용 시 자동 로드
 * - Manual Refresh: 배치 업데이트 후 수동 갱신 가능
 */

import pkg from 'pg';
const { Pool } = pkg;
import { getNSRLLookup, NSRLLookup } from './nsrl-lookup';

/**
 * Benign Hash 조회 결과
 */
export interface BenignCheckResult {
  isBenign: boolean;
  confidence: 'HIGH' | 'LOW' | null;
  source: 'CORTEX_XDR' | 'NSRL' | null;
}

export class BenignHashCache {
  private static instance: BenignHashCache | null = null;

  // Tier 1: Cortex XDR (PostgreSQL, 메모리)
  private cortexCache: Set<string> | null = null;
  private isLoading: boolean = false;
  private lastLoadTime: Date | null = null;

  // Tier 2: NSRL (SQLite, 파일)
  private nsrl: NSRLLookup | null = null;

  // Remote PostgreSQL Pool (Threat Intelligence DB)
  private pgPool: typeof Pool.prototype;

  private constructor() {
    this.pgPool = new Pool({
      host: process.env.POSTGRES_HOST || 'postgres',
      port: parseInt(process.env.POSTGRES_PORT || '5432'),
      database: process.env.POSTGRES_DB || 'n8n',
      user: process.env.POSTGRES_USER || 'postgres',
      password: process.env.POSTGRES_PASSWORD || 'postgres',
      max: 5, // 최대 5개 연결
    });
  }

  /**
   * Singleton 인스턴스 가져오기
   */
  static getInstance(): BenignHashCache {
    if (!BenignHashCache.instance) {
      BenignHashCache.instance = new BenignHashCache();
    }
    return BenignHashCache.instance;
  }

  /**
   * 캐시 초기화 (Tier 1: PostgreSQL, Tier 2: NSRL)
   */
  async init(): Promise<void> {
    if (this.cortexCache !== null) {
      console.log('[BenignHashCache] Already initialized');
      return;
    }

    if (this.isLoading) {
      console.log('[BenignHashCache] Loading in progress...');
      // 로딩 완료 대기
      while (this.isLoading) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      return;
    }

    this.isLoading = true;
    const startTime = Date.now();

    try {
      // Tier 1: Cortex XDR (PostgreSQL → 메모리)
      console.log('[BenignHashCache] Loading benign hashes from PostgreSQL...');

      const result = await this.pgPool.query(
        'SELECT hash FROM ioclog.benign_hashes ORDER BY hash'
      );

      this.cortexCache = new Set(result.rows.map((row) => row.hash));
      this.lastLoadTime = new Date();

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      const memoryMB = ((this.cortexCache.size * 64) / 1024 / 1024).toFixed(2); // 64 bytes per hash

      console.log(`[BenignHashCache] ✅ Loaded ${this.cortexCache.size.toLocaleString()} hashes in ${duration}s`);
      console.log(`[BenignHashCache] 📊 Memory usage: ~${memoryMB} MB`);

      // Tier 2: NSRL (SQLite 파일, 선택적)
      try {
        this.nsrl = getNSRLLookup();
        if (this.nsrl) {
          const stats = this.nsrl.getStats();
          console.log(`[BenignHashCache] ✅ NSRL loaded: ${stats.totalHashes.toLocaleString()} hashes (${stats.dbSizeMB} MB)`);
        }
      } catch (error: any) {
        console.warn(`[BenignHashCache] ⚠️  NSRL not available: ${error.message}`);
        this.nsrl = null;
      }
    } catch (error: any) {
      console.error(`[BenignHashCache] ❌ Failed to load: ${error.message}`);
      this.cortexCache = new Set(); // 빈 Set으로 초기화 (애플리케이션 중단 방지)
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * 2-Tier 해시 조회 (상세 정보 포함)
   */
  isBenignDetailed(hash: string): BenignCheckResult {
    if (this.cortexCache === null) {
      console.warn('[BenignHashCache] Cache not initialized! Call init() first.');
      return { isBenign: false, confidence: null, source: null };
    }

    // Tier 1: Cortex XDR (HIGH confidence, 빠름)
    if (this.cortexCache.has(hash)) {
      return { isBenign: true, confidence: 'HIGH', source: 'CORTEX_XDR' };
    }

    // Tier 2: NSRL (LOW confidence, 적당히 빠름)
    if (this.nsrl && this.nsrl.isWhitelisted(hash)) {
      return { isBenign: true, confidence: 'LOW', source: 'NSRL' };
    }

    return { isBenign: false, confidence: null, source: null };
  }

  /**
   * 해시가 BENIGN인지 확인 (기존 인터페이스 유지, 하위 호환성)
   */
  isBenign(hash: string): boolean {
    return this.isBenignDetailed(hash).isBenign;
  }

  /**
   * 캐시 새로고침 (배치 업데이트 후 호출)
   */
  async refresh(): Promise<void> {
    console.log('[BenignHashCache] Refreshing cache...');
    this.cortexCache = null;
    await this.init();
  }

  /**
   * 캐시 통계
   */
  getStats(): {
    cortexSize: number;
    nsrlSize: number;
    lastLoadTime: Date | null;
    isInitialized: boolean;
    memoryMB: number;
  } {
    return {
      cortexSize: this.cortexCache?.size || 0,
      nsrlSize: this.nsrl?.getStats().totalHashes || 0,
      lastLoadTime: this.lastLoadTime,
      isInitialized: this.cortexCache !== null,
      memoryMB: this.cortexCache ? (this.cortexCache.size * 64) / 1024 / 1024 : 0,
    };
  }

  /**
   * PostgreSQL 연결 종료
   */
  async close(): Promise<void> {
    await this.pgPool.end();
    if (this.nsrl) {
      this.nsrl.close();
    }
  }
}

/**
 * 편의 함수: Singleton 인스턴스 가져오기
 */
export function getBenignHashCache(): BenignHashCache {
  return BenignHashCache.getInstance();
}

/**
 * 편의 함수: 해시가 BENIGN인지 확인 (자동 초기화)
 */
export async function isBenignHash(hash: string): Promise<boolean> {
  const cache = getBenignHashCache();

  // 자동 초기화 (최초 호출 시)
  if (!cache.getStats().isInitialized) {
    await cache.init();
  }

  return cache.isBenign(hash);
}

/**
 * 편의 함수: 상세 정보 포함 BENIGN 조회 (자동 초기화)
 */
export async function isBenignHashDetailed(hash: string): Promise<BenignCheckResult> {
  const cache = getBenignHashCache();

  // 자동 초기화 (최초 호출 시)
  if (!cache.getStats().isInitialized) {
    await cache.init();
  }

  return cache.isBenignDetailed(hash);
}
