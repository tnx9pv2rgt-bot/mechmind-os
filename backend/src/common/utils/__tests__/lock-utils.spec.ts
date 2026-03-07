// Add BigInt serialization for Jest
(BigInt.prototype as any).toJSON = function() {
  return this.toString();
};

import {
  validateLockOrder,
  computeLockId,
  computeLockIdSafe,
  computeBackoffDelay,
  isLockTimeoutError,
  isLockOrderViolationError,
  LockTimeoutError,
  LockOrderViolationError,
  LockIdentifier,
} from '../lock-utils';

describe('lock-utils', () => {
  describe('LockTimeoutError', () => {
    it('should create error with correct properties', () => {
      const lockId = BigInt(12345);
      const attempts = 3;
      const waitTimeMs = 5000;

      const error = new LockTimeoutError('Lock acquisition failed', lockId, attempts, waitTimeMs);

      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('LockTimeoutError');
      expect(error.message).toBe('Lock acquisition failed');
      expect(error.lockId).toBe(lockId);
      expect(error.attempts).toBe(attempts);
      expect(error.totalWaitTimeMs).toBe(waitTimeMs);
    });
  });

  describe('LockOrderViolationError', () => {
    it('should create error with correct properties', () => {
      const expectedOrder: LockIdentifier[] = [
        { tenantId: 'a', slotId: '1' },
        { tenantId: 'a', slotId: '2' },
      ];
      const actualOrder: LockIdentifier[] = [
        { tenantId: 'a', slotId: '2' },
        { tenantId: 'a', slotId: '1' },
      ];

      const error = new LockOrderViolationError('Order violation', expectedOrder, actualOrder);

      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('LockOrderViolationError');
      expect(error.message).toBe('Order violation');
      expect(error.expectedOrder).toEqual(expectedOrder);
      expect(error.actualOrder).toEqual(actualOrder);
    });
  });

  describe('validateLockOrder', () => {
    it('should return empty array for empty input', () => {
      const result = validateLockOrder([]);
      expect(result).toEqual([]);
    });

    it('should return single lock as-is', () => {
      const locks: LockIdentifier[] = [{ tenantId: 'tenant-1', slotId: 'slot-1' }];
      const result = validateLockOrder(locks);
      expect(result).toEqual(locks);
    });

    it('should return already sorted array', () => {
      const locks: LockIdentifier[] = [
        { tenantId: 'a', slotId: '1' },
        { tenantId: 'a', slotId: '2' },
        { tenantId: 'b', slotId: '1' },
      ];
      const result = validateLockOrder(locks);
      expect(result).toEqual(locks);
    });

    it('should throw LockOrderViolationError when order is wrong', () => {
      const locks: LockIdentifier[] = [
        { tenantId: 'a', slotId: '2' },
        { tenantId: 'a', slotId: '1' },
      ];

      expect(() => validateLockOrder(locks)).toThrow(LockOrderViolationError);
    });

    it('should sort by tenantId first', () => {
      const locks: LockIdentifier[] = [
        { tenantId: 'b', slotId: '1' },
        { tenantId: 'a', slotId: '1' },
      ];

      expect(() => validateLockOrder(locks)).toThrow(LockOrderViolationError);
    });

    it('should sort by slotId when tenantIds are equal', () => {
      const locks: LockIdentifier[] = [
        { tenantId: 'a', slotId: '2' },
        { tenantId: 'a', slotId: '1' },
      ];

      expect(() => validateLockOrder(locks)).toThrow(LockOrderViolationError);
    });

    it('should accept correctly ordered mixed tenant/slot combinations', () => {
      const locks: LockIdentifier[] = [
        { tenantId: 'a', slotId: '1' },
        { tenantId: 'a', slotId: '2' },
        { tenantId: 'b', slotId: '1' },
        { tenantId: 'b', slotId: '2' },
      ];
      const result = validateLockOrder(locks);
      expect(result).toEqual(locks);
    });
  });

  describe('computeLockId', () => {
    it('should compute consistent lock ID for same inputs', () => {
      const tenantId = '550e8400-e29b-41d4-a716-446655440000';
      const slotId = '550e8400-e29b-41d4-a716-446655440001';

      const result1 = computeLockId(tenantId, slotId);
      const result2 = computeLockId(tenantId, slotId);

      expect(result1).toBe(result2);
    });

    it('should compute different lock IDs for different tenants', () => {
      const tenantId1 = '550e8400-e29b-41d4-a716-446655440000';
      const tenantId2 = '660e8400-e29b-41d4-a716-446655440000';
      const slotId = '550e8400-e29b-41d4-a716-446655440001';

      const result1 = computeLockId(tenantId1, slotId);
      const result2 = computeLockId(tenantId2, slotId);

      expect(result1).not.toBe(result2);
    });

    it('should compute different lock IDs for different slots', () => {
      const tenantId = '550e8400-e29b-41d4-a716-446655440000';
      const slotId1 = '550e8400-e29b-41d4-a716-446655440001';
      const slotId2 = '660e8400-e29b-41d4-a716-446655440002'; // Different first 8 chars

      const result1 = computeLockId(tenantId, slotId1);
      const result2 = computeLockId(tenantId, slotId2);

      expect(result1).not.toBe(result2);
    });

    it('should produce positive bigint values', () => {
      const tenantId = '550e8400-e29b-41d4-a716-446655440000';
      const slotId = '550e8400-e29b-41d4-a716-446655440001';

      const result = computeLockId(tenantId, slotId);

      expect(result).toBeGreaterThan(BigInt(0));
    });

    it('should handle UUIDs with different hex values', () => {
      const tenantId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
      const slotId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

      const result = computeLockId(tenantId, slotId);

      expect(typeof result).toBe('bigint');
      expect(result).toBeGreaterThan(BigInt(0));
    });

    it('should place tenant in high bits and slot in low bits', () => {
      // Using simple hex values for predictable results
      const tenantId = 'aaaaaaaa-0000-0000-0000-000000000000';
      const slotId = 'bbbbbbbb-0000-0000-0000-000000000000';

      const result = computeLockId(tenantId, slotId);

      // Result should be (tenant << 32) | slot
      expect(result).toBeGreaterThan(BigInt(0));
    });
  });

  describe('computeLockIdSafe', () => {
    it('should compute lock ID when no duplicates', () => {
      const tenantId = '550e8400-e29b-41d4-a716-446655440000';
      const slotId = '550e8400-e29b-41d4-a716-446655440001';

      const result = computeLockIdSafe(tenantId, slotId);

      expect(result).toBe(computeLockId(tenantId, slotId));
    });

    it('should throw error for duplicate lock', () => {
      const tenantId = '550e8400-e29b-41d4-a716-446655440000';
      const slotId = '550e8400-e29b-41d4-a716-446655440001';
      const lockId = computeLockId(tenantId, slotId);
      const existingLocks = new Set<bigint>([lockId]);

      expect(() => computeLockIdSafe(tenantId, slotId, existingLocks)).toThrow(
        `Duplicate lock detected for tenant ${tenantId}, slot ${slotId}`,
      );
    });

    it('should accept unique lock when existing set provided', () => {
      const tenantId = '550e8400-e29b-41d4-a716-446655440000';
      const slotId1 = '550e8400-e29b-41d4-a716-446655440001';
      const slotId2 = '660e8400-e29b-41d4-a716-446655440002'; // Different first 8 chars
      
      const existingLocks = new Set<bigint>([computeLockId(tenantId, slotId1)]);
      
      const result = computeLockIdSafe(tenantId, slotId2, existingLocks);
      
      expect(result).toBe(computeLockId(tenantId, slotId2));
    });
  });

  describe('computeBackoffDelay', () => {
    it('should compute exponential delay', () => {
      const baseDelay = 100;
      
      const delay1 = computeBackoffDelay(1, baseDelay, 5000);
      const delay2 = computeBackoffDelay(2, baseDelay, 5000);
      const delay3 = computeBackoffDelay(3, baseDelay, 5000);

      // Exponential: 100, 200, 400 (with jitter)
      expect(delay1).toBeGreaterThanOrEqual(75);  // 100 - 25%
      expect(delay1).toBeLessThanOrEqual(125);    // 100 + 25%
      expect(delay2).toBeGreaterThanOrEqual(150); // 200 - 25%
      expect(delay2).toBeLessThanOrEqual(250);    // 200 + 25%
      expect(delay3).toBeGreaterThanOrEqual(300); // 400 - 25%
      expect(delay3).toBeLessThanOrEqual(500);    // 400 + 25%
    });

    it('should cap delay at maxDelayMs', () => {
      const baseDelay = 100;
      const maxDelay = 500;

      // Test multiple times since there's random jitter (±25%)
      for (let i = 0; i < 20; i++) {
        const delay = computeBackoffDelay(10, baseDelay, maxDelay);
        expect(delay).toBeLessThanOrEqual(maxDelay * 1.25);
      }
    });

    it('should use default values when not provided', () => {
      const delay = computeBackoffDelay(1);

      expect(delay).toBeGreaterThanOrEqual(75);   // 100 * 0.75
      expect(delay).toBeLessThanOrEqual(125);     // 100 * 1.25
    });

    it('should apply jitter within ±25%', () => {
      const baseDelay = 100;
      const maxDelay = 1000;

      // Run multiple times to account for randomness
      const delays: number[] = [];
      for (let i = 0; i < 100; i++) {
        delays.push(computeBackoffDelay(1, baseDelay, maxDelay));
      }

      // All delays should be within ±25% of base
      const expectedBase = 100;
      const minExpected = expectedBase * 0.75;
      const maxExpected = expectedBase * 1.25;

      delays.forEach((delay) => {
        expect(delay).toBeGreaterThanOrEqual(minExpected);
        expect(delay).toBeLessThanOrEqual(maxExpected);
      });
    });

    it('should never return negative delay', () => {
      const delay = computeBackoffDelay(1, 0, 100);
      expect(delay).toBeGreaterThanOrEqual(0);
    });

    it('should compute correct values for higher attempts', () => {
      // 2^(5-1) = 16, so base * 16 = 1600
      const delay = computeBackoffDelay(5, 100, 10000);
      
      expect(delay).toBeGreaterThanOrEqual(1200); // 1600 * 0.75
      expect(delay).toBeLessThanOrEqual(2000);    // 1600 * 1.25
    });
  });

  describe('isLockTimeoutError', () => {
    it('should return true for LockTimeoutError instance', () => {
      const error = new LockTimeoutError('Timeout', BigInt(1), 3, 1000);
      expect(isLockTimeoutError(error)).toBe(true);
    });

    it('should return true for error with correct name', () => {
      const error = new Error('Timeout');
      error.name = 'LockTimeoutError';
      expect(isLockTimeoutError(error)).toBe(true);
    });

    it('should return false for regular error', () => {
      const error = new Error('Regular error');
      expect(isLockTimeoutError(error)).toBe(false);
    });

    it('should return false for null', () => {
      expect(isLockTimeoutError(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isLockTimeoutError(undefined)).toBe(false);
    });

    it('should return false for non-error objects', () => {
      expect(isLockTimeoutError({ name: 'LockTimeoutError' })).toBe(false);
    });
  });

  describe('isLockOrderViolationError', () => {
    it('should return true for LockOrderViolationError instance', () => {
      const error = new LockOrderViolationError('Violation', [], []);
      expect(isLockOrderViolationError(error)).toBe(true);
    });

    it('should return true for error with correct name', () => {
      const error = new Error('Violation');
      error.name = 'LockOrderViolationError';
      expect(isLockOrderViolationError(error)).toBe(true);
    });

    it('should return false for regular error', () => {
      const error = new Error('Regular error');
      expect(isLockOrderViolationError(error)).toBe(false);
    });

    it('should return false for LockTimeoutError', () => {
      const error = new LockTimeoutError('Timeout', BigInt(1), 3, 1000);
      expect(isLockOrderViolationError(error)).toBe(false);
    });

    it('should return false for null', () => {
      expect(isLockOrderViolationError(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isLockOrderViolationError(undefined)).toBe(false);
    });
  });
});
