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
exports.SubscriptionService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const prisma_service_1 = require("../../common/services/prisma.service");
const client_1 = require("@prisma/client");
const pricing_config_1 = require("../config/pricing.config");
let SubscriptionService = class SubscriptionService {
    constructor(prisma, configService) {
        this.prisma = prisma;
        this.configService = configService;
    }
    async getSubscription(tenantId) {
        const subscription = await this.prisma.subscription.findUnique({
            where: { tenantId },
            include: { features: true },
        });
        if (!subscription) {
            throw new common_1.NotFoundException('Subscription not found');
        }
        const limits = pricing_config_1.PLAN_LIMITS[subscription.plan];
        const features = subscription.features.map(f => f.feature);
        return {
            id: subscription.id,
            plan: subscription.plan,
            status: subscription.status,
            currentPeriodStart: subscription.currentPeriodStart,
            currentPeriodEnd: subscription.currentPeriodEnd,
            trialEndsAt: subscription.trialEndsAt || undefined,
            aiAddonEnabled: subscription.aiAddonEnabled,
            features,
            limits: {
                maxUsers: limits.maxUsers,
                maxLocations: limits.maxLocations,
                maxApiCallsPerMonth: limits.maxApiCallsPerMonth,
                maxStorageBytes: limits.maxStorageBytes,
            },
            stripe: {
                customerId: subscription.stripeCustomerId || undefined,
                subscriptionId: subscription.stripeSubscriptionId || undefined,
                paymentMethodRequired: subscription.status === client_1.SubscriptionStatus.TRIAL && !subscription.stripeCustomerId,
            },
        };
    }
    async getAllSubscriptions(filters) {
        const where = {};
        if (filters?.status) {
            where.status = filters.status;
        }
        if (filters?.plan) {
            where.plan = filters.plan;
        }
        const subscriptions = await this.prisma.subscription.findMany({
            where,
            include: {
                tenant: {
                    select: {
                        id: true,
                        name: true,
                        slug: true,
                        isActive: true,
                    },
                },
                features: true,
            },
            orderBy: { createdAt: 'desc' },
        });
        return subscriptions;
    }
    async upgradeSubscription(tenantId, request) {
        const currentSub = await this.prisma.subscription.findUnique({
            where: { tenantId },
            include: { features: true },
        });
        if (!currentSub) {
            throw new common_1.NotFoundException('Subscription not found');
        }
        const { newPlan, billingCycle, aiAddon } = request;
        if (newPlan === client_1.SubscriptionPlan.TRIAL) {
            throw new common_1.BadRequestException('Cannot upgrade to trial plan');
        }
        if (currentSub.plan === newPlan &&
            currentSub.aiAddonEnabled === (aiAddon ?? currentSub.aiAddonEnabled)) {
            throw new common_1.BadRequestException('Already on this plan configuration');
        }
        const daysRemaining = Math.ceil((currentSub.currentPeriodEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        const daysInPeriod = 30;
        const proratedAmount = (0, pricing_config_1.calculateProratedAmount)(currentSub.plan, newPlan, billingCycle, daysRemaining, daysInPeriod);
        const isUpgrade = this.isPlanUpgrade(currentSub.plan, newPlan);
        const immediate = isUpgrade;
        await this.prisma.$transaction(async (tx) => {
            await tx.subscriptionChange.create({
                data: {
                    subscriptionId: currentSub.id,
                    tenantId,
                    changeType: isUpgrade ? 'UPGRADE' : 'DOWNGRADE',
                    oldPlan: currentSub.plan,
                    newPlan,
                    oldStatus: currentSub.status,
                    newStatus: currentSub.status,
                    proratedAmount,
                },
            });
            const limits = pricing_config_1.PLAN_LIMITS[newPlan];
            const subscription = await tx.subscription.update({
                where: { tenantId },
                data: {
                    plan: newPlan,
                    maxUsers: limits.maxUsers ?? 999999,
                    maxLocations: limits.maxLocations ?? 999999,
                    apiCallsLimit: limits.maxApiCallsPerMonth,
                    storageLimitBytes: limits.maxStorageBytes,
                    aiAddonEnabled: aiAddon ?? currentSub.aiAddonEnabled,
                    aiAddonPrice: aiAddon ? pricing_config_1.AI_ADDON.monthlyPrice : null,
                    cancelAtPeriodEnd: !isUpgrade,
                },
                include: { features: true },
            });
            await this.syncPlanFeatures(tx, subscription.id, newPlan, aiAddon ?? currentSub.aiAddonEnabled);
            return subscription;
        });
        return {
            subscription: await this.getSubscription(tenantId),
            proratedAmount,
            immediate,
        };
    }
    async downgradeSubscription(tenantId, newPlan) {
        const currentSub = await this.prisma.subscription.findUnique({
            where: { tenantId },
        });
        if (!currentSub) {
            throw new common_1.NotFoundException('Subscription not found');
        }
        if (this.isPlanUpgrade(currentSub.plan, newPlan)) {
            throw new common_1.BadRequestException('Use upgrade endpoint for plan upgrades');
        }
        await this.prisma.subscription.update({
            where: { tenantId },
            data: {
                cancelAtPeriodEnd: true,
                metadata: {
                    ...(currentSub.metadata || {}),
                    scheduledPlan: newPlan,
                },
            },
        });
        await this.prisma.subscriptionChange.create({
            data: {
                subscriptionId: currentSub.id,
                tenantId,
                changeType: 'DOWNGRADE',
                oldPlan: currentSub.plan,
                newPlan,
                oldStatus: currentSub.status,
                newStatus: currentSub.status,
            },
        });
        return {
            subscription: await this.getSubscription(tenantId),
            effectiveDate: currentSub.currentPeriodEnd,
        };
    }
    async toggleAiAddon(tenantId, enabled) {
        const subscription = await this.prisma.subscription.findUnique({
            where: { tenantId },
        });
        if (!subscription) {
            throw new common_1.NotFoundException('Subscription not found');
        }
        if (subscription.plan === client_1.SubscriptionPlan.SMALL && enabled) {
            throw new common_1.BadRequestException('AI Add-on requires Medium plan or higher');
        }
        await this.prisma.$transaction(async (tx) => {
            await tx.subscription.update({
                where: { tenantId },
                data: {
                    aiAddonEnabled: enabled,
                    aiAddonPrice: enabled ? pricing_config_1.AI_ADDON.monthlyPrice : null,
                },
            });
            await tx.subscriptionChange.create({
                data: {
                    subscriptionId: subscription.id,
                    tenantId,
                    changeType: enabled ? 'AI_ADDON_ENABLED' : 'AI_ADDON_DISABLED',
                    oldStatus: subscription.status,
                    newStatus: subscription.status,
                },
            });
            await this.syncPlanFeatures(tx, subscription.id, subscription.plan, enabled);
        });
        return this.getSubscription(tenantId);
    }
    async cancelSubscription(tenantId, immediate = false) {
        const subscription = await this.prisma.subscription.findUnique({
            where: { tenantId },
        });
        if (!subscription) {
            throw new common_1.NotFoundException('Subscription not found');
        }
        const dataRetentionDate = new Date();
        dataRetentionDate.setMonth(dataRetentionDate.getMonth() + 6);
        if (immediate) {
            await this.prisma.subscription.update({
                where: { tenantId },
                data: {
                    status: client_1.SubscriptionStatus.EXPIRED,
                    cancelledAt: new Date(),
                },
            });
        }
        else {
            await this.prisma.subscription.update({
                where: { tenantId },
                data: {
                    cancelAtPeriodEnd: true,
                },
            });
        }
        await this.prisma.subscriptionChange.create({
            data: {
                subscriptionId: subscription.id,
                tenantId,
                changeType: 'CANCEL',
                oldStatus: subscription.status,
                newStatus: immediate ? client_1.SubscriptionStatus.EXPIRED : subscription.status,
            },
        });
        return {
            subscription: await this.getSubscription(tenantId),
            dataRetentionDate,
        };
    }
    async reactivateSubscription(tenantId) {
        const subscription = await this.prisma.subscription.findUnique({
            where: { tenantId },
        });
        if (!subscription) {
            throw new common_1.NotFoundException('Subscription not found');
        }
        if (subscription.status !== client_1.SubscriptionStatus.CANCELLED &&
            subscription.status !== client_1.SubscriptionStatus.EXPIRED) {
            throw new common_1.BadRequestException('Subscription is not cancelled');
        }
        await this.prisma.$transaction(async (tx) => {
            await tx.subscription.update({
                where: { tenantId },
                data: {
                    status: client_1.SubscriptionStatus.ACTIVE,
                    cancelAtPeriodEnd: false,
                    cancelledAt: null,
                    currentPeriodStart: new Date(),
                    currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                },
            });
            await tx.subscriptionChange.create({
                data: {
                    subscriptionId: subscription.id,
                    tenantId,
                    changeType: 'REACTIVATE',
                    oldStatus: subscription.status,
                    newStatus: client_1.SubscriptionStatus.ACTIVE,
                },
            });
        });
        return this.getSubscription(tenantId);
    }
    async adminUpdateSubscription(tenantId, updates) {
        const subscription = await this.prisma.subscription.findUnique({
            where: { tenantId },
        });
        if (!subscription) {
            throw new common_1.NotFoundException('Subscription not found');
        }
        const updateData = {};
        if (updates.plan) {
            const limits = pricing_config_1.PLAN_LIMITS[updates.plan];
            updateData.plan = updates.plan;
            updateData.maxUsers = limits.maxUsers ?? 999999;
            updateData.maxLocations = limits.maxLocations ?? 999999;
            updateData.apiCallsLimit = limits.maxApiCallsPerMonth;
            updateData.storageLimitBytes = limits.maxStorageBytes;
        }
        if (updates.status) {
            updateData.status = updates.status;
        }
        if (updates.aiAddonEnabled !== undefined) {
            updateData.aiAddonEnabled = updates.aiAddonEnabled;
            updateData.aiAddonPrice = updates.aiAddonEnabled ? pricing_config_1.AI_ADDON.monthlyPrice : null;
        }
        if (updates.currentPeriodEnd) {
            updateData.currentPeriodEnd = updates.currentPeriodEnd;
        }
        await this.prisma.subscription.update({
            where: { tenantId },
            data: updateData,
        });
        if (updates.plan || updates.aiAddonEnabled !== undefined) {
            await this.syncPlanFeatures(this.prisma, subscription.id, updates.plan ?? subscription.plan, updates.aiAddonEnabled ?? subscription.aiAddonEnabled);
        }
        return this.getSubscription(tenantId);
    }
    async getSubscriptionAnalytics() {
        const [totalSubscriptions, byPlan, byStatus, trialConversions, revenueEstimate] = await Promise.all([
            this.prisma.subscription.count(),
            this.prisma.subscription.groupBy({
                by: ['plan'],
                _count: { plan: true },
            }),
            this.prisma.subscription.groupBy({
                by: ['status'],
                _count: { status: true },
            }),
            this.prisma.subscription.count({
                where: {
                    plan: { not: client_1.SubscriptionPlan.TRIAL },
                },
            }),
            this.prisma.subscription.aggregate({
                _sum: {
                    aiAddonPrice: true,
                },
            }),
        ]);
        return {
            totalSubscriptions,
            byPlan: byPlan.reduce((acc, item) => {
                acc[item.plan] = item._count.plan;
                return acc;
            }, {}),
            byStatus: byStatus.reduce((acc, item) => {
                acc[item.status] = item._count.status;
                return acc;
            }, {}),
            trialConversions,
            aiAddonRevenue: revenueEstimate._sum.aiAddonPrice || 0,
        };
    }
    async createStripeCheckoutSession(_tenantId, _plan, _billingCycle, _aiAddon, _successUrl, _cancelUrl) {
        throw new common_1.BadRequestException('Stripe is not configured - install stripe package');
    }
    async handleStripeWebhook(_event) {
    }
    isPlanUpgrade(currentPlan, newPlan) {
        const planOrder = [
            client_1.SubscriptionPlan.TRIAL,
            client_1.SubscriptionPlan.SMALL,
            client_1.SubscriptionPlan.MEDIUM,
            client_1.SubscriptionPlan.ENTERPRISE,
        ];
        const currentIndex = planOrder.indexOf(currentPlan);
        const newIndex = planOrder.indexOf(newPlan);
        return newIndex > currentIndex;
    }
    async syncPlanFeatures(tx, subscriptionId, plan, hasAiAddon) {
        const planFeatures = [...pricing_config_1.PLAN_FEATURES[plan]];
        if (hasAiAddon) {
            planFeatures.push(client_1.FeatureFlag.AI_INSPECTIONS, client_1.FeatureFlag.VOICE_ASSISTANT);
        }
        await tx.subscriptionFeature.deleteMany({
            where: { subscriptionId },
        });
        await tx.subscriptionFeature.createMany({
            data: planFeatures.map(feature => ({
                subscriptionId,
                feature,
                enabled: true,
            })),
        });
    }
};
exports.SubscriptionService = SubscriptionService;
exports.SubscriptionService = SubscriptionService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        config_1.ConfigService])
], SubscriptionService);
