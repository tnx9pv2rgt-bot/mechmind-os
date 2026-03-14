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
var GdprDeletionProcessor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GdprDeletionProcessor = void 0;
const bullmq_1 = require("@nestjs/bullmq");
const common_1 = require("@nestjs/common");
const gdpr_deletion_service_1 = require("../services/gdpr-deletion.service");
const prisma_service_1 = require("../../common/services/prisma.service");
const logger_service_1 = require("../../common/services/logger.service");
let GdprDeletionProcessor = GdprDeletionProcessor_1 = class GdprDeletionProcessor extends bullmq_1.WorkerHost {
    constructor(gdprDeletionService, prisma, loggerService) {
        super();
        this.gdprDeletionService = gdprDeletionService;
        this.prisma = prisma;
        this.loggerService = loggerService;
        this.logger = new common_1.Logger(GdprDeletionProcessor_1.name);
    }
    async process(job) {
        const startTime = Date.now();
        const { customerId, tenantId, requestId } = job.data;
        this.logger.log(`Starting deletion job ${job.id} for customer ${customerId}`);
        await job.updateProgress(10);
        try {
            this.logger.debug(`Creating deletion snapshot for ${customerId}`);
            const snapshot = await this.gdprDeletionService.createDeletionSnapshot(customerId, tenantId, requestId);
            await job.updateProgress(20);
            this.logger.debug(`Anonymizing customer ${customerId}`);
            const anonymizationResult = await this.gdprDeletionService.anonymizeCustomer(customerId, tenantId, requestId);
            if (!anonymizationResult.success) {
                throw new Error(`Anonymization failed: ${anonymizationResult.errors?.join(', ')}`);
            }
            await job.updateProgress(50);
            this.logger.debug(`Deleting call recordings for ${customerId}`);
            const recordingResult = await this.gdprDeletionService.deleteCallRecordings(customerId, tenantId);
            await job.updateProgress(80);
            await this.prisma.withTenant(tenantId, async (prisma) => {
                await prisma.dataSubjectRequest.update({
                    where: { id: requestId },
                    data: {
                        status: 'COMPLETED',
                        completedAt: new Date(),
                        slaMet: true,
                    },
                });
            });
            await job.updateProgress(100);
            const processingTimeMs = Date.now() - startTime;
            this.loggerService.log(`Deletion job ${job.id} completed for customer ${customerId} in ${processingTimeMs}ms. ` +
                `Snapshot: ${snapshot.snapshotId}, Recordings deleted: ${recordingResult.deletedCount}`, 'GdprDeletionProcessor');
            return {
                success: true,
                customerId,
                processingTimeMs,
                snapshotCreated: true,
                anonymized: true,
                recordingsDeleted: recordingResult.deletedCount,
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Deletion job ${job.id} failed: ${errorMessage}`);
            await this.prisma.withTenant(tenantId, async (prisma) => {
                await prisma.dataSubjectRequest.update({
                    where: { id: requestId },
                    data: {
                        status: 'RECEIVED',
                        notes: `Deletion failed: ${errorMessage}`,
                    },
                });
            });
            throw error;
        }
    }
};
exports.GdprDeletionProcessor = GdprDeletionProcessor;
exports.GdprDeletionProcessor = GdprDeletionProcessor = GdprDeletionProcessor_1 = __decorate([
    (0, bullmq_1.Processor)('gdpr-deletion', {
        concurrency: 3,
        limiter: {
            max: 10,
            duration: 60000,
        },
    }),
    __metadata("design:paramtypes", [gdpr_deletion_service_1.GdprDeletionService,
        prisma_service_1.PrismaService,
        logger_service_1.LoggerService])
], GdprDeletionProcessor);
