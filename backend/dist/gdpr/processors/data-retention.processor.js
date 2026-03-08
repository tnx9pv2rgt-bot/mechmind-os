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
var DataRetentionProcessor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataRetentionProcessor = void 0;
const bullmq_1 = require("@nestjs/bullmq");
const common_1 = require("@nestjs/common");
const data_retention_service_1 = require("../services/data-retention.service");
const logger_service_1 = require("../../common/services/logger.service");
let DataRetentionProcessor = DataRetentionProcessor_1 = class DataRetentionProcessor extends bullmq_1.WorkerHost {
    constructor(dataRetentionService, loggerService) {
        super();
        this.dataRetentionService = dataRetentionService;
        this.loggerService = loggerService;
        this.logger = new common_1.Logger(DataRetentionProcessor_1.name);
    }
    async process(job) {
        const startTime = Date.now();
        const { tenantId } = job.data;
        this.logger.log(`Starting retention enforcement job ${job.id}` +
            (tenantId ? ` for tenant ${tenantId}` : ' for all tenants'));
        await job.updateProgress(10);
        try {
            const result = await this.dataRetentionService.enforceRetentionPolicy(tenantId);
            await job.updateProgress(100);
            const processingTimeMs = Date.now() - startTime;
            if (result.success) {
                this.loggerService.log(`Retention job ${job.id} completed successfully. ` +
                    `Anonymized: ${result.customersAnonymized}, ` +
                    `Recordings deleted: ${result.recordingsDeleted}`, 'DataRetentionProcessor');
            }
            else {
                this.logger.warn(`Retention job ${job.id} completed with errors: ${result.errors.join('; ')}`);
            }
            return {
                success: result.success,
                executionId: result.executionId,
                customersAnonymized: result.customersAnonymized,
                recordingsDeleted: result.recordingsDeleted,
                processingTimeMs,
            };
        }
        catch (error) {
            this.logger.error(`Retention job ${job.id} failed: ${error.message}`);
            throw error;
        }
    }
};
exports.DataRetentionProcessor = DataRetentionProcessor;
exports.DataRetentionProcessor = DataRetentionProcessor = DataRetentionProcessor_1 = __decorate([
    (0, bullmq_1.Processor)('gdpr-retention', {
        concurrency: 1,
    }),
    __metadata("design:paramtypes", [data_retention_service_1.DataRetentionService,
        logger_service_1.LoggerService])
], DataRetentionProcessor);
