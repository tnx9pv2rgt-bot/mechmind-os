import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import CircuitBreaker from 'opossum';
import { LoggerService } from './logger.service';
import { MetricsService } from '../metrics/metrics.service';

export interface CircuitBreakerOptions {
  timeout: number;
  errorThresholdPercentage: number;
  resetTimeout: number;
  volumeThreshold: number;
  name: string;
}

const PRISMA_CB_OPTIONS: CircuitBreakerOptions = {
  timeout: 5000,
  errorThresholdPercentage: 30,
  resetTimeout: 15000,
  volumeThreshold: 5,
  name: 'prisma',
};

const REDIS_CB_OPTIONS: CircuitBreakerOptions = {
  timeout: 2000,
  errorThresholdPercentage: 50,
  resetTimeout: 10000,
  volumeThreshold: 5,
  name: 'redis',
};

@Injectable()
export class CircuitBreakerService {
  private readonly prismaBreaker: CircuitBreaker;
  private readonly redisBreaker: CircuitBreaker;

  constructor(
    private readonly logger: LoggerService,
    private readonly metrics: MetricsService,
  ) {
    this.prismaBreaker = this.createBreaker(PRISMA_CB_OPTIONS, () => {
      throw new ServiceUnavailableException('Database temporarily unavailable');
    });

    this.redisBreaker = this.createBreaker(REDIS_CB_OPTIONS, () => null);
  }

  async wrapPrisma<T>(fn: () => Promise<T>): Promise<T> {
    return this.prismaBreaker.fire(fn) as Promise<T>;
  }

  async wrapRedis<T>(fn: () => Promise<T>): Promise<T | null> {
    return this.redisBreaker.fire(fn) as Promise<T | null>;
  }

  getPrismaState(): string {
    return this.getState(this.prismaBreaker);
  }

  getRedisState(): string {
    return this.getState(this.redisBreaker);
  }

  getMetrics(): Record<string, unknown> {
    return {
      prisma: {
        state: this.getPrismaState(),
        stats: this.prismaBreaker.stats,
      },
      redis: {
        state: this.getRedisState(),
        stats: this.redisBreaker.stats,
      },
    };
  }

  private createBreaker(options: CircuitBreakerOptions, fallback: () => unknown): CircuitBreaker {
    // The action passed to CircuitBreaker receives a function to execute
    const breaker = new CircuitBreaker(async (action: () => Promise<unknown>) => action(), {
      timeout: options.timeout,
      errorThresholdPercentage: options.errorThresholdPercentage,
      resetTimeout: options.resetTimeout,
      volumeThreshold: options.volumeThreshold,
      name: options.name,
    });

    breaker.fallback(fallback);

    breaker.on('open', () => {
      this.logger.warn(`Circuit breaker OPEN for ${options.name} — failing fast`, 'CircuitBreaker');
      this.metrics.recordCircuitBreakerState(options.name, 'open');
    });

    breaker.on('halfOpen', () => {
      this.logger.log(
        `Circuit breaker HALF-OPEN for ${options.name} — testing recovery`,
        'CircuitBreaker',
      );
      this.metrics.recordCircuitBreakerState(options.name, 'halfOpen');
    });

    breaker.on('close', () => {
      this.logger.log(
        `Circuit breaker CLOSED for ${options.name} — service recovered`,
        'CircuitBreaker',
      );
      this.metrics.recordCircuitBreakerState(options.name, 'closed');
    });

    breaker.on('timeout', () => {
      this.metrics.incrementCircuitBreakerTimeouts(options.name);
    });

    breaker.on('failure', () => {
      this.metrics.incrementCircuitBreakerFailures(options.name);
    });

    return breaker;
  }

  private getState(breaker: CircuitBreaker): string {
    if (breaker.opened) return 'open';
    if (breaker.halfOpen) return 'halfOpen';
    return 'closed';
  }
}
