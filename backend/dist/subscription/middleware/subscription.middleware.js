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
exports.SubscriptionRateLimitMiddleware = exports.SubscriptionMiddleware = void 0;
exports.requireFeature = requireFeature;
const common_1 = require("@nestjs/common");
const feature_access_service_1 = require("../services/feature-access.service");
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
function requireFeature(feature) {
    return async (req, res, next) => {
        const tenantId = req.tenantId;
        if (!tenantId) {
            throw new common_1.ForbiddenException('Tenant ID required');
        }
        next();
    };
}
let SubscriptionRateLimitMiddleware = class SubscriptionRateLimitMiddleware {
    constructor() {
        this.apiCallCounts = new Map();
    }
    async use(req, res, next) {
        const tenantId = req.tenantId;
        if (!tenantId) {
            return next();
        }
        const now = Date.now();
        const key = `${tenantId}:${new Date().toISOString().slice(0, 7)}`;
        const current = this.apiCallCounts.get(key) || { count: 0, resetAt: now + 24 * 60 * 60 * 1000 };
        if (now > current.resetAt) {
            current.count = 0;
            current.resetAt = now + 24 * 60 * 60 * 1000;
        }
        current.count++;
        this.apiCallCounts.set(key, current);
        res.setHeader('X-RateLimit-Limit', '25000');
        res.setHeader('X-RateLimit-Remaining', Math.max(0, 25000 - current.count).toString());
        res.setHeader('X-RateLimit-Reset', new Date(current.resetAt).toISOString());
        next();
    }
};
exports.SubscriptionRateLimitMiddleware = SubscriptionRateLimitMiddleware;
exports.SubscriptionRateLimitMiddleware = SubscriptionRateLimitMiddleware = __decorate([
    (0, common_1.Injectable)()
], SubscriptionRateLimitMiddleware);
