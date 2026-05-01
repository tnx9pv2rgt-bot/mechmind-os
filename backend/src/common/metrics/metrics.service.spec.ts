import { Test, TestingModule } from '@nestjs/testing';
import { MetricsService } from './metrics.service';

describe('MetricsService', () => {
  let service: MetricsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MetricsService],
    }).compile();

    service = module.get<MetricsService>(MetricsService);
    service.onModuleInit();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return metrics string', async () => {
    const metrics = await service.getMetrics();
    expect(typeof metrics).toBe('string');
    expect(metrics).toContain('http_requests_total');
  });

  it('should return prometheus content type', () => {
    const contentType = service.getContentType();
    expect(contentType).toContain('text/plain');
  });

  it('should increment http_requests_total', async () => {
    service.httpRequestsTotal.inc({ method: 'GET', path: '/test', status_code: '200' });
    const metrics = await service.getMetrics();
    expect(metrics).toContain('http_requests_total{method="GET",path="/test",status_code="200"} 1');
  });

  it('should observe http_request_duration_seconds', async () => {
    service.httpRequestDuration.observe({ method: 'GET', path: '/test', status_code: '200' }, 0.15);
    const metrics = await service.getMetrics();
    expect(metrics).toContain('http_request_duration_seconds');
  });

  it('should increment auth_failures_total', async () => {
    service.authFailuresTotal.inc({ reason: 'invalid_credentials' });
    const metrics = await service.getMetrics();
    expect(metrics).toContain('auth_failures_total{reason="invalid_credentials"} 1');
  });

  it('should set active_tenants_total', async () => {
    service.activeTenantsTotal.set(5);
    const metrics = await service.getMetrics();
    expect(metrics).toContain('active_tenants_total 5');
  });

  it('should observe db_query_duration_seconds', async () => {
    service.dbQueryDuration.observe({ operation: 'findMany', model: 'Booking' }, 0.025);
    const metrics = await service.getMetrics();
    expect(metrics).toContain('db_query_duration_seconds');
  });

  it('should increment bullmq_jobs_total', async () => {
    service.bullmqJobsTotal.inc({ queue: 'booking', status: 'completed' });
    const metrics = await service.getMetrics();
    expect(metrics).toContain('bullmq_jobs_total{queue="booking",status="completed"} 1');
  });

  it('should include default Node.js metrics', async () => {
    const metrics = await service.getMetrics();
    expect(metrics).toContain('process_cpu');
    expect(metrics).toContain('nodejs_heap');
  });

  describe('Circuit Breaker Metrics', () => {
    it('should record circuit breaker state as closed (0)', async () => {
      service.recordCircuitBreakerState('stripe', 'closed');
      const metrics = await service.getMetrics();
      expect(metrics).toContain('circuit_breaker_state{service="stripe"} 0');
    });

    it('should record circuit breaker state as halfOpen (0.5)', async () => {
      service.recordCircuitBreakerState('stripe', 'halfOpen');
      const metrics = await service.getMetrics();
      expect(metrics).toContain('circuit_breaker_state{service="stripe"} 0.5');
    });

    it('should record circuit breaker state as open (1)', async () => {
      service.recordCircuitBreakerState('stripe', 'open');
      const metrics = await service.getMetrics();
      expect(metrics).toContain('circuit_breaker_state{service="stripe"} 1');
    });

    it('should increment circuit breaker failures', async () => {
      service.incrementCircuitBreakerFailures('stripe');
      service.incrementCircuitBreakerFailures('stripe');
      const metrics = await service.getMetrics();
      expect(metrics).toContain('circuit_breaker_failures_total{service="stripe"} 2');
    });

    it('should increment circuit breaker timeouts', async () => {
      service.incrementCircuitBreakerTimeouts('auth-service');
      const metrics = await service.getMetrics();
      expect(metrics).toContain('circuit_breaker_timeouts_total{service="auth-service"} 1');
    });

    it('should handle multiple services independently', async () => {
      service.recordCircuitBreakerState('stripe', 'open');
      service.recordCircuitBreakerState('auth-service', 'closed');
      const metrics = await service.getMetrics();
      expect(metrics).toContain('circuit_breaker_state{service="stripe"} 1');
      expect(metrics).toContain('circuit_breaker_state{service="auth-service"} 0');
    });
  });

  describe('recordCircuitBreakerState branch coverage', () => {
    it('should handle all three circuit breaker states', async () => {
      const states = ['closed' as const, 'halfOpen' as const, 'open' as const];
      const expectedValues = [0, 0.5, 1];

      for (let i = 0; i < states.length; i++) {
        // eslint-disable-next-line security/detect-object-injection
        service.recordCircuitBreakerState('service-' + i, states[i]);
        const metrics = await service.getMetrics();
        expect(metrics).toContain(
          // eslint-disable-next-line security/detect-object-injection
          `circuit_breaker_state{service="service-${i}"} ${expectedValues[i]}`,
        );
      }
    });

    it('should switch between closed and halfOpen', async () => {
      service.recordCircuitBreakerState('test-service', 'closed');
      let metrics = await service.getMetrics();
      expect(metrics).toContain('circuit_breaker_state{service="test-service"} 0');

      service.recordCircuitBreakerState('test-service', 'halfOpen');
      metrics = await service.getMetrics();
      expect(metrics).toContain('circuit_breaker_state{service="test-service"} 0.5');
    });

    it('should switch between halfOpen and open', async () => {
      service.recordCircuitBreakerState('test-service', 'halfOpen');
      let metrics = await service.getMetrics();
      expect(metrics).toContain('circuit_breaker_state{service="test-service"} 0.5');

      service.recordCircuitBreakerState('test-service', 'open');
      metrics = await service.getMetrics();
      expect(metrics).toContain('circuit_breaker_state{service="test-service"} 1');
    });

    it('should switch between open and closed', async () => {
      service.recordCircuitBreakerState('test-service', 'open');
      let metrics = await service.getMetrics();
      expect(metrics).toContain('circuit_breaker_state{service="test-service"} 1');

      service.recordCircuitBreakerState('test-service', 'closed');
      metrics = await service.getMetrics();
      expect(metrics).toContain('circuit_breaker_state{service="test-service"} 0');
    });
  });

  describe('Histogram bucket coverage', () => {
    it('should record values in http_request_duration_seconds buckets', async () => {
      const durations = [0.005, 0.02, 0.08, 0.3, 0.75, 1.5, 3, 6, 15];

      for (const duration of durations) {
        service.httpRequestDuration.observe(
          { method: 'GET', path: '/test', status_code: '200' },
          duration,
        );
      }

      const metrics = await service.getMetrics();
      expect(metrics).toContain('http_request_duration_seconds_bucket');
      expect(metrics).toContain('http_request_duration_seconds_count');
      expect(metrics).toContain('http_request_duration_seconds_sum');
    });

    it('should record values in db_query_duration_seconds buckets', async () => {
      const durations = [0.0005, 0.002, 0.008, 0.03, 0.25, 0.7, 2, 3];

      for (const duration of durations) {
        service.dbQueryDuration.observe({ operation: 'find', model: 'Booking' }, duration);
      }

      const metrics = await service.getMetrics();
      expect(metrics).toContain('db_query_duration_seconds_bucket');
    });
  });

  describe('Multiple labels and combinations', () => {
    it('should handle different HTTP methods', async () => {
      const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];

      for (const method of methods) {
        service.httpRequestsTotal.inc({ method, path: '/api/test', status_code: '200' });
      }

      const metrics = await service.getMetrics();

      for (const method of methods) {
        expect(metrics).toContain(`http_requests_total{method="${method}"`);
      }
    });

    it('should handle different HTTP status codes', async () => {
      const codes = ['200', '201', '400', '401', '403', '404', '500', '503'];

      for (const code of codes) {
        service.httpRequestsTotal.inc({ method: 'GET', path: '/test', status_code: code });
      }

      const metrics = await service.getMetrics();

      for (const code of codes) {
        expect(metrics).toContain(`status_code="${code}"`);
      }
    });

    it('should handle different database operations', async () => {
      const operations = ['find', 'create', 'update', 'delete', 'findMany', 'count', 'aggregate'];

      for (const op of operations) {
        service.dbQueryDuration.observe({ operation: op, model: 'Booking' }, 0.01);
      }

      const metrics = await service.getMetrics();

      for (const op of operations) {
        expect(metrics).toContain(`operation="${op}"`);
      }
    });

    it('should handle different database models', async () => {
      const models = ['Booking', 'Invoice', 'Payment', 'Customer', 'Slot', 'Vehicle'];

      for (const model of models) {
        service.dbQueryDuration.observe({ operation: 'find', model }, 0.01);
      }

      const metrics = await service.getMetrics();

      for (const model of models) {
        expect(metrics).toContain(`model="${model}"`);
      }
    });

    it('should handle different BullMQ queue statuses', async () => {
      const queues = ['booking', 'invoice', 'notification', 'audit-log'];
      const statuses = ['completed', 'failed', 'delayed', 'active'];

      for (const queue of queues) {
        for (const status of statuses) {
          service.bullmqJobsTotal.inc({ queue, status });
        }
      }

      const metrics = await service.getMetrics();

      for (const queue of queues) {
        expect(metrics).toContain(`queue="${queue}"`);
      }

      for (const status of statuses) {
        expect(metrics).toContain(`status="${status}"`);
      }
    });

    it('should handle different auth failure reasons', async () => {
      const reasons = ['invalid_credentials', 'invalid_token', 'expired_token', 'no_permission'];

      for (const reason of reasons) {
        service.authFailuresTotal.inc({ reason });
      }

      const metrics = await service.getMetrics();

      for (const reason of reasons) {
        expect(metrics).toContain(`reason="${reason}"`);
      }
    });

    it('should handle different circuit breaker services', async () => {
      const serviceNames = ['stripe', 'twilio', 'auth-service', 's3', 'redis'];

      for (const svc of serviceNames) {
        service.recordCircuitBreakerState(svc, 'closed');
        service.incrementCircuitBreakerFailures(svc);
        service.incrementCircuitBreakerTimeouts(svc);
      }

      const metrics = await service.getMetrics();

      for (const svc of serviceNames) {
        expect(metrics).toContain(`service="${svc}"`);
      }
    });
  });

  describe('Gauge operations', () => {
    it('should increment and decrement active tenants', async () => {
      service.activeTenantsTotal.set(0);
      let metrics = await service.getMetrics();
      expect(metrics).toContain('active_tenants_total 0');

      service.activeTenantsTotal.inc();
      service.activeTenantsTotal.inc();
      service.activeTenantsTotal.inc();
      metrics = await service.getMetrics();
      expect(metrics).toContain('active_tenants_total 3');

      service.activeTenantsTotal.dec();
      metrics = await service.getMetrics();
      expect(metrics).toContain('active_tenants_total 2');
    });

    it('should handle set to zero', async () => {
      service.activeTenantsTotal.set(100);
      service.activeTenantsTotal.set(0);
      const metrics = await service.getMetrics();
      expect(metrics).toContain('active_tenants_total 0');
    });

    it('should handle large gauge values', async () => {
      service.activeTenantsTotal.set(999999);
      const metrics = await service.getMetrics();
      expect(metrics).toContain('active_tenants_total 999999');
    });
  });

  describe('Registry and content type consistency', () => {
    it('should always return consistent content type', () => {
      const contentType1 = service.getContentType();
      const contentType2 = service.getContentType();

      expect(contentType1).toBe(contentType2);
      expect(contentType1).toContain('text/plain');
    });

    it('should include custom metrics in registry', async () => {
      service.httpRequestsTotal.inc({ method: 'GET', path: '/health', status_code: '200' });
      const metrics = await service.getMetrics();

      expect(metrics).toContain('http_requests_total');
      expect(metrics).toContain('method="GET"');
    });

    it('should preserve metric name consistency across operations', async () => {
      service.httpRequestsTotal.inc({ method: 'POST', path: '/test', status_code: '201' });
      const metrics1 = await service.getMetrics();

      service.httpRequestsTotal.inc({ method: 'POST', path: '/test', status_code: '201' });
      const metrics2 = await service.getMetrics();

      expect(metrics1).toContain('http_requests_total');
      expect(metrics2).toContain('http_requests_total');
    });
  });
});
