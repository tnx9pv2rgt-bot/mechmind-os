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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var RedisPubSubService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisPubSubService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const ioredis_1 = __importDefault(require("ioredis"));
const rxjs_1 = require("rxjs");
let RedisPubSubService = RedisPubSubService_1 = class RedisPubSubService {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(RedisPubSubService_1.name);
        this.channels = new Map();
        this.isConnected = false;
    }
    async onModuleInit() {
        await this.connect();
    }
    async onModuleDestroy() {
        await this.disconnect();
    }
    getRedisConfig() {
        const redisUrl = this.configService.get('REDIS_URL');
        if (redisUrl) {
            try {
                const url = new URL(redisUrl);
                return {
                    host: url.hostname,
                    port: parseInt(url.port, 10) || 6379,
                    password: url.password || undefined,
                    db: parseInt(url.pathname.slice(1), 10) || 0,
                    tls: url.protocol === 'rediss:',
                };
            }
            catch {
            }
        }
        return {
            host: this.configService.get('REDIS_HOST', 'localhost'),
            port: this.configService.get('REDIS_PORT', 6379),
            password: this.configService.get('REDIS_PASSWORD'),
            db: this.configService.get('REDIS_PUBSUB_DB', 0),
            tls: this.configService.get('REDIS_TLS') === 'true',
        };
    }
    async connect() {
        try {
            const config = this.getRedisConfig();
            const redisOptions = {
                host: config.host,
                port: config.port,
                password: config.password,
                db: config.db,
                lazyConnect: true,
                retryStrategy: (times) => {
                    if (times > 3)
                        return null;
                    const delay = Math.min(times * 500, 2000);
                    this.logger.warn(`Redis reconnection attempt ${times}, retrying in ${delay}ms`);
                    return delay;
                },
                maxRetriesPerRequest: 3,
            };
            if (config.tls) {
                redisOptions.tls = {};
            }
            this.publisher = new ioredis_1.default(redisOptions);
            this.subscriber = new ioredis_1.default(redisOptions);
            this.publisher.on('error', err => {
                this.logger.error('Redis publisher error:', err.message);
            });
            this.subscriber.on('error', err => {
                this.logger.error('Redis subscriber error:', err.message);
                this.isConnected = false;
            });
            this.publisher.on('connect', () => {
                this.logger.log('Redis publisher connected');
            });
            this.subscriber.on('connect', () => {
                this.logger.log('Redis subscriber connected');
                this.isConnected = true;
            });
            this.subscriber.on('message', (channel, message) => {
                this.handleMessage(channel, message);
            });
            await Promise.all([this.publisher.connect(), this.subscriber.connect()]);
            this.logger.log('Redis Pub/Sub service initialized');
        }
        catch (error) {
            this.logger.error('Failed to connect to Redis Pub/Sub:', error instanceof Error ? error.message : 'Unknown error');
            this.isConnected = false;
        }
    }
    async disconnect() {
        this.logger.log('Disconnecting Redis Pub/Sub...');
        if (this.subscriber) {
            await this.subscriber.unsubscribe();
            this.subscriber.removeAllListeners();
            await this.subscriber.quit();
        }
        if (this.publisher) {
            this.publisher.removeAllListeners();
            await this.publisher.quit();
        }
        this.channels.clear();
        this.isConnected = false;
        this.logger.log('Redis Pub/Sub disconnected');
    }
    handleMessage(channel, message) {
        try {
            const data = JSON.parse(message);
            const subject = this.channels.get(channel);
            if (subject) {
                subject.next(data);
            }
        }
        catch (error) {
            this.logger.error('Failed to parse Redis message:', error instanceof Error ? error.message : 'Unknown error');
        }
    }
    async subscribeToTenant(tenantId) {
        const channel = `notifications:${tenantId}`;
        if (this.channels.has(channel)) {
            return this.channels.get(channel);
        }
        const subject = new rxjs_1.Subject();
        this.channels.set(channel, subject);
        await this.subscriber.subscribe(channel);
        this.logger.log(`Subscribed to channel: ${channel}`);
        return subject;
    }
    async unsubscribeFromTenant(tenantId) {
        const channel = `notifications:${tenantId}`;
        if (this.channels.has(channel)) {
            const subject = this.channels.get(channel);
            subject?.complete();
            this.channels.delete(channel);
            await this.subscriber.unsubscribe(channel);
            this.logger.log(`Unsubscribed from channel: ${channel}`);
        }
    }
    async publishToTenant(tenantId, data) {
        const channel = `notifications:${tenantId}`;
        const message = JSON.stringify(data);
        try {
            const result = await this.publisher.publish(channel, message);
            this.logger.debug(`Published to ${channel}: ${result} subscribers`);
            return result;
        }
        catch (error) {
            this.logger.error(`Failed to publish to ${channel}:`, error instanceof Error ? error.message : 'Unknown error');
            throw error;
        }
    }
    getTenantObservable(tenantId) {
        return this.channels.get(`notifications:${tenantId}`);
    }
    getConnectionStatus() {
        return this.isConnected && this.publisher?.status === 'ready';
    }
};
exports.RedisPubSubService = RedisPubSubService;
exports.RedisPubSubService = RedisPubSubService = RedisPubSubService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], RedisPubSubService);
