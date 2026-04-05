import { Injectable, OnModuleInit } from '@nestjs/common';
import { Registry, Counter, Histogram, Gauge, collectDefaultMetrics } from 'prom-client';

@Injectable()
export class MetricsService implements OnModuleInit {
  readonly registry = new Registry();

  // HTTP
  readonly httpRequestsTotal: Counter;
  readonly httpRequestDuration: Histogram;

  // Database
  readonly dbQueryDuration: Histogram;

  // BullMQ
  readonly bullmqJobsTotal: Counter;

  // Auth
  readonly authFailuresTotal: Counter;

  // Tenants
  readonly activeTenantsTotal: Gauge;

  // Circuit Breaker
  readonly circuitBreakerState: Gauge;
  readonly circuitBreakerFailures: Counter;
  readonly circuitBreakerTimeouts: Counter;

  constructor() {
    this.httpRequestsTotal = new Counter({
      name: 'http_requests_total',
      help: 'Total HTTP requests',
      labelNames: ['method', 'path', 'status_code'] as const,
      registers: [this.registry],
    });

    this.httpRequestDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'path', 'status_code'] as const,
      buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
      registers: [this.registry],
    });

    this.dbQueryDuration = new Histogram({
      name: 'db_query_duration_seconds',
      help: 'Database query duration in seconds',
      labelNames: ['operation', 'model'] as const,
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5],
      registers: [this.registry],
    });

    this.bullmqJobsTotal = new Counter({
      name: 'bullmq_jobs_total',
      help: 'Total BullMQ jobs processed',
      labelNames: ['queue', 'status'] as const,
      registers: [this.registry],
    });

    this.authFailuresTotal = new Counter({
      name: 'auth_failures_total',
      help: 'Total authentication failures',
      labelNames: ['reason'] as const,
      registers: [this.registry],
    });

    this.activeTenantsTotal = new Gauge({
      name: 'active_tenants_total',
      help: 'Number of active tenants',
      registers: [this.registry],
    });

    this.circuitBreakerState = new Gauge({
      name: 'circuit_breaker_state',
      help: 'Circuit breaker state (0=closed, 0.5=halfOpen, 1=open)',
      labelNames: ['service'] as const,
      registers: [this.registry],
    });

    this.circuitBreakerFailures = new Counter({
      name: 'circuit_breaker_failures_total',
      help: 'Total circuit breaker failure events',
      labelNames: ['service'] as const,
      registers: [this.registry],
    });

    this.circuitBreakerTimeouts = new Counter({
      name: 'circuit_breaker_timeouts_total',
      help: 'Total circuit breaker timeout events',
      labelNames: ['service'] as const,
      registers: [this.registry],
    });
  }

  onModuleInit(): void {
    collectDefaultMetrics({ register: this.registry });
  }

  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }

  getContentType(): string {
    return this.registry.contentType;
  }

  recordCircuitBreakerState(service: string, state: 'closed' | 'halfOpen' | 'open'): void {
    const stateValue = state === 'closed' ? 0 : state === 'halfOpen' ? 0.5 : 1;
    this.circuitBreakerState.labels(service).set(stateValue);
  }

  incrementCircuitBreakerFailures(service: string): void {
    this.circuitBreakerFailures.labels(service).inc();
  }

  incrementCircuitBreakerTimeouts(service: string): void {
    this.circuitBreakerTimeouts.labels(service).inc();
  }
}
