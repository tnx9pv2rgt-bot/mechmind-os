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
var ObdStreamingGateway_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ObdStreamingGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const common_1 = require("@nestjs/common");
const socket_io_1 = require("socket.io");
const ws_jwt_guard_1 = require("../../../auth/guards/ws-jwt.guard");
const obd_streaming_service_1 = require("../services/obd-streaming.service");
const ioredis_1 = require("@nestjs-modules/ioredis");
const ioredis_2 = __importDefault(require("ioredis"));
let ObdStreamingGateway = ObdStreamingGateway_1 = class ObdStreamingGateway {
    constructor(streamingService, redis) {
        this.streamingService = streamingService;
        this.redis = redis;
        this.logger = new common_1.Logger(ObdStreamingGateway_1.name);
        this.clients = new Map();
        this.redisSubscriber = this.redis.duplicate();
        this.setupRedisSubscription();
    }
    afterInit(_server) {
        this.logger.log('OBD Streaming Gateway initialized');
    }
    async handleConnection(client) {
        try {
            const { tenantId, userId } = client.data.user;
            this.clients.set(client.id, {
                socket: client,
                tenantId,
                userId,
                subscribedDevices: new Set(),
            });
            this.logger.log(`Client connected: ${client.id} (tenant: ${tenantId})`);
            client.emit('connected', {
                message: 'Connected to OBD streaming gateway',
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
            for (const deviceId of clientData.subscribedDevices) {
                this.redisSubscriber.unsubscribe(`obd:live:${deviceId}`);
            }
            this.clients.delete(client.id);
        }
        this.logger.log(`Client disconnected: ${client.id}`);
    }
    async handleStartStreaming(client, payload) {
        try {
            const clientData = this.clients.get(client.id);
            if (!clientData)
                return;
            const stream = await this.streamingService.startStreaming(payload.deviceId, {
                adapterType: payload.adapterType,
                protocol: payload.protocol,
                sensors: payload.sensors,
                interval: payload.interval,
            });
            clientData.subscribedDevices.add(payload.deviceId);
            await this.redisSubscriber.subscribe(`obd:live:${payload.deviceId}`);
            client.emit('streaming-started', {
                streamId: stream.id,
                deviceId: payload.deviceId,
                config: stream.config,
            });
            this.logger.log(`Streaming started: ${stream.id} for device ${payload.deviceId}`);
        }
        catch (error) {
            client.emit('error', { message: error instanceof Error ? error.message : 'Unknown error' });
        }
    }
    async handleStopStreaming(client, payload) {
        try {
            const clientData = this.clients.get(client.id);
            if (!clientData)
                return;
            await this.streamingService.stopStreaming(payload.streamId);
            for (const deviceId of clientData.subscribedDevices) {
                const stream = this.streamingService.getActiveStream(deviceId);
                if (stream?.id === payload.streamId) {
                    clientData.subscribedDevices.delete(deviceId);
                    await this.redisSubscriber.unsubscribe(`obd:live:${deviceId}`);
                    break;
                }
            }
            client.emit('streaming-stopped', { streamId: payload.streamId });
        }
        catch (error) {
            client.emit('error', { message: error instanceof Error ? error.message : 'Unknown error' });
        }
    }
    async handleSubscribeDevice(client, payload) {
        try {
            const clientData = this.clients.get(client.id);
            if (!clientData)
                return;
            clientData.subscribedDevices.add(payload.deviceId);
            await this.redisSubscriber.subscribe(`obd:live:${payload.deviceId}`);
            const latestReading = await this.redis.get(`obd:latest:${payload.deviceId}`);
            if (latestReading) {
                client.emit('sensor-data', JSON.parse(latestReading));
            }
            client.emit('subscribed', { deviceId: payload.deviceId });
        }
        catch (error) {
            client.emit('error', { message: error instanceof Error ? error.message : 'Unknown error' });
        }
    }
    async handleUnsubscribeDevice(client, payload) {
        try {
            const clientData = this.clients.get(client.id);
            if (!clientData)
                return;
            clientData.subscribedDevices.delete(payload.deviceId);
            await this.redisSubscriber.unsubscribe(`obd:live:${payload.deviceId}`);
            client.emit('unsubscribed', { deviceId: payload.deviceId });
        }
        catch (error) {
            client.emit('error', { message: error instanceof Error ? error.message : 'Unknown error' });
        }
    }
    async handleSensorData(client, payload) {
        try {
            await this.streamingService.processSensorData(payload.streamId, payload.data);
        }
        catch (error) {
            client.emit('error', { message: error instanceof Error ? error.message : 'Unknown error' });
        }
    }
    async handleCaptureFreezeFrame(client, payload) {
        try {
            const freezeFrame = await this.streamingService.captureFreezeFrame(payload.deviceId, payload.dtcCode);
            client.emit('freeze-frame-captured', freezeFrame);
        }
        catch (error) {
            client.emit('error', { message: error instanceof Error ? error.message : 'Unknown error' });
        }
    }
    async handleGetMode06Tests(client, payload) {
        try {
            const results = await this.streamingService.getMode06Tests(payload.deviceId);
            client.emit('mode06-results', { deviceId: payload.deviceId, results });
        }
        catch (error) {
            client.emit('error', { message: error instanceof Error ? error.message : 'Unknown error' });
        }
    }
    async handleExecuteEvapTest(client, payload) {
        try {
            const test = await this.streamingService.executeEvapTest(payload.deviceId, payload.testType);
            client.emit('evap-test-started', test);
        }
        catch (error) {
            client.emit('error', { message: error instanceof Error ? error.message : 'Unknown error' });
        }
    }
    async handleRequestSnapshot(client, payload) {
        try {
            const snapshot = await this.redis.get(`obd:latest:${payload.deviceId}`);
            client.emit('snapshot', {
                deviceId: payload.deviceId,
                data: snapshot ? JSON.parse(snapshot) : null,
                timestamp: new Date(),
            });
        }
        catch (error) {
            client.emit('error', { message: error instanceof Error ? error.message : 'Unknown error' });
        }
    }
    setupRedisSubscription() {
        this.redisSubscriber.on('message', (channel, message) => {
            const deviceId = channel.replace('obd:live:', '');
            for (const clientData of this.clients.values()) {
                if (clientData.subscribedDevices.has(deviceId)) {
                    clientData.socket.emit('sensor-data', JSON.parse(message));
                }
            }
        });
    }
};
exports.ObdStreamingGateway = ObdStreamingGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], ObdStreamingGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('start-streaming'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], ObdStreamingGateway.prototype, "handleStartStreaming", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('stop-streaming'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], ObdStreamingGateway.prototype, "handleStopStreaming", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('subscribe-device'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], ObdStreamingGateway.prototype, "handleSubscribeDevice", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('unsubscribe-device'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], ObdStreamingGateway.prototype, "handleUnsubscribeDevice", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('sensor-data'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], ObdStreamingGateway.prototype, "handleSensorData", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('capture-freeze-frame'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], ObdStreamingGateway.prototype, "handleCaptureFreezeFrame", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('get-mode06-tests'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], ObdStreamingGateway.prototype, "handleGetMode06Tests", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('execute-evap-test'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], ObdStreamingGateway.prototype, "handleExecuteEvapTest", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('request-snapshot'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], ObdStreamingGateway.prototype, "handleRequestSnapshot", null);
exports.ObdStreamingGateway = ObdStreamingGateway = ObdStreamingGateway_1 = __decorate([
    (0, websockets_1.WebSocketGateway)({
        namespace: 'obd-streaming',
        cors: { origin: '*' },
        transports: ['websocket', 'polling'],
    }),
    (0, common_1.UseGuards)(ws_jwt_guard_1.WsJwtGuard),
    __param(1, (0, ioredis_1.InjectRedis)()),
    __metadata("design:paramtypes", [obd_streaming_service_1.ObdStreamingService,
        ioredis_2.default])
], ObdStreamingGateway);
