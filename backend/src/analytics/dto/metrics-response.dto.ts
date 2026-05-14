import { ApiProperty } from '@nestjs/swagger';

export class CACResponseDto {
  @ApiProperty()
  blended!: number;

  @ApiProperty()
  byChannel!: Array<{
    channel: string;
    spend: number;
    newCustomers: number;
    cac: number;
    percentageOfTotal: number;
  }>;
}

export class LTVResponseDto {
  @ApiProperty()
  blended!: number;

  @ApiProperty()
  byTier!: Array<{
    tier: string;
    ltv: number;
    arpa: number;
  }>;

  @ApiProperty()
  calculation!: {
    formula: string;
    arpa: number;
    grossMargin: number;
    monthlyChurn: number;
  };
}

export class ChurnResponseDto {
  @ApiProperty()
  overall!: {
    monthlyChurn: number;
    annualChurn: number;
    customerLifetime: number;
  };

  @ApiProperty()
  byPeriod!: Array<{
    period: string;
    startingCustomers: number;
    churnedCustomers: number;
    churnRate: number;
    revenueChurn: number;
    revenueChurnRate: number;
    byTier: Array<{ tier: string; churnRate: number }>;
  }>;
}

export class GrossMarginResponseDto {
  @ApiProperty()
  overall!: number;

  @ApiProperty()
  bySegment!: Array<{
    segment: string;
    revenue: number;
    cogs: number;
    grossMargin: number;
    grossMarginPercentage: number;
  }>;

  @ApiProperty()
  calculation!: {
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

export class BreakEvenResponseDto {
  @ApiProperty()
  breakEvenShops!: number;

  @ApiProperty()
  currentShops!: number;

  @ApiProperty()
  monthsToBreakEven!: number;

  @ApiProperty()
  assumptions!: {
    fixedCosts: number;
    arpa: number;
    cogsPerShop: number;
    monthlyGrowthRate: number;
  };

  @ApiProperty()
  monthlyProjections!: Array<{
    month: number;
    shops: number;
    revenue: number;
    cogs: number;
    grossProfit: number;
    fixedCosts: number;
    netProfit: number;
  }>;
}
