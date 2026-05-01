/**
 * Retry policy with exponential backoff and rate-limit awareness.
 *
 * Anthropic 429 responses include `retry-after` (seconds) and
 * `anthropic-ratelimit-tokens-reset` (ISO timestamp). We respect both
 * when present and otherwise fall back to capped exponential backoff
 * with full jitter (AWS Architecture Blog recipe).
 */

export interface RetryOptions {
  maxRetries: number;
  baseMs: number;
  maxMs: number;
  isRetriable?: (err: unknown) => boolean;
  onRetry?: (info: { attempt: number; delayMs: number; err: unknown }) => void;
}

export interface AnthropicLikeError {
  status?: number;
  headers?: Record<string, string | undefined>;
  message?: string;
}

export async function retry<T>(fn: () => Promise<T>, opts: RetryOptions): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= opts.maxRetries; attempt += 1) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt === opts.maxRetries) break;
      if (opts.isRetriable && !opts.isRetriable(err)) break;
      const delay = computeDelay(err, attempt, opts);
      opts.onRetry?.({ attempt: attempt + 1, delayMs: delay, err });
      await sleep(delay);
    }
  }
  throw lastErr;
}

export function computeDelay(err: unknown, attempt: number, opts: RetryOptions): number {
  const headerDelay = extractHeaderDelay(err);
  if (headerDelay !== null) {
    return Math.min(headerDelay, opts.maxMs);
  }
  const expo = Math.min(opts.maxMs, opts.baseMs * 2 ** attempt);
  return Math.floor(Math.random() * expo);
}

function extractHeaderDelay(err: unknown): number | null {
  if (!err || typeof err !== 'object') return null;
  const e = err as AnthropicLikeError;
  const headers = e.headers ?? {};
  const retryAfter = headers['retry-after'];
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (!Number.isNaN(seconds) && seconds > 0) return seconds * 1000;
  }
  const reset = headers['anthropic-ratelimit-tokens-reset'];
  if (reset) {
    const t = Date.parse(reset);
    if (!Number.isNaN(t)) {
      const delta = t - Date.now();
      if (delta > 0) return delta;
    }
  }
  return null;
}

export function isRetriableHttpError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const status = (err as AnthropicLikeError).status;
  if (status === undefined) return false;
  return status === 408 || status === 429 || (status >= 500 && status < 600);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
