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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var ShopFloorGateway_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShopFloorGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const common_1 = require("@nestjs/common");
const socket_io_1 = require("socket.io");
const ws_jwt_guard_1 = require("../../../auth/guards/ws-jwt.guard");
const ioredis_1 = require("@nestjs-modules/ioredis");
const ioredis_2 = __importDefault(require("ioredis"));
let ShopFloorGateway = ShopFloorGateway_1 = class ShopFloorGateway {
    constructor(redis) {
        this.redis = redis;
        this.logger = new common_1.Logger(ShopFloorGateway_1.name);
        this.clients = new Map();
        this.redisSubscriber = this.redis.duplicate();
        this.setupRedisSubscription();
    }
    afterInit(_server) {
        this.logger.log('Shop Floor Gateway initialized');
    }
    async handleConnection(client) {
        try {
            const { tenantId, userId } = client.data.user;
            this.clients.set(client.id, {
                socket: client,
                tenantId,
                userId,
                subscribedBays: new Set(),
            });
            this.logger.log(`Shop floor client connected: ${client.id} (tenant: ${tenantId})`);
            client.emit('connected', {
                message: 'Connected to shop floor gateway',
                clientId: client.id,
            });
        }
        catch (error) {
            this.logger.error(`Connection error: ${error instanceof Error ? error.message : 'Unknown error'}`);
            client.disconnect();
        }
    }
    handleDisconnect(client) {
        const clientData = this.clients.get(client.id);
        if (clientData) {
            for (const bayId of clientData.subscribedBays) {
                this.redisSubscriber.unsubscribe(`shopfloor:sensor:${bayId}`);
            }
            this.clients.delete(client.id);
        }
        this.logger.log(`Shop floor client disconnected: ${client.id}`);
    }
    async handleSubscribeBay(client, payload) {
        try {
            const clientData = this.clients.get(client.id);
            if (!clientData)
                return;
            clientData.subscribedBays.add(payload.bayId);
            await this.redisSubscriber.subscribe(`shopfloor:sensor:${payload.bayId}`);
            client.emit('bay-subscribed', { bayId: payload.bayId });
        }
        catch (error) {
            client.emit('error', { message: error instanceof Error ? error.message : 'Unknown error' });
        }
    }
    async handleUnsubscribeBay(client, payload) {
        try {
            const clientData = this.clients.get(client.id);
            if (!clientData)
                return;
            clientData.subscribedBays.delete(payload.bayId);
            await this.redisSubscriber.unsubscribe(`shopfloor:sensor:${payload.bayId}`);
            client.emit('bay-unsubscribed', { bayId: payload.bayId });
        }
        catch (error) {
            client.emit('error', { message: error instanceof Error ? error.message : 'Unknown error' });
        }
    }
    async handleSubscribeTechnicians(client) {
        try {
            const clientData = this.clients.get(client.id);
            if (!clientData)
                return;
            await this.redisSubscriber.subscribe('shopfloor:technicians');
            client.emit('technicians-subscribed', {});
        }
        catch (error) {
            client.emit('error', { message: error instanceof Error ? error.message : 'Unknown error' });
        }
    }
    async handleSubscribeEvents(client) {
        try {
            const clientData = this.clients.get(client.id);
            if (!clientData)
                return;
            await this.redisSubscriber.subscribe('shopfloor:events');
            client.emit('events-subscribed', {});
        }
        catch (error) {
            client.emit('error', { message: error instanceof Error ? error.message : 'Unknown error' });
        }
    }
    setupRedisSubscription() {
        this.redisSubscriber.on('message', (channel, message) => {
            const data = JSON.parse(message);
            if (channel.startsWith('shopfloor:sensor:')) {
                const bayId = channel.replace('shopfloor:sensor:', '');
                for (const clientData of this.clients.values()) {
                    if (clientData.subscribedBays.has(bayId)) {
                        clientData.socket.emit('sensor-reading', { bayId, data });
                    }
                }
            }
            else if (channel === 'shopfloor:technicians') {
                for (const clientData of this.clients.values()) {
                    clientData.socket.emit('technician-location', data);
                }
            }
            else if (channel === 'shopfloor:events') {
                for (const clientData of this.clients.values()) {
                    clientData.socket.emit('shop-floor-event', data);
                }
            }
        });
    }
};
exports.ShopFloorGateway = ShopFloorGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], ShopFloorGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('subscribe-bay'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], ShopFloorGateway.prototype, "handleSubscribeBay", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('unsubscribe-bay'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], ShopFloorGateway.prototype, "handleUnsubscribeBay", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('subscribe-technicians'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket]),
    __metadata("design:returntype", Promise)
], ShopFloorGateway.prototype, "handleSubscribeTechnicians", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('subscribe-events'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket]),
    __metadata("design:returntype", Promise)
], ShopFloorGateway.prototype, "handleSubscribeEvents", null);
exports.ShopFloorGateway = ShopFloorGateway = ShopFloorGateway_1 = __decorate([
    (0, websockets_1.WebSocketGateway)({
        namespace: 'shop-floor',
        cors: { origin: '*' },
        transports: ['websocket', 'polling'],
    }),
    (0, common_1.UseGuards)(ws_jwt_guard_1.WsJwtGuard),
    __param(0, (0, ioredis_1.InjectRedis)()),
    __metadata("design:paramtypes", [ioredis_2.default])
], ShopFloorGateway);
