import { LockMonitorService } from './lock-monitor.service';
import { LoggerService } from './logger.service';

describe('LockMonitorService', () => {
  let service: LockMonitorService;
  let logger: { log: jest.Mock; warn: jest.Mock; error: jest.Mock; debug: jest.Mock };

  beforeEach(() => {
    logger = { log: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() };
    service = new LockMonitorService(logger as unknown as LoggerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // =========================================================================
  // getMetrics — initial state
  // =========================================================================
  describe('getMetrics', () => {
    it('should return zero metrics initially', () => {
      const metrics = service.getMetrics();

      expect(metrics.acquisitions).toBe(0);
      expect(metrics.failures).toBe(0);
      expect(metrics.avgWaitTimeMs).toBe(0);
    });
  });

  // =========================================================================
  // recordLockAcquisition
  // =========================================================================
  describe('recordLockAcquisition', () => {
    it('should increment acquisitions count', async () => {
      await service.recordLockAcquisition(100);

      const metrics = service.getMetrics();
      expect(metrics.acquisitions).toBe(1);
    });

    it('should track total wait time', async () => {
      await service.recordLockAcquisition(200);
      await service.recordLockAcquisition(400);

      const metrics = service.getMetrics();
      expect(metrics.avgWaitTimeMs).toBe(300);
    });

    it('should not warn for fast acquisitions', async () => {
      await service.recordLockAcquisition(100);

      expect(logger.warn).not.toHaveBeenCalled();
    });

    it('should warn for slow acquisitions (> 5000ms)', async () => {
      await service.recordLockAcquisition(6000);

      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('slow lock acquisition'));
    });

    it('should include summary stats in slow acquisition warning', async () => {
      await service.recordLockAcquisition(6000);

      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('6000ms'));
    });
  });

  // =========================================================================
  // recordLockFailure
  // =========================================================================
  describe('recordLockFailure', () => {
    it('should increment failures count', async () => {
      await service.recordLockFailure();

      const metrics = service.getMetrics();
      expect(metrics.failures).toBe(1);
    });

    it('should warn on every failure', async () => {
      await service.recordLockFailure();

      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('lock acquisition failed'));
    });

    it('should include running totals in failure warning', async () => {
      await service.recordLockAcquisition(100);
      await service.recordLockFailure();

      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('1 acquired'));
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('1 failed'));
    });
  });

  // =========================================================================
  // Cumulative metrics
  // =========================================================================
  describe('cumulative metrics', () => {
    it('should accurately track multiple operations', async () => {
      await service.recordLockAcquisition(100);
      await service.recordLockAcquisition(200);
      await service.recordLockAcquisition(300);
      await service.recordLockFailure();
      await service.recordLockFailure();

      const metrics = service.getMetrics();

      expect(metrics.acquisitions).toBe(3);
      expect(metrics.failures).toBe(2);
      expect(metrics.avgWaitTimeMs).toBe(200); // (100+200+300)/3
    });
  });

  // =========================================================================
  // Branch coverage: avgWaitTimeMs calculation
  // =========================================================================
  describe('avgWaitTimeMs calculation branch coverage', () => {
    it('should return 0 when acquisitions is 0 (guard branch)', () => {
      const metrics = service.getMetrics();
      expect(metrics.avgWaitTimeMs).toBe(0);
      expect(metrics.acquisitions).toBe(0);
    });

    it('should calculate average correctly when acquisitions > 0', async () => {
      await service.recordLockAcquisition(500);
      const metrics = service.getMetrics();
      expect(metrics.avgWaitTimeMs).toBe(500);
      expect(metrics.acquisitions).toBe(1);
    });

    it('should round average to nearest integer', async () => {
      await service.recordLockAcquisition(100);
      await service.recordLockAcquisition(101);
      await service.recordLockAcquisition(102);
      const metrics = service.getMetrics();
      expect(metrics.avgWaitTimeMs).toBe(101); // (100+101+102)/3 = 101
      expect(metrics.acquisitions).toBe(3);
    });

    it('should handle large numbers in average calculation', async () => {
      await service.recordLockAcquisition(50000);
      await service.recordLockAcquisition(60000);
      const metrics = service.getMetrics();
      expect(metrics.avgWaitTimeMs).toBe(55000);
    });

    it('should accumulate wait time across multiple calls', async () => {
      await service.recordLockAcquisition(1000);
      await service.recordLockAcquisition(2000);
      await service.recordLockAcquisition(3000);
      const metrics = service.getMetrics();
      expect(metrics.avgWaitTimeMs).toBe(2000); // (1000+2000+3000)/3
      expect(metrics.acquisitions).toBe(3);
    });
  });

  // =========================================================================
  // Branch coverage: slow acquisition warning condition (waitTimeMs > 5000)
  // =========================================================================
  describe('slow acquisition warning threshold (5000ms)', () => {
    it('should not warn for exactly 5000ms', async () => {
      await service.recordLockAcquisition(5000);
      expect(logger.warn).not.toHaveBeenCalled();
    });

    it('should warn for 5001ms (just over threshold)', async () => {
      await service.recordLockAcquisition(5001);
      expect(logger.warn).toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('5001ms'));
    });

    it('should warn for very slow acquisitions (10000ms)', async () => {
      await service.recordLockAcquisition(10000);
      expect(logger.warn).toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('10000ms'));
    });

    it('should include correct stats in slow warning message', async () => {
      await service.recordLockAcquisition(1000); // fast, no warn
      await service.recordLockAcquisition(6000); // slow, warn
      expect(logger.warn).toHaveBeenCalledTimes(1);
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('2 acquired'), // two acquisitions recorded
      );
    });

    it('should not warn for 4999ms (just below threshold)', async () => {
      await service.recordLockAcquisition(4999);
      expect(logger.warn).not.toHaveBeenCalled();
    });

    it('should warn multiple times for multiple slow acquisitions', async () => {
      await service.recordLockAcquisition(6000); // warn 1st
      await service.recordLockAcquisition(7000); // warn 2nd
      expect(logger.warn).toHaveBeenCalledTimes(2);
    });
  });

  // =========================================================================
  // Branch coverage: logger methods called in different scenarios
  // =========================================================================
  describe('logger integration branches', () => {
    it('should log failure warning with exact message format', async () => {
      await service.recordLockFailure();
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('lock acquisition failed'));
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringMatching(/Total:\s*\d+\s*acquired,\s*\d+\s*failed/),
      );
    });

    it('should log with updated stats after multiple operations', async () => {
      await service.recordLockAcquisition(100);
      await service.recordLockAcquisition(200);
      await service.recordLockFailure();
      await service.recordLockFailure();

      const lastCall = (logger.warn as jest.Mock).mock.calls[
        (logger.warn as jest.Mock).mock.calls.length - 1
      ][0];

      expect(lastCall).toContain('2 acquired');
      expect(lastCall).toContain('2 failed');
    });

    it('should not call logger for fast acquisitions below 5000ms', async () => {
      await service.recordLockAcquisition(100);
      await service.recordLockAcquisition(200);
      await service.recordLockAcquisition(500);

      expect(logger.warn).not.toHaveBeenCalled();
    });
  });
});
