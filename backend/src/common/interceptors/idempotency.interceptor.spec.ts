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

  describe('Branch: !hasIdempotencyKey (missing header)', () => {
    it('should return early and skip cache operations', async () => {
      const context = createContext('POST'); // No idempotency key
      const next = createCallHandler({ id: 1 });

      const result$ = await interceptor.intercept(context, next);
      const result = await lastValueFrom(result$);

      expect(result).toEqual({ id: 1 });
      expect(redis.get).not.toHaveBeenCalled();
      expect(redis.set).not.toHaveBeenCalled();
    });

    it('should return early for POST without key', async () => {
      const context = createContext('POST');
      const next = createCallHandler({ status: 'ok' });

      const result$ = await interceptor.intercept(context, next);
      const result = await lastValueFrom(result$);

      expect(result).toEqual({ status: 'ok' });
      expect(redis.get).not.toHaveBeenCalled();
    });

    it('should return early for PUT without key', async () => {
      const context = createContext('PUT');
      const next = createCallHandler({ updated: true });

      const result$ = await interceptor.intercept(context, next);
      const result = await lastValueFrom(result$);

      expect(result).toEqual({ updated: true });
      expect(redis.get).not.toHaveBeenCalled();
    });

    it('should return early for PATCH without key', async () => {
      const context = createContext('PATCH');
      const next = createCallHandler({ patched: true });

      const result$ = await interceptor.intercept(context, next);
      const result = await lastValueFrom(result$);

      expect(result).toEqual({ patched: true });
      expect(redis.get).not.toHaveBeenCalled();
    });
  });

  describe('Branch: !isMutativeMethod (non-mutative HTTP method)', () => {
    it('should return early for GET request even with idempotency key', async () => {
      const context = createContext('GET', 'key-123');
      const next = createCallHandler({ data: 'test' });

      const result$ = await interceptor.intercept(context, next);
      const result = await lastValueFrom(result$);

      expect(result).toEqual({ data: 'test' });
      expect(redis.get).not.toHaveBeenCalled();
    });

    it('should return early for DELETE request even with idempotency key', async () => {
      const context = createContext('DELETE', 'key-123');
      const next = createCallHandler({ deleted: true });

      const result$ = await interceptor.intercept(context, next);
      const result = await lastValueFrom(result$);

      expect(result).toEqual({ deleted: true });
      expect(redis.get).not.toHaveBeenCalled();
    });

    it('should return early for HEAD request even with idempotency key', async () => {
      const context = createContext('HEAD', 'key-456');
      const next = createCallHandler({ headers: {} });

      const result$ = await interceptor.intercept(context, next);
      const result = await lastValueFrom(result$);

      expect(result).toEqual({ headers: {} });
      expect(redis.get).not.toHaveBeenCalled();
    });

    it('should return early for OPTIONS request even with idempotency key', async () => {
      const context = createContext('OPTIONS', 'key-789');
      const next = createCallHandler({});

      const result$ = await interceptor.intercept(context, next);
      const result = await lastValueFrom(result$);

      expect(result).toEqual({});
      expect(redis.get).not.toHaveBeenCalled();
    });
  });

  describe('Branch: hasIdempotencyKey && isMutativeMethod (cache-eligible request)', () => {
    it('should attempt cache lookup for POST with valid key', async () => {
      redis.get.mockResolvedValueOnce(null);
      const context = createContext('POST', 'key-abc');
      const next = createCallHandler({ id: 99 });

      const result$ = await interceptor.intercept(context, next);
      await lastValueFrom(result$);

      expect(redis.get).toHaveBeenCalledWith('idempotency:key-abc');
    });

    it('should attempt cache lookup for PUT with valid key', async () => {
      redis.get.mockResolvedValueOnce(null);
      const context = createContext('PUT', 'key-xyz');
      const next = createCallHandler({ id: 100 });

      const result$ = await interceptor.intercept(context, next);
      await lastValueFrom(result$);

      expect(redis.get).toHaveBeenCalledWith('idempotency:key-xyz');
    });

    it('should attempt cache lookup for PATCH with valid key', async () => {
      redis.get.mockResolvedValueOnce(null);
      const context = createContext('PATCH', 'key-patch');
      const next = createCallHandler({ patched: true });

      const result$ = await interceptor.intercept(context, next);
      await lastValueFrom(result$);

      expect(redis.get).toHaveBeenCalledWith('idempotency:key-patch');
    });
  });

  describe('Branch: redis.isAvailable check (before cache GET)', () => {
    it('should skip cache lookup when redis.isAvailable is false', async () => {
      redis.isAvailable = false;
      const context = createContext('POST', 'key-no-redis');
      const next = createCallHandler({ id: 5 });

      const result$ = await interceptor.intercept(context, next);
      const result = await lastValueFrom(result$);

      expect(result).toEqual({ id: 5 });
      expect(redis.get).not.toHaveBeenCalled();
      // But should execute next handler
    });

    it('should perform cache lookup when redis.isAvailable is true', async () => {
      redis.isAvailable = true;
      redis.get.mockResolvedValueOnce(null);
      const context = createContext('POST', 'key-redis-on');
      const next = createCallHandler({ id: 10 });

      const result$ = await interceptor.intercept(context, next);
      await lastValueFrom(result$);

      expect(redis.get).toHaveBeenCalledWith('idempotency:key-redis-on');
    });
  });

  describe('Branch: cached response exists (hit)', () => {
    it('should return cached response when available', async () => {
      redis.isAvailable = true;
      redis.get.mockResolvedValueOnce(JSON.stringify({ id: 42, fromCache: true }));
      const context = createContext('POST', 'key-cache-hit');
      const next = createCallHandler({ id: 99, fresh: true });

      const result$ = await interceptor.intercept(context, next);
      const result = await lastValueFrom(result$);

      expect(result).toEqual({ id: 42, fromCache: true });
      // next.handle should NOT be called since we returned cached response
    });

    it('should parse JSON cached response correctly', async () => {
      redis.isAvailable = true;
      const cachedData = { status: 'success', code: 200, message: 'Done' };
      redis.get.mockResolvedValueOnce(JSON.stringify(cachedData));
      const context = createContext('POST', 'key-json');
      const next = createCallHandler({ status: 'fresh' });

      const result$ = await interceptor.intercept(context, next);
      const result = await lastValueFrom(result$);

      expect(result).toEqual(cachedData);
    });

    it('should not call next handler when returning cached response', async () => {
      redis.isAvailable = true;
      redis.get.mockResolvedValueOnce(JSON.stringify({ cached: true }));
      const context = createContext('POST', 'key-no-next');
      const next = { handle: jest.fn(() => of({ fresh: true })) };

      const result$ = await interceptor.intercept(context, next);
      await lastValueFrom(result$);

      expect(next.handle).not.toHaveBeenCalled();
    });
  });

  describe('Branch: cached response null/falsy (miss)', () => {
    it('should call next handler when cache miss (null)', async () => {
      redis.isAvailable = true;
      redis.get.mockResolvedValueOnce(null);
      const context = createContext('POST', 'key-miss');
      const next = createCallHandler({ id: 1, fresh: true });

      const result$ = await interceptor.intercept(context, next);
      const result = await lastValueFrom(result$);

      expect(result).toEqual({ id: 1, fresh: true });
      expect(redis.get).toHaveBeenCalled();
    });

    it('should cache result after miss and execute tap', async () => {
      redis.isAvailable = true;
      redis.get.mockResolvedValueOnce(null);
      const responseData = { id: 2, created: true };
      const context = createContext('POST', 'key-new');
      const next = createCallHandler(responseData);

      const result$ = await interceptor.intercept(context, next);
      const result = await lastValueFrom(result$);
      await new Promise(resolve => setTimeout(resolve, 20));

      expect(result).toEqual(responseData);
      expect(redis.set).toHaveBeenCalledWith(
        'idempotency:key-new',
        JSON.stringify(responseData),
        86400,
      );
    });
  });

  describe('Branch: redis.isAvailable check (inside tap during set)', () => {
    it('should skip caching when redis.isAvailable is false inside tap', async () => {
      redis.isAvailable = false;
      const context = createContext('POST', 'key-tap-no-redis');
      const next = createCallHandler({ id: 10 });

      const result$ = await interceptor.intercept(context, next);
      const result = await lastValueFrom(result$);
      await new Promise(resolve => setTimeout(resolve, 20));

      expect(result).toEqual({ id: 10 });
      expect(redis.set).not.toHaveBeenCalled();
    });

    it('should cache result when redis.isAvailable is true inside tap', async () => {
      redis.isAvailable = true;
      redis.get.mockResolvedValueOnce(null);
      const responseData = { id: 20, status: 'created' };
      const context = createContext('POST', 'key-tap-redis');
      const next = createCallHandler(responseData);

      const result$ = await interceptor.intercept(context, next);
      await lastValueFrom(result$);
      await new Promise(resolve => setTimeout(resolve, 20));

      expect(redis.set).toHaveBeenCalledWith(
        'idempotency:key-tap-redis',
        JSON.stringify(responseData),
        86400,
      );
    });

    it('should use TTL_SECONDS constant (86400) for cache expiration', async () => {
      redis.isAvailable = true;
      redis.get.mockResolvedValueOnce(null);
      const context = createContext('POST', 'key-ttl');
      const next = createCallHandler({ data: 'test' });

      const result$ = await interceptor.intercept(context, next);
      await lastValueFrom(result$);
      await new Promise(resolve => setTimeout(resolve, 20));

      expect(redis.set).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        86400, // 24h
      );
    });
  });

  describe('Integration: full cache scenarios', () => {
    it('should handle complete POST flow with cache miss then subsequent hit', async () => {
      redis.isAvailable = true;
      const responseData = { id: 1, created: true };

      // First request - cache miss
      redis.get.mockResolvedValueOnce(null);
      const context1 = createContext('POST', 'key-flow');
      const next1 = createCallHandler(responseData);

      const result1$ = await interceptor.intercept(context1, next1);
      const result1 = await lastValueFrom(result1$);
      await new Promise(resolve => setTimeout(resolve, 20));

      expect(result1).toEqual(responseData);
      expect(redis.get).toHaveBeenCalledWith('idempotency:key-flow');
      expect(redis.set).toHaveBeenCalledWith(
        'idempotency:key-flow',
        JSON.stringify(responseData),
        86400,
      );

      // Second request - cache hit
      jest.clearAllMocks();
      redis.get.mockResolvedValueOnce(JSON.stringify(responseData));
      const context2 = createContext('POST', 'key-flow');
      const next2 = { handle: jest.fn(() => of({ id: 99, different: true })) };

      const result2$ = await interceptor.intercept(context2, next2);
      const result2 = await lastValueFrom(result2$);

      expect(result2).toEqual(responseData);
      expect(next2.handle).not.toHaveBeenCalled();
    });

    it('should handle PUT request with idempotency', async () => {
      redis.isAvailable = true;
      redis.get.mockResolvedValueOnce(null);
      const responseData = { id: 5, updated: true };
      const context = createContext('PUT', 'key-put');
      const next = createCallHandler(responseData);

      const result$ = await interceptor.intercept(context, next);
      const result = await lastValueFrom(result$);
      await new Promise(resolve => setTimeout(resolve, 20));

      expect(result).toEqual(responseData);
      expect(redis.set).toHaveBeenCalled();
    });

    it('should handle PATCH request with idempotency', async () => {
      redis.isAvailable = true;
      redis.get.mockResolvedValueOnce(null);
      const responseData = { id: 5, patched: true };
      const context = createContext('PATCH', 'key-patch');
      const next = createCallHandler(responseData);

      const result$ = await interceptor.intercept(context, next);
      const result = await lastValueFrom(result$);
      await new Promise(resolve => setTimeout(resolve, 20));

      expect(result).toEqual(responseData);
      expect(redis.set).toHaveBeenCalled();
    });
  });
});
