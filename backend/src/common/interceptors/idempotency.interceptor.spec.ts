import { IdempotencyInterceptor } from './idempotency.interceptor';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of, lastValueFrom } from 'rxjs';
import { RedisService } from '../services/redis.service';

describe('IdempotencyInterceptor', () => {
  let interceptor: IdempotencyInterceptor;
  let redis: { get: jest.Mock; set: jest.Mock; isAvailable: boolean };

  beforeEach(() => {
    redis = { get: jest.fn(), set: jest.fn(), isAvailable: true };
    interceptor = new IdempotencyInterceptor(redis as unknown as RedisService);
  });

  function createContext(method: string, idempotencyKey?: string): ExecutionContext {
    const headers: Record<string, string> = {};
    if (idempotencyKey) {
      headers['idempotency-key'] = idempotencyKey;
    }
    return {
      switchToHttp: () => ({
        getRequest: () => ({ method, headers }),
      }),
    } as unknown as ExecutionContext;
  }

  function createCallHandler(response: unknown): CallHandler {
    return { handle: () => of(response) };
  }

  it('should pass through when no idempotency key is present', async () => {
    const context = createContext('POST');
    const next = createCallHandler({ id: 1 });

    const result$ = await interceptor.intercept(context, next);
    const result = await lastValueFrom(result$);

    expect(result).toEqual({ id: 1 });
    expect(redis.get).not.toHaveBeenCalled();
  });

  it('should pass through for GET requests even with idempotency key', async () => {
    const context = createContext('GET', 'key-123');
    const next = createCallHandler({ data: 'test' });

    const result$ = await interceptor.intercept(context, next);
    const result = await lastValueFrom(result$);

    expect(result).toEqual({ data: 'test' });
    expect(redis.get).not.toHaveBeenCalled();
  });

  it('should pass through for DELETE requests even with idempotency key', async () => {
    const context = createContext('DELETE', 'key-123');
    const next = createCallHandler({ deleted: true });

    const result$ = await interceptor.intercept(context, next);
    const result = await lastValueFrom(result$);

    expect(result).toEqual({ deleted: true });
    expect(redis.get).not.toHaveBeenCalled();
  });

  it('should return cached response for POST with existing idempotency key', async () => {
    redis.get.mockResolvedValue(JSON.stringify({ id: 42 }));
    const context = createContext('POST', 'key-abc');
    const next = createCallHandler({ id: 99 });

    const result$ = await interceptor.intercept(context, next);
    const result = await lastValueFrom(result$);

    expect(result).toEqual({ id: 42 });
    expect(redis.get).toHaveBeenCalledWith('idempotency:key-abc');
  });

  it('should cache response for POST with new idempotency key', async () => {
    redis.get.mockResolvedValue(null);
    const context = createContext('POST', 'key-new');
    const next = createCallHandler({ id: 1, created: true });

    const result$ = await interceptor.intercept(context, next);
    const result = await lastValueFrom(result$);

    expect(result).toEqual({ id: 1, created: true });
    // Wait for tap to execute
    await new Promise(resolve => setTimeout(resolve, 10));
    expect(redis.set).toHaveBeenCalledWith(
      'idempotency:key-new',
      JSON.stringify({ id: 1, created: true }),
      86400,
    );
  });

  it('should work for PUT requests with idempotency key', async () => {
    redis.get.mockResolvedValue(null);
    const context = createContext('PUT', 'key-put');
    const next = createCallHandler({ updated: true });

    const result$ = await interceptor.intercept(context, next);
    const result = await lastValueFrom(result$);

    expect(result).toEqual({ updated: true });
  });

  it('should work for PATCH requests with idempotency key', async () => {
    redis.get.mockResolvedValue(null);
    const context = createContext('PATCH', 'key-patch');
    const next = createCallHandler({ patched: true });

    const result$ = await interceptor.intercept(context, next);
    const result = await lastValueFrom(result$);

    expect(result).toEqual({ patched: true });
  });

  it('should skip cache when redis is unavailable (check cached)', async () => {
    redis.isAvailable = false;
    const context = createContext('POST', 'key-no-redis');
    const next = createCallHandler({ id: 5 });

    const result$ = await interceptor.intercept(context, next);
    const result = await lastValueFrom(result$);

    expect(result).toEqual({ id: 5 });
    expect(redis.get).not.toHaveBeenCalled();
  });

  it('should skip storing in cache when redis is unavailable (tap)', async () => {
    redis.isAvailable = true;
    redis.get.mockResolvedValue(null);
    const context = createContext('POST', 'key-store');
    const next = createCallHandler({ id: 10 });

    const result$ = await interceptor.intercept(context, next);
    // Before tap, flip redis off
    redis.isAvailable = false;
    await lastValueFrom(result$);
    await new Promise(resolve => setTimeout(resolve, 10));

    expect(redis.set).not.toHaveBeenCalled();
  });
});
