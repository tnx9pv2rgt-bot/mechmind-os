/**
 * SUBSCRIPTION SERVICE
 * 
 * Handles subscription management, upgrades, downgrades, and Stripe integration
 */

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { PrismaService } from '../../common/services/prisma.service';
import { 
  SubscriptionPlan, 
  SubscriptionStatus, 
  FeatureFlag,
  Prisma,
} from '@prisma/client';
import { 
  PLAN_PRICING, 
  AI_ADDON, 
  PLAN_LIMITS, 
  PLAN_FEATURES,
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
  private stripe: Stripe;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    const stripeKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (stripeKey) {
      this.stripe = new Stripe(stripeKey, {
        apiVersion: '2024-12-18.acacia',
      });
    }
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
          subscription.status === SubscriptionStatus.TRIAL && 
          !subscription.stripeCustomerId,
      },
    };
  }

  async getAllSubscriptions(filters?: {
    status?: SubscriptionStatus;
    plan?: SubscriptionPlan;
  }) {
    const where: Prisma.SubscriptionWhereInput = {};
    
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

  // ==========================================
  // UPGRADE / DOWNGRADE
  // ==========================================

  async upgradeSubscription(
    tenantId: string,
    request: UpgradeRequest
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

    if (currentSub.plan === newPlan && currentSub.aiAddonEnabled === (aiAddon ?? currentSub.aiAddonEnabled)) {
      throw new BadRequestException('Already on this plan configuration');
    }

    // Calculate prorated amount
    const daysRemaining = Math.ceil(
      (currentSub.currentPeriodEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    const daysInPeriod = 30;

    const proratedAmount = calculateProratedAmount(
      currentSub.plan,
      newPlan,
      billingCycle,
      daysRemaining,
      daysInPeriod
    );

    // Determine if change is immediate or at period end
    const isUpgrade = this.isPlanUpgrade(currentSub.plan, newPlan);
    const immediate = isUpgrade; // Upgrades are immediate, downgrades at period end

    // Update Stripe subscription if configured
    if (this.stripe && currentSub.stripeSubscriptionId) {
      await this.updateStripeSubscription(
        currentSub.stripeSubscriptionId,
        newPlan,
        billingCycle,
        aiAddon
      );
    }

    // Update subscription in database
    const updatedSubscription = await this.prisma.$transaction(async (tx) => {
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
      await this.syncPlanFeatures(tx, subscription.id, newPlan, aiAddon ?? currentSub.aiAddonEnabled);

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
    newPlan: SubscriptionPlan
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

  async toggleAiAddon(
    tenantId: string,
    enabled: boolean
  ): Promise<SubscriptionResponse> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { tenantId },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    if (subscription.plan === SubscriptionPlan.SMALL && enabled) {
      throw new BadRequestException('AI Add-on requires Medium plan or higher');
    }

    await this.prisma.$transaction(async (tx) => {
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
    immediate: boolean = false
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

    if (subscription.status !== SubscriptionStatus.CANCELLED && 
        subscription.status !== SubscriptionStatus.EXPIRED) {
      throw new BadRequestException('Subscription is not cancelled');
    }

    await this.prisma.$transaction(async (tx) => {
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
    }
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
        updates.aiAddonEnabled ?? subscription.aiAddonEnabled
      );
    }

    return this.getSubscription(tenantId);
  }

  async getSubscriptionAnalytics() {
    const [
      totalSubscriptions,
      byPlan,
      byStatus,
      trialConversions,
      revenueEstimate,
    ] = await Promise.all([
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
      byPlan: byPlan.reduce((acc, item) => {
        acc[item.plan] = item._count.plan;
        return acc;
      }, {} as Record<SubscriptionPlan, number>),
      byStatus: byStatus.reduce((acc, item) => {
        acc[item.status] = item._count.status;
        return acc;
      }, {} as Record<SubscriptionStatus, number>),
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
    cancelUrl: string
  ): Promise<{ sessionId: string; url: string }> {
    if (!this.stripe) {
      throw new BadRequestException('Stripe is not configured');
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    const pricing = PLAN_PRICING[plan];
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];

    if (!pricing.isCustomPricing && pricing.stripePriceId) {
      lineItems.push({
        price: pricing.stripePriceId,
        quantity: 1,
      });
    }

    if (aiAddon && AI_ADDON.stripePriceId) {
      lineItems.push({
        price: AI_ADDON.stripePriceId,
        quantity: 1,
      });
    }

    const session = await this.stripe.checkout.sessions.create({
      customer_email: undefined, // Will be set if we have a Stripe customer
      line_items: lineItems,
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        tenantId,
        plan,
        billingCycle,
        aiAddon: aiAddon.toString(),
      },
    });

    return {
      sessionId: session.id,
      url: session.url!,
    };
  }

  async handleStripeWebhook(event: Stripe.Event): Promise<void> {
    if (!this.stripe) return;

    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case 'invoice.payment_succeeded':
        await this.handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;
      case 'invoice.payment_failed':
        await this.handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;
      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
    }
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
    hasAiAddon: boolean
  ): Promise<void> {
    // Get features for this plan
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

  private async updateStripeSubscription(
    stripeSubscriptionId: string,
    plan: SubscriptionPlan,
    billingCycle: 'monthly' | 'yearly',
    aiAddon?: boolean
  ): Promise<void> {
    if (!this.stripe) return;

    const pricing = PLAN_PRICING[plan];
    const items: Stripe.SubscriptionUpdateParams.Item[] = [];

    if (!pricing.isCustomPricing && pricing.stripePriceId) {
      items.push({
        id: 'base_plan',
        price: pricing.stripePriceId,
      });
    }

    if (aiAddon && AI_ADDON.stripePriceId) {
      items.push({
        id: 'ai_addon',
        price: AI_ADDON.stripePriceId,
      });
    }

    await this.stripe.subscriptions.update(stripeSubscriptionId, {
      items,
      proration_behavior: 'create_prorations',
    });
  }

  private async handleCheckoutCompleted(
    session: Stripe.Checkout.Session
  ): Promise<void> {
    const tenantId = session.metadata?.tenantId;
    const plan = session.metadata?.plan as SubscriptionPlan;
    const aiAddon = session.metadata?.aiAddon === 'true';

    if (!tenantId || !plan) return;

    await this.prisma.subscription.update({
      where: { tenantId },
      data: {
        stripeCustomerId: session.customer as string,
        stripeSubscriptionId: session.subscription as string,
        status: SubscriptionStatus.ACTIVE,
        plan,
        aiAddonEnabled: aiAddon,
        trialEndsAt: null,
      },
    });
  }

  private async handleInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
    // Reset usage counters for new billing period
    const subscriptionId = invoice.subscription;
    if (!subscriptionId) return;

    const stripeSub = await this.stripe?.subscriptions.retrieve(
      subscriptionId as string
    );
    if (!stripeSub) return;

    // Find tenant by Stripe customer ID
    const subscription = await this.prisma.subscription.findFirst({
      where: { stripeCustomerId: stripeSub.customer as string },
    });

    if (!subscription) return;

    await this.prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        apiCallsUsed: 0,
        currentPeriodStart: new Date(stripeSub.current_period_start * 1000),
        currentPeriodEnd: new Date(stripeSub.current_period_end * 1000),
      },
    });
  }

  private async handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    const subscriptionId = invoice.subscription;
    if (!subscriptionId) return;

    const stripeSub = await this.stripe?.subscriptions.retrieve(
      subscriptionId as string
    );
    if (!stripeSub) return;

    const subscription = await this.prisma.subscription.findFirst({
      where: { stripeCustomerId: stripeSub.customer as string },
    });

    if (!subscription) return;

    await this.prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: SubscriptionStatus.PAST_DUE,
      },
    });
  }

  private async handleSubscriptionDeleted(
    stripeSubscription: Stripe.Subscription
  ): Promise<void> {
    const subscription = await this.prisma.subscription.findFirst({
      where: { stripeSubscriptionId: stripeSubscription.id },
    });

    if (!subscription) return;

    await this.prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: SubscriptionStatus.CANCELLED,
        cancelledAt: new Date(),
      },
    });
  }
}
