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
var NotificationsApiController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationsApiController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const notification_service_1 = require("../services/notification.service");
const email_service_1 = require("../email/email.service");
const sms_service_1 = require("../sms/sms.service");
const send_notification_dto_1 = require("../dto/send-notification.dto");
let NotificationsApiController = NotificationsApiController_1 = class NotificationsApiController {
    constructor(notificationService, emailService, smsService) {
        this.notificationService = notificationService;
        this.emailService = emailService;
        this.smsService = smsService;
        this.logger = new common_1.Logger(NotificationsApiController_1.name);
    }
    async sendNotification(dto) {
        const result = await this.notificationService.notifyCustomer(dto.customerId, dto.tenantId, dto.type, dto.data, dto.channel);
        return {
            success: result.success,
            channel: result.channel,
            messageId: result.messageId,
            fallbackUsed: result.fallbackUsed,
            ...(result.error && { error: result.error }),
        };
    }
    async sendBookingConfirmation(dto) {
        const result = await this.notificationService.notifyCustomer(dto.customerId, dto.tenantId, send_notification_dto_1.NotificationType.BOOKING_CONFIRMATION, {
            service: dto.service,
            date: dto.date,
            time: dto.time,
            vehicle: dto.vehicle,
            bookingCode: dto.bookingCode,
            notes: dto.notes,
        }, dto.channel || send_notification_dto_1.NotificationChannel.AUTO);
        return {
            success: result.success,
            channel: result.channel,
            messageId: result.messageId,
            fallbackUsed: result.fallbackUsed,
        };
    }
    async sendBookingReminder(dto) {
        const result = await this.notificationService.notifyCustomer(dto.customerId, dto.tenantId, send_notification_dto_1.NotificationType.BOOKING_REMINDER, {
            service: dto.service,
            date: dto.date,
            time: dto.time,
            vehicle: dto.vehicle,
            bookingCode: dto.bookingCode,
            reminderType: dto.reminderType,
        }, dto.channel || send_notification_dto_1.NotificationChannel.AUTO);
        return {
            success: result.success,
            channel: result.channel,
            messageId: result.messageId,
            fallbackUsed: result.fallbackUsed,
        };
    }
    async sendInvoiceReady(dto) {
        const result = await this.notificationService.notifyCustomer(dto.customerId, dto.tenantId, send_notification_dto_1.NotificationType.INVOICE_READY, {
            invoiceNumber: dto.invoiceNumber,
            invoiceDate: dto.invoiceDate,
            amount: dto.amount,
            downloadUrl: dto.downloadUrl,
        }, dto.channel || send_notification_dto_1.NotificationChannel.AUTO);
        return {
            success: result.success,
            channel: result.channel,
            messageId: result.messageId,
            fallbackUsed: result.fallbackUsed,
        };
    }
    async sendGdprExportReady(dto) {
        const result = await this.notificationService.notifyCustomer(dto.customerId, 'system', send_notification_dto_1.NotificationType.GDPR_EXPORT_READY, {
            downloadUrl: dto.downloadUrl,
            expiryDate: dto.expiryDate,
            requestId: dto.requestId,
        }, send_notification_dto_1.NotificationChannel.EMAIL);
        return {
            success: result.success,
            channel: result.channel,
            messageId: result.messageId,
        };
    }
    async sendBulkNotifications(dto) {
        const results = await this.notificationService.sendBulkNotifications(dto.notifications, dto.options);
        return results;
    }
    async queueNotification(dto) {
        const delayMs = dto.delayMinutes ? dto.delayMinutes * 60 * 1000 : undefined;
        const result = await this.notificationService.queueNotification(dto, delayMs);
        return {
            queued: true,
            jobId: result.jobId,
            scheduledFor: result.scheduledFor,
        };
    }
    async sendTestNotification(dto) {
        let result;
        if (dto.channel === send_notification_dto_1.NotificationChannel.EMAIL || dto.channel === send_notification_dto_1.NotificationChannel.BOTH) {
            result = await this.emailService.sendRawEmail({
                to: dto.recipient,
                subject: 'Test Email da MechMind',
                html: `
          <h1>Test Email</h1>
          <p>Questa è un'email di test dal sistema MechMind.</p>
          <p>Tipo: ${dto.type}</p>
          <p>Data: ${new Date().toISOString()}</p>
        `,
            });
        }
        if (dto.channel === send_notification_dto_1.NotificationChannel.SMS || dto.channel === send_notification_dto_1.NotificationChannel.BOTH) {
            result = await this.smsService.sendCustom(dto.recipient, `Test SMS da MechMind - Tipo: ${dto.type} - Data: ${new Date().toLocaleString('it-IT')}`, 'test');
        }
        return {
            success: result?.success ?? false,
            channel: dto.channel,
            messageId: result?.messageId,
        };
    }
    async getNotificationStatus(notificationId) {
        return {
            id: notificationId,
            status: 'delivered',
            channel: 'email',
            sentAt: new Date().toISOString(),
            deliveredAt: new Date().toISOString(),
        };
    }
    async getSmsTemplates() {
        return this.smsService.getTemplates();
    }
    async calculateSmsCost(message) {
        if (!message) {
            throw new common_1.BadRequestException('Message is required');
        }
        return this.smsService.calculateCost(message);
    }
    async validatePhone(phone) {
        if (!phone) {
            throw new common_1.BadRequestException('Phone is required');
        }
        const result = await this.smsService.validatePhoneNumber(phone);
        return result;
    }
    async getEmailStatus(emailId) {
        const status = await this.emailService.getEmailStatus(emailId);
        if (!status) {
            throw new common_1.NotFoundException('Email not found');
        }
        return status;
    }
    async getStats(tenantId, from, to) {
        return {
            total: 0,
            byChannel: {
                sms: 0,
                email: 0,
            },
            byStatus: {
                sent: 0,
                delivered: 0,
                failed: 0,
            },
            byType: {},
            period: {
                from: from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
                to: to || new Date().toISOString(),
            },
        };
    }
    async healthCheck() {
        const [smsHealth, emailHealth] = await Promise.all([
            this.smsService.healthCheck(),
            Promise.resolve({ healthy: true }),
        ]);
        return {
            sms: smsHealth,
            email: emailHealth,
            overall: smsHealth.healthy && emailHealth.healthy,
        };
    }
    async getCustomerPreferences(customerId, tenantId) {
        return this.notificationService.getCustomerPreferences(customerId, tenantId);
    }
    async updateCustomerPreferences(customerId, tenantId, preferences) {
        await this.notificationService.updateCustomerPreferences(customerId, tenantId, preferences);
        return { updated: true };
    }
};
exports.NotificationsApiController = NotificationsApiController;
__decorate([
    (0, common_1.Post)('send'),
    (0, swagger_1.ApiOperation)({ summary: 'Send a notification to a customer' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Notification sent successfully' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Invalid request data' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [send_notification_dto_1.SendNotificationDto]),
    __metadata("design:returntype", Promise)
], NotificationsApiController.prototype, "sendNotification", null);
__decorate([
    (0, common_1.Post)('booking/confirmation'),
    (0, swagger_1.ApiOperation)({ summary: 'Send booking confirmation notification' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Confirmation sent' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [send_notification_dto_1.SendBookingConfirmationDto]),
    __metadata("design:returntype", Promise)
], NotificationsApiController.prototype, "sendBookingConfirmation", null);
__decorate([
    (0, common_1.Post)('booking/reminder'),
    (0, swagger_1.ApiOperation)({ summary: 'Send booking reminder notification' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Reminder sent' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [send_notification_dto_1.SendBookingReminderDto]),
    __metadata("design:returntype", Promise)
], NotificationsApiController.prototype, "sendBookingReminder", null);
__decorate([
    (0, common_1.Post)('invoice/ready'),
    (0, swagger_1.ApiOperation)({ summary: 'Send invoice ready notification' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Invoice notification sent' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [send_notification_dto_1.SendInvoiceReadyDto]),
    __metadata("design:returntype", Promise)
], NotificationsApiController.prototype, "sendInvoiceReady", null);
__decorate([
    (0, common_1.Post)('gdpr/export-ready'),
    (0, swagger_1.ApiOperation)({ summary: 'Send GDPR data export ready notification' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Export notification sent' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [send_notification_dto_1.SendGdprExportDto]),
    __metadata("design:returntype", Promise)
], NotificationsApiController.prototype, "sendGdprExportReady", null);
__decorate([
    (0, common_1.Post)('bulk'),
    (0, swagger_1.ApiOperation)({ summary: 'Send notifications to multiple customers' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Bulk notifications processed' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [send_notification_dto_1.BulkNotificationDto]),
    __metadata("design:returntype", Promise)
], NotificationsApiController.prototype, "sendBulkNotifications", null);
__decorate([
    (0, common_1.Post)('queue'),
    (0, swagger_1.ApiOperation)({ summary: 'Queue notification for scheduled delivery' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Notification queued' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NotificationsApiController.prototype, "queueNotification", null);
__decorate([
    (0, common_1.Post)('test'),
    (0, swagger_1.ApiOperation)({ summary: 'Send test notification' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Test notification sent' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [send_notification_dto_1.TestNotificationDto]),
    __metadata("design:returntype", Promise)
], NotificationsApiController.prototype, "sendTestNotification", null);
__decorate([
    (0, common_1.Get)('status/:notificationId'),
    (0, swagger_1.ApiOperation)({ summary: 'Get notification delivery status' }),
    (0, swagger_1.ApiParam)({ name: 'notificationId', description: 'Notification ID' }),
    __param(0, (0, common_1.Param)('notificationId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], NotificationsApiController.prototype, "getNotificationStatus", null);
__decorate([
    (0, common_1.Get)('sms/templates'),
    (0, swagger_1.ApiOperation)({ summary: 'Get available SMS templates' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Templates retrieved' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], NotificationsApiController.prototype, "getSmsTemplates", null);
__decorate([
    (0, common_1.Post)('sms/calculate-cost'),
    (0, swagger_1.ApiOperation)({ summary: 'Calculate SMS cost estimate' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Cost calculated' }),
    __param(0, (0, common_1.Body)('message')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], NotificationsApiController.prototype, "calculateSmsCost", null);
__decorate([
    (0, common_1.Post)('sms/validate-phone'),
    (0, swagger_1.ApiOperation)({ summary: 'Validate phone number format' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Phone validated' }),
    __param(0, (0, common_1.Body)('phone')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], NotificationsApiController.prototype, "validatePhone", null);
__decorate([
    (0, common_1.Get)('email/status/:emailId'),
    (0, swagger_1.ApiOperation)({ summary: 'Get email delivery status from Resend' }),
    (0, swagger_1.ApiParam)({ name: 'emailId', description: 'Resend Email ID' }),
    __param(0, (0, common_1.Param)('emailId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], NotificationsApiController.prototype, "getEmailStatus", null);
__decorate([
    (0, common_1.Get)('stats'),
    (0, swagger_1.ApiOperation)({ summary: 'Get notification statistics' }),
    (0, swagger_1.ApiQuery)({ name: 'tenantId', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'from', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'to', required: false }),
    __param(0, (0, common_1.Query)('tenantId')),
    __param(1, (0, common_1.Query)('from')),
    __param(2, (0, common_1.Query)('to')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], NotificationsApiController.prototype, "getStats", null);
__decorate([
    (0, common_1.Get)('health'),
    (0, swagger_1.ApiOperation)({ summary: 'Check notification services health' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], NotificationsApiController.prototype, "healthCheck", null);
__decorate([
    (0, common_1.Get)('preferences/:customerId'),
    (0, swagger_1.ApiOperation)({ summary: 'Get customer notification preferences' }),
    (0, swagger_1.ApiParam)({ name: 'customerId', description: 'Customer ID' }),
    __param(0, (0, common_1.Param)('customerId')),
    __param(1, (0, common_1.Query)('tenantId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], NotificationsApiController.prototype, "getCustomerPreferences", null);
__decorate([
    (0, common_1.Post)('preferences/:customerId'),
    (0, swagger_1.ApiOperation)({ summary: 'Update customer notification preferences' }),
    (0, swagger_1.ApiParam)({ name: 'customerId', description: 'Customer ID' }),
    __param(0, (0, common_1.Param)('customerId')),
    __param(1, (0, common_1.Query)('tenantId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], NotificationsApiController.prototype, "updateCustomerPreferences", null);
exports.NotificationsApiController = NotificationsApiController = NotificationsApiController_1 = __decorate([
    (0, swagger_1.ApiTags)('Notifications'),
    (0, common_1.Controller)('notifications/api'),
    __metadata("design:paramtypes", [notification_service_1.NotificationOrchestratorService,
        email_service_1.EmailService,
        sms_service_1.SmsService])
], NotificationsApiController);
