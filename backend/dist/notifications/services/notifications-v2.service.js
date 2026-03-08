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
var NotificationsV2Service_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationsV2Service = void 0;
const common_1 = require("@nestjs/common");
const redis_pubsub_service_1 = require("./redis-pubsub.service");
const sse_service_1 = require("./sse.service");
let NotificationsV2Service = NotificationsV2Service_1 = class NotificationsV2Service {
    constructor(redisPubSub, sseService) {
        this.redisPubSub = redisPubSub;
        this.sseService = sseService;
        this.logger = new common_1.Logger(NotificationsV2Service_1.name);
    }
    async sendNotification(payload) {
        this.logger.log(`Sending notification [${payload.type}] to tenant ${payload.tenantId}${payload.userId ? ` (user: ${payload.userId})` : ''}`);
        const notificationData = {
            type: payload.type,
            tenantId: payload.tenantId,
            userId: payload.userId,
            title: payload.title,
            message: payload.message,
            data: payload.data,
            timestamp: new Date().toISOString(),
        };
        await this.redisPubSub.publishToTenant(payload.tenantId, notificationData);
        await this.sseService.broadcastToTenant(payload.tenantId, notificationData);
    }
    async sendToUser(tenantId, userId, type, title, message, data) {
        await this.sendNotification({
            tenantId,
            userId,
            type,
            title,
            message,
            data,
        });
    }
    async broadcastToTenant(tenantId, type, title, message, data) {
        await this.sendNotification({
            tenantId,
            type,
            title,
            message,
            data,
        });
    }
    async notifyBookingCreated(tenantId, bookingId, customerName, userId) {
        await this.sendNotification({
            tenantId,
            userId,
            type: 'booking_created',
            title: 'Nuova Prenotazione',
            message: `Nuova prenotazione da ${customerName}`,
            data: { bookingId, customerName },
        });
    }
    async notifyBookingConfirmed(tenantId, bookingId, customerName, userId) {
        await this.sendNotification({
            tenantId,
            userId,
            type: 'booking_confirmed',
            title: 'Prenotazione Confermata',
            message: `La prenotazione di ${customerName} è stata confermata`,
            data: { bookingId, customerName, status: 'confirmed' },
        });
    }
    async notifyBookingCancelled(tenantId, bookingId, customerName, reason, userId) {
        await this.sendNotification({
            tenantId,
            userId,
            type: 'booking_cancelled',
            title: 'Prenotazione Cancellata',
            message: `La prenotazione di ${customerName} è stata cancellata${reason ? `: ${reason}` : ''}`,
            data: { bookingId, customerName, reason },
        });
    }
    async notifyInvoicePaid(tenantId, invoiceId, amount, customerName, userId) {
        await this.sendNotification({
            tenantId,
            userId,
            type: 'invoice_paid',
            title: 'Pagamento Ricevuto',
            message: `Pagamento di €${amount.toFixed(2)} ricevuto da ${customerName}`,
            data: { invoiceId, amount, customerName },
        });
    }
    async notifyGdprDeletionScheduled(tenantId, customerId, customerName, scheduledDate, userId) {
        await this.sendNotification({
            tenantId,
            userId,
            type: 'gdpr_deletion_scheduled',
            title: 'Cancellazione GDPR Programmata',
            message: `I dati di ${customerName} saranno cancellati il ${scheduledDate.toLocaleDateString('it-IT')}`,
            data: {
                customerId,
                customerName,
                scheduledDate: scheduledDate.toISOString(),
            },
        });
    }
    getStats() {
        return {
            connectedClients: this.sseService.getConnectedClientsCount(),
            redisConnected: this.redisPubSub.getConnectionStatus(),
        };
    }
};
exports.NotificationsV2Service = NotificationsV2Service;
exports.NotificationsV2Service = NotificationsV2Service = NotificationsV2Service_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [redis_pubsub_service_1.RedisPubSubService,
        sse_service_1.SseService])
], NotificationsV2Service);
