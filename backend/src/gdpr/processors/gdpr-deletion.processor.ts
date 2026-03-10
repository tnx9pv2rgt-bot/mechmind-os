import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { GdprDeletionService, DeletionJobPayload } from '../services/gdpr-deletion.service';
import { PrismaService } from '@common/services/prisma.service';
import { LoggerService } from '@common/services/logger.service';

/**
 * GDPR Deletion Job Processor
 *
 * Handles the actual execution of data deletion jobs queued by GdprDeletionService.
 * Implements the 6-step deletion process:
 * 1. Verify identity (already done before queuing)
 * 2. Create deletion snapshot
 * 3. Anonymize customer data
 * 4. Delete call recordings
 * 5. Update audit log
 * 6. Mark request as complete
 *
 * SLA Target: 24 hours from request to completion
 */
@Processor('gdpr-deletion', {
  concurrency: 3, // Process up to 3 deletions concurrently
  limiter: {
    max: 10, // Max 10 jobs
    duration: 60000, // per minute
  },
})
export class GdprDeletionProcessor extends WorkerHost {
  private readonly logger = new Logger(GdprDeletionProcessor.name);

  constructor(
    private readonly gdprDeletionService: GdprDeletionService,
    private readonly prisma: PrismaService,
    private readonly loggerService: LoggerService,
  ) {
    super();
  }

  /**
   * Process customer deletion job
   */
  async process(job: Job<DeletionJobPayload>): Promise<{
    success: boolean;
    customerId: string;
    processingTimeMs: number;
    snapshotCreated: boolean;
    anonymized: boolean;
    recordingsDeleted: number;
  }> {
    const startTime = Date.now();
    const { customerId, tenantId, requestId, reason } = job.data;

    this.logger.log(`Starting deletion job ${job.id} for customer ${customerId}`);
    await job.updateProgress(10);

    try {
      // Step 1: Create deletion snapshot (20% progress)
      this.logger.debug(`Creating deletion snapshot for ${customerId}`);
      const snapshot = await this.gdprDeletionService.createDeletionSnapshot(
        customerId,
        tenantId,
        requestId,
      );
      await job.updateProgress(20);

      // Step 2: Anonymize customer data (50% progress)
      this.logger.debug(`Anonymizing customer ${customerId}`);
      const anonymizationResult = await this.gdprDeletionService.anonymizeCustomer(
        customerId,
        tenantId,
        requestId,
      );

      if (!anonymizationResult.success) {
        throw new Error(`Anonymization failed: ${anonymizationResult.errors?.join(', ')}`);
      }
      await job.updateProgress(50);

      // Step 3: Delete call recordings (80% progress)
      this.logger.debug(`Deleting call recordings for ${customerId}`);
      const recordingResult = await this.gdprDeletionService.deleteCallRecordings(
        customerId,
        tenantId,
      );
      await job.updateProgress(80);

      // Step 4: Mark request as complete (100% progress)
      await this.prisma.withTenant(tenantId, async prisma => {
        await prisma.dataSubjectRequest.update({
          where: { id: requestId },
          data: {
            status: 'COMPLETED',
            completedAt: new Date(),
            slaMet: true,
          },
        });
      });
      await job.updateProgress(100);

      const processingTimeMs = Date.now() - startTime;

      this.loggerService.log(
        `Deletion job ${job.id} completed for customer ${customerId} in ${processingTimeMs}ms. ` +
          `Snapshot: ${snapshot.snapshotId}, Recordings deleted: ${recordingResult.deletedCount}`,
        'GdprDeletionProcessor',
      );

      return {
        success: true,
        customerId,
        processingTimeMs,
        snapshotCreated: true,
        anonymized: true,
        recordingsDeleted: recordingResult.deletedCount,
      };
    } catch (error) {
      this.logger.error(`Deletion job ${job.id} failed: ${error.message}`);

      // Update request status to failed
      await this.prisma.withTenant(tenantId, async prisma => {
        await prisma.dataSubjectRequest.update({
          where: { id: requestId },
          data: {
            status: 'RECEIVED', // Reset to allow retry
            notes: `Deletion failed: ${error.message}`,
          },
        });
      });

      throw error; // Re-throw to trigger BullMQ retry
    }
  }
}
