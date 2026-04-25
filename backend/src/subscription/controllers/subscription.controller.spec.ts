import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import {
  SubscriptionController,
  AdminSubscriptionController,
  StripeWebhookController,
} from './subscription.controller';
import { SubscriptionService, SubscriptionResponse } from '../services/subscription.service';
import { FeatureAccessService } from '../services/feature-access.service';

jest.mock('stripe', () => {
  return jest.fn(() => ({
    webhooks: {
      constructEvent: jest.fn(),
    },
  }));
});

describe('SubscriptionController', () => {
  let controller: SubscriptionController;
  let subscriptionService: jest.Mocked<SubscriptionService>;
  let featureAccessService: jest.Mocked<FeatureAccessService>;

  const TENANT_ID = 'tenant-001';
  const mockReq = { tenantId: TENANT_ID } as never;

  const mockSubscription = {
    id: 'sub-001',
    tenantId: TENANT_ID,
    plan: 'MEDIUM',
    status: 'ACTIVE',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SubscriptionController],
      providers: [
        {
          provide: SubscriptionService,
          useValue: {
            getSubscription: jest.fn(),
            upgradeSubscription: jest.fn(),
            downgradeSubscription: jest.fn(),
            toggleAiAddon: jest.fn(),
            cancelSubscription: jest.fn(),
            reactivateSubscription: jest.fn(),
            createStripeCheckoutSession: jest.fn(),
          },
        },
        {
          provide: FeatureAccessService,
          useValue: {
            getUsageStats: jest.fn(),
            checkAllLimits: jest.fn(),
            canAccessFeature: jest.fn(),
            canAccessFeatures: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<SubscriptionController>(SubscriptionController);
    subscriptionService = module.get(SubscriptionService) as jest.Mocked<SubscriptionService>;
    featureAccessService = module.get(FeatureAccessService) as jest.Mocked<FeatureAccessService>;
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getCurrentSubscription', () => {
    it('should delegate to subscriptionService.getSubscription', async () => {
      subscriptionService.getSubscription.mockResolvedValue(mockSubscription as never);

      const result = await controller.getCurrentSubscription(mockReq);

      expect(subscriptionService.getSubscription).toHaveBeenCalledWith(TENANT_ID);
      expect(result).toEqual(mockSubscription);
    });
  });

  describe('getUsageStats', () => {
    it('should delegate to featureAccessService.getUsageStats', async () => {
      const stats = { apiCalls: 100, maxApiCalls: 1000 };
      featureAccessService.getUsageStats.mockResolvedValue(stats as never);

      const result = await controller.getUsageStats(mockReq);

      expect(featureAccessService.getUsageStats).toHaveBeenCalledWith(TENANT_ID);
      expect(result).toEqual(stats);
    });
  });

  describe('checkAllLimits', () => {
    it('should delegate to featureAccessService.checkAllLimits', async () => {
      const limits = { apiCall: { used: 100, max: 1000 } };
      featureAccessService.checkAllLimits.mockResolvedValue(limits as never);

      const result = await controller.checkAllLimits(mockReq);

      expect(featureAccessService.checkAllLimits).toHaveBeenCalledWith(TENANT_ID);
      expect(result).toEqual(limits);
    });
  });

  describe('checkFeatureAccess', () => {
    it('should delegate to featureAccessService.canAccessFeature', async () => {
      featureAccessService.canAccessFeature.mockResolvedValue(true as never);

      const result = await controller.checkFeatureAccess(mockReq, 'DVI' as never);

      expect(featureAccessService.canAccessFeature).toHaveBeenCalledWith(TENANT_ID, 'DVI');
      expect(result).toBe(true);
    });
  });

  describe('upgradeSubscription', () => {
    it('should delegate to subscriptionService.upgradeSubscription', async () => {
      const dto = { newPlan: 'ENTERPRISE', billingCycle: 'yearly' as const };
      const upgraded = { ...mockSubscription, plan: 'ENTERPRISE' };
      subscriptionService.upgradeSubscription.mockResolvedValue(upgraded as never);

      const result = await controller.upgradeSubscription(mockReq, dto as never);

      expect(subscriptionService.upgradeSubscription).toHaveBeenCalledWith(TENANT_ID, {
        newPlan: 'ENTERPRISE',
        billingCycle: 'yearly',
        aiAddon: undefined,
      });
      expect(result).toEqual(upgraded);
    });
  });

  describe('cancelSubscription', () => {
    it('should delegate to subscriptionService.cancelSubscription', async () => {
      const cancelled = { ...mockSubscription, status: 'CANCELLED' };
      subscriptionService.cancelSubscription.mockResolvedValue(cancelled as never);

      const result = await controller.cancelSubscription(mockReq, { immediate: true } as never);

      expect(subscriptionService.cancelSubscription).toHaveBeenCalledWith(TENANT_ID, true);
      expect(result).toEqual(cancelled);
    });
  });

  describe('reactivateSubscription', () => {
    it('should delegate to subscriptionService.reactivateSubscription', async () => {
      subscriptionService.reactivateSubscription.mockResolvedValue(mockSubscription as never);

      const result = await controller.reactivateSubscription(mockReq);

      expect(subscriptionService.reactivateSubscription).toHaveBeenCalledWith(TENANT_ID);
      expect(result).toEqual(mockSubscription);
    });
  });

  describe('downgradeSubscription', () => {
    it('should delegate to subscriptionService.downgradeSubscription', async () => {
      const downgraded = { ...mockSubscription, plan: 'SMALL' };
      subscriptionService.downgradeSubscription.mockResolvedValue(downgraded as never);

      const result = await controller.downgradeSubscription(mockReq, 'SMALL' as never);

      expect(subscriptionService.downgradeSubscription).toHaveBeenCalledWith(TENANT_ID, 'SMALL');
      expect(result).toEqual(downgraded);
    });
  });

  describe('toggleAiAddon', () => {
    it('should delegate to subscriptionService.toggleAiAddon', async () => {
      subscriptionService.toggleAiAddon.mockResolvedValue(mockSubscription as never);

      const result = await controller.toggleAiAddon(mockReq, true as never);

      expect(subscriptionService.toggleAiAddon).toHaveBeenCalledWith(TENANT_ID, true);
      expect(result).toEqual(mockSubscription);
    });
  });

  describe('createCheckoutSession', () => {
    it('should delegate to subscriptionService.createStripeCheckoutSession', async () => {
      const dto = {
        plan: 'MEDIUM',
        billingCycle: 'monthly' as const,
        successUrl: 'https://app/success',
        cancelUrl: 'https://app/cancel',
      };
      const session = { url: 'https://stripe.com/checkout/123' };
      subscriptionService.createStripeCheckoutSession.mockResolvedValue(session as never);

      const result = await controller.createCheckoutSession(mockReq, dto as never);

      expect(subscriptionService.createStripeCheckoutSession).toHaveBeenCalledWith(
        TENANT_ID,
        'MEDIUM',
        'monthly',
        false,
        'https://app/success',
        'https://app/cancel',
      );
      expect(result).toEqual(session);
    });

    it('should pass aiAddon=true when provided', async () => {
      const dto = {
        plan: 'ENTERPRISE',
        billingCycle: 'yearly' as const,
        aiAddon: true,
        successUrl: 'https://app/success',
        cancelUrl: 'https://app/cancel',
      };
      subscriptionService.createStripeCheckoutSession.mockResolvedValue({
        url: 'https://stripe.com',
      } as never);

      await controller.createCheckoutSession(mockReq, dto as never);

      expect(subscriptionService.createStripeCheckoutSession).toHaveBeenCalledWith(
        TENANT_ID,
        'ENTERPRISE',
        'yearly',
        true,
        'https://app/success',
        'https://app/cancel',
      );
    });
  });

  describe('checkMultipleFeatures', () => {
    it('should delegate to featureAccessService.canAccessFeatures', async () => {
      const features = ['DVI', 'MARKETING'];
      featureAccessService.canAccessFeatures.mockResolvedValue({
        DVI: true,
        MARKETING: false,
      } as never);

      const result = await controller.checkMultipleFeatures(mockReq, features as never);

      expect(featureAccessService.canAccessFeatures).toHaveBeenCalledWith(TENANT_ID, features);
      expect(result).toEqual({ DVI: true, MARKETING: false });
    });
  });

  describe('getPricingInfo', () => {
    it('should return pricing info excluding TRIAL', async () => {
      const result = await controller.getPricingInfo();

      expect(result.plans).toBeDefined();
      expect(Array.isArray(result.plans)).toBe(true);
      // TRIAL should be excluded
      const planIds = result.plans.map((p: Record<string, unknown>) => p.id);
      expect(planIds).not.toContain('TRIAL');
      expect(result.aiAddon).toBeDefined();
    });
  });

  describe('getPlanFeatures', () => {
    it('should return features for a valid plan', async () => {
      const result = await controller.getPlanFeatures('MEDIUM' as never);

      expect(result.plan).toBe('MEDIUM');
      expect(result.features).toBeDefined();
    });

    it('should return empty array for unknown plan', async () => {
      const result = await controller.getPlanFeatures('NONEXISTENT' as never);

      expect(result.features).toEqual([]);
    });
  });

  describe('comparePlans', () => {
    it('should return comparison for SMALL, MEDIUM, ENTERPRISE', async () => {
      const result = await controller.comparePlans();

      expect(result.comparison).toHaveLength(3);
      const planNames = result.comparison.map((c: Record<string, unknown>) => c.plan);
      expect(planNames).toEqual(['SMALL', 'MEDIUM', 'ENTERPRISE']);
    });

    it('should include price formatting for all plans', async () => {
      const result = await controller.comparePlans();

      result.comparison.forEach((comp: Record<string, unknown>) => {
        expect((comp.price as Record<string, unknown>).monthly).toBeDefined();
        expect((comp.price as Record<string, unknown>).yearly).toBeDefined();
      });
    });

    it('should include features for each plan', async () => {
      const result = await controller.comparePlans();

      result.comparison.forEach((comp: Record<string, unknown>) => {
        expect(Array.isArray(comp.features)).toBe(true);
      });
    });
  });

  describe('getPricingInfo — edge cases', () => {
    it('should format prices with Italian locale', async () => {
      const result = await controller.getPricingInfo();

      expect(result.aiAddon.monthlyPriceFormatted).toBeDefined();
      expect(result.aiAddon.yearlyPriceFormatted).toBeDefined();
    });

    it('should calculate AI addon yearly price correctly', async () => {
      const result = await controller.getPricingInfo();

      // Yearly should be divided by 12 for display
      expect(result.aiAddon.yearlyPriceFormatted).not.toBe(result.aiAddon.monthlyPriceFormatted);
    });
  });

  describe('cancelSubscription — without immediate flag', () => {
    it('should pass undefined when immediate not provided', async () => {
      subscriptionService.cancelSubscription.mockResolvedValue(mockSubscription as never);

      await controller.cancelSubscription(mockReq, {} as never);

      expect(subscriptionService.cancelSubscription).toHaveBeenCalledWith(TENANT_ID, undefined);
    });
  });
});

// ==========================================
// AdminSubscriptionController
// ==========================================
describe('AdminSubscriptionController', () => {
  let controller: AdminSubscriptionController;
  let subscriptionService: jest.Mocked<SubscriptionService>;
  let featureAccessService: jest.Mocked<FeatureAccessService>;

  const TENANT_ID = 'tenant-001';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminSubscriptionController],
      providers: [
        {
          provide: SubscriptionService,
          useValue: {
            getAllSubscriptions: jest.fn(),
            getSubscriptionAnalytics: jest.fn(),
            getSubscription: jest.fn(),
            adminUpdateSubscription: jest.fn(),
          },
        },
        {
          provide: FeatureAccessService,
          useValue: {
            getUsageStats: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AdminSubscriptionController>(AdminSubscriptionController);
    subscriptionService = module.get(SubscriptionService) as jest.Mocked<SubscriptionService>;
    featureAccessService = module.get(FeatureAccessService) as jest.Mocked<FeatureAccessService>;
  });

  describe('getAllSubscriptions', () => {
    it('should return all subscriptions without filters', async () => {
      const subs = [{ id: 'sub-1' }];
      subscriptionService.getAllSubscriptions.mockResolvedValue(subs as never);

      const result = await controller.getAllSubscriptions();

      expect(subscriptionService.getAllSubscriptions).toHaveBeenCalledWith({
        status: undefined,
        plan: undefined,
      });
      expect(result).toEqual(subs);
    });

    it('should pass status filter', async () => {
      subscriptionService.getAllSubscriptions.mockResolvedValue([] as never);

      await controller.getAllSubscriptions('ACTIVE' as never);

      expect(subscriptionService.getAllSubscriptions).toHaveBeenCalledWith({
        status: 'ACTIVE',
        plan: undefined,
      });
    });

    it('should pass both status and plan filters', async () => {
      subscriptionService.getAllSubscriptions.mockResolvedValue([] as never);

      await controller.getAllSubscriptions('ACTIVE' as never, 'MEDIUM' as never);

      expect(subscriptionService.getAllSubscriptions).toHaveBeenCalledWith({
        status: 'ACTIVE',
        plan: 'MEDIUM',
      });
    });
  });

  describe('getAnalytics', () => {
    it('should return subscription analytics', async () => {
      const analytics = { totalActive: 50 };
      subscriptionService.getSubscriptionAnalytics.mockResolvedValue(analytics as never);

      const result = await controller.getAnalytics();

      expect(result).toEqual(analytics);
    });
  });

  describe('getSubscriptionByTenant', () => {
    it('should return subscription for specific tenant', async () => {
      const sub = { id: 'sub-1', tenantId: TENANT_ID };
      subscriptionService.getSubscription.mockResolvedValue(sub as never);

      const result = await controller.getSubscriptionByTenant(TENANT_ID);

      expect(subscriptionService.getSubscription).toHaveBeenCalledWith(TENANT_ID);
      expect(result).toEqual(sub);
    });
  });

  describe('updateSubscription', () => {
    it('should delegate to adminUpdateSubscription', async () => {
      const dto = { plan: 'ENTERPRISE', status: 'ACTIVE' };
      subscriptionService.adminUpdateSubscription.mockResolvedValue({ updated: true } as never);

      const result = await controller.updateSubscription(TENANT_ID, dto as never);

      expect(subscriptionService.adminUpdateSubscription).toHaveBeenCalledWith(TENANT_ID, dto);
      expect(result).toEqual({ updated: true });
    });
  });

  describe('getTenantUsage', () => {
    it('should return usage stats for specific tenant', async () => {
      const stats = { apiCalls: 500 };
      featureAccessService.getUsageStats.mockResolvedValue(stats as never);

      const result = await controller.getTenantUsage(TENANT_ID);

      expect(featureAccessService.getUsageStats).toHaveBeenCalledWith(TENANT_ID);
      expect(result).toEqual(stats);
    });
  });

  describe('syncFeatures', () => {
    it('should sync features and return subscription', async () => {
      const sub = { id: 'sub-1', plan: 'MEDIUM' };
      subscriptionService.getSubscription.mockResolvedValue(sub as never);

      const result = await controller.syncFeatures(TENANT_ID);

      expect(result).toEqual({ message: 'Features synced', subscription: sub });
    });
  });
});

// ==========================================
// StripeWebhookController
// ==========================================
describe('StripeWebhookController', () => {
  let controller: StripeWebhookController;
  let _subscriptionService: jest.Mocked<SubscriptionService>;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StripeWebhookController],
      providers: [
        {
          provide: SubscriptionService,
          useValue: {
            cancelSubscription: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<StripeWebhookController>(StripeWebhookController);
    _subscriptionService = module.get(SubscriptionService) as jest.Mocked<SubscriptionService>;
    configService = module.get(ConfigService) as jest.Mocked<ConfigService>;
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('handleWebhook', () => {
    it('should throw BadRequestException when signature is missing', async () => {
      const req = { rawBody: Buffer.from('test') } as never;

      await expect(controller.handleWebhook(req, '')).rejects.toThrow(BadRequestException);
    });

    it('should throw InternalServerErrorException when webhook secret not configured', async () => {
      configService.get.mockReturnValue(undefined);
      const req = { rawBody: Buffer.from('test') } as never;

      await expect(controller.handleWebhook(req, 'sig_test')).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('should throw BadRequestException when rawBody is missing', async () => {
      configService.get.mockReturnValue('whsec_test');
      const req = { rawBody: undefined } as never;

      await expect(controller.handleWebhook(req, 'sig_test')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when constructEvent fails', async () => {
      jest.mocked(Stripe).mockImplementation(
        () =>
          ({
            webhooks: {
              constructEvent: jest.fn().mockImplementation(() => {
                throw new Error('Invalid signature');
              }),
            },
          }) as unknown as Stripe,
      );

      configService.get.mockImplementation((key: string) => {
        if (key === 'STRIPE_WEBHOOK_SECRET') return 'whsec_test';
        if (key === 'STRIPE_SECRET_KEY') return 'sk_test_123';
        return undefined;
      });
      const req = { rawBody: Buffer.from('invalid') } as never;

      await expect(controller.handleWebhook(req, 'invalid_sig')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  it('should handle charge.refunded event', async () => {
    const mockConstructEvent = jest.fn().mockReturnValue({
      type: 'charge.refunded',
      id: 'evt_test',
      data: { object: { id: 'ch_test', amount: 2000 } },
    } as unknown as Stripe.Event);

    jest.mocked(Stripe).mockImplementation(
      () =>
        ({
          webhooks: { constructEvent: mockConstructEvent },
        }) as unknown as Stripe,
    );

    configService.get.mockImplementation((key: string) => {
      if (key === 'STRIPE_WEBHOOK_SECRET') return 'whsec_test';
      if (key === 'STRIPE_SECRET_KEY') return 'sk_test_123';
      return undefined;
    });

    const req = { rawBody: Buffer.from('test') } as never;
    const result = await controller.handleWebhook(req, 'sig_test');

    expect(result).toEqual({ received: true });
    expect(mockConstructEvent).toHaveBeenCalled();
  });

  it('should handle customer.subscription.deleted and cancel subscription', async () => {
    const mockConstructEvent = jest.fn().mockReturnValue({
      type: 'customer.subscription.deleted',
      id: 'evt_test',
      data: {
        object: {
          id: 'sub_test',
          metadata: { tenantId: 'tenant-123' },
        },
      },
    } as unknown as Stripe.Event);

    jest.mocked(Stripe).mockImplementation(
      () =>
        ({
          webhooks: { constructEvent: mockConstructEvent },
        }) as unknown as Stripe,
    );

    _subscriptionService.cancelSubscription.mockResolvedValue({
      subscription: {} as unknown as SubscriptionResponse,
      dataRetentionDate: new Date(),
    });

    configService.get.mockImplementation((key: string) => {
      if (key === 'STRIPE_WEBHOOK_SECRET') return 'whsec_test';
      if (key === 'STRIPE_SECRET_KEY') return 'sk_test_123';
      return undefined;
    });

    const req = { rawBody: Buffer.from('test') } as never;
    const result = await controller.handleWebhook(req, 'sig_test');

    expect(result).toEqual({ received: true });
    expect(_subscriptionService.cancelSubscription).toHaveBeenCalledWith('tenant-123', true);
  });

  it('should handle checkout.session.completed event', async () => {
    const mockConstructEvent = jest.fn().mockReturnValue({
      type: 'checkout.session.completed',
      id: 'evt_test',
      data: { object: { id: 'cs_test', metadata: { invoiceId: 'inv-123' } } },
    } as unknown as Stripe.Event);

    jest.mocked(Stripe).mockImplementation(
      () =>
        ({
          webhooks: { constructEvent: mockConstructEvent },
        }) as unknown as Stripe,
    );

    configService.get.mockImplementation((key: string) => {
      if (key === 'STRIPE_WEBHOOK_SECRET') return 'whsec_test';
      if (key === 'STRIPE_SECRET_KEY') return 'sk_test_123';
      return undefined;
    });

    const req = { rawBody: Buffer.from('test') } as never;
    const result = await controller.handleWebhook(req, 'sig_test');

    expect(result).toEqual({ received: true });
  });

  it('should handle charge.dispute.created event', async () => {
    const mockConstructEvent = jest.fn().mockReturnValue({
      type: 'charge.dispute.created',
      id: 'evt_test',
      data: { object: { id: 'dp_test' } },
    } as unknown as Stripe.Event);

    jest.mocked(Stripe).mockImplementation(
      () =>
        ({
          webhooks: { constructEvent: mockConstructEvent },
        }) as unknown as Stripe,
    );

    configService.get.mockImplementation((key: string) => {
      if (key === 'STRIPE_WEBHOOK_SECRET') return 'whsec_test';
      if (key === 'STRIPE_SECRET_KEY') return 'sk_test_123';
      return undefined;
    });

    const req = { rawBody: Buffer.from('test') } as never;
    const result = await controller.handleWebhook(req, 'sig_test');

    expect(result).toEqual({ received: true });
  });

  it('should handle unhandled event types gracefully', async () => {
    const mockConstructEvent = jest.fn().mockReturnValue({
      type: 'unknown.event',
      id: 'evt_test',
      data: { object: {} },
    } as unknown as Stripe.Event);

    jest.mocked(Stripe).mockImplementation(
      () =>
        ({
          webhooks: { constructEvent: mockConstructEvent },
        }) as unknown as Stripe,
    );

    configService.get.mockImplementation((key: string) => {
      if (key === 'STRIPE_WEBHOOK_SECRET') return 'whsec_test';
      if (key === 'STRIPE_SECRET_KEY') return 'sk_test_123';
      return undefined;
    });

    const req = { rawBody: Buffer.from('test') } as never;
    const result = await controller.handleWebhook(req, 'sig_test');

    expect(result).toEqual({ received: true });
  });

  it('should handle error when canceling subscription fails', async () => {
    const mockConstructEvent = jest.fn().mockReturnValue({
      type: 'customer.subscription.deleted',
      id: 'evt_test',
      data: {
        object: {
          id: 'sub_test',
          metadata: { tenantId: 'tenant-123' },
        },
      },
    } as unknown as Stripe.Event);

    jest.mocked(Stripe).mockImplementation(
      () =>
        ({
          webhooks: { constructEvent: mockConstructEvent },
        }) as unknown as Stripe,
    );

    _subscriptionService.cancelSubscription.mockRejectedValue(new Error('Cancel failed'));

    configService.get.mockImplementation((key: string) => {
      if (key === 'STRIPE_WEBHOOK_SECRET') return 'whsec_test';
      if (key === 'STRIPE_SECRET_KEY') return 'sk_test_123';
      return undefined;
    });

    const req = { rawBody: Buffer.from('test') } as never;
    const result = await controller.handleWebhook(req, 'sig_test');

    expect(result).toEqual({ received: true });
    expect(_subscriptionService.cancelSubscription).toHaveBeenCalledWith('tenant-123', true);
  });

  it('should skip cancelSubscription when tenantId missing from metadata', async () => {
    const mockConstructEvent = jest.fn().mockReturnValue({
      type: 'customer.subscription.deleted',
      id: 'evt_test',
      data: {
        object: {
          id: 'sub_test',
          metadata: {}, // no tenantId
        },
      },
    } as unknown as Stripe.Event);

    jest.mocked(Stripe).mockImplementation(
      () =>
        ({
          webhooks: { constructEvent: mockConstructEvent },
        }) as unknown as Stripe,
    );

    configService.get.mockImplementation((key: string) => {
      if (key === 'STRIPE_WEBHOOK_SECRET') return 'whsec_test';
      if (key === 'STRIPE_SECRET_KEY') return 'sk_test_123';
      return undefined;
    });

    const req = { rawBody: Buffer.from('test') } as never;
    const result = await controller.handleWebhook(req, 'sig_test');

    expect(result).toEqual({ received: true });
    expect(_subscriptionService.cancelSubscription).not.toHaveBeenCalled();
  });

  it('should skip checkout logging when invoiceId missing from metadata', async () => {
    const mockConstructEvent = jest.fn().mockReturnValue({
      type: 'checkout.session.completed',
      id: 'evt_test',
      data: { object: { id: 'cs_test', metadata: {} } }, // no invoiceId
    } as unknown as Stripe.Event);

    jest.mocked(Stripe).mockImplementation(
      () =>
        ({
          webhooks: { constructEvent: mockConstructEvent },
        }) as unknown as Stripe,
    );

    configService.get.mockImplementation((key: string) => {
      if (key === 'STRIPE_WEBHOOK_SECRET') return 'whsec_test';
      if (key === 'STRIPE_SECRET_KEY') return 'sk_test_123';
      return undefined;
    });

    const req = { rawBody: Buffer.from('test') } as never;
    const result = await controller.handleWebhook(req, 'sig_test');

    expect(result).toEqual({ received: true });
  });

  it('should handle missing metadata object in subscription.deleted', async () => {
    const mockConstructEvent = jest.fn().mockReturnValue({
      type: 'customer.subscription.deleted',
      id: 'evt_test',
      data: {
        object: {
          id: 'sub_test',
          // no metadata field at all
        },
      },
    } as unknown as Stripe.Event);

    jest.mocked(Stripe).mockImplementation(
      () =>
        ({
          webhooks: { constructEvent: mockConstructEvent },
        }) as unknown as Stripe,
    );

    configService.get.mockImplementation((key: string) => {
      if (key === 'STRIPE_WEBHOOK_SECRET') return 'whsec_test';
      if (key === 'STRIPE_SECRET_KEY') return 'sk_test_123';
      return undefined;
    });

    const req = { rawBody: Buffer.from('test') } as never;
    const result = await controller.handleWebhook(req, 'sig_test');

    expect(result).toEqual({ received: true });
  });

  it('should handle checkout.session without metadata', async () => {
    const mockConstructEvent = jest.fn().mockReturnValue({
      type: 'checkout.session.completed',
      id: 'evt_test',
      data: { object: { id: 'cs_test' } }, // no metadata
    } as unknown as Stripe.Event);

    jest.mocked(Stripe).mockImplementation(
      () =>
        ({
          webhooks: { constructEvent: mockConstructEvent },
        }) as unknown as Stripe,
    );

    configService.get.mockImplementation((key: string) => {
      if (key === 'STRIPE_WEBHOOK_SECRET') return 'whsec_test';
      if (key === 'STRIPE_SECRET_KEY') return 'sk_test_123';
      return undefined;
    });

    const req = { rawBody: Buffer.from('test') } as never;
    const result = await controller.handleWebhook(req, 'sig_test');

    expect(result).toEqual({ received: true });
  });
});
