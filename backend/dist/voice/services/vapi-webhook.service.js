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
var VapiWebhookService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.VapiWebhookService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/services/prisma.service");
const queue_service_1 = require("../../common/services/queue.service");
const logger_service_1 = require("../../common/services/logger.service");
const intent_handler_service_1 = require("./intent-handler.service");
const escalation_service_1 = require("./escalation.service");
const vapi_webhook_dto_1 = require("../dto/vapi-webhook.dto");
let VapiWebhookService = VapiWebhookService_1 = class VapiWebhookService {
    constructor(prisma, queueService, loggerService, intentHandler, escalationService) {
        this.prisma = prisma;
        this.queueService = queueService;
        this.loggerService = loggerService;
        this.intentHandler = intentHandler;
        this.escalationService = escalationService;
        this.logger = new common_1.Logger(VapiWebhookService_1.name);
    }
    async processWebhook(payload) {
        const { event, callId, tenantId, customerPhone, intent, extractedData, transcript } = payload;
        this.loggerService.log(`Processing Vapi webhook: ${event} for call ${callId}`, 'VapiWebhookService');
        await this.storeWebhookEvent(payload);
        switch (event) {
            case vapi_webhook_dto_1.VapiEventType.CALL_COMPLETED:
                return this.handleCallCompleted(payload);
            case vapi_webhook_dto_1.VapiEventType.MESSAGE:
                return this.handleMessage(payload);
            case vapi_webhook_dto_1.VapiEventType.TRANSFER_REQUESTED:
                const transferResult = await this.handleTransfer({
                    callId,
                    customerPhone,
                    tenantId,
                    reason: 'Transfer requested by customer',
                });
                return {
                    action: transferResult.escalated ? 'transfer_completed' : 'transfer_queued',
                    escalation: transferResult,
                };
            case vapi_webhook_dto_1.VapiEventType.CALL_STARTED:
                return this.handleCallStarted(payload);
            case vapi_webhook_dto_1.VapiEventType.CALL_UPDATED:
                return this.handleCallUpdated(payload);
            default:
                this.logger.warn(`Unhandled event type: ${event}`);
                return { action: 'ignored' };
        }
    }
    async handleCallCompleted(payload) {
        const { intent, tenantId, customerPhone, extractedData, callId } = payload;
        switch (intent) {
            case vapi_webhook_dto_1.VoiceIntent.BOOKING:
                if (extractedData?.preferredDate && extractedData?.preferredTime) {
                    const bookingResult = await this.intentHandler.handleBookingIntent(tenantId, customerPhone, extractedData, callId);
                    return {
                        action: 'booking_created',
                        bookingId: bookingResult.bookingId,
                    };
                }
                break;
            case vapi_webhook_dto_1.VoiceIntent.STATUS_CHECK:
                await this.intentHandler.handleStatusCheckIntent(tenantId, customerPhone, extractedData || {});
                return { action: 'status_check_processed' };
            case vapi_webhook_dto_1.VoiceIntent.COMPLAINT:
                await this.intentHandler.handleComplaintIntent(tenantId, customerPhone, payload.transcript, extractedData || {});
                return { action: 'complaint_logged' };
            case vapi_webhook_dto_1.VoiceIntent.OTHER:
            default:
                await this.queueForReview(payload);
                return { action: 'queued_for_review' };
        }
        return { action: 'processed' };
    }
    async handleMessage(payload) {
        this.logger.debug(`Message from call ${payload.callId}: ${payload.transcript?.slice(0, 100)}...`);
        return { action: 'message_logged' };
    }
    async handleCallStarted(payload) {
        this.logger.log(`Call started: ${payload.callId} from ${payload.customerPhone}`);
        return { action: 'call_logged' };
    }
    async handleCallUpdated(payload) {
        this.logger.debug(`Call updated: ${payload.callId}`);
        return { action: 'call_updated' };
    }
    async handleTransfer(payload) {
        const { callId, tenantId, customerPhone, reason, category } = payload;
        this.logger.log(`Transfer requested for call ${callId}: ${reason}`, 'VapiWebhookService');
        const agent = await this.escalationService.findAvailableAgent(tenantId, category);
        if (!agent) {
            await this.escalationService.queueForCallback(tenantId, customerPhone, reason);
            return {
                escalated: false,
                reason: 'No agents available, queued for callback',
            };
        }
        await this.escalationService.transferToAgent(callId, agent.id, reason);
        return {
            escalated: true,
            reason,
            agentId: agent.id,
        };
    }
    async storeWebhookEvent(payload) {
        try {
            await this.prisma.voiceWebhookEvent.create({
                data: {
                    callId: payload.callId,
                    eventType: payload.event,
                    tenantId: payload.tenantId,
                    customerPhone: payload.customerPhone,
                    payload: payload,
                    processed: false,
                },
            });
        }
        catch (error) {
            this.logger.error(`Failed to store webhook event: ${error.message}`);
        }
    }
    async queueForReview(payload) {
        await this.queueService.addVoiceJob('manual-review', {
            type: 'manual-review',
            payload: {
                callId: payload.callId,
                transcript: payload.transcript,
                customerPhone: payload.customerPhone,
            },
            tenantId: payload.tenantId,
        });
        this.logger.log(`Queued call ${payload.callId} for manual review`);
    }
    async getStats(tenantId, fromDate, toDate) {
        const where = {
            tenantId,
            ...(fromDate && toDate && {
                createdAt: {
                    gte: fromDate,
                    lte: toDate,
                },
            }),
        };
        const [totalEvents, eventTypeCounts, processedCount, unprocessedCount,] = await Promise.all([
            this.prisma.voiceWebhookEvent.count({ where }),
            this.prisma.voiceWebhookEvent.groupBy({
                by: ['eventType'],
                where,
                _count: { eventType: true },
            }),
            this.prisma.voiceWebhookEvent.count({
                where: { ...where, processed: true },
            }),
            this.prisma.voiceWebhookEvent.count({
                where: { ...where, processed: false },
            }),
        ]);
        return {
            total: totalEvents,
            byEventType: eventTypeCounts.reduce((acc, curr) => ({
                ...acc,
                [curr.eventType]: curr._count.eventType,
            }), {}),
            processed: processedCount,
            unprocessed: unprocessedCount,
        };
    }
};
exports.VapiWebhookService = VapiWebhookService;
exports.VapiWebhookService = VapiWebhookService = VapiWebhookService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        queue_service_1.QueueService,
        logger_service_1.LoggerService,
        intent_handler_service_1.IntentHandlerService,
        escalation_service_1.EscalationService])
], VapiWebhookService);
