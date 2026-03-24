import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@common/services/prisma.service';
import { SubscriptionService } from './subscription.service';
import { SubscriptionPlan, SubscriptionStatus, FeatureFlag } from '@prisma/client';
import { PLAN_LIMITS, AI_ADDON } from '../config/pricing.config';

describe('SubscriptionService', () => {
  let service: SubscriptionService;
  let prisma: Record<string, Record<string, jest.Mock> | jest.Mock>;
  let configService: { get: jest.Mock };

  const TENANT_ID = 'tenant-001';
  const SUBSCRIPTION_ID = 'sub-001';

  const now = new Date();
  const periodStart = new Date(now);
  const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const mockSubscription = {
    id: SUBSCRIPTION_ID,
    tenantId: TENANT_ID,
    plan: SubscriptionPlan.MEDIUM,
    status: SubscriptionStatus.ACTIVE,
    stripeCustomerId: 'cus_123',
    stripeSubscriptionId: 'sub_stripe_123',
    stripePriceId: 'price_123',
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
    features: [
      {
        id: 'feat-1',
        subscriptionId: SUBSCRIPTION_ID,
        feature: FeatureFlag.API_ACCESS,
        enabled: true,
        createdAt: now,
      },
      {
        id: 'feat-2',
        subscriptionId: SUBSCRIPTION_ID,
        feature: FeatureFlag.ADVANCED_REPORTS,
        enabled: true,
        createdAt: now,
      },
    ],
  };

  const mockTrialSubscription = {
    ...mockSubscription,
    id: 'sub-trial',
    plan: SubscriptionPlan.TRIAL,
    status: SubscriptionStatus.TRIAL,
    trialEndsAt: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    aiAddonEnabled: false,
    features: [
      {
        id: 'feat-t1',
        subscriptionId: 'sub-trial',
        feature: FeatureFlag.AI_INSPECTIONS,
        enabled: true,
        createdAt: now,
      },
    ],
  };

  const mockSmallSubscription = {
    ...mockSubscription,
    id: 'sub-small',
    plan: SubscriptionPlan.SMALL,
    status: SubscriptionStatus.ACTIVE,
    maxUsers: 3,
    maxLocations: 1,
    aiAddonEnabled: false,
    features: [
      {
        id: 'feat-s1',
        subscriptionId: 'sub-small',
        feature: FeatureFlag.OBD_INTEGRATION,
        enabled: true,
        createdAt: now,
      },
    ],
  };

  function createTransactionMock(): jest.Mock {
    return jest.fn(
      (callback: (tx: Record<string, Record<string, jest.Mock>>) => Promise<unknown>) => {
        const tx = {
          subscription: {
            update: jest
              .fn()
              .mockResolvedValue({ ...mockSubscription, features: mockSubscription.features }),
          },
          subscriptionChange: {
            create: jest.fn().mockResolvedValue({ id: 'change-001' }),
          },
          subscriptionFeature: {
            deleteMany: jest.fn().mockResolvedValue({ count: 2 }),
            createMany: jest.fn().mockResolvedValue({ count: 5 }),
          },
        };
        return callback(tx);
      },
    );
  }

  beforeEach(async () => {
    prisma = {
      subscription: {
        findUnique: jest.fn().mockResolvedValue(mockSubscription),
        findMany: jest.fn().mockResolvedValue([mockSubscription]),
        update: jest.fn().mockResolvedValue(mockSubscription),
        count: jest.fn().mockResolvedValue(10),
        groupBy: jest.fn().mockResolvedValue([]),
        aggregate: jest.fn().mockResolvedValue({ _sum: { aiAddonPrice: 200 } }),
      },
      subscriptionChange: {
        create: jest.fn().mockResolvedValue({ id: 'change-001' }),
      },
      subscriptionFeature: {
        deleteMany: jest.fn().mockResolvedValue({ count: 2 }),
        createMany: jest.fn().mockResolvedValue({ count: 5 }),
      },
      $transaction: createTransactionMock(),
    } as unknown as Record<string, Record<string, jest.Mock> | jest.Mock>;

    configService = {
      get: jest.fn().mockReturnValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionService,
        { provide: PrismaService, useValue: prisma },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<SubscriptionService>(SubscriptionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ==========================================
  // getSubscription
  // ==========================================

  describe('getSubscription', () => {
    it('should return formatted subscription response for an existing tenant', async () => {
      // Arrange
      const findUniqueMock = prisma.subscription as Record<string, jest.Mock>;
      findUniqueMock.findUnique.mockResolvedValue(mockSubscription);

      // Act
      const result = await service.getSubscription(TENANT_ID);

      // Assert
      expect(result.id).toBe(SUBSCRIPTION_ID);
      expect(result.plan).toBe(SubscriptionPlan.MEDIUM);
      expect(result.status).toBe(SubscriptionStatus.ACTIVE);
      expect(result.currentPeriodStart).toEqual(periodStart);
      expect(result.currentPeriodEnd).toEqual(periodEnd);
      expect(result.aiAddonEnabled).toBe(false);
      expect(result.features).toEqual([FeatureFlag.API_ACCESS, FeatureFlag.ADVANCED_REPORTS]);
    });

    it('should include correct plan limits in the response', async () => {
      // Arrange
      const findUniqueMock = prisma.subscription as Record<string, jest.Mock>;
      findUniqueMock.findUnique.mockResolvedValue(mockSubscription);
      const expectedLimits = PLAN_LIMITS[SubscriptionPlan.MEDIUM];

      // Act
      const result = await service.getSubscription(TENANT_ID);

      // Assert
      expect(result.limits.maxUsers).toBe(expectedLimits.maxUsers);
      expect(result.limits.maxLocations).toBe(expectedLimits.maxLocations);
      expect(result.limits.maxApiCallsPerMonth).toBe(expectedLimits.maxApiCallsPerMonth);
      expect(result.limits.maxStorageBytes).toBe(expectedLimits.maxStorageBytes);
    });

    it('should indicate paymentMethodRequired when trial without stripe customer', async () => {
      // Arrange
      const findUniqueMock = prisma.subscription as Record<string, jest.Mock>;
      findUniqueMock.findUnique.mockResolvedValue(mockTrialSubscription);

      // Act
      const result = await service.getSubscription(TENANT_ID);

      // Assert
      expect(result.stripe.paymentMethodRequired).toBe(true);
      expect(result.stripe.customerId).toBeUndefined();
      expect(result.trialEndsAt).toBeDefined();
    });

    it('should not require payment method when active with stripe customer', async () => {
      // Arrange
      const findUniqueMock = prisma.subscription as Record<string, jest.Mock>;
      findUniqueMock.findUnique.mockResolvedValue(mockSubscription);

      // Act
      const result = await service.getSubscription(TENANT_ID);

      // Assert
      expect(result.stripe.paymentMethodRequired).toBe(false);
      expect(result.stripe.customerId).toBe('cus_123');
      expect(result.stripe.subscriptionId).toBe('sub_stripe_123');
    });

    it('should throw NotFoundException when subscription does not exist', async () => {
      // Arrange
      const findUniqueMock = prisma.subscription as Record<string, jest.Mock>;
      findUniqueMock.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.getSubscription(TENANT_ID)).rejects.toThrow(NotFoundException);
    });

    it('should return trialEndsAt as undefined when not on trial', async () => {
      // Arrange
      const findUniqueMock = prisma.subscription as Record<string, jest.Mock>;
      findUniqueMock.findUnique.mockResolvedValue(mockSubscription);

      // Act
      const result = await service.getSubscription(TENANT_ID);

      // Assert
      expect(result.trialEndsAt).toBeUndefined();
    });
  });

  // ==========================================
  // getAllSubscriptions
  // ==========================================

  describe('getAllSubscriptions', () => {
    it('should return all subscriptions without filters', async () => {
      // Arrange
      const findManyMock = prisma.subscription as Record<string, jest.Mock>;
      findManyMock.findMany.mockResolvedValue([mockSubscription]);

      // Act
      const result = await service.getAllSubscriptions();

      // Assert
      expect(result.data).toHaveLength(1);
      expect(findManyMock.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {},
          orderBy: { createdAt: 'desc' },
        }),
      );
    });

    it('should filter by status when provided', async () => {
      // Arrange
      const findManyMock = prisma.subscription as Record<string, jest.Mock>;
      findManyMock.findMany.mockResolvedValue([mockSubscription]);

      // Act
      await service.getAllSubscriptions({ status: SubscriptionStatus.ACTIVE });

      // Assert
      expect(findManyMock.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: SubscriptionStatus.ACTIVE },
        }),
      );
    });

    it('should filter by plan when provided', async () => {
      // Arrange
      const findManyMock = prisma.subscription as Record<string, jest.Mock>;
      findManyMock.findMany.mockResolvedValue([]);

      // Act
      await service.getAllSubscriptions({ plan: SubscriptionPlan.ENTERPRISE });

      // Assert
      expect(findManyMock.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { plan: SubscriptionPlan.ENTERPRISE },
        }),
      );
    });

    it('should filter by both status and plan when provided', async () => {
      // Arrange
      const findManyMock = prisma.subscription as Record<string, jest.Mock>;
      findManyMock.findMany.mockResolvedValue([]);

      // Act
      await service.getAllSubscriptions({
        status: SubscriptionStatus.ACTIVE,
        plan: SubscriptionPlan.MEDIUM,
      });

      // Assert
      expect(findManyMock.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            status: SubscriptionStatus.ACTIVE,
            plan: SubscriptionPlan.MEDIUM,
          },
        }),
      );
    });

    it('should include tenant and features relations', async () => {
      // Arrange
      const findManyMock = prisma.subscription as Record<string, jest.Mock>;
      findManyMock.findMany.mockResolvedValue([]);

      // Act
      await service.getAllSubscriptions();

      // Assert
      expect(findManyMock.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            tenant: expect.objectContaining({
              select: expect.objectContaining({
                id: true,
                name: true,
                slug: true,
                isActive: true,
              }),
            }),
            features: true,
          }),
        }),
      );
    });
  });

  // ==========================================
  // upgradeSubscription
  // ==========================================

  describe('upgradeSubscription', () => {
    it('should successfully upgrade from SMALL to MEDIUM', async () => {
      // Arrange
      const findUniqueMock = prisma.subscription as Record<string, jest.Mock>;
      findUniqueMock.findUnique.mockResolvedValue({
        ...mockSmallSubscription,
        features: mockSmallSubscription.features,
      });

      // Act
      const result = await service.upgradeSubscription(TENANT_ID, {
        newPlan: SubscriptionPlan.MEDIUM,
        billingCycle: 'monthly',
      });

      // Assert
      expect(result.immediate).toBe(true);
      expect(result.proratedAmount).toBeDefined();
      expect(typeof result.proratedAmount).toBe('number');
      expect(prisma.$transaction as jest.Mock).toHaveBeenCalled();
    });

    it('should throw BadRequestException when upgrading to TRIAL', async () => {
      // Arrange
      const findUniqueMock = prisma.subscription as Record<string, jest.Mock>;
      findUniqueMock.findUnique.mockResolvedValue(mockSubscription);

      // Act & Assert
      await expect(
        service.upgradeSubscription(TENANT_ID, {
          newPlan: SubscriptionPlan.TRIAL,
          billingCycle: 'monthly',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when already on the same plan configuration', async () => {
      // Arrange
      const findUniqueMock = prisma.subscription as Record<string, jest.Mock>;
      findUniqueMock.findUnique.mockResolvedValue(mockSubscription);

      // Act & Assert
      await expect(
        service.upgradeSubscription(TENANT_ID, {
          newPlan: SubscriptionPlan.MEDIUM,
          billingCycle: 'monthly',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when subscription does not exist', async () => {
      // Arrange
      const findUniqueMock = prisma.subscription as Record<string, jest.Mock>;
      findUniqueMock.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.upgradeSubscription(TENANT_ID, {
          newPlan: SubscriptionPlan.ENTERPRISE,
          billingCycle: 'monthly',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should set cancelAtPeriodEnd to false for upgrades (immediate)', async () => {
      // Arrange
      const findUniqueMock = prisma.subscription as Record<string, jest.Mock>;
      findUniqueMock.findUnique.mockResolvedValue({
        ...mockSmallSubscription,
        features: mockSmallSubscription.features,
      });

      let capturedTxUpdateData: Record<string, unknown> | undefined;
      (prisma.$transaction as jest.Mock).mockImplementation(
        async (callback: (tx: Record<string, Record<string, jest.Mock>>) => Promise<unknown>) => {
          const tx = {
            subscription: {
              update: jest.fn().mockImplementation((args: { data: Record<string, unknown> }) => {
                capturedTxUpdateData = args.data;
                return Promise.resolve({ ...mockSubscription, ...args.data, features: [] });
              }),
            },
            subscriptionChange: {
              create: jest.fn().mockResolvedValue({ id: 'change-002' }),
            },
            subscriptionFeature: {
              deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
              createMany: jest.fn().mockResolvedValue({ count: 5 }),
            },
          };
          return callback(tx);
        },
      );

      // Act
      await service.upgradeSubscription(TENANT_ID, {
        newPlan: SubscriptionPlan.MEDIUM,
        billingCycle: 'monthly',
      });

      // Assert
      expect(capturedTxUpdateData).toBeDefined();
      expect(capturedTxUpdateData!.cancelAtPeriodEnd).toBe(false);
    });

    it('should set cancelAtPeriodEnd to true for downgrades within upgrade endpoint', async () => {
      // Arrange - current plan is ENTERPRISE, "upgrading" to MEDIUM is actually a downgrade
      const enterpriseSubscription = {
        ...mockSubscription,
        plan: SubscriptionPlan.ENTERPRISE,
        features: [],
      };
      const findUniqueMock = prisma.subscription as Record<string, jest.Mock>;
      findUniqueMock.findUnique.mockResolvedValue(enterpriseSubscription);

      let capturedTxUpdateData: Record<string, unknown> | undefined;
      (prisma.$transaction as jest.Mock).mockImplementation(
        async (callback: (tx: Record<string, Record<string, jest.Mock>>) => Promise<unknown>) => {
          const tx = {
            subscription: {
              update: jest.fn().mockImplementation((args: { data: Record<string, unknown> }) => {
                capturedTxUpdateData = args.data;
                return Promise.resolve({ ...mockSubscription, ...args.data, features: [] });
              }),
            },
            subscriptionChange: {
              create: jest.fn().mockResolvedValue({ id: 'change-003' }),
            },
            subscriptionFeature: {
              deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
              createMany: jest.fn().mockResolvedValue({ count: 5 }),
            },
          };
          return callback(tx);
        },
      );

      // Act
      await service.upgradeSubscription(TENANT_ID, {
        newPlan: SubscriptionPlan.MEDIUM,
        billingCycle: 'monthly',
      });

      // Assert
      expect(capturedTxUpdateData).toBeDefined();
      expect(capturedTxUpdateData!.cancelAtPeriodEnd).toBe(true);
    });

    it('should update plan limits correctly on upgrade', async () => {
      // Arrange
      const findUniqueMock = prisma.subscription as Record<string, jest.Mock>;
      findUniqueMock.findUnique.mockResolvedValue({
        ...mockSmallSubscription,
        features: [],
      });

      let capturedTxUpdateData: Record<string, unknown> | undefined;
      (prisma.$transaction as jest.Mock).mockImplementation(
        async (callback: (tx: Record<string, Record<string, jest.Mock>>) => Promise<unknown>) => {
          const tx = {
            subscription: {
              update: jest.fn().mockImplementation((args: { data: Record<string, unknown> }) => {
                capturedTxUpdateData = args.data;
                return Promise.resolve({ ...mockSubscription, ...args.data, features: [] });
              }),
            },
            subscriptionChange: {
              create: jest.fn().mockResolvedValue({ id: 'change-004' }),
            },
            subscriptionFeature: {
              deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
              createMany: jest.fn().mockResolvedValue({ count: 5 }),
            },
          };
          return callback(tx);
        },
      );

      // Act
      await service.upgradeSubscription(TENANT_ID, {
        newPlan: SubscriptionPlan.ENTERPRISE,
        billingCycle: 'yearly',
      });

      // Assert
      const enterpriseLimits = PLAN_LIMITS[SubscriptionPlan.ENTERPRISE];
      expect(capturedTxUpdateData).toBeDefined();
      expect(capturedTxUpdateData!.plan).toBe(SubscriptionPlan.ENTERPRISE);
      expect(capturedTxUpdateData!.maxUsers).toBe(enterpriseLimits.maxUsers ?? 999999);
      expect(capturedTxUpdateData!.maxLocations).toBe(enterpriseLimits.maxLocations ?? 999999);
      expect(capturedTxUpdateData!.apiCallsLimit).toBe(enterpriseLimits.maxApiCallsPerMonth);
      expect(capturedTxUpdateData!.storageLimitBytes).toBe(enterpriseLimits.maxStorageBytes);
    });

    it('should enable AI addon on upgrade when requested', async () => {
      // Arrange
      const findUniqueMock = prisma.subscription as Record<string, jest.Mock>;
      findUniqueMock.findUnique.mockResolvedValue({
        ...mockSmallSubscription,
        features: [],
      });

      let capturedTxUpdateData: Record<string, unknown> | undefined;
      (prisma.$transaction as jest.Mock).mockImplementation(
        async (callback: (tx: Record<string, Record<string, jest.Mock>>) => Promise<unknown>) => {
          const tx = {
            subscription: {
              update: jest.fn().mockImplementation((args: { data: Record<string, unknown> }) => {
                capturedTxUpdateData = args.data;
                return Promise.resolve({ ...mockSubscription, ...args.data, features: [] });
              }),
            },
            subscriptionChange: {
              create: jest.fn().mockResolvedValue({ id: 'change-005' }),
            },
            subscriptionFeature: {
              deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
              createMany: jest.fn().mockResolvedValue({ count: 5 }),
            },
          };
          return callback(tx);
        },
      );

      // Act
      await service.upgradeSubscription(TENANT_ID, {
        newPlan: SubscriptionPlan.MEDIUM,
        billingCycle: 'monthly',
        aiAddon: true,
      });

      // Assert
      expect(capturedTxUpdateData).toBeDefined();
      expect(capturedTxUpdateData!.aiAddonEnabled).toBe(true);
      expect(capturedTxUpdateData!.aiAddonPrice).toBe(AI_ADDON.monthlyPrice);
    });

    it('should log the subscription change as UPGRADE for plan upgrade', async () => {
      // Arrange
      const findUniqueMock = prisma.subscription as Record<string, jest.Mock>;
      findUniqueMock.findUnique.mockResolvedValue({
        ...mockSmallSubscription,
        features: [],
      });

      let capturedChangeData: Record<string, unknown> | undefined;
      (prisma.$transaction as jest.Mock).mockImplementation(
        async (callback: (tx: Record<string, Record<string, jest.Mock>>) => Promise<unknown>) => {
          const tx = {
            subscription: {
              update: jest.fn().mockResolvedValue({ ...mockSubscription, features: [] }),
            },
            subscriptionChange: {
              create: jest.fn().mockImplementation((args: { data: Record<string, unknown> }) => {
                capturedChangeData = args.data;
                return Promise.resolve({ id: 'change-006' });
              }),
            },
            subscriptionFeature: {
              deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
              createMany: jest.fn().mockResolvedValue({ count: 5 }),
            },
          };
          return callback(tx);
        },
      );

      // Act
      await service.upgradeSubscription(TENANT_ID, {
        newPlan: SubscriptionPlan.MEDIUM,
        billingCycle: 'monthly',
      });

      // Assert
      expect(capturedChangeData).toBeDefined();
      expect(capturedChangeData!.changeType).toBe('UPGRADE');
      expect(capturedChangeData!.oldPlan).toBe(SubscriptionPlan.SMALL);
      expect(capturedChangeData!.newPlan).toBe(SubscriptionPlan.MEDIUM);
      expect(capturedChangeData!.tenantId).toBe(TENANT_ID);
    });

    it('should calculate prorated amount between plans', async () => {
      // Arrange
      const findUniqueMock = prisma.subscription as Record<string, jest.Mock>;
      findUniqueMock.findUnique.mockResolvedValue({
        ...mockSmallSubscription,
        features: [],
      });

      // Act
      const result = await service.upgradeSubscription(TENANT_ID, {
        newPlan: SubscriptionPlan.MEDIUM,
        billingCycle: 'monthly',
      });

      // Assert
      expect(typeof result.proratedAmount).toBe('number');
      // Prorated amount should be positive for upgrade (MEDIUM > SMALL in price)
      expect(result.proratedAmount).toBeGreaterThanOrEqual(0);
    });
  });

  // ==========================================
  // downgradeSubscription
  // ==========================================

  describe('downgradeSubscription', () => {
    it('should schedule downgrade at period end', async () => {
      // Arrange
      const findUniqueMock = prisma.subscription as Record<string, jest.Mock>;
      findUniqueMock.findUnique.mockResolvedValue(mockSubscription);
      const updateMock = (prisma.subscription as Record<string, jest.Mock>).update;

      // Act
      const result = await service.downgradeSubscription(TENANT_ID, SubscriptionPlan.SMALL);

      // Assert
      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: TENANT_ID },
          data: expect.objectContaining({
            cancelAtPeriodEnd: true,
            metadata: expect.objectContaining({
              scheduledPlan: SubscriptionPlan.SMALL,
            }),
          }),
        }),
      );
      expect(result.effectiveDate).toEqual(mockSubscription.currentPeriodEnd);
    });

    it('should throw NotFoundException when subscription does not exist', async () => {
      // Arrange
      const findUniqueMock = prisma.subscription as Record<string, jest.Mock>;
      findUniqueMock.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.downgradeSubscription(TENANT_ID, SubscriptionPlan.SMALL),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when attempting to upgrade via downgrade endpoint', async () => {
      // Arrange - current plan is SMALL, trying to "downgrade" to ENTERPRISE is actually an upgrade
      const findUniqueMock = prisma.subscription as Record<string, jest.Mock>;
      findUniqueMock.findUnique.mockResolvedValue(mockSmallSubscription);

      // Act & Assert
      await expect(
        service.downgradeSubscription(TENANT_ID, SubscriptionPlan.ENTERPRISE),
      ).rejects.toThrow(BadRequestException);
    });

    it('should log the subscription change as DOWNGRADE', async () => {
      // Arrange
      const findUniqueMock = prisma.subscription as Record<string, jest.Mock>;
      findUniqueMock.findUnique.mockResolvedValue(mockSubscription);
      const changeCreateMock = (prisma.subscriptionChange as Record<string, jest.Mock>).create;

      // Act
      await service.downgradeSubscription(TENANT_ID, SubscriptionPlan.SMALL);

      // Assert
      expect(changeCreateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            changeType: 'DOWNGRADE',
            oldPlan: SubscriptionPlan.MEDIUM,
            newPlan: SubscriptionPlan.SMALL,
            tenantId: TENANT_ID,
          }),
        }),
      );
    });

    it('should return the current subscription and effective date', async () => {
      // Arrange
      const findUniqueMock = prisma.subscription as Record<string, jest.Mock>;
      findUniqueMock.findUnique.mockResolvedValue(mockSubscription);

      // Act
      const result = await service.downgradeSubscription(TENANT_ID, SubscriptionPlan.SMALL);

      // Assert
      expect(result.subscription).toBeDefined();
      expect(result.effectiveDate).toEqual(mockSubscription.currentPeriodEnd);
    });
  });

  // ==========================================
  // toggleAiAddon
  // ==========================================

  describe('toggleAiAddon', () => {
    it('should enable AI addon for MEDIUM plan', async () => {
      // Arrange
      const findUniqueMock = prisma.subscription as Record<string, jest.Mock>;
      findUniqueMock.findUnique.mockResolvedValue(mockSubscription);

      let capturedTxUpdateData: Record<string, unknown> | undefined;
      (prisma.$transaction as jest.Mock).mockImplementation(
        async (callback: (tx: Record<string, Record<string, jest.Mock>>) => Promise<unknown>) => {
          const tx = {
            subscription: {
              update: jest.fn().mockImplementation((args: { data: Record<string, unknown> }) => {
                capturedTxUpdateData = args.data;
                return Promise.resolve({ ...mockSubscription, ...args.data });
              }),
            },
            subscriptionChange: {
              create: jest.fn().mockResolvedValue({ id: 'change-ai-1' }),
            },
            subscriptionFeature: {
              deleteMany: jest.fn().mockResolvedValue({ count: 2 }),
              createMany: jest.fn().mockResolvedValue({ count: 5 }),
            },
          };
          return callback(tx);
        },
      );

      // Act
      await service.toggleAiAddon(TENANT_ID, true);

      // Assert
      expect(capturedTxUpdateData).toBeDefined();
      expect(capturedTxUpdateData!.aiAddonEnabled).toBe(true);
      expect(capturedTxUpdateData!.aiAddonPrice).toBe(AI_ADDON.monthlyPrice);
    });

    it('should disable AI addon', async () => {
      // Arrange
      const subscriptionWithAi = {
        ...mockSubscription,
        aiAddonEnabled: true,
        aiAddonPrice: AI_ADDON.monthlyPrice,
      };
      const findUniqueMock = prisma.subscription as Record<string, jest.Mock>;
      findUniqueMock.findUnique.mockResolvedValue(subscriptionWithAi);

      let capturedTxUpdateData: Record<string, unknown> | undefined;
      (prisma.$transaction as jest.Mock).mockImplementation(
        async (callback: (tx: Record<string, Record<string, jest.Mock>>) => Promise<unknown>) => {
          const tx = {
            subscription: {
              update: jest.fn().mockImplementation((args: { data: Record<string, unknown> }) => {
                capturedTxUpdateData = args.data;
                return Promise.resolve({ ...subscriptionWithAi, ...args.data });
              }),
            },
            subscriptionChange: {
              create: jest.fn().mockResolvedValue({ id: 'change-ai-2' }),
            },
            subscriptionFeature: {
              deleteMany: jest.fn().mockResolvedValue({ count: 2 }),
              createMany: jest.fn().mockResolvedValue({ count: 5 }),
            },
          };
          return callback(tx);
        },
      );

      // Act
      await service.toggleAiAddon(TENANT_ID, false);

      // Assert
      expect(capturedTxUpdateData).toBeDefined();
      expect(capturedTxUpdateData!.aiAddonEnabled).toBe(false);
      expect(capturedTxUpdateData!.aiAddonPrice).toBeNull();
    });

    it('should throw BadRequestException when enabling AI addon on SMALL plan', async () => {
      // Arrange
      const findUniqueMock = prisma.subscription as Record<string, jest.Mock>;
      findUniqueMock.findUnique.mockResolvedValue(mockSmallSubscription);

      // Act & Assert
      await expect(service.toggleAiAddon(TENANT_ID, true)).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when subscription does not exist', async () => {
      // Arrange
      const findUniqueMock = prisma.subscription as Record<string, jest.Mock>;
      findUniqueMock.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.toggleAiAddon(TENANT_ID, true)).rejects.toThrow(NotFoundException);
    });

    it('should log AI_ADDON_ENABLED change when enabling', async () => {
      // Arrange
      const findUniqueMock = prisma.subscription as Record<string, jest.Mock>;
      findUniqueMock.findUnique.mockResolvedValue(mockSubscription);

      let capturedChangeData: Record<string, unknown> | undefined;
      (prisma.$transaction as jest.Mock).mockImplementation(
        async (callback: (tx: Record<string, Record<string, jest.Mock>>) => Promise<unknown>) => {
          const tx = {
            subscription: {
              update: jest.fn().mockResolvedValue(mockSubscription),
            },
            subscriptionChange: {
              create: jest.fn().mockImplementation((args: { data: Record<string, unknown> }) => {
                capturedChangeData = args.data;
                return Promise.resolve({ id: 'change-ai-3' });
              }),
            },
            subscriptionFeature: {
              deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
              createMany: jest.fn().mockResolvedValue({ count: 5 }),
            },
          };
          return callback(tx);
        },
      );

      // Act
      await service.toggleAiAddon(TENANT_ID, true);

      // Assert
      expect(capturedChangeData).toBeDefined();
      expect(capturedChangeData!.changeType).toBe('AI_ADDON_ENABLED');
    });

    it('should log AI_ADDON_DISABLED change when disabling', async () => {
      // Arrange
      const subscriptionWithAi = { ...mockSubscription, aiAddonEnabled: true };
      const findUniqueMock = prisma.subscription as Record<string, jest.Mock>;
      findUniqueMock.findUnique.mockResolvedValue(subscriptionWithAi);

      let capturedChangeData: Record<string, unknown> | undefined;
      (prisma.$transaction as jest.Mock).mockImplementation(
        async (callback: (tx: Record<string, Record<string, jest.Mock>>) => Promise<unknown>) => {
          const tx = {
            subscription: {
              update: jest.fn().mockResolvedValue(subscriptionWithAi),
            },
            subscriptionChange: {
              create: jest.fn().mockImplementation((args: { data: Record<string, unknown> }) => {
                capturedChangeData = args.data;
                return Promise.resolve({ id: 'change-ai-4' });
              }),
            },
            subscriptionFeature: {
              deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
              createMany: jest.fn().mockResolvedValue({ count: 5 }),
            },
          };
          return callback(tx);
        },
      );

      // Act
      await service.toggleAiAddon(TENANT_ID, false);

      // Assert
      expect(capturedChangeData).toBeDefined();
      expect(capturedChangeData!.changeType).toBe('AI_ADDON_DISABLED');
    });
  });

  // ==========================================
  // cancelSubscription
  // ==========================================

  describe('cancelSubscription', () => {
    it('should cancel at period end by default', async () => {
      // Arrange
      const findUniqueMock = prisma.subscription as Record<string, jest.Mock>;
      findUniqueMock.findUnique.mockResolvedValue(mockSubscription);
      const updateMock = (prisma.subscription as Record<string, jest.Mock>).update;

      // Act
      const result = await service.cancelSubscription(TENANT_ID);

      // Assert
      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: TENANT_ID },
          data: { cancelAtPeriodEnd: true },
        }),
      );
      expect(result.dataRetentionDate).toBeDefined();
    });

    it('should cancel immediately when immediate flag is true', async () => {
      // Arrange
      const findUniqueMock = prisma.subscription as Record<string, jest.Mock>;
      findUniqueMock.findUnique.mockResolvedValue(mockSubscription);
      const updateMock = (prisma.subscription as Record<string, jest.Mock>).update;

      // Act
      await service.cancelSubscription(TENANT_ID, true);

      // Assert
      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: TENANT_ID },
          data: expect.objectContaining({
            status: SubscriptionStatus.EXPIRED,
            cancelledAt: expect.any(Date),
          }),
        }),
      );
    });

    it('should set data retention date to 6 months in the future', async () => {
      // Arrange
      const findUniqueMock = prisma.subscription as Record<string, jest.Mock>;
      findUniqueMock.findUnique.mockResolvedValue(mockSubscription);

      // Act
      const result = await service.cancelSubscription(TENANT_ID);

      // Assert
      const expectedRetentionDate = new Date();
      expectedRetentionDate.setMonth(expectedRetentionDate.getMonth() + 6);
      const diffMs = Math.abs(result.dataRetentionDate.getTime() - expectedRetentionDate.getTime());
      // Allow 5 seconds tolerance for test execution time
      expect(diffMs).toBeLessThan(5000);
    });

    it('should throw NotFoundException when subscription does not exist', async () => {
      // Arrange
      const findUniqueMock = prisma.subscription as Record<string, jest.Mock>;
      findUniqueMock.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.cancelSubscription(TENANT_ID)).rejects.toThrow(NotFoundException);
    });

    it('should log CANCEL change with correct statuses for immediate cancellation', async () => {
      // Arrange
      const findUniqueMock = prisma.subscription as Record<string, jest.Mock>;
      findUniqueMock.findUnique.mockResolvedValue(mockSubscription);
      const changeCreateMock = (prisma.subscriptionChange as Record<string, jest.Mock>).create;

      // Act
      await service.cancelSubscription(TENANT_ID, true);

      // Assert
      expect(changeCreateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            changeType: 'CANCEL',
            oldStatus: SubscriptionStatus.ACTIVE,
            newStatus: SubscriptionStatus.EXPIRED,
          }),
        }),
      );
    });

    it('should log CANCEL change preserving status for non-immediate cancellation', async () => {
      // Arrange
      const findUniqueMock = prisma.subscription as Record<string, jest.Mock>;
      findUniqueMock.findUnique.mockResolvedValue(mockSubscription);
      const changeCreateMock = (prisma.subscriptionChange as Record<string, jest.Mock>).create;

      // Act
      await service.cancelSubscription(TENANT_ID, false);

      // Assert
      expect(changeCreateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            changeType: 'CANCEL',
            oldStatus: SubscriptionStatus.ACTIVE,
            newStatus: SubscriptionStatus.ACTIVE,
          }),
        }),
      );
    });
  });

  // ==========================================
  // reactivateSubscription
  // ==========================================

  describe('reactivateSubscription', () => {
    it('should reactivate a cancelled subscription', async () => {
      // Arrange
      const cancelledSub = {
        ...mockSubscription,
        status: SubscriptionStatus.CANCELLED,
        cancelledAt: new Date(),
      };
      const findUniqueMock = prisma.subscription as Record<string, jest.Mock>;
      findUniqueMock.findUnique.mockResolvedValue(cancelledSub);

      let capturedTxUpdateData: Record<string, unknown> | undefined;
      (prisma.$transaction as jest.Mock).mockImplementation(
        async (callback: (tx: Record<string, Record<string, jest.Mock>>) => Promise<unknown>) => {
          const tx = {
            subscription: {
              update: jest.fn().mockImplementation((args: { data: Record<string, unknown> }) => {
                capturedTxUpdateData = args.data;
                return Promise.resolve({ ...mockSubscription, ...args.data });
              }),
            },
            subscriptionChange: {
              create: jest.fn().mockResolvedValue({ id: 'change-react-1' }),
            },
          };
          return callback(tx);
        },
      );

      // Act
      await service.reactivateSubscription(TENANT_ID);

      // Assert
      expect(capturedTxUpdateData).toBeDefined();
      expect(capturedTxUpdateData!.status).toBe(SubscriptionStatus.ACTIVE);
      expect(capturedTxUpdateData!.cancelAtPeriodEnd).toBe(false);
      expect(capturedTxUpdateData!.cancelledAt).toBeNull();
    });

    it('should reactivate an expired subscription', async () => {
      // Arrange
      const expiredSub = {
        ...mockSubscription,
        status: SubscriptionStatus.EXPIRED,
      };
      const findUniqueMock = prisma.subscription as Record<string, jest.Mock>;
      findUniqueMock.findUnique.mockResolvedValue(expiredSub);

      (prisma.$transaction as jest.Mock).mockImplementation(
        async (callback: (tx: Record<string, Record<string, jest.Mock>>) => Promise<unknown>) => {
          const tx = {
            subscription: {
              update: jest
                .fn()
                .mockResolvedValue({ ...expiredSub, status: SubscriptionStatus.ACTIVE }),
            },
            subscriptionChange: {
              create: jest.fn().mockResolvedValue({ id: 'change-react-2' }),
            },
          };
          return callback(tx);
        },
      );

      // Act & Assert - should not throw
      await expect(service.reactivateSubscription(TENANT_ID)).resolves.toBeDefined();
    });

    it('should throw BadRequestException when subscription is active', async () => {
      // Arrange
      const findUniqueMock = prisma.subscription as Record<string, jest.Mock>;
      findUniqueMock.findUnique.mockResolvedValue(mockSubscription);

      // Act & Assert
      await expect(service.reactivateSubscription(TENANT_ID)).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when subscription does not exist', async () => {
      // Arrange
      const findUniqueMock = prisma.subscription as Record<string, jest.Mock>;
      findUniqueMock.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.reactivateSubscription(TENANT_ID)).rejects.toThrow(NotFoundException);
    });

    it('should set new billing period of 30 days on reactivation', async () => {
      // Arrange
      const cancelledSub = {
        ...mockSubscription,
        status: SubscriptionStatus.CANCELLED,
      };
      const findUniqueMock = prisma.subscription as Record<string, jest.Mock>;
      findUniqueMock.findUnique.mockResolvedValue(cancelledSub);

      let capturedTxUpdateData: Record<string, unknown> | undefined;
      (prisma.$transaction as jest.Mock).mockImplementation(
        async (callback: (tx: Record<string, Record<string, jest.Mock>>) => Promise<unknown>) => {
          const tx = {
            subscription: {
              update: jest.fn().mockImplementation((args: { data: Record<string, unknown> }) => {
                capturedTxUpdateData = args.data;
                return Promise.resolve({ ...mockSubscription, ...args.data });
              }),
            },
            subscriptionChange: {
              create: jest.fn().mockResolvedValue({ id: 'change-react-3' }),
            },
          };
          return callback(tx);
        },
      );

      // Act
      await service.reactivateSubscription(TENANT_ID);

      // Assert
      expect(capturedTxUpdateData).toBeDefined();
      expect(capturedTxUpdateData!.currentPeriodStart).toBeInstanceOf(Date);
      expect(capturedTxUpdateData!.currentPeriodEnd).toBeInstanceOf(Date);
      const periodStartDate = capturedTxUpdateData!.currentPeriodStart as Date;
      const periodEndDate = capturedTxUpdateData!.currentPeriodEnd as Date;
      const diffDays = Math.round(
        (periodEndDate.getTime() - periodStartDate.getTime()) / (1000 * 60 * 60 * 24),
      );
      expect(diffDays).toBe(30);
    });

    it('should log REACTIVATE change with correct statuses', async () => {
      // Arrange
      const cancelledSub = {
        ...mockSubscription,
        status: SubscriptionStatus.CANCELLED,
      };
      const findUniqueMock = prisma.subscription as Record<string, jest.Mock>;
      findUniqueMock.findUnique.mockResolvedValue(cancelledSub);

      let capturedChangeData: Record<string, unknown> | undefined;
      (prisma.$transaction as jest.Mock).mockImplementation(
        async (callback: (tx: Record<string, Record<string, jest.Mock>>) => Promise<unknown>) => {
          const tx = {
            subscription: {
              update: jest
                .fn()
                .mockResolvedValue({ ...cancelledSub, status: SubscriptionStatus.ACTIVE }),
            },
            subscriptionChange: {
              create: jest.fn().mockImplementation((args: { data: Record<string, unknown> }) => {
                capturedChangeData = args.data;
                return Promise.resolve({ id: 'change-react-4' });
              }),
            },
          };
          return callback(tx);
        },
      );

      // Act
      await service.reactivateSubscription(TENANT_ID);

      // Assert
      expect(capturedChangeData).toBeDefined();
      expect(capturedChangeData!.changeType).toBe('REACTIVATE');
      expect(capturedChangeData!.oldStatus).toBe(SubscriptionStatus.CANCELLED);
      expect(capturedChangeData!.newStatus).toBe(SubscriptionStatus.ACTIVE);
    });
  });

  // ==========================================
  // adminUpdateSubscription
  // ==========================================

  describe('adminUpdateSubscription', () => {
    it('should update plan and apply new limits', async () => {
      // Arrange
      const findUniqueMock = prisma.subscription as Record<string, jest.Mock>;
      findUniqueMock.findUnique.mockResolvedValue(mockSubscription);
      const updateMock = (prisma.subscription as Record<string, jest.Mock>).update;

      // Act
      await service.adminUpdateSubscription(TENANT_ID, {
        plan: SubscriptionPlan.ENTERPRISE,
      });

      // Assert
      const enterpriseLimits = PLAN_LIMITS[SubscriptionPlan.ENTERPRISE];
      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: TENANT_ID },
          data: expect.objectContaining({
            plan: SubscriptionPlan.ENTERPRISE,
            maxUsers: enterpriseLimits.maxUsers ?? 999999,
            maxLocations: enterpriseLimits.maxLocations ?? 999999,
            apiCallsLimit: enterpriseLimits.maxApiCallsPerMonth,
            storageLimitBytes: enterpriseLimits.maxStorageBytes,
          }),
        }),
      );
    });

    it('should update status only', async () => {
      // Arrange
      const findUniqueMock = prisma.subscription as Record<string, jest.Mock>;
      findUniqueMock.findUnique.mockResolvedValue(mockSubscription);
      const updateMock = (prisma.subscription as Record<string, jest.Mock>).update;

      // Act
      await service.adminUpdateSubscription(TENANT_ID, {
        status: SubscriptionStatus.SUSPENDED,
      });

      // Assert
      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: SubscriptionStatus.SUSPENDED,
          }),
        }),
      );
    });

    it('should enable AI addon via admin update', async () => {
      // Arrange
      const findUniqueMock = prisma.subscription as Record<string, jest.Mock>;
      findUniqueMock.findUnique.mockResolvedValue(mockSubscription);
      const updateMock = (prisma.subscription as Record<string, jest.Mock>).update;

      // Act
      await service.adminUpdateSubscription(TENANT_ID, {
        aiAddonEnabled: true,
      });

      // Assert
      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            aiAddonEnabled: true,
            aiAddonPrice: AI_ADDON.monthlyPrice,
          }),
        }),
      );
    });

    it('should disable AI addon via admin update and reset price', async () => {
      // Arrange
      const findUniqueMock = prisma.subscription as Record<string, jest.Mock>;
      findUniqueMock.findUnique.mockResolvedValue({
        ...mockSubscription,
        aiAddonEnabled: true,
        aiAddonPrice: AI_ADDON.monthlyPrice,
      });
      const updateMock = (prisma.subscription as Record<string, jest.Mock>).update;

      // Act
      await service.adminUpdateSubscription(TENANT_ID, {
        aiAddonEnabled: false,
      });

      // Assert
      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            aiAddonEnabled: false,
            aiAddonPrice: null,
          }),
        }),
      );
    });

    it('should update currentPeriodEnd', async () => {
      // Arrange
      const findUniqueMock = prisma.subscription as Record<string, jest.Mock>;
      findUniqueMock.findUnique.mockResolvedValue(mockSubscription);
      const updateMock = (prisma.subscription as Record<string, jest.Mock>).update;
      const newEndDate = new Date('2025-12-31');

      // Act
      await service.adminUpdateSubscription(TENANT_ID, {
        currentPeriodEnd: newEndDate,
      });

      // Assert
      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            currentPeriodEnd: newEndDate,
          }),
        }),
      );
    });

    it('should throw NotFoundException when subscription does not exist', async () => {
      // Arrange
      const findUniqueMock = prisma.subscription as Record<string, jest.Mock>;
      findUniqueMock.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.adminUpdateSubscription(TENANT_ID, { plan: SubscriptionPlan.SMALL }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should sync features when plan is updated', async () => {
      // Arrange
      const findUniqueMock = prisma.subscription as Record<string, jest.Mock>;
      findUniqueMock.findUnique.mockResolvedValue(mockSubscription);
      const deleteFeaturesMock = (prisma.subscriptionFeature as Record<string, jest.Mock>)
        .deleteMany;
      const createFeaturesMock = (prisma.subscriptionFeature as Record<string, jest.Mock>)
        .createMany;

      // Act
      await service.adminUpdateSubscription(TENANT_ID, {
        plan: SubscriptionPlan.ENTERPRISE,
      });

      // Assert
      expect(deleteFeaturesMock).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { subscriptionId: SUBSCRIPTION_ID },
        }),
      );
      expect(createFeaturesMock).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.arrayContaining([
            expect.objectContaining({ subscriptionId: SUBSCRIPTION_ID, enabled: true }),
          ]),
        }),
      );
    });

    it('should sync features when aiAddonEnabled is toggled', async () => {
      // Arrange
      const findUniqueMock = prisma.subscription as Record<string, jest.Mock>;
      findUniqueMock.findUnique.mockResolvedValue(mockSubscription);
      const deleteFeaturesMock = (prisma.subscriptionFeature as Record<string, jest.Mock>)
        .deleteMany;

      // Act
      await service.adminUpdateSubscription(TENANT_ID, {
        aiAddonEnabled: true,
      });

      // Assert
      expect(deleteFeaturesMock).toHaveBeenCalled();
    });
  });

  // ==========================================
  // getSubscriptionAnalytics
  // ==========================================

  describe('getSubscriptionAnalytics', () => {
    it('should return analytics data with aggregated counts', async () => {
      // Arrange
      const subscriptionMock = prisma.subscription as Record<string, jest.Mock>;
      subscriptionMock.count
        .mockResolvedValueOnce(50) // totalSubscriptions
        .mockResolvedValueOnce(35); // trialConversions (non-trial count)
      subscriptionMock.groupBy
        .mockResolvedValueOnce([
          { plan: SubscriptionPlan.SMALL, _count: { plan: 20 } },
          { plan: SubscriptionPlan.MEDIUM, _count: { plan: 25 } },
          { plan: SubscriptionPlan.ENTERPRISE, _count: { plan: 5 } },
        ])
        .mockResolvedValueOnce([
          { status: SubscriptionStatus.ACTIVE, _count: { status: 40 } },
          { status: SubscriptionStatus.TRIAL, _count: { status: 10 } },
        ]);
      subscriptionMock.aggregate.mockResolvedValue({
        _sum: { aiAddonPrice: 2000 },
      });

      // Act
      const result = await service.getSubscriptionAnalytics();

      // Assert
      expect(result.totalSubscriptions).toBe(50);
      expect(result.trialConversions).toBe(35);
      expect(result.byPlan[SubscriptionPlan.SMALL]).toBe(20);
      expect(result.byPlan[SubscriptionPlan.MEDIUM]).toBe(25);
      expect(result.byPlan[SubscriptionPlan.ENTERPRISE]).toBe(5);
      expect(result.byStatus[SubscriptionStatus.ACTIVE]).toBe(40);
      expect(result.byStatus[SubscriptionStatus.TRIAL]).toBe(10);
      expect(result.aiAddonRevenue).toBe(2000);
    });

    it('should return 0 for AI addon revenue when null', async () => {
      // Arrange
      const subscriptionMock = prisma.subscription as Record<string, jest.Mock>;
      subscriptionMock.count.mockResolvedValue(0);
      subscriptionMock.groupBy.mockResolvedValue([]);
      subscriptionMock.aggregate.mockResolvedValue({
        _sum: { aiAddonPrice: null },
      });

      // Act
      const result = await service.getSubscriptionAnalytics();

      // Assert
      expect(result.aiAddonRevenue).toBe(0);
    });
  });

  // ==========================================
  // createStripeCheckoutSession
  // ==========================================

  describe('createStripeCheckoutSession', () => {
    it('should throw BadRequestException because Stripe is not configured', async () => {
      // Arrange & Act & Assert
      await expect(
        service.createStripeCheckoutSession(
          TENANT_ID,
          SubscriptionPlan.MEDIUM,
          'monthly',
          false,
          'https://app.example.com/success',
          'https://app.example.com/cancel',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ==========================================
  // Tenant Isolation
  // ==========================================

  describe('tenant isolation', () => {
    it('should always query by tenantId for getSubscription', async () => {
      // Arrange
      const findUniqueMock = prisma.subscription as Record<string, jest.Mock>;
      findUniqueMock.findUnique.mockResolvedValue(mockSubscription);

      // Act
      await service.getSubscription(TENANT_ID);

      // Assert
      expect(findUniqueMock.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: TENANT_ID },
        }),
      );
    });

    it('should always query by tenantId for upgradeSubscription', async () => {
      // Arrange
      const findUniqueMock = prisma.subscription as Record<string, jest.Mock>;
      findUniqueMock.findUnique.mockResolvedValue({
        ...mockSmallSubscription,
        features: [],
      });

      // Act
      await service.upgradeSubscription(TENANT_ID, {
        newPlan: SubscriptionPlan.MEDIUM,
        billingCycle: 'monthly',
      });

      // Assert
      expect(findUniqueMock.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: TENANT_ID },
        }),
      );
    });

    it('should always query by tenantId for cancelSubscription', async () => {
      // Arrange
      const findUniqueMock = prisma.subscription as Record<string, jest.Mock>;
      findUniqueMock.findUnique.mockResolvedValue(mockSubscription);

      // Act
      await service.cancelSubscription(TENANT_ID);

      // Assert
      expect(findUniqueMock.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: TENANT_ID },
        }),
      );
    });

    it('should pass tenantId to subscriptionChange for downgrade logging', async () => {
      // Arrange
      const findUniqueMock = prisma.subscription as Record<string, jest.Mock>;
      findUniqueMock.findUnique.mockResolvedValue(mockSubscription);
      const changeCreateMock = (prisma.subscriptionChange as Record<string, jest.Mock>).create;

      // Act
      await service.downgradeSubscription(TENANT_ID, SubscriptionPlan.SMALL);

      // Assert
      expect(changeCreateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: TENANT_ID,
          }),
        }),
      );
    });
  });

  // ==========================================
  // Trial period handling
  // ==========================================

  describe('trial period handling', () => {
    it('should include trial end date in response for trial subscriptions', async () => {
      // Arrange
      const findUniqueMock = prisma.subscription as Record<string, jest.Mock>;
      findUniqueMock.findUnique.mockResolvedValue(mockTrialSubscription);

      // Act
      const result = await service.getSubscription(TENANT_ID);

      // Assert
      expect(result.trialEndsAt).toBeDefined();
      expect(result.plan).toBe(SubscriptionPlan.TRIAL);
      expect(result.status).toBe(SubscriptionStatus.TRIAL);
    });

    it('should have correct trial plan limits', async () => {
      // Arrange
      const findUniqueMock = prisma.subscription as Record<string, jest.Mock>;
      findUniqueMock.findUnique.mockResolvedValue(mockTrialSubscription);
      const trialLimits = PLAN_LIMITS[SubscriptionPlan.TRIAL];

      // Act
      const result = await service.getSubscription(TENANT_ID);

      // Assert
      expect(result.limits.maxUsers).toBe(trialLimits.maxUsers);
      expect(result.limits.maxLocations).toBe(trialLimits.maxLocations);
      expect(result.limits.maxApiCallsPerMonth).toBe(trialLimits.maxApiCallsPerMonth);
    });

    it('should prevent upgrading to trial plan', async () => {
      // Arrange
      const findUniqueMock = prisma.subscription as Record<string, jest.Mock>;
      findUniqueMock.findUnique.mockResolvedValue(mockSubscription);

      // Act & Assert
      await expect(
        service.upgradeSubscription(TENANT_ID, {
          newPlan: SubscriptionPlan.TRIAL,
          billingCycle: 'monthly',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
