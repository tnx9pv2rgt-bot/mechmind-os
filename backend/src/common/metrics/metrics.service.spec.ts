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
});
