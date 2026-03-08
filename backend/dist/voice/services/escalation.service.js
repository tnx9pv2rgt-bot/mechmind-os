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
var EscalationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EscalationService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/services/prisma.service");
const queue_service_1 = require("../../common/services/queue.service");
const logger_service_1 = require("../../common/services/logger.service");
let EscalationService = EscalationService_1 = class EscalationService {
    constructor(prisma, queueService, loggerService) {
        this.prisma = prisma;
        this.queueService = queueService;
        this.loggerService = loggerService;
        this.logger = new common_1.Logger(EscalationService_1.name);
    }
    async findAvailableAgent(tenantId, category) {
        this.logger.log(`Finding available agent for tenant ${tenantId}`, 'EscalationService');
        const agent = await this.prisma.user.findFirst({
            where: {
                tenantId,
                role: 'MANAGER',
                isActive: true,
            },
            select: {
                id: true,
                name: true,
            },
        });
        if (!agent) {
            return null;
        }
        return {
            id: agent.id,
            name: agent.name,
            phone: '',
            available: true,
        };
    }
    async transferToAgent(callId, agentId, reason) {
        this.logger.log(`Transferring call ${callId} to agent ${agentId}`, 'EscalationService');
        await this.queueService.addVoiceJob('transfer-call', {
            type: 'transfer-call',
            payload: {
                callId,
                agentId,
                reason,
            },
        });
        return {
            escalated: true,
            agentId,
            reason: `Transferred to agent: ${reason}`,
        };
    }
    async queueForCallback(tenantId, customerPhone, reason) {
        this.logger.log(`Queuing ${customerPhone} for callback`, 'EscalationService');
        await this.queueService.addVoiceJob('schedule-callback', {
            type: 'schedule-callback',
            payload: {
                customerPhone,
                reason,
                priority: 'high',
            },
            tenantId,
        }, {
            priority: 5,
            delay: 300000,
        });
        await this.queueService.addNotificationJob('notify-callback-needed', {
            type: 'callback-needed',
            payload: {
                customerPhone,
                reason,
            },
            tenantId,
        });
    }
    async getEscalationStats(tenantId, fromDate, toDate) {
        return {
            totalEscalations: 0,
            averageWaitTime: 0,
            successfulTransfers: 0,
            callbackQueueLength: 0,
        };
    }
    shouldEscalate(transcript, intent, sentiment) {
        if (transcript.toLowerCase().includes('human') ||
            transcript.toLowerCase().includes('agent') ||
            transcript.toLowerCase().includes('operator')) {
            return { shouldEscalate: true, reason: 'Customer requested human agent' };
        }
        if (sentiment === 'negative') {
            return { shouldEscalate: true, reason: 'Negative sentiment detected' };
        }
        if (intent === 'complaint' && transcript.length > 200) {
            return { shouldEscalate: true, reason: 'Complex complaint requires human review' };
        }
        return { shouldEscalate: false };
    }
};
exports.EscalationService = EscalationService;
exports.EscalationService = EscalationService = EscalationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        queue_service_1.QueueService,
        logger_service_1.LoggerService])
], EscalationService);
