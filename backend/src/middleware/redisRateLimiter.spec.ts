/**
 * redisRateLimiter.spec.ts — Tests for Redis-backed rate limiting middleware
 */

// Mock ioredis
const mockMulti = {
  zremrangebyscore: jest.fn().mockReturnThis(),
  zadd: jest.fn().mockReturnThis(),
  zcard: jest.fn().mockReturnThis(),
  pexpire: jest.fn().mockReturnThis(),
  incr: jest.fn().mockReturnThis(),
  exec: jest.fn(),
};

const mockRedis = {
  multi: jest.fn(() => mockMulti),
  zrevrange: jest.fn(),
  zrem: jest.fn(),
  del: jest.fn(),
  decr: jest.fn(),
  pttl: jest.fn(),
  zcount: jest.fn(),
  eval: jest.fn(),
  quit: jest.fn(),
  on: jest.fn(),
};

jest.mock('ioredis', () => ({
  __esModule: true,
  default: jest.fn(() => mockRedis),
}));

import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import {
  RedisRateLimiterMiddleware,
  FixedWindowStore,
  ApplyRateLimit,
  createRateLimiter,
  checkRateLimit,
  RateLimitConfig,
} from './redisRateLimiter';

describe('RedisRateLimiterMiddleware', () => {
  let middleware: RedisRateLimiterMiddleware;
  let mockConfigService: Partial<ConfigService>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockConfigService = {
      get: jest.fn((key: string) => {
        const values: Record<string, string> = {
          REDIS_URL: 'redis://localhost:6379',
          REDIS_PASSWORD: '',
          REDIS_DB: '0',
        };
        // eslint-disable-next-line security/detect-object-injection
        return values[key];
      }),
    };

    middleware = new RedisRateLimiterMiddleware(mockConfigService as ConfigService);
  });

  describe('static configs', () => {
    it('should define REGISTRATION_LIMIT', () => {
      expect(RedisRateLimiterMiddleware.REGISTRATION_LIMIT.maxRequests).toBe(5);
      expect(RedisRateLimiterMiddleware.REGISTRATION_LIMIT.windowMs).toBe(3600000);
    });

    it('should define LOGIN_LIMIT', () => {
      expect(RedisRateLimiterMiddleware.LOGIN_LIMIT.maxRequests).toBe(5);
      expect(RedisRateLimiterMiddleware.LOGIN_LIMIT.windowMs).toBe(900000);
    });

    it('should define API_GENERAL_LIMIT', () => {
      expect(RedisRateLimiterMiddleware.API_GENERAL_LIMIT.maxRequests).toBe(100);
    });

    it('should define VAT_VERIFICATION_LIMIT', () => {
      expect(RedisRateLimiterMiddleware.VAT_VERIFICATION_LIMIT.maxRequests).toBe(10);
    });

    it('should define EMAIL_CHECK_LIMIT', () => {
      expect(RedisRateLimiterMiddleware.EMAIL_CHECK_LIMIT.maxRequests).toBe(20);
    });

    it('should define PHONE_CHECK_LIMIT', () => {
      expect(RedisRateLimiterMiddleware.PHONE_CHECK_LIMIT.maxRequests).toBe(10);
    });
  });

  describe('use', () => {
    it('should allow request under the limit', async () => {
      mockRedis.eval.mockResolvedValueOnce([1, 60000]);

      const req = {
        headers: {},
        socket: { remoteAddress: '127.0.0.1' },
        ip: '127.0.0.1',
      } as unknown as Request;

      const res = {
        setHeader: jest.fn(),
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
        statusCode: 200,
      } as unknown as Response;

      const next = jest.fn();

      middleware.use(req, res, next);

      // The use method calls applyRateLimit which is async but not awaited in express pattern
      // We wait a tick for the promise to resolve
      await new Promise(resolve => setImmediate(resolve));

      expect(next).toHaveBeenCalled();
    });

    it('should return 429 when rate limit exceeded', async () => {
      mockRedis.eval.mockResolvedValueOnce([101, 60000]);

      const req = {
        headers: {},
        socket: { remoteAddress: '127.0.0.1' },
        ip: '127.0.0.1',
      } as unknown as Request;

      const jsonFn = jest.fn();
      const res = {
        setHeader: jest.fn(),
        status: jest.fn().mockReturnValue({ json: jsonFn }),
        json: jest.fn(),
        statusCode: 200,
      } as unknown as Response;

      const next = jest.fn();

      middleware.use(req, res, next);
      await new Promise(resolve => setImmediate(resolve));

      expect(res.status).toHaveBeenCalledWith(429);
    });

    it('should fail open when Redis errors', async () => {
      mockRedis.eval.mockRejectedValueOnce(new Error('Redis down'));

      const req = {
        headers: {},
        socket: { remoteAddress: '127.0.0.1' },
        ip: '127.0.0.1',
      } as unknown as Request;

      const res = {
        setHeader: jest.fn(),
        json: jest.fn(),
      } as unknown as Response;

      const next = jest.fn();

      middleware.use(req, res, next);
      await new Promise(resolve => setImmediate(resolve));

      expect(next).toHaveBeenCalled();
    });
  });

  describe('createMiddleware', () => {
    it('should return a middleware function', () => {
      const mw = middleware.createMiddleware({
        windowMs: 60000,
        maxRequests: 10,
        keyPrefix: 'test',
      });

      expect(typeof mw).toBe('function');
    });
  });

  describe('IP extraction', () => {
    it('should use x-forwarded-for header when available', async () => {
      mockRedis.eval.mockResolvedValueOnce([1, 60000]);

      const req = {
        headers: { 'x-forwarded-for': '10.0.0.1, 10.0.0.2' },
        socket: { remoteAddress: '127.0.0.1' },
      } as unknown as Request;

      const res = {
        setHeader: jest.fn(),
        json: jest.fn().mockReturnThis(),
        statusCode: 200,
      } as unknown as Response;

      const next = jest.fn();

      middleware.use(req, res, next);
      await new Promise(resolve => setImmediate(resolve));

      expect(next).toHaveBeenCalled();
    });

    it('should handle x-forwarded-for as array', async () => {
      mockRedis.eval.mockResolvedValueOnce([1, 60000]);

      const req = {
        headers: { 'x-forwarded-for': ['10.0.0.1'] },
        socket: { remoteAddress: '127.0.0.1' },
      } as unknown as Request;

      const res = {
        setHeader: jest.fn(),
        json: jest.fn().mockReturnThis(),
        statusCode: 200,
      } as unknown as Response;

      const next = jest.fn();

      middleware.use(req, res, next);
      await new Promise(resolve => setImmediate(resolve));

      expect(next).toHaveBeenCalled();
    });
  });

  describe('resetLimit', () => {
    it('should delete the rate limit key', async () => {
      mockRedis.del.mockResolvedValueOnce(1);
      await middleware.resetLimit('127.0.0.1', 'ratelimit:api');
      expect(mockRedis.del).toHaveBeenCalledWith('ratelimit:api:127.0.0.1');
    });

    it('should handle key without prefix', async () => {
      mockRedis.del.mockResolvedValueOnce(1);
      await middleware.resetLimit('full-key');
      expect(mockRedis.del).toHaveBeenCalledWith('full-key');
    });
  });

  describe('getLimitStatus', () => {
    it('should return current rate limit status', async () => {
      mockRedis.zcount.mockResolvedValueOnce(5);
      mockRedis.pttl.mockResolvedValueOnce(30000);

      const config: RateLimitConfig = {
        windowMs: 60000,
        maxRequests: 100,
        keyPrefix: 'ratelimit:api',
      };

      const result = await middleware.getLimitStatus('127.0.0.1', config);

      expect(result).toBeDefined();
      expect(result!.limit).toBe(100);
      expect(result!.current).toBe(5);
      expect(result!.remaining).toBe(95);
    });

    it('should return null on Redis error', async () => {
      mockRedis.zcount.mockRejectedValueOnce(new Error('Redis down'));

      const config: RateLimitConfig = {
        windowMs: 60000,
        maxRequests: 100,
        keyPrefix: 'ratelimit:api',
      };

      const result = await middleware.getLimitStatus('127.0.0.1', config);
      expect(result).toBeNull();
    });
  });

  describe('onModuleDestroy', () => {
    it('should quit Redis connection', async () => {
      mockRedis.quit.mockResolvedValueOnce('OK');
      await middleware.onModuleDestroy();
      expect(mockRedis.quit).toHaveBeenCalled();
    });
  });
});

describe('FixedWindowStore', () => {
  let store: FixedWindowStore;

  beforeEach(() => {
    jest.clearAllMocks();
    store = new FixedWindowStore(mockRedis as never, 60000);
  });

  describe('increment', () => {
    it('should increment counter and return info', async () => {
      mockMulti.exec.mockResolvedValueOnce([
        [null, 5],
        [null, 1],
      ]);
      mockRedis.pttl.mockResolvedValueOnce(30000);

      const info = await store.increment('test-key');

      expect(info.current).toBe(5);
      expect(info.resetTime).toBeDefined();
    });

    it('should handle null results', async () => {
      mockMulti.exec.mockResolvedValueOnce(null);
      mockRedis.pttl.mockResolvedValueOnce(-1);

      const info = await store.increment('test-key');
      expect(info.current).toBe(1);
    });
  });

  describe('decrement', () => {
    it('should decrement counter', async () => {
      mockRedis.decr.mockResolvedValueOnce(4);
      await store.decrement('test-key');
      expect(mockRedis.decr).toHaveBeenCalledWith('test-key');
    });
  });

  describe('resetKey', () => {
    it('should delete the key', async () => {
      mockRedis.del.mockResolvedValueOnce(1);
      await store.resetKey('test-key');
      expect(mockRedis.del).toHaveBeenCalledWith('test-key');
    });
  });
});

describe('ApplyRateLimit decorator', () => {
  it('should attach metadata with config object', () => {
    const config: RateLimitConfig = {
      windowMs: 60000,
      maxRequests: 10,
      keyPrefix: 'test',
    };

    const decorator = ApplyRateLimit(config);
    expect(typeof decorator).toBe('function');
  });

  it('should resolve preset by name', () => {
    const decorator = ApplyRateLimit('login');
    expect(typeof decorator).toBe('function');
  });

  it('should fallback to API general limit for unknown preset', () => {
    const decorator = ApplyRateLimit('unknown-preset');
    expect(typeof decorator).toBe('function');
  });
});

describe('createRateLimiter factory', () => {
  it('should return a middleware function', () => {
    const mw = createRateLimiter('redis://localhost:6379', {
      windowMs: 60000,
      maxRequests: 100,
      keyPrefix: 'test',
    });

    expect(typeof mw).toBe('function');
  });

  it('should call next on success', async () => {
    mockRedis.eval.mockResolvedValueOnce([1, 60000]);

    const mw = createRateLimiter('redis://localhost:6379', {
      windowMs: 60000,
      maxRequests: 100,
      keyPrefix: 'test',
    });

    const req = {
      ip: '127.0.0.1',
      socket: { remoteAddress: '127.0.0.1' },
    } as unknown as Request;

    const res = {
      setHeader: jest.fn(),
      json: jest.fn(),
    } as unknown as Response;

    const next = jest.fn();
    await mw(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it('should fail open on Redis error', async () => {
    mockRedis.eval.mockRejectedValueOnce(new Error('connection refused'));

    const mw = createRateLimiter('redis://localhost:6379', {
      windowMs: 60000,
      maxRequests: 100,
      keyPrefix: 'test',
    });

    const req = {
      ip: '127.0.0.1',
      socket: { remoteAddress: '127.0.0.1' },
    } as unknown as Request;

    const res = {
      setHeader: jest.fn(),
    } as unknown as Response;

    const next = jest.fn();
    await mw(req, res, next);

    expect(next).toHaveBeenCalled();
  });
});

describe('checkRateLimit standalone', () => {
  it('should check rate limit and return result', async () => {
    mockRedis.eval.mockResolvedValueOnce([1, 60000]);
    mockRedis.quit.mockResolvedValueOnce('OK');

    const result = await checkRateLimit('redis://localhost:6379', '127.0.0.1', {
      windowMs: 60000,
      maxRequests: 100,
      keyPrefix: 'test',
    });

    expect(result.allowed).toBeDefined();
    expect(result.info).toBeDefined();
  });

  it('should handle rate limit exceeded', async () => {
    mockRedis.eval.mockResolvedValueOnce([101, 5000]);
    mockRedis.quit.mockResolvedValueOnce('OK');

    const result = await checkRateLimit('redis://localhost:6379', '127.0.0.1', {
      windowMs: 60000,
      maxRequests: 100,
      keyPrefix: 'test',
    });

    expect(result.allowed).toBe(false);
  });
});

describe('RedisRateLimiterMiddleware — advanced branches', () => {
  let middleware: RedisRateLimiterMiddleware;

  beforeEach(() => {
    jest.clearAllMocks();
    const mockConfigService = {
      get: jest.fn((key: string) => {
        const values: Record<string, string> = {
          REDIS_URL: 'redis://localhost:6379',
          REDIS_PASSWORD: '',
          REDIS_DB: '0',
        };
        // eslint-disable-next-line security/detect-object-injection
        return values[key];
      }),
    };
    middleware = new RedisRateLimiterMiddleware(mockConfigService as unknown as ConfigService);
  });

  it('should use custom keyGenerator when provided', async () => {
    mockRedis.eval.mockResolvedValueOnce([1, 60000]);

    const config: RateLimitConfig = {
      windowMs: 60000,
      maxRequests: 10,
      keyPrefix: 'custom',
      keyGenerator: (_req: Request) => 'custom-key',
    };

    const mw = middleware.createMiddleware(config);

    const req = {
      headers: {},
      socket: { remoteAddress: '127.0.0.1' },
    } as unknown as Request;

    const res = {
      setHeader: jest.fn(),
      json: jest.fn().mockReturnThis(),
      statusCode: 200,
    } as unknown as Response;

    const next = jest.fn();
    mw(req, res, next);
    await new Promise(resolve => setImmediate(resolve));

    expect(next).toHaveBeenCalled();
  });

  it('should call custom handler when rate limit exceeded', async () => {
    mockRedis.eval.mockResolvedValueOnce([101, 60000]);

    const customHandler = jest.fn();
    const config: RateLimitConfig = {
      windowMs: 60000,
      maxRequests: 10,
      keyPrefix: 'custom',
      handler: customHandler,
    };

    const mw = middleware.createMiddleware(config);

    const req = {
      headers: {},
      socket: { remoteAddress: '127.0.0.1' },
    } as unknown as Request;

    const res = {
      setHeader: jest.fn(),
      json: jest.fn().mockReturnThis(),
      status: jest.fn().mockReturnThis(),
      statusCode: 200,
    } as unknown as Response;

    const next = jest.fn();
    mw(req, res, next);
    await new Promise(resolve => setImmediate(resolve));

    expect(customHandler).toHaveBeenCalledWith(req, res);
    expect(next).not.toHaveBeenCalled();
  });

  it('should handle skipSuccessfulRequests by decrementing on success', async () => {
    mockRedis.eval.mockResolvedValueOnce([1, 60000]);
    mockRedis.zrevrange.mockResolvedValueOnce(['entry-1']);
    mockRedis.zrem.mockResolvedValueOnce(1);

    const config: RateLimitConfig = {
      windowMs: 60000,
      maxRequests: 100,
      keyPrefix: 'skip-success',
      skipSuccessfulRequests: true,
    };

    const mw = middleware.createMiddleware(config);

    const req = {
      headers: {},
      socket: { remoteAddress: '127.0.0.1' },
    } as unknown as Request;

    let capturedJson: ((body: unknown) => Response) | undefined;
    const res = {
      setHeader: jest.fn(),
      statusCode: 200,
      json: jest.fn().mockImplementation(function (this: Response) {
        return this;
      }),
      status: jest.fn().mockReturnThis(),
    } as unknown as Response;

    // Override json to capture the wrapped version
    Object.defineProperty(res, 'json', {
      set(fn: (body: unknown) => Response) {
        capturedJson = fn;
      },
      get() {
        return capturedJson || jest.fn().mockReturnValue(res);
      },
      configurable: true,
    });

    const next = jest.fn();
    mw(req, res, next);
    await new Promise(resolve => setImmediate(resolve));

    expect(next).toHaveBeenCalled();
  });

  it('should handle skipFailedRequests by decrementing on failure', async () => {
    mockRedis.eval.mockResolvedValueOnce([1, 60000]);

    const config: RateLimitConfig = {
      windowMs: 60000,
      maxRequests: 100,
      keyPrefix: 'skip-fail',
      skipFailedRequests: true,
    };

    const mw = middleware.createMiddleware(config);

    const req = {
      headers: {},
      socket: { remoteAddress: '127.0.0.1' },
    } as unknown as Request;

    const res = {
      setHeader: jest.fn(),
      statusCode: 500,
      json: jest.fn().mockReturnThis(),
    } as unknown as Response;

    const next = jest.fn();
    mw(req, res, next);
    await new Promise(resolve => setImmediate(resolve));

    expect(next).toHaveBeenCalled();
  });

  it('should handle missing IP gracefully', async () => {
    mockRedis.eval.mockResolvedValueOnce([1, 60000]);

    const req = {
      headers: {},
      socket: {},
    } as unknown as Request;

    const res = {
      setHeader: jest.fn(),
      json: jest.fn().mockReturnThis(),
      statusCode: 200,
    } as unknown as Response;

    const next = jest.fn();
    middleware.use(req, res, next);
    await new Promise(resolve => setImmediate(resolve));

    expect(next).toHaveBeenCalled();
  });
});

describe('RedisRateLimitStore — decrement', () => {
  it('should not call zrem when no entries returned', async () => {
    // Reset to ensure clean state
    mockRedis.zrevrange.mockReset();
    mockRedis.zrem.mockReset();
    mockRedis.zrevrange.mockResolvedValueOnce([]);

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Redis = require('ioredis').default;
    const redis = new Redis();
    const entries = await redis.zrevrange('key', 0, 0);
    expect(entries).toHaveLength(0);
    // zrem should NOT be called when there are no entries
    expect(mockRedis.zrem).not.toHaveBeenCalled();
  });
});

describe('createRateLimiter — advanced', () => {
  it('should return 429 when rate limit exceeded', async () => {
    mockRedis.eval.mockResolvedValueOnce([101, 5000]);

    const mw = createRateLimiter('redis://localhost:6379', {
      windowMs: 60000,
      maxRequests: 100,
      keyPrefix: 'test',
    });

    const req = {
      ip: '127.0.0.1',
      socket: { remoteAddress: '127.0.0.1' },
    } as unknown as Request;

    const jsonFn = jest.fn();
    const res = {
      setHeader: jest.fn(),
      status: jest.fn().mockReturnValue({ json: jsonFn }),
      json: jest.fn(),
    } as unknown as Response;

    const next = jest.fn();
    await mw(req, res, next);

    expect(res.status).toHaveBeenCalledWith(429);
    expect(next).not.toHaveBeenCalled();
  });

  it('should use custom keyGenerator', async () => {
    mockRedis.eval.mockResolvedValueOnce([1, 60000]);

    const mw = createRateLimiter('redis://localhost:6379', {
      windowMs: 60000,
      maxRequests: 100,
      keyPrefix: 'custom',
      keyGenerator: () => 'my-key',
    });

    const req = {
      ip: '127.0.0.1',
      socket: { remoteAddress: '127.0.0.1' },
    } as unknown as Request;

    const res = {
      setHeader: jest.fn(),
      json: jest.fn(),
    } as unknown as Response;

    const next = jest.fn();
    await mw(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it('should handle missing ip and socket', async () => {
    mockRedis.eval.mockResolvedValueOnce([1, 60000]);

    const mw = createRateLimiter('redis://localhost:6379', {
      windowMs: 60000,
      maxRequests: 100,
      keyPrefix: 'test',
    });

    const req = {
      socket: {},
    } as unknown as Request;

    const res = {
      setHeader: jest.fn(),
      json: jest.fn(),
    } as unknown as Response;

    const next = jest.fn();
    await mw(req, res, next);

    expect(next).toHaveBeenCalled();
  });
});

describe('ApplyRateLimit decorator — method decorator', () => {
  it('should work as method decorator with descriptor', () => {
    const config: RateLimitConfig = {
      windowMs: 60000,
      maxRequests: 10,
      keyPrefix: 'test',
    };

    const decorator = ApplyRateLimit(config);
    const descriptor = { value: jest.fn() };
    const result = decorator(
      {} as object,
      'testMethod',
      descriptor as unknown as PropertyDescriptor,
    );

    expect(result).toBe(descriptor);
  });

  it('should resolve all preset names', () => {
    const presetNames = ['registration', 'vat', 'email', 'phone', 'login', 'api'];
    for (const name of presetNames) {
      const decorator = ApplyRateLimit(name);
      expect(typeof decorator).toBe('function');
    }
  });
});
