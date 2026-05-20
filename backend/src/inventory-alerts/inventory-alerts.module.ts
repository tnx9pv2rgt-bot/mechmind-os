/**
 * MechMind OS - Inventory Alerts Module
 *
 * Module for low-stock inventory alerts:
 * - BullMQ queue integration ('inventory-alerts')
 * - Daily cron scheduler (09:00 AM)
 * - Service, processor, and scheduler providers
 */

import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ScheduleModule } from '@nestjs/schedule';
import { InventoryAlertsService } from './services/inventory-alerts.service';
import { InventoryAlertsProcessor } from './processors/inventory-alerts.processor';
import { InventoryAlertsScheduler } from './schedulers/inventory-alerts.scheduler';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'inventory-alerts' }),
    ScheduleModule.forRoot(),
    CommonModule,
  ],
  providers: [InventoryAlertsService, InventoryAlertsProcessor, InventoryAlertsScheduler],
  exports: [InventoryAlertsService],
})
export class InventoryAlertsModule {}
