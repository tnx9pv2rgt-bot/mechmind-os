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
var SesWebhookController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SesWebhookController = void 0;
const common_1 = require("@nestjs/common");
let SesWebhookController = SesWebhookController_1 = class SesWebhookController {
    constructor() {
        this.logger = new common_1.Logger(SesWebhookController_1.name);
    }
    async handleBounce(payload, messageType) {
        this.logger.log('Received SES bounce notification');
        try {
            const message = JSON.parse(payload.Message);
            if (message.eventType === 'Bounce' && message.bounce) {
                for (const recipient of message.bounce.bouncedRecipients) {
                    this.logger.warn(`Bounce received for ${recipient.emailAddress}: ${recipient.status}`);
                    await this.updateEmailStatus(message.mail.messageId, 'bounced', {
                        reason: message.bounce.bounceType,
                        subType: message.bounce.bounceSubType,
                    });
                    if (message.bounce.bounceType === 'Permanent') {
                        await this.markEmailAsInvalid(recipient.emailAddress);
                    }
                }
            }
        }
        catch (error) {
            this.logger.error('Error processing bounce:', error.message);
        }
    }
    async handleComplaint(payload, messageType) {
        this.logger.log('Received SES complaint notification');
        try {
            const message = JSON.parse(payload.Message);
            if (message.eventType === 'Complaint' && message.complaint) {
                for (const recipient of message.complaint.complainedRecipients) {
                    this.logger.warn(`Complaint received from ${recipient.emailAddress}`);
                    await this.updateEmailStatus(message.mail.messageId, 'complained', {
                        subType: message.complaint.complaintSubType,
                    });
                    await this.unsubscribeEmail(recipient.emailAddress);
                }
            }
        }
        catch (error) {
            this.logger.error('Error processing complaint:', error.message);
        }
    }
    async handleDelivery(payload) {
        try {
            const message = JSON.parse(payload.Message);
            if (message.eventType === 'Delivery' && message.delivery) {
                this.logger.log(`Email delivered: ${message.mail.messageId}`);
                await this.updateEmailStatus(message.mail.messageId, 'delivered', {
                    deliveredAt: message.delivery.timestamp,
                });
            }
        }
        catch (error) {
            this.logger.error('Error processing delivery:', error.message);
        }
    }
    async updateEmailStatus(messageId, status, metadata) {
        this.logger.log(`Updating email ${messageId} status to ${status}`);
    }
    async markEmailAsInvalid(email) {
        this.logger.warn(`Marking email as invalid: ${email}`);
    }
    async unsubscribeEmail(email) {
        this.logger.warn(`Unsubscribing email: ${email}`);
    }
};
exports.SesWebhookController = SesWebhookController;
__decorate([
    (0, common_1.Post)('bounce'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Headers)('x-amz-sns-message-type')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], SesWebhookController.prototype, "handleBounce", null);
__decorate([
    (0, common_1.Post)('complaint'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Headers)('x-amz-sns-message-type')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], SesWebhookController.prototype, "handleComplaint", null);
__decorate([
    (0, common_1.Post)('delivery'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SesWebhookController.prototype, "handleDelivery", null);
exports.SesWebhookController = SesWebhookController = SesWebhookController_1 = __decorate([
    (0, common_1.Controller)('webhooks/ses')
], SesWebhookController);
