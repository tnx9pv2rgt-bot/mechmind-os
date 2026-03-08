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
exports.VoiceEventListener = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const logger_service_1 = require("../../common/services/logger.service");
const queue_service_1 = require("../../common/services/queue.service");
let VoiceEventListener = class VoiceEventListener {
    constructor(logger, queueService) {
        this.logger = logger;
        this.queueService = queueService;
    }
    async handleCallCompleted(event) {
        this.logger.log(`Voice call completed: ${event.callId} for tenant ${event.tenantId}`, 'VoiceEventListener');
        await this.queueService.addVoiceJob('log-call-analytics', {
            type: 'call-analytics',
            payload: {
                callId: event.callId,
                duration: event.duration,
                customerPhone: event.customerPhone,
            },
            tenantId: event.tenantId,
        });
    }
    async handleTransferCompleted(event) {
        this.logger.log(`Transfer completed: ${event.callId} to agent ${event.agentId}`, 'VoiceEventListener');
        await this.queueService.addNotificationJob('notify-agent-transfer', {
            type: 'agent-transfer',
            payload: {
                callId: event.callId,
                agentId: event.agentId,
                customerPhone: event.customerPhone,
            },
            tenantId: event.tenantId,
        });
    }
    async handleCallbackScheduled(event) {
        this.logger.log(`Callback scheduled for ${event.customerPhone} at ${event.scheduledAt}`, 'VoiceEventListener');
        await this.queueService.addVoiceJob('execute-callback', {
            type: 'execute-callback',
            payload: {
                customerPhone: event.customerPhone,
                reason: event.reason,
            },
            tenantId: event.tenantId,
        }, {
            delay: event.scheduledAt.getTime() - Date.now(),
        });
    }
};
exports.VoiceEventListener = VoiceEventListener;
__decorate([
    (0, event_emitter_1.OnEvent)('voice.call.completed'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], VoiceEventListener.prototype, "handleCallCompleted", null);
__decorate([
    (0, event_emitter_1.OnEvent)('voice.transfer.completed'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], VoiceEventListener.prototype, "handleTransferCompleted", null);
__decorate([
    (0, event_emitter_1.OnEvent)('voice.callback.scheduled'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], VoiceEventListener.prototype, "handleCallbackScheduled", null);
exports.VoiceEventListener = VoiceEventListener = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [logger_service_1.LoggerService,
        queue_service_1.QueueService])
], VoiceEventListener);
