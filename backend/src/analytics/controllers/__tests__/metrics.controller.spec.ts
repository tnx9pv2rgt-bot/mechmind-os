import { Test, TestingModule } from '@nestjs/testing';
import { MetricsController } from '../metrics.controller';
import { UnitEconomicsService } from '../../services/unit-economics.service';
import { PrismaService } from '@common/services/prisma.service';

describe('MetricsController', () => {
  let controller: MetricsController;
  let unitEconomicsService: jest.Mocked<UnitEconomicsService>;
  let prisma: jest.Mocked<PrismaService>;

  const mockUnitEconomicsService = {
    calculateCAC: jest.fn(),
    calculateLTVByTier: jest.fn(),
    analyzeChurn: jest.fn(),
    calculateGrossMarginBySegment: jest.fn(),
    calculateLTVByCohort: jest.fn(),
  };

  const mockPrismaService = {
    $queryRaw: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MetricsController],
      providers: [
        {
          provide: UnitEconomicsService,
          useValue: mockUnitEconomicsService,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    controller = module.get<MetricsController>(MetricsController);
    unitEconomicsService = module.get(UnitEconomicsService) as jest.Mocked<UnitEconomicsService>;
    prisma = module.get(PrismaService) as jest.Mocked<PrismaService>;

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });
  });

  describe('getCAC', () => {
    const mockCACResult = {
      blended: 134,
      byChannel: [
        { channel: 'organic_seo', spend: 4000, newCustomers: 100, cac: 40, percentageOfTotal: 25 },
        { channel: 'paid_search', spend: 8000, newCustomers: 40, cac: 200, percentageOfTotal: 20 },
      ],
    };

    beforeEach(() => {
      mockUnitEconomicsService.calculateCAC.mockResolvedValue(mockCACResult);
    });

    it('should return CAC metrics with default date range', async () => {
      const result = await controller.getCAC();

      expect(result.success).toBe(true);
      expect(result.data.blended).toBe(134);
      expect(result.data.byChannel).toHaveLength(2);
      expect(unitEconomicsService.calculateCAC).toHaveBeenCalled();
      
      // Check default dates (30 days ago to now)
      const callArgs = mockUnitEconomicsService.calculateCAC.mock.calls[0];
      expect(callArgs[0]).toBeInstanceOf(Date);
      expect(callArgs[1]).toBeInstanceOf(Date);
    });

    it('should return CAC metrics with custom date range', async () => {
      const startDate = '2024-01-01';
      const endDate = '2024-01-31';

      const result = await controller.getCAC(startDate, endDate);

      expect(result.success).toBe(true);
      expect(unitEconomicsService.calculateCAC).toHaveBeenCalledWith(
        new Date(startDate),
        new Date(endDate),
      );
    });

    it('should return CAC with correct response structure', async () => {
      const result = await controller.getCAC();

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('data');
      expect(result.data).toHaveProperty('blended');
      expect(result.data).toHaveProperty('byChannel');
    });

    it('should handle different date formats', async () => {
      const result = await controller.getCAC('2024-06-15', '2024-12-15');

      expect(result.success).toBe(true);
      expect(unitEconomicsService.calculateCAC).toHaveBeenCalledWith(
        new Date('2024-06-15'),
        new Date('2024-12-15'),
      );
    });
  });

  describe('getLTV', () => {
    const mockLTVByTier = [
      { tier: 'starter', ltv: 1013, arpa: 49 },
      { tier: 'pro', ltv: 2046, arpa: 99 },
      { tier: 'enterprise', ltv: 6179, arpa: 299 },
    ];

    beforeEach(() => {
      mockUnitEconomicsService.calculateLTVByTier.mockResolvedValue(mockLTVByTier);
    });

    it('should return LTV metrics', async () => {
      const result = await controller.getLTV();

      expect(result.success).toBe(true);
      expect(result.data.blended).toBeDefined();
      expect(result.data.byTier).toHaveLength(3);
      expect(unitEconomicsService.calculateLTVByTier).toHaveBeenCalled();
    });

    it('should calculate blended LTV correctly', async () => {
      const result = await controller.getLTV();

      // Blended LTV = (1013 + 2046 + 6179) / 3 = 3079.33 ≈ 3079
      expect(result.data.blended).toBe(3079);
    });

    it('should include calculation details', async () => {
      const result = await controller.getLTV();

      expect(result.data.calculation).toBeDefined();
      expect(result.data.calculation.formula).toBe(
        'LTV = ARPA × Gross Margin × (1 / Monthly Churn Rate)',
      );
      expect(result.data.calculation.arpa).toBe(82);
      expect(result.data.calculation.grossMargin).toBe(0.62);
      expect(result.data.calculation.monthlyChurn).toBe(0.03);
    });

    it('should include tier breakdown', async () => {
      const result = await controller.getLTV();

      result.data.byTier.forEach((tier) => {
        expect(tier).toHaveProperty('tier');
        expect(tier).toHaveProperty('ltv');
        expect(tier).toHaveProperty('arpa');
      });
    });

    it('should return correct response structure', async () => {
      const result = await controller.getLTV();

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('data');
      expect(result.data).toHaveProperty('blended');
      expect(result.data).toHaveProperty('byTier');
      expect(result.data).toHaveProperty('calculation');
    });
  });

  describe('getChurn', () => {
    const mockChurnAnalysis = [
      {
        period: '2024-01',
        startingCustomers: 100,
        churnedCustomers: 3,
        churnRate: 3,
        revenueChurn: 246,
        revenueChurnRate: 3,
        byTier: [
          { tier: 'starter', churnRate: 4 },
          { tier: 'pro', churnRate: 2.5 },
          { tier: 'enterprise', churnRate: 1.5 },
        ],
      },
      {
        period: '2024-02',
        startingCustomers: 120,
        churnedCustomers: 4,
        churnRate: 3.33,
        revenueChurn: 328,
        revenueChurnRate: 3.33,
        byTier: [
          { tier: 'starter', churnRate: 4 },
          { tier: 'pro', churnRate: 2.5 },
          { tier: 'enterprise', churnRate: 1.5 },
        ],
      },
    ];

    beforeEach(() => {
      mockUnitEconomicsService.analyzeChurn.mockResolvedValue(mockChurnAnalysis);
    });

    it('should return churn analysis', async () => {
      const result = await controller.getChurn(12);

      expect(result.success).toBe(true);
      expect(unitEconomicsService.analyzeChurn).toHaveBeenCalled();
    });

    it('should return churn analysis with custom months parameter', async () => {
      const result = await controller.getChurn(6);

      expect(result.success).toBe(true);
      expect(unitEconomicsService.analyzeChurn).toHaveBeenCalledWith(6);
    });

    it('should calculate overall monthly churn from latest period', async () => {
      const result = await controller.getChurn(12);

      expect(result.data.overall.monthlyChurn).toBe(3);
    });

    it('should calculate annual churn correctly', async () => {
      const result = await controller.getChurn(12);

      // Annual churn = 1 - (1 - 0.03)^12 = 0.306... ≈ 30.6%
      expect(result.data.overall.annualChurn).toBeCloseTo(30.6, 0);
    });

    it('should calculate customer lifetime correctly', async () => {
      const result = await controller.getChurn(12);

      // Customer Lifetime = 1 / (Monthly Churn Rate / 100) = 1 / 0.03 = 33.33 ≈ 33
      expect(result.data.overall.customerLifetime).toBe(33);
    });

    it('should handle zero churn rate for customer lifetime', async () => {
      mockUnitEconomicsService.analyzeChurn.mockResolvedValue([
        {
          ...mockChurnAnalysis[0],
          churnRate: 0,
        },
      ]);

      const result = await controller.getChurn(12);

      // Controller defaults to 3 when no churn data is available
      expect(result.data.overall.customerLifetime).toBe(33); // 1 / (3 / 100) = 33
    });

    it('should include period breakdown', async () => {
      const result = await controller.getChurn(12);

      expect(result.data.byPeriod).toHaveLength(2);
      result.data.byPeriod.forEach((period) => {
        expect(period).toHaveProperty('period');
        expect(period).toHaveProperty('startingCustomers');
        expect(period).toHaveProperty('churnedCustomers');
        expect(period).toHaveProperty('churnRate');
        expect(period).toHaveProperty('revenueChurn');
        expect(period).toHaveProperty('revenueChurnRate');
        expect(period).toHaveProperty('byTier');
      });
    });

    it('should handle empty churn analysis', async () => {
      mockUnitEconomicsService.analyzeChurn.mockResolvedValue([]);

      const result = await controller.getChurn(12);

      expect(result.data.overall.monthlyChurn).toBe(3); // Default value
      expect(result.data.overall.annualChurn).toBeCloseTo(30.6, 0);
      expect(result.data.overall.customerLifetime).toBe(33);
    });

    it('should handle very large months parameter', async () => {
      const result = await controller.getChurn(60);

      expect(result.success).toBe(true);
      expect(unitEconomicsService.analyzeChurn).toHaveBeenCalledWith(60);
    });
  });

  describe('getGrossMargin', () => {
    const mockGrossMarginBySegment = [
      { segment: 'starter', revenue: 1960, cogs: 1215.2, grossMargin: 744.8, grossMarginPercentage: 38 },
      { segment: 'pro', revenue: 2475, cogs: 759.5, grossMargin: 1715.5, grossMarginPercentage: 69.3 },
      { segment: 'enterprise', revenue: 1495, cogs: 151.9, grossMargin: 1343.1, grossMarginPercentage: 89.8 },
    ];

    beforeEach(() => {
      mockUnitEconomicsService.calculateGrossMarginBySegment.mockResolvedValue(
        mockGrossMarginBySegment,
      );
    });

    it('should return gross margin with default date range', async () => {
      const result = await controller.getGrossMargin();

      expect(result.success).toBe(true);
      expect(result.data.overall).toBeDefined();
      expect(result.data.bySegment).toHaveLength(3);
      expect(unitEconomicsService.calculateGrossMarginBySegment).toHaveBeenCalled();
    });

    it('should return gross margin with custom date range', async () => {
      const startDate = '2024-01-01';
      const endDate = '2024-01-31';

      const result = await controller.getGrossMargin(startDate, endDate);

      expect(result.success).toBe(true);
      expect(unitEconomicsService.calculateGrossMarginBySegment).toHaveBeenCalledWith(
        new Date(startDate),
        new Date(endDate),
      );
    });

    it('should calculate overall gross margin correctly', async () => {
      const result = await controller.getGrossMargin();

      const totalRevenue = 1960 + 2475 + 1495;
      const totalCOGS = 1215.2 + 759.5 + 151.9;
      const expectedOverall = ((totalRevenue - totalCOGS) / totalRevenue) * 100;

      expect(result.data.overall).toBe(Number(expectedOverall.toFixed(1)));
    });

    it('should return 0 for overall when segments is empty', async () => {
      mockUnitEconomicsService.calculateGrossMarginBySegment.mockResolvedValue([]);

      const result = await controller.getGrossMargin();

      expect(result.data.overall).toBe(0);
    });

    it('should return 0 for overall when total revenue is 0', async () => {
      mockUnitEconomicsService.calculateGrossMarginBySegment.mockResolvedValue([
        { segment: 'starter', revenue: 0, cogs: 0, grossMargin: 0, grossMarginPercentage: 0 },
      ]);

      const result = await controller.getGrossMargin();

      expect(result.data.overall).toBe(0);
    });

    it('should include COGS breakdown', async () => {
      const result = await controller.getGrossMargin();

      expect(result.data.calculation.cogsBreakdown).toEqual({
        infrastructure: 8.0,
        voiceAI: 16.0,
        telephony: 2.66,
        paymentProcessing: 2.68,
        support: 5.0,
      });
    });

    it('should include segment details', async () => {
      const result = await controller.getGrossMargin();

      result.data.bySegment.forEach((segment) => {
        expect(segment).toHaveProperty('segment');
        expect(segment).toHaveProperty('revenue');
        expect(segment).toHaveProperty('cogs');
        expect(segment).toHaveProperty('grossMargin');
        expect(segment).toHaveProperty('grossMarginPercentage');
      });
    });
  });

  describe('getBreakEven', () => {
    beforeEach(() => {
      mockPrismaService.$queryRaw.mockResolvedValue([{ count: 50 }]);
    });

    it('should return break-even analysis', async () => {
      const result = await controller.getBreakEven();

      expect(result.success).toBe(true);
      expect(result.data.breakEvenShops).toBeGreaterThan(0);
      expect(result.data.currentShops).toBe(50);
      expect(result.data.monthsToBreakEven).toBeGreaterThanOrEqual(0);
    });

    it('should calculate break-even shops correctly', async () => {
      const result = await controller.getBreakEven();

      // Fixed costs: €14,300
      // ARPA: €82
      // COGS per shop: €34.34
      // Contribution margin: €82 - €34.34 = €47.66
      // Break-even shops: €14,300 / €47.66 = 300.04... ≈ 301
      expect(result.data.breakEvenShops).toBe(301);
    });

    it('should query current shop count', async () => {
      await controller.getBreakEven();

      expect(prisma.$queryRaw).toHaveBeenCalled();
      // $queryRaw is called with a template literal array
      const queryCall = mockPrismaService.$queryRaw.mock.calls[0];
      expect(queryCall[0][0]).toContain('SELECT COUNT(*) as count FROM tenants');
    });

    it('should handle 0 current shops', async () => {
      mockPrismaService.$queryRaw.mockResolvedValue([{ count: 0 }]);

      const result = await controller.getBreakEven();

      expect(result.data.currentShops).toBe(0);
      expect(result.data.monthsToBreakEven).toBeGreaterThan(0);
    });

    it('should return 0 months to break-even when already at break-even', async () => {
      mockPrismaService.$queryRaw.mockResolvedValue([{ count: 500 }]);

      const result = await controller.getBreakEven();

      expect(result.data.currentShops).toBe(500);
      expect(result.data.monthsToBreakEven).toBe(0);
    });

    it('should return 0 months to break-even when above break-even', async () => {
      mockPrismaService.$queryRaw.mockResolvedValue([{ count: 400 }]);

      const result = await controller.getBreakEven();

      expect(result.data.currentShops).toBe(400);
      expect(result.data.monthsToBreakEven).toBe(0);
    });

    it('should include assumptions', async () => {
      const result = await controller.getBreakEven();

      expect(result.data.assumptions).toEqual({
        fixedCosts: 14300,
        arpa: 82,
        cogsPerShop: 34.34,
        monthlyGrowthRate: 0.15,
      });
    });

    it('should include monthly projections', async () => {
      const result = await controller.getBreakEven();

      expect(result.data.monthlyProjections.length).toBeGreaterThan(0);
      
      result.data.monthlyProjections.forEach((projection) => {
        expect(projection).toHaveProperty('month');
        expect(projection).toHaveProperty('shops');
        expect(projection).toHaveProperty('revenue');
        expect(projection).toHaveProperty('cogs');
        expect(projection).toHaveProperty('grossProfit');
        expect(projection).toHaveProperty('fixedCosts');
        expect(projection).toHaveProperty('netProfit');
      });
    });

    it('should generate at least 24 months of projections', async () => {
      mockPrismaService.$queryRaw.mockResolvedValue([{ count: 500 }]);

      const result = await controller.getBreakEven();

      expect(result.data.monthlyProjections.length).toBeGreaterThanOrEqual(24);
    });

    it('should generate projections up to monthsToBreakEven + 6 when not at break-even', async () => {
      mockPrismaService.$queryRaw.mockResolvedValue([{ count: 50 }]);

      const result = await controller.getBreakEven();

      // monthsToBreakEven should be calculated, and projections should go beyond that
      expect(result.data.monthlyProjections.length).toBeGreaterThanOrEqual(
        result.data.monthsToBreakEven + 6,
      );
    });

    it('should calculate net profit correctly in projections', async () => {
      const result = await controller.getBreakEven();

      const firstProjection = result.data.monthlyProjections[0];
      const expectedGrossProfit = firstProjection.revenue - firstProjection.cogs;
      const expectedNetProfit = expectedGrossProfit - firstProjection.fixedCosts;

      expect(firstProjection.grossProfit).toBe(expectedGrossProfit);
      expect(firstProjection.netProfit).toBe(expectedNetProfit);
    });

    it('should apply growth rate to shops in projections', async () => {
      mockPrismaService.$queryRaw.mockResolvedValue([{ count: 100 }]);

      const result = await controller.getBreakEven();

      // With 15% growth rate, each month shops should increase
      const month0 = result.data.monthlyProjections[0].shops;
      const month1 = result.data.monthlyProjections[1].shops;
      
      expect(month1).toBeGreaterThanOrEqual(Math.round(month0 * 1.15));
    });

    it('should handle non-array query result', async () => {
      mockPrismaService.$queryRaw.mockResolvedValue(null);

      const result = await controller.getBreakEven();

      expect(result.data.currentShops).toBe(0);
    });

    it('should handle query result without count property', async () => {
      mockPrismaService.$queryRaw.mockResolvedValue([{}]);

      const result = await controller.getBreakEven();

      // Number(undefined) = NaN
      expect(result.data.currentShops).toBeNaN();
    });
  });

  describe('getLTVCACRatio', () => {
    const mockCACResult = {
      blended: 150,
      byChannel: [],
    };

    const mockLTVByTier = [
      { tier: 'starter', ltv: 1013, arpa: 49 },
      { tier: 'pro', ltv: 2046, arpa: 99 },
      { tier: 'enterprise', ltv: 6179, arpa: 299 },
    ];

    beforeEach(() => {
      mockUnitEconomicsService.calculateCAC.mockResolvedValue(mockCACResult);
      mockUnitEconomicsService.calculateLTVByTier.mockResolvedValue(mockLTVByTier);
    });

    it('should return LTV/CAC ratio', async () => {
      const result = await controller.getLTVCACRatio();

      expect(result.success).toBe(true);
      expect(result.data.ratio).toBeGreaterThan(0);
      expect(result.data.ltv).toBeDefined();
      expect(result.data.cac).toBeDefined();
      expect(result.data.status).toBeDefined();
    });

    it('should calculate correct ratio', async () => {
      const result = await controller.getLTVCACRatio();

      // Blended LTV = (1013 + 2046 + 6179) / 3 = 3079.33
      // CAC = 150
      // Ratio = 3079.33 / 150 = 20.53 ≈ 20.5
      expect(result.data.ratio).toBe(20.5);
    });

    it('should return status as excellent when ratio >= 5', async () => {
      mockUnitEconomicsService.calculateLTVByTier.mockResolvedValue([
        { tier: 'starter', ltv: 1000, arpa: 49 },
        { tier: 'pro', ltv: 2000, arpa: 99 },
        { tier: 'enterprise', ltv: 6000, arpa: 299 },
      ]);

      const result = await controller.getLTVCACRatio();

      expect(result.data.status).toBe('excellent');
    });

    it('should return status as good when ratio between 3 and 5', async () => {
      mockUnitEconomicsService.calculateCAC.mockResolvedValue({
        blended: 1000,
        byChannel: [],
      });

      const result = await controller.getLTVCACRatio();

      // Ratio = 3079 / 1000 = 3.08
      expect(result.data.status).toBe('good');
    });

    it('should return status as warning when ratio between 1.5 and 3', async () => {
      mockUnitEconomicsService.calculateCAC.mockResolvedValue({
        blended: 1500,
        byChannel: [],
      });

      const result = await controller.getLTVCACRatio();

      // Ratio = 3079 / 1500 = 2.05
      expect(result.data.status).toBe('warning');
    });

    it('should return status as critical when ratio < 1.5', async () => {
      mockUnitEconomicsService.calculateCAC.mockResolvedValue({
        blended: 3000,
        byChannel: [],
      });

      const result = await controller.getLTVCACRatio();

      // Ratio = 3079 / 3000 = 1.03
      expect(result.data.status).toBe('critical');
    });

    it('should return 0 ratio when CAC is 0', async () => {
      mockUnitEconomicsService.calculateCAC.mockResolvedValue({
        blended: 0,
        byChannel: [],
      });

      const result = await controller.getLTVCACRatio();

      expect(result.data.ratio).toBe(0);
      expect(result.data.status).toBe('critical');
    });

    it('should call calculateCAC with correct date range', async () => {
      await controller.getLTVCACRatio();

      const callArgs = mockUnitEconomicsService.calculateCAC.mock.calls[0];
      expect(callArgs[0]).toBeInstanceOf(Date);
      expect(callArgs[1]).toBeInstanceOf(Date);
      
      // Check that start date is approximately 30 days ago
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      expect(callArgs[0].getDate()).toBe(thirtyDaysAgo.getDate());
    });
  });

  describe('getPaybackPeriod', () => {
    const mockCACResult = {
      blended: 150,
      byChannel: [],
    };

    beforeEach(() => {
      mockUnitEconomicsService.calculateCAC.mockResolvedValue(mockCACResult);
    });

    it('should return payback period', async () => {
      const result = await controller.getPaybackPeriod();

      expect(result.success).toBe(true);
      expect(result.data.months).toBeDefined();
      expect(result.data.days).toBeDefined();
      expect(result.data.cac).toBe(150);
      expect(result.data.monthlyContribution).toBeDefined();
    });

    it('should calculate payback period correctly', async () => {
      const result = await controller.getPaybackPeriod();

      // Payback = CAC / (ARPA × Gross Margin)
      // Payback = 150 / (82 × 0.62) = 2.95 ≈ 3.0
      expect(result.data.months).toBe(3.0);
    });

    it('should calculate days correctly', async () => {
      const result = await controller.getPaybackPeriod();

      // Days = months × 30 = 2.95 × 30 = 88.5 ≈ 89
      expect(result.data.days).toBe(89);
    });

    it('should calculate monthly contribution correctly', async () => {
      const result = await controller.getPaybackPeriod();

      // Monthly Contribution = ARPA × Gross Margin = 82 × 0.62 = 50.84
      expect(result.data.monthlyContribution).toBe(50.84);
    });

    it('should call calculateCAC with correct date range', async () => {
      await controller.getPaybackPeriod();

      const callArgs = mockUnitEconomicsService.calculateCAC.mock.calls[0];
      expect(callArgs[0]).toBeInstanceOf(Date);
      expect(callArgs[1]).toBeInstanceOf(Date);
    });

    it('should handle very high CAC', async () => {
      mockUnitEconomicsService.calculateCAC.mockResolvedValue({
        blended: 1000,
        byChannel: [],
      });

      const result = await controller.getPaybackPeriod();

      // Payback = 1000 / (82 × 0.62) = 19.67 ≈ 19.7
      expect(result.data.months).toBe(19.7);
      expect(result.data.days).toBe(590); // 19.67 × 30 = 590.1 ≈ 590
    });

    it('should handle very low CAC', async () => {
      mockUnitEconomicsService.calculateCAC.mockResolvedValue({
        blended: 50,
        byChannel: [],
      });

      const result = await controller.getPaybackPeriod();

      // Payback = 50 / (82 × 0.62) = 0.98 ≈ 1.0
      expect(result.data.months).toBe(1.0);
      expect(result.data.days).toBe(30);
    });

    it('should handle zero CAC', async () => {
      mockUnitEconomicsService.calculateCAC.mockResolvedValue({
        blended: 0,
        byChannel: [],
      });

      const result = await controller.getPaybackPeriod();

      expect(result.data.months).toBe(0);
      expect(result.data.days).toBe(0);
    });
  });
});
