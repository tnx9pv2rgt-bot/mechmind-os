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
exports.RedisService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const redis_1 = require("@upstash/redis");
const logger_service_1 = require("./logger.service");
let RedisService = class RedisService {
    constructor(config, logger) {
        this.config = config;
        this.logger = logger;
        this.client = null;
        this.memoryStore = new Map();
        const url = this.config.get('UPSTASH_REDIS_REST_URL');
        const token = this.config.get('UPSTASH_REDIS_REST_TOKEN');
        if (url && token) {
            this.client = new redis_1.Redis({ url, token });
            this.logger.log('RedisService: Upstash client initialized');
        }
        else {
            this.logger.warn('RedisService: Using in-memory fallback');
        }
    }
    async get(key) {
        if (this.client) {
            return this.client.get(key);
        }
        const item = this.memoryStore.get(key);
        if (!item)
            return null;
        if (item.expiresAt < Date.now()) {
            this.memoryStore.delete(key);
            return null;
        }
        return item.value;
    }
    async set(key, value, ttlSeconds) {
        if (this.client) {
            if (ttlSeconds) {
                await this.client.set(key, value, { ex: ttlSeconds });
            }
            else {
                await this.client.set(key, value);
            }
            return;
        }
        const expiresAt = ttlSeconds
            ? Date.now() + ttlSeconds * 1000
            : Number.MAX_SAFE_INTEGER;
        this.memoryStore.set(key, { value, expiresAt });
    }
    async del(key) {
        if (this.client) {
            await this.client.del(key);
            return;
        }
        this.memoryStore.delete(key);
    }
    onModuleDestroy() {
        this.memoryStore.clear();
    }
};
exports.RedisService = RedisService;
exports.RedisService = RedisService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        logger_service_1.LoggerService])
], RedisService);
