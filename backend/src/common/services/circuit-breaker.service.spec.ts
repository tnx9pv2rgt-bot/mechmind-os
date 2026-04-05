import { Test, TestingModule } from '@nestjs/testing';
import { ServiceUnavailableException } from '@nestjs/common';
import { CircuitBreakerService } from './circuit-breaker.service';
import { LoggerService } from './logger.service';
import { MetricsService } from '../metrics/metrics.service';

describe('CircuitBreakerService', () => {
  let service: CircuitBreakerService;
  let metrics: MetricsService;

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
    metrics = module.get<MetricsService>(MetricsService);
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
  });

  describe('getMetrics', () => {
    it('should return metrics for both circuit breakers', () => {
      const result = service.getMetrics();
      expect(result).toHaveProperty('prisma');
      expect(result).toHaveProperty('redis');
      expect(result.prisma).toHaveProperty('state', 'closed');
      expect(result.redis).toHaveProperty('state', 'closed');
    });
  });

  describe('Prisma circuit breaker opens after repeated failures', () => {
    it('should open circuit and use fallback after threshold failures', async () => {
      // Cause enough failures to trigger the circuit breaker
      const errors: Error[] = [];
      for (let i = 0; i < 10; i++) {
        try {
          await service.wrapPrisma(async () => {
            throw new Error('Connection refused');
          });
        } catch (e) {
          errors.push(e as Error);
        }
      }

      // After circuit opens, it should throw ServiceUnavailableException (fallback)
      await expect(service.wrapPrisma(async () => 'should not reach')).rejects.toThrow(
        ServiceUnavailableException,
      );
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
  });
});
