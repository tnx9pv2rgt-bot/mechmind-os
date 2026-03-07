import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue, Job } from 'bullmq';
import { PrismaService } from '@common/services/prisma.service';
import { EncryptionService } from '@common/services/encryption.service';
import { LoggerService } from '@common/services/logger.service';
import { Customer, Vehicle, Booking } from '@prisma/client';

/**
 * Extended Booking with extra fields - TODO: Add to schema.prisma
 */
type BookingWithCost = Booking & {
  totalCostCents?: bigint | null;
};

/**
 * Data Transfer Object for deletion job payload
 */
export interface DeletionJobPayload {
  customerId: string;
  tenantId: string;
  requestId: string;
  reason: string;
  verifiedBy?: string;
  requestTimestamp: string;
  identityVerificationMethod?: string;
}

/**
 * Deletion snapshot metadata
 */
export interface DeletionSnapshot {
  snapshotId: string;
  customerId: string;
  tenantId: string;
  requestId: string;
  createdAt: Date;
  expiresAt: Date;
  dataCategories: string[];
  fileSize: number;
  checksum: string;
  storageLocation: string;
}

/**
 * Result of anonymization operation
 */
export interface AnonymizationResult {
  success: boolean;
  customerId: string;
  anonymizedAt: Date;
  anonymizedFields: string[];
  preservedFields: string[];
  recordingsDeleted: number;
  snapshotCreated: boolean;
  snapshotId?: string;
  errors?: string[];
}

/**
 * Result of call recording deletion
 */
export interface RecordingDeletionResult {
  success: boolean;
  deletedCount: number;
  failedDeletions: Array<{
    recordingId: string;
    reason: string;
  }>;
  storageReclaimed: number; // in bytes
}

/**
 * GDPR Deletion Service
 * 
 * Handles automated data deletion requests (Right to Erasure - Art. 17)
 * with 24-hour SLA using BullMQ job processing.
 * 
 * Process:
 * 1. Verify identity of requester
 * 2. Create deletion snapshot (legal requirement)
 * 3. Anonymize customer data (preserving referential integrity)
 * 4. Delete call recordings and associated media
 * 5. Update audit logs
 * 6. Notify completion
 */
@Injectable()
export class GdprDeletionService {
  private readonly logger = new Logger(GdprDeletionService.name);
  
  // Retention period for deletion snapshots (30 days before permanent deletion)
  private readonly SNAPSHOT_RETENTION_DAYS = 30;
  
  // SLA target for deletion completion (24 hours)
  private readonly DELETION_SLA_HOURS = 24;

  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
    private readonly config: ConfigService,
    private readonly loggerService: LoggerService,
    @InjectQueue('gdpr-deletion') private readonly deletionQueue: Queue,
  ) {}

  /**
   * Queue a customer data deletion job
   * 
   * @param customerId - UUID of customer to delete
   * @param tenantId - Tenant ID for multi-tenancy context
   * @param requestId - Associated data subject request ID
   * @param reason - Reason for deletion
   * @param options - Additional options (verification method, etc.)
   * @returns Job details with estimated completion time
   * @throws NotFoundException if customer not found
   * @throws BadRequestException if deletion already in progress
   */
  async queueDeletion(
    customerId: string,
    tenantId: string,
    requestId: string,
    reason: string,
    options?: {
      verifiedBy?: string;
      identityVerificationMethod?: string;
      priority?: number;
    },
  ): Promise<{
    jobId: string;
    status: string;
    estimatedCompletion: Date;
    slaDeadline: Date;
  }> {
    // Verify customer exists
    const customer = await this.prisma.withTenant(tenantId, async (prisma) => {
      // TODO: Add customerEncrypted model to schema.prisma or use Customer model
      return (prisma as any).customerEncrypted.findFirst({
        where: { 
          id: customerId, 
          tenantId,
          anonymizedAt: null, // Not already anonymized
        },
        select: { id: true, tenantId: true },
      });
    });

    if (!customer) {
      throw new NotFoundException(`Customer ${customerId} not found or already anonymized`);
    }

    // Check if deletion already in progress
    const existingJob = await this.deletionQueue.getJob(`deletion:${customerId}`);
    if (existingJob && await existingJob.getState() === 'active') {
      throw new BadRequestException(`Deletion already in progress for customer ${customerId}`);
    }

    // Update request status to IN_PROGRESS
    await this.prisma.withTenant(tenantId, async (prisma) => {
      // TODO: Add dataSubjectRequests model to schema.prisma
      await (prisma as any).dataSubjectRequests.update({
        where: { id: requestId },
        data: { 
          status: 'IN_PROGRESS',
          updatedAt: new Date(),
        },
      });
    });

    // Queue the deletion job
    const job = await this.deletionQueue.add(
      'customer-deletion',
      {
        customerId,
        tenantId,
        requestId,
        reason,
        verifiedBy: options?.verifiedBy,
        requestTimestamp: new Date().toISOString(),
        identityVerificationMethod: options?.identityVerificationMethod,
      } as DeletionJobPayload,
      {
        jobId: `deletion:${customerId}`,
        priority: options?.priority ?? 5,
        delay: 0,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 60000, // 1 minute initial delay
        },
      },
    );

    // Calculate SLA deadlines
    const now = new Date();
    const estimatedCompletion = new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2 hours estimated
    const slaDeadline = new Date(now.getTime() + this.DELETION_SLA_HOURS * 60 * 60 * 1000);

    this.loggerService.log(
      `Queued deletion job ${job.id} for customer ${customerId}. SLA deadline: ${slaDeadline.toISOString()}`,
      'GdprDeletionService',
    );

    return {
      jobId: job.id as string,
      status: 'QUEUED',
      estimatedCompletion,
      slaDeadline,
    };
  }

  /**
   * Verify the identity of a data subject request
   * 
   * @param customerId - Customer to verify
   * @param tenantId - Tenant ID
   * @param verificationData - Documents/methods provided for verification
   * @returns Verification result with confidence score
   */
  async verifyIdentity(
    customerId: string,
    tenantId: string,
    verificationData: {
      method: string;
      documents?: string[];
      phoneVerified?: boolean;
      emailVerified?: boolean;
      bookingReference?: string;
    },
  ): Promise<{
    verified: boolean;
    confidence: 'HIGH' | 'MEDIUM' | 'LOW';
    verificationMethod: string;
    verifiedAt: Date;
  }> {
    const customer = await this.prisma.withTenant(tenantId, async (prisma) => {
      // TODO: Add customerEncrypted model to schema.prisma or use Customer model
      return (prisma as any).customerEncrypted.findFirst({
        where: { id: customerId, tenantId },
        include: {
          bookings: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      });
    });

    if (!customer) {
      throw new NotFoundException(`Customer ${customerId} not found`);
    }

    // Calculate confidence based on verification methods
    let confidenceScore = 0;
    const methods: string[] = [];

    if (verificationData.phoneVerified) {
      confidenceScore += 40;
      methods.push('PHONE');
    }

    if (verificationData.emailVerified) {
      confidenceScore += 30;
      methods.push('EMAIL');
    }

    if (verificationData.bookingReference) {
      const bookingMatch = customer.bookings.some(
        (b: Booking) => b.id === verificationData.bookingReference
      );
      if (bookingMatch) {
        confidenceScore += 30;
        methods.push('BOOKING_REFERENCE');
      }
    }

    if (verificationData.documents && verificationData.documents.length > 0) {
      confidenceScore += 20;
      methods.push('DOCUMENTS');
    }

    // Determine confidence level
    let confidence: 'HIGH' | 'MEDIUM' | 'LOW';
    if (confidenceScore >= 80) confidence = 'HIGH';
    else if (confidenceScore >= 50) confidence = 'MEDIUM';
    else confidence = 'LOW';

    const verified = confidenceScore >= 50; // Minimum threshold
    const verifiedAt = new Date();

    // Log verification attempt
    await this.prisma.withTenant(tenantId, async (prisma) => {
      // TODO: Add auditLog model to schema.prisma
      await (prisma as any).auditLog.create({
        data: {
          tenantId,
          action: 'IDENTITY_VERIFICATION',
          tableName: 'customers_encrypted',
          recordId: customerId,
          newValues: {
            verified,
            confidence,
            methods,
            score: confidenceScore,
          },
          createdAt: verifiedAt,
        },
      });
    });

    return {
      verified,
      confidence,
      verificationMethod: methods.join(','),
      verifiedAt,
    };
  }

  /**
   * Create a deletion snapshot before anonymizing
   * Required for legal compliance and audit purposes
   * 
   * @param customerId - Customer to snapshot
   * @param tenantId - Tenant ID
   * @param requestId - Associated request ID
   * @returns Snapshot metadata
   */
  async createDeletionSnapshot(
    customerId: string,
    tenantId: string,
    requestId: string,
  ): Promise<DeletionSnapshot> {
    this.logger.debug(`Creating deletion snapshot for customer ${customerId}`);

    const snapshotId = `snap-${Date.now()}-${customerId.substring(0, 8)}`;
    const createdAt = new Date();
    const expiresAt = new Date(createdAt.getTime() + this.SNAPSHOT_RETENTION_DAYS * 24 * 60 * 60 * 1000);

    // Gather all customer data for snapshot
    const customerData = await this.prisma.withTenant(tenantId, async (prisma) => {
      // TODO: Add customerEncrypted model to schema.prisma or use Customer model
      return (prisma as any).customerEncrypted.findFirst({
        where: { id: customerId, tenantId },
        include: {
          vehicles: true,
          bookings: {
            include: {
              invoices: true,
            },
          },
        },
      });
    });

    if (!customerData) {
      throw new NotFoundException(`Customer ${customerId} not found`);
    }

    // Build snapshot content (encrypted storage)
    const snapshotContent = {
      snapshotId,
      createdAt: createdAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
      customerId,
      requestId,
      data: {
        customer: {
          id: customerData.id,
          createdAt: customerData.createdAt,
          gdprConsent: customerData.gdprConsent,
          gdprConsentDate: customerData.gdprConsentDate,
          // Note: PII is not included in snapshot for security
          // Only metadata and consent records are preserved
        },
        vehicles: customerData.vehicles.map((v: Vehicle) => ({
          id: v.id,
          licensePlate: v.licensePlate,
          make: v.make,
          model: v.model,
          year: v.year,
        })),
        bookings: customerData.bookings.map((b: BookingWithCost) => ({
          id: b.id,
          createdAt: b.createdAt,
          status: b.status,
          totalCostCents: b.totalCostCents,
        })),
        totalRecords: 1 + customerData.vehicles.length + customerData.bookings.length,
      },
      retentionDays: this.SNAPSHOT_RETENTION_DAYS,
    };

    // Encrypt and store snapshot
    const serialized = JSON.stringify(snapshotContent);
    const encryptedSnapshot = this.encryption.encrypt(serialized);
    const checksum = this.generateChecksum(serialized);

    // Store snapshot (in production, this would go to S3 or similar)
    const storageLocation = `snapshots/${tenantId}/${snapshotId}.enc`;
    
    // Update request with snapshot info
    await this.prisma.withTenant(tenantId, async (prisma) => {
      // TODO: Add dataSubjectRequests model to schema.prisma
      await (prisma as any).dataSubjectRequests.update({
        where: { id: requestId },
        data: {
          deletionSnapshotCreated: true,
          deletionSnapshotUrl: storageLocation,
        },
      });
    });

    // Log snapshot creation
    await this.prisma.withTenant(tenantId, async (prisma) => {
      // TODO: Add auditLog model to schema.prisma
      await (prisma as any).auditLog.create({
        data: {
          tenantId,
          action: 'DELETION_SNAPSHOT_CREATED',
          tableName: 'customers_encrypted',
          recordId: customerId,
          newValues: {
            snapshotId,
            expiresAt,
            recordCount: snapshotContent.data.totalRecords,
          },
          createdAt,
        },
      });
    });

    this.loggerService.log(
      `Deletion snapshot ${snapshotId} created for customer ${customerId}`,
      'GdprDeletionService',
    );

    return {
      snapshotId,
      customerId,
      tenantId,
      requestId,
      createdAt,
      expiresAt,
      dataCategories: ['customer', 'vehicles', 'bookings'],
      fileSize: Buffer.byteLength(encryptedSnapshot, 'utf8'),
      checksum,
      storageLocation,
    };
  }

  /**
   * Anonymize customer data while preserving referential integrity
   * 
   * @param customerId - Customer to anonymize
   * @param tenantId - Tenant ID
   * @param requestId - Associated request ID
   * @returns Anonymization result
   */
  async anonymizeCustomer(
    customerId: string,
    tenantId: string,
    requestId: string,
  ): Promise<AnonymizationResult> {
    this.logger.debug(`Anonymizing customer ${customerId}`);
    
    const errors: string[] = [];
    const anonymizedFields: string[] = [];
    const preservedFields: string[] = [];
    const anonymizedAt = new Date();

    try {
      await this.prisma.withTenant(tenantId, async (prisma) => {
        // Get customer before anonymization for audit
        // TODO: Add customerEncrypted model to schema.prisma or use Customer model
        const customer = await (prisma as any).customerEncrypted.findFirst({
          where: { id: customerId, tenantId },
        });

        if (!customer) {
          throw new NotFoundException(`Customer ${customerId} not found`);
        }

        // Anonymize customer record
        // TODO: Add customerEncrypted model to schema.prisma or use Customer model
        await (prisma as any).customerEncrypted.update({
          where: { id: customerId },
          data: {
            phoneEncrypted: Buffer.from(this.encryption.encrypt('DELETED')),
            emailEncrypted: Buffer.from(this.encryption.encrypt('DELETED')),
            nameEncrypted: Buffer.from(this.encryption.encrypt('DELETED')),
            gdprConsent: false,
            marketingConsent: false,
            callRecordingConsent: false,
            isDeleted: true,
            deletedAt: anonymizedAt,
            anonymizedAt,
            dataSubjectRequestId: requestId,
            dataRetentionDays: 0,
          },
        });

        anonymizedFields.push('phoneEncrypted', 'emailEncrypted', 'nameEncrypted');
        preservedFields.push('id', 'tenantId', 'createdAt', 'bookings', 'vehicles');

        // Log anonymization
        // TODO: Add auditLog model to schema.prisma
        await (prisma as any).auditLog.create({
          data: {
            tenantId,
            action: 'CUSTOMER_ANONYMIZED',
            tableName: 'customers_encrypted',
            recordId: customerId,
            oldValues: { wasActive: true },
            newValues: { 
              anonymized: true, 
              anonymizedAt,
              requestId,
            },
            createdAt: anonymizedAt,
          },
        });
      });

      this.loggerService.log(
        `Customer ${customerId} anonymized successfully`,
        'GdprDeletionService',
      );

      return {
        success: true,
        customerId,
        anonymizedAt,
        anonymizedFields,
        preservedFields,
        recordingsDeleted: 0, // Updated separately
        snapshotCreated: true,
        errors: errors.length > 0 ? errors : undefined,
      };

    } catch (error) {
      this.logger.error(`Failed to anonymize customer ${customerId}: ${error.message}`);
      errors.push(error.message);
      
      return {
        success: false,
        customerId,
        anonymizedAt,
        anonymizedFields,
        preservedFields,
        recordingsDeleted: 0,
        snapshotCreated: false,
        errors,
      };
    }
  }

  /**
   * Delete call recordings for a customer
   * 
   * @param customerId - Customer whose recordings to delete
   * @param tenantId - Tenant ID
   * @returns Deletion result
   */
  async deleteCallRecordings(
    customerId: string,
    tenantId: string,
  ): Promise<RecordingDeletionResult> {
    this.logger.debug(`Deleting call recordings for customer ${customerId}`);

    const failedDeletions: Array<{ recordingId: string; reason: string }> = [];
    let deletedCount = 0;
    let storageReclaimed = 0;

    try {
      // Find all recordings for this customer
      const recordings = await this.prisma.withTenant(tenantId, async (prisma) => {
        // TODO: Add callRecordings model to schema.prisma
        return (prisma as any).callRecordings.findMany({
          where: { 
            customerId,
            tenantId,
            deletedAt: null,
          },
        });
      });

      this.logger.debug(`Found ${recordings.length} recordings to delete`);

      // Delete each recording
      for (const recording of recordings) {
        try {
          // In production, this would also delete from S3/Twilio
          // await this.twilioClient.recordings(recording.recordingSid).remove();
          // await this.s3Client.deleteObject({ Bucket: 'recordings', Key: recording.recordingUrl });

          // Mark as deleted in database
          await this.prisma.withTenant(tenantId, async (prisma) => {
            // TODO: Add callRecordings model to schema.prisma
            await (prisma as any).callRecordings.update({
              where: { id: recording.id },
              data: {
                deletedAt: new Date(),
                deletionReason: 'GDPR_DELETION_REQUEST',
                recordingUrl: null, // Remove URL reference
              },
            });
          });

          deletedCount++;
          storageReclaimed += recording.durationSeconds * 16000; // Approximate: 16kbps audio

        } catch (error) {
          failedDeletions.push({
            recordingId: recording.id,
            reason: error.message,
          });
        }
      }

      // Log recording deletion
      if (deletedCount > 0) {
        await this.prisma.withTenant(tenantId, async (prisma) => {
          // TODO: Add auditLog model to schema.prisma
          await (prisma as any).auditLog.create({
            data: {
              tenantId,
              action: 'CALL_RECORDINGS_DELETED',
              tableName: 'call_recordings',
              recordId: customerId,
              newValues: {
                deletedCount,
                storageReclaimedBytes: storageReclaimed,
                failedCount: failedDeletions.length,
              },
              createdAt: new Date(),
            },
          });
        });
      }

      return {
        success: failedDeletions.length === 0,
        deletedCount,
        failedDeletions,
        storageReclaimed,
      };

    } catch (error) {
      this.logger.error(`Failed to delete recordings for customer ${customerId}: ${error.message}`);
      return {
        success: false,
        deletedCount,
        failedDeletions: [...failedDeletions, { 
          recordingId: 'N/A', 
          reason: error.message 
        }],
        storageReclaimed,
      };
    }
  }

  /**
   * Get job status for a deletion request
   * 
   * @param jobId - BullMQ job ID
   * @returns Job status and progress
   */
  async getJobStatus(jobId: string): Promise<{
    jobId: string;
    state: string;
    progress: number;
    attempts: number;
    createdAt?: Date;
    processedAt?: Date;
    completedAt?: Date;
    failedReason?: string;
  }> {
    const job = await this.deletionQueue.getJob(jobId);

    if (!job) {
      throw new NotFoundException(`Job ${jobId} not found`);
    }

    const state = await job.getState();

    return {
      jobId: job.id as string,
      state,
      progress: job.progress as number || 0,
      attempts: job.attemptsMade,
      createdAt: job.timestamp ? new Date(job.timestamp) : undefined,
      processedAt: job.processedOn ? new Date(job.processedOn) : undefined,
      completedAt: job.finishedOn ? new Date(job.finishedOn) : undefined,
      failedReason: job.failedReason,
    };
  }

  /**
   * Cancel a pending deletion job
   * 
   * @param jobId - Job ID to cancel
   * @param reason - Cancellation reason
   * @returns Cancellation result
   */
  async cancelDeletion(jobId: string, reason: string): Promise<{
    success: boolean;
    message: string;
  }> {
    const job = await this.deletionQueue.getJob(jobId);

    if (!job) {
      return { success: false, message: 'Job not found' };
    }

    const state = await job.getState();

    if (state === 'completed') {
      return { success: false, message: 'Cannot cancel completed job' };
    }

    if (state === 'failed') {
      return { success: false, message: 'Job already failed' };
    }

    await job.remove();

    this.loggerService.log(
      `Deletion job ${jobId} cancelled. Reason: ${reason}`,
      'GdprDeletionService',
    );

    return { success: true, message: 'Job cancelled successfully' };
  }

  /**
   * Get queue statistics
   * @returns Queue metrics
   */
  async getQueueStats(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  }> {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.deletionQueue.getWaitingCount(),
      this.deletionQueue.getActiveCount(),
      this.deletionQueue.getCompletedCount(),
      this.deletionQueue.getFailedCount(),
      this.deletionQueue.getDelayedCount(),
    ]);

    return { waiting, active, completed, failed, delayed };
  }

  /**
   * Generate checksum for snapshot integrity
   */
  private generateChecksum(data: string): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(data).digest('hex');
  }
}
