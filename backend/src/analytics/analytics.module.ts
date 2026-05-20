import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule } from '@nestjs/config';
import { UnitEconomicsService } from './services/unit-economics.service';
import { ReportingService } from './services/reporting.service';
import { SearchService } from './services/search.service';
import { KpiService } from './services/kpi.service';
import { MetricsController } from './controllers/metrics.controller';
import { ReportingController } from './controllers/reporting.controller';
import { MetabaseController } from './controllers/metabase.controller';
import { CommonModule } from '@common/common.module';

/**
 * MechMind OS Analytics Module
 *
 * This module provides business analytics and unit economics tracking
 * for investor reporting and internal KPI monitoring.
 *
 * Features:
 * - CAC/LTV calculations by channel and cohort
 * - Churn rate analysis
 * - Gross margin tracking by segment
 * - Break-even analysis
 * - Scheduled metric calculation jobs
 */
@Module({
  imports: [CommonModule, ConfigModule, ScheduleModule.forRoot()],
  controllers: [MetricsController, ReportingController, MetabaseController],
  providers: [UnitEconomicsService, ReportingService, SearchService, KpiService],
  exports: [UnitEconomicsService, ReportingService, SearchService, KpiService],
})
export class AnalyticsModule {}
