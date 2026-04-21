/**
 * MechMind OS - Inventory Alerts Scheduler
 *
 * Cron-based scheduler for inventory alerts:
 * - Runs daily at 09:00 AM
 * - Enqueues check-all job to BullMQ
 * - Handles scheduling errors gracefully
 */

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';

@Injectable()
export class InventoryAlertsScheduler {
  private readonly logger = new Logger(InventoryAlertsScheduler.name);

  constructor(@InjectQueue('inventory-alerts') private queue: Queue) {}

  /**
   * Daily job scheduler: runs at 09:00 AM
   * Enqueues the check-all job for processing
   */
  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async scheduleInventoryCheck(): Promise<void> {
    this.logger.log('Enqueuing inventory-alerts check-all job');

    try {
      const job = await this.queue.add(
        'check-all',
        {},
        {
          removeOnComplete: { age: 3600 }, // Keep completed job for 1 hour
          removeOnFail: false, // Keep failed jobs for debugging
          attempts: 1, // No auto-retry at queue level (processor handles logic)
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        },
      );

      this.logger.log(`Job enqueued with ID: ${job.id}`);
    } catch (error) {
      this.logger.error(
        'Failed to enqueue inventory-alerts job:',
        error instanceof Error ? error.message : 'Unknown error',
      );
    }
  }
}
