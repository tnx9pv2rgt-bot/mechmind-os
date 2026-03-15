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
var NotificationsGateway_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationsGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const socket_io_1 = require("socket.io");
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const redis_adapter_1 = require("@socket.io/redis-adapter");
const ioredis_1 = require("ioredis");
let NotificationsGateway = NotificationsGateway_1 = class NotificationsGateway {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(NotificationsGateway_1.name);
    }
    afterInit() {
        const redisUrl = this.configService.get('REDIS_URL');
        if (redisUrl && this.server) {
            try {
                const pubClient = new ioredis_1.Redis(redisUrl);
                const subClient = pubClient.duplicate();
                pubClient.on('error', err => this.logger.warn(`Socket.io Redis pub error: ${err.message}`));
                subClient.on('error', err => this.logger.warn(`Socket.io Redis sub error: ${err.message}`));
                const ioServer = this.server.server || this.server;
                if (typeof ioServer.adapter === 'function') {
                    ioServer.adapter((0, redis_adapter_1.createAdapter)(pubClient, subClient));
                    this.logger.log('Socket.io Redis adapter configured for multi-instance support');
                }
                else {
                    this.logger.warn('Socket.io server.adapter not available — running in single-instance mode');
                    pubClient.disconnect();
                    subClient.disconnect();
                }
            }
            catch (error) {
                this.logger.warn(`Failed to configure Redis adapter: ${error}. Running in single-instance mode.`);
            }
        }
        else {
            this.logger.warn('REDIS_URL not configured — Socket.io running without Redis adapter (single instance only)');
        }
    }
    async handleConnection(client) {
        try {
            const token = this.extractToken(client);
            if (!token) {
                client.disconnect(true);
                return;
            }
            client.data.userId = 'user-' + Math.random().toString(36).substr(2, 9);
            client.data.tenantId = 'tenant-001';
            client.join(`tenant:${client.data.tenantId}`);
            client.join(`user:${client.data.userId}`);
            client.emit('connected', {
                message: 'Connected',
                userId: client.data.userId,
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
            client.disconnect(true);
        }
    }
    handleDisconnect(client) {
        this.logger.log(`Client disconnected: ${client.data?.userId}`);
    }
    handleRead(client, payload) {
        client.to(`user:${client.data.userId}`).emit('notification:read:sync', payload);
    }
    broadcastToTenant(tenantId, event, data) {
        this.server.to(`tenant:${tenantId}`).emit(event, data);
    }
    sendToUser(userId, event, data) {
        this.server.to(`user:${userId}`).emit(event, data);
    }
    extractToken(client) {
        return (client.handshake.auth?.token ||
            (typeof client.handshake.query?.token === 'string' ? client.handshake.query.token : null));
    }
};
exports.NotificationsGateway = NotificationsGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], NotificationsGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('notification:read'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", void 0)
], NotificationsGateway.prototype, "handleRead", null);
exports.NotificationsGateway = NotificationsGateway = NotificationsGateway_1 = __decorate([
    (0, websockets_1.WebSocketGateway)({
        namespace: 'notifications',
        cors: {
            origin: process.env.FRONTEND_URL || 'http://localhost:3000',
            credentials: true,
        },
        transports: ['websocket', 'polling'],
    }),
    __metadata("design:paramtypes", [config_1.ConfigService])
], NotificationsGateway);
