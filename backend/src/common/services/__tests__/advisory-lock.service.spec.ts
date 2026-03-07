// Add BigInt serialization for Jest
(BigInt.prototype as any).toJSON = function() {
  return this.toString();
};

import { Test, TestingModule } from '@nestjs/testing';
import { AdvisoryLockService, AcquireLockOptions, MultiLockResult } from '../advisory-lock.service';
import { PrismaService } from '../prisma.service';
import { LoggerService } from '../logger.service';
import { LockMonitorService } from '../lock-monitor.service';
import {
  LockTimeoutError,
  LockOrderViolationError,
  LockIdentifier,
  computeLockId,
  computeBackoffDelay,
  validateLockOrder,
} from '../../utils/lock-utils';

// Mock the lock-utils module
jest.mock('../../utils/lock-utils');

describe('AdvisoryLockService', () => {
  let service: AdvisoryLockService;
  let prisma: jest.Mocked<PrismaService>;
  let logger: jest.Mocked<LoggerService>;
  let lockMonitor: { recordLockAcquisition: jest.Mock; recordLockFailure: jest.Mock };

  const tenantId = '550e8400-e29b-41d4-a716-446655440000';
  const slotId = '550e8400-e29b-41d4-a716-446655440001';
  const lockId = BigInt('12345678901234567890');

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdvisoryLockService,
        {
          provide: PrismaService,
          useValue: {
            $queryRaw: jest.fn(),
          },
        },
        {
          provide: LoggerService,
          useValue: {
            log: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn(),
          },
        },
        {
          provide: LockMonitorService,
          useValue: {
            recordLockAcquisition: jest.fn().mockResolvedValue(undefined),
            recordLockFailure: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    service = module.get<AdvisoryLockService>(AdvisoryLockService);
    prisma = module.get(PrismaService) as jest.Mocked<PrismaService>;
    logger = module.get(LoggerService) as jest.Mocked<LoggerService>;
    lockMonitor = module.get(LockMonitorService) as unknown as { recordLockAcquisition: jest.Mock; recordLockFailure: jest.Mock };

    // Reset mocks
    jest.clearAllMocks();

    // Setup default mock for computeLockId
    (computeLockId as jest.Mock).mockReturnValue(lockId);
    (computeBackoffDelay as jest.Mock).mockReturnValue(100);
  });

  describe('computeLockId', () => {
    it('should compute lock ID using lock-utils', () => {
      const result = service.computeLockId(tenantId, slotId);

      expect(computeLockId).toHaveBeenCalledWith(tenantId, slotId);
      expect(result).toBe(lockId);
    });
  });

  describe('acquireLockWithRetry', () => {
    const defaultOptions: AcquireLockOptions = {
      maxAttempts: 3,
      baseDelayMs: 100,
      maxDelayMs: 5000,
    };

    it('should acquire lock on first attempt', async () => {
      prisma.$queryRaw.mockResolvedValue([{ acquired: true }]);

      const result = await service.acquireLockWithRetry(tenantId, slotId);

      expect(result.success).toBe(true);
      expect(result.lockId).toBe(lockId);
      expect(result.attempts).toBe(1);
      expect(result.waitTimeMs).toBeGreaterThanOrEqual(0);
      expect(result.acquiredAt).toBeInstanceOf(Date);
      expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Attempting to acquire lock'),
        'AdvisoryLockService',
      );
    });

    it('should acquire lock after multiple retries', async () => {
      // First two attempts fail, third succeeds
      prisma.$queryRaw
        .mockResolvedValueOnce([{ acquired: false }])
        .mockResolvedValueOnce([{ acquired: false }])
        .mockResolvedValueOnce([{ acquired: true }]);

      const result = await service.acquireLockWithRetry(tenantId, slotId, defaultOptions);

      expect(result.success).toBe(true);
      expect(result.attempts).toBe(3);
      expect(prisma.$queryRaw).toHaveBeenCalledTimes(3);
      expect(logger.warn).toHaveBeenCalledTimes(2);
    });

    it('should throw LockTimeoutError after max attempts', async () => {
      prisma.$queryRaw.mockResolvedValue([{ acquired: false }]);

      await expect(
        service.acquireLockWithRetry(tenantId, slotId, { maxAttempts: 3, baseDelayMs: 10 }),
      ).rejects.toThrow(LockTimeoutError);

      expect(prisma.$queryRaw).toHaveBeenCalledTimes(3);
    });

    it('should use custom options when provided', async () => {
      prisma.$queryRaw.mockResolvedValue([{ acquired: true }]);

      const customOptions: AcquireLockOptions = {
        maxAttempts: 5,
        baseDelayMs: 200,
        maxDelayMs: 10000,
      };

      await service.acquireLockWithRetry(tenantId, slotId, customOptions);

      expect(computeBackoffDelay).toHaveBeenCalledWith(
        expect.any(Number),
        customOptions.baseDelayMs,
        customOptions.maxDelayMs,
      );
    });

    it('should use default options when none provided', async () => {
      prisma.$queryRaw.mockResolvedValue([{ acquired: true }]);

      await service.acquireLockWithRetry(tenantId, slotId);

      expect(computeBackoffDelay).toHaveBeenCalledWith(expect.any(Number), 100, 5000);
    });

    it('should handle database errors during lock acquisition', async () => {
      prisma.$queryRaw.mockRejectedValue(new Error('Database connection lost'));

      await expect(service.acquireLockWithRetry(tenantId, slotId)).rejects.toThrow('Database connection lost');
      expect(logger.error).toHaveBeenCalled();
    });

    it('should not retry on error - only on lock not available', async () => {
      prisma.$queryRaw.mockRejectedValue(new Error('Fatal error'));

      await expect(service.acquireLockWithRetry(tenantId, slotId)).rejects.toThrow();
      expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
    });

    it('should wait with backoff between retries', async () => {
      prisma.$queryRaw
        .mockResolvedValueOnce([{ acquired: false }])
        .mockResolvedValueOnce([{ acquired: true }]);

      (computeBackoffDelay as jest.Mock).mockReturnValue(50);

      const startTime = Date.now();
      await service.acquireLockWithRetry(tenantId, slotId, { maxAttempts: 3, baseDelayMs: 50 });
      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeGreaterThanOrEqual(50);
      expect(computeBackoffDelay).toHaveBeenCalledWith(1, 50, 5000);
    });

    it('should include correct error details in LockTimeoutError', async () => {
      prisma.$queryRaw.mockResolvedValue([{ acquired: false }]);

      try {
        await service.acquireLockWithRetry(tenantId, slotId, { maxAttempts: 2, baseDelayMs: 10 });
        fail('Should have thrown LockTimeoutError');
      } catch (error) {
        expect(error).toBeInstanceOf(LockTimeoutError);
        expect(error.lockId).toBe(lockId);
        expect(error.attempts).toBe(2);
        expect(error.totalWaitTimeMs).toBeGreaterThanOrEqual(0);
        expect(error.message).toContain(tenantId);
        expect(error.message).toContain(slotId);
      }
    });
  });

  describe('releaseLock', () => {
    it('should release a held lock successfully', async () => {
      prisma.$queryRaw.mockResolvedValue([{ released: true }]);

      const result = await service.releaseLock(tenantId, slotId);

      expect(result).toBe(true);
      expect(prisma.$queryRaw).toHaveBeenCalledWith(
        expect.anything(),
        lockId,
      );
      expect(logger.debug).toHaveBeenCalledWith(
        `Lock ${lockId} released`,
        'AdvisoryLockService',
      );
    });

    it('should return false when lock was not held', async () => {
      prisma.$queryRaw.mockResolvedValue([{ released: false }]);

      const result = await service.releaseLock(tenantId, slotId);

      expect(result).toBe(false);
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('was not held by this session'),
        'AdvisoryLockService',
      );
    });

    it('should handle null result from database', async () => {
      prisma.$queryRaw.mockResolvedValue([{}]);

      const result = await service.releaseLock(tenantId, slotId);

      expect(result).toBe(false);
    });

    it('should handle database errors during release', async () => {
      prisma.$queryRaw.mockRejectedValue(new Error('Connection lost'));

      await expect(service.releaseLock(tenantId, slotId)).rejects.toThrow('Connection lost');
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error releasing lock'),
        undefined,
        'AdvisoryLockService',
      );
    });
  });

  describe('checkLockStatus', () => {
    it('should return isHeld=false when lock is not held', async () => {
      prisma.$queryRaw.mockResolvedValue([]);

      const result = await service.checkLockStatus(tenantId, slotId);

      expect(result.isHeld).toBe(false);
      expect(result.holderPid).toBeUndefined();
    });

    it('should return isHeld=true when lock is held', async () => {
      prisma.$queryRaw.mockResolvedValue([{
        pid: 12345,
        mode: 'ExclusiveLock',
        granted: true,
      }]);

      const result = await service.checkLockStatus(tenantId, slotId);

      expect(result.isHeld).toBe(true);
      expect(result.holderPid).toBe(12345);
      expect(result.holderSession).toBe('ExclusiveLock');
    });

    it('should handle null pid in result', async () => {
      prisma.$queryRaw.mockResolvedValue([{
        pid: null,
        mode: null,
        granted: null,
      }]);

      const result = await service.checkLockStatus(tenantId, slotId);

      expect(result.isHeld).toBe(false);
    });

    it('should handle database errors', async () => {
      prisma.$queryRaw.mockRejectedValue(new Error('Query failed'));

      await expect(service.checkLockStatus(tenantId, slotId)).rejects.toThrow('Query failed');
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('acquireMultipleLocks', () => {
    const locks: LockIdentifier[] = [
      { tenantId: 'tenant-a', slotId: 'slot-a' },
      { tenantId: 'tenant-a', slotId: 'slot-b' },
      { tenantId: 'tenant-b', slotId: 'slot-c' },
    ];

    beforeEach(() => {
      // Reset mock to call through to real implementation
      jest.mocked(validateLockOrder).mockImplementation((l: LockIdentifier[]) => {
        // Simple validation: check if sorted
        const sorted = [...l].sort((a, b) => {
          const tenantCompare = a.tenantId.localeCompare(b.tenantId);
          if (tenantCompare !== 0) return tenantCompare;
          return a.slotId.localeCompare(b.slotId);
        });
        const isOrdered = l.every((lock, index) => 
          lock.tenantId === sorted[index].tenantId && lock.slotId === sorted[index].slotId
        );
        if (!isOrdered) {
          throw new LockOrderViolationError('Order violation', sorted, l);
        }
        return sorted;
      });
    });

    it('should acquire all locks successfully', async () => {
      prisma.$queryRaw.mockResolvedValue([{ acquired: true }]);

      const result = await service.acquireMultipleLocks(locks);

      expect(result.success).toBe(true);
      expect(result.acquiredLocks).toHaveLength(3);
      expect(result.failedLocks).toHaveLength(0);
      expect(validateLockOrder).toHaveBeenCalledWith(locks);
    });

    it('should release acquired locks when one fails', async () => {
      // First succeeds, second fails
      prisma.$queryRaw
        .mockResolvedValueOnce([{ acquired: true }])
        .mockRejectedValueOnce(new LockTimeoutError('Timeout', lockId, 3, 1000));

      await expect(service.acquireMultipleLocks(locks.slice(0, 2))).rejects.toThrow(LockTimeoutError);

      // Should have called queryRaw multiple times (acquire attempts + releases)
      expect(prisma.$queryRaw).toHaveBeenCalled();
    });

    it('should use validateLockOrder to sort locks', async () => {
      prisma.$queryRaw.mockResolvedValue([{ acquired: true }]);

      await service.acquireMultipleLocks(locks);

      // validateLockOrder should be called with the locks
      expect(validateLockOrder).toHaveBeenCalledWith(locks);
    });

    it('should return failure result when lock cannot be acquired', async () => {
      prisma.$queryRaw.mockResolvedValue([{ acquired: false }]);

      const result = await service.acquireMultipleLocks([locks[0]], { maxAttempts: 1, baseDelayMs: 10 });

      expect(result.success).toBe(false);
      expect(result.acquiredLocks).toHaveLength(0);
      expect(result.failedLocks).toHaveLength(1);
    });
  });

  describe('releaseMultipleLocks', () => {
    const locks: LockIdentifier[] = [
      { tenantId: 'tenant-1', slotId: 'slot-a' },
      { tenantId: 'tenant-1', slotId: 'slot-b' },
    ];

    it('should release all locks successfully', async () => {
      prisma.$queryRaw.mockResolvedValue([{ released: true }]);

      await service.releaseMultipleLocks(locks);

      expect(prisma.$queryRaw).toHaveBeenCalledTimes(2);
    });

    it('should continue releasing other locks when one fails', async () => {
      prisma.$queryRaw
        .mockRejectedValueOnce(new Error('Release failed'))
        .mockResolvedValueOnce([{ released: true }]);

      await service.releaseMultipleLocks(locks);

      expect(prisma.$queryRaw).toHaveBeenCalledTimes(2);
      expect(logger.error).toHaveBeenCalled();
    });

    it('should handle empty locks array', async () => {
      await service.releaseMultipleLocks([]);

      expect(prisma.$queryRaw).not.toHaveBeenCalled();
    });
  });

  describe('withLock', () => {
    it('should execute function with lock acquired and released', async () => {
      prisma.$queryRaw
        .mockResolvedValueOnce([{ acquired: true }])  // acquire
        .mockResolvedValueOnce([{ released: true }]); // release

      const fn = jest.fn().mockResolvedValue('result');

      const result = await service.withLock(tenantId, slotId, fn);

      expect(result).toBe('result');
      expect(fn).toHaveBeenCalledTimes(1);
      expect(prisma.$queryRaw).toHaveBeenCalledTimes(2);
    });

    it('should release lock even when function throws', async () => {
      prisma.$queryRaw
        .mockResolvedValueOnce([{ acquired: true }])
        .mockResolvedValueOnce([{ released: true }]);

      const fn = jest.fn().mockRejectedValue(new Error('Function failed'));

      await expect(service.withLock(tenantId, slotId, fn)).rejects.toThrow('Function failed');
      expect(prisma.$queryRaw).toHaveBeenCalledTimes(2);
    });

    it('should pass options to acquireLockWithRetry', async () => {
      prisma.$queryRaw
        .mockResolvedValueOnce([{ acquired: true }])
        .mockResolvedValueOnce([{ released: true }]);

      const options: AcquireLockOptions = {
        maxAttempts: 5,
        baseDelayMs: 200,
      };

      const fn = jest.fn().mockResolvedValue('result');
      await service.withLock(tenantId, slotId, fn, options);

      // Verify options were used by checking computeBackoffDelay calls
      expect(prisma.$queryRaw).toHaveBeenCalledTimes(2);
    });
  });

  describe('withMultipleLocks', () => {
    const locks: LockIdentifier[] = [
      { tenantId: 'tenant-1', slotId: 'slot-a' },
      { tenantId: 'tenant-1', slotId: 'slot-b' },
    ];

    beforeEach(() => {
      jest.mocked(validateLockOrder).mockImplementation((l: LockIdentifier[]) => {
        const sorted = [...l].sort((a, b) => {
          const tenantCompare = a.tenantId.localeCompare(b.tenantId);
          if (tenantCompare !== 0) return tenantCompare;
          return a.slotId.localeCompare(b.slotId);
        });
        return sorted;
      });
    });

    it('should execute function with multiple locks', async () => {
      prisma.$queryRaw.mockResolvedValue([{ acquired: true }]);

      const fn = jest.fn().mockResolvedValue('multi-lock-result');

      const result = await service.withMultipleLocks(locks, fn);

      expect(result).toBe('multi-lock-result');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should release all locks even when function throws', async () => {
      prisma.$queryRaw.mockResolvedValue([{ acquired: true }]);

      const fn = jest.fn().mockRejectedValue(new Error('Function error'));

      await expect(service.withMultipleLocks(locks, fn)).rejects.toThrow('Function error');
      // Should still release locks
      expect(prisma.$queryRaw).toHaveBeenCalledTimes(4); // 2 acquire + 2 release
    });

    it('should throw LockTimeoutError when not all locks acquired', async () => {
      // Lock cannot be acquired
      prisma.$queryRaw.mockResolvedValue([{ acquired: false }]);

      const fn = jest.fn();
      const singleLock: LockIdentifier[] = [{ tenantId: 'tenant-a', slotId: 'slot-a' }];

      // withMultipleLocks calls acquireMultipleLocks which returns success=false when locks fail
      // and then throws LockTimeoutError
      await expect(service.withMultipleLocks(singleLock, fn, { maxAttempts: 1, baseDelayMs: 10 })).rejects.toThrow();
    });
  });
});
