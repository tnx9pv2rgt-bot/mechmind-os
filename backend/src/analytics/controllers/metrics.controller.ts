import {
  Controller,
  Get,
  Query,
  UseGuards,
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { UnitEconomicsService } from '../services/unit-economics.service';
import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';
  import { RolesGuard } from '@auth/guards/roles.guard';
import { AdminOnly } from '@auth/decorators/roles.decorator';
import { PrismaService } from '@common/services/prisma.service';

/**
 * DTOs for API responses
 */
class CACResponseDto {
  blended: number;
  byChannel: {
    channel: string;
    spend: number;
    newCustomers: number;
    cac: number;
    percentageOfTotal: number;
  }[];
}

class LTVResponseDto {
  blended: number;
  byTier: {
    tier: string;
    ltv: number;
    arpa: number;
  }[];
  calculation: {
    formula: string;
    arpa: number;
    grossMargin: number;
    monthlyChurn: number;
  };
}

class ChurnResponseDto {
  overall: {
    monthlyChurn: number;
    annualChurn: number;
    customerLifetime: number;
  };
  byPeriod: {
    period: string;
    startingCustomers: number;
    churnedCustomers: number;
    churnRate: number;
    revenueChurn: number;
    revenueChurnRate: number;
    byTier: { tier: string; churnRate: number }[];
  }[];
}

class GrossMarginResponseDto {
  overall: number;
  bySegment: {
    segment: string;
    revenue: number;
    cogs: number;
    grossMargin: number;
    grossMarginPercentage: number;
  }[];
  calculation: {
    revenue: string;
    cogsBreakdown: {
      infrastructure: number;
      voiceAI: number;
      telephony: number;
      paymentProcessing: number;
      support: number;
    };
  };
}

class BreakEvenResponseDto {
  breakEvenShops: number;
  currentShops: number;
  monthsToBreakEven: number;
  assumptions: {
    fixedCosts: number;
    arpa: number;
    cogsPerShop: number;
    monthlyGrowthRate: number;
  };
  monthlyProjections: {
    month: number;
    shops: number;
    revenue: number;
    cogs: number;
    grossProfit: number;
    fixedCosts: number;
    netProfit: number;
  }[];
}

@ApiTags('Analytics - Unit Economics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('analytics')
export class MetricsController {
  constructor(
    private readonly unitEconomicsService: UnitEconomicsService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * GET /analytics/cac
   * Customer Acquisition Cost by channel
   */
  @Get('cac')
  @AdminOnly()
  @ApiOperation({
    summary: 'Get Customer Acquisition Cost (CAC)',
    description: `Returns blended CAC and breakdown by acquisition channel.
    
Formula: CAC = Sales & Marketing Spend / New Customers Acquired

Benchmark: <€150 for Year 1, <€80 for Year 2`,
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    description: 'Start date for analysis (default: 30 days ago)',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    description: 'End date for analysis (default: today)',
  })
  @ApiResponse({
    status: 200,
    description: 'CAC metrics retrieved successfully',
    type: CACResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  async getCAC(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<{ success: boolean; data: CACResponseDto }> {
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();
    
    const cac = await this.unitEconomicsService.calculateCAC(start, end);

    return {
      success: true,
      data: {
        blended: cac.blended,
        byChannel: cac.byChannel,
      },
    };
  }

  /**
   * GET /analytics/ltv
   * Lifetime Value metrics
   */
  @Get('ltv')
  @AdminOnly()
  @ApiOperation({
    summary: 'Get Lifetime Value (LTV)',
    description: `Returns LTV calculations by tier and overall.
    
Formula: LTV = ARPA × Gross Margin × (1 / Monthly Churn Rate)

Example: €82 × 0.62 × (1 / 0.03) = €2,187

Target: LTV/CAC > 3:1`,
  })
  @ApiResponse({
    status: 200,
    description: 'LTV metrics retrieved successfully',
    type: LTVResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  async getLTV(): Promise<{ success: boolean; data: LTVResponseDto }> {
    const ltvByTier = await this.unitEconomicsService.calculateLTVByTier();

    // Calculate blended LTV
    const blendedLTV = ltvByTier.reduce((sum, t) => sum + t.ltv, 0) / ltvByTier.length;

    return {
      success: true,
      data: {
        blended: Math.round(blendedLTV),
        byTier: ltvByTier,
        calculation: {
          formula: 'LTV = ARPA × Gross Margin × (1 / Monthly Churn Rate)',
          arpa: 82,
          grossMargin: 0.62,
          monthlyChurn: 0.03,
        },
      },
    };
  }

  /**
   * GET /analytics/churn
   * Churn rate analysis
   */
  @Get('churn')
  @AdminOnly()
  @ApiOperation({
    summary: 'Get churn rate analysis',
    description: `Returns monthly churn rates and revenue churn.
    
Formula: Churn Rate = Churned Customers / Starting Customers

Target: <3% monthly churn
Impact: Every 1% reduction increases LTV by ~€700`,
  })
  @ApiQuery({
    name: 'months',
    required: false,
    description: 'Number of months to analyze (default: 12)',
  })
  @ApiResponse({
    status: 200,
    description: 'Churn analysis retrieved successfully',
    type: ChurnResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  async getChurn(
    @Query('months', new DefaultValuePipe(12), ParseIntPipe) months: number,
  ): Promise<{ success: boolean; data: ChurnResponseDto }> {
    const churnAnalysis = await this.unitEconomicsService.analyzeChurn(months);

    // Calculate overall stats from latest period
    const latest = churnAnalysis[0];
    const monthlyChurn = latest?.churnRate || 3;
    const annualChurn = 1 - Math.pow(1 - monthlyChurn / 100, 12);
    const customerLifetime = monthlyChurn > 0 ? Math.round(1 / (monthlyChurn / 100)) : 0;

    return {
      success: true,
      data: {
        overall: {
          monthlyChurn,
          annualChurn: Number((annualChurn * 100).toFixed(1)),
          customerLifetime,
        },
        byPeriod: churnAnalysis,
      },
    };
  }

  /**
   * GET /analytics/gross-margin
   * Gross margin analysis
   */
  @Get('gross-margin')
  @AdminOnly()
  @ApiOperation({
    summary: 'Get gross margin analysis',
    description: `Returns gross margin by customer segment.
    
Formula: Gross Margin = (Revenue - COGS) / Revenue

COGS Components:
- AWS Infrastructure: €8/shop
- Voice AI (Vapi): €16/shop
- Telephony (Twilio): €2.66/shop
- Payment Processing: €2.68/shop
- Support (L1): €5/shop

Target: 62% Year 1 → 80% at scale`,
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'Gross margin retrieved successfully',
    type: GrossMarginResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  async getGrossMargin(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<{ success: boolean; data: GrossMarginResponseDto }> {
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();
    
    const segments = await this.unitEconomicsService.calculateGrossMarginBySegment(
      start,
      end,
    );

    const overall = segments.length > 0
      ? segments.reduce((sum, s) => sum + s.revenue, 0) > 0
        ? ((segments.reduce((sum, s) => sum + s.revenue, 0) - segments.reduce((sum, s) => sum + s.cogs, 0)) /
            segments.reduce((sum, s) => sum + s.revenue, 0)) * 100
        : 0
      : 0;

    return {
      success: true,
      data: {
        overall: Number(overall.toFixed(1)),
        bySegment: segments,
        calculation: {
          revenue: 'Monthly subscription fees by tier',
          cogsBreakdown: {
            infrastructure: 8.0,
            voiceAI: 16.0,
            telephony: 2.66,
            paymentProcessing: 2.68,
            support: 5.0,
          },
        },
      },
    };
  }

  /**
   * GET /analytics/break-even
   * Break-even analysis
   */
  @Get('break-even')
  @AdminOnly()
  @ApiOperation({
    summary: 'Get break-even analysis',
    description: `Returns break-even calculation and projections.
    
Formula: Break-even Shops = Fixed Costs / (ARPA - COGS per shop)

Example: €14,300 / (€82 - €30.62) = 278 shops

Target: Break-even at 100 shops (requires cost optimization)`,
  })
  @ApiResponse({
    status: 200,
    description: 'Break-even analysis retrieved successfully',
    type: BreakEvenResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  async getBreakEven(): Promise<{ success: boolean; data: BreakEvenResponseDto }> {
    // Business parameters
    const fixedCosts = 14300; // Monthly fixed costs
    const arpa = 82;
    const cogsPerShop = 34.34;
    const monthlyGrowthRate = 0.15; // 15% monthly growth

    // Calculate break-even point
    const contributionMargin = arpa - cogsPerShop;
    const breakEvenShops = Math.ceil(fixedCosts / contributionMargin);

    // Get current shop count using raw query
    const tenantResult = await this.prisma.$queryRaw`
      SELECT COUNT(*) as count FROM tenants
    `;
    const currentShops = Array.isArray(tenantResult) && tenantResult[0] 
      ? Number(tenantResult[0].count) 
      : 0;

    // Calculate months to break-even
    const monthsToBreakEven = currentShops >= breakEvenShops 
      ? 0 
      : Math.ceil(
          Math.log(breakEvenShops / Math.max(currentShops, 1)) / Math.log(1 + monthlyGrowthRate)
        );

    // Generate projections
    const projections = [];
    let projectedShops = currentShops;

    for (let month = 0; month <= Math.max(monthsToBreakEven + 6, 24); month++) {
      const revenue = projectedShops * arpa;
      const cogs = projectedShops * cogsPerShop;
      const grossProfit = revenue - cogs;
      const netProfit = grossProfit - fixedCosts;

      projections.push({
        month,
        shops: Math.round(projectedShops),
        revenue: Math.round(revenue),
        cogs: Math.round(cogs),
        grossProfit: Math.round(grossProfit),
        fixedCosts,
        netProfit: Math.round(netProfit),
      });

      projectedShops = projectedShops * (1 + monthlyGrowthRate);
    }

    return {
      success: true,
      data: {
        breakEvenShops,
        currentShops,
        monthsToBreakEven,
        assumptions: {
          fixedCosts,
          arpa,
          cogsPerShop,
          monthlyGrowthRate,
        },
        monthlyProjections: projections,
      },
    };
  }

  /**
   * GET /analytics/ltv-cac-ratio
   * Combined LTV/CAC ratio
   */
  @Get('ltv-cac-ratio')
  @AdminOnly()
  @ApiOperation({
    summary: 'Get LTV/CAC ratio',
    description: `Returns the critical LTV/CAC ratio.
    
Formula: LTV/CAC = Lifetime Value / Customer Acquisition Cost

Current: 14.6:1 (Excellent)
Target: >3:1
Warning: <3:1 requires immediate attention`,
  })
  @ApiResponse({ status: 200, description: 'LTV/CAC ratio retrieved' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  async getLTVCACRatio(): Promise<{ 
    success: boolean; 
    data: { 
      ratio: number; 
      ltv: number; 
      cac: number;
      status: 'excellent' | 'good' | 'warning' | 'critical';
    } 
  }> {
    const cac = await this.unitEconomicsService.calculateCAC(
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      new Date(),
    );
    const ltvByTier = await this.unitEconomicsService.calculateLTVByTier();
    const blendedLTV = ltvByTier.reduce((sum, t) => sum + t.ltv, 0) / ltvByTier.length;
    
    const ratio = cac.blended > 0 ? blendedLTV / cac.blended : 0;
    
    let status: 'excellent' | 'good' | 'warning' | 'critical';
    if (ratio >= 5) status = 'excellent';
    else if (ratio >= 3) status = 'good';
    else if (ratio >= 1.5) status = 'warning';
    else status = 'critical';

    return {
      success: true,
      data: {
        ratio: Number(ratio.toFixed(1)),
        ltv: Math.round(blendedLTV),
        cac: cac.blended,
        status,
      },
    };
  }

  /**
   * GET /analytics/payback-period
   * CAC payback period
   */
  @Get('payback-period')
  @AdminOnly()
  @ApiOperation({
    summary: 'Get CAC payback period',
    description: `Returns the time to recover CAC.
    
Formula: Payback Period = CAC / (ARPA × Gross Margin)

Example: €150 / (€82 × 0.62) = 2.3 months

Target: <12 months
Excellent: <6 months`,
  })
  @ApiResponse({ status: 200, description: 'Payback period retrieved' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  async getPaybackPeriod(): Promise<{ 
    success: boolean; 
    data: { 
      months: number;
      days: number;
      cac: number;
      monthlyContribution: number;
    } 
  }> {
    const cac = await this.unitEconomicsService.calculateCAC(
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      new Date(),
    );
    
    const arpa = 82;
    const grossMargin = 0.62;
    const monthlyContribution = arpa * grossMargin;
    const months = monthlyContribution > 0 ? cac.blended / monthlyContribution : 0;

    return {
      success: true,
      data: {
        months: Number(months.toFixed(1)),
        days: Math.round(months * 30),
        cac: cac.blended,
        monthlyContribution: Number(monthlyContribution.toFixed(2)),
      },
    };
  }
}
