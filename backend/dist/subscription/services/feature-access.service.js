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
exports.FeatureAccessService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/services/prisma.service");
const client_1 = require("@prisma/client");
const pricing_config_1 = require("../config/pricing.config");
let FeatureAccessService = class FeatureAccessService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async canAccessFeature(tenantId, feature) {
        const subscription = await this.prisma.subscription.findUnique({
            where: { tenantId },
            include: { features: true },
        });
        if (!subscription) {
            return {
                allowed: false,
                reason: 'No subscription found',
            };
        }
        if (!this.isSubscriptionActive(subscription.status)) {
            return {
                allowed: false,
                reason: `Subscription is ${subscription.status.toLowerCase()}`,
            };
        }
        const featureEnabled = subscription.features.find(f => f.feature === feature && f.enabled);
        const planFeatures = (0, pricing_config_1.getFeaturesForPlan)(subscription.plan, subscription.aiAddonEnabled);
        const featureInPlan = planFeatures.includes(feature);
        const requiresAiAddon = pricing_config_1.AI_ADDON_FEATURES.includes(feature);
        if (requiresAiAddon && !subscription.aiAddonEnabled && !featureEnabled) {
            return {
                allowed: false,
                reason: 'This feature requires the AI Add-on',
                requiresAiAddon: true,
                requiredPlan: client_1.SubscriptionPlan.MEDIUM,
            };
        }
        if (featureEnabled || featureInPlan) {
            return { allowed: true };
        }
        const requiredPlan = this.getMinimumPlanForFeature(feature);
        return {
            allowed: false,
            reason: `This feature is not available in your current plan. Upgrade to ${requiredPlan} to access it.`,
            requiredPlan,
        };
    }
    async canAccessFeatures(tenantId, features) {
        const results = await Promise.all(features.map(async (feature) => ({
            feature,
            check: await this.canAccessFeature(tenantId, feature),
        })));
        return results.reduce((acc, { feature, check }) => {
            acc[feature] = check;
            return acc;
        }, {});
    }
    async assertCanAccessFeature(tenantId, feature) {
        const check = await this.canAccessFeature(tenantId, feature);
        if (!check.allowed) {
            throw new common_1.ForbiddenException({
                message: check.reason,
                feature,
                requiredPlan: check.requiredPlan,
                requiresAiAddon: check.requiresAiAddon,
                code: 'FEATURE_NOT_AVAILABLE',
            });
        }
    }
    async checkAllLimits(tenantId) {
        const subscription = await this.prisma.subscription.findUnique({
            where: { tenantId },
        });
        if (!subscription) {
            throw new common_1.ForbiddenException('No subscription found');
        }
        const limits = pricing_config_1.PLAN_LIMITS[subscription.plan];
        const currentUsage = await this.getCurrentUsage(tenantId);
        return {
            users: this.checkLimit(currentUsage.users, limits.maxUsers),
            locations: this.checkLimit(currentUsage.locations, limits.maxLocations),
            apiCalls: this.checkLimit(subscription.apiCallsUsed, limits.maxApiCallsPerMonth),
            storage: this.checkLimit(Number(subscription.storageUsedBytes), limits.maxStorageBytes ? Number(limits.maxStorageBytes) : null),
            customers: this.checkLimit(currentUsage.customers, limits.maxCustomers),
            inspections: this.checkLimit(currentUsage.inspectionsThisMonth, limits.maxInspectionsPerMonth),
        };
    }
    async checkSpecificLimit(tenantId, limitType) {
        const subscription = await this.prisma.subscription.findUnique({
            where: { tenantId },
        });
        if (!subscription) {
            throw new common_1.ForbiddenException('No subscription found');
        }
        const limits = pricing_config_1.PLAN_LIMITS[subscription.plan];
        const limit = limits[limitType];
        let current;
        switch (limitType) {
            case 'maxUsers':
                current = await this.prisma.user.count({ where: { tenantId } });
                break;
            case 'maxLocations':
                current = await this.prisma.location.count({ where: { tenantId } });
                break;
            case 'maxApiCallsPerMonth':
                current = subscription.apiCallsUsed;
                break;
            case 'maxStorageBytes':
                current = Number(subscription.storageUsedBytes);
                break;
            case 'maxCustomers':
                current = await this.prisma.customer.count({ where: { tenantId } });
                break;
            case 'maxInspectionsPerMonth':
                current = await this.getInspectionsCountThisMonth(tenantId);
                break;
            default:
                throw new Error(`Unknown limit type: ${limitType}`);
        }
        return this.checkLimit(current, limit);
    }
    async canAddResource(tenantId, resourceType) {
        const limitTypeMap = {
            user: 'maxUsers',
            location: 'maxLocations',
            customer: 'maxCustomers',
        };
        const check = await this.checkSpecificLimit(tenantId, limitTypeMap[resourceType]);
        const simulatedCheck = {
            ...check,
            current: check.current + 1,
            remaining: check.limit !== null ? Math.max(0, check.limit - check.current - 1) : Infinity,
            withinLimit: check.limit === null || check.current + 1 <= check.limit,
            percentageUsed: check.limit !== null
                ? ((check.current + 1) / check.limit) * 100
                : 0,
        };
        return simulatedCheck;
    }
    async assertWithinLimit(tenantId, limitType) {
        const check = await this.checkSpecificLimit(tenantId, limitType);
        if (!check.withinLimit) {
            const resourceName = this.getResourceNameFromLimitType(limitType);
            throw new common_1.ForbiddenException({
                message: `You have reached your ${resourceName} limit. Please upgrade your plan to add more.`,
                limit: check.limit,
                current: check.current,
                code: 'LIMIT_EXCEEDED',
            });
        }
    }
    async recordApiCall(tenantId, endpoint, bytesTransferred = 0) {
        await this.prisma.$transaction(async (tx) => {
            await tx.subscription.update({
                where: { tenantId },
                data: {
                    apiCallsUsed: { increment: 1 },
                    storageUsedBytes: bytesTransferred > 0
                        ? { increment: BigInt(bytesTransferred) }
                        : undefined,
                },
            });
            const now = new Date();
            await tx.usageTracking.upsert({
                where: {
                    tenantId_year_month: {
                        tenantId,
                        year: now.getFullYear(),
                        month: now.getMonth() + 1,
                    },
                },
                update: {
                    apiCallsTotal: { increment: 1 },
                    apiCallsBreakdown: {},
                },
                create: {
                    tenantId,
                    year: now.getFullYear(),
                    month: now.getMonth() + 1,
                    apiCallsTotal: 1,
                    apiCallsBreakdown: { [endpoint]: 1 },
                },
            });
        });
    }
    async getUsageStats(tenantId) {
        const [subscription, currentUsage] = await Promise.all([
            this.prisma.subscription.findUnique({ where: { tenantId } }),
            this.getCurrentUsage(tenantId),
        ]);
        if (!subscription) {
            throw new common_1.ForbiddenException('No subscription found');
        }
        const limits = pricing_config_1.PLAN_LIMITS[subscription.plan];
        return {
            plan: subscription.plan,
            status: subscription.status,
            aiAddonEnabled: subscription.aiAddonEnabled,
            period: {
                start: subscription.currentPeriodStart,
                end: subscription.currentPeriodEnd,
                daysRemaining: Math.ceil((subscription.currentPeriodEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
            },
            usage: {
                users: {
                    current: currentUsage.users,
                    limit: limits.maxUsers,
                    percentage: limits.maxUsers ? (currentUsage.users / limits.maxUsers) * 100 : 0,
                },
                locations: {
                    current: currentUsage.locations,
                    limit: limits.maxLocations,
                    percentage: limits.maxLocations ? (currentUsage.locations / limits.maxLocations) * 100 : 0,
                },
                apiCalls: {
                    current: subscription.apiCallsUsed,
                    limit: limits.maxApiCallsPerMonth,
                    percentage: limits.maxApiCallsPerMonth
                        ? (subscription.apiCallsUsed / limits.maxApiCallsPerMonth) * 100
                        : 0,
                },
                storage: {
                    current: Number(subscription.storageUsedBytes),
                    limit: limits.maxStorageBytes ? Number(limits.maxStorageBytes) : null,
                    percentage: limits.maxStorageBytes
                        ? (Number(subscription.storageUsedBytes) / Number(limits.maxStorageBytes)) * 100
                        : 0,
                },
                customers: {
                    current: currentUsage.customers,
                    limit: limits.maxCustomers,
                    percentage: limits.maxCustomers ? (currentUsage.customers / limits.maxCustomers) * 100 : 0,
                },
                inspections: {
                    current: currentUsage.inspectionsThisMonth,
                    limit: limits.maxInspectionsPerMonth,
                    percentage: limits.maxInspectionsPerMonth
                        ? (currentUsage.inspectionsThisMonth / limits.maxInspectionsPerMonth) * 100
                        : 0,
                },
            },
        };
    }
    isSubscriptionActive(status) {
        return [
            client_1.SubscriptionStatus.ACTIVE,
            client_1.SubscriptionStatus.TRIAL,
            client_1.SubscriptionStatus.PAST_DUE,
        ].includes(status);
    }
    getMinimumPlanForFeature(feature) {
        const plans = [
            client_1.SubscriptionPlan.SMALL,
            client_1.SubscriptionPlan.MEDIUM,
            client_1.SubscriptionPlan.ENTERPRISE,
        ];
        for (const plan of plans) {
            if (pricing_config_1.PLAN_FEATURES[plan].includes(feature)) {
                return plan;
            }
        }
        return client_1.SubscriptionPlan.ENTERPRISE;
    }
    checkLimit(current, limit) {
        if (limit === null) {
            return {
                withinLimit: true,
                current,
                limit: null,
                remaining: Infinity,
                percentageUsed: 0,
                warningLevel: 'none',
            };
        }
        const percentageUsed = (current / limit) * 100;
        const remaining = Math.max(0, limit - current);
        let warningLevel = 'none';
        if (percentageUsed >= 95) {
            warningLevel = 'critical';
        }
        else if (percentageUsed >= 80) {
            warningLevel = 'warning';
        }
        return {
            withinLimit: current <= limit,
            current,
            limit,
            remaining,
            percentageUsed,
            warningLevel,
        };
    }
    async getCurrentUsage(tenantId) {
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);
        const [users, locations, customers, inspectionsThisMonth] = await Promise.all([
            this.prisma.user.count({ where: { tenantId } }),
            this.prisma.location.count({ where: { tenantId, isActive: true } }),
            this.prisma.customer.count({ where: { tenantId } }),
            this.prisma.inspection.count({
                where: {
                    tenantId,
                    startedAt: { gte: startOfMonth },
                },
            }),
        ]);
        return {
            users,
            locations,
            customers,
            inspectionsThisMonth,
        };
    }
    async getInspectionsCountThisMonth(tenantId) {
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);
        return this.prisma.inspection.count({
            where: {
                tenantId,
                startedAt: { gte: startOfMonth },
            },
        });
    }
    getResourceNameFromLimitType(limitType) {
        const mapping = {
            maxUsers: 'user',
            maxLocations: 'location',
            maxApiCallsPerMonth: 'API call',
            maxStorageBytes: 'storage',
            maxCustomers: 'customer',
            maxInspectionsPerMonth: 'inspection',
        };
        return mapping[limitType] || 'resource';
    }
};
exports.FeatureAccessService = FeatureAccessService;
exports.FeatureAccessService = FeatureAccessService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], FeatureAccessService);
