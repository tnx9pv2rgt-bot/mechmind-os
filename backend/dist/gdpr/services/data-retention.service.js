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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var DataRetentionService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataRetentionService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const schedule_1 = require("@nestjs/schedule");
const bullmq_1 = require("@nestjs/bullmq");
const bullmq_2 = require("bullmq");
const prisma_service_1 = require("../../common/services/prisma.service");
const encryption_service_1 = require("../../common/services/encryption.service");
const logger_service_1 = require("../../common/services/logger.service");
let DataRetentionService = DataRetentionService_1 = class DataRetentionService {
    constructor(prisma, encryption, config, loggerService, retentionQueue) {
        this.prisma = prisma;
        this.encryption = encryption;
        this.config = config;
        this.loggerService = loggerService;
        this.retentionQueue = retentionQueue;
        this.logger = new common_1.Logger(DataRetentionService_1.name);
        this.DEFAULT_RETENTION = {
            customerDataDays: 2555,
            bookingDataDays: 30,
            optOutDataDays: 30,
            callRecordingDays: 30,
            auditLogDays: 365,
            webhookEventDays: 90,
            consentAuditLogDays: 2555,
        };
    }
    getRetentionPolicy() {
        return {
            customerDataDays: parseInt(this.config.get('GDPR_CUSTOMER_RETENTION_DAYS', String(this.DEFAULT_RETENTION.customerDataDays))),
            bookingDataDays: parseInt(this.config.get('GDPR_BOOKING_RETENTION_DAYS', String(this.DEFAULT_RETENTION.bookingDataDays))),
            optOutDataDays: parseInt(this.config.get('GDPR_OPTOUT_RETENTION_DAYS', String(this.DEFAULT_RETENTION.optOutDataDays))),
            callRecordingDays: parseInt(this.config.get('GDPR_RECORDING_RETENTION_DAYS', String(this.DEFAULT_RETENTION.callRecordingDays))),
            auditLogDays: parseInt(this.config.get('GDPR_AUDIT_LOG_DAYS', String(this.DEFAULT_RETENTION.auditLogDays))),
            webhookEventDays: parseInt(this.config.get('GDPR_WEBHOOK_EVENT_DAYS', String(this.DEFAULT_RETENTION.webhookEventDays))),
            consentAuditLogDays: parseInt(this.config.get('GDPR_CONSENT_LOG_DAYS', String(this.DEFAULT_RETENTION.consentAuditLogDays))),
        };
    }
    async scheduledRetentionEnforcement() {
        this.logger.log('Starting scheduled data retention enforcement');
        try {
            const result = await this.enforceRetentionPolicy();
            this.loggerService.log(`Daily retention enforcement completed: ${JSON.stringify({
                customersAnonymized: result.customersAnonymized,
                recordingsDeleted: result.recordingsDeleted,
                logsDeleted: result.logsDeleted,
                durationMs: result.durationMs,
            })}`, 'DataRetentionService');
        }
        catch (error) {
            this.logger.error(`Scheduled retention enforcement failed: ${error.message}`);
        }
    }
    async weeklyDeepCleanup() {
        this.logger.log('Starting weekly deep cleanup');
        try {
            await this.cleanExpiredSnapshots();
            await this.archiveOldConsentLogs();
            await this.purgeSoftDeletedRecords();
            this.loggerService.log('Weekly deep cleanup completed', 'DataRetentionService');
        }
        catch (error) {
            this.logger.error(`Weekly deep cleanup failed: ${error.message}`);
        }
    }
    async enforceRetentionPolicy(tenantId) {
        const executionId = `retention-${Date.now()}`;
        const startedAt = new Date();
        const errors = [];
        this.logger.log(`Starting retention policy enforcement [${executionId}]`);
        await this.prisma.dataRetentionExecutionLog.create({
            data: {
                tenantId: tenantId || null,
                executionType: 'RETENTION_POLICY',
                status: 'RUNNING',
                startedAt,
                retentionDaysApplied: this.getRetentionPolicy().customerDataDays,
            },
        });
        let customersAnonymized = 0;
        let bookingsAnonymized = 0;
        let recordingsDeleted = 0;
        let logsDeleted = 0;
        let webhookEventsDeleted = 0;
        try {
            const customerResult = await this.anonymizeExpiredCustomers(tenantId);
            customersAnonymized = customerResult.count;
            const bookingResult = await this.anonymizeOldBookings(tenantId);
            bookingsAnonymized = bookingResult.count;
            const recordingResult = await this.deleteExpiredRecordings(tenantId);
            recordingsDeleted = recordingResult.count;
            const logResult = await this.deleteOldAuditLogs(tenantId);
            logsDeleted = logResult.count;
            const webhookResult = await this.deleteOldWebhookEvents(tenantId);
            webhookEventsDeleted = webhookResult.count;
            const optOutResult = await this.processOptOutCustomers(tenantId);
            customersAnonymized += optOutResult.count;
        }
        catch (error) {
            this.logger.error(`Retention enforcement error: ${error.message}`);
            errors.push(error.message);
        }
        const completedAt = new Date();
        const durationMs = completedAt.getTime() - startedAt.getTime();
        await this.prisma.dataRetentionExecutionLog.updateMany({
            where: {
                startedAt,
                executionType: 'RETENTION_POLICY',
            },
            data: {
                status: errors.length > 0 ? 'PARTIAL' : 'COMPLETED',
                completedAt,
                customersAnonymized,
                bookingsAnonymized,
                recordingsDeleted,
                logsDeleted: logsDeleted + webhookEventsDeleted,
                errorMessage: errors.length > 0 ? errors.join('; ') : null,
            },
        });
        this.logger.log(`Retention enforcement completed [${executionId}]: ` +
            `${customersAnonymized} customers, ${recordingsDeleted} recordings deleted`);
        return {
            executionId,
            startedAt,
            completedAt,
            durationMs,
            customersAnonymized,
            bookingsAnonymized,
            recordingsDeleted,
            logsDeleted,
            webhookEventsDeleted,
            consentLogsArchived: 0,
            errors,
            success: errors.length === 0,
        };
    }
    async anonymizeExpiredCustomers(tenantId) {
        const policy = this.getRetentionPolicy();
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - policy.customerDataDays);
        const customersToAnonymize = await this.prisma.customerEncrypted.findMany({
            where: {
                ...(tenantId && { tenantId }),
                anonymizedAt: null,
                isDeleted: false,
                createdAt: {
                    lt: cutoffDate,
                },
                bookings: {
                    none: {
                        createdAt: {
                            gte: cutoffDate,
                        },
                    },
                },
            },
            select: {
                id: true,
                tenantId: true,
            },
            take: 100,
        });
        let count = 0;
        for (const customer of customersToAnonymize) {
            try {
                await this.prisma.withTenant(customer.tenantId, async (prisma) => {
                    await prisma.customerEncrypted.update({
                        where: { id: customer.id },
                        data: {
                            phoneEncrypted: Buffer.from(this.encryption.encrypt('RETENTION_EXPIRED')),
                            emailEncrypted: Buffer.from(this.encryption.encrypt('RETENTION_EXPIRED')),
                            nameEncrypted: Buffer.from(this.encryption.encrypt('RETENTION_EXPIRED')),
                            gdprConsent: false,
                            marketingConsent: false,
                            anonymizedAt: new Date(),
                        },
                    });
                });
                count++;
            }
            catch (error) {
                this.logger.error(`Failed to anonymize customer ${customer.id}: ${error.message}`);
            }
        }
        if (count > 0) {
            this.loggerService.log(`Anonymized ${count} customers past retention period`, 'DataRetentionService');
        }
        return { count };
    }
    async processOptOutCustomers(tenantId) {
        const policy = this.getRetentionPolicy();
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - policy.optOutDataDays);
        const consentLogs = await this.prisma.consentAuditLog.findMany({
            where: {
                ...(tenantId && { tenantId }),
                consentType: 'GDPR',
                granted: false,
                timestamp: {
                    lt: cutoffDate,
                },
                customer: {
                    anonymizedAt: null,
                    isDeleted: false,
                },
            },
            include: {
                customer: {
                    select: {
                        id: true,
                        tenantId: true,
                    },
                },
            },
            distinct: ['customerId'],
            take: 100,
        });
        let count = 0;
        for (const log of consentLogs) {
            if (!log.customer)
                continue;
            try {
                await this.prisma.withTenant(log.customer.tenantId, async (prisma) => {
                    await prisma.customerEncrypted.update({
                        where: { id: log.customer.id },
                        data: {
                            phoneEncrypted: Buffer.from(this.encryption.encrypt('OPTED_OUT')),
                            emailEncrypted: Buffer.from(this.encryption.encrypt('OPTED_OUT')),
                            nameEncrypted: Buffer.from(this.encryption.encrypt('OPTED_OUT')),
                            gdprConsent: false,
                            marketingConsent: false,
                            anonymizedAt: new Date(),
                        },
                    });
                });
                count++;
            }
            catch (error) {
                this.logger.error(`Failed to process opt-out for customer ${log.customer.id}: ${error.message}`);
            }
        }
        if (count > 0) {
            this.loggerService.log(`Anonymized ${count} customers after opt-out grace period`, 'DataRetentionService');
        }
        return { count };
    }
    async anonymizeOldBookings(tenantId) {
        const policy = this.getRetentionPolicy();
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - policy.bookingDataDays);
        const result = await this.prisma.booking.count({
            where: {
                ...(tenantId && { tenantId }),
                createdAt: {
                    lt: cutoffDate,
                },
            },
        });
        return { count: result };
    }
    async deleteExpiredRecordings(tenantId) {
        const now = new Date();
        const recordingsToDelete = await this.prisma.callRecordings.findMany({
            where: {
                ...(tenantId && { tenantId }),
                retentionUntil: {
                    lt: now,
                },
                deletedAt: null,
            },
            select: {
                id: true,
                tenantId: true,
                recordingSid: true,
            },
            take: 500,
        });
        let count = 0;
        for (const recording of recordingsToDelete) {
            try {
                await this.prisma.withTenant(recording.tenantId, async (prisma) => {
                    await prisma.callRecordings.update({
                        where: { id: recording.id },
                        data: {
                            deletedAt: now,
                            deletionReason: 'RETENTION_EXPIRED',
                            recordingUrl: null,
                        },
                    });
                });
                count++;
            }
            catch (error) {
                this.logger.error(`Failed to delete recording ${recording.id}: ${error.message}`);
            }
        }
        if (count > 0) {
            this.loggerService.log(`Deleted ${count} expired call recordings`, 'DataRetentionService');
        }
        return { count };
    }
    async deleteOldAuditLogs(tenantId) {
        const policy = this.getRetentionPolicy();
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - policy.auditLogDays);
        const result = await this.prisma.auditLog.deleteMany({
            where: {
                ...(tenantId && { tenantId }),
                createdAt: {
                    lt: cutoffDate,
                },
                action: {
                    notIn: ['CUSTOMER_ANONYMIZED', 'DELETION_SNAPSHOT_CREATED', 'CALL_RECORDINGS_DELETED'],
                },
            },
        });
        if (result.count > 0) {
            this.loggerService.log(`Deleted ${result.count} old audit logs`, 'DataRetentionService');
        }
        return { count: result.count };
    }
    async deleteOldWebhookEvents(tenantId) {
        const policy = this.getRetentionPolicy();
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - policy.webhookEventDays);
        try {
            const result = tenantId
                ? await this.prisma.$executeRaw `
            DELETE FROM voice_webhook_events
            WHERE created_at < ${cutoffDate}
            AND tenant_id = ${tenantId}
          `
                : await this.prisma.$executeRaw `
            DELETE FROM voice_webhook_events
            WHERE created_at < ${cutoffDate}
          `;
            return { count: result };
        }
        catch (error) {
            this.logger.debug(`Webhook events cleanup skipped: ${error.message}`);
            return { count: 0 };
        }
    }
    async cleanExpiredSnapshots() {
        const snapshotRetentionDays = 30;
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - snapshotRetentionDays);
        const expiredRequests = await this.prisma.dataSubjectRequest.findMany({
            where: {
                completedAt: {
                    lt: cutoffDate,
                },
                deletionSnapshotUrl: {
                    not: null,
                },
                status: 'COMPLETED',
            },
            select: {
                id: true,
                deletionSnapshotUrl: true,
            },
        });
        let count = 0;
        for (const request of expiredRequests) {
            try {
                await this.prisma.dataSubjectRequest.update({
                    where: { id: request.id },
                    data: {
                        deletionSnapshotUrl: null,
                    },
                });
                count++;
            }
            catch (error) {
                this.logger.error(`Failed to clean snapshot for request ${request.id}: ${error.message}`);
            }
        }
        if (count > 0) {
            this.loggerService.log(`Cleaned ${count} expired deletion snapshots`, 'DataRetentionService');
        }
        return { count };
    }
    async archiveOldConsentLogs() {
        const archiveAfterDays = 365;
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - archiveAfterDays);
        const result = await this.prisma.consentAuditLog.updateMany({
            where: {
                timestamp: {
                    lt: cutoffDate,
                },
                metadata: {
                    path: ['archived'],
                    not: true,
                },
            },
            data: {
                metadata: {
                    set: {
                        archived: true,
                        archivedAt: new Date().toISOString(),
                    },
                },
            },
        });
        return { count: result.count };
    }
    async purgeSoftDeletedRecords() {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - 30);
        return { count: 0 };
    }
    async getTenantRetentionStats(tenantId) {
        const tenant = await this.prisma.tenant.findUnique({
            where: { id: tenantId },
        });
        if (!tenant) {
            throw new Error(`Tenant ${tenantId} not found`);
        }
        const policy = this.getRetentionPolicy();
        const retentionCutoff = new Date();
        retentionCutoff.setDate(retentionCutoff.getDate() - policy.customerDataDays);
        const [activeCustomers, pendingAnonymization, expiredRecordings] = await Promise.all([
            this.prisma.customerEncrypted.count({
                where: {
                    tenantId,
                    anonymizedAt: null,
                    isDeleted: false,
                },
            }),
            this.prisma.customerEncrypted.count({
                where: {
                    tenantId,
                    anonymizedAt: null,
                    isDeleted: false,
                    createdAt: {
                        lt: retentionCutoff,
                    },
                },
            }),
            this.prisma.callRecordings.count({
                where: {
                    tenantId,
                    retentionUntil: {
                        lt: new Date(),
                    },
                    deletedAt: null,
                },
            }),
        ]);
        const retentionDays = tenant.dataRetentionDays ?? this.DEFAULT_RETENTION.customerDataDays;
        return {
            tenantId,
            tenantName: tenant.name,
            dataRetentionDays: retentionDays,
            activeCustomers,
            customersPendingAnonymization: pendingAnonymization,
            expiredRecordings,
            storageUsed: 0,
        };
    }
    async updateTenantRetentionPolicy(tenantId, days) {
        const minDays = 30;
        const maxDays = 3650;
        if (days < minDays || days > maxDays) {
            throw new Error(`Retention days must be between ${minDays} and ${maxDays}`);
        }
        await this.prisma.tenant.update({
            where: { id: tenantId },
            data: {
                settings: {
                    set: {
                        dataRetentionDays: days,
                    },
                },
            },
        });
        this.loggerService.log(`Updated retention policy for tenant ${tenantId}: ${days} days`, 'DataRetentionService');
    }
    async queueRetentionEnforcement(tenantId) {
        const job = await this.retentionQueue.add('enforce-retention', {
            tenantId,
            triggeredAt: new Date().toISOString(),
        }, {
            jobId: `retention-${tenantId || 'all'}-${Date.now()}`,
            attempts: 3,
            backoff: {
                type: 'exponential',
                delay: 10000,
            },
        });
        return {
            jobId: job.id,
            status: 'QUEUED',
        };
    }
};
exports.DataRetentionService = DataRetentionService;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_DAY_AT_2AM, {
        name: 'daily-retention-enforcement',
        timeZone: 'Europe/Rome',
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], DataRetentionService.prototype, "scheduledRetentionEnforcement", null);
__decorate([
    (0, schedule_1.Cron)('0 3 * * 0', {
        name: 'weekly-deep-cleanup',
        timeZone: 'Europe/Rome',
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], DataRetentionService.prototype, "weeklyDeepCleanup", null);
exports.DataRetentionService = DataRetentionService = DataRetentionService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(4, (0, bullmq_1.InjectQueue)('gdpr-retention')),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        encryption_service_1.EncryptionService,
        config_1.ConfigService,
        logger_service_1.LoggerService,
        bullmq_2.Queue])
], DataRetentionService);
