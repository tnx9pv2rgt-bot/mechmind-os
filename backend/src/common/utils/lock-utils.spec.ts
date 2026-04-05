import {
  validateLockOrder,
  computeLockId,
  computeLockIdSafe,
  computeBackoffDelay,
  isLockTimeoutError,
  isLockOrderViolationError,
  LockTimeoutError,
  LockOrderViolationError,
} from './lock-utils';
import { ConflictException } from '@nestjs/common';

describe('validateLockOrder', () => {
  it('should return empty array for empty input', () => {
    expect(validateLockOrder([])).toEqual([]);
  });

  it('should return single lock unchanged', () => {
    const locks = [{ tenantId: 'a', slotId: 'b' }];
    expect(validateLockOrder(locks)).toEqual(locks);
  });

  it('should accept correctly ordered locks (by tenantId)', () => {
    const locks = [
      { tenantId: 'a', slotId: 'z' },
      { tenantId: 'b', slotId: 'a' },
    ];
    expect(validateLockOrder(locks)).toEqual(locks);
  });

  it('should accept correctly ordered locks (same tenant, by slotId)', () => {
    const locks = [
      { tenantId: 'a', slotId: 'a' },
      { tenantId: 'a', slotId: 'b' },
    ];
    expect(validateLockOrder(locks)).toEqual(locks);
  });

  it('should throw LockOrderViolationError for incorrectly ordered locks', () => {
    const locks = [
      { tenantId: 'b', slotId: 'a' },
      { tenantId: 'a', slotId: 'b' },
    ];

    expect(() => validateLockOrder(locks)).toThrow(LockOrderViolationError);
  });

  it('should throw with correct expected and actual order', () => {
    const locks = [
      { tenantId: 'b', slotId: '1' },
      { tenantId: 'a', slotId: '2' },
    ];

    try {
      validateLockOrder(locks);
      fail('Should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(LockOrderViolationError);
      const err = e as LockOrderViolationError;
      expect(err.expectedOrder[0].tenantId).toBe('a');
      expect(err.actualOrder[0].tenantId).toBe('b');
    }
  });

  it('should handle three locks in correct order', () => {
    const locks = [
      { tenantId: 'a', slotId: '1' },
      { tenantId: 'a', slotId: '2' },
      { tenantId: 'b', slotId: '1' },
    ];
    expect(validateLockOrder(locks)).toEqual(locks);
  });

  it('should reject three locks in wrong order', () => {
    const locks = [
      { tenantId: 'a', slotId: '2' },
      { tenantId: 'a', slotId: '1' },
      { tenantId: 'b', slotId: '1' },
    ];
    expect(() => validateLockOrder(locks)).toThrow(LockOrderViolationError);
  });
});

describe('computeLockId', () => {
  it('should compute a 64-bit lock ID from tenant and slot UUIDs', () => {
    const result = computeLockId(
      '12345678-1234-1234-1234-123456789abc',
      'abcdef01-2345-6789-abcd-ef0123456789',
    );
    expect(typeof result).toBe('bigint');
    expect(result).toBeGreaterThan(BigInt(0));
  });

  it('should produce different IDs for different tenants', () => {
    const id1 = computeLockId(
      '11111111-0000-0000-0000-000000000000',
      'aaaaaaaa-0000-0000-0000-000000000000',
    );
    const id2 = computeLockId(
      '22222222-0000-0000-0000-000000000000',
      'aaaaaaaa-0000-0000-0000-000000000000',
    );
    expect(id1).not.toBe(id2);
  });

  it('should produce different IDs for different slots', () => {
    const id1 = computeLockId(
      '11111111-0000-0000-0000-000000000000',
      'aaaaaaaa-0000-0000-0000-000000000000',
    );
    const id2 = computeLockId(
      '11111111-0000-0000-0000-000000000000',
      'bbbbbbbb-0000-0000-0000-000000000000',
    );
    expect(id1).not.toBe(id2);
  });

  it('should produce same ID for same inputs', () => {
    const id1 = computeLockId(
      'abcdef12-3456-7890-abcd-ef1234567890',
      'fedcba98-7654-3210-fedc-ba9876543210',
    );
    const id2 = computeLockId(
      'abcdef12-3456-7890-abcd-ef1234567890',
      'fedcba98-7654-3210-fedc-ba9876543210',
    );
    expect(id1).toBe(id2);
  });

  it('should use first 8 hex chars of each UUID', () => {
    // UUIDs differ only in later parts - should produce same lock ID
    const id1 = computeLockId(
      '12345678-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      '12345678-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    );
    const id2 = computeLockId(
      '12345678-cccc-cccc-cccc-cccccccccccc',
      '12345678-dddd-dddd-dddd-dddddddddddd',
    );
    expect(id1).toBe(id2);
  });
});

describe('computeLockIdSafe', () => {
  it('should return lock ID when no duplicates', () => {
    const result = computeLockIdSafe(
      'aaaaaaaa-0000-0000-0000-000000000000',
      'bbbbbbbb-0000-0000-0000-000000000000',
    );
    expect(typeof result).toBe('bigint');
  });

  it('should throw ConflictException for duplicate lock', () => {
    const lockId = computeLockId(
      'aaaaaaaa-0000-0000-0000-000000000000',
      'bbbbbbbb-0000-0000-0000-000000000000',
    );
    const existing = new Set([lockId]);

    expect(() =>
      computeLockIdSafe(
        'aaaaaaaa-0000-0000-0000-000000000000',
        'bbbbbbbb-0000-0000-0000-000000000000',
        existing,
      ),
    ).toThrow(ConflictException);
  });

  it('should work with default empty set', () => {
    const result = computeLockIdSafe(
      'cccccccc-0000-0000-0000-000000000000',
      'dddddddd-0000-0000-0000-000000000000',
    );
    expect(result).toBeGreaterThan(BigInt(0));
  });
});

describe('computeBackoffDelay', () => {
  it('should return a positive number', () => {
    const delay = computeBackoffDelay(1);
    expect(delay).toBeGreaterThanOrEqual(0);
  });

  it('should increase delay with attempts (on average)', () => {
    // Test with many samples to account for jitter
    const samples1: number[] = [];
    const samples3: number[] = [];
    for (let i = 0; i < 100; i++) {
      samples1.push(computeBackoffDelay(1, 100, 5000));
      samples3.push(computeBackoffDelay(3, 100, 5000));
    }
    const avg1 = samples1.reduce((a, b) => a + b, 0) / samples1.length;
    const avg3 = samples3.reduce((a, b) => a + b, 0) / samples3.length;
    expect(avg3).toBeGreaterThan(avg1);
  });

  it('should cap at maxDelayMs', () => {
    const delay = computeBackoffDelay(20, 100, 1000);
    // With jitter +-25%, max is 1250
    expect(delay).toBeLessThanOrEqual(1250);
  });

  it('should use custom baseDelayMs', () => {
    // First attempt with base 500 should be around 500 +/- 25%
    const delay = computeBackoffDelay(1, 500, 10000);
    expect(delay).toBeGreaterThanOrEqual(375);
    expect(delay).toBeLessThanOrEqual(625);
  });

  it('should never return negative values', () => {
    for (let i = 0; i < 100; i++) {
      expect(computeBackoffDelay(1, 1, 1)).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('LockTimeoutError', () => {
  it('should have correct properties', () => {
    const error = new LockTimeoutError('Timed out', BigInt(123), 5, 3000);
    expect(error.name).toBe('LockTimeoutError');
    expect(error.message).toBe('Timed out');
    expect(error.lockId).toBe(BigInt(123));
    expect(error.attempts).toBe(5);
    expect(error.totalWaitTimeMs).toBe(3000);
  });
});

describe('LockOrderViolationError', () => {
  it('should have correct properties', () => {
    const expected = [{ tenantId: 'a', slotId: '1' }];
    const actual = [{ tenantId: 'b', slotId: '2' }];
    const error = new LockOrderViolationError('Order violated', expected, actual);
    expect(error.name).toBe('LockOrderViolationError');
    expect(error.expectedOrder).toEqual(expected);
    expect(error.actualOrder).toEqual(actual);
  });
});

describe('isLockTimeoutError', () => {
  it('should return true for LockTimeoutError instance', () => {
    const error = new LockTimeoutError('timeout', BigInt(1), 1, 100);
    expect(isLockTimeoutError(error)).toBe(true);
  });

  it('should return true for Error with name LockTimeoutError', () => {
    const error = new Error('timeout');
    error.name = 'LockTimeoutError';
    expect(isLockTimeoutError(error)).toBe(true);
  });

  it('should return false for regular Error', () => {
    expect(isLockTimeoutError(new Error('nope'))).toBe(false);
  });

  it('should return false for non-Error', () => {
    expect(isLockTimeoutError('string')).toBe(false);
    expect(isLockTimeoutError(null)).toBe(false);
    expect(isLockTimeoutError(undefined)).toBe(false);
  });
});

describe('isLockOrderViolationError', () => {
  it('should return true for LockOrderViolationError instance', () => {
    const error = new LockOrderViolationError('violation', [], []);
    expect(isLockOrderViolationError(error)).toBe(true);
  });

  it('should return true for Error with name LockOrderViolationError', () => {
    const error = new Error('violation');
    error.name = 'LockOrderViolationError';
    expect(isLockOrderViolationError(error)).toBe(true);
  });

  it('should return false for regular Error', () => {
    expect(isLockOrderViolationError(new Error('nope'))).toBe(false);
  });

  it('should return false for non-Error', () => {
    expect(isLockOrderViolationError(42)).toBe(false);
    expect(isLockOrderViolationError(null)).toBe(false);
  });
});
