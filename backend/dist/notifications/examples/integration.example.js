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
exports.NotificationHealthExample = exports.DirectServiceExample = exports.BulkNotificationExample = exports.BookingEventListenerExample = exports.GdprNotificationExample = exports.InvoiceNotificationExample = exports.BookingNotificationExample = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const _notifications_1 = require("..");
let BookingNotificationExample = class BookingNotificationExample {
    constructor(notificationService) {
        this.notificationService = notificationService;
    }
    async onBookingCreated(booking) {
        await this.notificationService.notifyCustomer(booking.customerId, booking.tenantId, _notifications_1.NotificationType.BOOKING_CONFIRMATION, {
            service: booking.services.map(s => s.name).join(', '),
            date: booking.scheduledDate.toLocaleDateString('it-IT'),
            time: booking.scheduledDate.toLocaleTimeString('it-IT', {
                hour: '2-digit',
                minute: '2-digit',
            }),
            vehicle: booking.vehicle
                ? `${booking.vehicle.brand} ${booking.vehicle.model} ${booking.vehicle.plate}`
                : 'Non specificato',
            bookingCode: booking.id.slice(-8).toUpperCase(),
            notes: booking.notes,
        }, _notifications_1.NotificationChannel.AUTO);
    }
    async onBookingCancelled(booking, reason) {
        await this.notificationService.notifyCustomer(booking.customerId, booking.tenantId, _notifications_1.NotificationType.BOOKING_CANCELLED, {
            service: booking.services.map(s => s.name).join(', '),
            date: booking.scheduledDate.toLocaleDateString('it-IT'),
            bookingCode: booking.id.slice(-8).toUpperCase(),
            cancellationReason: reason,
        });
    }
    async sendReminder(booking, type) {
        await this.notificationService.notifyCustomer(booking.customerId, booking.tenantId, _notifications_1.NotificationType.BOOKING_REMINDER, {
            service: booking.services.map(s => s.name).join(', '),
            date: booking.scheduledDate.toLocaleDateString('it-IT'),
            time: booking.scheduledDate.toLocaleTimeString('it-IT', {
                hour: '2-digit',
                minute: '2-digit',
            }),
            vehicle: booking.vehicle
                ? `${booking.vehicle.brand} ${booking.vehicle.model}`
                : 'Non specificato',
            bookingCode: booking.id.slice(-8).toUpperCase(),
            reminderType: type,
        }, _notifications_1.NotificationChannel.AUTO);
    }
};
exports.BookingNotificationExample = BookingNotificationExample;
exports.BookingNotificationExample = BookingNotificationExample = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [_notifications_1.NotificationOrchestratorService])
], BookingNotificationExample);
let InvoiceNotificationExample = class InvoiceNotificationExample {
    constructor(notificationService) {
        this.notificationService = notificationService;
    }
    async onInvoiceCreated(invoice) {
        await this.notificationService.notifyCustomer(invoice.customerId, invoice.tenantId, _notifications_1.NotificationType.INVOICE_READY, {
            invoiceNumber: invoice.number,
            invoiceDate: invoice.createdAt.toLocaleDateString('it-IT'),
            amount: invoice.total.toFixed(2),
            downloadUrl: `https://mechmind.io/invoices/${invoice.id}/download`,
        }, _notifications_1.NotificationChannel.EMAIL);
    }
};
exports.InvoiceNotificationExample = InvoiceNotificationExample;
exports.InvoiceNotificationExample = InvoiceNotificationExample = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [_notifications_1.NotificationOrchestratorService])
], InvoiceNotificationExample);
let GdprNotificationExample = class GdprNotificationExample {
    constructor(emailService) {
        this.emailService = emailService;
    }
    async onExportReady(exportJob) {
        await this.emailService.sendGdprDataExport({
            customerName: exportJob.customer.name,
            customerEmail: exportJob.customer.email,
            downloadUrl: exportJob.downloadUrl,
            expiryDate: new Date(exportJob.expiresAt).toLocaleDateString('it-IT'),
            requestId: exportJob.requestId,
        });
    }
};
exports.GdprNotificationExample = GdprNotificationExample;
exports.GdprNotificationExample = GdprNotificationExample = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [_notifications_1.EmailService])
], GdprNotificationExample);
let BookingEventListenerExample = class BookingEventListenerExample {
    constructor(notificationService) {
        this.notificationService = notificationService;
    }
    async handleBookingCreated(event) {
        console.log(`Booking created: ${event.bookingId}`);
    }
    async handleReminderDue(event) {
        console.log(`Sending ${event.type} reminder for booking: ${event.bookingId}`);
    }
};
exports.BookingEventListenerExample = BookingEventListenerExample;
__decorate([
    (0, event_emitter_1.OnEvent)('booking.created'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], BookingEventListenerExample.prototype, "handleBookingCreated", null);
__decorate([
    (0, event_emitter_1.OnEvent)('booking.reminder.due'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], BookingEventListenerExample.prototype, "handleReminderDue", null);
exports.BookingEventListenerExample = BookingEventListenerExample = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [_notifications_1.NotificationOrchestratorService])
], BookingEventListenerExample);
let BulkNotificationExample = class BulkNotificationExample {
    constructor(notificationService) {
        this.notificationService = notificationService;
    }
    async notifyAllCustomers(tenantId, customerIds, message) {
        const notifications = customerIds.map(customerId => ({
            customerId,
            tenantId,
            type: _notifications_1.NotificationType.CUSTOM,
            data: { message },
            channel: _notifications_1.NotificationChannel.AUTO,
        }));
        return this.notificationService.sendBulkNotifications(notifications, {
            throttleMs: 100,
            continueOnError: true,
        });
    }
    async scheduleReminders(bookings) {
        for (const booking of bookings) {
            await this.notificationService.queueNotification({
                customerId: booking.customerId,
                tenantId: booking.tenantId,
                type: _notifications_1.NotificationType.BOOKING_REMINDER,
                data: {},
                channel: _notifications_1.NotificationChannel.AUTO,
            }, this.calculateDelay(booking.scheduledDate, 24));
        }
    }
    calculateDelay(targetDate, hoursBefore) {
        const reminderTime = new Date(targetDate.getTime() - hoursBefore * 60 * 60 * 1000);
        return Math.max(0, reminderTime.getTime() - Date.now());
    }
};
exports.BulkNotificationExample = BulkNotificationExample;
exports.BulkNotificationExample = BulkNotificationExample = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [_notifications_1.NotificationOrchestratorService])
], BulkNotificationExample);
let DirectServiceExample = class DirectServiceExample {
    constructor(emailService, smsService) {
        this.emailService = emailService;
        this.smsService = smsService;
    }
    async sendCustomEmail() {
        await this.emailService.sendRawEmail({
            to: 'cliente@example.com',
            subject: 'Offerta Speciale',
            html: '<h1>La tua offerta personalizzata</h1>...',
            tags: [{ name: 'campaign', value: 'summer_sale' }],
        });
    }
    async sendCustomSms() {
        await this.smsService.sendCustom('+393331234567', 'Ciao! Officina Rossi: il tuo veicolo è pronto per il ritiro.', 'custom_pickup_ready');
    }
    async calculateSmsCost() {
        const message = 'Ciao! La tua prenotazione per Tagliando è confermata. 📅 15/03/2024 alle 14:30 📍 Officina Rossi 🔢 Codice: BK-001';
        const cost = this.smsService.calculateCost(message);
        console.log(`Segments: ${cost.segments}`);
        console.log(`Estimated cost: €${(cost.estimatedCost * 0.92).toFixed(4)}`);
    }
};
exports.DirectServiceExample = DirectServiceExample;
exports.DirectServiceExample = DirectServiceExample = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [_notifications_1.EmailService,
        _notifications_1.SmsService])
], DirectServiceExample);
let NotificationHealthExample = class NotificationHealthExample {
    constructor(smsService) {
        this.smsService = smsService;
    }
    async checkServicesHealth() {
        const [smsHealth, templates] = await Promise.all([
            this.smsService.healthCheck(),
            Promise.resolve(this.smsService.getTemplates()),
        ]);
        return {
            sms: smsHealth,
            templates: templates.length,
            timestamp: new Date().toISOString(),
        };
    }
};
exports.NotificationHealthExample = NotificationHealthExample;
exports.NotificationHealthExample = NotificationHealthExample = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [_notifications_1.SmsService])
], NotificationHealthExample);
