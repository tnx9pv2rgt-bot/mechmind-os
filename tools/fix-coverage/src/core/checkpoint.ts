/**
 * Checkpoint store: tracks per-file pipeline progress so an interrupted
 * run can resume exactly where it left off. Each step transition is
 * persisted atomically (write to temp file + rename).
 */

import { mkdirSync, readFileSync, writeFileSync, renameSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import lockfile from 'proper-lockfile';

export type Step =
  | 'queued'
  | 'generated'
  | 'typescript'
  | 'eslint'
  | 'coverage'
  | 'flakiness'
  | 'mutation'
  | 'assertions'
  | 'mocks'
  | 'calls'
  | 'done'
  | 'failed'
  | 'ceiling';

export interface Checkpoint {
  sourcePath: string;
  lastStep: Step;
  attempt: number;
  startedAt: string;
  updatedAt: string;
  errors: string[];
}

export class CheckpointStore {
  private readonly path: string;
  private state: Record<string, Checkpoint> = {};

  constructor(cacheDir: string) {
    this.path = join(cacheDir, 'checkpoint.json');
    mkdirSync(cacheDir, { recursive: true });
    if (existsSync(this.path)) {
      try {
        this.state = JSON.parse(readFileSync(this.path, 'utf8'));
      } catch {
        this.state = {};
      }
    }
  }

  get(sourcePath: string): Checkpoint | null {
    return this.state[sourcePath] ?? null;
  }

  async record(sourcePath: string, step: Step, error?: string): Promise<void> {
    const existing = this.state[sourcePath];
    const now = new Date().toISOString();
    this.state[sourcePath] = {
      sourcePath,
      lastStep: step,
      attempt: (existing?.attempt ?? 0) + (step === 'queued' ? 0 : 1),
      startedAt: existing?.startedAt ?? now,
      updatedAt: now,
      errors: error ? [...(existing?.errors ?? []), error] : existing?.errors ?? [],
    };
    await this.flush();
  }

  async clear(sourcePath: string): Promise<void> {
    delete this.state[sourcePath];
    await this.flush();
  }

  pendingFiles(allFiles: string[]): string[] {
    return allFiles.filter((f) => {
      const cp = this.state[f];
      return !cp || (cp.lastStep !== 'done' && cp.lastStep !== 'ceiling');
    });
  }

  private async flush(): Promise<void> {
    mkdirSync(dirname(this.path), { recursive: true });
    if (!existsSync(this.path)) writeFileSync(this.path, '{}');
    const release = await lockfile.lock(this.path, { retries: { retries: 5, minTimeout: 50 } });
    try {
      const tmp = `${this.path}.tmp`;
      writeFileSync(tmp, JSON.stringify(this.state, null, 2));
      renameSync(tmp, this.path);
    } finally {
      await release();
    }
  }
}
