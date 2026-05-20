/**
 * FEATURE ACCESS SERVICE
 *
 * Centralized feature gating for MechMind OS
 * Provides methods to check if a tenant can access specific features
 */

import { Injectable, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/services/prisma.service';
import { SubscriptionPlan, FeatureFlag, SubscriptionStatus } from '@prisma/client';
import {
  PLAN_FEATURES,
  AI_ADDON_FEATURES,
  PLAN_LIMITS,
  getFeaturesForPlan,
  PlanLimits,
} from '../config/pricing.config';

export interface FeatureAccessCheck {
  allowed: boolean;
  reason?: string;
  requiredPlan?: SubscriptionPlan;
  requiresAiAddon?: boolean;
}

export interface LimitCheck {
  withinLimit: boolean;
  current: number;
  limit: number | null;
  remaining: number;
  percentageUsed: number;
  warningLevel?: 'none' | 'warning' | 'critical';
}

export interface UsageStatus {
  users: LimitCheck;
  locations: LimitCheck;
  apiCalls: LimitCheck;
  storage: LimitCheck;
  customers: LimitCheck;
  inspections: LimitCheck;
}

@Injectable()
export class FeatureAccessService {
  constructor(private readonly prisma: PrismaService) {}

  // ==========================================
  // FEATURE ACCESS CHECKS
  // ==========================================

  /**
   * Check if a tenant can access a specific feature
   */
  async canAccessFeature(tenantId: string, feature: FeatureFlag): Promise<FeatureAccessCheck> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { tenantId },
      include: { features: true },
    });

    if (!subscription) {
      return {
        allowed: false,
        // eslint-disable-next-line sonarjs/no-duplicate-string
        reason: 'No subscription found',
      };
    }

    // Check if subscription is active
    if (!this.isSubscriptionActive(subscription.status)) {
      return {
        allowed: false,
        reason: `Subscription is ${subscription.status.toLowerCase()}`,
      };
    }

    // Check if feature is explicitly enabled in subscription
    const featureEnabled = subscription.features.find(f => f.feature === feature && f.enabled);

    // Check if feature is included in plan
    const planFeatures = getFeaturesForPlan(subscription.plan, subscription.aiAddonEnabled);
    const featureInPlan = planFeatures.includes(feature);

    // Special case: AI features require AI add-on
    const requiresAiAddon = AI_ADDON_FEATURES.includes(feature);
    if (requiresAiAddon && !subscription.aiAddonEnabled && !featureEnabled) {
      return {
        allowed: false,
        reason: 'This feature requires the AI Add-on',
        requiresAiAddon: true,
        requiredPlan: SubscriptionPlan.MEDIUM,
      };
    }

    // If feature is explicitly enabled or in plan features
    if (featureEnabled || featureInPlan) {
      return { allowed: true };
    }

    // Feature not available in current plan
    const requiredPlan = this.getMinimumPlanForFeature(feature);
    return {
      allowed: false,
      reason: `This feature is not available in your current plan. Upgrade to ${requiredPlan} to access it.`,
      requiredPlan,
    };
  }

  /**
   * Check multiple features at once
   */
  async canAccessFeatures(
    tenantId: string,
    features: FeatureFlag[],
  ): Promise<Record<FeatureFlag, FeatureAccessCheck>> {
    const results = await Promise.all(
      features.map(async feature => ({
        feature,
        check: await this.canAccessFeature(tenantId, feature),
      })),
    );

    return results.reduce(
      (acc, { feature, check }) => {
        // eslint-disable-next-line security/detect-object-injection
        acc[feature] = check;
        return acc;
      },
      {} as Record<string, FeatureAccessCheck>,
    ) as Record<FeatureFlag, FeatureAccessCheck>;
  }

  /**
   * Assert that a tenant can access a feature (throws if not)
   */
  async assertCanAccessFeature(tenantId: string, feature: FeatureFlag): Promise<void> {
    const check = await this.canAccessFeature(tenantId, feature);

    if (!check.allowed) {
      throw new ForbiddenException({
        message: check.reason,
        feature,
        requiredPlan: check.requiredPlan,
        requiresAiAddon: check.requiresAiAddon,
        code: 'FEATURE_NOT_AVAILABLE',
      });
    }
  }

  // ==========================================
  // LIMIT CHECKS
  // ==========================================

  /**
   * Check if tenant is within all limits
   */
  async checkAllLimits(tenantId: string): Promise<UsageStatus> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { tenantId },
    });

    if (!subscription) {
      throw new ForbiddenException('No subscription found');
    }

    const limits = PLAN_LIMITS[subscription.plan];
    const currentUsage = await this.getCurrentUsage(tenantId);

    return {
      users: this.checkLimit(currentUsage.users, limits.maxUsers),
      locations: this.checkLimit(currentUsage.locations, limits.maxLocations),
      apiCalls: this.checkLimit(subscription.apiCallsUsed, limits.maxApiCallsPerMonth),
      storage: this.checkLimit(
        Number(subscription.storageUsedBytes),
        limits.maxStorageBytes ? Number(limits.maxStorageBytes) : null,
      ),
      customers: this.checkLimit(currentUsage.customers, limits.maxCustomers),
      inspections: this.checkLimit(
        currentUsage.inspectionsThisMonth,
        limits.maxInspectionsPerMonth,
      ),
    };
  }

  /**
   * Check a specific limit
   */
  async checkSpecificLimit(tenantId: string, limitType: keyof PlanLimits): Promise<LimitCheck> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { tenantId },
    });

    if (!subscription) {
      throw new ForbiddenException('No subscription found');
    }

    const limits = PLAN_LIMITS[subscription.plan];
    // eslint-disable-next-line security/detect-object-injection
    const limit = limits[limitType];

    let current: number;
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
        throw new BadRequestException(`Unknown limit type: ${limitType}`);
    }

    return this.checkLimit(current, limit);
  }

  /**
   * Check if adding one more would exceed limit
   */
  async canAddResource(
    tenantId: string,
    resourceType: 'user' | 'location' | 'customer',
  ): Promise<LimitCheck> {
    const limitTypeMap: Record<string, keyof PlanLimits> = {
      user: 'maxUsers',
      location: 'maxLocations',
      customer: 'maxCustomers',
    };

    // eslint-disable-next-line security/detect-object-injection
    const check = await this.checkSpecificLimit(tenantId, limitTypeMap[resourceType]);

    // Simulate adding one more
    const simulatedCheck: LimitCheck = {
      ...check,
      current: check.current + 1,
      remaining: check.limit !== null ? Math.max(0, check.limit - check.current - 1) : Infinity,
      withinLimit: check.limit === null || check.current + 1 <= check.limit,
      percentageUsed: check.limit !== null ? ((check.current + 1) / check.limit) * 100 : 0,
    };

    return simulatedCheck;
  }

  /**
   * Assert that tenant is within a specific limit
   */
  async assertWithinLimit(tenantId: string, limitType: keyof PlanLimits): Promise<void> {
    const check = await this.checkSpecificLimit(tenantId, limitType);

    if (!check.withinLimit) {
      const resourceName = this.getResourceNameFromLimitType(limitType);
      throw new ForbiddenException({
        message: `You have reached your ${resourceName} limit. Please upgrade your plan to add more.`,
        limit: check.limit,
        current: check.current,
        code: 'LIMIT_EXCEEDED',
      });
    }
  }

  // ==========================================
  // USAGE TRACKING
  // ==========================================

  /**
   * Record an API call for usage tracking
   */
  async recordApiCall(
    tenantId: string,
    endpoint: string,
    bytesTransferred: number = 0,
  ): Promise<void> {
    await this.prisma.$transaction(async tx => {
      // Update subscription counters
      await tx.subscription.update({
        where: { tenantId },
        data: {
          apiCallsUsed: { increment: 1 },
          storageUsedBytes:
            bytesTransferred > 0 ? { increment: BigInt(bytesTransferred) } : undefined,
        },
      });

      // Update or create monthly usage record
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
          apiCallsBreakdown: {
            // Use raw query for JSON manipulation or handle in app code
          },
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

  /**
   * Get current usage statistics
   */
  async getUsageStats(tenantId: string) {
    const [subscription, currentUsage] = await Promise.all([
      this.prisma.subscription.findUnique({ where: { tenantId } }),
      this.getCurrentUsage(tenantId),
    ]);

    if (!subscription) {
      throw new ForbiddenException('No subscription found');
    }

    const limits = PLAN_LIMITS[subscription.plan];

    return {
      plan: subscription.plan,
      status: subscription.status,
      aiAddonEnabled: subscription.aiAddonEnabled,
      period: {
        start: subscription.currentPeriodStart,
        end: subscription.currentPeriodEnd,
        daysRemaining: Math.ceil(
          (subscription.currentPeriodEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
        ),
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
          percentage: limits.maxLocations
            ? (currentUsage.locations / limits.maxLocations) * 100
            : 0,
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
          percentage: limits.maxCustomers
            ? (currentUsage.customers / limits.maxCustomers) * 100
            : 0,
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

  // ==========================================
  // PRIVATE HELPERS
  // ==========================================

  private isSubscriptionActive(status: SubscriptionStatus): boolean {
    return (
      [
        SubscriptionStatus.ACTIVE,
        SubscriptionStatus.TRIAL,
        SubscriptionStatus.PAST_DUE,
      ] as SubscriptionStatus[]
    ).includes(status);
  }

  private getMinimumPlanForFeature(feature: FeatureFlag): SubscriptionPlan {
    // Find the cheapest plan that includes this feature
    const plans: SubscriptionPlan[] = [
      SubscriptionPlan.SMALL,
      SubscriptionPlan.MEDIUM,
      SubscriptionPlan.ENTERPRISE,
    ];

    for (const plan of plans) {
      // eslint-disable-next-line security/detect-object-injection
      if (PLAN_FEATURES[plan].includes(feature)) {
        return plan;
      }
    }

    return SubscriptionPlan.ENTERPRISE;
  }

  private checkLimit(current: number, limit: number | null): LimitCheck {
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

    let warningLevel: 'none' | 'warning' | 'critical' = 'none';
    if (percentageUsed >= 95) {
      warningLevel = 'critical';
    } else if (percentageUsed >= 80) {
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

  private async getCurrentUsage(tenantId: string): Promise<{
    users: number;
    locations: number;
    customers: number;
    inspectionsThisMonth: number;
  }> {
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

  private async getInspectionsCountThisMonth(tenantId: string): Promise<number> {
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

  private getResourceNameFromLimitType(limitType: keyof PlanLimits): string {
    const mapping: Record<string, string> = {
      maxUsers: 'user',
      maxLocations: 'location',
      maxApiCallsPerMonth: 'API call',
      maxStorageBytes: 'storage',
      maxCustomers: 'customer',
      maxInspectionsPerMonth: 'inspection',
    };

    return mapping[limitType as string] || 'resource';
  }
}
