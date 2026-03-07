/**
 * MechMind OS v10 - Advisory Lock Service
 * PostgreSQL advisory lock management with deadlock prevention
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { LoggerService } from './logger.service';
import { LockMonitorService } from './lock-monitor.service';
import {
  computeLockId,
  computeBackoffDelay,
  validateLockOrder,
  LockTimeoutError,
  LockOrderViolationError,
  LockAcquisitionResult,
  LockIdentifier,
} from '../utils/lock-utils';

export interface AcquireLockOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  timeoutMs?: number;
}

export interface MultiLockResult {
  success: boolean;
  acquiredLocks: bigint[];
  failedLocks: bigint[];
  results: LockAcquisitionResult[];
}

@Injectable()
export class AdvisoryLockService {
  private readonly defaultMaxAttempts = 3;
  private readonly defaultBaseDelayMs = 100;
  private readonly defaultMaxDelayMs = 5000;
  private readonly defaultTimeoutMs = 30000;

  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
    private readonly lockMonitor: LockMonitorService,
  ) {}

  /**
   * Compute lock ID from tenant_id and slot_id
   * Formula: (tenant_id << 32) | slot_id
   */
  computeLockId(tenantId: string, slotId: string): bigint {
    return computeLockId(tenantId, slotId);
  }

  /**
   * Attempt to acquire an advisory lock with retry logic and exponential backoff.
   * Uses pg_try_advisory_lock for non-blocking lock attempts.
   * 
   * @param tenantId - Tenant UUID
   * @param slotId - Slot UUID
   * @param options - Lock acquisition options
   * @returns Lock acquisition result
   * @throws LockTimeoutError if all attempts fail
   */
  async acquireLockWithRetry(
    tenantId: string,
    slotId: string,
    options: AcquireLockOptions = {},
  ): Promise<LockAcquisitionResult> {
    const {
      maxAttempts = this.defaultMaxAttempts,
      baseDelayMs = this.defaultBaseDelayMs,
      maxDelayMs = this.defaultMaxDelayMs,
    } = options;

    const lockId = this.computeLockId(tenantId, slotId);
    const startTime = Date.now();
    let attempts = 0;

    this.logger.debug(
      `Attempting to acquire lock ${lockId} for tenant ${tenantId}, slot ${slotId}`,
      'AdvisoryLockService',
    );

    while (attempts < maxAttempts) {
      attempts++;

      try {
        const acquired = await this.tryAcquireLock(lockId);

        if (acquired) {
          const waitTimeMs = Date.now() - startTime;
          
          this.logger.debug(
            `Lock ${lockId} acquired after ${attempts} attempt(s), waited ${waitTimeMs}ms`,
            'AdvisoryLockService',
          );

          // Record successful acquisition metric
          await this.lockMonitor.recordLockAcquisition(waitTimeMs);

          return {
            success: true,
            lockId,
            attempts,
            waitTimeMs,
            acquiredAt: new Date(),
          };
        }

        this.logger.warn(
          `Lock ${lockId} not available, attempt ${attempts}/${maxAttempts}`,
          'AdvisoryLockService',
        );

        // If not the last attempt, wait before retry
        if (attempts < maxAttempts) {
          const delay = computeBackoffDelay(attempts, baseDelayMs, maxDelayMs);
          this.logger.debug(`Waiting ${delay}ms before retry`, 'AdvisoryLockService');
          await this.sleep(delay);
        }
      } catch (error) {
        this.logger.error(
          `Error acquiring lock ${lockId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          undefined,
          'AdvisoryLockService',
        );
        throw error;
      }
    }

    // All attempts exhausted
    const totalWaitTimeMs = Date.now() - startTime;
    
    this.logger.error(
      `Failed to acquire lock ${lockId} after ${attempts} attempts (${totalWaitTimeMs}ms)`,
      undefined,
      'AdvisoryLockService',
    );

    // Record failure metric
    await this.lockMonitor.recordLockFailure();

    throw new LockTimeoutError(
      `Failed to acquire lock for tenant ${tenantId}, slot ${slotId} after ${attempts} attempts`,
      lockId,
      attempts,
      totalWaitTimeMs,
    );
  }

  /**
   * Release an advisory lock
   * Always call this in a finally block to prevent lock leaks
   * 
   * @param tenantId - Tenant UUID
   * @param slotId - Slot UUID
   * @returns true if lock was released, false if not held
   */
  async releaseLock(tenantId: string, slotId: string): Promise<boolean> {
    const lockId = this.computeLockId(tenantId, slotId);

    try {
      const result = await this.prisma.$queryRaw<{ released: boolean }[]>`
        SELECT pg_advisory_unlock(${lockId}::bigint) as released
      `;

      const released = result[0]?.released ?? false;

      if (released) {
        this.logger.debug(`Lock ${lockId} released`, 'AdvisoryLockService');
      } else {
        this.logger.warn(
          `Lock ${lockId} was not held by this session`,
          'AdvisoryLockService',
        );
      }

      return released;
    } catch (error) {
      this.logger.error(
        `Error releasing lock ${lockId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        undefined,
        'AdvisoryLockService',
      );
      throw error;
    }
  }

  /**
   * Check if a lock is currently held by any session
   * Note: This checks if ANY session holds the lock, not just current session
   * 
   * @param tenantId - Tenant UUID
   * @param slotId - Slot UUID
   * @returns Object with isHeld status and holder info if available
   */
  async checkLockStatus(
    tenantId: string,
    slotId: string,
  ): Promise<{
    isHeld: boolean;
    holderPid?: number;
    holderSession?: string;
    acquiredAt?: Date;
  }> {
    const lockId = this.computeLockId(tenantId, slotId);

    try {
      const result = await this.prisma.$queryRaw<{
        pid: number | null;
        mode: string | null;
        granted: boolean | null;
      }[]>`
        SELECT 
          l.pid,
          l.mode,
          l.granted
        FROM pg_locks l
        WHERE l.locktype = 'advisory'
          AND l.classid = 0
          AND l.objid = ${lockId}::bigint
        LIMIT 1
      `;

      if (result.length === 0 || result[0]?.pid === null) {
        return { isHeld: false };
      }

      return {
        isHeld: true,
        holderPid: result[0].pid ?? undefined,
        holderSession: result[0].mode ?? undefined,
      };
    } catch (error) {
      this.logger.error(
        `Error checking lock status for ${lockId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        undefined,
        'AdvisoryLockService',
      );
      throw error;
    }
  }

  /**
   * Acquire multiple locks in consistent order to prevent deadlocks.
   * Always acquires locks in order: tenant_id ASC, slot_id ASC
   * 
   * @param locks - Array of lock identifiers
   * @param options - Lock acquisition options
   * @returns MultiLockResult with details of acquired/failed locks
   * @throws LockOrderViolationError if locks are not in correct order
   */
  async acquireMultipleLocks(
    locks: LockIdentifier[],
    options: AcquireLockOptions = {},
  ): Promise<MultiLockResult> {
    // Validate and sort locks to prevent deadlocks
    const sortedLocks = validateLockOrder(locks);

    const acquiredLocks: bigint[] = [];
    const failedLocks: bigint[] = [];
    const results: LockAcquisitionResult[] = [];

    this.logger.debug(
      `Attempting to acquire ${sortedLocks.length} locks in batch`,
      'AdvisoryLockService',
    );

    try {
      for (const { tenantId, slotId } of sortedLocks) {
        try {
          const result = await this.acquireLockWithRetry(tenantId, slotId, options);
          
          if (result.success) {
            acquiredLocks.push(result.lockId);
          } else {
            failedLocks.push(result.lockId);
          }
          
          results.push(result);
        } catch (error) {
          // If we fail to acquire one lock, we need to release all acquired locks
          // to maintain atomicity
          failedLocks.push(this.computeLockId(tenantId, slotId));
          
          this.logger.warn(
            `Failed to acquire lock for tenant ${tenantId}, slot ${slotId}, releasing all acquired locks`,
            'AdvisoryLockService',
          );

          // Release all acquired locks (best effort)
          await this.releaseMultipleLocks(
            acquiredLocks.map((lockId, index) => ({
              tenantId: sortedLocks[index].tenantId,
              slotId: sortedLocks[index].slotId,
            })),
          );

          throw error;
        }
      }

      return {
        success: failedLocks.length === 0,
        acquiredLocks,
        failedLocks,
        results,
      };
    } catch (error) {
      if (error instanceof LockOrderViolationError) {
        throw error;
      }
      
      return {
        success: false,
        acquiredLocks,
        failedLocks,
        results,
      };
    }
  }

  /**
   * Release multiple locks
   * @param locks - Array of lock identifiers
   */
  async releaseMultipleLocks(locks: LockIdentifier[]): Promise<void> {
    for (const { tenantId, slotId } of locks) {
      try {
        await this.releaseLock(tenantId, slotId);
      } catch (error) {
        this.logger.error(
          `Error releasing lock for tenant ${tenantId}, slot ${slotId}: ${error instanceof Error ? error.message : 'Unknown'}`,
          undefined,
          'AdvisoryLockService',
        );
        // Continue releasing other locks
      }
    }
  }

  /**
   * Execute a function with an advisory lock, ensuring lock is always released
   * 
   * @param tenantId - Tenant UUID
   * @param slotId - Slot UUID
   * @param fn - Function to execute while holding the lock
   * @param options - Lock acquisition options
   * @returns Result of the function
   */
  async withLock<T>(
    tenantId: string,
    slotId: string,
    fn: () => Promise<T>,
    options: AcquireLockOptions = {},
  ): Promise<T> {
    const lockResult = await this.acquireLockWithRetry(tenantId, slotId, options);

    try {
      return await fn();
    } finally {
      // Always release the lock, even if fn throws
      await this.releaseLock(tenantId, slotId);
    }
  }

  /**
   * Execute a function with multiple advisory locks, ensuring locks are always released
   * Locks are acquired in consistent order to prevent deadlocks
   * 
   * @param locks - Array of lock identifiers
   * @param fn - Function to execute while holding the locks
   * @param options - Lock acquisition options
   * @returns Result of the function
   */
  async withMultipleLocks<T>(
    locks: LockIdentifier[],
    fn: () => Promise<T>,
    options: AcquireLockOptions = {},
  ): Promise<T> {
    const multiLockResult = await this.acquireMultipleLocks(locks, options);

    if (!multiLockResult.success) {
      throw new LockTimeoutError(
        `Failed to acquire all required locks. Acquired: ${multiLockResult.acquiredLocks.length}, Failed: ${multiLockResult.failedLocks.length}`,
        BigInt(0),
        0,
        0,
      );
    }

    try {
      return await fn();
    } finally {
      // Always release all locks, even if fn throws
      await this.releaseMultipleLocks(locks);
    }
  }

  /**
   * Try to acquire a lock immediately without retry
   * Uses pg_try_advisory_lock for non-blocking check
   * 
   * @param lockId - Computed lock ID
   * @returns true if lock acquired, false otherwise
   */
  private async tryAcquireLock(lockId: bigint): Promise<boolean> {
    const result = await this.prisma.$queryRaw<{ acquired: boolean }[]>`
      SELECT pg_try_advisory_lock(${lockId}::bigint) as acquired
    `;

    return result[0]?.acquired ?? false;
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
