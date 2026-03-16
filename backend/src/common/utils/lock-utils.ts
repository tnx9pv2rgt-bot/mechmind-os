/**
 * MechMind OS v10 - Advisory Lock Utilities
 * Deadlock prevention through consistent lock ordering
 */

import { ConflictException } from '@nestjs/common';

/**
 * Represents a lock identifier with tenant and slot IDs
 */
export interface LockIdentifier {
  tenantId: string;
  slotId: string;
}

/**
 * Result of a lock acquisition attempt
 */
export interface LockAcquisitionResult {
  success: boolean;
  lockId: bigint;
  attempts: number;
  waitTimeMs: number;
  acquiredAt?: Date;
}

/**
 * Error thrown when lock acquisition times out
 */
export class LockTimeoutError extends Error {
  constructor(
    message: string,
    public readonly lockId: bigint,
    public readonly attempts: number,
    public readonly totalWaitTimeMs: number,
  ) {
    super(message);
    this.name = 'LockTimeoutError';
  }
}

/**
 * Error thrown when lock order is violated (deadlock prevention)
 */
export class LockOrderViolationError extends Error {
  constructor(
    message: string,
    public readonly expectedOrder: LockIdentifier[],
    public readonly actualOrder: LockIdentifier[],
  ) {
    super(message);
    this.name = 'LockOrderViolationError';
  }
}

/**
 * Validates that locks are requested in consistent order to prevent deadlocks.
 * Order: Always tenant_id first, then slot_id (lexicographically if multiple)
 *
 * @param locks - Array of lock identifiers to validate
 * @returns Sorted array of locks in correct order
 * @throws LockOrderViolationError if order is inconsistent
 */
export function validateLockOrder(locks: LockIdentifier[]): LockIdentifier[] {
  if (locks.length <= 1) {
    return locks;
  }

  // Create a copy and sort by tenant_id first, then slot_id
  const sorted = [...locks].sort((a, b) => {
    const tenantCompare = a.tenantId.localeCompare(b.tenantId);
    if (tenantCompare !== 0) {
      return tenantCompare;
    }
    return a.slotId.localeCompare(b.slotId);
  });

  // Check if original order matches sorted order
  const isOrdered = locks.every(
    (lock, index) =>
      lock.tenantId === sorted[index].tenantId && lock.slotId === sorted[index].slotId,
  );

  if (!isOrdered) {
    throw new LockOrderViolationError(
      'Lock acquisition order violation detected. Locks must be acquired in consistent order (tenant_id, then slot_id) to prevent deadlocks.',
      sorted,
      locks,
    );
  }

  return sorted;
}

/**
 * Computes a 64-bit lock ID from tenant_id and slot_id.
 * Formula: (tenant_id << 32) | slot_id
 *
 * Note: Uses first 8 characters of UUIDs (32 bits each) to create 64-bit lock key.
 * This provides a good balance between uniqueness and fitting within PostgreSQL's
 * advisory lock bigint parameter.
 *
 * @param tenantId - Tenant UUID
 * @param slotId - Slot UUID
 * @returns 64-bit lock ID as bigint
 */
export function computeLockId(tenantId: string, slotId: string): bigint {
  // Extract first 8 hex chars from each UUID and convert to 32-bit integers
  const tenantPart = BigInt(parseInt(tenantId.replace(/-/g, '').substring(0, 8), 16));
  const slotPart = BigInt(parseInt(slotId.replace(/-/g, '').substring(0, 8), 16));

  // Combine: tenant in high 32 bits, slot in low 32 bits
  return (tenantPart << BigInt(32)) | slotPart;
}

/**
 * Computes lock ID with validation for duplicate prevention
 */
export function computeLockIdSafe(
  tenantId: string,
  slotId: string,
  existingLocks: Set<bigint> = new Set(),
): bigint {
  const lockId = computeLockId(tenantId, slotId);

  if (existingLocks.has(lockId)) {
    throw new ConflictException(`Duplicate lock detected for tenant ${tenantId}, slot ${slotId}`);
  }

  return lockId;
}

/**
 * Generates exponential backoff delay with jitter
 * @param attempt - Current attempt number (1-based)
 * @param baseDelayMs - Base delay in milliseconds
 * @param maxDelayMs - Maximum delay in milliseconds
 * @returns Delay with jitter applied
 */
export function computeBackoffDelay(
  attempt: number,
  baseDelayMs: number = 100,
  maxDelayMs: number = 5000,
): number {
  // Exponential: base * 2^(attempt-1)
  const exponentialDelay = baseDelayMs * Math.pow(2, attempt - 1);

  // Cap at max delay
  const cappedDelay = Math.min(exponentialDelay, maxDelayMs);

  // Add jitter (±25%) to prevent thundering herd
  const jitter = cappedDelay * 0.25;
  const jitteredDelay = cappedDelay + (Math.random() * 2 - 1) * jitter;

  return Math.max(0, Math.floor(jitteredDelay));
}

/**
 * Type guard for LockTimeoutError
 */
export function isLockTimeoutError(error: unknown): error is LockTimeoutError {
  return (
    error instanceof LockTimeoutError ||
    (error instanceof Error && error.name === 'LockTimeoutError')
  );
}

/**
 * Type guard for LockOrderViolationError
 */
export function isLockOrderViolationError(error: unknown): error is LockOrderViolationError {
  return (
    error instanceof LockOrderViolationError ||
    (error instanceof Error && error.name === 'LockOrderViolationError')
  );
}
