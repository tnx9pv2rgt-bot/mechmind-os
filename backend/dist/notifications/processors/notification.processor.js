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
var NotificationProcessor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationProcessor = void 0;
const bullmq_1 = require("@nestjs/bullmq");
const common_1 = require("@nestjs/common");
const bullmq_2 = require("bullmq");
const notification_service_1 = require("../services/notification.service");
const send_notification_dto_1 = require("../dto/send-notification.dto");
let NotificationProcessor = NotificationProcessor_1 = class NotificationProcessor extends bullmq_1.WorkerHost {
    constructor(notificationService) {
        super();
        this.notificationService = notificationService;
        this.logger = new common_1.Logger(NotificationProcessor_1.name);
    }
    async process(job) {
        this.logger.log(`Processing notification job ${job.id} (${job.name})`);
        const { type, customerId, tenantId, data, channel } = job.data;
        try {
            const result = await this.notificationService.notifyCustomer(customerId, tenantId, type, data, channel || send_notification_dto_1.NotificationChannel.AUTO);
            if (!result.success) {
                throw new Error(result.error || 'Notification failed');
            }
            this.logger.log(`Notification job ${job.id} completed successfully via ${result.channel}`);
            return {
                success: true,
                channel: result.channel,
                messageId: result.messageId,
                fallbackUsed: result.fallbackUsed,
            };
        }
        catch (error) {
            this.logger.error(`Notification job ${job.id} failed: ${error instanceof Error ? error.message : 'Unknown error'}`, error instanceof Error ? error.stack : undefined);
            throw error;
        }
    }
    onCompleted(job) {
        this.logger.log(`✅ Notification job ${job.id} completed`);
    }
    onFailed(job, error) {
        this.logger.error(`❌ Notification job ${job.id} failed: ${error.message}`);
    }
    onStalled(jobId) {
        this.logger.warn(`⚠️ Notification job ${jobId} stalled`);
    }
};
exports.NotificationProcessor = NotificationProcessor;
__decorate([
    (0, bullmq_1.OnWorkerEvent)('completed'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [bullmq_2.Job]),
    __metadata("design:returntype", void 0)
], NotificationProcessor.prototype, "onCompleted", null);
__decorate([
    (0, bullmq_1.OnWorkerEvent)('failed'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [bullmq_2.Job, Error]),
    __metadata("design:returntype", void 0)
], NotificationProcessor.prototype, "onFailed", null);
__decorate([
    (0, bullmq_1.OnWorkerEvent)('stalled'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], NotificationProcessor.prototype, "onStalled", null);
exports.NotificationProcessor = NotificationProcessor = NotificationProcessor_1 = __decorate([
    (0, bullmq_1.Processor)('notification-queue'),
    __metadata("design:paramtypes", [notification_service_1.NotificationOrchestratorService])
], NotificationProcessor);
