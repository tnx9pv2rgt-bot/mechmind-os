import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@common/services/prisma.service';
import { FeatureAccessService } from './feature-access.service';
import { SubscriptionPlan, SubscriptionStatus, FeatureFlag } from '@prisma/client';
import { PLAN_FEATURES, PLAN_LIMITS } from '../config/pricing.config';

describe('FeatureAccessService', () => {
  let service: FeatureAccessService;
  let prisma: Record<string, Record<string, jest.Mock> | jest.Mock>;

  const TENANT_ID = 'tenant-001';
  const SUBSCRIPTION_ID = 'sub-001';

  const now = new Date();
  const periodStart = new Date(now);
  const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const mockMediumSubscription = {
    id: SUBSCRIPTION_ID,
    tenantId: TENANT_ID,
    plan: SubscriptionPlan.MEDIUM,
    status: SubscriptionStatus.ACTIVE,
    stripeCustomerId: 'cus_123',
    stripeSubscriptionId: 'sub_stripe_123',
    currentPeriodStart: periodStart,
    currentPeriodEnd: periodEnd,
    trialEndsAt: null,
    cancelAtPeriodEnd: false,
    cancelledAt: null,
    aiAddonEnabled: false,
    aiAddonPrice: null,
    apiCallsUsed: 100,
    apiCallsLimit: 25000,
    storageUsedBytes: BigInt(1024),
    storageLimitBytes: BigInt(50 * 1024 * 1024 * 1024),
    maxUsers: 10,
    maxLocations: 2,
    metadata: {},
    createdAt: now,
    updatedAt: now,
    features: PLAN_FEATURES[SubscriptionPlan.MEDIUM].map((feature, index) => ({
      id: `feat-${index}`,
      subscriptionId: SUBSCRIPTION_ID,
      feature,
      enabled: true,
      createdAt: now,
    })),
  };

  const mockSmallSubscription = {
    ...mockMediumSubscription,
    id: 'sub-small',
    plan: SubscriptionPlan.SMALL,
    status: SubscriptionStatus.ACTIVE,
    maxUsers: 3,
    maxLocations: 1,
    apiCallsUsed: 50,
    apiCallsLimit: 5000,
    storageUsedBytes: BigInt(512),
    storageLimitBytes: BigInt(10 * 1024 * 1024 * 1024),
    aiAddonEnabled: false,
    features: PLAN_FEATURES[SubscriptionPlan.SMALL].map((feature, index) => ({
      id: `feat-s${index}`,
      subscriptionId: 'sub-small',
      feature,
      enabled: true,
      createdAt: now,
    })),
  };

  const mockTrialSubscription = {
    ...mockMediumSubscription,
    id: 'sub-trial',
    plan: SubscriptionPlan.TRIAL,
    status: SubscriptionStatus.TRIAL,
    trialEndsAt: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    maxUsers: 3,
    maxLocations: 1,
    apiCallsUsed: 10,
    apiCallsLimit: 1000,
    storageUsedBytes: BigInt(256),
    storageLimitBytes: BigInt(5 * 1024 * 1024 * 1024),
    aiAddonEnabled: false,
    features: PLAN_FEATURES[SubscriptionPlan.TRIAL].map((feature, index) => ({
      id: `feat-t${index}`,
      subscriptionId: 'sub-trial',
      feature,
      enabled: true,
      createdAt: now,
    })),
  };

  const mockExpiredSubscription = {
    ...mockMediumSubscription,
    id: 'sub-expired',
    status: SubscriptionStatus.EXPIRED,
    features: [],
  };

  const mockEnterpriseSubscription = {
    ...mockMediumSubscription,
    id: 'sub-enterprise',
    plan: SubscriptionPlan.ENTERPRISE,
    status: SubscriptionStatus.ACTIVE,
    maxUsers: 999999,
    maxLocations: 999999,
    apiCallsUsed: 500,
    apiCallsLimit: null,
    storageUsedBytes: BigInt(0),
    storageLimitBytes: null,
    aiAddonEnabled: true,
    features: PLAN_FEATURES[SubscriptionPlan.ENTERPRISE].map((feature, index) => ({
      id: `feat-e${index}`,
      subscriptionId: 'sub-enterprise',
      feature,
      enabled: true,
      createdAt: now,
    })),
  };

  beforeEach(async () => {
    prisma = {
      subscription: {
        findUnique: jest.fn().mockResolvedValue(mockMediumSubscription),
        update: jest.fn().mockResolvedValue(mockMediumSubscription),
      },
      user: {
        count: jest.fn().mockResolvedValue(5),
      },
      location: {
        count: jest.fn().mockResolvedValue(1),
      },
      customer: {
        count: jest.fn().mockResolvedValue(100),
      },
      inspection: {
        count: jest.fn().mockResolvedValue(50),
      },
      usageTracking: {
        upsert: jest.fn().mockResolvedValue({ id: 'usage-001' }),
      },
      $transaction: jest.fn(
        (callback: (tx: Record<string, Record<string, jest.Mock>>) => Promise<unknown>) => {
          const tx = {
            subscription: {
              update: jest.fn().mockResolvedValue(mockMediumSubscription),
            },
            usageTracking: {
              upsert: jest.fn().mockResolvedValue({ id: 'usage-001' }),
            },
          };
          return callback(tx);
        },
      ),
    } as unknown as Record<string, Record<string, jest.Mock> | jest.Mock>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [FeatureAccessService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<FeatureAccessService>(FeatureAccessService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ==========================================
  // canAccessFeature
  // ==========================================

  describe('canAccessFeature', () => {
    it('should allow access to a feature included in the current plan', async () => {
      // Arrange
      const findUniqueMock = prisma.subscription as Record<string, jest.Mock>;
      findUniqueMock.findUnique.mockResolvedValue(mockMediumSubscription);

      // Act
      const result = await service.canAccessFeature(TENANT_ID, FeatureFlag.API_ACCESS);

      // Assert
      expect(result.allowed).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should deny access when no subscription exists', async () => {
      // Arrange
      const findUniqueMock = prisma.subscription as Record<string, jest.Mock>;
      findUniqueMock.findUnique.mockResolvedValue(null);

      // Act
      const result = await service.canAccessFeature(TENANT_ID, FeatureFlag.API_ACCESS);

      // Assert
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('No subscription found');
    });

    it('should deny access when subscription is expired', async () => {
      // Arrange
      const findUniqueMock = prisma.subscription as Record<string, jest.Mock>;
      findUniqueMock.findUnique.mockResolvedValue(mockExpiredSubscription);

      // Act
      const result = await service.canAccessFeature(TENANT_ID, FeatureFlag.API_ACCESS);

      // Assert
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('expired');
    });

    it('should deny access when subscription is cancelled', async () => {
      // Arrange
      const cancelledSub = {
        ...mockMediumSubscription,
        status: SubscriptionStatus.CANCELLED,
        features: [],
      };
      const findUniqueMock = prisma.subscription as Record<string, jest.Mock>;
      findUniqueMock.findUnique.mockResolvedValue(cancelledSub);

      // Act
      const result = await service.canAccessFeature(TENANT_ID, FeatureFlag.API_ACCESS);

      // Assert
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('cancelled');
    });

    it('should allow access when subscription is in TRIAL status', async () => {
      // Arrange
      const findUniqueMock = prisma.subscription as Record<string, jest.Mock>;
      findUniqueMock.findUnique.mockResolvedValue(mockTrialSubscription);

      // Act - AI_INSPECTIONS is in TRIAL plan features
      const result = await service.canAccessFeature(TENANT_ID, FeatureFlag.AI_INSPECTIONS);

      // Assert
      expect(result.allowed).toBe(true);
    });

    it('should allow access when subscription is in PAST_DUE status', async () => {
      // Arrange
      const pastDueSub = {
        ...mockMediumSubscription,
        status: SubscriptionStatus.PAST_DUE,
      };
      const findUniqueMock = prisma.subscription as Record<string, jest.Mock>;
      findUniqueMock.findUnique.mockResolvedValue(pastDueSub);

      // Act
      const result = await service.canAccessFeature(TENANT_ID, FeatureFlag.API_ACCESS);

      // Assert
      expect(result.allowed).toBe(true);
    });

    it('should deny AI features when AI addon is not enabled and feature not explicitly enabled', async () => {
      // Arrange - SMALL plan without AI addon, AI_INSPECTIONS not in SMALL plan
      const findUniqueMock = prisma.subscription as Record<string, jest.Mock>;
      findUniqueMock.findUnique.mockResolvedValue(mockSmallSubscription);

      // Act
      const result = await service.canAccessFeature(TENANT_ID, FeatureFlag.AI_INSPECTIONS);

      // Assert
      expect(result.allowed).toBe(false);
      expect(result.requiresAiAddon).toBe(true);
      expect(result.requiredPlan).toBe(SubscriptionPlan.MEDIUM);
    });

    it('should allow AI features when AI addon is enabled', async () => {
      // Arrange
      const subWithAi = {
        ...mockMediumSubscription,
        aiAddonEnabled: true,
        features: [
          ...mockMediumSubscription.features,
          {
            id: 'feat-ai',
            subscriptionId: SUBSCRIPTION_ID,
            feature: FeatureFlag.AI_INSPECTIONS,
            enabled: true,
            createdAt: now,
          },
        ],
      };
      const findUniqueMock = prisma.subscription as Record<string, jest.Mock>;
      findUniqueMock.findUnique.mockResolvedValue(subWithAi);

      // Act
      const result = await service.canAccessFeature(TENANT_ID, FeatureFlag.AI_INSPECTIONS);

      // Assert
      expect(result.allowed).toBe(true);
    });

    it('should deny feature not included in plan and suggest upgrade', async () => {
      // Arrange - SMALL plan does not include WHITE_LABEL
      const findUniqueMock = prisma.subscription as Record<string, jest.Mock>;
      findUniqueMock.findUnique.mockResolvedValue(mockSmallSubscription);

      // Act
      const result = await service.canAccessFeature(TENANT_ID, FeatureFlag.WHITE_LABEL);

      // Assert
      expect(result.allowed).toBe(false);
      expect(result.requiredPlan).toBeDefined();
      expect(result.reason).toContain('Upgrade');
    });

    it('should allow all enterprise features for enterprise plan', async () => {
      // Arrange
      const findUniqueMock = prisma.subscription as Record<string, jest.Mock>;
      findUniqueMock.findUnique.mockResolvedValue(mockEnterpriseSubscription);

      // Act
      const results = await Promise.all(
        PLAN_FEATURES[SubscriptionPlan.ENTERPRISE].map(feature =>
          service.canAccessFeature(TENANT_ID, feature),
        ),
      );

      // Assert
      results.forEach(result => {
        expect(result.allowed).toBe(true);
      });
    });

    it('should deny MULTI_LOCATION for SMALL plan', async () => {
      // Arrange
      const findUniqueMock = prisma.subscription as Record<string, jest.Mock>;
      findUniqueMock.findUnique.mockResolvedValue(mockSmallSubscription);

      // Act
      const result = await service.canAccessFeature(TENANT_ID, FeatureFlag.MULTI_LOCATION);

      // Assert
      expect(result.allowed).toBe(false);
      expect(result.requiredPlan).toBe(SubscriptionPlan.MEDIUM);
    });

    it('should allow explicitly enabled feature even if not in plan', async () => {
      // Arrange - SMALL plan but with API_ACCESS explicitly enabled
      const subWithExplicitFeature = {
        ...mockSmallSubscription,
        features: [
          ...mockSmallSubscription.features,
          {
            id: 'feat-explicit',
            subscriptionId: 'sub-small',
            feature: FeatureFlag.API_ACCESS,
            enabled: true,
            createdAt: now,
          },
        ],
      };
      const findUniqueMock = prisma.subscription as Record<string, jest.Mock>;
      findUniqueMock.findUnique.mockResolvedValue(subWithExplicitFeature);

      // Act
      const result = await service.canAccessFeature(TENANT_ID, FeatureFlag.API_ACCESS);

      // Assert
      expect(result.allowed).toBe(true);
    });
  });

  // ==========================================
  // canAccessFeatures (multiple)
  // ==========================================

  describe('canAccessFeatures', () => {
    it('should check multiple features and return results for each', async () => {
      // Arrange
      const findUniqueMock = prisma.subscription as Record<string, jest.Mock>;
      findUniqueMock.findUnique.mockResolvedValue(mockMediumSubscription);
      const features = [
        FeatureFlag.API_ACCESS,
        FeatureFlag.WHITE_LABEL,
        FeatureFlag.ADVANCED_REPORTS,
      ];

      // Act
      const results = await service.canAccessFeatures(TENANT_ID, features);

      // Assert
      expect(results[FeatureFlag.API_ACCESS].allowed).toBe(true);
      expect(results[FeatureFlag.WHITE_LABEL].allowed).toBe(false);
      expect(results[FeatureFlag.ADVANCED_REPORTS].allowed).toBe(true);
    });

    it('should return empty result for empty features array', async () => {
      // Arrange
      const findUniqueMock = prisma.subscription as Record<string, jest.Mock>;
      findUniqueMock.findUnique.mockResolvedValue(mockMediumSubscription);

      // Act
      const results = await service.canAccessFeatures(TENANT_ID, []);

      // Assert
      expect(Object.keys(results)).toHaveLength(0);
    });
  });

  // ==========================================
  // assertCanAccessFeature
  // ==========================================

  describe('assertCanAccessFeature', () => {
    it('should not throw when feature is allowed', async () => {
      // Arrange
      const findUniqueMock = prisma.subscription as Record<string, jest.Mock>;
      findUniqueMock.findUnique.mockResolvedValue(mockMediumSubscription);

      // Act & Assert
      await expect(
        service.assertCanAccessFeature(TENANT_ID, FeatureFlag.API_ACCESS),
      ).resolves.toBeUndefined();
    });

    it('should throw ForbiddenException when feature is not allowed', async () => {
      // Arrange
      const findUniqueMock = prisma.subscription as Record<string, jest.Mock>;
      findUniqueMock.findUnique.mockResolvedValue(mockSmallSubscription);

      // Act & Assert
      await expect(
        service.assertCanAccessFeature(TENANT_ID, FeatureFlag.WHITE_LABEL),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should include FEATURE_NOT_AVAILABLE code in ForbiddenException', async () => {
      // Arrange
      const findUniqueMock = prisma.subscription as Record<string, jest.Mock>;
      findUniqueMock.findUnique.mockResolvedValue(mockSmallSubscription);

      // Act & Assert
      try {
        await service.assertCanAccessFeature(TENANT_ID, FeatureFlag.WHITE_LABEL);
        fail('Should have thrown ForbiddenException');
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        const response = (error as ForbiddenException).getResponse();
        expect(response).toEqual(
          expect.objectContaining({
            code: 'FEATURE_NOT_AVAILABLE',
            feature: FeatureFlag.WHITE_LABEL,
          }),
        );
      }
    });

    it('should include requiredPlan in ForbiddenException for upgrade guidance', async () => {
      // Arrange
      const findUniqueMock = prisma.subscription as Record<string, jest.Mock>;
      findUniqueMock.findUnique.mockResolvedValue(mockSmallSubscription);

      // Act & Assert
      try {
        await service.assertCanAccessFeature(TENANT_ID, FeatureFlag.MULTI_LOCATION);
        fail('Should have thrown ForbiddenException');
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        const response = (error as ForbiddenException).getResponse();
        expect(response).toEqual(
          expect.objectContaining({
            requiredPlan: SubscriptionPlan.MEDIUM,
          }),
        );
      }
    });

    it('should include requiresAiAddon flag for AI features', async () => {
      // Arrange
      const findUniqueMock = prisma.subscription as Record<string, jest.Mock>;
      findUniqueMock.findUnique.mockResolvedValue(mockSmallSubscription);

      // Act & Assert
      try {
        await service.assertCanAccessFeature(TENANT_ID, FeatureFlag.AI_INSPECTIONS);
        fail('Should have thrown ForbiddenException');
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        const response = (error as ForbiddenException).getResponse();
        expect(response).toEqual(
          expect.objectContaining({
            requiresAiAddon: true,
          }),
        );
      }
    });
  });

  // ==========================================
  // checkAllLimits
  // ==========================================

  describe('checkAllLimits', () => {
    it('should return usage status for all resource types', async () => {
      // Arrange
      const findUniqueMock = prisma.subscription as Record<string, jest.Mock>;
      findUniqueMock.findUnique.mockResolvedValue(mockMediumSubscription);
      (prisma.user as Record<string, jest.Mock>).count.mockResolvedValue(5);
      (prisma.location as Record<string, jest.Mock>).count.mockResolvedValue(1);
      (prisma.customer as Record<string, jest.Mock>).count.mockResolvedValue(100);
      (prisma.inspection as Record<string, jest.Mock>).count.mockResolvedValue(50);

      // Act
      const result = await service.checkAllLimits(TENANT_ID);

      // Assert
      expect(result.users).toBeDefined();
      expect(result.locations).toBeDefined();
      expect(result.apiCalls).toBeDefined();
      expect(result.storage).toBeDefined();
      expect(result.customers).toBeDefined();
      expect(result.inspections).toBeDefined();
    });

    it('should show within limit when usage is below the limit', async () => {
      // Arrange
      const findUniqueMock = prisma.subscription as Record<string, jest.Mock>;
      findUniqueMock.findUnique.mockResolvedValue(mockMediumSubscription);
      (prisma.user as Record<string, jest.Mock>).count.mockResolvedValue(5);
      (prisma.location as Record<string, jest.Mock>).count.mockResolvedValue(1);
      (prisma.customer as Record<string, jest.Mock>).count.mockResolvedValue(100);
      (prisma.inspection as Record<string, jest.Mock>).count.mockResolvedValue(50);

      // Act
      const result = await service.checkAllLimits(TENANT_ID);

      // Assert
      expect(result.users.withinLimit).toBe(true);
      expect(result.users.current).toBe(5);
      expect(result.users.limit).toBe(PLAN_LIMITS[SubscriptionPlan.MEDIUM].maxUsers);
      expect(result.locations.withinLimit).toBe(true);
    });

    it('should show not within limit when usage exceeds limit', async () => {
      // Arrange
      const findUniqueMock = prisma.subscription as Record<string, jest.Mock>;
      findUniqueMock.findUnique.mockResolvedValue(mockMediumSubscription);
      (prisma.user as Record<string, jest.Mock>).count.mockResolvedValue(15); // exceeds 10
      (prisma.location as Record<string, jest.Mock>).count.mockResolvedValue(1);
      (prisma.customer as Record<string, jest.Mock>).count.mockResolvedValue(100);
      (prisma.inspection as Record<string, jest.Mock>).count.mockResolvedValue(50);

      // Act
      const result = await service.checkAllLimits(TENANT_ID);

      // Assert
      expect(result.users.withinLimit).toBe(false);
      expect(result.users.current).toBe(15);
      expect(result.users.remaining).toBe(0);
    });

    it('should throw ForbiddenException when no subscription found', async () => {
      // Arrange
      const findUniqueMock = prisma.subscription as Record<string, jest.Mock>;
      findUniqueMock.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.checkAllLimits(TENANT_ID)).rejects.toThrow(ForbiddenException);
    });

    it('should show unlimited for enterprise plan', async () => {
      // Arrange
      const findUniqueMock = prisma.subscription as Record<string, jest.Mock>;
      findUniqueMock.findUnique.mockResolvedValue(mockEnterpriseSubscription);
      (prisma.user as Record<string, jest.Mock>).count.mockResolvedValue(50);
      (prisma.location as Record<string, jest.Mock>).count.mockResolvedValue(10);
      (prisma.customer as Record<string, jest.Mock>).count.mockResolvedValue(5000);
      (prisma.inspection as Record<string, jest.Mock>).count.mockResolvedValue(500);

      // Act
      const result = await service.checkAllLimits(TENANT_ID);

      // Assert
      expect(result.users.withinLimit).toBe(true);
      expect(result.users.limit).toBeNull();
      expect(result.users.remaining).toBe(Infinity);
      expect(result.locations.withinLimit).toBe(true);
      expect(result.locations.limit).toBeNull();
      expect(result.apiCalls.withinLimit).toBe(true);
      expect(result.apiCalls.limit).toBeNull();
    });

    it('should calculate correct warning levels', async () => {
      // Arrange - 9 of 10 users = 90% usage
      const findUniqueMock = prisma.subscription as Record<string, jest.Mock>;
      findUniqueMock.findUnique.mockResolvedValue(mockMediumSubscription);
      (prisma.user as Record<string, jest.Mock>).count.mockResolvedValue(9);
      (prisma.location as Record<string, jest.Mock>).count.mockResolvedValue(1);
      (prisma.customer as Record<string, jest.Mock>).count.mockResolvedValue(100);
      (prisma.inspection as Record<string, jest.Mock>).count.mockResolvedValue(50);

      // Act
      const result = await service.checkAllLimits(TENANT_ID);

      // Assert
      expect(result.users.warningLevel).toBe('warning'); // 90% is >= 80% but < 95%
      expect(result.users.percentageUsed).toBe(90);
    });

    it('should show critical warning at 95% or above', async () => {
      // Arrange - 10 of 10 users = 100% usage
      const findUniqueMock = prisma.subscription as Record<string, jest.Mock>;
      findUniqueMock.findUnique.mockResolvedValue(mockMediumSubscription);
      (prisma.user as Record<string, jest.Mock>).count.mockResolvedValue(10);
      (prisma.location as Record<string, jest.Mock>).count.mockResolvedValue(1);
      (prisma.customer as Record<string, jest.Mock>).count.mockResolvedValue(100);
      (prisma.inspection as Record<string, jest.Mock>).count.mockResolvedValue(50);

      // Act
      const result = await service.checkAllLimits(TENANT_ID);

      // Assert
      expect(result.users.warningLevel).toBe('critical'); // 100% >= 95%
    });
  });

  // ==========================================
  // checkSpecificLimit
  // ==========================================

  describe('checkSpecificLimit', () => {
    it('should check maxUsers limit correctly', async () => {
      // Arrange
      const findUniqueMock = prisma.subscription as Record<string, jest.Mock>;
      findUniqueMock.findUnique.mockResolvedValue(mockMediumSubscription);
      (prisma.user as Record<string, jest.Mock>).count.mockResolvedValue(7);

      // Act
      const result = await service.checkSpecificLimit(TENANT_ID, 'maxUsers');

      // Assert
      expect(result.withinLimit).toBe(true);
      expect(result.current).toBe(7);
      expect(result.limit).toBe(10);
      expect(result.remaining).toBe(3);
    });

    it('should check maxLocations limit correctly', async () => {
      // Arrange
      const findUniqueMock = prisma.subscription as Record<string, jest.Mock>;
      findUniqueMock.findUnique.mockResolvedValue(mockMediumSubscription);
      (prisma.location as Record<string, jest.Mock>).count.mockResolvedValue(2);

      // Act
      const result = await service.checkSpecificLimit(TENANT_ID, 'maxLocations');

      // Assert
      expect(result.withinLimit).toBe(true);
      expect(result.current).toBe(2);
      expect(result.limit).toBe(2);
      expect(result.remaining).toBe(0);
    });

    it('should check maxApiCallsPerMonth using subscription counter', async () => {
      // Arrange
      const findUniqueMock = prisma.subscription as Record<string, jest.Mock>;
      findUniqueMock.findUnique.mockResolvedValue(mockMediumSubscription);

      // Act
      const result = await service.checkSpecificLimit(TENANT_ID, 'maxApiCallsPerMonth');

      // Assert
      expect(result.withinLimit).toBe(true);
      expect(result.current).toBe(mockMediumSubscription.apiCallsUsed);
      expect(result.limit).toBe(PLAN_LIMITS[SubscriptionPlan.MEDIUM].maxApiCallsPerMonth);
    });

    it('should check maxStorageBytes using subscription counter', async () => {
      // Arrange
      const findUniqueMock = prisma.subscription as Record<string, jest.Mock>;
      findUniqueMock.findUnique.mockResolvedValue(mockMediumSubscription);

      // Act
      const result = await service.checkSpecificLimit(TENANT_ID, 'maxStorageBytes');

      // Assert
      expect(result.withinLimit).toBe(true);
      expect(result.current).toBe(Number(mockMediumSubscription.storageUsedBytes));
    });

    it('should check maxCustomers limit correctly', async () => {
      // Arrange
      const findUniqueMock = prisma.subscription as Record<string, jest.Mock>;
      findUniqueMock.findUnique.mockResolvedValue(mockMediumSubscription);
      (prisma.customer as Record<string, jest.Mock>).count.mockResolvedValue(2400);

      // Act
      const result = await service.checkSpecificLimit(TENANT_ID, 'maxCustomers');

      // Assert
      expect(result.withinLimit).toBe(true);
      expect(result.current).toBe(2400);
      expect(result.limit).toBe(PLAN_LIMITS[SubscriptionPlan.MEDIUM].maxCustomers);
    });

    it('should check maxInspectionsPerMonth limit correctly', async () => {
      // Arrange
      const findUniqueMock = prisma.subscription as Record<string, jest.Mock>;
      findUniqueMock.findUnique.mockResolvedValue(mockMediumSubscription);
      (prisma.inspection as Record<string, jest.Mock>).count.mockResolvedValue(800);

      // Act
      const result = await service.checkSpecificLimit(TENANT_ID, 'maxInspectionsPerMonth');

      // Assert
      expect(result.withinLimit).toBe(true);
      expect(result.current).toBe(800);
      expect(result.limit).toBe(PLAN_LIMITS[SubscriptionPlan.MEDIUM].maxInspectionsPerMonth);
    });

    it('should throw ForbiddenException when no subscription found', async () => {
      // Arrange
      const findUniqueMock = prisma.subscription as Record<string, jest.Mock>;
      findUniqueMock.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.checkSpecificLimit(TENANT_ID, 'maxUsers')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should return unlimited for enterprise plan limits', async () => {
      // Arrange
      const findUniqueMock = prisma.subscription as Record<string, jest.Mock>;
      findUniqueMock.findUnique.mockResolvedValue(mockEnterpriseSubscription);
      (prisma.user as Record<string, jest.Mock>).count.mockResolvedValue(100);

      // Act
      const result = await service.checkSpecificLimit(TENANT_ID, 'maxUsers');

      // Assert
      expect(result.withinLimit).toBe(true);
      expect(result.limit).toBeNull();
      expect(result.remaining).toBe(Infinity);
      expect(result.percentageUsed).toBe(0);
      expect(result.warningLevel).toBe('none');
    });
  });

  // ==========================================
  // canAddResource
  // ==========================================

  describe('canAddResource', () => {
    it('should allow adding a user when within limit', async () => {
      // Arrange
      const findUniqueMock = prisma.subscription as Record<string, jest.Mock>;
      findUniqueMock.findUnique.mockResolvedValue(mockMediumSubscription);
      (prisma.user as Record<string, jest.Mock>).count.mockResolvedValue(8); // 8 of 10

      // Act
      const result = await service.canAddResource(TENANT_ID, 'user');

      // Assert
      expect(result.withinLimit).toBe(true);
      expect(result.current).toBe(9); // simulated +1
      expect(result.remaining).toBe(1); // 10 - 8 - 1 = 1
    });

    it('should deny adding a user when at the limit', async () => {
      // Arrange
      const findUniqueMock = prisma.subscription as Record<string, jest.Mock>;
      findUniqueMock.findUnique.mockResolvedValue(mockMediumSubscription);
      (prisma.user as Record<string, jest.Mock>).count.mockResolvedValue(10); // at limit

      // Act
      const result = await service.canAddResource(TENANT_ID, 'user');

      // Assert
      expect(result.withinLimit).toBe(false);
      expect(result.current).toBe(11); // simulated +1
      expect(result.remaining).toBe(0);
    });

    it('should allow adding a location when within limit', async () => {
      // Arrange
      const findUniqueMock = prisma.subscription as Record<string, jest.Mock>;
      findUniqueMock.findUnique.mockResolvedValue(mockMediumSubscription);
      (prisma.location as Record<string, jest.Mock>).count.mockResolvedValue(1); // 1 of 2

      // Act
      const result = await service.canAddResource(TENANT_ID, 'location');

      // Assert
      expect(result.withinLimit).toBe(true);
      expect(result.current).toBe(2);
      expect(result.remaining).toBe(0); // exactly at limit after adding
    });

    it('should deny adding a location when at limit', async () => {
      // Arrange
      const findUniqueMock = prisma.subscription as Record<string, jest.Mock>;
      findUniqueMock.findUnique.mockResolvedValue(mockMediumSubscription);
      (prisma.location as Record<string, jest.Mock>).count.mockResolvedValue(2); // at limit

      // Act
      const result = await service.canAddResource(TENANT_ID, 'location');

      // Assert
      expect(result.withinLimit).toBe(false);
    });

    it('should allow adding a customer when within limit', async () => {
      // Arrange
      const findUniqueMock = prisma.subscription as Record<string, jest.Mock>;
      findUniqueMock.findUnique.mockResolvedValue(mockMediumSubscription);
      (prisma.customer as Record<string, jest.Mock>).count.mockResolvedValue(2499); // 2499 of 2500

      // Act
      const result = await service.canAddResource(TENANT_ID, 'customer');

      // Assert
      expect(result.withinLimit).toBe(true);
      expect(result.current).toBe(2500);
      expect(result.remaining).toBe(0);
    });

    it('should always allow adding resources on enterprise plan (unlimited)', async () => {
      // Arrange
      const findUniqueMock = prisma.subscription as Record<string, jest.Mock>;
      findUniqueMock.findUnique.mockResolvedValue(mockEnterpriseSubscription);
      (prisma.user as Record<string, jest.Mock>).count.mockResolvedValue(1000);

      // Act
      const result = await service.canAddResource(TENANT_ID, 'user');

      // Assert
      expect(result.withinLimit).toBe(true);
      expect(result.remaining).toBe(Infinity);
    });
  });

  // ==========================================
  // assertWithinLimit
  // ==========================================

  describe('assertWithinLimit', () => {
    it('should not throw when within limit', async () => {
      // Arrange
      const findUniqueMock = prisma.subscription as Record<string, jest.Mock>;
      findUniqueMock.findUnique.mockResolvedValue(mockMediumSubscription);
      (prisma.user as Record<string, jest.Mock>).count.mockResolvedValue(5);

      // Act & Assert
      await expect(service.assertWithinLimit(TENANT_ID, 'maxUsers')).resolves.toBeUndefined();
    });

    it('should throw ForbiddenException when limit is exceeded', async () => {
      // Arrange
      const findUniqueMock = prisma.subscription as Record<string, jest.Mock>;
      findUniqueMock.findUnique.mockResolvedValue(mockMediumSubscription);
      (prisma.user as Record<string, jest.Mock>).count.mockResolvedValue(15); // exceeds 10

      // Act & Assert
      await expect(service.assertWithinLimit(TENANT_ID, 'maxUsers')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should include LIMIT_EXCEEDED code in ForbiddenException', async () => {
      // Arrange
      const findUniqueMock = prisma.subscription as Record<string, jest.Mock>;
      findUniqueMock.findUnique.mockResolvedValue(mockMediumSubscription);
      (prisma.user as Record<string, jest.Mock>).count.mockResolvedValue(15);

      // Act & Assert
      try {
        await service.assertWithinLimit(TENANT_ID, 'maxUsers');
        fail('Should have thrown ForbiddenException');
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        const response = (error as ForbiddenException).getResponse();
        expect(response).toEqual(
          expect.objectContaining({
            code: 'LIMIT_EXCEEDED',
            limit: 10,
            current: 15,
          }),
        );
      }
    });

    it('should include descriptive message for user limit exceeded', async () => {
      // Arrange
      const findUniqueMock = prisma.subscription as Record<string, jest.Mock>;
      findUniqueMock.findUnique.mockResolvedValue(mockMediumSubscription);
      (prisma.user as Record<string, jest.Mock>).count.mockResolvedValue(15);

      // Act & Assert
      try {
        await service.assertWithinLimit(TENANT_ID, 'maxUsers');
        fail('Should have thrown ForbiddenException');
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        const response = (error as ForbiddenException).getResponse();
        expect((response as Record<string, string>).message).toContain('user');
      }
    });

    it('should never throw for enterprise unlimited limits', async () => {
      // Arrange
      const findUniqueMock = prisma.subscription as Record<string, jest.Mock>;
      findUniqueMock.findUnique.mockResolvedValue(mockEnterpriseSubscription);
      (prisma.user as Record<string, jest.Mock>).count.mockResolvedValue(9999);

      // Act & Assert
      await expect(service.assertWithinLimit(TENANT_ID, 'maxUsers')).resolves.toBeUndefined();
    });
  });

  // ==========================================
  // recordApiCall
  // ==========================================

  describe('recordApiCall', () => {
    it('should increment API call counter and create usage record', async () => {
      // Arrange
      let capturedSubscriptionUpdate: Record<string, unknown> | undefined;
      let capturedUsageUpsert: Record<string, unknown> | undefined;

      (prisma.$transaction as jest.Mock).mockImplementation(
        async (callback: (tx: Record<string, Record<string, jest.Mock>>) => Promise<unknown>) => {
          const tx = {
            subscription: {
              update: jest.fn().mockImplementation((args: Record<string, unknown>) => {
                capturedSubscriptionUpdate = args;
                return Promise.resolve(mockMediumSubscription);
              }),
            },
            usageTracking: {
              upsert: jest.fn().mockImplementation((args: Record<string, unknown>) => {
                capturedUsageUpsert = args;
                return Promise.resolve({ id: 'usage-001' });
              }),
            },
          };
          return callback(tx);
        },
      );

      // Act
      await service.recordApiCall(TENANT_ID, '/api/bookings');

      // Assert
      expect(capturedSubscriptionUpdate).toBeDefined();
      expect((capturedSubscriptionUpdate as Record<string, Record<string, unknown>>).where).toEqual(
        { tenantId: TENANT_ID },
      );
      expect((capturedSubscriptionUpdate as Record<string, Record<string, unknown>>).data).toEqual(
        expect.objectContaining({
          apiCallsUsed: { increment: 1 },
        }),
      );
      expect(capturedUsageUpsert).toBeDefined();
    });

    it('should include storage bytes when provided', async () => {
      // Arrange
      let capturedSubscriptionUpdate: Record<string, unknown> | undefined;

      (prisma.$transaction as jest.Mock).mockImplementation(
        async (callback: (tx: Record<string, Record<string, jest.Mock>>) => Promise<unknown>) => {
          const tx = {
            subscription: {
              update: jest.fn().mockImplementation((args: Record<string, unknown>) => {
                capturedSubscriptionUpdate = args;
                return Promise.resolve(mockMediumSubscription);
              }),
            },
            usageTracking: {
              upsert: jest.fn().mockResolvedValue({ id: 'usage-002' }),
            },
          };
          return callback(tx);
        },
      );

      // Act
      await service.recordApiCall(TENANT_ID, '/api/uploads', 1024);

      // Assert
      expect(capturedSubscriptionUpdate).toBeDefined();
      const data = (capturedSubscriptionUpdate as Record<string, Record<string, unknown>>).data;
      expect(data.storageUsedBytes).toEqual({ increment: BigInt(1024) });
    });

    it('should not increment storage when bytesTransferred is 0', async () => {
      // Arrange
      let capturedSubscriptionUpdate: Record<string, unknown> | undefined;

      (prisma.$transaction as jest.Mock).mockImplementation(
        async (callback: (tx: Record<string, Record<string, jest.Mock>>) => Promise<unknown>) => {
          const tx = {
            subscription: {
              update: jest.fn().mockImplementation((args: Record<string, unknown>) => {
                capturedSubscriptionUpdate = args;
                return Promise.resolve(mockMediumSubscription);
              }),
            },
            usageTracking: {
              upsert: jest.fn().mockResolvedValue({ id: 'usage-003' }),
            },
          };
          return callback(tx);
        },
      );

      // Act
      await service.recordApiCall(TENANT_ID, '/api/bookings', 0);

      // Assert
      expect(capturedSubscriptionUpdate).toBeDefined();
      const data = (capturedSubscriptionUpdate as Record<string, Record<string, unknown>>).data;
      expect(data.storageUsedBytes).toBeUndefined();
    });

    it('should upsert usage tracking with correct year and month', async () => {
      // Arrange
      let capturedUsageUpsert: Record<string, unknown> | undefined;

      (prisma.$transaction as jest.Mock).mockImplementation(
        async (callback: (tx: Record<string, Record<string, jest.Mock>>) => Promise<unknown>) => {
          const tx = {
            subscription: {
              update: jest.fn().mockResolvedValue(mockMediumSubscription),
            },
            usageTracking: {
              upsert: jest.fn().mockImplementation((args: Record<string, unknown>) => {
                capturedUsageUpsert = args;
                return Promise.resolve({ id: 'usage-004' });
              }),
            },
          };
          return callback(tx);
        },
      );

      // Act
      await service.recordApiCall(TENANT_ID, '/api/customers');

      // Assert
      expect(capturedUsageUpsert).toBeDefined();
      const currentDate = new Date();
      const whereClause = capturedUsageUpsert as Record<
        string,
        Record<string, Record<string, unknown>>
      >;
      expect(whereClause.where.tenantId_year_month).toEqual(
        expect.objectContaining({
          tenantId: TENANT_ID,
          year: currentDate.getFullYear(),
          month: currentDate.getMonth() + 1,
        }),
      );
    });
  });

  // ==========================================
  // getUsageStats
  // ==========================================

  describe('getUsageStats', () => {
    it('should return complete usage statistics', async () => {
      // Arrange
      const findUniqueMock = prisma.subscription as Record<string, jest.Mock>;
      findUniqueMock.findUnique.mockResolvedValue(mockMediumSubscription);
      (prisma.user as Record<string, jest.Mock>).count.mockResolvedValue(5);
      (prisma.location as Record<string, jest.Mock>).count.mockResolvedValue(1);
      (prisma.customer as Record<string, jest.Mock>).count.mockResolvedValue(200);
      (prisma.inspection as Record<string, jest.Mock>).count.mockResolvedValue(80);

      // Act
      const result = await service.getUsageStats(TENANT_ID);

      // Assert
      expect(result.plan).toBe(SubscriptionPlan.MEDIUM);
      expect(result.status).toBe(SubscriptionStatus.ACTIVE);
      expect(result.aiAddonEnabled).toBe(false);
      expect(result.period.start).toEqual(periodStart);
      expect(result.period.end).toEqual(periodEnd);
      expect(result.period.daysRemaining).toBeGreaterThan(0);
    });

    it('should calculate usage percentages correctly', async () => {
      // Arrange
      const findUniqueMock = prisma.subscription as Record<string, jest.Mock>;
      findUniqueMock.findUnique.mockResolvedValue(mockMediumSubscription);
      (prisma.user as Record<string, jest.Mock>).count.mockResolvedValue(5); // 50% of 10
      (prisma.location as Record<string, jest.Mock>).count.mockResolvedValue(1); // 50% of 2
      (prisma.customer as Record<string, jest.Mock>).count.mockResolvedValue(1250); // 50% of 2500
      (prisma.inspection as Record<string, jest.Mock>).count.mockResolvedValue(500); // 50% of 1000

      // Act
      const result = await service.getUsageStats(TENANT_ID);

      // Assert
      expect(result.usage.users.percentage).toBe(50);
      expect(result.usage.locations.percentage).toBe(50);
      expect(result.usage.customers.percentage).toBe(50);
      expect(result.usage.inspections.percentage).toBe(50);
    });

    it('should return 0 percentages for enterprise unlimited resources', async () => {
      // Arrange
      const findUniqueMock = prisma.subscription as Record<string, jest.Mock>;
      findUniqueMock.findUnique.mockResolvedValue(mockEnterpriseSubscription);
      (prisma.user as Record<string, jest.Mock>).count.mockResolvedValue(50);
      (prisma.location as Record<string, jest.Mock>).count.mockResolvedValue(10);
      (prisma.customer as Record<string, jest.Mock>).count.mockResolvedValue(5000);
      (prisma.inspection as Record<string, jest.Mock>).count.mockResolvedValue(500);

      // Act
      const result = await service.getUsageStats(TENANT_ID);

      // Assert
      expect(result.usage.users.percentage).toBe(0);
      expect(result.usage.locations.percentage).toBe(0);
      expect(result.usage.apiCalls.percentage).toBe(0);
      expect(result.usage.storage.percentage).toBe(0);
      expect(result.usage.customers.percentage).toBe(0);
      expect(result.usage.inspections.percentage).toBe(0);
    });

    it('should throw ForbiddenException when no subscription exists', async () => {
      // Arrange
      const findUniqueMock = prisma.subscription as Record<string, jest.Mock>;
      findUniqueMock.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.getUsageStats(TENANT_ID)).rejects.toThrow(ForbiddenException);
    });

    it('should include current usage counts in response', async () => {
      // Arrange
      const findUniqueMock = prisma.subscription as Record<string, jest.Mock>;
      findUniqueMock.findUnique.mockResolvedValue(mockMediumSubscription);
      (prisma.user as Record<string, jest.Mock>).count.mockResolvedValue(7);
      (prisma.location as Record<string, jest.Mock>).count.mockResolvedValue(2);
      (prisma.customer as Record<string, jest.Mock>).count.mockResolvedValue(300);
      (prisma.inspection as Record<string, jest.Mock>).count.mockResolvedValue(150);

      // Act
      const result = await service.getUsageStats(TENANT_ID);

      // Assert
      expect(result.usage.users.current).toBe(7);
      expect(result.usage.locations.current).toBe(2);
      expect(result.usage.customers.current).toBe(300);
      expect(result.usage.inspections.current).toBe(150);
      expect(result.usage.apiCalls.current).toBe(mockMediumSubscription.apiCallsUsed);
      expect(result.usage.storage.current).toBe(Number(mockMediumSubscription.storageUsedBytes));
    });

    it('should include correct limits from plan config', async () => {
      // Arrange
      const findUniqueMock = prisma.subscription as Record<string, jest.Mock>;
      findUniqueMock.findUnique.mockResolvedValue(mockMediumSubscription);
      (prisma.user as Record<string, jest.Mock>).count.mockResolvedValue(1);
      (prisma.location as Record<string, jest.Mock>).count.mockResolvedValue(1);
      (prisma.customer as Record<string, jest.Mock>).count.mockResolvedValue(1);
      (prisma.inspection as Record<string, jest.Mock>).count.mockResolvedValue(1);

      const mediumLimits = PLAN_LIMITS[SubscriptionPlan.MEDIUM];

      // Act
      const result = await service.getUsageStats(TENANT_ID);

      // Assert
      expect(result.usage.users.limit).toBe(mediumLimits.maxUsers);
      expect(result.usage.locations.limit).toBe(mediumLimits.maxLocations);
      expect(result.usage.apiCalls.limit).toBe(mediumLimits.maxApiCallsPerMonth);
      expect(result.usage.customers.limit).toBe(mediumLimits.maxCustomers);
      expect(result.usage.inspections.limit).toBe(mediumLimits.maxInspectionsPerMonth);
    });
  });

  // ==========================================
  // Tenant Isolation
  // ==========================================

  describe('tenant isolation', () => {
    it('should always query by tenantId for feature access checks', async () => {
      // Arrange
      const findUniqueMock = prisma.subscription as Record<string, jest.Mock>;
      findUniqueMock.findUnique.mockResolvedValue(mockMediumSubscription);
      const differentTenantId = 'tenant-999';

      // Act
      await service.canAccessFeature(differentTenantId, FeatureFlag.API_ACCESS);

      // Assert
      expect(findUniqueMock.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: differentTenantId },
        }),
      );
    });

    it('should always query by tenantId for limit checks', async () => {
      // Arrange
      const findUniqueMock = prisma.subscription as Record<string, jest.Mock>;
      findUniqueMock.findUnique.mockResolvedValue(mockMediumSubscription);
      (prisma.user as Record<string, jest.Mock>).count.mockResolvedValue(1);

      // Act
      await service.checkSpecificLimit(TENANT_ID, 'maxUsers');

      // Assert
      expect(findUniqueMock.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: TENANT_ID },
        }),
      );
      expect((prisma.user as Record<string, jest.Mock>).count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: TENANT_ID },
        }),
      );
    });

    it('should always query by tenantId for usage stats', async () => {
      // Arrange
      const findUniqueMock = prisma.subscription as Record<string, jest.Mock>;
      findUniqueMock.findUnique.mockResolvedValue(mockMediumSubscription);
      (prisma.user as Record<string, jest.Mock>).count.mockResolvedValue(1);
      (prisma.location as Record<string, jest.Mock>).count.mockResolvedValue(1);
      (prisma.customer as Record<string, jest.Mock>).count.mockResolvedValue(1);
      (prisma.inspection as Record<string, jest.Mock>).count.mockResolvedValue(1);

      // Act
      await service.getUsageStats(TENANT_ID);

      // Assert
      expect(findUniqueMock.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: TENANT_ID },
        }),
      );
    });

    it('should pass tenantId to recordApiCall transaction', async () => {
      // Arrange
      let capturedTenantId: string | undefined;

      (prisma.$transaction as jest.Mock).mockImplementation(
        async (callback: (tx: Record<string, Record<string, jest.Mock>>) => Promise<unknown>) => {
          const tx = {
            subscription: {
              update: jest
                .fn()
                .mockImplementation((args: Record<string, Record<string, string>>) => {
                  capturedTenantId = args.where.tenantId;
                  return Promise.resolve(mockMediumSubscription);
                }),
            },
            usageTracking: {
              upsert: jest.fn().mockResolvedValue({ id: 'usage-010' }),
            },
          };
          return callback(tx);
        },
      );

      // Act
      await service.recordApiCall(TENANT_ID, '/api/test');

      // Assert
      expect(capturedTenantId).toBe(TENANT_ID);
    });
  });

  // ==========================================
  // Feature gating per plan
  // ==========================================

  describe('feature gating per plan', () => {
    it('should grant SMALL plan only its designated features', async () => {
      // Arrange
      const findUniqueMock = prisma.subscription as Record<string, jest.Mock>;
      findUniqueMock.findUnique.mockResolvedValue(mockSmallSubscription);
      const smallFeatures = PLAN_FEATURES[SubscriptionPlan.SMALL];

      // Act
      const results = await Promise.all(
        smallFeatures.map(feature => service.canAccessFeature(TENANT_ID, feature)),
      );

      // Assert
      results.forEach(result => {
        expect(result.allowed).toBe(true);
      });
    });

    it('should deny SMALL plan features not in its list', async () => {
      // Arrange
      const findUniqueMock = prisma.subscription as Record<string, jest.Mock>;
      findUniqueMock.findUnique.mockResolvedValue(mockSmallSubscription);

      // CUSTOM_BRANDING is only in MEDIUM+
      const result = await service.canAccessFeature(TENANT_ID, FeatureFlag.CUSTOM_BRANDING);

      // Assert
      expect(result.allowed).toBe(false);
    });

    it('should grant MEDIUM plan all its designated features', async () => {
      // Arrange
      const findUniqueMock = prisma.subscription as Record<string, jest.Mock>;
      findUniqueMock.findUnique.mockResolvedValue(mockMediumSubscription);
      const mediumFeatures = PLAN_FEATURES[SubscriptionPlan.MEDIUM];

      // Act
      const results = await Promise.all(
        mediumFeatures.map(feature => service.canAccessFeature(TENANT_ID, feature)),
      );

      // Assert
      results.forEach(result => {
        expect(result.allowed).toBe(true);
      });
    });

    it('should grant ENTERPRISE plan all features', async () => {
      // Arrange
      const findUniqueMock = prisma.subscription as Record<string, jest.Mock>;
      findUniqueMock.findUnique.mockResolvedValue(mockEnterpriseSubscription);
      const enterpriseFeatures = PLAN_FEATURES[SubscriptionPlan.ENTERPRISE];

      // Act
      const results = await Promise.all(
        enterpriseFeatures.map(feature => service.canAccessFeature(TENANT_ID, feature)),
      );

      // Assert
      results.forEach(result => {
        expect(result.allowed).toBe(true);
      });
    });

    it('should require AI addon for AI_INSPECTIONS on non-trial plan without addon', async () => {
      // Arrange
      const findUniqueMock = prisma.subscription as Record<string, jest.Mock>;
      findUniqueMock.findUnique.mockResolvedValue(mockMediumSubscription);

      // Act
      const result = await service.canAccessFeature(TENANT_ID, FeatureFlag.AI_INSPECTIONS);

      // Assert
      expect(result.allowed).toBe(false);
      expect(result.requiresAiAddon).toBe(true);
    });

    it('should require AI addon for VOICE_ASSISTANT on non-enterprise plan without addon', async () => {
      // Arrange
      const findUniqueMock = prisma.subscription as Record<string, jest.Mock>;
      findUniqueMock.findUnique.mockResolvedValue(mockMediumSubscription);

      // Act
      const result = await service.canAccessFeature(TENANT_ID, FeatureFlag.VOICE_ASSISTANT);

      // Assert
      expect(result.allowed).toBe(false);
      expect(result.requiresAiAddon).toBe(true);
    });

    it('should allow AI features on TRIAL plan (trial includes AI_INSPECTIONS)', async () => {
      // Arrange
      const findUniqueMock = prisma.subscription as Record<string, jest.Mock>;
      findUniqueMock.findUnique.mockResolvedValue(mockTrialSubscription);

      // Act
      const result = await service.canAccessFeature(TENANT_ID, FeatureFlag.AI_INSPECTIONS);

      // Assert
      expect(result.allowed).toBe(true);
    });
  });

  // ==========================================
  // Error handling
  // ==========================================

  describe('error handling', () => {
    it('should handle database errors in canAccessFeature gracefully', async () => {
      // Arrange
      const findUniqueMock = prisma.subscription as Record<string, jest.Mock>;
      findUniqueMock.findUnique.mockRejectedValue(new Error('Database connection lost'));

      // Act & Assert
      await expect(service.canAccessFeature(TENANT_ID, FeatureFlag.API_ACCESS)).rejects.toThrow(
        'Database connection lost',
      );
    });

    it('should handle database errors in checkAllLimits gracefully', async () => {
      // Arrange
      const findUniqueMock = prisma.subscription as Record<string, jest.Mock>;
      findUniqueMock.findUnique.mockRejectedValue(new Error('Connection timeout'));

      // Act & Assert
      await expect(service.checkAllLimits(TENANT_ID)).rejects.toThrow('Connection timeout');
    });

    it('should handle database errors in recordApiCall gracefully', async () => {
      // Arrange
      (prisma.$transaction as jest.Mock).mockRejectedValue(new Error('Transaction failed'));

      // Act & Assert
      await expect(service.recordApiCall(TENANT_ID, '/api/test')).rejects.toThrow(
        'Transaction failed',
      );
    });

    it('should handle concurrent usage check without subscription', async () => {
      // Arrange
      const findUniqueMock = prisma.subscription as Record<string, jest.Mock>;
      findUniqueMock.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.getUsageStats(TENANT_ID)).rejects.toThrow(ForbiddenException);
    });
  });
});
