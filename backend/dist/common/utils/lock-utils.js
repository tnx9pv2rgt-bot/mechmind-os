"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LockOrderViolationError = exports.LockTimeoutError = void 0;
exports.validateLockOrder = validateLockOrder;
exports.computeLockId = computeLockId;
exports.computeLockIdSafe = computeLockIdSafe;
exports.computeBackoffDelay = computeBackoffDelay;
exports.isLockTimeoutError = isLockTimeoutError;
exports.isLockOrderViolationError = isLockOrderViolationError;
class LockTimeoutError extends Error {
    constructor(message, lockId, attempts, totalWaitTimeMs) {
        super(message);
        this.lockId = lockId;
        this.attempts = attempts;
        this.totalWaitTimeMs = totalWaitTimeMs;
        this.name = 'LockTimeoutError';
    }
}
exports.LockTimeoutError = LockTimeoutError;
class LockOrderViolationError extends Error {
    constructor(message, expectedOrder, actualOrder) {
        super(message);
        this.expectedOrder = expectedOrder;
        this.actualOrder = actualOrder;
        this.name = 'LockOrderViolationError';
    }
}
exports.LockOrderViolationError = LockOrderViolationError;
function validateLockOrder(locks) {
    if (locks.length <= 1) {
        return locks;
    }
    const sorted = [...locks].sort((a, b) => {
        const tenantCompare = a.tenantId.localeCompare(b.tenantId);
        if (tenantCompare !== 0) {
            return tenantCompare;
        }
        return a.slotId.localeCompare(b.slotId);
    });
    const isOrdered = locks.every((lock, index) => lock.tenantId === sorted[index].tenantId &&
        lock.slotId === sorted[index].slotId);
    if (!isOrdered) {
        throw new LockOrderViolationError('Lock acquisition order violation detected. Locks must be acquired in consistent order (tenant_id, then slot_id) to prevent deadlocks.', sorted, locks);
    }
    return sorted;
}
function computeLockId(tenantId, slotId) {
    const tenantPart = BigInt(parseInt(tenantId.replace(/-/g, '').substring(0, 8), 16));
    const slotPart = BigInt(parseInt(slotId.replace(/-/g, '').substring(0, 8), 16));
    return (tenantPart << BigInt(32)) | slotPart;
}
function computeLockIdSafe(tenantId, slotId, existingLocks = new Set()) {
    const lockId = computeLockId(tenantId, slotId);
    if (existingLocks.has(lockId)) {
        throw new Error(`Duplicate lock detected for tenant ${tenantId}, slot ${slotId}`);
    }
    return lockId;
}
function computeBackoffDelay(attempt, baseDelayMs = 100, maxDelayMs = 5000) {
    const exponentialDelay = baseDelayMs * Math.pow(2, attempt - 1);
    const cappedDelay = Math.min(exponentialDelay, maxDelayMs);
    const jitter = cappedDelay * 0.25;
    const jitteredDelay = cappedDelay + (Math.random() * 2 - 1) * jitter;
    return Math.max(0, Math.floor(jitteredDelay));
}
function isLockTimeoutError(error) {
    return error instanceof LockTimeoutError ||
        (error instanceof Error && error.name === 'LockTimeoutError');
}
function isLockOrderViolationError(error) {
    return error instanceof LockOrderViolationError ||
        (error instanceof Error && error.name === 'LockOrderViolationError');
}
