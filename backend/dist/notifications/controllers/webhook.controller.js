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
var NotificationWebhookController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationWebhookController = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const swagger_1 = require("@nestjs/swagger");
const crypto = __importStar(require("crypto"));
let NotificationWebhookController = NotificationWebhookController_1 = class NotificationWebhookController {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(NotificationWebhookController_1.name);
    }
    async handleResendWebhook(payload, signature, timestamp) {
        if (!payload?.type || !payload?.data) {
            throw new common_1.BadRequestException('Invalid webhook payload: missing type or data');
        }
        if (!this.verifyResendSignature(payload, signature, timestamp)) {
            this.logger.warn('Invalid Resend webhook signature');
            throw new common_1.UnauthorizedException('Invalid signature');
        }
        this.logger.log(`Resend webhook received: ${payload.type} for email ${payload.data.email_id}`);
        try {
            switch (payload.type) {
                case 'email.sent':
                    await this.handleEmailSent(payload.data);
                    break;
                case 'email.delivered':
                    await this.handleEmailDelivered(payload.data);
                    break;
                case 'email.delivery_delayed':
                    await this.handleEmailDelayed(payload.data);
                    break;
                case 'email.bounced':
                    await this.handleEmailBounced(payload.data);
                    break;
                case 'email.complained':
                    await this.handleEmailComplained(payload.data);
                    break;
                case 'email.opened':
                    await this.handleEmailOpened(payload.data);
                    break;
                case 'email.clicked':
                    await this.handleEmailClicked(payload.data);
                    break;
                default:
                    this.logger.warn(`Unknown Resend event type: ${payload.type}`);
            }
            return { received: true };
        }
        catch (error) {
            this.logger.error(`Error processing Resend webhook: ${error.message}`);
            throw new common_1.BadRequestException('Failed to process webhook');
        }
    }
    async handleTwilioWebhook(payload, signature) {
        if (!payload?.MessageSid || !payload?.MessageStatus) {
            return { received: true };
        }
        this.logger.log(`Twilio webhook received: ${payload.MessageStatus} for message ${payload.MessageSid}`);
        try {
            switch (payload.MessageStatus) {
                case 'sent':
                    await this.handleSmsSent(payload);
                    break;
                case 'delivered':
                    await this.handleSmsDelivered(payload);
                    break;
                case 'failed':
                    await this.handleSmsFailed(payload);
                    break;
                case 'undelivered':
                    await this.handleSmsUndelivered(payload);
                    break;
                case 'read':
                    await this.handleSmsRead(payload);
                    break;
                default:
                    this.logger.debug(`Twilio status update: ${payload.MessageStatus} for ${payload.MessageSid}`);
            }
            return { received: true };
        }
        catch (error) {
            this.logger.error(`Error processing Twilio webhook: ${error.message}`);
            return { received: true };
        }
    }
    async handleTwilioIncoming(payload) {
        if (!payload?.From || !payload?.Body) {
            return '<?xml version="1.0" encoding="UTF-8"?><Response></Response>';
        }
        this.logger.log(`Incoming SMS from ${payload.From}: ${payload.Body}`);
        try {
            await this.processIncomingSms(payload.From, payload.Body, payload.MessageSid);
            return '<?xml version="1.0" encoding="UTF-8"?><Response></Response>';
        }
        catch (error) {
            this.logger.error(`Error processing incoming SMS: ${error.message}`);
            return '<?xml version="1.0" encoding="UTF-8"?><Response></Response>';
        }
    }
    async handleEmailSent(data) {
        this.logger.log(`Email ${data.email_id} sent to ${data.to.join(', ')}`);
    }
    async handleEmailDelivered(data) {
        this.logger.log(`Email ${data.email_id} delivered to ${data.to.join(', ')}`);
    }
    async handleEmailDelayed(data) {
        this.logger.warn(`Email ${data.email_id} delivery delayed`);
    }
    async handleEmailBounced(data) {
        this.logger.error(`Email ${data.email_id} bounced from ${data.to.join(', ')}`);
    }
    async handleEmailComplained(data) {
        this.logger.error(`Email ${data.email_id} marked as spam by ${data.to.join(', ')}`);
    }
    async handleEmailOpened(data) {
        this.logger.debug(`Email ${data.email_id} opened`);
    }
    async handleEmailClicked(data) {
        this.logger.debug(`Email ${data.email_id} clicked`);
    }
    async handleSmsSent(payload) {
        this.logger.log(`SMS ${payload.MessageSid} sent to ${payload.To}`);
    }
    async handleSmsDelivered(payload) {
        this.logger.log(`SMS ${payload.MessageSid} delivered to ${payload.To}`);
    }
    async handleSmsFailed(payload) {
        this.logger.error(`SMS ${payload.MessageSid} failed: ${payload.ErrorCode} - ${payload.ErrorMessage}`);
    }
    async handleSmsUndelivered(payload) {
        this.logger.warn(`SMS ${payload.MessageSid} undelivered: ${payload.ErrorCode}`);
    }
    async handleSmsRead(payload) {
        this.logger.debug(`SMS ${payload.MessageSid} read by ${payload.To}`);
    }
    async processIncomingSms(from, body, messageSid) {
        const normalizedBody = body.trim().toUpperCase();
        switch (normalizedBody) {
            case 'STOP':
            case 'ARRESTA':
            case 'DISISCRIVIMI':
                await this.handleOptOut(from);
                break;
            case 'START':
            case 'AVVIA':
            case 'ISCRIVIMI':
                await this.handleOptIn(from);
                break;
            case 'INFO':
            case 'AIUTO':
                await this.sendHelpMessage(from);
                break;
            default:
                this.logger.log(`Incoming SMS from ${from}: "${body}"`);
        }
    }
    async handleOptOut(phone) {
        this.logger.log(`Opt-out received from ${phone}`);
    }
    async handleOptIn(phone) {
        this.logger.log(`Opt-in received from ${phone}`);
    }
    async sendHelpMessage(phone) {
        this.logger.log(`Help requested by ${phone}`);
    }
    verifyResendSignature(payload, signature, timestamp) {
        const webhookSecret = this.configService.get('RESEND_WEBHOOK_SECRET');
        if (!webhookSecret) {
            this.logger.warn('RESEND_WEBHOOK_SECRET not configured, skipping verification');
            return true;
        }
        try {
            const signedContent = `${timestamp}.${JSON.stringify(payload)}`;
            const expectedSignature = crypto
                .createHmac('sha256', webhookSecret)
                .update(signedContent)
                .digest('hex');
            return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
        }
        catch (error) {
            this.logger.error(`Signature verification failed: ${error.message}`);
            return false;
        }
    }
    async updateNotificationStatus(notificationId, status, timestamp) {
        this.logger.debug(`Update ${notificationId} status to ${status}`);
    }
    async trackEmailEngagement(notificationId, action) {
        this.logger.debug(`Track ${action} for ${notificationId}`);
    }
};
exports.NotificationWebhookController = NotificationWebhookController;
__decorate([
    (0, common_1.Post)('resend'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Handle Resend email webhooks' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Webhook processed successfully' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Invalid webhook payload' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Headers)('resend-signature')),
    __param(2, (0, common_1.Headers)('resend-timestamp')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], NotificationWebhookController.prototype, "handleResendWebhook", null);
__decorate([
    (0, common_1.Post)('twilio'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Handle Twilio SMS webhooks' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Webhook processed successfully' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Invalid webhook payload' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Headers)('x-twilio-signature')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], NotificationWebhookController.prototype, "handleTwilioWebhook", null);
__decorate([
    (0, common_1.Post)('twilio/incoming'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Handle incoming SMS replies' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NotificationWebhookController.prototype, "handleTwilioIncoming", null);
exports.NotificationWebhookController = NotificationWebhookController = NotificationWebhookController_1 = __decorate([
    (0, swagger_1.ApiTags)('Notifications - Webhooks'),
    (0, common_1.Controller)('webhooks/notifications'),
    __metadata("design:paramtypes", [config_1.ConfigService])
], NotificationWebhookController);
