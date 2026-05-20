/**
 * MechMind OS - Benchmarking Controller
 *
 * Endpoint per confronto metriche officina con settore.
 */

import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  BenchmarkingService,
  ShopMetric,
  ShopBenchmark,
  ShopRanking,
} from './benchmarking.service';
import { BenchmarkPeriodQueryDto } from './dto/benchmark-query.dto';

@ApiTags('Benchmarking - Confronto Settore')
@Controller('benchmarking')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class BenchmarkingController {
  constructor(private readonly benchmarkingService: BenchmarkingService) {}

  @Get('metrics')
  @ApiOperation({ summary: 'Calcola metriche officina per periodo' })
  @ApiResponse({ status: 200, description: 'Metriche calcolate' })
  async getMetrics(
    @CurrentUser('tenantId') tenantId: string,
    @Query() query: BenchmarkPeriodQueryDto,
  ): Promise<ShopMetric[]> {
    return this.benchmarkingService.calculateShopMetrics(tenantId, query.period);
  }

  @Get('compare')
  @ApiOperation({ summary: 'Confronta officina con medie settore' })
  @ApiResponse({ status: 200, description: 'Confronto con benchmark' })
  async compare(
    @CurrentUser('tenantId') tenantId: string,
    @Query() query: BenchmarkPeriodQueryDto,
  ): Promise<ShopBenchmark[]> {
    return this.benchmarkingService.getShopBenchmark(tenantId, query.period);
  }

  @Get('ranking')
  @ApiOperation({ summary: 'Ranking officina nel settore' })
  @ApiResponse({ status: 200, description: 'Ranking percentile' })
  async ranking(
    @CurrentUser('tenantId') tenantId: string,
    @Query() query: BenchmarkPeriodQueryDto,
  ): Promise<ShopRanking> {
    return this.benchmarkingService.getShopRanking(tenantId, query.period);
  }
}
