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
var GdprDeletionService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GdprDeletionService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const bullmq_1 = require("@nestjs/bullmq");
const bullmq_2 = require("bullmq");
const prisma_service_1 = require("../../common/services/prisma.service");
const encryption_service_1 = require("../../common/services/encryption.service");
const logger_service_1 = require("../../common/services/logger.service");
let GdprDeletionService = GdprDeletionService_1 = class GdprDeletionService {
    constructor(prisma, encryption, config, loggerService, deletionQueue) {
        this.prisma = prisma;
        this.encryption = encryption;
        this.config = config;
        this.loggerService = loggerService;
        this.deletionQueue = deletionQueue;
        this.logger = new common_1.Logger(GdprDeletionService_1.name);
        this.SNAPSHOT_RETENTION_DAYS = 30;
        this.DELETION_SLA_HOURS = 24;
    }
    async queueDeletion(customerId, tenantId, requestId, reason, options) {
        const customer = await this.prisma.withTenant(tenantId, async (prisma) => {
            return prisma.customerEncrypted.findFirst({
                where: {
                    id: customerId,
                    tenantId,
                    anonymizedAt: null,
                },
                select: { id: true, tenantId: true },
            });
        });
        if (!customer) {
            throw new common_1.NotFoundException(`Customer ${customerId} not found or already anonymized`);
        }
        const existingJob = await this.deletionQueue.getJob(`deletion:${customerId}`);
        if (existingJob && await existingJob.getState() === 'active') {
            throw new common_1.BadRequestException(`Deletion already in progress for customer ${customerId}`);
        }
        await this.prisma.withTenant(tenantId, async (prisma) => {
            await prisma.dataSubjectRequest.update({
                where: { id: requestId },
                data: {
                    status: 'IN_PROGRESS',
                    updatedAt: new Date(),
                },
            });
        });
        const job = await this.deletionQueue.add('customer-deletion', {
            customerId,
            tenantId,
            requestId,
            reason,
            verifiedBy: options?.verifiedBy,
            requestTimestamp: new Date().toISOString(),
            identityVerificationMethod: options?.identityVerificationMethod,
        }, {
            jobId: `deletion:${customerId}`,
            priority: options?.priority ?? 5,
            delay: 0,
            attempts: 3,
            backoff: {
                type: 'exponential',
                delay: 60000,
            },
        });
        const now = new Date();
        const estimatedCompletion = new Date(now.getTime() + 2 * 60 * 60 * 1000);
        const slaDeadline = new Date(now.getTime() + this.DELETION_SLA_HOURS * 60 * 60 * 1000);
        this.loggerService.log(`Queued deletion job ${job.id} for customer ${customerId}. SLA deadline: ${slaDeadline.toISOString()}`, 'GdprDeletionService');
        return {
            jobId: job.id,
            status: 'QUEUED',
            estimatedCompletion,
            slaDeadline,
        };
    }
    async verifyIdentity(customerId, tenantId, verificationData) {
        const customer = await this.prisma.withTenant(tenantId, async (prisma) => {
            return prisma.customerEncrypted.findFirst({
                where: { id: customerId, tenantId },
                include: {
                    bookings: {
                        orderBy: { createdAt: 'desc' },
                        take: 1,
                    },
                },
            });
        });
        if (!customer) {
            throw new common_1.NotFoundException(`Customer ${customerId} not found`);
        }
        let confidenceScore = 0;
        const methods = [];
        if (verificationData.phoneVerified) {
            confidenceScore += 40;
            methods.push('PHONE');
        }
        if (verificationData.emailVerified) {
            confidenceScore += 30;
            methods.push('EMAIL');
        }
        if (verificationData.bookingReference) {
            const bookingMatch = customer.bookings.some((b) => b.id === verificationData.bookingReference);
            if (bookingMatch) {
                confidenceScore += 30;
                methods.push('BOOKING_REFERENCE');
            }
        }
        if (verificationData.documents && verificationData.documents.length > 0) {
            confidenceScore += 20;
            methods.push('DOCUMENTS');
        }
        let confidence;
        if (confidenceScore >= 80)
            confidence = 'HIGH';
        else if (confidenceScore >= 50)
            confidence = 'MEDIUM';
        else
            confidence = 'LOW';
        const verified = confidenceScore >= 50;
        const verifiedAt = new Date();
        await this.prisma.withTenant(tenantId, async (prisma) => {
            await prisma.auditLog.create({
                data: {
                    tenantId,
                    action: 'IDENTITY_VERIFICATION',
                    tableName: 'customers_encrypted',
                    recordId: customerId,
                    newValues: {
                        verified,
                        confidence,
                        methods,
                        score: confidenceScore,
                    },
                    createdAt: verifiedAt,
                },
            });
        });
        return {
            verified,
            confidence,
            verificationMethod: methods.join(','),
            verifiedAt,
        };
    }
    async createDeletionSnapshot(customerId, tenantId, requestId) {
        this.logger.debug(`Creating deletion snapshot for customer ${customerId}`);
        const snapshotId = `snap-${Date.now()}-${customerId.substring(0, 8)}`;
        const createdAt = new Date();
        const expiresAt = new Date(createdAt.getTime() + this.SNAPSHOT_RETENTION_DAYS * 24 * 60 * 60 * 1000);
        const customerData = await this.prisma.withTenant(tenantId, async (prisma) => {
            return prisma.customerEncrypted.findFirst({
                where: { id: customerId, tenantId },
                include: {
                    vehicles: true,
                    bookings: {
                        include: {
                            invoices: true,
                        },
                    },
                },
            });
        });
        if (!customerData) {
            throw new common_1.NotFoundException(`Customer ${customerId} not found`);
        }
        const snapshotContent = {
            snapshotId,
            createdAt: createdAt.toISOString(),
            expiresAt: expiresAt.toISOString(),
            customerId,
            requestId,
            data: {
                customer: {
                    id: customerData.id,
                    createdAt: customerData.createdAt,
                    gdprConsent: customerData.gdprConsent,
                    gdprConsentDate: customerData.gdprConsentDate,
                },
                vehicles: customerData.vehicles.map((v) => ({
                    id: v.id,
                    licensePlate: v.licensePlate,
                    make: v.make,
                    model: v.model,
                    year: v.year,
                })),
                bookings: customerData.bookings.map((b) => ({
                    id: b.id,
                    createdAt: b.createdAt,
                    status: b.status,
                    totalCostCents: b.totalCostCents,
                })),
                totalRecords: 1 + customerData.vehicles.length + customerData.bookings.length,
            },
            retentionDays: this.SNAPSHOT_RETENTION_DAYS,
        };
        const serialized = JSON.stringify(snapshotContent);
        const encryptedSnapshot = this.encryption.encrypt(serialized);
        const checksum = this.generateChecksum(serialized);
        const storageLocation = `snapshots/${tenantId}/${snapshotId}.enc`;
        await this.prisma.withTenant(tenantId, async (prisma) => {
            await prisma.dataSubjectRequest.update({
                where: { id: requestId },
                data: {
                    deletionSnapshotCreated: true,
                    deletionSnapshotUrl: storageLocation,
                },
            });
        });
        await this.prisma.withTenant(tenantId, async (prisma) => {
            await prisma.auditLog.create({
                data: {
                    tenantId,
                    action: 'DELETION_SNAPSHOT_CREATED',
                    tableName: 'customers_encrypted',
                    recordId: customerId,
                    newValues: {
                        snapshotId,
                        expiresAt,
                        recordCount: snapshotContent.data.totalRecords,
                    },
                    createdAt,
                },
            });
        });
        this.loggerService.log(`Deletion snapshot ${snapshotId} created for customer ${customerId}`, 'GdprDeletionService');
        return {
            snapshotId,
            customerId,
            tenantId,
            requestId,
            createdAt,
            expiresAt,
            dataCategories: ['customer', 'vehicles', 'bookings'],
            fileSize: Buffer.byteLength(encryptedSnapshot, 'utf8'),
            checksum,
            storageLocation,
        };
    }
    async anonymizeCustomer(customerId, tenantId, requestId) {
        this.logger.debug(`Anonymizing customer ${customerId}`);
        const errors = [];
        const anonymizedFields = [];
        const preservedFields = [];
        const anonymizedAt = new Date();
        try {
            await this.prisma.withTenant(tenantId, async (prisma) => {
                const customer = await prisma.customerEncrypted.findFirst({
                    where: { id: customerId, tenantId },
                });
                if (!customer) {
                    throw new common_1.NotFoundException(`Customer ${customerId} not found`);
                }
                await prisma.customerEncrypted.update({
                    where: { id: customerId },
                    data: {
                        phoneEncrypted: Buffer.from(this.encryption.encrypt('DELETED')),
                        emailEncrypted: Buffer.from(this.encryption.encrypt('DELETED')),
                        nameEncrypted: Buffer.from(this.encryption.encrypt('DELETED')),
                        gdprConsent: false,
                        marketingConsent: false,
                        callRecordingConsent: false,
                        isDeleted: true,
                        deletedAt: anonymizedAt,
                        anonymizedAt,
                        dataSubjectRequestId: requestId,
                        dataRetentionDays: 0,
                    },
                });
                anonymizedFields.push('phoneEncrypted', 'emailEncrypted', 'nameEncrypted');
                preservedFields.push('id', 'tenantId', 'createdAt', 'bookings', 'vehicles');
                await prisma.auditLog.create({
                    data: {
                        tenantId,
                        action: 'CUSTOMER_ANONYMIZED',
                        tableName: 'customers_encrypted',
                        recordId: customerId,
                        oldValues: { wasActive: true },
                        newValues: {
                            anonymized: true,
                            anonymizedAt,
                            requestId,
                        },
                        createdAt: anonymizedAt,
                    },
                });
            });
            this.loggerService.log(`Customer ${customerId} anonymized successfully`, 'GdprDeletionService');
            return {
                success: true,
                customerId,
                anonymizedAt,
                anonymizedFields,
                preservedFields,
                recordingsDeleted: 0,
                snapshotCreated: true,
                errors: errors.length > 0 ? errors : undefined,
            };
        }
        catch (error) {
            this.logger.error(`Failed to anonymize customer ${customerId}: ${error.message}`);
            errors.push(error.message);
            return {
                success: false,
                customerId,
                anonymizedAt,
                anonymizedFields,
                preservedFields,
                recordingsDeleted: 0,
                snapshotCreated: false,
                errors,
            };
        }
    }
    async deleteCallRecordings(customerId, tenantId) {
        this.logger.debug(`Deleting call recordings for customer ${customerId}`);
        const failedDeletions = [];
        let deletedCount = 0;
        let storageReclaimed = 0;
        try {
            const recordings = await this.prisma.withTenant(tenantId, async (prisma) => {
                return prisma.callRecordings.findMany({
                    where: {
                        customerId,
                        tenantId,
                        deletedAt: null,
                    },
                });
            });
            this.logger.debug(`Found ${recordings.length} recordings to delete`);
            for (const recording of recordings) {
                try {
                    await this.prisma.withTenant(tenantId, async (prisma) => {
                        await prisma.callRecordings.update({
                            where: { id: recording.id },
                            data: {
                                deletedAt: new Date(),
                                deletionReason: 'GDPR_DELETION_REQUEST',
                                recordingUrl: null,
                            },
                        });
                    });
                    deletedCount++;
                    storageReclaimed += recording.durationSeconds * 16000;
                }
                catch (error) {
                    failedDeletions.push({
                        recordingId: recording.id,
                        reason: error.message,
                    });
                }
            }
            if (deletedCount > 0) {
                await this.prisma.withTenant(tenantId, async (prisma) => {
                    await prisma.auditLog.create({
                        data: {
                            tenantId,
                            action: 'CALL_RECORDINGS_DELETED',
                            tableName: 'call_recordings',
                            recordId: customerId,
                            newValues: {
                                deletedCount,
                                storageReclaimedBytes: storageReclaimed,
                                failedCount: failedDeletions.length,
                            },
                            createdAt: new Date(),
                        },
                    });
                });
            }
            return {
                success: failedDeletions.length === 0,
                deletedCount,
                failedDeletions,
                storageReclaimed,
            };
        }
        catch (error) {
            this.logger.error(`Failed to delete recordings for customer ${customerId}: ${error.message}`);
            return {
                success: false,
                deletedCount,
                failedDeletions: [...failedDeletions, {
                        recordingId: 'N/A',
                        reason: error.message
                    }],
                storageReclaimed,
            };
        }
    }
    async getJobStatus(jobId) {
        const job = await this.deletionQueue.getJob(jobId);
        if (!job) {
            throw new common_1.NotFoundException(`Job ${jobId} not found`);
        }
        const state = await job.getState();
        return {
            jobId: job.id,
            state,
            progress: job.progress || 0,
            attempts: job.attemptsMade,
            createdAt: job.timestamp ? new Date(job.timestamp) : undefined,
            processedAt: job.processedOn ? new Date(job.processedOn) : undefined,
            completedAt: job.finishedOn ? new Date(job.finishedOn) : undefined,
            failedReason: job.failedReason,
        };
    }
    async cancelDeletion(jobId, reason) {
        const job = await this.deletionQueue.getJob(jobId);
        if (!job) {
            return { success: false, message: 'Job not found' };
        }
        const state = await job.getState();
        if (state === 'completed') {
            return { success: false, message: 'Cannot cancel completed job' };
        }
        if (state === 'failed') {
            return { success: false, message: 'Job already failed' };
        }
        await job.remove();
        this.loggerService.log(`Deletion job ${jobId} cancelled. Reason: ${reason}`, 'GdprDeletionService');
        return { success: true, message: 'Job cancelled successfully' };
    }
    async getQueueStats() {
        const [waiting, active, completed, failed, delayed] = await Promise.all([
            this.deletionQueue.getWaitingCount(),
            this.deletionQueue.getActiveCount(),
            this.deletionQueue.getCompletedCount(),
            this.deletionQueue.getFailedCount(),
            this.deletionQueue.getDelayedCount(),
        ]);
        return { waiting, active, completed, failed, delayed };
    }
    generateChecksum(data) {
        const crypto = require('crypto');
        return crypto.createHash('sha256').update(data).digest('hex');
    }
};
exports.GdprDeletionService = GdprDeletionService;
exports.GdprDeletionService = GdprDeletionService = GdprDeletionService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(4, (0, bullmq_1.InjectQueue)('gdpr-deletion')),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        encryption_service_1.EncryptionService,
        config_1.ConfigService,
        logger_service_1.LoggerService,
        bullmq_2.Queue])
], GdprDeletionService);
