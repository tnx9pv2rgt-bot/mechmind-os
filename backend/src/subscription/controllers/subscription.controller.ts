/**
 * SUBSCRIPTION CONTROLLER
 * 
 * API endpoints for subscription management
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  Headers,
} from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { SubscriptionPlan, SubscriptionStatus, FeatureFlag } from '@prisma/client';
import { UserRole } from '../../auth/guards/roles.guard';
import { SubscriptionService, UpgradeRequest } from '../services/subscription.service';
import { FeatureAccessService } from '../services/feature-access.service';
import { RequireFeature, FeatureGuard } from '../guards/feature.guard';
import { CheckLimit, LimitGuard } from '../guards/limit.guard';
import { PLAN_PRICING, AI_ADDON, PLAN_FEATURES, getFormattedPrice } from '../config/pricing.config';

// DTOs
class UpgradeSubscriptionDto {
  newPlan: SubscriptionPlan;
  billingCycle: 'monthly' | 'yearly';
  aiAddon?: boolean;
}

class CancelSubscriptionDto {
  immediate?: boolean;
}

class CreateCheckoutSessionDto {
  plan: SubscriptionPlan;
  billingCycle: 'monthly' | 'yearly';
  aiAddon?: boolean;
  successUrl: string;
  cancelUrl: string;
}

class AdminUpdateSubscriptionDto {
  plan?: SubscriptionPlan;
  status?: SubscriptionStatus;
  aiAddonEnabled?: boolean;
  currentPeriodEnd?: Date;
}

// Extend Express Request with tenantId
interface RequestWithTenant extends ExpressRequest {
  tenantId: string;
}

@Controller('subscription')
@UseGuards(JwtAuthGuard)
export class SubscriptionController {
  constructor(
    private readonly subscriptionService: SubscriptionService,
    private readonly featureAccessService: FeatureAccessService,
  ) {}

  // ==========================================
  // CURRENT SUBSCRIPTION
  // ==========================================

  @Get('current')
  async getCurrentSubscription(@Request() req: RequestWithTenant) {
    return this.subscriptionService.getSubscription(req.tenantId);
  }

  @Get('usage')
  async getUsageStats(@Request() req: RequestWithTenant) {
    return this.featureAccessService.getUsageStats(req.tenantId);
  }

  @Get('limits')
  async checkAllLimits(@Request() req: RequestWithTenant) {
    return this.featureAccessService.checkAllLimits(req.tenantId);
  }

  // ==========================================
  // FEATURE ACCESS
  // ==========================================

  @Get('features/:feature')
  async checkFeatureAccess(
    @Request() req: RequestWithTenant,
    @Param('feature') feature: FeatureFlag
  ) {
    return this.featureAccessService.canAccessFeature(req.tenantId, feature);
  }

  @Post('features/check')
  async checkMultipleFeatures(
    @Request() req: RequestWithTenant,
    @Body() features: FeatureFlag[]
  ) {
    return this.featureAccessService.canAccessFeatures(req.tenantId, features);
  }

  // ==========================================
  // UPGRADE / DOWNGRADE
  // ==========================================

  @Post('upgrade')
  @CheckLimit('apiCall')
  @UseGuards(LimitGuard)
  async upgradeSubscription(
    @Request() req: RequestWithTenant,
    @Body() dto: UpgradeSubscriptionDto
  ) {
    const request: UpgradeRequest = {
      newPlan: dto.newPlan,
      billingCycle: dto.billingCycle,
      aiAddon: dto.aiAddon,
    };

    return this.subscriptionService.upgradeSubscription(req.tenantId, request);
  }

  @Post('downgrade')
  async downgradeSubscription(
    @Request() req: RequestWithTenant,
    @Body('newPlan') newPlan: SubscriptionPlan
  ) {
    return this.subscriptionService.downgradeSubscription(req.tenantId, newPlan);
  }

  // ==========================================
  // AI ADD-ON
  // ==========================================

  @Post('ai-addon')
  async toggleAiAddon(
    @Request() req: RequestWithTenant,
    @Body('enabled') enabled: boolean
  ) {
    return this.subscriptionService.toggleAiAddon(req.tenantId, enabled);
  }

  // ==========================================
  // CANCELLATION
  // ==========================================

  @Post('cancel')
  async cancelSubscription(
    @Request() req: RequestWithTenant,
    @Body() dto: CancelSubscriptionDto
  ) {
    return this.subscriptionService.cancelSubscription(
      req.tenantId,
      dto.immediate
    );
  }

  @Post('reactivate')
  async reactivateSubscription(@Request() req: RequestWithTenant) {
    return this.subscriptionService.reactivateSubscription(req.tenantId);
  }

  // ==========================================
  // STRIPE INTEGRATION
  // ==========================================

  @Post('checkout-session')
  async createCheckoutSession(
    @Request() req: RequestWithTenant,
    @Body() dto: CreateCheckoutSessionDto
  ) {
    return this.subscriptionService.createStripeCheckoutSession(
      req.tenantId,
      dto.plan,
      dto.billingCycle,
      dto.aiAddon ?? false,
      dto.successUrl,
      dto.cancelUrl
    );
  }

  // ==========================================
  // PRICING INFORMATION
  // ==========================================

  @Get('pricing')
  async getPricingInfo() {
    return {
      plans: Object.values(SubscriptionPlan)
        .filter(p => p !== SubscriptionPlan.TRIAL)
        .map(plan => ({
          ...PLAN_PRICING[plan],
          id: plan,
          monthlyPriceFormatted: getFormattedPrice(plan, 'monthly'),
          yearlyPriceFormatted: getFormattedPrice(plan, 'yearly'),
        })),
      aiAddon: {
        ...AI_ADDON,
        monthlyPriceFormatted: new Intl.NumberFormat('it-IT', {
          style: 'currency',
          currency: 'EUR',
        }).format(AI_ADDON.monthlyPrice),
        yearlyPriceFormatted: new Intl.NumberFormat('it-IT', {
          style: 'currency',
          currency: 'EUR',
        }).format(AI_ADDON.yearlyPrice / 12),
      },
    };
  }

  @Get('pricing/:plan/features')
  async getPlanFeatures(@Param('plan') plan: SubscriptionPlan) {
    return {
      plan,
      features: PLAN_FEATURES[plan] || [],
    };
  }

  @Get('pricing/compare')
  async comparePlans() {
    const plans = [SubscriptionPlan.SMALL, SubscriptionPlan.MEDIUM, SubscriptionPlan.ENTERPRISE];
    
    return {
      comparison: plans.map(plan => ({
        plan,
        name: PLAN_PRICING[plan].name,
        nameIt: PLAN_PRICING[plan].nameIt,
        price: {
          monthly: getFormattedPrice(plan, 'monthly'),
          yearly: getFormattedPrice(plan, 'yearly'),
        },
        features: PLAN_FEATURES[plan] || [],
      })),
    };
  }
}

// ==========================================
// ADMIN CONTROLLER
// ==========================================

@Controller('admin/subscriptions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminSubscriptionController {
  constructor(
    private readonly subscriptionService: SubscriptionService,
    private readonly featureAccessService: FeatureAccessService,
  ) {}

  @Get()
  async getAllSubscriptions(
    @Query('status') status?: SubscriptionStatus,
    @Query('plan') plan?: SubscriptionPlan
  ) {
    return this.subscriptionService.getAllSubscriptions({ status, plan });
  }

  @Get('analytics')
  async getAnalytics() {
    return this.subscriptionService.getSubscriptionAnalytics();
  }

  @Get(':tenantId')
  async getSubscriptionByTenant(@Param('tenantId') tenantId: string) {
    return this.subscriptionService.getSubscription(tenantId);
  }

  @Put(':tenantId')
  async updateSubscription(
    @Param('tenantId') tenantId: string,
    @Body() dto: AdminUpdateSubscriptionDto
  ) {
    return this.subscriptionService.adminUpdateSubscription(tenantId, dto);
  }

  @Get(':tenantId/usage')
  async getTenantUsage(@Param('tenantId') tenantId: string) {
    return this.featureAccessService.getUsageStats(tenantId);
  }

  @Post(':tenantId/sync-features')
  async syncFeatures(@Param('tenantId') tenantId: string) {
    const subscription = await this.subscriptionService.getSubscription(tenantId);
    // This would trigger a feature sync
    return { message: 'Features synced', subscription };
  }
}

// ==========================================
// WEBHOOK CONTROLLER
// ==========================================

@Controller('webhooks/stripe')
export class StripeWebhookController {
  constructor(
    private readonly subscriptionService: SubscriptionService,
    private readonly configService: { get: (key: string) => string | undefined },
  ) {}

  @Post()
  async handleWebhook(
    @Headers('stripe-signature') signature: string,
    @Body() payload: any
  ) {
    // In a real implementation, verify the webhook signature
    // const event = this.stripe.webhooks.constructEvent(
    //   payload,
    //   signature,
    //   this.configService.get('STRIPE_WEBHOOK_SECRET')
    // );

    // await this.subscriptionService.handleStripeWebhook(event);

    return { received: true };
  }
}
