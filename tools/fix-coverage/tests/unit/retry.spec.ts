import { computeDelay, retry, isRetriableHttpError } from '../../src/claude/retry';

describe('isRetriableHttpError', () => {
  it.each([408, 429, 500, 502, 503])('treats %i as retriable', (status) => {
    expect(isRetriableHttpError({ status })).toBe(true);
  });
  it.each([400, 401, 403, 404])('treats %i as non-retriable', (status) => {
    expect(isRetriableHttpError({ status })).toBe(false);
  });
  it('returns false for unknown shapes', () => {
    expect(isRetriableHttpError(null)).toBe(false);
    expect(isRetriableHttpError('boom')).toBe(false);
    expect(isRetriableHttpError({})).toBe(false);
  });
});

describe('computeDelay', () => {
  const opts = { maxRetries: 5, baseMs: 100, maxMs: 10_000 };
  it('respects retry-after header (seconds)', () => {
    const err = { headers: { 'retry-after': '7' } };
    expect(computeDelay(err, 0, opts)).toBe(7000);
  });
  it('clamps retry-after to maxMs', () => {
    const err = { headers: { 'retry-after': '999' } };
    expect(computeDelay(err, 0, opts)).toBe(10_000);
  });
  it('falls back to jittered exponential without headers', () => {
    const err = {};
    const d = computeDelay(err, 3, opts);
    expect(d).toBeGreaterThanOrEqual(0);
    expect(d).toBeLessThanOrEqual(Math.min(opts.maxMs, opts.baseMs * 8));
  });
});

describe('retry', () => {
  it('returns the first successful value', async () => {
    let i = 0;
    const r = await retry(async () => i++, { maxRetries: 3, baseMs: 1, maxMs: 5 });
    expect(r).toBe(0);
  });

  it('retries until success', async () => {
    let i = 0;
    const r = await retry(
      async () => {
        i += 1;
        if (i < 3) throw Object.assign(new Error('boom'), { status: 500 });
        return i;
      },
      { maxRetries: 5, baseMs: 1, maxMs: 5, isRetriable: isRetriableHttpError },
    );
    expect(r).toBe(3);
  });

  it('rethrows non-retriable errors immediately', async () => {
    let i = 0;
    await expect(
      retry(
        async () => {
          i += 1;
          throw Object.assign(new Error('nope'), { status: 400 });
        },
        { maxRetries: 5, baseMs: 1, maxMs: 5, isRetriable: isRetriableHttpError },
      ),
    ).rejects.toThrow('nope');
    expect(i).toBe(1);
  });
});
