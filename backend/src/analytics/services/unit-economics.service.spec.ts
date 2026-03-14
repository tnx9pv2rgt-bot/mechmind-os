import { Test, TestingModule } from '@nestjs/testing';
import { UnitEconomicsService } from './unit-economics.service';
import { PrismaService } from '@common/services/prisma.service';
import { LoggerService } from '@common/services/logger.service';

describe('UnitEconomicsService', () => {
  let service: UnitEconomicsService;
  let prisma: jest.Mocked<Pick<PrismaService, '$queryRaw'>>;

  beforeEach(async () => {
    prisma = {
      $queryRaw: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UnitEconomicsService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: LoggerService,
          useValue: {
            log: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
            debug: jest.fn(),
            verbose: jest.fn(),
            setContext: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<UnitEconomicsService>(UnitEconomicsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ─── calculateCAC ───────────────────────────────────────────────

  describe('calculateCAC', () => {
    const startDate = new Date('2026-01-01');
    const endDate = new Date('2026-03-01');

    it('should return blended CAC and channel breakdown', async () => {
      const result = await service.calculateCAC(startDate, endDate);

      expect(result.blended).toBeGreaterThan(0);
      expect(result.byChannel).toHaveLength(6);
      expect(result.byChannel[0]).toEqual(
        expect.objectContaining({
          channel: 'organic_seo',
          spend: expect.any(Number),
          newCustomers: expect.any(Number),
          cac: expect.any(Number),
          percentageOfTotal: expect.any(Number),
        }),
      );
    });

    it('should calculate blended CAC as totalSpend / totalNewCustomers', async () => {
      const result = await service.calculateCAC(startDate, endDate);

      const totalSpend = result.byChannel.reduce((sum, c) => sum + c.spend, 0);
      const totalNewCustomers = result.byChannel.reduce((sum, c) => sum + c.newCustomers, 0);
      const expectedBlended = Math.round(totalSpend / totalNewCustomers);

      expect(result.blended).toBe(expectedBlended);
    });

    it('should include all 6 marketing channels', async () => {
      const result = await service.calculateCAC(startDate, endDate);

      const channelNames = result.byChannel.map(c => c.channel);
      expect(channelNames).toEqual([
        'organic_seo',
        'paid_search',
        'social_ads',
        'partner_referrals',
        'events_trade_shows',
        'outbound_sales',
      ]);
    });
  });

  // ─── calculateLTVByCohort ────────────────────────────────────────

  describe('calculateLTVByCohort', () => {
    it('should return cohorts for the specified number of months', async () => {
      prisma.$queryRaw.mockResolvedValue([]);

      const result = await service.calculateLTVByCohort(6);

      expect(result).toHaveLength(6);
      expect(prisma.$queryRaw).toHaveBeenCalledTimes(6);
    });

    it('should default to 12 months', async () => {
      prisma.$queryRaw.mockResolvedValue([]);

      const result = await service.calculateLTVByCohort();

      expect(result).toHaveLength(12);
    });

    it('should calculate LTV using ARPA * grossMargin * (1/churnRate)', async () => {
      prisma.$queryRaw.mockResolvedValue([{ id: '1', created_at: new Date(), booking_count: 5 }]);

      const result = await service.calculateLTVByCohort(1);

      // LTV = 82 * 0.62 * (1 / 0.03) = 1694.67 -> rounded to 1695
      expect(result[0].ltv).toBe(Math.round(82 * 0.62 * (1 / 0.03)));
    });

    it('should set startingCustomers from query result length', async () => {
      const mockCustomers = [
        { id: '1', created_at: new Date(), booking_count: 3 },
        { id: '2', created_at: new Date(), booking_count: 7 },
        { id: '3', created_at: new Date(), booking_count: 1 },
      ];
      prisma.$queryRaw.mockResolvedValue(mockCustomers);

      const result = await service.calculateLTVByCohort(1);

      expect(result[0].startingCustomers).toBe(3);
    });

    it('should handle empty query result', async () => {
      prisma.$queryRaw.mockResolvedValue([]);

      const result = await service.calculateLTVByCohort(1);

      expect(result[0].startingCustomers).toBe(0);
      expect(result[0].monthlyRevenue).toBeDefined();
    });

    it('should handle non-array query result gracefully', async () => {
      prisma.$queryRaw.mockResolvedValue(null as unknown as never[]);

      const result = await service.calculateLTVByCohort(1);

      expect(result[0].startingCustomers).toBe(0);
    });

    it('should include ltvCacRatio in each cohort', async () => {
      prisma.$queryRaw.mockResolvedValue([]);

      const result = await service.calculateLTVByCohort(1);

      expect(result[0].ltvCacRatio).toBeDefined();
      expect(result[0].cac).toBe(150);
      // ltvCacRatio = ltv / cac = 1693 / 150 = 11.3
      expect(result[0].ltvCacRatio).toBe(11.3);
    });

    it('should apply churn decay to monthly revenue', async () => {
      const mockCustomers = Array.from({ length: 100 }, (_, i) => ({
        id: String(i),
        created_at: new Date(),
        booking_count: 1,
      }));
      prisma.$queryRaw.mockResolvedValue(mockCustomers);

      const result = await service.calculateLTVByCohort(1);

      // Month 0 should have all customers
      expect(result[0].monthlyRevenue[0].customers).toBe(100);
    });

    it('should format cohortMonth as YYYY-MM', async () => {
      prisma.$queryRaw.mockResolvedValue([]);

      const result = await service.calculateLTVByCohort(1);

      expect(result[0].cohortMonth).toMatch(/^\d{4}-\d{2}$/);
    });
  });

  // ─── calculateLTVByTier ──────────────────────────────────────────

  describe('calculateLTVByTier', () => {
    it('should return LTV for all three tiers', async () => {
      const result = await service.calculateLTVByTier();

      expect(result).toHaveLength(3);
      expect(result.map(t => t.tier)).toEqual(['starter', 'pro', 'enterprise']);
    });

    it('should calculate LTV correctly for each tier', async () => {
      const result = await service.calculateLTVByTier();

      // LTV = arpa * 0.62 * (1 / 0.03)
      const starterLTV = Math.round(49 * 0.62 * (1 / 0.03));
      const proLTV = Math.round(99 * 0.62 * (1 / 0.03));
      const enterpriseLTV = Math.round(299 * 0.62 * (1 / 0.03));

      expect(result[0]).toEqual({ tier: 'starter', arpa: 49, ltv: starterLTV });
      expect(result[1]).toEqual({ tier: 'pro', arpa: 99, ltv: proLTV });
      expect(result[2]).toEqual({ tier: 'enterprise', arpa: 299, ltv: enterpriseLTV });
    });

    it('should have enterprise LTV higher than pro, and pro higher than starter', async () => {
      const result = await service.calculateLTVByTier();

      expect(result[2].ltv).toBeGreaterThan(result[1].ltv);
      expect(result[1].ltv).toBeGreaterThan(result[0].ltv);
    });
  });

  // ─── analyzeChurn ────────────────────────────────────────────────

  describe('analyzeChurn', () => {
    it('should return churn analysis for the specified number of months', async () => {
      prisma.$queryRaw.mockResolvedValue([{ count: BigInt(100) }]);

      const result = await service.analyzeChurn(6);

      expect(result).toHaveLength(6);
    });

    it('should default to 12 months', async () => {
      prisma.$queryRaw.mockResolvedValue([{ count: BigInt(50) }]);

      const result = await service.analyzeChurn();

      expect(result).toHaveLength(12);
    });

    it('should calculate churn rate as 3% of starting customers', async () => {
      prisma.$queryRaw.mockResolvedValue([{ count: BigInt(200) }]);

      const result = await service.analyzeChurn(1);

      expect(result[0].startingCustomers).toBe(200);
      expect(result[0].churnedCustomers).toBe(6); // Math.round(200 * 0.03)
    });

    it('should calculate revenue churn based on avg revenue per customer', async () => {
      prisma.$queryRaw.mockResolvedValue([{ count: BigInt(100) }]);

      const result = await service.analyzeChurn(1);

      const expectedChurned = Math.round(100 * 0.03); // 3
      const expectedRevenueChurn = expectedChurned * 82; // 246

      expect(result[0].revenueChurn).toBe(expectedRevenueChurn);
    });

    it('should include tier breakdown in each period', async () => {
      prisma.$queryRaw.mockResolvedValue([{ count: BigInt(50) }]);

      const result = await service.analyzeChurn(1);

      expect(result[0].byTier).toHaveLength(3);
      expect(result[0].byTier).toEqual([
        { tier: 'starter', churnRate: 4.0 },
        { tier: 'pro', churnRate: 2.5 },
        { tier: 'enterprise', churnRate: 1.5 },
      ]);
    });

    it('should handle zero starting customers', async () => {
      prisma.$queryRaw.mockResolvedValue([{ count: BigInt(0) }]);

      const result = await service.analyzeChurn(1);

      expect(result[0].startingCustomers).toBe(0);
      expect(result[0].churnedCustomers).toBe(0);
      expect(result[0].churnRate).toBe(0);
      expect(result[0].revenueChurnRate).toBe(0);
    });

    it('should handle empty query result', async () => {
      prisma.$queryRaw.mockResolvedValue([]);

      const result = await service.analyzeChurn(1);

      expect(result[0].startingCustomers).toBe(0);
    });

    it('should format period as YYYY-MM', async () => {
      prisma.$queryRaw.mockResolvedValue([{ count: BigInt(10) }]);

      const result = await service.analyzeChurn(1);

      expect(result[0].period).toMatch(/^\d{4}-\d{2}$/);
    });
  });

  // ─── calculateGrossMarginBySegment ───────────────────────────────

  describe('calculateGrossMarginBySegment', () => {
    const startDate = new Date('2026-01-01');
    const endDate = new Date('2026-03-01');

    it('should return gross margin for all three segments', async () => {
      prisma.$queryRaw.mockResolvedValue([]);

      const result = await service.calculateGrossMarginBySegment(startDate, endDate);

      expect(result).toHaveLength(3);
      expect(result.map(s => s.segment)).toEqual(['starter', 'pro', 'enterprise']);
    });

    it('should use tier counts from database when available', async () => {
      prisma.$queryRaw.mockResolvedValue([
        { subscription_tier: 'starter', count: BigInt(10) },
        { subscription_tier: 'pro', count: BigInt(20) },
        { subscription_tier: 'enterprise', count: BigInt(3) },
      ]);

      const result = await service.calculateGrossMarginBySegment(startDate, endDate);

      // starter: revenue = 10 * 49 = 490
      expect(result[0].revenue).toBe(10 * 49);
      // pro: revenue = 20 * 99 = 1980
      expect(result[1].revenue).toBe(20 * 99);
      // enterprise: revenue = 3 * 299 = 897
      expect(result[2].revenue).toBe(3 * 299);
    });

    it('should use default counts when database query fails', async () => {
      prisma.$queryRaw.mockRejectedValue(new Error('DB error'));

      const result = await service.calculateGrossMarginBySegment(startDate, endDate);

      // Default counts: starter=40, pro=25, enterprise=5
      expect(result[0].revenue).toBe(40 * 49);
      expect(result[1].revenue).toBe(25 * 99);
      expect(result[2].revenue).toBe(5 * 299);
    });

    it('should calculate gross margin correctly', async () => {
      prisma.$queryRaw.mockResolvedValue([]);

      const result = await service.calculateGrossMarginBySegment(startDate, endDate);

      result.forEach(segment => {
        expect(segment.grossMargin).toBe(segment.revenue - segment.cogs);
        const expectedPercentage =
          segment.revenue > 0
            ? Number((((segment.revenue - segment.cogs) / segment.revenue) * 100).toFixed(1))
            : 0;
        expect(segment.grossMarginPercentage).toBe(expectedPercentage);
      });
    });

    it('should use STANDARD_COGS (30.38) for cost calculation', async () => {
      prisma.$queryRaw.mockResolvedValue([{ subscription_tier: 'starter', count: BigInt(1) }]);

      const result = await service.calculateGrossMarginBySegment(startDate, endDate);

      // starter: cogs = 1 * 30.38 = 30.38 (only 1 shop from DB, others use defaults)
      expect(result[0].cogs).toBeCloseTo(1 * 30.38, 2);
    });
  });

  // ─── calculatePaybackPeriod ──────────────────────────────────────

  describe('calculatePaybackPeriod', () => {
    it('should calculate payback period correctly', () => {
      // Payback = CAC / (ARPA * grossMargin) = 150 / (82 * 0.62) = 2.95 -> 3.0
      const result = service.calculatePaybackPeriod(150, 82, 0.62);
      expect(result).toBe(3.0);
    });

    it('should return 0 when monthly contribution is 0', () => {
      expect(service.calculatePaybackPeriod(150, 0, 0.62)).toBe(0);
      expect(service.calculatePaybackPeriod(150, 82, 0)).toBe(0);
    });

    it('should return 0 when arpa and gross margin are both 0', () => {
      expect(service.calculatePaybackPeriod(100, 0, 0)).toBe(0);
    });

    it('should handle very high CAC', () => {
      const result = service.calculatePaybackPeriod(10000, 82, 0.62);
      expect(result).toBeGreaterThan(100);
    });

    it('should handle zero CAC', () => {
      const result = service.calculatePaybackPeriod(0, 82, 0.62);
      expect(result).toBe(0);
    });
  });

  // ─── generateReport ─────────────────────────────────────────────

  describe('generateReport', () => {
    const startDate = new Date('2026-01-01');
    const endDate = new Date('2026-03-01');

    beforeEach(() => {
      prisma.$queryRaw.mockResolvedValue([]);
    });

    it('should return a complete UnitEconomicsReport', async () => {
      const report = await service.generateReport(startDate, endDate);

      expect(report.generatedAt).toBeInstanceOf(Date);
      expect(report.isSampleData).toBe(true);
      expect(report.period.start).toEqual(startDate);
      expect(report.period.end).toEqual(endDate);
      expect(report.cac).toBeDefined();
      expect(report.cac.blended).toBeGreaterThan(0);
      expect(report.cac.byChannel).toHaveLength(6);
      expect(report.ltv).toBeDefined();
      expect(report.ltv.byCohort).toHaveLength(12);
      expect(report.ltv.byTier).toHaveLength(3);
      expect(report.churn).toHaveLength(12);
      expect(report.grossMargin).toBeDefined();
      expect(report.grossMargin.bySegment).toHaveLength(3);
      expect(report.paybackPeriod).toBeGreaterThan(0);
      expect(report.arpa).toBe(82);
    });

    it('should calculate blended LTV as average of cohort LTVs', async () => {
      const report = await service.generateReport(startDate, endDate);

      // All cohorts have the same LTV, so blended = same value
      expect(report.ltv.blended).toBe(Math.round(82 * 0.62 * (1 / 0.03)));
    });

    it('should calculate ltvCacRatio correctly', async () => {
      const report = await service.generateReport(startDate, endDate);

      const expectedRatio = Number((report.ltv.blended / report.cac.blended).toFixed(1));
      expect(report.ltvCacRatio).toBe(expectedRatio);
    });

    it('should calculate overall gross margin from segments', async () => {
      const report = await service.generateReport(startDate, endDate);

      expect(report.grossMargin.overall).toBeGreaterThan(0);
      expect(report.grossMargin.overall).toBeLessThan(100);
    });
  });

  // ─── exportInvestorMetrics ───────────────────────────────────────

  describe('exportInvestorMetrics', () => {
    const startDate = new Date('2026-01-01');
    const endDate = new Date('2026-03-01');

    it('should return all investor metrics', async () => {
      prisma.$queryRaw.mockResolvedValue([{ count: BigInt(100) }]);

      const result = await service.exportInvestorMetrics(startDate, endDate);

      expect(result).toEqual(
        expect.objectContaining({
          arr: expect.any(Number),
          mrr: expect.any(Number),
          customers: expect.any(Number),
          netDollarRetention: expect.any(Number),
          grossDollarRetention: expect.any(Number),
          magicNumber: expect.any(Number),
          ruleOf40: expect.any(Number),
        }),
      );
    });

    it('should calculate MRR as customerCount * 82', async () => {
      prisma.$queryRaw.mockResolvedValue([{ count: BigInt(50) }]);

      const result = await service.exportInvestorMetrics(startDate, endDate);

      expect(result.customers).toBe(50);
      expect(result.mrr).toBe(50 * 82); // 4100
      expect(result.arr).toBe(50 * 82 * 12); // 49200
    });

    it('should handle zero customers', async () => {
      prisma.$queryRaw.mockResolvedValue([{ count: BigInt(0) }]);

      const result = await service.exportInvestorMetrics(startDate, endDate);

      expect(result.customers).toBe(0);
      expect(result.mrr).toBe(0);
      expect(result.arr).toBe(0);
    });

    it('should handle empty query result', async () => {
      prisma.$queryRaw.mockResolvedValue([]);

      const result = await service.exportInvestorMetrics(startDate, endDate);

      expect(result.customers).toBe(0);
      expect(result.mrr).toBe(0);
    });

    it('should return fixed retention metrics', async () => {
      prisma.$queryRaw.mockResolvedValue([{ count: BigInt(10) }]);

      const result = await service.exportInvestorMetrics(startDate, endDate);

      expect(result.netDollarRetention).toBe(102.4);
      expect(result.grossDollarRetention).toBe(97.0);
    });

    it('should calculate rule of 40 as growthRate + ebitdaMargin', async () => {
      prisma.$queryRaw.mockResolvedValue([{ count: BigInt(10) }]);

      const result = await service.exportInvestorMetrics(startDate, endDate);

      // growthRate (150) + ebitdaMargin (-100) = 50
      expect(result.ruleOf40).toBe(50);
    });

    it('should calculate magic number correctly', async () => {
      prisma.$queryRaw.mockResolvedValue([{ count: BigInt(100) }]);

      const result = await service.exportInvestorMetrics(startDate, endDate);

      const mrr = 100 * 82;
      const arr = mrr * 12;
      const netNewARR = arr * 0.15;
      const expectedMagicNumber = Number(((netNewARR * 12) / 15000).toFixed(2));

      expect(result.magicNumber).toBe(expectedMagicNumber);
    });
  });
});
