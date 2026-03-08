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
var RedisRateLimiterMiddleware_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisRateLimiterMiddleware = void 0;
exports.ApplyRateLimit = ApplyRateLimit;
exports.createRateLimiter = createRateLimiter;
exports.checkRateLimit = checkRateLimit;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const ioredis_1 = __importDefault(require("ioredis"));
class RedisRateLimitStore {
    constructor(redis, windowMs) {
        this.redis = redis;
        this.windowMs = windowMs;
    }
    async increment(key) {
        const multi = this.redis.multi();
        const now = Date.now();
        const windowStart = now - this.windowMs;
        multi.zremrangebyscore(key, 0, windowStart);
        multi.zadd(key, now, `${now}-${Math.random()}`);
        multi.zcard(key);
        multi.pexpire(key, this.windowMs);
        const results = await multi.exec();
        const current = results?.[2]?.[1] || 1;
        return {
            limit: 0,
            current,
            remaining: Math.max(0, 0 - current),
            resetTime: new Date(now + this.windowMs),
        };
    }
    async decrement(key) {
        const now = Date.now();
        const entries = await this.redis.zrevrange(key, 0, 0);
        if (entries.length > 0) {
            await this.redis.zrem(key, entries[0]);
        }
    }
    async resetKey(key) {
        await this.redis.del(key);
    }
    async incrementSlidingWindow(key, limit) {
        const now = Date.now();
        const windowStart = now - this.windowMs;
        const script = `
      redis.call('zremrangebyscore', KEYS[1], 0, ARGV[1])
      local current = redis.call('zcard', KEYS[1])
      if current < tonumber(ARGV[2]) then
        redis.call('zadd', KEYS[1], ARGV[3], ARGV[4])
        redis.call('pexpire', KEYS[1], ARGV[5])
        return {current + 1, ARGV[5]}
      else
        local oldest = redis.call('zrange', KEYS[1], 0, 0, 'WITHSCORES')
        local retryAfter = oldest[2] - ARGV[1]
        return {current, retryAfter}
      end
    `;
        const result = await this.redis.eval(script, 1, key, windowStart, limit, now, `${now}-${Math.random()}`, this.windowMs);
        const current = result[0];
        const retryAfter = result[1];
        return {
            limit,
            current,
            remaining: Math.max(0, limit - current),
            resetTime: new Date(now + (retryAfter > 0 ? retryAfter : this.windowMs)),
        };
    }
}
class FixedWindowStore {
    constructor(redis, windowMs) {
        this.redis = redis;
        this.windowMs = windowMs;
    }
    async increment(key) {
        const multi = this.redis.multi();
        multi.incr(key);
        multi.pexpire(key, this.windowMs);
        const results = await multi.exec();
        const current = results?.[0]?.[1] || 1;
        const ttl = await this.redis.pttl(key);
        return {
            limit: 0,
            current,
            remaining: 0,
            resetTime: new Date(Date.now() + Math.max(0, ttl)),
        };
    }
    async decrement(key) {
        await this.redis.decr(key);
    }
    async resetKey(key) {
        await this.redis.del(key);
    }
}
let RedisRateLimiterMiddleware = RedisRateLimiterMiddleware_1 = class RedisRateLimiterMiddleware {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(RedisRateLimiterMiddleware_1.name);
        this.configs = new Map();
        const redisUrl = this.configService.get('REDIS_URL') || 'redis://localhost:6379';
        this.redis = new ioredis_1.default(redisUrl, {
            password: this.configService.get('REDIS_PASSWORD') || undefined,
            db: parseInt(this.configService.get('REDIS_DB') || '0'),
            retryStrategy: (times) => Math.min(times * 50, 2000),
            enableOfflineQueue: false,
        });
        this.redis.on('error', (err) => {
            this.logger.error('Redis connection error:', err.message);
        });
    }
    use(req, res, next) {
        const config = RedisRateLimiterMiddleware_1.API_GENERAL_LIMIT;
        this.applyRateLimit(req, res, next, config);
    }
    createMiddleware(config) {
        return (req, res, next) => {
            this.applyRateLimit(req, res, next, config);
        };
    }
    async applyRateLimit(req, res, next, config) {
        const key = this.generateKey(req, config);
        const store = new RedisRateLimitStore(this.redis, config.windowMs);
        try {
            const info = await store.incrementSlidingWindow(key, config.maxRequests);
            res.setHeader('X-RateLimit-Limit', info.limit.toString());
            res.setHeader('X-RateLimit-Remaining', info.remaining.toString());
            res.setHeader('X-RateLimit-Reset', info.resetTime.toISOString());
            if (info.current > info.limit) {
                const retryAfter = Math.ceil((info.resetTime.getTime() - Date.now()) / 1000);
                res.setHeader('Retry-After', retryAfter.toString());
                if (config.handler) {
                    config.handler(req, res);
                }
                else {
                    res.status(429).json({
                        success: false,
                        error: 'Too Many Requests',
                        message: `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
                        retryAfter,
                    });
                }
                return;
            }
            const originalJson = res.json.bind(res);
            res.json = (body) => {
                this.handleResponse(req, res, body, store, key, config);
                return originalJson(body);
            };
            next();
        }
        catch (error) {
            this.logger.error('Rate limiter error:', error.message);
            next();
        }
    }
    generateKey(req, config) {
        if (config.keyGenerator) {
            return `${config.keyPrefix}:${config.keyGenerator(req)}`;
        }
        const identifier = this.getClientIp(req);
        return `${config.keyPrefix}:${identifier}`;
    }
    getClientIp(req) {
        const forwarded = req.headers['x-forwarded-for'];
        const ip = forwarded
            ? (typeof forwarded === 'string' ? forwarded.split(',')[0] : forwarded[0])
            : req.socket?.remoteAddress;
        return ip || 'unknown';
    }
    async handleResponse(req, res, body, store, key, config) {
        const statusCode = res.statusCode;
        const isSuccess = statusCode < 400;
        if (config.skipSuccessfulRequests && isSuccess) {
            await store.decrement(key);
        }
        if (config.skipFailedRequests && !isSuccess) {
            await store.decrement(key);
        }
    }
    async resetLimit(key, prefix) {
        const fullKey = prefix ? `${prefix}:${key}` : key;
        await this.redis.del(fullKey);
    }
    async getLimitStatus(key, config) {
        const fullKey = `${config.keyPrefix}:${key}`;
        const store = new RedisRateLimitStore(this.redis, config.windowMs);
        try {
            const count = await this.redis.zcount(fullKey, Date.now() - config.windowMs, Date.now());
            const ttl = await this.redis.pttl(fullKey);
            return {
                limit: config.maxRequests,
                current: count,
                remaining: Math.max(0, config.maxRequests - count),
                resetTime: new Date(Date.now() + Math.max(0, ttl)),
            };
        }
        catch (error) {
            this.logger.error('Get limit status error:', error.message);
            return null;
        }
    }
    async onModuleDestroy() {
        await this.redis.quit();
    }
};
exports.RedisRateLimiterMiddleware = RedisRateLimiterMiddleware;
RedisRateLimiterMiddleware.REGISTRATION_LIMIT = {
    windowMs: 60 * 60 * 1000,
    maxRequests: 5,
    keyPrefix: 'ratelimit:registration',
};
RedisRateLimiterMiddleware.VAT_VERIFICATION_LIMIT = {
    windowMs: 60 * 1000,
    maxRequests: 10,
    keyPrefix: 'ratelimit:vat',
};
RedisRateLimiterMiddleware.EMAIL_CHECK_LIMIT = {
    windowMs: 60 * 1000,
    maxRequests: 20,
    keyPrefix: 'ratelimit:email',
};
RedisRateLimiterMiddleware.PHONE_CHECK_LIMIT = {
    windowMs: 60 * 1000,
    maxRequests: 10,
    keyPrefix: 'ratelimit:phone',
};
RedisRateLimiterMiddleware.LOGIN_LIMIT = {
    windowMs: 15 * 60 * 1000,
    maxRequests: 5,
    keyPrefix: 'ratelimit:login',
};
RedisRateLimiterMiddleware.API_GENERAL_LIMIT = {
    windowMs: 60 * 1000,
    maxRequests: 100,
    keyPrefix: 'ratelimit:api',
};
exports.RedisRateLimiterMiddleware = RedisRateLimiterMiddleware = RedisRateLimiterMiddleware_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], RedisRateLimiterMiddleware);
function ApplyRateLimit(config) {
    return function (target, propertyKey, descriptor) {
        const limiterConfig = typeof config === 'string'
            ? getPresetConfig(config)
            : config;
        Reflect.defineMetadata('RATE_LIMIT_CONFIG', limiterConfig, target, propertyKey || '');
        return descriptor || target;
    };
}
function getPresetConfig(name) {
    const presets = {
        'registration': RedisRateLimiterMiddleware.REGISTRATION_LIMIT,
        'vat': RedisRateLimiterMiddleware.VAT_VERIFICATION_LIMIT,
        'email': RedisRateLimiterMiddleware.EMAIL_CHECK_LIMIT,
        'phone': RedisRateLimiterMiddleware.PHONE_CHECK_LIMIT,
        'login': RedisRateLimiterMiddleware.LOGIN_LIMIT,
        'api': RedisRateLimiterMiddleware.API_GENERAL_LIMIT,
    };
    return presets[name] || RedisRateLimiterMiddleware.API_GENERAL_LIMIT;
}
function createRateLimiter(redisUrl, config) {
    const redis = new ioredis_1.default(redisUrl);
    const logger = new common_1.Logger('RateLimiter');
    const store = new RedisRateLimitStore(redis, config.windowMs);
    return async (req, res, next) => {
        const keyGenerator = config.keyGenerator || ((req) => {
            return req.ip || req.socket?.remoteAddress || 'unknown';
        });
        const key = `${config.keyPrefix || 'ratelimit'}:${keyGenerator(req)}`;
        try {
            const info = await store.incrementSlidingWindow(key, config.maxRequests);
            res.setHeader('X-RateLimit-Limit', info.limit.toString());
            res.setHeader('X-RateLimit-Remaining', info.remaining.toString());
            res.setHeader('X-RateLimit-Reset', info.resetTime.toISOString());
            if (info.current > info.limit) {
                const retryAfter = Math.ceil((info.resetTime.getTime() - Date.now()) / 1000);
                res.setHeader('Retry-After', retryAfter.toString());
                res.status(429).json({
                    success: false,
                    error: 'Too Many Requests',
                    message: `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
                    retryAfter,
                });
                return;
            }
            next();
        }
        catch (error) {
            logger.error('Rate limiter error:', error.message);
            next();
        }
    };
}
async function checkRateLimit(redisUrl, key, config) {
    const redis = new ioredis_1.default(redisUrl);
    const store = new RedisRateLimitStore(redis, config.windowMs);
    try {
        const fullKey = `${config.keyPrefix}:${key}`;
        const info = await store.incrementSlidingWindow(fullKey, config.maxRequests);
        return {
            allowed: info.current <= info.limit,
            info,
        };
    }
    finally {
        await redis.quit();
    }
}
