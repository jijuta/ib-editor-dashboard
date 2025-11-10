/**
 * NSRL (National Software Reference Library) Lookup API
 *
 * NIST NSRL Modern RDS Minimal SQLite 데이터베이스를 조회하여
 * 정상 소프트웨어 파일 해시를 빠르게 확인합니다.
 *
 * Features:
 * - SQLite 직접 조회 (better-sqlite3)
 * - 단일/배치 SHA256 조회
 * - 읽기 전용 모드 (성능 최적화)
 * - WAL 모드 (Write-Ahead Logging) 활성화
 * - Singleton 패턴
 */

import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';

export class NSRLLookup {
  private db: Database.Database;
  private dbPath: string;
  private isInitialized: boolean = false;

  constructor(dbPath: string = '/www/ib-poral/data/nsrl/nsrl_modern.db') {
    this.dbPath = dbPath;

    // 데이터베이스 파일 존재 확인
    if (!fs.existsSync(this.dbPath)) {
      throw new Error(
        `NSRL database not found at ${this.dbPath}. ` +
          `Please run: bash scripts/download-nsrl-modern.sh`
      );
    }

    // 읽기 전용 모드로 데이터베이스 열기
    this.db = new Database(this.dbPath, { readonly: true, fileMustExist: true });

    // 성능 최적화: WAL 모드 활성화
    try {
      this.db.pragma('journal_mode = WAL');
      this.db.pragma('synchronous = NORMAL');
      this.db.pragma('cache_size = 10000'); // 10,000 pages (~40MB cache)
      this.db.pragma('temp_store = MEMORY');
    } catch (error: any) {
      console.warn('[NSRLLookup] Could not set pragmas:', error.message);
    }

    this.isInitialized = true;
    console.log(`[NSRLLookup] Database opened: ${this.dbPath}`);
  }

  /**
   * SHA256 해시가 NSRL 화이트리스트에 있는지 확인 (단일 조회)
   */
  isWhitelisted(sha256: string): boolean {
    if (!this.isInitialized) {
      throw new Error('NSRL database not initialized');
    }

    // SHA256 정규화 (대문자, 64자) - NSRL은 대문자 형식 사용
    const normalizedHash = sha256.toUpperCase().trim();
    if (normalizedHash.length !== 64) {
      return false;
    }

    try {
      const stmt = this.db.prepare('SELECT 1 FROM FILE WHERE sha256 = ? LIMIT 1');
      const result = stmt.get(normalizedHash);
      return result !== undefined;
    } catch (error: any) {
      console.error(`[NSRLLookup] Query error for ${sha256}:`, error.message);
      return false;
    }
  }

  /**
   * SHA256 해시 배치 조회 (여러 개 한 번에)
   *
   * @param sha256s - SHA256 해시 배열
   * @returns Map<hash, isWhitelisted>
   */
  checkBatch(sha256s: string[]): Map<string, boolean> {
    if (!this.isInitialized) {
      throw new Error('NSRL database not initialized');
    }

    const results = new Map<string, boolean>();

    if (sha256s.length === 0) {
      return results;
    }

    // SHA256 정규화 (대문자, 64자) - NSRL은 대문자 형식 사용
    const normalizedHashes = sha256s.map((h) => h.toUpperCase().trim()).filter((h) => h.length === 64);

    if (normalizedHashes.length === 0) {
      return results;
    }

    try {
      // SQLite에서 IN 쿼리는 최대 999개 파라미터 제한이 있으므로 배치 처리
      const batchSize = 500;
      for (let i = 0; i < normalizedHashes.length; i += batchSize) {
        const batch = normalizedHashes.slice(i, i + batchSize);
        const placeholders = batch.map(() => '?').join(',');
        const stmt = this.db.prepare(`SELECT sha256 FROM FILE WHERE sha256 IN (${placeholders})`);
        const matched = stmt.all(...batch) as Array<{ sha256: string }>;

        // 매칭된 해시 표시
        matched.forEach((row) => results.set(row.sha256, true));

        // 매칭되지 않은 해시 표시
        batch.forEach((hash) => {
          if (!results.has(hash)) {
            results.set(hash, false);
          }
        });
      }
    } catch (error: any) {
      console.error('[NSRLLookup] Batch query error:', error.message);
    }

    return results;
  }

  /**
   * NSRL 데이터베이스 통계
   */
  getStats(): {
    totalHashes: number;
    dbSizeMB: number;
    dbPath: string;
    isInitialized: boolean;
  } {
    if (!this.isInitialized) {
      return {
        totalHashes: 0,
        dbSizeMB: 0,
        dbPath: this.dbPath,
        isInitialized: false,
      };
    }

    try {
      const countResult = this.db.prepare('SELECT COUNT(*) as count FROM FILE').get() as {
        count: number;
      };
      const size = fs.statSync(this.dbPath).size / 1024 / 1024;

      return {
        totalHashes: countResult.count,
        dbSizeMB: Math.round(size * 100) / 100,
        dbPath: this.dbPath,
        isInitialized: true,
      };
    } catch (error: any) {
      console.error('[NSRLLookup] Stats query error:', error.message);
      return {
        totalHashes: 0,
        dbSizeMB: 0,
        dbPath: this.dbPath,
        isInitialized: true,
      };
    }
  }

  /**
   * 데이터베이스 연결 종료
   */
  close(): void {
    if (this.isInitialized) {
      try {
        this.db.close();
        this.isInitialized = false;
        console.log('[NSRLLookup] Database closed');
      } catch (error: any) {
        console.error('[NSRLLookup] Error closing database:', error.message);
      }
    }
  }
}

// Singleton 인스턴스
let nsrlInstance: NSRLLookup | null = null;

/**
 * NSRL Lookup Singleton 인스턴스 가져오기
 *
 * NSRL 데이터베이스가 없으면 null 반환
 */
export function getNSRLLookup(): NSRLLookup | null {
  if (nsrlInstance !== null) {
    return nsrlInstance;
  }

  try {
    nsrlInstance = new NSRLLookup();
    return nsrlInstance;
  } catch (error: any) {
    console.warn('[getNSRLLookup] NSRL not available:', error.message);
    return null;
  }
}

/**
 * NSRL Lookup 인스턴스 강제 초기화 (테스트용)
 */
export function initNSRLLookup(dbPath?: string): NSRLLookup {
  if (nsrlInstance !== null) {
    nsrlInstance.close();
  }
  nsrlInstance = new NSRLLookup(dbPath);
  return nsrlInstance;
}

/**
 * 편의 함수: SHA256이 NSRL 화이트리스트에 있는지 확인
 */
export function isNSRLWhitelisted(sha256: string): boolean {
  const nsrl = getNSRLLookup();
  if (nsrl === null) {
    return false; // NSRL 없으면 false 반환
  }
  return nsrl.isWhitelisted(sha256);
}
