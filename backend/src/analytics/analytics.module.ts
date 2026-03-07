import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule } from '@nestjs/config';
import { UnitEconomicsService } from './services/unit-economics.service';
import { ReportingService } from './services/reporting.service';
import { MetricsController } from './controllers/metrics.controller';
import { ReportingController } from './controllers/reporting.controller';
import { MetabaseController } from './controllers/metabase.controller';
import { CommonModule } from '@common/common.module';
import { PrismaService } from '@common/services/prisma.service';

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
  imports: [
    CommonModule,
    ConfigModule,
    ScheduleModule.forRoot(),
  ],
  controllers: [MetricsController, ReportingController, MetabaseController],
  providers: [UnitEconomicsService, ReportingService, PrismaService],
  exports: [UnitEconomicsService, ReportingService],
})
export class AnalyticsModule {}

/**
 * Scheduled Jobs Configuration
 * 
 * To enable scheduled metric calculation, add to a service:
 * 
 * ```typescript
 * import { Injectable } from '@nestjs/common';
 * import { Cron, CronExpression } from '@nestjs/schedule';
 * import { UnitEconomicsService } from './services/unit-economics.service';
 * 
 * @Injectable()
 * export class MetricsSchedulerService {
 *   constructor(private readonly unitEconomics: UnitEconomicsService) {}
 * 
 *   // Daily CAC calculation
 *   @Cron(CronExpression.EVERY_DAY_AT_2AM)
 *   async calculateDailyCAC() {
 *     const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
 *     const today = new Date();
 *     await this.unitEconomics.calculateCAC(yesterday, today);
 *   }
 * 
 *   // Weekly LTV cohort update
 *   @Cron('0 3 * * 0') // Every Sunday at 3 AM
 *   async updateCohortLTV() {
 *     await this.unitEconomics.calculateLTVByCohort(24);
 *   }
 * 
 *   // Monthly churn analysis
 *   @Cron('0 4 1 * *') // 1st of every month at 4 AM
 *   async monthlyChurnAnalysis() {
 *     await this.unitEconomics.analyzeChurn(12);
 *   }
 * 
 *   // Monthly investor report
 *   @Cron('0 5 1 * *') // 1st of every month at 5 AM
 *   async generateInvestorReport() {
 *     const lastMonth = new Date();
 *     lastMonth.setMonth(lastMonth.getMonth() - 1);
 *     const now = new Date();
 *     
 *     return await this.unitEconomics.exportInvestorMetrics(lastMonth, now);
 *   }
 * }
 * ```
 */
