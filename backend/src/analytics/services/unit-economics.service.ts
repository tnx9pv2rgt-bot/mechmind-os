import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@common/services/prisma.service';
import { LoggerService } from '@common/services/logger.service';

export interface CACBreakdown {
  channel: string;
  spend: number;
  newCustomers: number;
  cac: number;
  percentageOfTotal: number;
}

export interface CohortLTV {
  cohortMonth: string;
  startingCustomers: number;
  monthlyRevenue: { month: number; revenue: number; customers: number }[];
  ltv: number;
  cac: number;
  ltvCacRatio: number;
}

export interface ChurnAnalysis {
  period: string;
  startingCustomers: number;
  churnedCustomers: number;
  churnRate: number;
  revenueChurn: number;
  revenueChurnRate: number;
  byTier: { tier: string; churnRate: number }[];
}

export interface GrossMarginBySegment {
  segment: string;
  revenue: number;
  cogs: number;
  grossMargin: number;
  grossMarginPercentage: number;
}

export interface UnitEconomicsReport {
  generatedAt: Date;
  isSampleData: boolean;
  period: { start: Date; end: Date };
  cac: {
    blended: number;
    byChannel: CACBreakdown[];
  };
  ltv: {
    blended: number;
    byCohort: CohortLTV[];
    byTier: { tier: string; ltv: number; arpa: number }[];
  };
  churn: ChurnAnalysis[];
  grossMargin: {
    overall: number;
    bySegment: GrossMarginBySegment[];
  };
  paybackPeriod: number;
  ltvCacRatio: number;
  arpa: number;
}

@Injectable()
export class UnitEconomicsService {
  private readonly logger = new Logger(UnitEconomicsService.name);

  // Standard COGS per shop for quick calculations (must match controller default)
  private readonly STANDARD_COGS = 34.34; // € per shop per month

  constructor(
    private readonly prisma: PrismaService,
    private readonly loggerService: LoggerService,
  ) {}

  /**
   * Calculate CAC (Customer Acquisition Cost) per channel
   *
   * Formula: CAC = Total Sales & Marketing Spend / Number of New Customers
   *
   * // TODO: Replace mock data with real marketing_spend table queries
   */
  async calculateCAC(
    startDate: Date,
    endDate: Date,
  ): Promise<{ blended: number; byChannel: CACBreakdown[] }> {
    this.logger.debug(`Calculating CAC from ${startDate} to ${endDate}`);

    // In production, this would pull from a marketing_spend table
    // For now, using mock data structure with realistic defaults
    const channelData: CACBreakdown[] = [
      {
        channel: 'organic_seo',
        spend: 4000,
        newCustomers: 100,
        cac: 40,
        percentageOfTotal: 25,
      },
      {
        channel: 'paid_search',
        spend: 8000,
        newCustomers: 40,
        cac: 200,
        percentageOfTotal: 20,
      },
      {
        channel: 'social_ads',
        spend: 5400,
        newCustomers: 30,
        cac: 180,
        percentageOfTotal: 15,
      },
      {
        channel: 'partner_referrals',
        spend: 3000,
        newCustomers: 30,
        cac: 100,
        percentageOfTotal: 20,
      },
      {
        channel: 'events_trade_shows',
        spend: 6000,
        newCustomers: 15,
        cac: 400,
        percentageOfTotal: 10,
      },
      {
        channel: 'outbound_sales',
        spend: 4500,
        newCustomers: 15,
        cac: 300,
        percentageOfTotal: 10,
      },
    ];

    const totalSpend = channelData.reduce((sum, c) => sum + c.spend, 0);
    const totalNewCustomers = channelData.reduce((sum, c) => sum + c.newCustomers, 0);
    const blendedCAC = totalNewCustomers > 0 ? totalSpend / totalNewCustomers : 0;

    return {
      blended: Math.round(blendedCAC),
      byChannel: channelData,
    };
  }

  /**
   * Track LTV (Lifetime Value) by cohort
   *
   * Formula: LTV = ARPA × Gross Margin × (1 / Monthly Churn Rate)
   */
  async calculateLTVByCohort(months: number = 12): Promise<CohortLTV[]> {
    this.logger.debug(`Calculating LTV for last ${months} cohorts`);

    const cohorts: CohortLTV[] = [];
    const now = new Date();

    for (let i = 0; i < months; i++) {
      const cohortDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const cohortMonth = cohortDate.toISOString().slice(0, 7); // YYYY-MM

      // Get customers who signed up in this cohort using raw query
      const customers = await this.prisma.$queryRaw`
        SELECT 
          t.id,
          t.created_at,
          (SELECT COUNT(*) FROM bookings b WHERE b.tenant_id = t.id) as booking_count
        FROM tenants t
        WHERE DATE_TRUNC('month', t.created_at) = DATE_TRUNC('month', ${cohortDate}::timestamp)
      `;

      const customerCount = Array.isArray(customers) ? customers.length : 0;

      // Calculate monthly revenue for this cohort over time
      const monthlyRevenue: { month: number; revenue: number; customers: number }[] = [];

      for (let m = 0; m <= Math.min(i, 24); m++) {
        // Simulate revenue tracking with churn applied
        const activeCustomers = Math.round(customerCount * Math.pow(0.97, m));
        const avgRevenue = activeCustomers * 82; // €82 ARPA
        monthlyRevenue.push({
          month: m,
          revenue: avgRevenue,
          customers: activeCustomers,
        });
      }

      // Calculate LTV using formula: ARPA × Gross Margin × (1 / Churn)
      const arpa = 82;
      const grossMargin = 0.62;
      const monthlyChurn = 0.03;
      const ltv = arpa * grossMargin * (1 / monthlyChurn);

      // CAC from the acquisition month
      const cac = 150; // Year 1 average

      cohorts.push({
        cohortMonth,
        startingCustomers: customerCount,
        monthlyRevenue,
        ltv: Math.round(ltv),
        cac,
        ltvCacRatio: Number((ltv / cac).toFixed(1)),
      });
    }

    return cohorts;
  }

  /**
   * Calculate LTV by pricing tier
   */
  async calculateLTVByTier(): Promise<{ tier: string; ltv: number; arpa: number }[]> {
    const tiers = [
      { name: 'starter', arpa: 49 },
      { name: 'pro', arpa: 99 },
      { name: 'enterprise', arpa: 299 },
    ];

    // TODO: Calculate from actual data
    const grossMargin = 0.62;
    const monthlyChurn = 0.03;

    return tiers.map(tier => ({
      tier: tier.name,
      arpa: tier.arpa,
      ltv: Math.round(tier.arpa * grossMargin * (1 / monthlyChurn)),
    }));
  }

  /**
   * Analyze churn rate over time
   */
  async analyzeChurn(months: number = 12): Promise<ChurnAnalysis[]> {
    this.logger.debug(`Analyzing churn for last ${months} months`);

    const analyses: ChurnAnalysis[] = [];
    const now = new Date();

    for (let i = 0; i < months; i++) {
      const periodStart = new Date(now.getFullYear(), now.getMonth() - i - 1, 1);
      const periodEnd = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const periodLabel = periodStart.toISOString().slice(0, 7);

      // Query active customers at start of period using raw query
      const startingCustomersResult = await this.prisma.$queryRaw`
        SELECT COUNT(*) as count
        FROM tenants
        WHERE created_at < ${periodEnd}
      `;
      const startingCustomers =
        Array.isArray(startingCustomersResult) && startingCustomersResult[0]
          ? Number(startingCustomersResult[0].count)
          : 0;

      // Query customers who churned (became inactive) during period
      // In production, this would track deactivations specifically
      const churnedCustomers = Math.round(startingCustomers * 0.03); // 3% monthly churn

      const churnRate = startingCustomers > 0 ? churnedCustomers / startingCustomers : 0;

      // Calculate revenue churn
      const avgRevenuePerCustomer = 82;
      const revenueChurn = churnedCustomers * avgRevenuePerCustomer;
      const totalRevenue = startingCustomers * avgRevenuePerCustomer;
      const revenueChurnRate = totalRevenue > 0 ? revenueChurn / totalRevenue : 0;

      analyses.push({
        period: periodLabel,
        startingCustomers,
        churnedCustomers,
        churnRate: Number((churnRate * 100).toFixed(2)),
        revenueChurn,
        revenueChurnRate: Number((revenueChurnRate * 100).toFixed(2)),
        byTier: [
          { tier: 'starter', churnRate: 4.0 },
          { tier: 'pro', churnRate: 2.5 },
          { tier: 'enterprise', churnRate: 1.5 },
        ],
      });
    }

    return analyses;
  }

  /**
   * Calculate gross margin by customer segment
   */
  async calculateGrossMarginBySegment(
    _startDate: Date,
    _endDate: Date,
  ): Promise<GrossMarginBySegment[]> {
    this.logger.debug(`Calculating gross margin by segment`);

    // In production, this would aggregate actual revenue and COGS data
    // Query tenants by subscription tier to get actual counts
    let starterCount = 40;
    let proCount = 25;
    let enterpriseCount = 5;

    try {
      const tierCounts = await this.prisma.$queryRaw`
        SELECT 
          subscription_tier,
          COUNT(*) as count
        FROM tenants
        GROUP BY subscription_tier
      `;

      if (Array.isArray(tierCounts)) {
        tierCounts.forEach((t: Record<string, unknown>) => {
          if (t.subscription_tier === 'starter') starterCount = Number(t.count);
          if (t.subscription_tier === 'pro') proCount = Number(t.count);
          if (t.subscription_tier === 'enterprise') enterpriseCount = Number(t.count);
        });
      }
    } catch (error) {
      this.logger.warn('Could not query tier counts, using defaults', error);
    }

    const segments = [
      { name: 'starter', avgShops: starterCount, arpa: 49 },
      { name: 'pro', avgShops: proCount, arpa: 99 },
      { name: 'enterprise', avgShops: enterpriseCount, arpa: 299 },
    ];

    return segments.map(segment => {
      const revenue = segment.avgShops * segment.arpa;
      const cogs = segment.avgShops * this.STANDARD_COGS;
      const grossMargin = revenue - cogs;
      const grossMarginPercentage = revenue > 0 ? (grossMargin / revenue) * 100 : 0;

      return {
        segment: segment.name,
        revenue,
        cogs,
        grossMargin,
        grossMarginPercentage: Number(grossMarginPercentage.toFixed(1)),
      };
    });
  }

  /**
   * Calculate payback period for CAC
   *
   * Formula: Payback Period = CAC / (ARPA × Gross Margin)
   */
  calculatePaybackPeriod(cac: number, arpa: number, grossMargin: number): number {
    const monthlyContribution = arpa * grossMargin;
    return monthlyContribution > 0 ? Number((cac / monthlyContribution).toFixed(1)) : 0;
  }

  /**
   * Generate comprehensive unit economics report
   */
  async generateReport(startDate: Date, endDate: Date): Promise<UnitEconomicsReport> {
    this.logger.warn(
      'UnitEconomicsReport: using sample data. Real calculations require marketing_spend and revenue tables.',
    );

    const [cac, ltvByCohort, ltvByTier, churn, grossMarginBySegment] = await Promise.all([
      this.calculateCAC(startDate, endDate),
      this.calculateLTVByCohort(12),
      this.calculateLTVByTier(),
      this.analyzeChurn(12),
      this.calculateGrossMarginBySegment(startDate, endDate),
    ]);

    // Calculate blended LTV
    const blendedLTV =
      ltvByCohort.length > 0
        ? ltvByCohort.reduce((sum, c) => sum + c.ltv, 0) / ltvByCohort.length
        : 0;

    // Calculate overall gross margin
    const totalRevenue = grossMarginBySegment.reduce((sum, s) => sum + s.revenue, 0);
    const totalCOGS = grossMarginBySegment.reduce((sum, s) => sum + s.cogs, 0);
    const overallGrossMargin =
      totalRevenue > 0 ? ((totalRevenue - totalCOGS) / totalRevenue) * 100 : 0;

    // Calculate ARPA
    const arpa = 82; // Target blended ARPA

    // Calculate payback period
    const paybackPeriod = this.calculatePaybackPeriod(cac.blended, arpa, 0.62);

    return {
      generatedAt: new Date(),
      isSampleData: true,
      period: { start: startDate, end: endDate },
      cac,
      ltv: {
        blended: Math.round(blendedLTV),
        byCohort: ltvByCohort,
        byTier: ltvByTier,
      },
      churn,
      grossMargin: {
        overall: Number(overallGrossMargin.toFixed(1)),
        bySegment: grossMarginBySegment,
      },
      paybackPeriod,
      ltvCacRatio: cac.blended > 0 ? Number((blendedLTV / cac.blended).toFixed(1)) : 0,
      arpa,
    };
  }

  /**
   * Export metrics for investor reporting
   */
  async exportInvestorMetrics(
    _startDate: Date,
    _endDate: Date,
  ): Promise<{
    arr: number;
    mrr: number;
    customers: number;
    netDollarRetention: number;
    grossDollarRetention: number;
    magicNumber: number;
    ruleOf40: number;
  }> {
    // Calculate MRR using raw query to count tenants
    const customerResult = await this.prisma.$queryRaw`
      SELECT COUNT(*) as count FROM tenants
    `;
    const customerCount =
      Array.isArray(customerResult) && customerResult[0] ? Number(customerResult[0].count) : 0;

    const mrr = customerCount * 82; // Blended ARPA
    const arr = mrr * 12;

    // TODO: Calculate from actual data
    const netDollarRetention = 102.4;
    const grossDollarRetention = 97.0;

    // Magic number calculation
    const netNewARR = arr * 0.15; // 15% monthly growth
    const salesAndMarketingSpend = 15000;
    const magicNumber = salesAndMarketingSpend > 0 ? (netNewARR * 12) / salesAndMarketingSpend : 0;

    // Rule of 40
    const growthRate = 150; // 150% ARR growth
    const ebitdaMargin = -100; // -100% (burning)
    const ruleOf40 = growthRate + ebitdaMargin;

    return {
      arr,
      mrr,
      customers: customerCount,
      netDollarRetention,
      grossDollarRetention,
      magicNumber: Number(magicNumber.toFixed(2)),
      ruleOf40,
    };
  }
}
