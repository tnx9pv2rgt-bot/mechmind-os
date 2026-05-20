import { HttpException, HttpStatus, ExecutionContext } from '@nestjs/common';
import { AdvancedThrottlerGuard } from './throttler.guard';
import { Request } from 'express';

// We need to extend AdvancedThrottlerGuard to expose protected methods for testing
class TestableThrottlerGuard extends AdvancedThrottlerGuard {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor() {
    // Pass minimal deps to avoid NestThrottlerGuard constructor issues
    super(
      {} as never, // ThrottlerOptions
      {} as never, // ThrottlerStorage
      {} as never, // Reflector
    );
  }

  public async testGetTracker(req: Request): Promise<string> {
    return this.getTracker(req);
  }

  public async testGetThrottlerOptions(
    context: ExecutionContext,
  ): Promise<{ ttl: number; limit: number }> {
    return this.getThrottlerOptions(context);
  }

  public testThrowThrottlingException(): Promise<void> {
    return this.throwThrottlingException();
  }
}

describe('AdvancedThrottlerGuard', () => {
  let guard: TestableThrottlerGuard;

  beforeEach(() => {
    guard = new TestableThrottlerGuard();
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  // =========================================================================
  // throwThrottlingException
  // =========================================================================
  describe('throwThrottlingException', () => {
    it('should throw HttpException with 429 status', () => {
      expect(() => guard.testThrowThrottlingException()).toThrow(HttpException);
    });

    it('should include rate limit message', () => {
      try {
        guard.testThrowThrottlingException();
        fail('Expected HttpException');
      } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
        expect((error as HttpException).getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
        const response = (error as HttpException).getResponse() as Record<string, unknown>;
        expect(response.message).toContain('Rate limit exceeded');
        expect(response.retryAfter).toBe(60);
      }
    });
  });

  // =========================================================================
  // getTracker
  // =========================================================================
  describe('getTracker', () => {
    it('should return tenant-scoped tracker when user has tenantId', async () => {
      const req = {
        headers: {},
        ip: '127.0.0.1',
        user: { sub: 'user-001', tenantId: 'tenant-001' },
      } as unknown as Request;

      const tracker = await guard.testGetTracker(req);

      expect(tracker).toBe('tenant:tenant-001:user-001');
    });

    it('should use IP when tenantId present but no sub', async () => {
      const req = {
        headers: {},
        ip: '192.168.1.1',
        user: { tenantId: 'tenant-001' },
      } as unknown as Request;

      const tracker = await guard.testGetTracker(req);

      expect(tracker).toBe('tenant:tenant-001:192.168.1.1');
    });

    it('should return user-scoped tracker when user has sub but no tenantId', async () => {
      const req = {
        headers: {},
        ip: '127.0.0.1',
        user: { sub: 'user-001' },
      } as unknown as Request;

      const tracker = await guard.testGetTracker(req);

      expect(tracker).toBe('user:user-001');
    });

    it('should return IP-scoped tracker when no user', async () => {
      const req = {
        headers: {},
        ip: '10.0.0.1',
      } as unknown as Request;

      const tracker = await guard.testGetTracker(req);

      expect(tracker).toBe('ip:10.0.0.1');
    });

    it('should use X-Forwarded-For header when available', async () => {
      const req = {
        headers: { 'x-forwarded-for': '203.0.113.50, 70.41.3.18' },
        ip: '127.0.0.1',
      } as unknown as Request;

      const tracker = await guard.testGetTracker(req);

      expect(tracker).toBe('ip:203.0.113.50');
    });

    it('should use X-Real-IP header when X-Forwarded-For is absent', async () => {
      const req = {
        headers: { 'x-real-ip': '203.0.113.99' },
        ip: '127.0.0.1',
      } as unknown as Request;

      const tracker = await guard.testGetTracker(req);

      expect(tracker).toBe('ip:203.0.113.99');
    });

    it('should handle array X-Forwarded-For', async () => {
      const req = {
        headers: { 'x-forwarded-for': ['203.0.113.50', '70.41.3.18'] },
        ip: '127.0.0.1',
      } as unknown as Request;

      const tracker = await guard.testGetTracker(req);

      expect(tracker).toBe('ip:203.0.113.50');
    });

    it('should handle array X-Real-IP', async () => {
      const req = {
        headers: { 'x-real-ip': ['203.0.113.99', '10.0.0.1'] },
        ip: '127.0.0.1',
      } as unknown as Request;

      const tracker = await guard.testGetTracker(req);

      expect(tracker).toBe('ip:203.0.113.99');
    });

    it('should fallback to "unknown" when no IP available', async () => {
      const req = {
        headers: {},
        ip: undefined,
      } as unknown as Request;

      const tracker = await guard.testGetTracker(req);

      expect(tracker).toBe('ip:unknown');
    });
  });

  // =========================================================================
  // getThrottlerOptions — rate limits per path
  // =========================================================================
  describe('getThrottlerOptions', () => {
    const createContext = (path: string, method = 'GET'): ExecutionContext =>
      ({
        switchToHttp: () => ({
          getRequest: () => ({ path, method }) as unknown as Request,
        }),
        getHandler: () => jest.fn(),
        getClass: () => jest.fn(),
      }) as unknown as ExecutionContext;

    it('should return strict limits for /auth/login', async () => {
      const opts = await guard.testGetThrottlerOptions(createContext('/auth/login', 'POST'));
      expect(opts.limit).toBe(5);
      expect(opts.ttl).toBe(60);
    });

    it('should return strict limits for /auth/verify-2fa', async () => {
      const opts = await guard.testGetThrottlerOptions(createContext('/auth/verify-2fa'));
      expect(opts.limit).toBe(5);
    });

    it('should return very strict limits for /auth/reset-password', async () => {
      const opts = await guard.testGetThrottlerOptions(createContext('/auth/reset-password'));
      expect(opts.limit).toBe(3);
      expect(opts.ttl).toBe(3600);
    });

    it('should return very strict limits for /auth/forgot-password', async () => {
      const opts = await guard.testGetThrottlerOptions(createContext('/auth/forgot-password'));
      expect(opts.limit).toBe(3);
    });

    it('should return moderate limits for /auth/2fa', async () => {
      const opts = await guard.testGetThrottlerOptions(createContext('/auth/2fa/setup'));
      expect(opts.limit).toBe(10);
    });

    it('should return higher limits for /webhook endpoints', async () => {
      const opts = await guard.testGetThrottlerOptions(createContext('/webhooks/scalapay'));
      expect(opts.limit).toBe(100);
    });

    it('should return higher limits for /voice endpoints', async () => {
      const opts = await guard.testGetThrottlerOptions(createContext('/voice/calls'));
      expect(opts.limit).toBe(200);
    });

    it('should return general API limits for /api/v1/ paths', async () => {
      const opts = await guard.testGetThrottlerOptions(createContext('/api/v1/customers'));
      expect(opts.limit).toBe(100);
    });

    it('should return high limits for /graphql', async () => {
      const opts = await guard.testGetThrottlerOptions(createContext('/graphql'));
      expect(opts.limit).toBe(500);
    });

    it('should return high limits for /ws', async () => {
      const opts = await guard.testGetThrottlerOptions(createContext('/ws'));
      expect(opts.limit).toBe(500);
    });

    it('should return default limits for unknown paths', async () => {
      const opts = await guard.testGetThrottlerOptions(createContext('/some/other/path'));
      expect(opts.limit).toBe(60);
      expect(opts.ttl).toBe(60);
    });
  });
});
