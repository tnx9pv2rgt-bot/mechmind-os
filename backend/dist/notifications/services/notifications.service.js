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
var NotificationsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationsService = void 0;
const common_1 = require("@nestjs/common");
const bullmq_1 = require("@nestjs/bullmq");
const bullmq_2 = require("bullmq");
const notifications_gateway_1 = require("../gateways/notifications.gateway");
let NotificationsService = NotificationsService_1 = class NotificationsService {
    constructor(gateway, emailQueue) {
        this.gateway = gateway;
        this.emailQueue = emailQueue;
        this.logger = new common_1.Logger(NotificationsService_1.name);
    }
    async sendNotification(payload) {
        this.logger.log(`Sending notification: ${payload.type} to user ${payload.userId}`);
        this.gateway.sendToUser(payload.userId, 'notification:new', {
            id: this.generateId(),
            type: payload.type,
            title: payload.title,
            message: payload.message,
            data: payload.data,
            timestamp: new Date().toISOString(),
            isRead: false,
        });
        this.gateway.broadcastToTenant(payload.tenantId, 'tenant:update', {
            type: payload.type,
            data: payload.data,
        });
        if (payload.email) {
            await this.enqueueEmail({
                tenantId: payload.tenantId,
                userId: payload.userId,
                ...payload.email,
            });
        }
    }
    async enqueueEmail(emailData) {
        await this.emailQueue.add('send-email', emailData, {
            jobId: `email-${emailData.userId}-${Date.now()}`,
        });
        this.logger.log(`Email queued for ${emailData.to}`);
    }
    async broadcastToMechanics(tenantId, payload) {
        this.gateway.broadcastToTenant(tenantId, 'mechanic:notification', {
            ...payload,
            timestamp: new Date().toISOString(),
        });
    }
    async sendToTenant(tenantId, notification) {
        this.logger.log(`Sending notification to tenant ${tenantId}: ${notification.title}`);
        this.gateway.broadcastToTenant(tenantId, 'tenant:notification', {
            id: this.generateId(),
            title: notification.title,
            message: notification.body,
            priority: notification.priority || 'normal',
            data: notification.data,
            timestamp: new Date().toISOString(),
            isRead: false,
        });
    }
    generateId() {
        return `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
};
exports.NotificationsService = NotificationsService;
exports.NotificationsService = NotificationsService = NotificationsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, bullmq_1.InjectQueue)('email-queue')),
    __metadata("design:paramtypes", [notifications_gateway_1.NotificationsGateway,
        bullmq_2.Queue])
], NotificationsService);
