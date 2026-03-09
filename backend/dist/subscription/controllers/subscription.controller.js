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
Object.defineProperty(exports, "__esModule", { value: true });
exports.StripeWebhookController = exports.AdminSubscriptionController = exports.SubscriptionController = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const jwt_auth_guard_1 = require("../../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../../auth/guards/roles.guard");
const roles_decorator_1 = require("../../auth/decorators/roles.decorator");
const client_1 = require("@prisma/client");
const roles_guard_2 = require("../../auth/guards/roles.guard");
const subscription_service_1 = require("../services/subscription.service");
const feature_access_service_1 = require("../services/feature-access.service");
const limit_guard_1 = require("../guards/limit.guard");
const pricing_config_1 = require("../config/pricing.config");
class UpgradeSubscriptionDto {
}
class CancelSubscriptionDto {
}
class CreateCheckoutSessionDto {
}
class AdminUpdateSubscriptionDto {
}
let SubscriptionController = class SubscriptionController {
    constructor(subscriptionService, featureAccessService) {
        this.subscriptionService = subscriptionService;
        this.featureAccessService = featureAccessService;
    }
    async getCurrentSubscription(req) {
        return this.subscriptionService.getSubscription(req.tenantId);
    }
    async getUsageStats(req) {
        return this.featureAccessService.getUsageStats(req.tenantId);
    }
    async checkAllLimits(req) {
        return this.featureAccessService.checkAllLimits(req.tenantId);
    }
    async checkFeatureAccess(req, feature) {
        return this.featureAccessService.canAccessFeature(req.tenantId, feature);
    }
    async checkMultipleFeatures(req, features) {
        return this.featureAccessService.canAccessFeatures(req.tenantId, features);
    }
    async upgradeSubscription(req, dto) {
        const request = {
            newPlan: dto.newPlan,
            billingCycle: dto.billingCycle,
            aiAddon: dto.aiAddon,
        };
        return this.subscriptionService.upgradeSubscription(req.tenantId, request);
    }
    async downgradeSubscription(req, newPlan) {
        return this.subscriptionService.downgradeSubscription(req.tenantId, newPlan);
    }
    async toggleAiAddon(req, enabled) {
        return this.subscriptionService.toggleAiAddon(req.tenantId, enabled);
    }
    async cancelSubscription(req, dto) {
        return this.subscriptionService.cancelSubscription(req.tenantId, dto.immediate);
    }
    async reactivateSubscription(req) {
        return this.subscriptionService.reactivateSubscription(req.tenantId);
    }
    async createCheckoutSession(req, dto) {
        return this.subscriptionService.createStripeCheckoutSession(req.tenantId, dto.plan, dto.billingCycle, dto.aiAddon ?? false, dto.successUrl, dto.cancelUrl);
    }
    async getPricingInfo() {
        return {
            plans: Object.values(client_1.SubscriptionPlan)
                .filter(p => p !== client_1.SubscriptionPlan.TRIAL)
                .map(plan => ({
                ...pricing_config_1.PLAN_PRICING[plan],
                id: plan,
                monthlyPriceFormatted: (0, pricing_config_1.getFormattedPrice)(plan, 'monthly'),
                yearlyPriceFormatted: (0, pricing_config_1.getFormattedPrice)(plan, 'yearly'),
            })),
            aiAddon: {
                ...pricing_config_1.AI_ADDON,
                monthlyPriceFormatted: new Intl.NumberFormat('it-IT', {
                    style: 'currency',
                    currency: 'EUR',
                }).format(pricing_config_1.AI_ADDON.monthlyPrice),
                yearlyPriceFormatted: new Intl.NumberFormat('it-IT', {
                    style: 'currency',
                    currency: 'EUR',
                }).format(pricing_config_1.AI_ADDON.yearlyPrice / 12),
            },
        };
    }
    async getPlanFeatures(plan) {
        return {
            plan,
            features: pricing_config_1.PLAN_FEATURES[plan] || [],
        };
    }
    async comparePlans() {
        const plans = [client_1.SubscriptionPlan.SMALL, client_1.SubscriptionPlan.MEDIUM, client_1.SubscriptionPlan.ENTERPRISE];
        return {
            comparison: plans.map(plan => ({
                plan,
                name: pricing_config_1.PLAN_PRICING[plan].name,
                nameIt: pricing_config_1.PLAN_PRICING[plan].nameIt,
                price: {
                    monthly: (0, pricing_config_1.getFormattedPrice)(plan, 'monthly'),
                    yearly: (0, pricing_config_1.getFormattedPrice)(plan, 'yearly'),
                },
                features: pricing_config_1.PLAN_FEATURES[plan] || [],
            })),
        };
    }
};
exports.SubscriptionController = SubscriptionController;
__decorate([
    (0, common_1.Get)('current'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SubscriptionController.prototype, "getCurrentSubscription", null);
__decorate([
    (0, common_1.Get)('usage'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SubscriptionController.prototype, "getUsageStats", null);
__decorate([
    (0, common_1.Get)('limits'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SubscriptionController.prototype, "checkAllLimits", null);
__decorate([
    (0, common_1.Get)('features/:feature'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('feature')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], SubscriptionController.prototype, "checkFeatureAccess", null);
__decorate([
    (0, common_1.Post)('features/check'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Array]),
    __metadata("design:returntype", Promise)
], SubscriptionController.prototype, "checkMultipleFeatures", null);
__decorate([
    (0, common_1.Post)('upgrade'),
    (0, limit_guard_1.CheckLimit)('apiCall'),
    (0, common_1.UseGuards)(limit_guard_1.LimitGuard),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, UpgradeSubscriptionDto]),
    __metadata("design:returntype", Promise)
], SubscriptionController.prototype, "upgradeSubscription", null);
__decorate([
    (0, common_1.Post)('downgrade'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)('newPlan')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], SubscriptionController.prototype, "downgradeSubscription", null);
__decorate([
    (0, common_1.Post)('ai-addon'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)('enabled')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Boolean]),
    __metadata("design:returntype", Promise)
], SubscriptionController.prototype, "toggleAiAddon", null);
__decorate([
    (0, common_1.Post)('cancel'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, CancelSubscriptionDto]),
    __metadata("design:returntype", Promise)
], SubscriptionController.prototype, "cancelSubscription", null);
__decorate([
    (0, common_1.Post)('reactivate'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SubscriptionController.prototype, "reactivateSubscription", null);
__decorate([
    (0, common_1.Post)('checkout-session'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, CreateCheckoutSessionDto]),
    __metadata("design:returntype", Promise)
], SubscriptionController.prototype, "createCheckoutSession", null);
__decorate([
    (0, common_1.Get)('pricing'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SubscriptionController.prototype, "getPricingInfo", null);
__decorate([
    (0, common_1.Get)('pricing/:plan/features'),
    __param(0, (0, common_1.Param)('plan')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SubscriptionController.prototype, "getPlanFeatures", null);
__decorate([
    (0, common_1.Get)('pricing/compare'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SubscriptionController.prototype, "comparePlans", null);
exports.SubscriptionController = SubscriptionController = __decorate([
    (0, common_1.Controller)('subscription'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [subscription_service_1.SubscriptionService,
        feature_access_service_1.FeatureAccessService])
], SubscriptionController);
let AdminSubscriptionController = class AdminSubscriptionController {
    constructor(subscriptionService, featureAccessService) {
        this.subscriptionService = subscriptionService;
        this.featureAccessService = featureAccessService;
    }
    async getAllSubscriptions(status, plan) {
        return this.subscriptionService.getAllSubscriptions({ status, plan });
    }
    async getAnalytics() {
        return this.subscriptionService.getSubscriptionAnalytics();
    }
    async getSubscriptionByTenant(tenantId) {
        return this.subscriptionService.getSubscription(tenantId);
    }
    async updateSubscription(tenantId, dto) {
        return this.subscriptionService.adminUpdateSubscription(tenantId, dto);
    }
    async getTenantUsage(tenantId) {
        return this.featureAccessService.getUsageStats(tenantId);
    }
    async syncFeatures(tenantId) {
        const subscription = await this.subscriptionService.getSubscription(tenantId);
        return { message: 'Features synced', subscription };
    }
};
exports.AdminSubscriptionController = AdminSubscriptionController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('status')),
    __param(1, (0, common_1.Query)('plan')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], AdminSubscriptionController.prototype, "getAllSubscriptions", null);
__decorate([
    (0, common_1.Get)('analytics'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminSubscriptionController.prototype, "getAnalytics", null);
__decorate([
    (0, common_1.Get)(':tenantId'),
    __param(0, (0, common_1.Param)('tenantId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminSubscriptionController.prototype, "getSubscriptionByTenant", null);
__decorate([
    (0, common_1.Put)(':tenantId'),
    __param(0, (0, common_1.Param)('tenantId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, AdminUpdateSubscriptionDto]),
    __metadata("design:returntype", Promise)
], AdminSubscriptionController.prototype, "updateSubscription", null);
__decorate([
    (0, common_1.Get)(':tenantId/usage'),
    __param(0, (0, common_1.Param)('tenantId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminSubscriptionController.prototype, "getTenantUsage", null);
__decorate([
    (0, common_1.Post)(':tenantId/sync-features'),
    __param(0, (0, common_1.Param)('tenantId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminSubscriptionController.prototype, "syncFeatures", null);
exports.AdminSubscriptionController = AdminSubscriptionController = __decorate([
    (0, common_1.Controller)('admin/subscriptions'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(roles_guard_2.UserRole.ADMIN),
    __metadata("design:paramtypes", [subscription_service_1.SubscriptionService,
        feature_access_service_1.FeatureAccessService])
], AdminSubscriptionController);
let StripeWebhookController = class StripeWebhookController {
    constructor(subscriptionService, configService) {
        this.subscriptionService = subscriptionService;
        this.configService = configService;
    }
    async handleWebhook(signature, payload) {
        if (!signature) {
            throw new common_1.BadRequestException('Missing stripe-signature header');
        }
        if (!payload || Object.keys(payload).length === 0) {
            throw new common_1.BadRequestException('Missing webhook payload');
        }
        return { received: true };
    }
};
exports.StripeWebhookController = StripeWebhookController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Headers)('stripe-signature')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], StripeWebhookController.prototype, "handleWebhook", null);
exports.StripeWebhookController = StripeWebhookController = __decorate([
    (0, common_1.Controller)('webhooks/stripe'),
    __metadata("design:paramtypes", [subscription_service_1.SubscriptionService,
        config_1.ConfigService])
], StripeWebhookController);
