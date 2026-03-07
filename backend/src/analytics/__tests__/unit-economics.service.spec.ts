import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import {
  UnitEconomicsService,
  CACBreakdown,
  CohortLTV,
  ChurnAnalysis,
  GrossMarginBySegment,
  UnitEconomicsReport,
} from '../services/unit-economics.service';
import { PrismaService } from '@common/services/prisma.service';
import { LoggerService } from '@common/services/logger.service';

describe('UnitEconomicsService', () => {
  let service: UnitEconomicsService;
  let prisma: jest.Mocked<PrismaService>;
  let loggerService: jest.Mocked<LoggerService>;

  // Mock Prisma client with $queryRaw method
  const mockPrismaClient = {
    $queryRaw: jest.fn(),
  };

  const mockLoggerService = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  };

  // Spy on Logger methods (used internally by the service)
  let loggerDebugSpy: jest.SpyInstance;

  beforeEach(async () => {
    // Setup Logger spies before creating the module
    loggerDebugSpy = jest.spyOn(Logger.prototype, 'debug').mockImplementation(() => {});

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UnitEconomicsService,
        {
          provide: PrismaService,
          useValue: mockPrismaClient,
        },
        {
          provide: LoggerService,
          useValue: mockLoggerService,
        },
      ],
    }).compile();

    service = module.get<UnitEconomicsService>(UnitEconomicsService);
    prisma = module.get(PrismaService) as jest.Mocked<PrismaService>;
    loggerService = module.get(LoggerService) as jest.Mocked<LoggerService>;

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
    loggerDebugSpy.mockRestore();
  });

  describe('constructor', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  describe('calculateCAC', () => {
    it('should calculate CAC with default channel data', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      const result = await service.calculateCAC(startDate, endDate);

      expect(result).toBeDefined();
      expect(result.blended).toBeGreaterThan(0);
      expect(result.byChannel).toHaveLength(6);
      expect(loggerDebugSpy).toHaveBeenCalledWith(
        `Calculating CAC from ${startDate} to ${endDate}`,
      );
    });

    it('should calculate correct blended CAC', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      const result = await service.calculateCAC(startDate, endDate);

      // Total spend: 4000 + 8000 + 5400 + 3000 + 6000 + 4500 = 30,900
      // Total new customers: 100 + 40 + 30 + 30 + 15 + 15 = 230
      // Blended CAC: 30900 / 230 = 134.347... ≈ 134
      expect(result.blended).toBe(134);
    });

    it('should return channel breakdown with correct structure', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      const result = await service.calculateCAC(startDate, endDate);

      result.byChannel.forEach((channel: CACBreakdown) => {
        expect(channel).toHaveProperty('channel');
        expect(channel).toHaveProperty('spend');
        expect(channel).toHaveProperty('newCustomers');
        expect(channel).toHaveProperty('cac');
        expect(channel).toHaveProperty('percentageOfTotal');
        expect(channel.cac).toBe(Math.round(channel.spend / channel.newCustomers));
      });
    });

    it('should calculate different dates correctly', async () => {
      const startDate = new Date('2024-06-01');
      const endDate = new Date('2024-06-30');

      const result = await service.calculateCAC(startDate, endDate);

      expect(result).toBeDefined();
      expect(result.blended).toBe(134);
    });
  });

  describe('calculateLTVByCohort', () => {
    beforeEach(() => {
      mockPrismaClient.$queryRaw.mockResolvedValue([]);
    });

    it('should calculate LTV for default 12 months', async () => {
      const result = await service.calculateLTVByCohort();

      expect(result).toHaveLength(12);
      expect(loggerDebugSpy).toHaveBeenCalledWith('Calculating LTV for last 12 cohorts');
    });

    it('should calculate LTV for specified number of months', async () => {
      const result = await service.calculateLTVByCohort(6);

      expect(result).toHaveLength(6);
      expect(loggerDebugSpy).toHaveBeenCalledWith('Calculating LTV for last 6 cohorts');
    });

    it('should calculate LTV for 24 months', async () => {
      const result = await service.calculateLTVByCohort(24);

      expect(result).toHaveLength(24);
    });

    it('should query customers for each cohort', async () => {
      await service.calculateLTVByCohort(3);

      expect(mockPrismaClient.$queryRaw).toHaveBeenCalledTimes(3);
    });

    it('should handle customers returned from database', async () => {
      mockPrismaClient.$queryRaw.mockResolvedValue([
        { id: 'tenant-1', created_at: new Date(), booking_count: 5 },
        { id: 'tenant-2', created_at: new Date(), booking_count: 3 },
      ]);

      const result = await service.calculateLTVByCohort(1);

      expect(result).toHaveLength(1);
      expect(result[0].startingCustomers).toBe(2);
      expect(result[0].monthlyRevenue.length).toBeGreaterThan(0);
    });

    it('should calculate correct LTV using formula', async () => {
      mockPrismaClient.$queryRaw.mockResolvedValue([]);

      const result = await service.calculateLTVByCohort(1);

      // LTV = ARPA × Gross Margin × (1 / Monthly Churn Rate)
      // LTV = 82 × 0.62 × (1 / 0.03) = 1694.67... ≈ 1695
      expect(result[0].ltv).toBe(1695);
    });

    it('should include cohort month in YYYY-MM format', async () => {
      mockPrismaClient.$queryRaw.mockResolvedValue([]);

      const result = await service.calculateLTVByCohort(1);

      expect(result[0].cohortMonth).toMatch(/^\d{4}-\d{2}$/);
    });

    it('should include monthly revenue with churn applied', async () => {
      mockPrismaClient.$queryRaw.mockResolvedValue([
        { id: 'tenant-1', created_at: new Date(), booking_count: 10 },
      ]);

      const result = await service.calculateLTVByCohort(1);

      const monthlyRevenue = result[0].monthlyRevenue;
      expect(monthlyRevenue.length).toBeGreaterThan(0);

      // First month should have all customers
      expect(monthlyRevenue[0].customers).toBe(1);
      expect(monthlyRevenue[0].revenue).toBe(82); // 1 × 82

      // Subsequent months should apply 3% churn
      if (monthlyRevenue.length > 1) {
        expect(monthlyRevenue[1].customers).toBeLessThanOrEqual(1);
      }
    });

    it('should include CAC and LTV/CAC ratio', async () => {
      mockPrismaClient.$queryRaw.mockResolvedValue([]);

      const result = await service.calculateLTVByCohort(1);

      expect(result[0].cac).toBe(150);
      expect(result[0].ltvCacRatio).toBeGreaterThan(0);
      // LTV/CAC = 1695 / 150 = 11.3
      expect(result[0].ltvCacRatio).toBeCloseTo(11.3, 1);
    });
  });

  describe('calculateLTVByTier', () => {
    it('should calculate LTV for all tiers', async () => {
      const result = await service.calculateLTVByTier();

      expect(result).toHaveLength(3);
      expect(result.map((t) => t.tier)).toEqual(['starter', 'pro', 'enterprise']);
    });

    it('should calculate correct LTV for starter tier', async () => {
      const result = await service.calculateLTVByTier();

      const starter = result.find((t) => t.tier === 'starter');
      expect(starter).toBeDefined();
      expect(starter?.arpa).toBe(49);
      // LTV = 49 × 0.62 × (1 / 0.03) = 1012.67 ≈ 1013
      expect(starter?.ltv).toBe(1013);
    });

    it('should calculate correct LTV for pro tier', async () => {
      const result = await service.calculateLTVByTier();

      const pro = result.find((t) => t.tier === 'pro');
      expect(pro).toBeDefined();
      expect(pro?.arpa).toBe(99);
      // LTV = 99 × 0.62 × (1 / 0.03) = 2046 ≈ 2046
      expect(pro?.ltv).toBe(2046);
    });

    it('should calculate correct LTV for enterprise tier', async () => {
      const result = await service.calculateLTVByTier();

      const enterprise = result.find((t) => t.tier === 'enterprise');
      expect(enterprise).toBeDefined();
      expect(enterprise?.arpa).toBe(299);
      // LTV = 299 × 0.62 × (1 / 0.03) = 6179.33 ≈ 6179
      expect(enterprise?.ltv).toBe(6179);
    });

    it('should include arpa in response', async () => {
      const result = await service.calculateLTVByTier();

      result.forEach((tier) => {
        expect(tier).toHaveProperty('arpa');
        expect(typeof tier.arpa).toBe('number');
      });
    });
  });

  describe('analyzeChurn', () => {
    beforeEach(() => {
      mockPrismaClient.$queryRaw.mockResolvedValue([{ count: 100 }]);
    });

    it('should analyze churn for default 12 months', async () => {
      const result = await service.analyzeChurn();

      expect(result).toHaveLength(12);
      expect(loggerDebugSpy).toHaveBeenCalledWith('Analyzing churn for last 12 months');
    });

    it('should analyze churn for specified months', async () => {
      const result = await service.analyzeChurn(6);

      expect(result).toHaveLength(6);
      expect(loggerDebugSpy).toHaveBeenCalledWith('Analyzing churn for last 6 months');
    });

    it('should query starting customers for each period', async () => {
      await service.analyzeChurn(3);

      expect(mockPrismaClient.$queryRaw).toHaveBeenCalledTimes(3);
    });

    it('should calculate churn rate correctly', async () => {
      mockPrismaClient.$queryRaw.mockResolvedValue([{ count: 100 }]);

      const result = await service.analyzeChurn(1);

      // 3% of 100 customers churned
      expect(result[0].startingCustomers).toBe(100);
      expect(result[0].churnedCustomers).toBe(3); // 3% of 100
      expect(result[0].churnRate).toBe(3); // 3%
    });

    it('should calculate revenue churn', async () => {
      mockPrismaClient.$queryRaw.mockResolvedValue([{ count: 100 }]);

      const result = await service.analyzeChurn(1);

      // Revenue churn = 3 customers × €82 = €246
      expect(result[0].revenueChurn).toBe(246);
      // Revenue churn rate = 246 / (100 × 82) = 3%
      expect(result[0].revenueChurnRate).toBe(3);
    });

    it('should include tier breakdown', async () => {
      mockPrismaClient.$queryRaw.mockResolvedValue([{ count: 100 }]);

      const result = await service.analyzeChurn(1);

      expect(result[0].byTier).toHaveLength(3);
      expect(result[0].byTier.map((t) => t.tier)).toEqual(['starter', 'pro', 'enterprise']);
    });

    it('should handle zero starting customers', async () => {
      mockPrismaClient.$queryRaw.mockResolvedValue([{ count: 0 }]);

      const result = await service.analyzeChurn(1);

      expect(result[0].startingCustomers).toBe(0);
      expect(result[0].churnRate).toBe(0);
      expect(result[0].revenueChurnRate).toBe(0);
    });

    it('should format period as YYYY-MM', async () => {
      mockPrismaClient.$queryRaw.mockResolvedValue([{ count: 100 }]);

      const result = await service.analyzeChurn(1);

      expect(result[0].period).toMatch(/^\d{4}-\d{2}$/);
    });
  });

  describe('calculateGrossMarginBySegment', () => {
    beforeEach(() => {
      mockPrismaClient.$queryRaw.mockResolvedValue([
        { subscription_tier: 'starter', count: 40 },
        { subscription_tier: 'pro', count: 25 },
        { subscription_tier: 'enterprise', count: 5 },
      ]);
    });

    it('should calculate gross margin for all segments', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      const result = await service.calculateGrossMarginBySegment(startDate, endDate);

      expect(result).toHaveLength(3);
      expect(result.map((s) => s.segment)).toEqual(['starter', 'pro', 'enterprise']);
      expect(loggerDebugSpy).toHaveBeenCalledWith('Calculating gross margin by segment');
    });

    it('should calculate correct revenue for each segment', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      const result = await service.calculateGrossMarginBySegment(startDate, endDate);

      const starter = result.find((s) => s.segment === 'starter');
      expect(starter?.revenue).toBe(40 * 49); // 40 shops × €49

      const pro = result.find((s) => s.segment === 'pro');
      expect(pro?.revenue).toBe(25 * 99); // 25 shops × €99

      const enterprise = result.find((s) => s.segment === 'enterprise');
      expect(enterprise?.revenue).toBe(5 * 299); // 5 shops × €299
    });

    it('should calculate correct COGS using STANDARD_COGS', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      const result = await service.calculateGrossMarginBySegment(startDate, endDate);

      // STANDARD_COGS = 30.38
      const starter = result.find((s) => s.segment === 'starter');
      expect(starter?.cogs).toBe(40 * 30.38); // 40 shops × €30.38
    });

    it('should calculate correct gross margin', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      const result = await service.calculateGrossMarginBySegment(startDate, endDate);

      const starter = result.find((s) => s.segment === 'starter');
      const expectedRevenue = 40 * 49;
      const expectedCogs = 40 * 30.38;
      const expectedGrossMargin = expectedRevenue - expectedCogs;

      expect(starter?.grossMargin).toBe(expectedGrossMargin);
    });

    it('should calculate correct gross margin percentage', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      const result = await service.calculateGrossMarginBySegment(startDate, endDate);

      result.forEach((segment: GrossMarginBySegment) => {
        const expectedPercentage = (segment.grossMargin / segment.revenue) * 100;
        expect(segment.grossMarginPercentage).toBe(Number(expectedPercentage.toFixed(1)));
      });
    });

    it('should query database for tier counts', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      await service.calculateGrossMarginBySegment(startDate, endDate);

      expect(mockPrismaClient.$queryRaw).toHaveBeenCalled();
    });

    it('should use default values when database query fails', async () => {
      mockPrismaClient.$queryRaw.mockRejectedValue(new Error('Database error'));

      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      const result = await service.calculateGrossMarginBySegment(startDate, endDate);

      expect(result).toHaveLength(3);
      expect(loggerDebugSpy).toHaveBeenCalledWith(
        'Calculating gross margin by segment',
      );
    });

    it('should handle empty tier counts from database', async () => {
      mockPrismaClient.$queryRaw.mockResolvedValue([]);

      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      const result = await service.calculateGrossMarginBySegment(startDate, endDate);

      // Should use default values
      expect(result).toHaveLength(3);
    });

    it('should handle null tier counts gracefully', async () => {
      mockPrismaClient.$queryRaw.mockResolvedValue([
        { subscription_tier: null, count: 10 },
      ]);

      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      const result = await service.calculateGrossMarginBySegment(startDate, endDate);

      expect(result).toHaveLength(3);
      // Starter should use default 40 since null tier won't match
      const starter = result.find((s) => s.segment === 'starter');
      expect(starter?.revenue).toBe(40 * 49);
    });
  });

  describe('calculatePaybackPeriod', () => {
    it('should calculate payback period correctly', () => {
      const cac = 150;
      const arpa = 82;
      const grossMargin = 0.62;

      const result = service.calculatePaybackPeriod(cac, arpa, grossMargin);

      // Payback = CAC / (ARPA × Gross Margin)
      // Payback = 150 / (82 × 0.62) = 2.95 ≈ 3.0
      expect(result).toBe(3.0);
    });

    it('should return 0 when monthly contribution is 0', () => {
      const cac = 150;
      const arpa = 0;
      const grossMargin = 0.62;

      const result = service.calculatePaybackPeriod(cac, arpa, grossMargin);

      expect(result).toBe(0);
    });

    it('should handle zero gross margin', () => {
      const cac = 150;
      const arpa = 82;
      const grossMargin = 0;

      const result = service.calculatePaybackPeriod(cac, arpa, grossMargin);

      expect(result).toBe(0);
    });

    it('should handle very small monthly contribution', () => {
      const cac = 150;
      const arpa = 1;
      const grossMargin = 0.01;

      const result = service.calculatePaybackPeriod(cac, arpa, grossMargin);

      // 150 / 0.01 = 15000
      expect(result).toBe(15000);
    });
  });

  describe('generateReport', () => {
    beforeEach(() => {
      mockPrismaClient.$queryRaw.mockResolvedValue([]);
    });

    it('should generate comprehensive unit economics report', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      const result = await service.generateReport(startDate, endDate);

      expect(result).toBeDefined();
      expect(result.generatedAt).toBeInstanceOf(Date);
      expect(result.period).toEqual({ start: startDate, end: endDate });
      // Logger.debug is called with 'Generating unit economics report'
      expect(loggerDebugSpy).toHaveBeenCalled();
    });

    it('should include CAC data', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      const result = await service.generateReport(startDate, endDate);

      expect(result.cac).toBeDefined();
      expect(result.cac.blended).toBeGreaterThan(0);
      expect(result.cac.byChannel).toHaveLength(6);
    });

    it('should include LTV data', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      const result = await service.generateReport(startDate, endDate);

      expect(result.ltv).toBeDefined();
      expect(result.ltv.blended).toBeGreaterThan(0);
      expect(result.ltv.byCohort).toHaveLength(12);
      expect(result.ltv.byTier).toHaveLength(3);
    });

    it('should include churn analysis', async () => {
      mockPrismaClient.$queryRaw.mockResolvedValue([{ count: 100 }]);

      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      const result = await service.generateReport(startDate, endDate);

      expect(result.churn).toBeDefined();
      expect(result.churn).toHaveLength(12);
    });

    it('should include gross margin data', async () => {
      mockPrismaClient.$queryRaw.mockResolvedValue([]);

      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      const result = await service.generateReport(startDate, endDate);

      expect(result.grossMargin).toBeDefined();
      expect(typeof result.grossMargin.overall).toBe('number');
      expect(result.grossMargin.bySegment).toHaveLength(3);
    });

    it('should calculate overall gross margin correctly', async () => {
      mockPrismaClient.$queryRaw.mockResolvedValue([
        { subscription_tier: 'starter', count: 40 },
        { subscription_tier: 'pro', count: 25 },
        { subscription_tier: 'enterprise', count: 5 },
      ]);

      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      const result = await service.generateReport(startDate, endDate);

      const totalRevenue = result.grossMargin.bySegment.reduce((sum, s) => sum + s.revenue, 0);
      const totalCOGS = result.grossMargin.bySegment.reduce((sum, s) => sum + s.cogs, 0);
      const expectedOverall = ((totalRevenue - totalCOGS) / totalRevenue) * 100;

      expect(result.grossMargin.overall).toBe(Number(expectedOverall.toFixed(1)));
    });

    it('should include ARPA', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      const result = await service.generateReport(startDate, endDate);

      expect(result.arpa).toBe(82);
    });

    it('should include payback period', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      const result = await service.generateReport(startDate, endDate);

      expect(typeof result.paybackPeriod).toBe('number');
      expect(result.paybackPeriod).toBeGreaterThan(0);
    });

    it('should include LTV/CAC ratio', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      const result = await service.generateReport(startDate, endDate);

      expect(typeof result.ltvCacRatio).toBe('number');
      expect(result.ltvCacRatio).toBeGreaterThan(0);
    });

    it('should handle empty cohorts for blended LTV', async () => {
      mockPrismaClient.$queryRaw.mockResolvedValue([]);

      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      // Override to return empty cohorts
      jest.spyOn(service, 'calculateLTVByCohort').mockResolvedValueOnce([]);

      const result = await service.generateReport(startDate, endDate);

      expect(result.ltv.blended).toBe(0);
    });

    it('should handle zero total revenue for overall gross margin', async () => {
      mockPrismaClient.$queryRaw.mockResolvedValue([
        { subscription_tier: 'starter', count: 0 },
        { subscription_tier: 'pro', count: 0 },
        { subscription_tier: 'enterprise', count: 0 },
      ]);

      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      const result = await service.generateReport(startDate, endDate);

      expect(result.grossMargin.overall).toBe(0);
    });
  });

  describe('exportInvestorMetrics', () => {
    beforeEach(() => {
      mockPrismaClient.$queryRaw.mockResolvedValue([{ count: 100 }]);
    });

    it('should export investor metrics', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      const result = await service.exportInvestorMetrics(startDate, endDate);

      expect(result).toBeDefined();
      expect(result).toHaveProperty('arr');
      expect(result).toHaveProperty('mrr');
      expect(result).toHaveProperty('customers');
      expect(result).toHaveProperty('netDollarRetention');
      expect(result).toHaveProperty('grossDollarRetention');
      expect(result).toHaveProperty('magicNumber');
      expect(result).toHaveProperty('ruleOf40');
    });

    it('should calculate MRR correctly', async () => {
      mockPrismaClient.$queryRaw.mockResolvedValue([{ count: 100 }]);

      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      const result = await service.exportInvestorMetrics(startDate, endDate);

      // MRR = 100 customers × €82 = €8,200
      expect(result.mrr).toBe(8200);
    });

    it('should calculate ARR correctly', async () => {
      mockPrismaClient.$queryRaw.mockResolvedValue([{ count: 100 }]);

      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      const result = await service.exportInvestorMetrics(startDate, endDate);

      // ARR = MRR × 12 = 8200 × 12 = 98,400
      expect(result.arr).toBe(98400);
    });

    it('should include customer count', async () => {
      mockPrismaClient.$queryRaw.mockResolvedValue([{ count: 150 }]);

      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      const result = await service.exportInvestorMetrics(startDate, endDate);

      expect(result.customers).toBe(150);
    });

    it('should include retention metrics', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      const result = await service.exportInvestorMetrics(startDate, endDate);

      expect(result.netDollarRetention).toBe(102.4);
      expect(result.grossDollarRetention).toBe(97.0);
    });

    it('should calculate magic number correctly', async () => {
      mockPrismaClient.$queryRaw.mockResolvedValue([{ count: 100 }]);

      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      const result = await service.exportInvestorMetrics(startDate, endDate);

      // Net New ARR = ARR × 15% = 98,400 × 0.15 = 14,760
      // Magic Number = (Net New ARR × 12) / S&M Spend = (14,760 × 12) / 15,000 = 11.808 ≈ 11.81
      expect(result.magicNumber).toBeCloseTo(11.81, 1);
    });

    it('should calculate rule of 40 correctly', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      const result = await service.exportInvestorMetrics(startDate, endDate);

      // Rule of 40 = Growth Rate + EBITDA Margin = 150 + (-100) = 50
      expect(result.ruleOf40).toBe(50);
    });

    it('should handle zero customer count', async () => {
      mockPrismaClient.$queryRaw.mockResolvedValue([{ count: 0 }]);

      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      const result = await service.exportInvestorMetrics(startDate, endDate);

      expect(result.customers).toBe(0);
      expect(result.mrr).toBe(0);
      expect(result.arr).toBe(0);
    });

    it('should handle non-array query result', async () => {
      mockPrismaClient.$queryRaw.mockResolvedValue(null);

      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      const result = await service.exportInvestorMetrics(startDate, endDate);

      expect(result.customers).toBe(0);
    });

    it('should handle query result without count property', async () => {
      mockPrismaClient.$queryRaw.mockResolvedValue([{}]);

      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      const result = await service.exportInvestorMetrics(startDate, endDate);

      expect(result.customers).toBeNaN(); // Number(undefined) = NaN
    });
  });
});
