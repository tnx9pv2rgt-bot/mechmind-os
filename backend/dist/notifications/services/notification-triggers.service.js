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
var NotificationTriggersService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationTriggersService = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const notification_v2_service_1 = require("./notification-v2.service");
const client_1 = require("@prisma/client");
let NotificationTriggersService = NotificationTriggersService_1 = class NotificationTriggersService {
    constructor(notificationService) {
        this.notificationService = notificationService;
        this.logger = new common_1.Logger(NotificationTriggersService_1.name);
    }
    async onBookingCreated(event) {
        this.logger.log(`Booking created: ${event.bookingId}`);
        try {
            await this.notificationService.sendImmediate({
                customerId: event.customerId,
                tenantId: event.tenantId,
                type: client_1.NotificationType.BOOKING_CONFIRMATION,
                channel: client_1.NotificationChannel.SMS,
                metadata: {
                    bookingId: event.bookingId,
                    date: event.scheduledDate.toLocaleDateString('it-IT'),
                    time: event.scheduledDate.toLocaleTimeString('it-IT', {
                        hour: '2-digit',
                        minute: '2-digit',
                    }),
                    bookingCode: event.bookingId.slice(-6).toUpperCase(),
                },
            });
        }
        catch (error) {
            this.logger.error(`Failed to send booking confirmation: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async onBookingUpdated(event) {
        this.logger.log(`Booking updated: ${event.bookingId}`);
        if (event.changes.status) {
            try {
                await this.notificationService.sendImmediate({
                    customerId: event.customerId,
                    tenantId: event.tenantId,
                    type: client_1.NotificationType.STATUS_UPDATE,
                    channel: client_1.NotificationChannel.SMS,
                    metadata: {
                        bookingId: event.bookingId,
                        status: this.getStatusLabel(String(event.changes.status)),
                    },
                });
            }
            catch (error) {
                this.logger.error(`Failed to send status update: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        }
    }
    async onBookingCancelled(event) {
        this.logger.log(`Booking cancelled: ${event.bookingId}`);
        try {
            await this.notificationService.sendImmediate({
                customerId: event.customerId,
                tenantId: event.tenantId,
                type: client_1.NotificationType.STATUS_UPDATE,
                channel: client_1.NotificationChannel.SMS,
                metadata: {
                    bookingId: event.bookingId,
                    status: 'Prenotazione annullata',
                },
            });
        }
        catch (error) {
            this.logger.error(`Failed to send cancellation notification: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async onInspectionCompleted(event) {
        this.logger.log(`Inspection completed: ${event.inspectionId}`);
        try {
            await this.notificationService.sendImmediate({
                customerId: event.customerId,
                tenantId: event.tenantId,
                type: client_1.NotificationType.INSPECTION_COMPLETE,
                channel: client_1.NotificationChannel.SMS,
                metadata: {
                    inspectionId: event.inspectionId,
                    score: event.score,
                    link: `https://app.mechmind.io/inspections/${event.inspectionId}`,
                },
            });
        }
        catch (error) {
            this.logger.error(`Failed to send inspection complete notification: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async onInspectionReadyForReview(event) {
        this.logger.log(`Inspection ready for review: ${event.inspectionId}`);
        try {
            await this.notificationService.sendImmediate({
                customerId: event.customerId,
                tenantId: event.tenantId,
                type: client_1.NotificationType.STATUS_UPDATE,
                channel: client_1.NotificationChannel.SMS,
                metadata: {
                    inspectionId: event.inspectionId,
                    status: 'Ispezione completata, in attesa di approvazione',
                    link: `https://app.mechmind.io/inspections/${event.inspectionId}`,
                },
            });
        }
        catch (error) {
            this.logger.error(`Failed to send inspection review notification: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async onInvoiceGenerated(event) {
        this.logger.log(`Invoice generated: ${event.invoiceId}`);
        try {
            await this.notificationService.sendImmediate({
                customerId: event.customerId,
                tenantId: event.tenantId,
                type: client_1.NotificationType.INVOICE_READY,
                channel: client_1.NotificationChannel.SMS,
                metadata: {
                    invoiceId: event.invoiceId,
                    invoiceNumber: event.invoiceNumber,
                    amount: `€${event.amount.toFixed(2)}`,
                    link: `https://app.mechmind.io/invoices/${event.invoiceId}`,
                },
            });
        }
        catch (error) {
            this.logger.error(`Failed to send invoice notification: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async onPaymentDue(event) {
        this.logger.log(`Payment due for invoice: ${event.invoiceId}`);
        try {
            await this.notificationService.sendImmediate({
                customerId: event.customerId,
                tenantId: event.tenantId,
                type: client_1.NotificationType.PAYMENT_REMINDER,
                channel: client_1.NotificationChannel.SMS,
                metadata: {
                    invoiceId: event.invoiceId,
                    amount: `€${event.amount.toFixed(2)}`,
                    dueDate: event.dueDate.toLocaleDateString('it-IT'),
                    link: `https://app.mechmind.io/invoices/${event.invoiceId}/pay`,
                },
            });
        }
        catch (error) {
            this.logger.error(`Failed to send payment reminder: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async onMaintenanceDue(event) {
        this.logger.log(`Maintenance due for vehicle: ${event.vehicleId}`);
        try {
            await this.notificationService.sendImmediate({
                customerId: event.customerId,
                tenantId: event.tenantId,
                type: client_1.NotificationType.MAINTENANCE_DUE,
                channel: client_1.NotificationChannel.SMS,
                metadata: {
                    vehicleId: event.vehicleId,
                    service: event.serviceType,
                    days: event.daysUntilDue,
                    link: 'https://app.mechmind.io/portal',
                },
            });
        }
        catch (error) {
            this.logger.error(`Failed to send maintenance reminder: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async queueBookingReminders() {
        this.logger.log('Queueing booking reminders...');
        return 0;
    }
    async queueMaintenanceReminders() {
        this.logger.log('Queueing maintenance reminders...');
        return 0;
    }
    getStatusLabel(status) {
        const labels = {
            PENDING: 'In attesa',
            CONFIRMED: 'Confermato',
            IN_PROGRESS: 'In corso',
            COMPLETED: 'Completato',
            CANCELLED: 'Annullato',
            NO_SHOW: 'No show',
        };
        return labels[status] || status;
    }
};
exports.NotificationTriggersService = NotificationTriggersService;
__decorate([
    (0, event_emitter_1.OnEvent)('booking.created'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NotificationTriggersService.prototype, "onBookingCreated", null);
__decorate([
    (0, event_emitter_1.OnEvent)('booking.updated'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NotificationTriggersService.prototype, "onBookingUpdated", null);
__decorate([
    (0, event_emitter_1.OnEvent)('booking.cancelled'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NotificationTriggersService.prototype, "onBookingCancelled", null);
__decorate([
    (0, event_emitter_1.OnEvent)('inspection.completed'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NotificationTriggersService.prototype, "onInspectionCompleted", null);
__decorate([
    (0, event_emitter_1.OnEvent)('inspection.readyForReview'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NotificationTriggersService.prototype, "onInspectionReadyForReview", null);
__decorate([
    (0, event_emitter_1.OnEvent)('invoice.generated'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NotificationTriggersService.prototype, "onInvoiceGenerated", null);
__decorate([
    (0, event_emitter_1.OnEvent)('invoice.paymentDue'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NotificationTriggersService.prototype, "onPaymentDue", null);
__decorate([
    (0, event_emitter_1.OnEvent)('maintenance.due'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NotificationTriggersService.prototype, "onMaintenanceDue", null);
exports.NotificationTriggersService = NotificationTriggersService = NotificationTriggersService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [notification_v2_service_1.NotificationV2Service])
], NotificationTriggersService);
