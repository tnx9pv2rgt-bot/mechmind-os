"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VoiceWebhookController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const vapi_webhook_service_1 = require("../services/vapi-webhook.service");
const config_1 = require("@nestjs/config");
const crypto = __importStar(require("crypto"));
const vapi_webhook_dto_1 = require("../dto/vapi-webhook.dto");
let VoiceWebhookController = class VoiceWebhookController {
    constructor(vapiWebhookService, configService) {
        this.vapiWebhookService = vapiWebhookService;
        this.configService = configService;
    }
    async handleCallEvent(payload, signature, timestamp) {
        if (!this.verifySignature(payload, signature, timestamp)) {
            throw new common_1.UnauthorizedException('Invalid webhook signature');
        }
        if (!this.validateTimestamp(timestamp)) {
            throw new common_1.UnauthorizedException('Webhook timestamp too old');
        }
        try {
            const result = await this.vapiWebhookService.processWebhook(payload);
            return {
                success: true,
                message: 'Webhook processed successfully',
                ...result,
            };
        }
        catch (error) {
            throw new common_1.BadRequestException(`Failed to process webhook: ${error.message}`);
        }
    }
    async handleTransfer(payload, signature) {
        if (!this.verifySignature(payload, signature)) {
            throw new common_1.UnauthorizedException('Invalid webhook signature');
        }
        const result = await this.vapiWebhookService.handleTransfer(payload);
        return {
            success: true,
            message: 'Transfer handled successfully',
            escalation: result,
        };
    }
    async healthCheck() {
        return { status: 'ok' };
    }
    verifySignature(payload, signature, timestamp) {
        const secret = this.configService.get('VAPI_WEBHOOK_SECRET');
        if (!secret) {
            console.error('VAPI_WEBHOOK_SECRET not configured - rejecting all webhooks');
            return false;
        }
        if (!signature) {
            return false;
        }
        const signedPayload = timestamp
            ? `${timestamp}.${JSON.stringify(payload)}`
            : JSON.stringify(payload);
        const expectedSignature = crypto
            .createHmac('sha256', secret)
            .update(signedPayload)
            .digest('hex');
        try {
            return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
        }
        catch {
            return false;
        }
    }
    validateTimestamp(timestamp) {
        if (!timestamp) {
            return true;
        }
        const timestampMs = parseInt(timestamp, 10);
        if (isNaN(timestampMs)) {
            return false;
        }
        const now = Date.now();
        const fiveMinutes = 5 * 60 * 1000;
        return Math.abs(now - timestampMs) < fiveMinutes;
    }
};
exports.VoiceWebhookController = VoiceWebhookController;
__decorate([
    (0, common_1.Post)('call-event'),
    (0, swagger_1.ApiOperation)({
        summary: 'Handle Vapi call events',
        description: 'Receives call events from Vapi AI voice assistant',
    }),
    (0, swagger_1.ApiHeader)({
        name: 'X-Vapi-Signature',
        description: 'HMAC-SHA256 signature for webhook verification',
        required: true,
    }),
    (0, swagger_1.ApiBody)({ type: vapi_webhook_dto_1.VapiWebhookDto }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Webhook processed successfully',
        type: vapi_webhook_dto_1.VoiceWebhookResponseDto,
    }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Invalid signature' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Invalid payload' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Headers)('X-Vapi-Signature')),
    __param(2, (0, common_1.Headers)('X-Vapi-Timestamp')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [vapi_webhook_dto_1.VapiWebhookDto, String, String]),
    __metadata("design:returntype", Promise)
], VoiceWebhookController.prototype, "handleCallEvent", null);
__decorate([
    (0, common_1.Post)('transfer'),
    (0, swagger_1.ApiOperation)({
        summary: 'Handle transfer requests',
        description: 'Receives transfer requests when customer wants to speak to human',
    }),
    (0, swagger_1.ApiHeader)({
        name: 'X-Vapi-Signature',
        description: 'HMAC-SHA256 signature for webhook verification',
        required: true,
    }),
    (0, swagger_1.ApiBody)({ type: vapi_webhook_dto_1.TransferRequestDto }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Headers)('X-Vapi-Signature')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [vapi_webhook_dto_1.TransferRequestDto, String]),
    __metadata("design:returntype", Promise)
], VoiceWebhookController.prototype, "handleTransfer", null);
__decorate([
    (0, common_1.Post)('health'),
    (0, swagger_1.ApiOperation)({
        summary: 'Health check endpoint',
        description: 'Simple endpoint for Vapi to verify webhook URL is accessible',
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], VoiceWebhookController.prototype, "healthCheck", null);
exports.VoiceWebhookController = VoiceWebhookController = __decorate([
    (0, swagger_1.ApiTags)('Voice Webhooks'),
    (0, common_1.Controller)('webhooks/vapi'),
    __metadata("design:paramtypes", [vapi_webhook_service_1.VapiWebhookService,
        config_1.ConfigService])
], VoiceWebhookController);
