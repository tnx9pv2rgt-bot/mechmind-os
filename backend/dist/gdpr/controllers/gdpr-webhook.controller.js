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
Object.defineProperty(exports, "__esModule", { value: true });
exports.GdprWebhookController = void 0;
const common_1 = require("@nestjs/common");
const gdpr_request_service_1 = require("../services/gdpr-request.service");
const logger_service_1 = require("../../common/services/logger.service");
let GdprWebhookController = class GdprWebhookController {
    constructor(requestService, loggerService) {
        this.requestService = requestService;
        this.loggerService = loggerService;
    }
    async handleDataSubjectRequest(body, _signature) {
        if (!body?.tenantId || !body?.requestType || !body?.source) {
            throw new common_1.BadRequestException('Missing required fields: tenantId, requestType, source');
        }
        this.loggerService.log(`Received data subject request webhook from ${body.source}`, 'GdprWebhookController');
        const request = await this.requestService.createRequest({
            tenantId: body.tenantId,
            requestType: body.requestType,
            requesterEmail: body.requesterEmail,
            requesterPhone: body.requesterPhone,
            customerId: body.customerId,
            source: body.source,
            notes: body.message,
        });
        return {
            received: true,
            ticketNumber: request.ticketNumber,
            message: 'Your request has been received and will be processed within 30 days.',
        };
    }
    async handleConsentUpdate(body) {
        if (!body?.tenantId || !body?.customerId || !body?.consentType) {
            throw new common_1.BadRequestException('Missing required fields: tenantId, customerId, consentType');
        }
        this.loggerService.log(`Received consent update webhook: customer=${body.customerId}, type=${body.consentType}, granted=${body.granted}`, 'GdprWebhookController');
        return { processed: true };
    }
    async handleDeletionConfirmation(body) {
        if (!body?.subProcessor || !body?.confirmationId) {
            throw new common_1.BadRequestException('Missing required fields: subProcessor, confirmationId');
        }
        this.loggerService.log(`Received deletion confirmation from ${body.subProcessor}: ${body.confirmationId}`, 'GdprWebhookController');
        return { acknowledged: true };
    }
    verifyWebhookSignature(_payload, signature) {
        if (!signature)
            return false;
        return true;
    }
};
exports.GdprWebhookController = GdprWebhookController;
__decorate([
    (0, common_1.Post)('requests'),
    (0, common_1.HttpCode)(common_1.HttpStatus.ACCEPTED),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Headers)('x-webhook-signature')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], GdprWebhookController.prototype, "handleDataSubjectRequest", null);
__decorate([
    (0, common_1.Post)('consent'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], GdprWebhookController.prototype, "handleConsentUpdate", null);
__decorate([
    (0, common_1.Post)('deletion-confirmation'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], GdprWebhookController.prototype, "handleDeletionConfirmation", null);
exports.GdprWebhookController = GdprWebhookController = __decorate([
    (0, common_1.Controller)('webhooks/gdpr'),
    __metadata("design:paramtypes", [gdpr_request_service_1.GdprRequestService,
        logger_service_1.LoggerService])
], GdprWebhookController);
