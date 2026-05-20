/**
 * Content-addressable cache for "ceiling" results: when a file legitimately
 * cannot reach the coverage threshold (architectural limit), record this
 * decision keyed by SHA-256 of the source file. The decision survives
 * across runs and is invalidated automatically when the source changes.
 *
 * The cache is also used as a generic key/value store for prior gate
 * results so retries can resume mid-pipeline.
 */

import { createHash } from 'crypto';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import lockfile from 'proper-lockfile';

export interface CacheEntry {
  sourceHash: string;
  status: 'ceiling' | 'pass' | 'fail';
  reason: string;
  recordedAt: string;
  metrics?: Record<string, unknown>;
}

export class FileCache {
  private readonly path: string;
  private data: Record<string, CacheEntry> = {};

  constructor(cacheDir: string, name = 'fix-coverage.json') {
    this.path = join(cacheDir, name);
    mkdirSync(cacheDir, { recursive: true });
    if (existsSync(this.path)) {
      try {
        this.data = JSON.parse(readFileSync(this.path, 'utf8'));
      } catch {
        this.data = {};
      }
    }
  }

  static hashFile(absolutePath: string): string {
    const buf = readFileSync(absolutePath);
    return createHash('sha256').update(buf).digest('hex');
  }

  /**
   * Returns the cached entry only if the file's current hash matches
   * the recorded hash. Stale entries are ignored automatically.
   */
  get(sourcePath: string): CacheEntry | null {
    const entry = this.data[sourcePath];
    if (!entry) return null;
    const currentHash = FileCache.hashFile(sourcePath);
    return entry.sourceHash === currentHash ? entry : null;
  }

  async set(sourcePath: string, entry: Omit<CacheEntry, 'sourceHash' | 'recordedAt'>): Promise<void> {
    const sourceHash = FileCache.hashFile(sourcePath);
    this.data[sourcePath] = {
      sourceHash,
      recordedAt: new Date().toISOString(),
      ...entry,
    };
    await this.flush();
  }

  async flush(): Promise<void> {
    mkdirSync(dirname(this.path), { recursive: true });
    if (!existsSync(this.path)) writeFileSync(this.path, '{}');
    const release = await lockfile.lock(this.path, { retries: { retries: 5, minTimeout: 50 } });
    try {
      writeFileSync(this.path, JSON.stringify(this.data, null, 2));
    } finally {
      await release();
    }
  }
}
