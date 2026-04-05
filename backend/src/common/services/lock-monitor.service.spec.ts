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
});
