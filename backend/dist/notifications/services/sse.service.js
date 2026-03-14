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
var SseService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SseService = void 0;
const common_1 = require("@nestjs/common");
const rxjs_1 = require("rxjs");
const redis_pubsub_service_1 = require("./redis-pubsub.service");
let SseService = SseService_1 = class SseService {
    constructor(redisPubSub) {
        this.redisPubSub = redisPubSub;
        this.logger = new common_1.Logger(SseService_1.name);
        this.clients = new Map();
        this.HEARTBEAT_INTERVAL = 30000;
    }
    createEventStream(clientId, tenantId, userId) {
        return new rxjs_1.Observable(observer => {
            const client = {
                id: clientId,
                tenantId,
                userId,
                observer,
            };
            this.clients.set(clientId, client);
            this.logger.log(`SSE client connected: ${clientId} (tenant: ${tenantId})`);
            this.subscribeToTenant(tenantId);
            const redisSub = this.redisPubSub.getTenantObservable(tenantId);
            if (redisSub) {
                const subscription = redisSub.subscribe({
                    next: data => {
                        this.handleNotification(client, data);
                    },
                    error: err => {
                        this.logger.error(`Redis subscription error for ${tenantId}:`, err);
                    },
                });
                client.redisSubscription = subscription;
            }
            observer.next({
                event: 'connected',
                data: JSON.stringify({
                    clientId,
                    timestamp: new Date().toISOString(),
                    message: 'Connected to notification stream',
                }),
            });
            client.heartbeatInterval = setInterval(() => {
                observer.next({
                    event: 'heartbeat',
                    data: JSON.stringify({ timestamp: new Date().toISOString() }),
                });
            }, this.HEARTBEAT_INTERVAL);
            return () => {
                this.cleanupClient(clientId);
            };
        });
    }
    handleNotification(client, data) {
        if (data.userId && client.userId && data.userId !== client.userId) {
            return;
        }
        client.observer.next({
            id: `notif-${Date.now()}`,
            event: data.type,
            data: JSON.stringify({
                ...data,
                id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            }),
        });
    }
    async subscribeToTenant(tenantId) {
        const hasExistingClients = Array.from(this.clients.values()).some(c => c.tenantId === tenantId);
        if (!hasExistingClients) {
            await this.redisPubSub.subscribeToTenant(tenantId);
        }
    }
    async cleanupClient(clientId) {
        const client = this.clients.get(clientId);
        if (!client)
            return;
        if (client.heartbeatInterval) {
            clearInterval(client.heartbeatInterval);
        }
        if (client.redisSubscription) {
            client.redisSubscription.unsubscribe();
        }
        const remainingClients = Array.from(this.clients.values()).filter(c => c.tenantId === client.tenantId && c.id !== clientId);
        if (remainingClients.length === 0) {
            await this.redisPubSub.unsubscribeFromTenant(client.tenantId);
        }
        this.clients.delete(clientId);
        this.logger.log(`SSE client disconnected: ${clientId}`);
    }
    async broadcastToTenant(tenantId, data) {
        await this.redisPubSub.publishToTenant(tenantId, data);
    }
    async sendToUser(tenantId, userId, data) {
        await this.redisPubSub.publishToTenant(tenantId, {
            ...data,
            userId,
        });
    }
    getConnectedClientsCount() {
        return this.clients.size;
    }
    getTenantClientsCount(tenantId) {
        return Array.from(this.clients.values()).filter(c => c.tenantId === tenantId).length;
    }
    async disconnectAll() {
        for (const [clientId, client] of this.clients) {
            client.observer.complete();
            await this.cleanupClient(clientId);
        }
    }
};
exports.SseService = SseService;
exports.SseService = SseService = SseService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [redis_pubsub_service_1.RedisPubSubService])
], SseService);
