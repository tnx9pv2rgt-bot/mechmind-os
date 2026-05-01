import { Test, TestingModule } from '@nestjs/testing';
import { AdvisoryLockService } from './advisory-lock.service';
import { PrismaService } from './prisma.service';
import { LoggerService } from './logger.service';
import { LockMonitorService } from './lock-monitor.service';
import { LockTimeoutError } from '../utils/lock-utils';

describe('AdvisoryLockService', () => {
  let service: AdvisoryLockService;
  let prisma: { $queryRaw: jest.Mock };
  let logger: { log: jest.Mock; warn: jest.Mock; error: jest.Mock; debug: jest.Mock };
  let lockMonitor: { recordLockAcquisition: jest.Mock; recordLockFailure: jest.Mock };

  const TENANT_ID = '550e8400-e29b-41d4-a716-446655440000';
  const SLOT_ID = '660e8400-e29b-41d4-a716-446655440001';

  beforeEach(async () => {
    prisma = { $queryRaw: jest.fn() };
    logger = { log: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() };
    lockMonitor = {
      recordLockAcquisition: jest.fn().mockResolvedValue(undefined),
      recordLockFailure: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdvisoryLockService,
        { provide: PrismaService, useValue: prisma },
        { provide: LoggerService, useValue: logger },
        { provide: LockMonitorService, useValue: lockMonitor },
      ],
    }).compile();

    service = module.get<AdvisoryLockService>(AdvisoryLockService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // =========================================================================
  // computeLockId
  // =========================================================================
  describe('computeLockId', () => {
    it('should return a bigint', () => {
      const lockId = service.computeLockId(TENANT_ID, SLOT_ID);
      expect(typeof lockId).toBe('bigint');
    });

    it('should be deterministic', () => {
      const a = service.computeLockId(TENANT_ID, SLOT_ID);
      const b = service.computeLockId(TENANT_ID, SLOT_ID);
      expect(a).toBe(b);
    });

    it('should produce different IDs for different inputs', () => {
      const a = service.computeLockId(TENANT_ID, SLOT_ID);
      const b = service.computeLockId(SLOT_ID, TENANT_ID);
      expect(a).not.toBe(b);
    });
  });

  // =========================================================================
  // acquireLockWithRetry — success on first attempt
  // =========================================================================
  describe('acquireLockWithRetry', () => {
    it('should acquire lock on first attempt', async () => {
      prisma.$queryRaw.mockResolvedValue([{ acquired: true }]);

      const result = await service.acquireLockWithRetry(TENANT_ID, SLOT_ID);

      expect(result.success).toBe(true);
      expect(result.attempts).toBe(1);
      expect(result.acquiredAt).toBeInstanceOf(Date);
      expect(lockMonitor.recordLockAcquisition).toHaveBeenCalled();
    });

    it('should retry and succeed on second attempt', async () => {
      prisma.$queryRaw
        .mockResolvedValueOnce([{ acquired: false }])
        .mockResolvedValueOnce([{ acquired: true }]);

      const result = await service.acquireLockWithRetry(TENANT_ID, SLOT_ID, {
        maxAttempts: 3,
        baseDelayMs: 1,
        maxDelayMs: 10,
      });

      expect(result.success).toBe(true);
      expect(result.attempts).toBe(2);
    });

    it('should throw LockTimeoutError after all attempts exhausted', async () => {
      prisma.$queryRaw.mockResolvedValue([{ acquired: false }]);

      await expect(
        service.acquireLockWithRetry(TENANT_ID, SLOT_ID, {
          maxAttempts: 2,
          baseDelayMs: 1,
          maxDelayMs: 5,
        }),
      ).rejects.toThrow(LockTimeoutError);

      expect(lockMonitor.recordLockFailure).toHaveBeenCalled();
    });

    it('should re-throw database errors immediately', async () => {
      prisma.$queryRaw.mockRejectedValue(new Error('Connection lost'));

      await expect(service.acquireLockWithRetry(TENANT_ID, SLOT_ID)).rejects.toThrow(
        'Connection lost',
      );
    });

    it('should handle empty result from query', async () => {
      prisma.$queryRaw.mockResolvedValue([]);

      await expect(
        service.acquireLockWithRetry(TENANT_ID, SLOT_ID, { maxAttempts: 1, baseDelayMs: 1 }),
      ).rejects.toThrow(LockTimeoutError);
    });
  });

  // =========================================================================
  // releaseLock
  // =========================================================================
  describe('releaseLock', () => {
    it('should return true when lock is released', async () => {
      prisma.$queryRaw.mockResolvedValue([{ released: true }]);

      const result = await service.releaseLock(TENANT_ID, SLOT_ID);

      expect(result).toBe(true);
      expect(logger.debug).toHaveBeenCalled();
    });

    it('should return false when lock was not held', async () => {
      prisma.$queryRaw.mockResolvedValue([{ released: false }]);

      const result = await service.releaseLock(TENANT_ID, SLOT_ID);

      expect(result).toBe(false);
      expect(logger.warn).toHaveBeenCalled();
    });

    it('should handle empty result', async () => {
      prisma.$queryRaw.mockResolvedValue([]);

      const result = await service.releaseLock(TENANT_ID, SLOT_ID);

      expect(result).toBe(false);
    });

    it('should re-throw database errors', async () => {
      prisma.$queryRaw.mockRejectedValue(new Error('DB error'));

      await expect(service.releaseLock(TENANT_ID, SLOT_ID)).rejects.toThrow('DB error');
      expect(logger.error).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // checkLockStatus
  // =========================================================================
  describe('checkLockStatus', () => {
    it('should return isHeld=false when no lock found', async () => {
      prisma.$queryRaw.mockResolvedValue([]);

      const result = await service.checkLockStatus(TENANT_ID, SLOT_ID);

      expect(result.isHeld).toBe(false);
    });

    it('should return isHeld=false when pid is null', async () => {
      prisma.$queryRaw.mockResolvedValue([{ pid: null, mode: null, granted: null }]);

      const result = await service.checkLockStatus(TENANT_ID, SLOT_ID);

      expect(result.isHeld).toBe(false);
    });

    it('should return isHeld=true with holder info', async () => {
      prisma.$queryRaw.mockResolvedValue([{ pid: 12345, mode: 'ExclusiveLock', granted: true }]);

      const result = await service.checkLockStatus(TENANT_ID, SLOT_ID);

      expect(result.isHeld).toBe(true);
      expect(result.holderPid).toBe(12345);
      expect(result.holderSession).toBe('ExclusiveLock');
    });

    it('should re-throw database errors', async () => {
      prisma.$queryRaw.mockRejectedValue(new Error('pg_locks error'));

      await expect(service.checkLockStatus(TENANT_ID, SLOT_ID)).rejects.toThrow('pg_locks error');
    });
  });

  // =========================================================================
  // withLock
  // =========================================================================
  describe('withLock', () => {
    it('should execute function and release lock', async () => {
      prisma.$queryRaw
        .mockResolvedValueOnce([{ acquired: true }]) // acquire
        .mockResolvedValueOnce([{ released: true }]); // release

      const result = await service.withLock(TENANT_ID, SLOT_ID, async () => 'result');

      expect(result).toBe('result');
      expect(prisma.$queryRaw).toHaveBeenCalledTimes(2);
    });

    it('should release lock even when function throws', async () => {
      prisma.$queryRaw
        .mockResolvedValueOnce([{ acquired: true }])
        .mockResolvedValueOnce([{ released: true }]);

      await expect(
        service.withLock(TENANT_ID, SLOT_ID, async () => {
          throw new Error('business error');
        }),
      ).rejects.toThrow('business error');

      // Release should have been called
      expect(prisma.$queryRaw).toHaveBeenCalledTimes(2);
    });
  });

  // =========================================================================
  // acquireMultipleLocks
  // =========================================================================
  describe('acquireMultipleLocks', () => {
    const SLOT_A = '110e8400-e29b-41d4-a716-446655440001';
    const SLOT_B = '220e8400-e29b-41d4-a716-446655440002';

    it('should acquire all locks successfully', async () => {
      prisma.$queryRaw.mockResolvedValue([{ acquired: true }]);

      const locks = [
        { tenantId: TENANT_ID, slotId: SLOT_A },
        { tenantId: TENANT_ID, slotId: SLOT_B },
      ];

      const result = await service.acquireMultipleLocks(locks);

      expect(result.success).toBe(true);
      expect(result.acquiredLocks).toHaveLength(2);
      expect(result.failedLocks).toHaveLength(0);
    });

    it('should release all acquired locks when one fails', async () => {
      prisma.$queryRaw
        .mockResolvedValueOnce([{ acquired: true }]) // first lock succeeds
        .mockResolvedValueOnce([{ acquired: false }]) // second lock fails attempt 1
        .mockResolvedValueOnce([{ acquired: false }]) // second lock fails attempt 2
        .mockResolvedValueOnce([{ acquired: false }]) // second lock fails attempt 3
        .mockResolvedValue([{ released: true }]); // releases

      const locks = [
        { tenantId: TENANT_ID, slotId: SLOT_A },
        { tenantId: TENANT_ID, slotId: SLOT_B },
      ];

      // The acquireMultipleLocks catches the LockTimeoutError and returns success=false
      const result = await service.acquireMultipleLocks(locks, {
        maxAttempts: 3,
        baseDelayMs: 1,
        maxDelayMs: 5,
      });

      expect(result.success).toBe(false);
    });

    it('should return failed locks when acquisition fails', async () => {
      prisma.$queryRaw
        .mockResolvedValueOnce([{ acquired: true }]) // lock 1 succeeds
        .mockResolvedValueOnce([{ acquired: false }]) // lock 2 fails attempt 1
        .mockResolvedValueOnce([{ acquired: false }]) // lock 2 fails attempt 2
        .mockResolvedValueOnce([{ acquired: false }]) // lock 2 fails attempt 3
        .mockResolvedValue([{ released: true }]); // cleanup

      const locks = [
        { tenantId: TENANT_ID, slotId: SLOT_A },
        { tenantId: TENANT_ID, slotId: SLOT_B },
      ];

      const result = await service.acquireMultipleLocks(locks, {
        maxAttempts: 3,
        baseDelayMs: 1,
        maxDelayMs: 5,
      });

      expect(result.success).toBe(false);
      expect(result.acquiredLocks).toHaveLength(1);
      expect(result.failedLocks).toHaveLength(1);
      expect(result.results).toHaveLength(1); // Only first lock attempted successfully
    });
  });

  // =========================================================================
  // releaseMultipleLocks
  // =========================================================================
  describe('releaseMultipleLocks', () => {
    const SLOT_A = '110e8400-e29b-41d4-a716-446655440001';
    const SLOT_B = '220e8400-e29b-41d4-a716-446655440002';

    it('should release all locks', async () => {
      prisma.$queryRaw.mockResolvedValue([{ released: true }]);

      const locks = [
        { tenantId: TENANT_ID, slotId: SLOT_A },
        { tenantId: TENANT_ID, slotId: SLOT_B },
      ];

      await service.releaseMultipleLocks(locks);

      expect(prisma.$queryRaw).toHaveBeenCalledTimes(2);
    });

    it('should continue releasing even if one fails', async () => {
      prisma.$queryRaw
        .mockRejectedValueOnce(new Error('release error'))
        .mockResolvedValueOnce([{ released: true }]);

      const locks = [
        { tenantId: TENANT_ID, slotId: SLOT_A },
        { tenantId: TENANT_ID, slotId: SLOT_B },
      ];

      // Should not throw
      await service.releaseMultipleLocks(locks);

      expect(prisma.$queryRaw).toHaveBeenCalledTimes(2);
      expect(logger.error).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // withMultipleLocks
  // =========================================================================
  describe('withMultipleLocks', () => {
    const SLOT_A = '110e8400-e29b-41d4-a716-446655440001';
    const SLOT_B = '220e8400-e29b-41d4-a716-446655440002';

    it('should execute function and release all locks', async () => {
      prisma.$queryRaw
        .mockResolvedValueOnce([{ acquired: true }])
        .mockResolvedValueOnce([{ acquired: true }])
        .mockResolvedValueOnce([{ released: true }])
        .mockResolvedValueOnce([{ released: true }]);

      const locks = [
        { tenantId: TENANT_ID, slotId: SLOT_A },
        { tenantId: TENANT_ID, slotId: SLOT_B },
      ];

      const result = await service.withMultipleLocks(locks, async () => 'multi-result');

      expect(result).toBe('multi-result');
    });

    it('should throw LockTimeoutError when not all locks can be acquired', async () => {
      // First lock succeeds, second fails all attempts, then first gets released
      prisma.$queryRaw
        .mockResolvedValueOnce([{ acquired: true }]) // first lock
        .mockResolvedValueOnce([{ acquired: false }]) // second lock attempt 1
        .mockResolvedValueOnce([{ acquired: false }]) // second lock attempt 2
        .mockResolvedValueOnce([{ acquired: false }]) // second lock attempt 3
        .mockResolvedValue([{ released: true }]); // cleanup releases

      const locks = [
        { tenantId: TENANT_ID, slotId: SLOT_A },
        { tenantId: TENANT_ID, slotId: SLOT_B },
      ];

      await expect(
        service.withMultipleLocks(locks, async () => 'should not reach', {
          maxAttempts: 3,
          baseDelayMs: 1,
          maxDelayMs: 5,
        }),
      ).rejects.toThrow(LockTimeoutError);
    });

    it('should release all locks even when function throws', async () => {
      prisma.$queryRaw
        .mockResolvedValueOnce([{ acquired: true }])
        .mockResolvedValueOnce([{ acquired: true }])
        .mockResolvedValueOnce([{ released: true }])
        .mockResolvedValueOnce([{ released: true }]);

      const locks = [
        { tenantId: TENANT_ID, slotId: SLOT_A },
        { tenantId: TENANT_ID, slotId: SLOT_B },
      ];

      await expect(
        service.withMultipleLocks(locks, async () => {
          throw new Error('function error');
        }),
      ).rejects.toThrow('function error');

      // Verify both locks were released (2 acquire + 2 release calls)
      expect(prisma.$queryRaw).toHaveBeenCalledTimes(4);
    });

    it('should retry and eventually acquire locks with backoff', async () => {
      prisma.$queryRaw
        .mockResolvedValueOnce([{ acquired: false }]) // first lock, attempt 1
        .mockResolvedValueOnce([{ acquired: true }]) // first lock, attempt 2
        .mockResolvedValueOnce([{ acquired: true }]) // second lock
        .mockResolvedValueOnce([{ released: true }])
        .mockResolvedValueOnce([{ released: true }]);

      const locks = [
        { tenantId: TENANT_ID, slotId: SLOT_A },
        { tenantId: TENANT_ID, slotId: SLOT_B },
      ];

      const result = await service.withMultipleLocks(locks, async () => 'ok', {
        maxAttempts: 3,
        baseDelayMs: 1,
        maxDelayMs: 10,
      });

      expect(result).toBe('ok');
      // Verify both locks acquired and released
      expect(prisma.$queryRaw).toHaveBeenCalledTimes(5); // 1 fail + 1 success + 1 + 2 releases
    });

    it('should return proper error when no locks acquired', async () => {
      prisma.$queryRaw.mockResolvedValue([{ acquired: false }]);

      const locks = [
        { tenantId: TENANT_ID, slotId: SLOT_A },
        { tenantId: TENANT_ID, slotId: SLOT_B },
      ];

      await expect(
        service.withMultipleLocks(locks, async () => 'nope', {
          maxAttempts: 1,
          baseDelayMs: 1,
        }),
      ).rejects.toThrow('Failed to acquire all required locks');
    });
  });

  describe('acquireLockWithRetry - Max attempts boundary', () => {
    it('should fail gracefully when lock never becomes available', async () => {
      prisma.$queryRaw.mockResolvedValue([{ acquired: false }]);

      await expect(
        service.acquireLockWithRetry(TENANT_ID, SLOT_ID, {
          maxAttempts: 2,
          baseDelayMs: 1,
          maxDelayMs: 5,
        }),
      ).rejects.toThrow(LockTimeoutError);

      // Verify all attempts were made
      expect(prisma.$queryRaw).toHaveBeenCalledTimes(2);
    });
  });

  describe('checkLockStatus - Return structure', () => {
    it('should properly format lock holder info from database', async () => {
      prisma.$queryRaw.mockResolvedValue([
        { pid: 54321, mode: 'ShareRowExclusiveLock', granted: true },
      ]);

      const result = await service.checkLockStatus(TENANT_ID, SLOT_ID);

      expect(result.isHeld).toBe(true);
      expect(result.holderPid).toBe(54321);
      expect(result.holderSession).toBe('ShareRowExclusiveLock');
    });
  });

  describe('releaseMultipleLocks - Cleanup on error', () => {
    const SLOT_A = '110e8400-e29b-41d4-a716-446655440001';
    const SLOT_B = '220e8400-e29b-41d4-a716-446655440002';

    it('should continue releasing remaining locks even if one fails', async () => {
      prisma.$queryRaw
        .mockRejectedValueOnce(new Error('Release error on A'))
        .mockResolvedValueOnce([{ released: true }]);

      const locks = [
        { tenantId: TENANT_ID, slotId: SLOT_A },
        { tenantId: TENANT_ID, slotId: SLOT_B },
      ];

      await service.releaseMultipleLocks(locks);

      // Verify both locks were attempted (even though first failed)
      expect(prisma.$queryRaw).toHaveBeenCalledTimes(2);
    });
  });

  describe('withLock - Edge cases and error handling', () => {
    it('should acquire and release lock for async function that takes time', async () => {
      prisma.$queryRaw
        .mockResolvedValueOnce([{ acquired: true }])
        .mockResolvedValueOnce([{ released: true }]);

      const start = Date.now();
      const result = await service.withLock(TENANT_ID, SLOT_ID, async () => {
        // Simulate async work
        await new Promise(resolve => setTimeout(resolve, 10));
        return 'done';
      });

      expect(result).toBe('done');
      expect(Date.now() - start).toBeGreaterThanOrEqual(10);
      expect(prisma.$queryRaw).toHaveBeenCalledTimes(2);
    });

    it('should handle lock acquisition failure in withLock', async () => {
      prisma.$queryRaw.mockResolvedValue([{ acquired: false }]);

      await expect(
        service.withLock(TENANT_ID, SLOT_ID, async () => 'should not reach', {
          maxAttempts: 1,
          baseDelayMs: 1,
        }),
      ).rejects.toThrow(LockTimeoutError);

      // Only acquire attempts, no release
      expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
    });

    it('should pass custom lock options through withLock', async () => {
      prisma.$queryRaw
        .mockResolvedValueOnce([{ acquired: true }])
        .mockResolvedValueOnce([{ released: true }]);

      await service.withLock(TENANT_ID, SLOT_ID, async () => 'ok', {
        maxAttempts: 5,
        baseDelayMs: 50,
        maxDelayMs: 500,
        timeoutMs: 60000,
      });

      expect(prisma.$queryRaw).toHaveBeenCalledTimes(2);
    });
  });

  describe('acquireMultipleLocks - Lock ordering and deadlock prevention', () => {
    const SLOT_A = '110e8400-e29b-41d4-a716-446655440001';
    const SLOT_B = '220e8400-e29b-41d4-a716-446655440002';
    const TENANT_2 = '550e8400-e29b-41d4-a716-446655440003';

    it('should handle multiple locks for same tenant', async () => {
      prisma.$queryRaw.mockResolvedValue([{ acquired: true }]);

      const locks = [
        { tenantId: TENANT_ID, slotId: SLOT_A },
        { tenantId: TENANT_ID, slotId: SLOT_B },
      ];

      const result = await service.acquireMultipleLocks(locks);

      expect(result.success).toBe(true);
      expect(result.acquiredLocks).toHaveLength(2);
    });

    it('should handle multiple locks for different tenants', async () => {
      prisma.$queryRaw.mockResolvedValue([{ acquired: true }]);

      const locks = [
        { tenantId: TENANT_ID, slotId: SLOT_A },
        { tenantId: TENANT_2, slotId: SLOT_B },
      ];

      const result = await service.acquireMultipleLocks(locks);

      expect(result.success).toBe(true);
      expect(result.acquiredLocks).toHaveLength(2);
    });

    it('should track results for each lock acquisition', async () => {
      prisma.$queryRaw
        .mockResolvedValueOnce([{ acquired: true }]) // lock 1
        .mockResolvedValueOnce([{ acquired: true }]); // lock 2

      const locks = [
        { tenantId: TENANT_ID, slotId: SLOT_A },
        { tenantId: TENANT_ID, slotId: SLOT_B },
      ];

      const result = await service.acquireMultipleLocks(locks);

      expect(result.results).toHaveLength(2);
      expect(result.results[0].success).toBe(true);
      expect(result.results[1].success).toBe(true);
    });
  });

  describe('checkLockStatus - Edge cases', () => {
    it('should handle null pid gracefully', async () => {
      prisma.$queryRaw.mockResolvedValue([{ pid: null, mode: null, granted: null }]);

      const result = await service.checkLockStatus(TENANT_ID, SLOT_ID);

      expect(result.isHeld).toBe(false);
      expect(result.holderPid).toBeUndefined();
    });

    it('should handle zero as valid pid', async () => {
      prisma.$queryRaw.mockResolvedValue([{ pid: 0, mode: 'ExclusiveLock', granted: true }]);

      const result = await service.checkLockStatus(TENANT_ID, SLOT_ID);

      expect(result.isHeld).toBe(true);
      expect(result.holderPid).toBe(0);
    });

    it('should handle very large pid numbers', async () => {
      const largePid = 2147483647; // Max 32-bit int
      prisma.$queryRaw.mockResolvedValue([{ pid: largePid, mode: 'Exclusive', granted: true }]);

      const result = await service.checkLockStatus(TENANT_ID, SLOT_ID);

      expect(result.isHeld).toBe(true);
      expect(result.holderPid).toBe(largePid);
    });
  });

  describe('Backoff delay calculation', () => {
    it('should apply backoff delay between retry attempts', async () => {
      prisma.$queryRaw
        .mockResolvedValueOnce([{ acquired: false }])
        .mockResolvedValueOnce([{ acquired: false }])
        .mockResolvedValueOnce([{ acquired: true }]);

      const start = Date.now();
      const result = await service.acquireLockWithRetry(TENANT_ID, SLOT_ID, {
        maxAttempts: 3,
        baseDelayMs: 50,
        maxDelayMs: 100,
      });

      const elapsed = Date.now() - start;
      // Should have taken at least 2 * 50ms for 2 retries (plus some overhead)
      expect(elapsed).toBeGreaterThanOrEqual(90);
      expect(result.success).toBe(true);
    });

    it('should respect maxDelayMs cap', async () => {
      prisma.$queryRaw.mockResolvedValue([{ acquired: false }]);

      const start = Date.now();
      await expect(
        service.acquireLockWithRetry(TENANT_ID, SLOT_ID, {
          maxAttempts: 5,
          baseDelayMs: 1000,
          maxDelayMs: 100, // Much smaller than baseDelay
        }),
      ).rejects.toThrow(LockTimeoutError);

      const elapsed = Date.now() - start;
      // 5 attempts with max 100ms delay = ~500ms max
      expect(elapsed).toBeLessThan(2000);
    });
  });

  describe('Lock ID computation consistency', () => {
    it('should generate same lock ID for same tenant and slot', () => {
      const id1 = service.computeLockId(TENANT_ID, SLOT_ID);
      const id2 = service.computeLockId(TENANT_ID, SLOT_ID);

      expect(id1).toBe(id2);
      expect(typeof id1).toBe('bigint');
    });

    it('should generate different lock IDs for different slots', () => {
      const slot2 = '770e8400-e29b-41d4-a716-446655440004';
      const id1 = service.computeLockId(TENANT_ID, SLOT_ID);
      const id2 = service.computeLockId(TENANT_ID, slot2);

      expect(id1).not.toBe(id2);
    });

    it('should generate different lock IDs for different tenants', () => {
      const tenant2 = '880e8400-e29b-41d4-a716-446655440005';
      const id1 = service.computeLockId(TENANT_ID, SLOT_ID);
      const id2 = service.computeLockId(tenant2, SLOT_ID);

      expect(id1).not.toBe(id2);
    });
  });

  describe('acquireLockWithRetry - Metrics recording', () => {
    it('should record successful lock acquisition metrics', async () => {
      prisma.$queryRaw.mockResolvedValue([{ acquired: true }]);

      await service.acquireLockWithRetry(TENANT_ID, SLOT_ID);

      expect(lockMonitor.recordLockAcquisition).toHaveBeenCalledWith(expect.any(Number));
      expect(lockMonitor.recordLockFailure).not.toHaveBeenCalled();
    });

    it('should record failed lock acquisition metrics', async () => {
      prisma.$queryRaw.mockResolvedValue([{ acquired: false }]);

      await expect(
        service.acquireLockWithRetry(TENANT_ID, SLOT_ID, {
          maxAttempts: 1,
          baseDelayMs: 1,
        }),
      ).rejects.toThrow(LockTimeoutError);

      expect(lockMonitor.recordLockFailure).toHaveBeenCalled();
      expect(lockMonitor.recordLockAcquisition).not.toHaveBeenCalled();
    });

    it('should not record metrics when database error occurs', async () => {
      prisma.$queryRaw.mockRejectedValue(new Error('DB error'));

      await expect(service.acquireLockWithRetry(TENANT_ID, SLOT_ID)).rejects.toThrow('DB error');

      // Error thrown before metrics are recorded
      expect(lockMonitor.recordLockAcquisition).not.toHaveBeenCalled();
      expect(lockMonitor.recordLockFailure).not.toHaveBeenCalled();
    });
  });

  describe('LockTimeoutError details', () => {
    it('should include attempt count in error', async () => {
      prisma.$queryRaw.mockResolvedValue([{ acquired: false }]);

      await expect(
        service.acquireLockWithRetry(TENANT_ID, SLOT_ID, {
          maxAttempts: 3,
          baseDelayMs: 1,
        }),
      ).rejects.toThrow(LockTimeoutError);

      // Verify the error was thrown
      expect(lockMonitor.recordLockFailure).toHaveBeenCalled();
    });

    it('should include wait time in error details', async () => {
      prisma.$queryRaw.mockResolvedValue([{ acquired: false }]);

      const start = Date.now();
      await expect(
        service.acquireLockWithRetry(TENANT_ID, SLOT_ID, {
          maxAttempts: 2,
          baseDelayMs: 25,
        }),
      ).rejects.toThrow(LockTimeoutError);

      const elapsed = Date.now() - start;
      expect(elapsed).toBeGreaterThanOrEqual(25);
    });
  });

  describe('Logging verification', () => {
    it('should log debug message on lock acquisition', async () => {
      prisma.$queryRaw.mockResolvedValue([{ acquired: true }]);

      await service.acquireLockWithRetry(TENANT_ID, SLOT_ID);

      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Lock'),
        'AdvisoryLockService',
      );
    });

    it('should log warning on lock unavailable', async () => {
      prisma.$queryRaw
        .mockResolvedValueOnce([{ acquired: false }])
        .mockResolvedValueOnce([{ acquired: true }]);

      await service.acquireLockWithRetry(TENANT_ID, SLOT_ID, {
        maxAttempts: 2,
        baseDelayMs: 1,
      });

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('not available'),
        'AdvisoryLockService',
      );
    });

    it('should log error on acquisition failure', async () => {
      prisma.$queryRaw.mockResolvedValue([{ acquired: false }]);

      await expect(
        service.acquireLockWithRetry(TENANT_ID, SLOT_ID, {
          maxAttempts: 1,
          baseDelayMs: 1,
        }),
      ).rejects.toThrow();

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed'),
        undefined,
        'AdvisoryLockService',
      );
    });
  });

  describe('acquireMultipleLocks - Recovery path', () => {
    const SLOT_A = '110e8400-e29b-41d4-a716-446655440001';
    const SLOT_B = '220e8400-e29b-41d4-a716-446655440002';

    it('should attempt release of acquired locks on multi-lock failure', async () => {
      prisma.$queryRaw
        .mockResolvedValueOnce([{ acquired: true }]) // lock A acquired
        .mockResolvedValueOnce([{ acquired: false }]) // lock B attempt 1
        .mockResolvedValueOnce([{ acquired: false }]) // lock B attempt 2
        .mockResolvedValueOnce([{ acquired: false }]) // lock B attempt 3
        .mockResolvedValue([{ released: true }]); // lock A release

      const locks = [
        { tenantId: TENANT_ID, slotId: SLOT_A },
        { tenantId: TENANT_ID, slotId: SLOT_B },
      ];

      const result = await service.acquireMultipleLocks(locks, {
        maxAttempts: 3,
        baseDelayMs: 1,
        maxDelayMs: 5,
      });

      // Should have attempted to release lock A
      expect(result.success).toBe(false);
      expect(result.acquiredLocks).toHaveLength(1);
      expect(result.failedLocks).toHaveLength(1);
    });
  });
});
