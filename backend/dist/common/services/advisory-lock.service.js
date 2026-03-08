"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdvisoryLockService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("./prisma.service");
const logger_service_1 = require("./logger.service");
const lock_monitor_service_1 = require("./lock-monitor.service");
const lock_utils_1 = require("../utils/lock-utils");
let AdvisoryLockService = class AdvisoryLockService {
    constructor(prisma, logger, lockMonitor) {
        this.prisma = prisma;
        this.logger = logger;
        this.lockMonitor = lockMonitor;
        this.defaultMaxAttempts = 3;
        this.defaultBaseDelayMs = 100;
        this.defaultMaxDelayMs = 5000;
        this.defaultTimeoutMs = 30000;
    }
    computeLockId(tenantId, slotId) {
        return (0, lock_utils_1.computeLockId)(tenantId, slotId);
    }
    async acquireLockWithRetry(tenantId, slotId, options = {}) {
        const { maxAttempts = this.defaultMaxAttempts, baseDelayMs = this.defaultBaseDelayMs, maxDelayMs = this.defaultMaxDelayMs, } = options;
        const lockId = this.computeLockId(tenantId, slotId);
        const startTime = Date.now();
        let attempts = 0;
        this.logger.debug(`Attempting to acquire lock ${lockId} for tenant ${tenantId}, slot ${slotId}`, 'AdvisoryLockService');
        while (attempts < maxAttempts) {
            attempts++;
            try {
                const acquired = await this.tryAcquireLock(lockId);
                if (acquired) {
                    const waitTimeMs = Date.now() - startTime;
                    this.logger.debug(`Lock ${lockId} acquired after ${attempts} attempt(s), waited ${waitTimeMs}ms`, 'AdvisoryLockService');
                    await this.lockMonitor.recordLockAcquisition(waitTimeMs);
                    return {
                        success: true,
                        lockId,
                        attempts,
                        waitTimeMs,
                        acquiredAt: new Date(),
                    };
                }
                this.logger.warn(`Lock ${lockId} not available, attempt ${attempts}/${maxAttempts}`, 'AdvisoryLockService');
                if (attempts < maxAttempts) {
                    const delay = (0, lock_utils_1.computeBackoffDelay)(attempts, baseDelayMs, maxDelayMs);
                    this.logger.debug(`Waiting ${delay}ms before retry`, 'AdvisoryLockService');
                    await this.sleep(delay);
                }
            }
            catch (error) {
                this.logger.error(`Error acquiring lock ${lockId}: ${error instanceof Error ? error.message : 'Unknown error'}`, undefined, 'AdvisoryLockService');
                throw error;
            }
        }
        const totalWaitTimeMs = Date.now() - startTime;
        this.logger.error(`Failed to acquire lock ${lockId} after ${attempts} attempts (${totalWaitTimeMs}ms)`, undefined, 'AdvisoryLockService');
        await this.lockMonitor.recordLockFailure();
        throw new lock_utils_1.LockTimeoutError(`Failed to acquire lock for tenant ${tenantId}, slot ${slotId} after ${attempts} attempts`, lockId, attempts, totalWaitTimeMs);
    }
    async releaseLock(tenantId, slotId) {
        const lockId = this.computeLockId(tenantId, slotId);
        try {
            const result = await this.prisma.$queryRaw `
        SELECT pg_advisory_unlock(${lockId}::bigint) as released
      `;
            const released = result[0]?.released ?? false;
            if (released) {
                this.logger.debug(`Lock ${lockId} released`, 'AdvisoryLockService');
            }
            else {
                this.logger.warn(`Lock ${lockId} was not held by this session`, 'AdvisoryLockService');
            }
            return released;
        }
        catch (error) {
            this.logger.error(`Error releasing lock ${lockId}: ${error instanceof Error ? error.message : 'Unknown error'}`, undefined, 'AdvisoryLockService');
            throw error;
        }
    }
    async checkLockStatus(tenantId, slotId) {
        const lockId = this.computeLockId(tenantId, slotId);
        try {
            const result = await this.prisma.$queryRaw `
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
        }
        catch (error) {
            this.logger.error(`Error checking lock status for ${lockId}: ${error instanceof Error ? error.message : 'Unknown error'}`, undefined, 'AdvisoryLockService');
            throw error;
        }
    }
    async acquireMultipleLocks(locks, options = {}) {
        const sortedLocks = (0, lock_utils_1.validateLockOrder)(locks);
        const acquiredLocks = [];
        const failedLocks = [];
        const results = [];
        this.logger.debug(`Attempting to acquire ${sortedLocks.length} locks in batch`, 'AdvisoryLockService');
        try {
            for (const { tenantId, slotId } of sortedLocks) {
                try {
                    const result = await this.acquireLockWithRetry(tenantId, slotId, options);
                    if (result.success) {
                        acquiredLocks.push(result.lockId);
                    }
                    else {
                        failedLocks.push(result.lockId);
                    }
                    results.push(result);
                }
                catch (error) {
                    failedLocks.push(this.computeLockId(tenantId, slotId));
                    this.logger.warn(`Failed to acquire lock for tenant ${tenantId}, slot ${slotId}, releasing all acquired locks`, 'AdvisoryLockService');
                    await this.releaseMultipleLocks(acquiredLocks.map((lockId, index) => ({
                        tenantId: sortedLocks[index].tenantId,
                        slotId: sortedLocks[index].slotId,
                    })));
                    throw error;
                }
            }
            return {
                success: failedLocks.length === 0,
                acquiredLocks,
                failedLocks,
                results,
            };
        }
        catch (error) {
            if (error instanceof lock_utils_1.LockOrderViolationError) {
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
    async releaseMultipleLocks(locks) {
        for (const { tenantId, slotId } of locks) {
            try {
                await this.releaseLock(tenantId, slotId);
            }
            catch (error) {
                this.logger.error(`Error releasing lock for tenant ${tenantId}, slot ${slotId}: ${error instanceof Error ? error.message : 'Unknown'}`, undefined, 'AdvisoryLockService');
            }
        }
    }
    async withLock(tenantId, slotId, fn, options = {}) {
        const lockResult = await this.acquireLockWithRetry(tenantId, slotId, options);
        try {
            return await fn();
        }
        finally {
            await this.releaseLock(tenantId, slotId);
        }
    }
    async withMultipleLocks(locks, fn, options = {}) {
        const multiLockResult = await this.acquireMultipleLocks(locks, options);
        if (!multiLockResult.success) {
            throw new lock_utils_1.LockTimeoutError(`Failed to acquire all required locks. Acquired: ${multiLockResult.acquiredLocks.length}, Failed: ${multiLockResult.failedLocks.length}`, BigInt(0), 0, 0);
        }
        try {
            return await fn();
        }
        finally {
            await this.releaseMultipleLocks(locks);
        }
    }
    async tryAcquireLock(lockId) {
        const result = await this.prisma.$queryRaw `
      SELECT pg_try_advisory_lock(${lockId}::bigint) as acquired
    `;
        return result[0]?.acquired ?? false;
    }
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
};
exports.AdvisoryLockService = AdvisoryLockService;
exports.AdvisoryLockService = AdvisoryLockService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        logger_service_1.LoggerService,
        lock_monitor_service_1.LockMonitorService])
], AdvisoryLockService);
