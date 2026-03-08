"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RateLimitingModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const throttler_1 = require("@nestjs/throttler");
const throttler_storage_redis_1 = require("@nest-lab/throttler-storage-redis");
const ioredis_1 = require("ioredis");
let RateLimitingModule = class RateLimitingModule {
};
exports.RateLimitingModule = RateLimitingModule;
exports.RateLimitingModule = RateLimitingModule = __decorate([
    (0, common_1.Module)({
        imports: [
            throttler_1.ThrottlerModule.forRootAsync({
                imports: [config_1.ConfigModule],
                inject: [config_1.ConfigService],
                useFactory: (config) => {
                    const redisHost = config.get('REDIS_HOST', 'localhost');
                    const redisPort = config.get('REDIS_PORT', 6379);
                    const redisPassword = config.get('REDIS_PASSWORD');
                    const redisTls = config.get('REDIS_TLS') === 'true';
                    const redisOptions = {
                        host: redisHost,
                        port: redisPort,
                        password: redisPassword,
                        db: config.get('REDIS_THROTTLE_DB', 1),
                        retryStrategy: (times) => Math.min(times * 50, 2000),
                    };
                    if (redisTls) {
                        redisOptions.tls = {};
                    }
                    const redisClient = new ioredis_1.Redis(redisOptions);
                    return {
                        throttlers: [
                            {
                                name: 'default',
                                ttl: 60000,
                                limit: 60,
                            },
                            {
                                name: 'strict',
                                ttl: 60000,
                                limit: 10,
                            },
                            {
                                name: 'lenient',
                                ttl: 60000,
                                limit: 300,
                            },
                        ],
                        storage: new throttler_storage_redis_1.ThrottlerStorageRedisService(redisClient),
                        errorMessage: 'Rate limit exceeded. Please try again later.',
                    };
                },
            }),
        ],
        exports: [throttler_1.ThrottlerModule],
    })
], RateLimitingModule);
