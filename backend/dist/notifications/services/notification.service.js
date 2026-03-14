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
var NotificationOrchestratorService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationOrchestratorService = exports.NotificationFailedEvent = exports.NotificationSentEvent = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const event_emitter_1 = require("@nestjs/event-emitter");
const bullmq_1 = require("@nestjs/bullmq");
const bullmq_2 = require("bullmq");
const prisma_service_1 = require("../../common/services/prisma.service");
const encryption_service_1 = require("../../common/services/encryption.service");
const email_service_1 = require("../email/email.service");
const sms_service_1 = require("../sms/sms.service");
const send_notification_dto_1 = require("../dto/send-notification.dto");
class NotificationSentEvent {
    constructor(notificationId, customerId, tenantId, type, channel, success) {
        this.notificationId = notificationId;
        this.customerId = customerId;
        this.tenantId = tenantId;
        this.type = type;
        this.channel = channel;
        this.success = success;
    }
}
exports.NotificationSentEvent = NotificationSentEvent;
class NotificationFailedEvent {
    constructor(notificationId, customerId, tenantId, type, channel, error, fallbackAttempted) {
        this.notificationId = notificationId;
        this.customerId = customerId;
        this.tenantId = tenantId;
        this.type = type;
        this.channel = channel;
        this.error = error;
        this.fallbackAttempted = fallbackAttempted;
    }
}
exports.NotificationFailedEvent = NotificationFailedEvent;
let NotificationOrchestratorService = NotificationOrchestratorService_1 = class NotificationOrchestratorService {
    constructor(emailService, smsService, prisma, encryption, configService, eventEmitter, notificationQueue) {
        this.emailService = emailService;
        this.smsService = smsService;
        this.prisma = prisma;
        this.encryption = encryption;
        this.configService = configService;
        this.eventEmitter = eventEmitter;
        this.notificationQueue = notificationQueue;
        this.logger = new common_1.Logger(NotificationOrchestratorService_1.name);
    }
    async notifyCustomer(customerId, tenantId, type, data, channelPreference = send_notification_dto_1.NotificationChannel.AUTO) {
        const notificationId = this.generateId();
        this.logger.log(`[${notificationId}] Sending ${type} notification to customer ${customerId} (channel: ${channelPreference})`);
        const customer = await this.getCustomerInfo(customerId, tenantId);
        if (!customer) {
            throw new Error(`Customer ${customerId} not found`);
        }
        const workshop = await this.getWorkshopInfo(tenantId);
        const channel = this.determineChannel(customer, channelPreference);
        let result;
        switch (channel) {
            case send_notification_dto_1.NotificationChannel.SMS:
                result = await this.trySmsFirst(customer, workshop, type, data, notificationId);
                break;
            case send_notification_dto_1.NotificationChannel.EMAIL:
                result = await this.sendEmail(customer, workshop, type, data, notificationId);
                break;
            case send_notification_dto_1.NotificationChannel.BOTH:
                result = await this.sendBoth(customer, workshop, type, data, notificationId);
                break;
            default:
                result = await this.trySmsFirst(customer, workshop, type, data, notificationId);
        }
        await this.logNotification(notificationId, customerId, tenantId, type, result);
        if (result.success) {
            this.eventEmitter.emit('notification.sent', new NotificationSentEvent(notificationId, customerId, tenantId, type, result.channel, true));
        }
        else {
            this.eventEmitter.emit('notification.failed', new NotificationFailedEvent(notificationId, customerId, tenantId, type, result.channel, result.error || 'Unknown error', result.fallbackUsed));
        }
        return result;
    }
    async trySmsFirst(customer, workshop, type, data, notificationId) {
        if (customer.phone) {
            this.logger.log(`[${notificationId}] Attempting SMS notification`);
            const smsResult = await this.sendSmsNotification(customer, workshop, type, data);
            if (smsResult.success) {
                this.logger.log(`[${notificationId}] SMS sent successfully`);
                return { success: true, channel: send_notification_dto_1.NotificationChannel.SMS, messageId: smsResult.messageId };
            }
            this.logger.warn(`[${notificationId}] SMS failed, attempting email fallback: ${smsResult.error}`);
        }
        else {
            this.logger.log(`[${notificationId}] No phone number, using email directly`);
        }
        if (customer.email) {
            const emailResult = await this.sendEmailNotification(customer, workshop, type, data);
            if (emailResult.success) {
                this.logger.log(`[${notificationId}] Email fallback successful`);
                return {
                    success: true,
                    channel: send_notification_dto_1.NotificationChannel.EMAIL,
                    messageId: emailResult.messageId,
                    fallbackUsed: true,
                };
            }
            this.logger.error(`[${notificationId}] Email fallback also failed: ${emailResult.error}`);
            return {
                success: false,
                channel: send_notification_dto_1.NotificationChannel.EMAIL,
                error: `SMS failed, Email fallback failed: ${emailResult.error}`,
                fallbackUsed: true,
            };
        }
        return {
            success: false,
            channel: send_notification_dto_1.NotificationChannel.SMS,
            error: 'No phone or email available for customer',
        };
    }
    async sendEmail(customer, workshop, type, data, notificationId) {
        this.logger.log(`[${notificationId}] Sending email notification`);
        if (!customer.email) {
            return {
                success: false,
                channel: send_notification_dto_1.NotificationChannel.EMAIL,
                error: 'Customer has no email address',
            };
        }
        const result = await this.sendEmailNotification(customer, workshop, type, data);
        return {
            success: result.success,
            channel: send_notification_dto_1.NotificationChannel.EMAIL,
            messageId: result.messageId,
            error: result.error,
        };
    }
    async sendBoth(customer, workshop, type, data, notificationId) {
        this.logger.log(`[${notificationId}] Sending both SMS and Email notifications`);
        const results = await Promise.allSettled([
            customer.phone
                ? this.sendSmsNotification(customer, workshop, type, data)
                : Promise.resolve({ success: false, error: 'No phone' }),
            customer.email
                ? this.sendEmailNotification(customer, workshop, type, data)
                : Promise.resolve({ success: false, error: 'No email' }),
        ]);
        const smsResult = results[0].status === 'fulfilled'
            ? results[0].value
            : { success: false, error: 'SMS promise rejected' };
        const emailResult = results[1].status === 'fulfilled'
            ? results[1].value
            : { success: false, error: 'Email promise rejected' };
        const success = smsResult.success || emailResult.success;
        return {
            success,
            channel: send_notification_dto_1.NotificationChannel.BOTH,
            messageId: smsResult.success
                ? smsResult.messageId
                : emailResult?.messageId,
            error: !success ? `SMS: ${smsResult.error}, Email: ${emailResult.error}` : undefined,
        };
    }
    async sendSmsNotification(customer, workshop, type, data) {
        if (!customer.phone) {
            return { success: false, error: 'No phone number' };
        }
        const s = data;
        try {
            switch (type) {
                case send_notification_dto_1.NotificationType.BOOKING_CONFIRMATION:
                    return await this.smsService.sendBookingConfirmation(customer.phone, {
                        date: s.date,
                        time: s.time,
                        service: s.service,
                        workshopName: workshop.name,
                        bookingCode: s.bookingCode,
                    });
                case send_notification_dto_1.NotificationType.BOOKING_REMINDER:
                    return await this.smsService.sendBookingReminder(customer.phone, {
                        date: s.date,
                        time: s.time,
                        service: s.service,
                        workshopName: workshop.name,
                        bookingCode: s.bookingCode,
                    });
                case send_notification_dto_1.NotificationType.BOOKING_CANCELLED:
                    return await this.smsService.sendBookingCancelled(customer.phone, {
                        date: s.date,
                        service: s.service,
                        workshopName: workshop.name,
                        bookingCode: s.bookingCode,
                        cancellationReason: s.cancellationReason,
                    });
                case send_notification_dto_1.NotificationType.INVOICE_READY:
                    return await this.smsService.sendInvoiceReady(customer.phone, {
                        invoiceNumber: s.invoiceNumber,
                        amount: s.amount,
                        downloadUrl: s.downloadUrl,
                        workshopName: workshop.name,
                    });
                default:
                    return { success: false, error: `SMS not supported for type: ${type}` };
            }
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`SMS sending failed: ${errorMessage}`);
            return { success: false, error: errorMessage };
        }
    }
    async sendEmailNotification(customer, workshop, type, data) {
        if (!customer.email) {
            return { success: false, error: 'No email address' };
        }
        const s = data;
        try {
            switch (type) {
                case send_notification_dto_1.NotificationType.BOOKING_CONFIRMATION:
                    return await this.emailService.sendBookingConfirmation({
                        customerName: customer.name,
                        customerEmail: customer.email,
                        service: s.service,
                        date: s.date,
                        time: s.time,
                        vehicle: s.vehicle,
                        bookingCode: s.bookingCode,
                        workshopName: workshop.name,
                        workshopAddress: workshop.address,
                        workshopPhone: workshop.phone,
                        notes: s.notes,
                    });
                case send_notification_dto_1.NotificationType.BOOKING_REMINDER:
                    return await this.emailService.sendBookingReminder({
                        customerName: customer.name,
                        customerEmail: customer.email,
                        service: s.service,
                        date: s.date,
                        time: s.time,
                        vehicle: s.vehicle,
                        bookingCode: s.bookingCode,
                        workshopName: workshop.name,
                        workshopAddress: workshop.address,
                    });
                case send_notification_dto_1.NotificationType.BOOKING_CANCELLED:
                    return await this.emailService.sendBookingCancelled({
                        customerName: customer.name,
                        customerEmail: customer.email,
                        service: s.service,
                        date: s.date,
                        bookingCode: s.bookingCode,
                        workshopName: workshop.name,
                        cancellationReason: s.cancellationReason,
                    });
                case send_notification_dto_1.NotificationType.INVOICE_READY:
                    return await this.emailService.sendInvoiceReady({
                        customerName: customer.name,
                        customerEmail: customer.email,
                        invoiceNumber: s.invoiceNumber,
                        invoiceDate: s.invoiceDate,
                        amount: s.amount,
                        downloadUrl: s.downloadUrl,
                        workshopName: workshop.name,
                    });
                case send_notification_dto_1.NotificationType.GDPR_EXPORT_READY:
                    return await this.emailService.sendGdprDataExport({
                        customerName: customer.name,
                        customerEmail: customer.email,
                        downloadUrl: s.downloadUrl,
                        expiryDate: s.expiryDate,
                        requestId: s.requestId,
                    });
                case send_notification_dto_1.NotificationType.WELCOME:
                    return await this.emailService.sendWelcome({
                        customerName: customer.name,
                        customerEmail: customer.email,
                        workshopName: workshop.name,
                        loginUrl: s.loginUrl,
                    });
                case send_notification_dto_1.NotificationType.PASSWORD_RESET:
                    return await this.emailService.sendPasswordReset({
                        customerName: customer.name,
                        customerEmail: customer.email,
                        resetUrl: s.resetUrl,
                        expiryHours: Number(data.expiryHours) || 24,
                    });
                default:
                    return { success: false, error: `Email not supported for type: ${type}` };
            }
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Email sending failed: ${errorMessage}`);
            return { success: false, error: errorMessage };
        }
    }
    async queueNotification(dto, delayMs) {
        const jobId = `notif-${this.generateId()}`;
        await this.notificationQueue.add('send-notification', dto, {
            jobId,
            delay: delayMs,
            attempts: 3,
            backoff: {
                type: 'exponential',
                delay: 5000,
            },
        });
        this.logger.log(`Notification queued: ${jobId}`);
        return {
            jobId,
            scheduledFor: delayMs ? new Date(Date.now() + delayMs) : undefined,
        };
    }
    async sendBulkNotifications(notifications, options = {}) {
        const results = [];
        let successful = 0;
        let failed = 0;
        const BATCH_SIZE = 10;
        const throttleMs = options.throttleMs || 100;
        for (let i = 0; i < notifications.length; i += BATCH_SIZE) {
            const batch = notifications.slice(i, i + BATCH_SIZE);
            const batchResults = await Promise.allSettled(batch.map(notification => this.notifyCustomer(notification.customerId, notification.tenantId, notification.type, notification.data, notification.channel)));
            let shouldBreak = false;
            for (let j = 0; j < batchResults.length; j++) {
                const settled = batchResults[j];
                if (settled.status === 'fulfilled') {
                    results.push(settled.value);
                    if (settled.value.success) {
                        successful++;
                    }
                    else {
                        failed++;
                        if (!options.continueOnError) {
                            shouldBreak = true;
                            break;
                        }
                    }
                }
                else {
                    failed++;
                    results.push({
                        success: false,
                        channel: batch[j].channel,
                        error: settled.reason instanceof Error ? settled.reason.message : 'Unknown error',
                    });
                    if (!options.continueOnError) {
                        shouldBreak = true;
                        break;
                    }
                }
            }
            if (shouldBreak)
                break;
            if (throttleMs > 0 && i + BATCH_SIZE < notifications.length) {
                await this.delay(throttleMs);
            }
        }
        return {
            total: notifications.length,
            successful,
            failed,
            results,
        };
    }
    async getCustomerPreferences(_customerId, _tenantId) {
        const defaults = {
            preferredChannel: send_notification_dto_1.NotificationChannel.AUTO,
            bookingConfirmations: true,
            bookingReminders: true,
            invoiceNotifications: true,
            promotionalMessages: false,
        };
        try {
            return defaults;
        }
        catch (_error) {
            this.logger.warn(`Could not fetch preferences for customer ${_customerId}`);
            return defaults;
        }
    }
    async updateCustomerPreferences(customerId, _tenantId, _preferences) {
        this.logger.log(`Updated preferences for customer ${customerId}`);
    }
    determineChannel(customer, preference) {
        if (preference !== send_notification_dto_1.NotificationChannel.AUTO) {
            return preference;
        }
        if (customer.notificationPreferences?.preferredChannel) {
            return customer.notificationPreferences.preferredChannel;
        }
        return send_notification_dto_1.NotificationChannel.AUTO;
    }
    async getCustomerInfo(customerId, tenantId) {
        try {
            const customer = await this.prisma.withTenant(tenantId, async (prisma) => {
                return prisma.customer.findUnique({
                    where: { id: customerId },
                    select: {
                        id: true,
                        encryptedFirstName: true,
                        encryptedLastName: true,
                        encryptedEmail: true,
                        encryptedPhone: true,
                    },
                });
            });
            if (!customer)
                return null;
            const firstName = customer.encryptedFirstName
                ? await this.encryption.decrypt(customer.encryptedFirstName)
                : '';
            const lastName = customer.encryptedLastName
                ? await this.encryption.decrypt(customer.encryptedLastName)
                : '';
            const email = customer.encryptedEmail
                ? await this.encryption.decrypt(customer.encryptedEmail)
                : '';
            const phone = customer.encryptedPhone
                ? await this.encryption.decrypt(customer.encryptedPhone)
                : undefined;
            return {
                id: customer.id,
                name: `${firstName} ${lastName}`.trim() || 'Customer',
                email,
                phone,
            };
        }
        catch (error) {
            this.logger.error(`Error fetching customer: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return null;
        }
    }
    async getWorkshopInfo(tenantId) {
        return {
            id: tenantId,
            name: 'Officia Meccanica',
            address: 'Via Roma 123, Milano',
            phone: '+39 02 1234567',
        };
    }
    async logNotification(notificationId, customerId, tenantId, type, result) {
        this.logger.debug(`[${notificationId}] Logged: ${type} to ${customerId} via ${result.channel} - ${result.success ? 'success' : 'failed'}`);
    }
    generateId() {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
};
exports.NotificationOrchestratorService = NotificationOrchestratorService;
exports.NotificationOrchestratorService = NotificationOrchestratorService = NotificationOrchestratorService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(6, (0, bullmq_1.InjectQueue)('notification-queue')),
    __metadata("design:paramtypes", [email_service_1.EmailService,
        sms_service_1.SmsService,
        prisma_service_1.PrismaService,
        encryption_service_1.EncryptionService,
        config_1.ConfigService,
        event_emitter_1.EventEmitter2,
        bullmq_2.Queue])
], NotificationOrchestratorService);
