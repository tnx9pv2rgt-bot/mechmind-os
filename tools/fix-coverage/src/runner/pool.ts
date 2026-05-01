/**
 * Bounded concurrency pool with global timeout and per-task isolation.
 * Wraps p-limit so individual task failures never poison the pool.
 */

import pLimit from 'p-limit';
import { performance } from 'perf_hooks';
import { getLogger } from '../utils/logger';

const log = getLogger('pool');

export interface PoolTask<T> {
  id: string;
  fn: (signal: AbortSignal) => Promise<T>;
}

export interface PoolResult<T> {
  id: string;
  ok: boolean;
  value?: T;
  error?: unknown;
  durationMs: number;
}

export interface PoolOptions {
  concurrency: number;
  globalTimeoutMs: number;
}

export async function runPool<T>(
  tasks: PoolTask<T>[],
  opts: PoolOptions,
): Promise<PoolResult<T>[]> {
  const limit = pLimit(opts.concurrency);
  const controller = new AbortController();
  const timer = setTimeout(() => {
    log.warn({ globalTimeoutMs: opts.globalTimeoutMs }, 'global timeout reached; aborting pool');
    controller.abort();
  }, opts.globalTimeoutMs);

  const promises = tasks.map((task) =>
    limit(async () => {
      const t0 = performance.now();
      try {
        const value = await task.fn(controller.signal);
        return { id: task.id, ok: true, value, durationMs: performance.now() - t0 } satisfies PoolResult<T>;
      } catch (error) {
        return { id: task.id, ok: false, error, durationMs: performance.now() - t0 } satisfies PoolResult<T>;
      }
    }),
  );

  try {
    return await Promise.all(promises);
  } finally {
    clearTimeout(timer);
  }
}
