/**
 * MechMind OS - Inventory Alerts Processor
 *
 * BullMQ processor for inventory alert jobs:
 * - Consumes 'inventory-alerts' queue
 * - Executes daily low-stock check for all tenants
 * - Logs processing results
 */

import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { InventoryAlertsService } from '../services/inventory-alerts.service';

@Processor('inventory-alerts')
export class InventoryAlertsProcessor extends WorkerHost {
  private readonly logger = new Logger(InventoryAlertsProcessor.name);

  constructor(private readonly service: InventoryAlertsService) {
    super();
  }

  /**
   * Main job handler: runs low-stock alert check for all tenants
   */
  async process(job: Job): Promise<{ tenantsProcessed: number; alertsCreated: number }> {
    this.logger.log(`Processing job ${job.name}`);

    if (job.name !== 'check-all') {
      throw new Error(`Unknown job type: ${job.name}`);
    }

    try {
      const result = await this.service.runForAllTenants();
      this.logger.log(
        `Job completed: ${result.tenantsProcessed} tenants, ${result.alertsCreated} alerts`,
      );
      return result;
    } catch (error) {
      this.logger.error('Job failed:', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }
}
