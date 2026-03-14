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
var SubscriptionRateLimitMiddleware_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubscriptionRateLimitMiddleware = exports.SubscriptionMiddleware = void 0;
exports.requireFeature = requireFeature;
const common_1 = require("@nestjs/common");
const feature_access_service_1 = require("../services/feature-access.service");
const redis_service_1 = require("../../common/services/redis.service");
let SubscriptionMiddleware = class SubscriptionMiddleware {
    constructor(featureAccessService) {
        this.featureAccessService = featureAccessService;
    }
    async use(req, res, next) {
        const tenantId = req.tenantId;
        if (!tenantId) {
            return next();
        }
        try {
            const usageStats = await this.featureAccessService.getUsageStats(tenantId);
            req.subscription = {
                plan: usageStats.plan,
                status: usageStats.status,
                features: Object.keys(usageStats.usage),
            };
        }
        catch {
        }
        next();
    }
};
exports.SubscriptionMiddleware = SubscriptionMiddleware;
exports.SubscriptionMiddleware = SubscriptionMiddleware = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [feature_access_service_1.FeatureAccessService])
], SubscriptionMiddleware);
function requireFeature(_feature) {
    return async (req, res, next) => {
        const tenantId = req.tenantId;
        if (!tenantId) {
            throw new common_1.ForbiddenException('Tenant ID required');
        }
        next();
    };
}
let SubscriptionRateLimitMiddleware = SubscriptionRateLimitMiddleware_1 = class SubscriptionRateLimitMiddleware {
    constructor(redis) {
        this.redis = redis;
    }
    async use(req, res, next) {
        const tenantId = req.tenantId;
        if (!tenantId) {
            return next();
        }
        const monthKey = new Date().toISOString().slice(0, 7);
        const redisKey = `rate:monthly:${tenantId}:${monthKey}`;
        const currentStr = await this.redis.get(redisKey);
        const currentCount = currentStr ? parseInt(currentStr, 10) : 0;
        const newCount = currentCount + 1;
        const now = new Date();
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        const ttlSeconds = Math.ceil((endOfMonth.getTime() - now.getTime()) / 1000);
        await this.redis.set(redisKey, newCount.toString(), ttlSeconds);
        const limit = SubscriptionRateLimitMiddleware_1.DEFAULT_MONTHLY_LIMIT;
        res.setHeader('X-RateLimit-Limit', limit.toString());
        res.setHeader('X-RateLimit-Remaining', Math.max(0, limit - newCount).toString());
        res.setHeader('X-RateLimit-Reset', endOfMonth.toISOString());
        next();
    }
};
exports.SubscriptionRateLimitMiddleware = SubscriptionRateLimitMiddleware;
SubscriptionRateLimitMiddleware.DEFAULT_MONTHLY_LIMIT = 25000;
exports.SubscriptionRateLimitMiddleware = SubscriptionRateLimitMiddleware = SubscriptionRateLimitMiddleware_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [redis_service_1.RedisService])
], SubscriptionRateLimitMiddleware);
