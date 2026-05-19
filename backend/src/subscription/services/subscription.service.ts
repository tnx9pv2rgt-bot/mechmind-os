/**
 * SUBSCRIPTION SERVICE
 *
 * Handles subscription management, upgrades, downgrades, and Stripe integration
 */

import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { PrismaService } from '../../common/services/prisma.service';
import { SubscriptionPlan, SubscriptionStatus, FeatureFlag, Prisma } from '@prisma/client';
import {
  AI_ADDON,
  PLAN_LIMITS,
  PLAN_FEATURES,
  PLAN_PRICING,
  calculateProratedAmount,
} from '../config/pricing.config';

export interface CreateSubscriptionDto {
  tenantId: string;
  plan: SubscriptionPlan;
  billingCycle: 'monthly' | 'yearly';
  promoCode?: string;
  aiAddon?: boolean;
}

export interface UpgradeRequest {
  newPlan: SubscriptionPlan;
  billingCycle: 'monthly' | 'yearly';
  aiAddon?: boolean;
}

export interface SubscriptionResponse {
  id: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  trialEndsAt?: Date;
  aiAddonEnabled: boolean;
  features: FeatureFlag[];
  limits: {
    maxUsers: number | null;
    maxLocations: number | null;
    maxApiCallsPerMonth: number | null;
    maxStorageBytes: number | null;
  };
  stripe: {
    customerId?: string;
    subscriptionId?: string;
    paymentMethodRequired: boolean;
  };
}

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);
  private readonly stripe: Stripe | undefined;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    const stripeKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (stripeKey) {
      this.stripe = new Stripe(stripeKey, { apiVersion: '2026-02-25.clover' });
    }
  }

  private getStripe(): Stripe {
    if (!this.stripe) {
      throw new BadRequestException('Stripe non configurato: impostare STRIPE_SECRET_KEY');
    }
    return this.stripe;
  }

  // ==========================================
  // SUBSCRIPTION RETRIEVAL
  // ==========================================

  async getSubscription(tenantId: string): Promise<SubscriptionResponse> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { tenantId },
      include: { features: true },
    });

    if (!subscription) {
      // eslint-disable-next-line sonarjs/no-duplicate-string
      throw new NotFoundException('Subscription not found');
    }

    const limits = PLAN_LIMITS[subscription.plan];
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
        paymentMethodRequired:
          subscription.status === SubscriptionStatus.TRIAL && !subscription.stripeCustomerId,
      },
    };
  }

  async getAllSubscriptions(filters?: {
    status?: SubscriptionStatus;
    plan?: SubscriptionPlan;
    page?: number;
    limit?: number;
  }): Promise<{
    data: Awaited<ReturnType<PrismaService['subscription']['findMany']>>;
    total: number;
    page: number;
    limit: number;
    pages: number;
  }> {
    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 20;
    const where: Prisma.SubscriptionWhereInput = {};

    if (filters?.status) {
      where.status = filters.status;
    }
    if (filters?.plan) {
      where.plan = filters.plan;
    }

    const [data, total] = await Promise.all([
      this.prisma.subscription.findMany({
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
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.subscription.count({ where }),
    ]);

    const serializedData = data.map(sub => this.serializeBigIntFields(sub));

    return { data: serializedData, total, page, limit, pages: Math.ceil(total / limit) };
  }

  // ==========================================
  // UPGRADE / DOWNGRADE
  // ==========================================

  async upgradeSubscription(
    tenantId: string,
    request: UpgradeRequest,
  ): Promise<{
    subscription: SubscriptionResponse;
    proratedAmount: number;
    immediate: boolean;
  }> {
    const currentSub = await this.prisma.subscription.findUnique({
      where: { tenantId },
      include: { features: true },
    });

    if (!currentSub) {
      throw new NotFoundException('Subscription not found');
    }

    const { newPlan, billingCycle, aiAddon } = request;

    // Validate upgrade
    if (newPlan === SubscriptionPlan.TRIAL) {
      throw new BadRequestException('Cannot upgrade to trial plan');
    }

    if (
      currentSub.plan === newPlan &&
      currentSub.aiAddonEnabled === (aiAddon ?? currentSub.aiAddonEnabled)
    ) {
      throw new BadRequestException('Already on this plan configuration');
    }

    // Calculate prorated amount
    const daysRemaining = Math.ceil(
      (currentSub.currentPeriodEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    );
    const daysInPeriod = 30;

    const proratedAmount = calculateProratedAmount(
      currentSub.plan,
      newPlan,
      billingCycle,
      daysRemaining,
      daysInPeriod,
    );

    // Determine if change is immediate or at period end
    const isUpgrade = this.isPlanUpgrade(currentSub.plan, newPlan);
    const immediate = isUpgrade; // Upgrades are immediate, downgrades at period end

    // Update Stripe subscription if configured
    // COMMENTATO: stripe non installato
    // if (this.stripe && currentSub.stripeSubscriptionId) {
    //   await this.updateStripeSubscription(
    //     currentSub.stripeSubscriptionId,
    //     newPlan,
    //     billingCycle,
    //     aiAddon
    //   );
    // }

    // Update subscription in database
    await this.prisma.$transaction(async tx => {
      // Log the change
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

      // Update subscription
      // eslint-disable-next-line security/detect-object-injection
      const limits = PLAN_LIMITS[newPlan];
      const subscription = await tx.subscription.update({
        where: { tenantId },
        data: {
          plan: newPlan,
          maxUsers: limits.maxUsers ?? 999999,
          maxLocations: limits.maxLocations ?? 999999,
          apiCallsLimit: limits.maxApiCallsPerMonth,
          storageLimitBytes: limits.maxStorageBytes,
          aiAddonEnabled: aiAddon ?? currentSub.aiAddonEnabled,
          aiAddonPrice: aiAddon ? AI_ADDON.monthlyPrice : null,
          // If downgrade, set cancelAtPeriodEnd = true
          cancelAtPeriodEnd: !isUpgrade,
        },
        include: { features: true },
      });

      // Update features based on new plan
      await this.syncPlanFeatures(
        tx,
        subscription.id,
        newPlan,
        aiAddon ?? currentSub.aiAddonEnabled,
      );

      return subscription;
    });

    return {
      subscription: await this.getSubscription(tenantId),
      proratedAmount,
      immediate,
    };
  }

  async downgradeSubscription(
    tenantId: string,
    newPlan: SubscriptionPlan,
  ): Promise<{
    subscription: SubscriptionResponse;
    effectiveDate: Date;
  }> {
    const currentSub = await this.prisma.subscription.findUnique({
      where: { tenantId },
    });

    if (!currentSub) {
      throw new NotFoundException('Subscription not found');
    }

    if (this.isPlanUpgrade(currentSub.plan, newPlan)) {
      throw new BadRequestException('Use upgrade endpoint for plan upgrades');
    }

    // Schedule downgrade at period end
    await this.prisma.subscription.update({
      where: { tenantId },
      data: {
        cancelAtPeriodEnd: true,
        metadata: {
          ...((currentSub.metadata as Prisma.JsonObject) || {}),
          scheduledPlan: newPlan,
        },
      },
    });

    // Log the change
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

  // ==========================================
  // AI ADD-ON MANAGEMENT
  // ==========================================

  async toggleAiAddon(tenantId: string, enabled: boolean): Promise<SubscriptionResponse> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { tenantId },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    if (subscription.plan === SubscriptionPlan.SMALL && enabled) {
      throw new BadRequestException('AI Add-on requires Medium plan or higher');
    }

    await this.prisma.$transaction(async tx => {
      await tx.subscription.update({
        where: { tenantId },
        data: {
          aiAddonEnabled: enabled,
          aiAddonPrice: enabled ? AI_ADDON.monthlyPrice : null,
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

      // Update AI features
      await this.syncPlanFeatures(tx, subscription.id, subscription.plan, enabled);
    });

    return this.getSubscription(tenantId);
  }

  // ==========================================
  // CANCELLATION
  // ==========================================

  async cancelSubscription(
    tenantId: string,
    immediate: boolean = false,
  ): Promise<{
    subscription: SubscriptionResponse;
    dataRetentionDate: Date;
  }> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { tenantId },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    const dataRetentionDate = new Date();
    dataRetentionDate.setMonth(dataRetentionDate.getMonth() + 6); // 6 months retention

    if (immediate) {
      // Immediate cancellation - set to expired
      await this.prisma.subscription.update({
        where: { tenantId },
        data: {
          status: SubscriptionStatus.EXPIRED,
          cancelledAt: new Date(),
        },
      });
    } else {
      // Cancel at period end
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
        newStatus: immediate ? SubscriptionStatus.EXPIRED : subscription.status,
      },
    });

    return {
      subscription: await this.getSubscription(tenantId),
      dataRetentionDate,
    };
  }

  async reactivateSubscription(tenantId: string): Promise<SubscriptionResponse> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { tenantId },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    if (
      subscription.status !== SubscriptionStatus.CANCELLED &&
      subscription.status !== SubscriptionStatus.EXPIRED
    ) {
      throw new BadRequestException('Subscription is not cancelled');
    }

    await this.prisma.$transaction(async tx => {
      await tx.subscription.update({
        where: { tenantId },
        data: {
          status: SubscriptionStatus.ACTIVE,
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
          newStatus: SubscriptionStatus.ACTIVE,
        },
      });
    });

    return this.getSubscription(tenantId);
  }

  // ==========================================
  // ADMIN FUNCTIONS
  // ==========================================

  async adminUpdateSubscription(
    tenantId: string,
    updates: {
      plan?: SubscriptionPlan;
      status?: SubscriptionStatus;
      aiAddonEnabled?: boolean;
      currentPeriodEnd?: Date;
    },
  ): Promise<SubscriptionResponse> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { tenantId },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    const updateData: Prisma.SubscriptionUpdateInput = {};

    if (updates.plan) {
      const limits = PLAN_LIMITS[updates.plan];
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
      updateData.aiAddonPrice = updates.aiAddonEnabled ? AI_ADDON.monthlyPrice : null;
    }

    if (updates.currentPeriodEnd) {
      updateData.currentPeriodEnd = updates.currentPeriodEnd;
    }

    await this.prisma.subscription.update({
      where: { tenantId },
      data: updateData,
    });

    // Sync features
    if (updates.plan || updates.aiAddonEnabled !== undefined) {
      await this.syncPlanFeatures(
        this.prisma,
        subscription.id,
        updates.plan ?? subscription.plan,
        updates.aiAddonEnabled ?? subscription.aiAddonEnabled,
      );
    }

    return this.getSubscription(tenantId);
  }

  async getSubscriptionAnalytics() {
    const [totalSubscriptions, byPlan, byStatus, trialConversions, revenueEstimate] =
      await Promise.all([
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
            plan: { not: SubscriptionPlan.TRIAL },
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
      byPlan: byPlan.reduce(
        (acc, item) => {
          acc[item.plan] = item._count.plan;
          return acc;
        },
        {} as Record<SubscriptionPlan, number>,
      ),
      byStatus: byStatus.reduce(
        (acc, item) => {
          acc[item.status] = item._count.status;
          return acc;
        },
        {} as Record<SubscriptionStatus, number>,
      ),
      trialConversions,
      aiAddonRevenue: revenueEstimate._sum.aiAddonPrice || 0,
    };
  }

  // ==========================================
  // STRIPE INTEGRATION
  // ==========================================

  async createStripeCheckoutSession(
    tenantId: string,
    plan: SubscriptionPlan,
    billingCycle: 'monthly' | 'yearly',
    aiAddon: boolean,
    successUrl: string,
    cancelUrl: string,
  ): Promise<{ sessionId: string; url: string }> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { tenantId },
    });
    if (!subscription) throw new NotFoundException('Subscription not found');

    // eslint-disable-next-line security/detect-object-injection
    const pricing = PLAN_PRICING[plan];
    const unitAmount =
      billingCycle === 'yearly'
        ? Math.round(pricing.yearlyPrice * 100)
        : Math.round(pricing.monthlyPrice * 100);

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
      {
        price_data: {
          currency: 'eur',
          product_data: {
            // eslint-disable-next-line security/detect-object-injection
            name: pricing.nameIt,
            metadata: { plan, billingCycle },
          },
          unit_amount: unitAmount,
          recurring: { interval: billingCycle === 'yearly' ? 'year' : 'month' },
        },
        quantity: 1,
      },
    ];

    if (aiAddon) {
      const addonPrice = billingCycle === 'yearly' ? AI_ADDON.yearlyPrice : AI_ADDON.monthlyPrice;
      lineItems.push({
        price_data: {
          currency: 'eur',
          product_data: { name: 'AI Add-on', metadata: { type: 'ai_addon' } },
          unit_amount: Math.round(addonPrice * 100),
          recurring: { interval: billingCycle === 'yearly' ? 'year' : 'month' },
        },
        quantity: 1,
      });
    }

    let customerId = subscription.stripeCustomerId ?? undefined;
    if (!customerId) {
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { name: true },
      });
      const customer = await this.getStripe().customers.create({
        metadata: { tenantId },
        description: tenant?.name ?? tenantId,
      });
      customerId = customer.id;
      await this.prisma.subscription.update({
        where: { tenantId },
        data: { stripeCustomerId: customerId },
      });
    }

    const session = await this.getStripe().checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: { tenantId, plan, billingCycle, aiAddon: String(aiAddon) },
      subscription_data: { metadata: { tenantId, plan } },
    });

    return { sessionId: session.id, url: session.url! };
  }

  // ==========================================
  // WEBHOOK HANDLERS
  // ==========================================

  async renewSubscription(
    tenantId: string,
    stripeSubscriptionId: string,
    newPeriodEnd: Date,
  ): Promise<void> {
    await this.prisma.subscription.update({
      where: { tenantId },
      data: {
        stripeSubscriptionId,
        currentPeriodEnd: newPeriodEnd,
        status: SubscriptionStatus.ACTIVE,
      },
    });
  }

  async markPaymentFailed(tenantId: string): Promise<void> {
    await this.prisma.subscription.update({
      where: { tenantId },
      data: { status: SubscriptionStatus.PAST_DUE },
    });
  }

  async syncStripeSubscriptionStatus(tenantId: string, stripeStatus: string): Promise<void> {
    const statusMap: Record<string, SubscriptionStatus> = {
      active: SubscriptionStatus.ACTIVE,
      past_due: SubscriptionStatus.PAST_DUE,
      canceled: SubscriptionStatus.CANCELLED,
      trialing: SubscriptionStatus.TRIAL,
      unpaid: SubscriptionStatus.PAST_DUE,
      paused: SubscriptionStatus.CANCELLED,
    };
    // eslint-disable-next-line security/detect-object-injection
    const mappedStatus = statusMap[stripeStatus];
    if (mappedStatus) {
      await this.prisma.subscription.update({
        where: { tenantId },
        data: { status: mappedStatus },
      });
    }
  }

  async activateSubscription(
    tenantId: string,
    plan: SubscriptionPlan,
    billingCycle: 'monthly' | 'yearly',
    stripeSubscriptionId: string,
  ): Promise<void> {
    await this.prisma.$transaction(async tx => {
      const periodStart = new Date();
      const periodEnd = new Date();
      if (billingCycle === 'yearly') {
        periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      } else {
        periodEnd.setMonth(periodEnd.getMonth() + 1);
      }

      // eslint-disable-next-line security/detect-object-injection
      const limits = PLAN_LIMITS[plan];
      const subscription = await tx.subscription.update({
        where: { tenantId },
        data: {
          plan,
          status: SubscriptionStatus.ACTIVE,
          stripeSubscriptionId,
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
          trialEndsAt: null,
          maxUsers: limits.maxUsers ?? 999999,
          maxLocations: limits.maxLocations ?? 999999,
          apiCallsLimit: limits.maxApiCallsPerMonth,
          storageLimitBytes: limits.maxStorageBytes ?? BigInt(10737418240),
        },
      });

      await this.syncPlanFeatures(tx, subscription.id, plan, false);

      await tx.subscriptionChange.create({
        data: {
          subscriptionId: subscription.id,
          tenantId,
          changeType: 'UPGRADE',
          oldPlan: subscription.plan,
          newPlan: plan,
          oldStatus: SubscriptionStatus.TRIAL,
          newStatus: SubscriptionStatus.ACTIVE,
          proratedAmount: 0,
        },
      });
    });
  }

  async handleTrialWillEnd(tenantId: string, trialEnd: Date): Promise<void> {
    await this.prisma.subscription.update({
      where: { tenantId },
      data: { trialEndsAt: trialEnd },
    });
    this.logger.log(`Trial will end for tenant ${tenantId} at ${trialEnd.toISOString()}`);
  }

  // ==========================================
  // PRIVATE HELPERS
  // ==========================================

  private isPlanUpgrade(currentPlan: SubscriptionPlan, newPlan: SubscriptionPlan): boolean {
    const planOrder: SubscriptionPlan[] = [
      SubscriptionPlan.TRIAL,
      SubscriptionPlan.SMALL,
      SubscriptionPlan.MEDIUM,
      SubscriptionPlan.ENTERPRISE,
    ];

    const currentIndex = planOrder.indexOf(currentPlan);
    const newIndex = planOrder.indexOf(newPlan);

    return newIndex > currentIndex;
  }

  private async syncPlanFeatures(
    tx: Prisma.TransactionClient,
    subscriptionId: string,
    plan: SubscriptionPlan,
    hasAiAddon: boolean,
  ): Promise<void> {
    // Get features for this plan
    // eslint-disable-next-line security/detect-object-injection
    const planFeatures = [...PLAN_FEATURES[plan]];
    if (hasAiAddon) {
      planFeatures.push(FeatureFlag.AI_INSPECTIONS, FeatureFlag.VOICE_ASSISTANT);
    }

    // Delete existing features
    await tx.subscriptionFeature.deleteMany({
      where: { subscriptionId },
    });

    // Create new features
    await tx.subscriptionFeature.createMany({
      data: planFeatures.map(feature => ({
        subscriptionId,
        feature,
        enabled: true,
      })),
    });
  }

  /**
   * Converts BigInt fields to Number for JSON serialization.
   * Prisma returns storageLimitBytes / storageUsedBytes as BigInt,
   * which JSON.stringify cannot handle.
   */
  private serializeBigIntFields<T extends Record<string, unknown>>(obj: T): T {
    const result = { ...obj };
    for (const key of Object.keys(result)) {
      // eslint-disable-next-line security/detect-object-injection
      if (typeof result[key] === 'bigint') {
        // eslint-disable-next-line security/detect-object-injection
        (result as Record<string, unknown>)[key] = Number(result[key]);
      }
    }
    return result as T;
  }

  // Metodi Stripe commentati - stripe non installato
  // private async updateStripeSubscription(
  //   stripeSubscriptionId: string,
  //   plan: SubscriptionPlan,
  //   billingCycle: 'monthly' | 'yearly',
  //   aiAddon?: boolean
  // ): Promise<void> {
  //   if (!this.stripe) return;
  //   ...
  // }

  // private async handleCheckoutCompleted(
  //   session: Record<string, unknown>
  // ): Promise<void> {
  //   ...
  // }

  // private async handleInvoicePaid(invoice: Record<string, unknown>): Promise<void> {
  //   ...
  // }

  // private async handlePaymentFailed(invoice: Record<string, unknown>): Promise<void> {
  //   ...
  // }

  // private async handleSubscriptionDeleted(
  //   stripeSubscription: Record<string, unknown>
  // ): Promise<void> {
  //   ...
  // }
}
