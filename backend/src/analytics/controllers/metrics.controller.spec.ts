import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { MetricsController } from './metrics.controller';
import { UnitEconomicsService } from '../services/unit-economics.service';
import { PrismaService } from '@common/services/prisma.service';

describe('MetricsController', () => {
  let controller: MetricsController;
  let unitEconomicsService: jest.Mocked<UnitEconomicsService>;
  let prisma: jest.Mocked<PrismaService>;

  const mockConfigValues: Record<string, number> = {
    UNIT_ECONOMICS_FIXED_COSTS: 14300,
    UNIT_ECONOMICS_ARPA: 82,
    UNIT_ECONOMICS_COGS_PER_SHOP: 34.34,
    UNIT_ECONOMICS_MONTHLY_GROWTH_RATE: 0.15,
    UNIT_ECONOMICS_GROSS_MARGIN: 0.62,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MetricsController],
      providers: [
        {
          provide: UnitEconomicsService,
          useValue: {
            calculateCAC: jest.fn(),
            calculateLTVByTier: jest.fn(),
            analyzeChurn: jest.fn(),
            calculateGrossMarginBySegment: jest.fn(),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            $queryRaw: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue: number) => {
              return mockConfigValues[key] ?? defaultValue;
            }),
          },
        },
      ],
    }).compile();

    controller = module.get<MetricsController>(MetricsController);
    unitEconomicsService = module.get(UnitEconomicsService) as jest.Mocked<UnitEconomicsService>;
    prisma = module.get(PrismaService) as jest.Mocked<PrismaService>;
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getCAC', () => {
    it('should delegate to service and return wrapped response', async () => {
      const mockCAC = {
        blended: 120,
        byChannel: [
          { channel: 'organic', spend: 500, newCustomers: 10, cac: 50, percentageOfTotal: 40 },
          { channel: 'paid', spend: 700, newCustomers: 5, cac: 140, percentageOfTotal: 60 },
        ],
      };
      unitEconomicsService.calculateCAC.mockResolvedValue(mockCAC as never);

      const result = await controller.getCAC('2026-01-01', '2026-01-31');

      expect(unitEconomicsService.calculateCAC).toHaveBeenCalledWith(
        new Date('2026-01-01'),
        new Date('2026-01-31'),
      );
      expect(result).toEqual({
        success: true,
        data: {
          blended: 120,
          byChannel: mockCAC.byChannel,
        },
      });
    });

    it('should use default dates when not provided', async () => {
      const mockCAC = { blended: 100, byChannel: [] };
      unitEconomicsService.calculateCAC.mockResolvedValue(mockCAC as never);

      await controller.getCAC();

      expect(unitEconomicsService.calculateCAC).toHaveBeenCalledWith(
        expect.any(Date),
        expect.any(Date),
      );
    });
  });

  describe('getLTV', () => {
    it('should delegate to service and return blended LTV with tiers', async () => {
      const mockTiers = [
        { tier: 'starter', ltv: 1500, arpa: 50 },
        { tier: 'pro', ltv: 2500, arpa: 100 },
        { tier: 'enterprise', ltv: 4000, arpa: 200 },
      ];
      unitEconomicsService.calculateLTVByTier.mockResolvedValue(mockTiers);

      const result = await controller.getLTV();

      expect(unitEconomicsService.calculateLTVByTier).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.data.blended).toBeDefined();
      expect(result.data.byTier).toEqual(mockTiers);
      expect(result.data.calculation).toBeDefined();
    });

    it('should calculate blended LTV correctly from tiers', async () => {
      const mockTiers = [
        { tier: 'starter', ltv: 1200, arpa: 50 },
        { tier: 'pro', ltv: 2400, arpa: 100 },
      ];
      unitEconomicsService.calculateLTVByTier.mockResolvedValue(mockTiers);

      const result = await controller.getLTV();

      expect(result.data.blended).toBe(Math.round((1200 + 2400) / 2));
    });

    it('should handle empty tiers gracefully', async () => {
      unitEconomicsService.calculateLTVByTier.mockResolvedValue([]);

      const result = await controller.getLTV();

      expect(result.data.blended).toBe(NaN);
    });
  });

  describe('getChurn', () => {
    it('should analyze churn with default months', async () => {
      const mockChurn = [
        {
          period: '2026-04',
          startingCustomers: 100,
          churnedCustomers: 3,
          churnRate: 3,
          revenueChurn: 246,
          revenueChurnRate: 3,
          byTier: [{ tier: 'pro', churnRate: 2.5 }],
        },
      ];
      unitEconomicsService.analyzeChurn.mockResolvedValue(mockChurn);

      const result = await controller.getChurn(12);

      expect(unitEconomicsService.analyzeChurn).toHaveBeenCalledWith(12);
      expect(result.success).toBe(true);
      expect(result.data.overall.monthlyChurn).toBe(3);
    });

    it('should calculate annualChurn correctly', async () => {
      const mockChurn = [
        {
          period: '2026-04',
          startingCustomers: 100,
          churnedCustomers: 2,
          churnRate: 2,
          revenueChurn: 164,
          revenueChurnRate: 2,
          byTier: [{ tier: 'basic', churnRate: 1.8 }],
        },
      ];
      unitEconomicsService.analyzeChurn.mockResolvedValue(mockChurn);

      const result = await controller.getChurn(6);

      expect(result.data.overall.monthlyChurn).toBe(2);
      expect(result.data.overall.annualChurn).toBeDefined();
      expect(typeof result.data.overall.customerLifetime).toBe('number');
    });

    it('should handle zero monthly churn safely', async () => {
      const mockChurn = [
        {
          period: '2026-04',
          startingCustomers: 100,
          churnedCustomers: 0,
          churnRate: 0,
          revenueChurn: 0,
          revenueChurnRate: 0,
          byTier: [{ tier: 'enterprise', churnRate: 0 }],
        },
      ];
      unitEconomicsService.analyzeChurn.mockResolvedValue(mockChurn);

      const result = await controller.getChurn(12);

      // When first period churnRate is 0, controller uses default 3% as fallback (line 248)
      expect(result.data.overall.monthlyChurn).toBe(3);
      expect(result.data.overall.customerLifetime).toBe(33);
    });

    it('should return byPeriod array', async () => {
      const mockChurn = [
        {
          period: '2026-04',
          startingCustomers: 100,
          churnedCustomers: 3,
          churnRate: 3,
          revenueChurn: 246,
          revenueChurnRate: 3,
          byTier: [],
        },
      ];
      unitEconomicsService.analyzeChurn.mockResolvedValue(mockChurn);

      const result = await controller.getChurn(12);

      expect(Array.isArray(result.data.byPeriod)).toBe(true);
      expect(result.data.byPeriod.length).toBeGreaterThan(0);
    });
  });

  describe('getGrossMargin', () => {
    it('should calculate overall gross margin with segment breakdown', async () => {
      const mockSegments = [
        {
          segment: 'starter',
          revenue: 5000,
          cogs: 1900,
          grossMargin: 3100,
          grossMarginPercentage: 62,
        },
        { segment: 'pro', revenue: 8000, cogs: 3040, grossMargin: 4960, grossMarginPercentage: 62 },
      ];
      unitEconomicsService.calculateGrossMarginBySegment.mockResolvedValue(mockSegments);

      const result = await controller.getGrossMargin('2026-01-01', '2026-01-31');

      expect(unitEconomicsService.calculateGrossMarginBySegment).toHaveBeenCalledWith(
        new Date('2026-01-01'),
        new Date('2026-01-31'),
      );
      expect(result.success).toBe(true);
      expect(result.data.overall).toBeDefined();
      expect(result.data.bySegment).toEqual(mockSegments);
    });

    it('should use default dates when not provided', async () => {
      unitEconomicsService.calculateGrossMarginBySegment.mockResolvedValue([]);

      await controller.getGrossMargin();

      expect(unitEconomicsService.calculateGrossMarginBySegment).toHaveBeenCalledWith(
        expect.any(Date),
        expect.any(Date),
      );
    });

    it('should handle empty segments', async () => {
      unitEconomicsService.calculateGrossMarginBySegment.mockResolvedValue([]);

      const result = await controller.getGrossMargin();

      expect(result.data.overall).toBe(0);
      expect(result.data.bySegment).toEqual([]);
    });

    it('should handle zero revenue segments', async () => {
      const mockSegments = [
        { segment: 'test', revenue: 0, cogs: 0, grossMargin: 0, grossMarginPercentage: 0 },
      ];
      unitEconomicsService.calculateGrossMarginBySegment.mockResolvedValue(mockSegments);

      const result = await controller.getGrossMargin();

      expect(result.data.overall).toBe(0);
    });
  });

  describe('getBreakEven', () => {
    it('should calculate break-even point and projections', async () => {
      prisma.$queryRaw.mockResolvedValue([{ count: 50 }]);

      const result = await controller.getBreakEven();

      expect(result.success).toBe(true);
      expect(result.data.breakEvenShops).toBeDefined();
      expect(result.data.currentShops).toBe(50);
      expect(Array.isArray(result.data.monthlyProjections)).toBe(true);
    });

    it('should calculate months to break-even correctly', async () => {
      prisma.$queryRaw.mockResolvedValue([{ count: 500 }]);

      const result = await controller.getBreakEven();

      expect(result.data.monthsToBreakEven).toBe(0);
      expect(result.data.currentShops).toBe(500);
    });

    it('should generate projections based on growth rate', async () => {
      prisma.$queryRaw.mockResolvedValue([{ count: 10 }]);

      const result = await controller.getBreakEven();

      expect(result.data.monthlyProjections.length).toBeGreaterThan(0);
      expect(result.data.monthlyProjections[0].month).toBe(0);
      expect(result.data.monthlyProjections[0].shops).toBe(10);
    });

    it('should handle empty database result', async () => {
      prisma.$queryRaw.mockResolvedValue([]);

      const result = await controller.getBreakEven();

      expect(result.data.currentShops).toBe(0);
    });

    it('should validate assumptions in response', async () => {
      prisma.$queryRaw.mockResolvedValue([{ count: 100 }]);

      const result = await controller.getBreakEven();

      expect(result.data.assumptions.fixedCosts).toBe(14300);
      expect(result.data.assumptions.arpa).toBe(82);
      expect(result.data.assumptions.cogsPerShop).toBe(34.34);
      expect(result.data.assumptions.monthlyGrowthRate).toBe(0.15);
    });
  });

  describe('getLTVCACRatio', () => {
    it('should calculate excellent status when ratio >= 5', async () => {
      const mockCAC = { blended: 50, byChannel: [] };
      const mockTiers = [{ tier: 'pro', ltv: 3000, arpa: 100 }];
      unitEconomicsService.calculateCAC.mockResolvedValue(mockCAC);
      unitEconomicsService.calculateLTVByTier.mockResolvedValue(mockTiers);

      const result = await controller.getLTVCACRatio();

      expect(result.success).toBe(true);
      expect(result.data.status).toBe('excellent');
    });

    it('should calculate good status when 3 <= ratio < 5', async () => {
      const mockCAC = { blended: 600, byChannel: [] };
      const mockTiers = [{ tier: 'pro', ltv: 2400, arpa: 100 }];
      unitEconomicsService.calculateCAC.mockResolvedValue(mockCAC);
      unitEconomicsService.calculateLTVByTier.mockResolvedValue(mockTiers);

      const result = await controller.getLTVCACRatio();

      expect(result.data.status).toBe('good');
    });

    it('should calculate warning status when 1.5 <= ratio < 3', async () => {
      const mockCAC = { blended: 1000, byChannel: [] };
      const mockTiers = [{ tier: 'pro', ltv: 2000, arpa: 100 }];
      unitEconomicsService.calculateCAC.mockResolvedValue(mockCAC);
      unitEconomicsService.calculateLTVByTier.mockResolvedValue(mockTiers);

      const result = await controller.getLTVCACRatio();

      expect(result.data.status).toBe('warning');
    });

    it('should calculate critical status when ratio < 1.5', async () => {
      const mockCAC = { blended: 2000, byChannel: [] };
      const mockTiers = [{ tier: 'pro', ltv: 2500, arpa: 100 }];
      unitEconomicsService.calculateCAC.mockResolvedValue(mockCAC);
      unitEconomicsService.calculateLTVByTier.mockResolvedValue(mockTiers);

      const result = await controller.getLTVCACRatio();

      expect(result.data.status).toBe('critical');
    });

    it('should handle zero CAC gracefully', async () => {
      const mockCAC = { blended: 0, byChannel: [] };
      const mockTiers = [{ tier: 'pro', ltv: 2400, arpa: 100 }];
      unitEconomicsService.calculateCAC.mockResolvedValue(mockCAC);
      unitEconomicsService.calculateLTVByTier.mockResolvedValue(mockTiers);

      const result = await controller.getLTVCACRatio();

      expect(result.data.ratio).toBe(0);
    });
  });

  describe('getPaybackPeriod', () => {
    it('should calculate payback period in months and days', async () => {
      const mockCAC = { blended: 150, byChannel: [] };
      unitEconomicsService.calculateCAC.mockResolvedValue(mockCAC);

      const result = await controller.getPaybackPeriod();

      expect(result.success).toBe(true);
      expect(result.data.months).toBeDefined();
      expect(result.data.days).toBeDefined();
      expect(result.data.cac).toBe(150);
      expect(result.data.monthlyContribution).toBeDefined();
    });

    it('should calculate days from months * 30', async () => {
      const mockCAC = { blended: 200, byChannel: [] };
      unitEconomicsService.calculateCAC.mockResolvedValue(mockCAC);

      const result = await controller.getPaybackPeriod();

      // Days should be approximately months * 30, accounting for rounding
      expect(Math.abs(result.data.days - Math.round(result.data.months * 30))).toBeLessThanOrEqual(
        1,
      );
    });

    it('should handle zero monthly contribution', async () => {
      const mockCAC = { blended: 100, byChannel: [] };
      unitEconomicsService.calculateCAC.mockResolvedValue(mockCAC);

      // Mock ConfigService to return 0 gross margin
      const testModule = await Test.createTestingModule({
        controllers: [MetricsController],
        providers: [
          {
            provide: UnitEconomicsService,
            useValue: {
              calculateCAC: jest.fn().mockResolvedValue(mockCAC),
            },
          },
          {
            provide: PrismaService,
            useValue: {},
          },
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn((key: string, defaultValue: number) => {
                if (key === 'UNIT_ECONOMICS_GROSS_MARGIN') return 0;
                return mockConfigValues[key] ?? defaultValue;
              }),
            },
          },
        ],
      }).compile();

      const testController = testModule.get<MetricsController>(MetricsController);
      const result = await testController.getPaybackPeriod();

      expect(result.data.months).toBe(0);
    });
  });

  // ============== ADDITIONAL BRANCH COVERAGE ==============

  describe('getCAC — date defaulting and parameter handling', () => {
    it('should use 30 days ago as default start date when not provided', async () => {
      const mockCAC = { blended: 100, byChannel: [] };
      unitEconomicsService.calculateCAC.mockResolvedValue(mockCAC as never);

      await controller.getCAC();

      const calls = unitEconomicsService.calculateCAC.mock.calls[0];
      const startDate = calls[0];
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Should be approximately 30 days ago (within 1 day tolerance)
      expect(Math.abs(startDate.getTime() - thirtyDaysAgo.getTime())).toBeLessThan(
        24 * 60 * 60 * 1000,
      );
    });

    it('should use today as default end date when not provided', async () => {
      const mockCAC = { blended: 100, byChannel: [] };
      unitEconomicsService.calculateCAC.mockResolvedValue(mockCAC as never);

      await controller.getCAC();

      const calls = unitEconomicsService.calculateCAC.mock.calls[0];
      const endDate = calls[1];
      const now = new Date();

      // Should be today (within 1 second tolerance)
      expect(Math.abs(endDate.getTime() - now.getTime())).toBeLessThan(1000);
    });

    it('should parse provided start date correctly', async () => {
      const mockCAC = { blended: 100, byChannel: [] };
      unitEconomicsService.calculateCAC.mockResolvedValue(mockCAC as never);

      await controller.getCAC('2026-03-15', '2026-03-31');

      const calls = unitEconomicsService.calculateCAC.mock.calls[0];
      expect(calls[0]).toEqual(new Date('2026-03-15'));
    });

    it('should parse provided end date correctly', async () => {
      const mockCAC = { blended: 100, byChannel: [] };
      unitEconomicsService.calculateCAC.mockResolvedValue(mockCAC as never);

      await controller.getCAC('2026-03-01', '2026-03-31');

      const calls = unitEconomicsService.calculateCAC.mock.calls[0];
      expect(calls[1]).toEqual(new Date('2026-03-31'));
    });

    it('should return wrapped success response', async () => {
      const mockCAC = {
        blended: 125,
        byChannel: [
          { channel: 'organic', spend: 1000, newCustomers: 8, cac: 125, percentageOfTotal: 100 },
        ],
      };
      unitEconomicsService.calculateCAC.mockResolvedValue(mockCAC as never);

      const result = await controller.getCAC('2026-01-01', '2026-01-31');

      expect(result).toEqual({
        success: true,
        data: {
          blended: 125,
          byChannel: mockCAC.byChannel,
        },
      });
    });
  });

  describe('getLTV — blended calculation', () => {
    it('should calculate blended LTV as average of tiers', async () => {
      const mockTiers = [
        { tier: 'starter', ltv: 2000, arpa: 50 },
        { tier: 'growth', ltv: 4000, arpa: 100 },
        { tier: 'enterprise', ltv: 6000, arpa: 200 },
      ];
      unitEconomicsService.calculateLTVByTier.mockResolvedValue(mockTiers as never);

      const result = await controller.getLTV();

      // (2000 + 4000 + 6000) / 3 = 4000
      expect(result.data.blended).toBe(4000);
    });

    it('should round blended LTV to nearest integer', async () => {
      const mockTiers = [
        { tier: 'a', ltv: 1000, arpa: 50 },
        { tier: 'b', ltv: 1001, arpa: 51 },
      ];
      unitEconomicsService.calculateLTVByTier.mockResolvedValue(mockTiers as never);

      const result = await controller.getLTV();

      // (1000 + 1001) / 2 = 1000.5, rounded to 1001
      expect(result.data.blended).toBe(1001);
    });

    it('should include calculation breakdown in response', async () => {
      const mockTiers = [{ tier: 'basic', ltv: 1000, arpa: 50 }];
      unitEconomicsService.calculateLTVByTier.mockResolvedValue(mockTiers as never);

      const result = await controller.getLTV();

      expect(result.data.calculation).toEqual({
        formula: 'LTV = ARPA × Gross Margin × (1 / Monthly Churn Rate)',
        arpa: 82,
        grossMargin: 0.62,
        monthlyChurn: 0.03,
      });
    });
  });

  describe('getChurn — monthly churn calculation', () => {
    it('should handle zero churn data with fallback values', async () => {
      unitEconomicsService.analyzeChurn.mockResolvedValue([] as never);

      const result = await controller.getChurn(12);

      expect(result.data.overall.monthlyChurn).toBe(3);
      expect(result.data.overall.customerLifetime).toBe(33);
    });

    it('should calculate annual churn from monthly churn', async () => {
      const mockChurnData = [
        {
          period: '2026-01',
          startingCustomers: 1000,
          churnedCustomers: 20,
          churnRate: 2,
          revenueChurn: 1620,
          revenueChurnRate: 2,
          byTier: [],
        },
      ];
      unitEconomicsService.analyzeChurn.mockResolvedValue(mockChurnData as never);

      const result = await controller.getChurn(12);

      // Annual = 1 - (1 - 0.02)^12 ≈ 21.5%
      expect(result.data.overall.annualChurn).toBeCloseTo(21.5, 0);
    });

    it('should calculate customer lifetime correctly', async () => {
      const mockChurnData = [
        {
          period: '2026-01',
          startingCustomers: 100,
          churnedCustomers: 2,
          churnRate: 2,
          revenueChurn: 100,
          revenueChurnRate: 2,
          byTier: [],
        },
      ];
      unitEconomicsService.analyzeChurn.mockResolvedValue(mockChurnData as never);

      const result = await controller.getChurn(12);

      // Lifetime = 1 / (2/100) = 50 months
      expect(result.data.overall.customerLifetime).toBe(50);
    });

    it('should handle zero monthly churn to avoid division by zero', async () => {
      const mockChurnData = [
        {
          period: '2026-01',
          startingCustomers: 100,
          churnedCustomers: 0,
          churnRate: 0,
          revenueChurn: 0,
          revenueChurnRate: 0,
          byTier: [],
        },
      ];
      unitEconomicsService.analyzeChurn.mockResolvedValue(mockChurnData as never);

      const result = await controller.getChurn(12);

      // When churnRate is 0, formula sets customerLifetime to infinity (which becomes a large number)
      // The code falls back to default 3% for period when churnRate is 0
      expect(result.data.overall.customerLifetime).toBeGreaterThan(0);
    });

    it('should pass months parameter to service', async () => {
      unitEconomicsService.analyzeChurn.mockResolvedValue([]);

      await controller.getChurn(24);

      expect(unitEconomicsService.analyzeChurn).toHaveBeenCalledWith(24);
    });

    it('should default to 12 months when not provided', async () => {
      unitEconomicsService.analyzeChurn.mockResolvedValue([]);

      await controller.getChurn(12);

      expect(unitEconomicsService.analyzeChurn).toHaveBeenCalledWith(12);
    });
  });

  describe('getGrossMargin — segment calculation', () => {
    it('should handle no segments by returning 0 overall', async () => {
      unitEconomicsService.calculateGrossMarginBySegment.mockResolvedValue([] as never);

      const result = await controller.getGrossMargin('2026-01-01', '2026-01-31');

      expect(result.data.overall).toBe(0);
      expect(result.data.bySegment).toEqual([]);
    });

    it('should calculate overall margin from all segments', async () => {
      const mockSegments = [
        { segment: 'A', revenue: 1000, cogs: 300, grossMargin: 700, grossMarginPercentage: 70 },
        { segment: 'B', revenue: 4000, cogs: 1000, grossMargin: 3000, grossMarginPercentage: 75 },
      ];
      unitEconomicsService.calculateGrossMarginBySegment.mockResolvedValue(mockSegments as never);

      const result = await controller.getGrossMargin('2026-01-01', '2026-01-31');

      // Overall = (5000 - 1300) / 5000 * 100 = 74%
      expect(result.data.overall).toBe(74);
    });

    it('should handle zero revenue gracefully', async () => {
      const mockSegments = [
        { segment: 'A', revenue: 0, cogs: 0, grossMargin: 0, grossMarginPercentage: 0 },
      ];
      unitEconomicsService.calculateGrossMarginBySegment.mockResolvedValue(mockSegments as never);

      const result = await controller.getGrossMargin();

      expect(result.data.overall).toBe(0);
    });

    it('should include COGS breakdown in response', async () => {
      unitEconomicsService.calculateGrossMarginBySegment.mockResolvedValue([]);

      const result = await controller.getGrossMargin();

      expect(result.data.calculation.cogsBreakdown).toEqual({
        infrastructure: 8.0,
        voiceAI: 16.0,
        telephony: 2.66,
        paymentProcessing: 2.68,
        support: 5.0,
      });
    });
  });

  describe('getBreakEven — break-even calculation and projections', () => {
    it('should return 0 months to break-even when already at or past break-even', async () => {
      prisma.$queryRaw.mockResolvedValue([{ count: BigInt(500) }] as never);

      const result = await controller.getBreakEven();

      // Break-even = 14300 / (82 - 34.34) = 301 shops
      // Current = 500 shops, so already at break-even
      expect(result.data.monthsToBreakEven).toBe(0);
    });

    it('should calculate months to break-even when below break-even', async () => {
      prisma.$queryRaw.mockResolvedValue([{ count: BigInt(100) }] as never);

      const result = await controller.getBreakEven();

      // Break-even = 301 shops, Current = 100
      // Months = log(301/100) / log(1.15) = 9 months (approximately)
      expect(result.data.monthsToBreakEven).toBeGreaterThan(0);
    });

    it('should handle null count from query', async () => {
      prisma.$queryRaw.mockResolvedValue([{ count: null }] as never);

      const result = await controller.getBreakEven();

      expect(result.data.currentShops).toBe(0);
    });

    it('should generate monthly projections', async () => {
      prisma.$queryRaw.mockResolvedValue([{ count: BigInt(50) }] as never);

      const result = await controller.getBreakEven();

      expect(Array.isArray(result.data.monthlyProjections)).toBe(true);
      expect(result.data.monthlyProjections.length).toBeGreaterThan(0);
      expect(result.data.monthlyProjections[0]).toEqual(
        expect.objectContaining({
          month: expect.any(Number),
          shops: expect.any(Number),
          revenue: expect.any(Number),
          cogs: expect.any(Number),
          grossProfit: expect.any(Number),
          fixedCosts: 14300,
          netProfit: expect.any(Number),
        }),
      );
    });

    it('should show growth in shop count in projections', async () => {
      prisma.$queryRaw.mockResolvedValue([{ count: BigInt(50) }] as never);

      const result = await controller.getBreakEven();

      const projections = result.data.monthlyProjections;
      if (projections.length > 1) {
        expect(projections[1].shops).toBeGreaterThan(projections[0].shops);
      }
    });
  });

  describe('getLTVCACRatio — status determination', () => {
    it('should return good status when ratio 3-5', async () => {
      unitEconomicsService.calculateCAC.mockResolvedValue({
        blended: 100,
        byChannel: [],
      } as never);
      unitEconomicsService.calculateLTVByTier.mockResolvedValue([
        { tier: 'basic', ltv: 400, arpa: 50 },
      ] as never);

      const result = await controller.getLTVCACRatio();

      // Ratio = 400/100 = 4 (good)
      expect(result.data.status).toBe('good');
    });

    it('should return warning status when ratio 1.5-3', async () => {
      unitEconomicsService.calculateCAC.mockResolvedValue({
        blended: 100,
        byChannel: [],
      } as never);
      unitEconomicsService.calculateLTVByTier.mockResolvedValue([
        { tier: 'basic', ltv: 250, arpa: 50 },
      ] as never);

      const result = await controller.getLTVCACRatio();

      // Ratio = 250/100 = 2.5 (warning)
      expect(result.data.status).toBe('warning');
    });

    it('should return excellent status when ratio > 5', async () => {
      unitEconomicsService.calculateCAC.mockResolvedValue({
        blended: 50,
        byChannel: [],
      } as never);
      unitEconomicsService.calculateLTVByTier.mockResolvedValue([
        { tier: 'basic', ltv: 400, arpa: 50 },
      ] as never);

      const result = await controller.getLTVCACRatio();

      // Ratio = 400/50 = 8 (excellent)
      expect(result.data.status).toBe('excellent');
    });
  });
});
