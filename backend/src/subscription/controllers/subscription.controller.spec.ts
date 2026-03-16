import { Test, TestingModule } from '@nestjs/testing';
import { SubscriptionController } from './subscription.controller';
import { SubscriptionService } from '../services/subscription.service';
import { FeatureAccessService } from '../services/feature-access.service';

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
  });
});
