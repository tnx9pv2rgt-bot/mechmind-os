import { Processor, Process, OnQueueActive, OnQueueCompleted, OnQueueFailed } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { DataRetentionService } from '../services/data-retention.service';
import { LoggerService } from '@common/services/logger.service';

/**
 * Data Retention Job Payload
 */
interface RetentionJobPayload {
  tenantId?: string;
  triggeredAt: string;
}

/**
 * Data Retention Job Processor
 * 
 * Handles automated data retention policy enforcement.
 * Processes jobs from the gdpr-retention queue.
 */
@Processor('gdpr-retention', {
  concurrency: 1, // Process one retention job at a time to avoid overload
})
export class DataRetentionProcessor {
  private readonly logger = new Logger(DataRetentionProcessor.name);

  constructor(
    private readonly dataRetentionService: DataRetentionService,
    private readonly loggerService: LoggerService,
  ) {}

  /**
   * Process retention enforcement job
   */
  @Process('enforce-retention')
  async handleRetentionEnforcement(job: Job<RetentionJobPayload>): Promise<{
    success: boolean;
    executionId: string;
    customersAnonymized: number;
    recordingsDeleted: number;
    processingTimeMs: number;
  }> {
    const startTime = Date.now();
    const { tenantId } = job.data;

    this.logger.log(
      `Starting retention enforcement job ${job.id}` +
      (tenantId ? ` for tenant ${tenantId}` : ' for all tenants'),
    );

    await job.updateProgress(10);

    try {
      // Execute retention policy
      const result = await this.dataRetentionService.enforceRetentionPolicy(tenantId);
      
      await job.updateProgress(100);

      const processingTimeMs = Date.now() - startTime;

      if (result.success) {
        this.loggerService.log(
          `Retention job ${job.id} completed successfully. ` +
          `Anonymized: ${result.customersAnonymized}, ` +
          `Recordings deleted: ${result.recordingsDeleted}`,
          'DataRetentionProcessor',
        );
      } else {
        this.logger.warn(
          `Retention job ${job.id} completed with errors: ${result.errors.join('; ')}`,
        );
      }

      return {
        success: result.success,
        executionId: result.executionId,
        customersAnonymized: result.customersAnonymized,
        recordingsDeleted: result.recordingsDeleted,
        processingTimeMs,
      };

    } catch (error) {
      this.logger.error(`Retention job ${job.id} failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Handle job started event
   */
  @OnQueueActive()
  onActive(job: Job<RetentionJobPayload>): void {
    this.logger.log(`Retention job ${job.id} started`);
  }

  /**
   * Handle job completed event
   */
  @OnQueueCompleted()
  onCompleted(job: Job<RetentionJobPayload>, result: any): void {
    this.logger.log(
      `Retention job ${job.id} completed. ` +
      `Anonymized: ${result.customersAnonymized}, ` +
      `Recordings: ${result.recordingsDeleted}`,
    );
  }

  /**
   * Handle job failed event
   */
  @OnQueueFailed()
  onFailed(job: Job<RetentionJobPayload>, error: Error): void {
    this.logger.error(`Retention job ${job.id} failed: ${error.message}`);

    // Alert on final failure
    if (job.attemptsMade >= (job.opts.attempts || 3)) {
      this.loggerService.log(
        `CRITICAL: Retention job ${job.id} exhausted all retries`,
        'DataRetentionProcessor',
      );
    }
  }
}
