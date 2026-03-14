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
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const ioredis_1 = __importDefault(require("ioredis"));
const logger_service_1 = require("./logger.service");
let RedisService = class RedisService {
    constructor(config, logger) {
        this.config = config;
        this.logger = logger;
        this.client = null;
        this._isAvailable = false;
    }
    get isAvailable() {
        return this._isAvailable;
    }
    async onModuleInit() {
        const url = this.config.get('REDIS_URL');
        if (!url) {
            this.logger.error('RedisService: REDIS_URL is required. ' +
                'Redis-dependent features (MFA sessions, rate limiting, queues) will be unavailable.');
            this._isAvailable = false;
            return;
        }
        try {
            this.client = new ioredis_1.default(url, {
                maxRetriesPerRequest: 3,
                retryStrategy(times) {
                    if (times > 3)
                        return null;
                    return Math.min(times * 200, 2000);
                },
                lazyConnect: false,
            });
            await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('Redis connection timeout (5s)'));
                }, 5000);
                this.client.once('ready', () => {
                    clearTimeout(timeout);
                    resolve();
                });
                this.client.once('error', (err) => {
                    clearTimeout(timeout);
                    reject(err);
                });
            });
            this._isAvailable = true;
            this.logger.log('RedisService: ioredis client connected');
        }
        catch (error) {
            this.logger.error(`RedisService: Failed to connect - ${error instanceof Error ? error.message : 'Unknown error'}. ` +
                'App will start but Redis-dependent features will be unavailable.');
            this.client?.disconnect();
            this.client = null;
            this._isAvailable = false;
        }
    }
    async get(key) {
        if (!this.client) {
            this.logger.warn('RedisService: get() called but Redis is not available');
            return null;
        }
        try {
            return await this.client.get(key);
        }
        catch (error) {
            this.logger.error(`RedisService: get(${key}) failed - ${error instanceof Error ? error.message : 'Unknown error'}`);
            return null;
        }
    }
    async set(key, value, ttlSeconds) {
        if (!this.client) {
            this.logger.warn('RedisService: set() called but Redis is not available');
            return;
        }
        try {
            if (ttlSeconds) {
                await this.client.set(key, value, 'EX', ttlSeconds);
            }
            else {
                await this.client.set(key, value);
            }
        }
        catch (error) {
            this.logger.error(`RedisService: set(${key}) failed - ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async del(key) {
        if (!this.client) {
            this.logger.warn('RedisService: del() called but Redis is not available');
            return;
        }
        try {
            await this.client.del(key);
        }
        catch (error) {
            this.logger.error(`RedisService: del(${key}) failed - ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async onModuleDestroy() {
        if (this.client) {
            await this.client.quit();
        }
        this.logger.log('RedisService: disconnected');
    }
};
exports.RedisService = RedisService;
exports.RedisService = RedisService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        logger_service_1.LoggerService])
], RedisService);
