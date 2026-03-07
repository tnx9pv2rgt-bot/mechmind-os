/**
 * FEATURE ACCESS SERVICE TESTS
 */

import { Test, TestingModule } from '@nestjs/testing';
import { FeatureAccessService } from '../services/feature-access.service';
import { PrismaService } from '../../common/services/prisma.service';
import { SubscriptionPlan, SubscriptionStatus, FeatureFlag } from '@prisma/client';

// Mock Prisma
const mockPrisma = {
  subscription: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  user: {
    count: jest.fn(),
  },
  location: {
    count: jest.fn(),
  },
  customer: {
    count: jest.fn(),
  },
  inspection: {
    count: jest.fn(),
  },
  usageTracking: {
    upsert: jest.fn(),
  },
  $transaction: jest.fn((callback) => callback(mockPrisma)),
};

describe('FeatureAccessService', () => {
  let service: FeatureAccessService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeatureAccessService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<FeatureAccessService>(FeatureAccessService);
    jest.clearAllMocks();
  });

  describe('canAccessFeature', () => {
    it('should allow access for features in plan', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue({
        id: 'sub-1',
        plan: SubscriptionPlan.MEDIUM,
        status: SubscriptionStatus.ACTIVE,
        aiAddonEnabled: false,
        features: [{ feature: FeatureFlag.API_ACCESS, enabled: true }],
      });

      const result = await service.canAccessFeature('tenant-1', FeatureFlag.API_ACCESS);

      expect(result.allowed).toBe(true);
    });

    it('should deny access for features not in plan', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue({
        id: 'sub-1',
        plan: SubscriptionPlan.SMALL,
        status: SubscriptionStatus.ACTIVE,
        aiAddonEnabled: false,
        features: [],
      });

      const result = await service.canAccessFeature('tenant-1', FeatureFlag.API_ACCESS);

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('not available');
    });

    it('should deny access when subscription is expired', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue({
        id: 'sub-1',
        plan: SubscriptionPlan.MEDIUM,
        status: SubscriptionStatus.EXPIRED,
        aiAddonEnabled: false,
        features: [],
      });

      const result = await service.canAccessFeature('tenant-1', FeatureFlag.API_ACCESS);

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('expired');
    });

    it('should allow AI features when AI add-on is enabled', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue({
        id: 'sub-1',
        plan: SubscriptionPlan.ENTERPRISE,
        status: SubscriptionStatus.ACTIVE,
        aiAddonEnabled: true,
        features: [{ feature: FeatureFlag.AI_INSPECTIONS, enabled: true }],
      });

      const result = await service.canAccessFeature('tenant-1', FeatureFlag.AI_INSPECTIONS);

      expect(result.allowed).toBe(true);
    });
  });

  describe('checkAllLimits', () => {
    it('should return limit status for all resources', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue({
        id: 'sub-1',
        plan: SubscriptionPlan.SMALL,
        status: SubscriptionStatus.ACTIVE,
        apiCallsUsed: 1000,
        storageUsedBytes: BigInt(5 * 1024 * 1024 * 1024),
      });

      mockPrisma.user.count.mockResolvedValue(2);
      mockPrisma.location.count.mockResolvedValue(1);
      mockPrisma.customer.count.mockResolvedValue(100);
      mockPrisma.inspection.count.mockResolvedValue(50);

      const result = await service.checkAllLimits('tenant-1');

      expect(result.users.withinLimit).toBe(true);
      expect(result.users.current).toBe(2);
      expect(result.users.limit).toBe(3);
      expect(result.locations.withinLimit).toBe(true);
    });

    it('should detect when limit is exceeded', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue({
        id: 'sub-1',
        plan: SubscriptionPlan.SMALL,
        status: SubscriptionStatus.ACTIVE,
        apiCallsUsed: 5000,
        storageUsedBytes: BigInt(10 * 1024 * 1024 * 1024),
      });

      mockPrisma.user.count.mockResolvedValue(4); // Exceeds limit of 3

      const result = await service.checkAllLimits('tenant-1');

      expect(result.users.withinLimit).toBe(false);
      expect(result.users.warningLevel).toBe('critical');
    });
  });

  describe('canAddResource', () => {
    it('should allow adding resource when under limit', async () => {
      mockPrisma.user.count.mockResolvedValue(2);
      mockPrisma.subscription.findUnique.mockResolvedValue({
        id: 'sub-1',
        plan: SubscriptionPlan.SMALL,
        maxUsers: 3,
      });

      const result = await service.canAddResource('tenant-1', 'user');

      expect(result.withinLimit).toBe(true);
      expect(result.remaining).toBe(0); // 3 - 2 - 1 (adding one)
    });

    it('should deny adding resource when at limit', async () => {
      mockPrisma.user.count.mockResolvedValue(3);
      mockPrisma.subscription.findUnique.mockResolvedValue({
        id: 'sub-1',
        plan: SubscriptionPlan.SMALL,
        maxUsers: 3,
      });

      const result = await service.canAddResource('tenant-1', 'user');

      expect(result.withinLimit).toBe(false);
      expect(result.remaining).toBe(-1);
    });
  });
});
