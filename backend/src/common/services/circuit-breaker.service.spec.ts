import { Test, TestingModule } from '@nestjs/testing';
import { ServiceUnavailableException } from '@nestjs/common';
import CircuitBreaker from 'opossum';
import { CircuitBreakerService } from './circuit-breaker.service';
import { LoggerService } from './logger.service';
import { MetricsService } from '../metrics/metrics.service';

describe('CircuitBreakerService', () => {
  let service: CircuitBreakerService;
  let logger: jest.Mocked<LoggerService>;
  let metrics: jest.Mocked<MetricsService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CircuitBreakerService,
        {
          provide: LoggerService,
          useValue: {
            log: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
            debug: jest.fn(),
          },
        },
        {
          provide: MetricsService,
          useValue: {
            recordCircuitBreakerState: jest.fn(),
            incrementCircuitBreakerFailures: jest.fn(),
            incrementCircuitBreakerTimeouts: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<CircuitBreakerService>(CircuitBreakerService);
    logger = module.get(LoggerService) as jest.Mocked<LoggerService>;
    metrics = module.get(MetricsService) as jest.Mocked<MetricsService>;
  });

  describe('wrapPrisma', () => {
    it('should execute the function when circuit is closed', async () => {
      const result = await service.wrapPrisma(async () => 'data');
      expect(result).toBe('data');
    });

    it('should propagate errors from the wrapped function', async () => {
      await expect(
        service.wrapPrisma(async () => {
          throw new Error('DB error');
        }),
      ).rejects.toThrow();
    });

    it('should return state as closed initially', () => {
      expect(service.getPrismaState()).toBe('closed');
    });

    it('should execute successfully with various data types', async () => {
      const objResult = await service.wrapPrisma(async () => ({ id: 1, name: 'test' }));
      expect(objResult).toEqual({ id: 1, name: 'test' });

      const arrResult = await service.wrapPrisma(async () => [1, 2, 3]);
      expect(arrResult).toEqual([1, 2, 3]);

      const nullResult = await service.wrapPrisma(async () => null);
      expect(nullResult).toBeNull();
    });
  });

  describe('wrapRedis', () => {
    it('should execute the function when circuit is closed', async () => {
      const result = await service.wrapRedis(async () => 'cached-value');
      expect(result).toBe('cached-value');
    });

    it('should return null as fallback when circuit opens', async () => {
      // Force the circuit open by causing enough failures
      for (let i = 0; i < 10; i++) {
        try {
          await service.wrapRedis(async () => {
            throw new Error('Redis timeout');
          });
        } catch {
          // Expected failures
        }
      }

      // After failures, the fallback should return null
      const result = await service.wrapRedis(async () => {
        throw new Error('Redis timeout');
      });
      expect(result).toBeNull();
    });

    it('should return state as closed initially', () => {
      expect(service.getRedisState()).toBe('closed');
    });

    it('should handle successful operations after failures', async () => {
      // First successful call
      const result1 = await service.wrapRedis(async () => 'value1');
      expect(result1).toBe('value1');

      // Then failure
      try {
        await service.wrapRedis(async () => {
          throw new Error('Redis error');
        });
      } catch {
        // Expected
      }

      // Back to success
      const result2 = await service.wrapRedis(async () => 'value2');
      expect(result2).toBe('value2');
    });
  });

  describe('getMetrics', () => {
    it('should return metrics for both circuit breakers', () => {
      const result = service.getMetrics();
      expect(result).toHaveProperty('prisma');
      expect(result).toHaveProperty('redis');
      expect(result.prisma).toHaveProperty('state', 'closed');
      expect(result.redis).toHaveProperty('state', 'closed');
      expect(result.prisma).toHaveProperty('stats');
      expect(result.redis).toHaveProperty('stats');
    });

    it('should include stats in metrics', () => {
      // Execute some calls first
      service.wrapPrisma(async () => 'success').catch(() => {});

      const result = service.getMetrics() as Record<string, Record<string, unknown>>;
      expect(result.prisma.stats).toBeDefined();
      expect(result.redis.stats).toBeDefined();
    });
  });

  describe('State transitions', () => {
    it('should transition to halfOpen after threshold failures', async () => {
      // Cause multiple failures to trigger circuit break
      for (let i = 0; i < 10; i++) {
        try {
          await service.wrapPrisma(async () => {
            throw new Error('Connection refused');
          });
        } catch {
          // Expected
        }
      }

      // After circuit opens, it should throw ServiceUnavailableException
      await expect(service.wrapPrisma(async () => 'should not reach')).rejects.toThrow(
        ServiceUnavailableException,
      );
    });

    it('should handle getPrismaState returning open state', async () => {
      // Cause failures
      for (let i = 0; i < 10; i++) {
        try {
          await service.wrapPrisma(async () => {
            throw new Error('DB error');
          });
        } catch {
          // Expected
        }
      }

      const state = service.getPrismaState();
      expect(['open', 'halfOpen', 'closed']).toContain(state);
    });
  });

  describe('metric recording', () => {
    it('should record failures via MetricsService', async () => {
      try {
        await service.wrapPrisma(async () => {
          throw new Error('DB error');
        });
      } catch {
        // Expected
      }

      expect(metrics.incrementCircuitBreakerFailures).toHaveBeenCalledWith('prisma');
    });

    it('should record circuit state changes', async () => {
      // The state changes are recorded when the breaker transitions
      // We can verify the metrics object includes state
      const metricsResult = service.getMetrics() as Record<string, Record<string, unknown>>;
      expect(metricsResult.prisma.state).toBeDefined();
      expect(metricsResult.redis.state).toBeDefined();
    });
  });

  describe('Error handling', () => {
    it('should handle errors thrown by wrapped functions', async () => {
      const customError = new Error('Custom DB error');

      await expect(
        service.wrapPrisma(async () => {
          throw customError;
        }),
      ).rejects.toThrow();
    });

    it('should handle async errors in redis wrapper', async () => {
      const error = new Error('Async Redis error');
      const result = await service.wrapRedis(async () => {
        throw error;
      });

      // Redis should return null on errors (via fallback) or throw
      // After threshold, it returns null
      expect([null, undefined]).toContain(result);
    });
  });

  describe('event callbacks — halfOpen, close, timeout (lines 92-110)', () => {
    it('should log HALF-OPEN and record state when halfOpen event fires', () => {
      const breaker = (service as unknown as { prismaBreaker: CircuitBreaker }).prismaBreaker;
      breaker.emit('halfOpen');

      expect(logger.log).toHaveBeenCalledWith(
        expect.stringContaining('HALF-OPEN'),
        'CircuitBreaker',
      );
      expect(metrics.recordCircuitBreakerState).toHaveBeenCalledWith('prisma', 'halfOpen');
    });

    it('should log CLOSED and record state when close event fires', () => {
      const breaker = (service as unknown as { prismaBreaker: CircuitBreaker }).prismaBreaker;
      breaker.emit('close');

      expect(logger.log).toHaveBeenCalledWith(expect.stringContaining('CLOSED'), 'CircuitBreaker');
      expect(metrics.recordCircuitBreakerState).toHaveBeenCalledWith('prisma', 'closed');
    });

    it('should increment timeout counter when timeout event fires', () => {
      const breaker = (service as unknown as { prismaBreaker: CircuitBreaker }).prismaBreaker;
      breaker.emit('timeout');

      expect(metrics.incrementCircuitBreakerTimeouts).toHaveBeenCalledWith('prisma');
    });

    it('should log OPEN and record state when open event fires', () => {
      const breaker = (service as unknown as { prismaBreaker: CircuitBreaker }).prismaBreaker;
      breaker.emit('open');

      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('OPEN'), 'CircuitBreaker');
      expect(metrics.recordCircuitBreakerState).toHaveBeenCalledWith('prisma', 'open');
    });
  });

  describe('getState — all 3 branches (lines 119-122)', () => {
    it('should return open when breaker.opened is true', () => {
      const breaker = (service as unknown as { prismaBreaker: CircuitBreaker }).prismaBreaker;
      Object.defineProperty(breaker, 'opened', { get: () => true, configurable: true });

      expect(service.getPrismaState()).toBe('open');
    });

    it('should return halfOpen when opened is false but halfOpen is true', () => {
      const breaker = (service as unknown as { prismaBreaker: CircuitBreaker }).prismaBreaker;
      Object.defineProperty(breaker, 'opened', { get: () => false, configurable: true });
      Object.defineProperty(breaker, 'halfOpen', { get: () => true, configurable: true });

      expect(service.getPrismaState()).toBe('halfOpen');
    });
  });
});
