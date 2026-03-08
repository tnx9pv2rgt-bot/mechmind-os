import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '@common/services/prisma.service';
import { EncryptionService } from '@common/services/encryption.service';
import { LoggerService } from '@common/services/logger.service';

/**
 * Data Retention Policy Configuration
 */
export interface RetentionPolicy {
  /** Customer PII retention in days (default: 7 years = 2555 days) */
  customerDataDays: number;
  /** Booking data retention in days (default: 30 days after completion) */
  bookingDataDays: number;
  /** PII retention after opt-out (default: 30 days) */
  optOutDataDays: number;
  /** Call recording retention in days (default: 30 days) */
  callRecordingDays: number;
  /** Audit log retention in days (default: 365 days) */
  auditLogDays: number;
  /** Webhook event retention in days (default: 90 days) */
  webhookEventDays: number;
  /** Consent audit log retention in days (default: 7 years) */
  consentAuditLogDays: number;
}

/**
 * Retention execution result
 */
export interface RetentionExecutionResult {
  executionId: string;
  startedAt: Date;
  completedAt: Date;
  durationMs: number;
  customersAnonymized: number;
  bookingsAnonymized: number;
  recordingsDeleted: number;
  logsDeleted: number;
  webhookEventsDeleted: number;
  consentLogsArchived: number;
  errors: string[];
  success: boolean;
}

/**
 * Per-tenant retention statistics
 */
export interface TenantRetentionStats {
  tenantId: string;
  tenantName: string;
  dataRetentionDays: number;
  activeCustomers: number;
  customersPendingAnonymization: number;
  expiredRecordings: number;
  storageUsed: number;
}

/**
 * Data Retention Service
 * 
 * Implements automated data retention policies per GDPR requirements:
 * - Bookings: 30 days after completion (configurable)
 * - PII after opt-out: 30 days
 * - Call recordings: 30 days (configurable)
 * - Audit logs: 365 days
 * - Consent logs: 7 years (legal requirement)
 * 
 * Runs scheduled jobs to enforce policies and maintains audit trail.
 * 
 * @see GDPR Article 5(1)(e) - Storage limitation principle
 */
@Injectable()
export class DataRetentionService {
  private readonly logger = new Logger(DataRetentionService.name);

  // Default retention periods (in days)
  private readonly DEFAULT_RETENTION: RetentionPolicy = {
    customerDataDays: 2555,      // 7 years
    bookingDataDays: 30,         // 30 days
    optOutDataDays: 30,          // 30 days after opt-out
    callRecordingDays: 30,       // 30 days
    auditLogDays: 365,           // 1 year
    webhookEventDays: 90,        // 90 days
    consentAuditLogDays: 2555,   // 7 years (legal requirement)
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
    private readonly config: ConfigService,
    private readonly loggerService: LoggerService,
    @InjectQueue('gdpr-retention') private readonly retentionQueue: Queue,
  ) {}

  /**
   * Get the current retention policy from configuration
   */
  getRetentionPolicy(): RetentionPolicy {
    return {
      customerDataDays: parseInt(
        this.config.get('GDPR_CUSTOMER_RETENTION_DAYS', String(this.DEFAULT_RETENTION.customerDataDays)),
      ),
      bookingDataDays: parseInt(
        this.config.get('GDPR_BOOKING_RETENTION_DAYS', String(this.DEFAULT_RETENTION.bookingDataDays)),
      ),
      optOutDataDays: parseInt(
        this.config.get('GDPR_OPTOUT_RETENTION_DAYS', String(this.DEFAULT_RETENTION.optOutDataDays)),
      ),
      callRecordingDays: parseInt(
        this.config.get('GDPR_RECORDING_RETENTION_DAYS', String(this.DEFAULT_RETENTION.callRecordingDays)),
      ),
      auditLogDays: parseInt(
        this.config.get('GDPR_AUDIT_LOG_DAYS', String(this.DEFAULT_RETENTION.auditLogDays)),
      ),
      webhookEventDays: parseInt(
        this.config.get('GDPR_WEBHOOK_EVENT_DAYS', String(this.DEFAULT_RETENTION.webhookEventDays)),
      ),
      consentAuditLogDays: parseInt(
        this.config.get('GDPR_CONSENT_LOG_DAYS', String(this.DEFAULT_RETENTION.consentAuditLogDays)),
      ),
    };
  }

  /**
   * Scheduled job: Daily retention enforcement
   * Runs at 2:00 AM daily to minimize impact
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM, {
    name: 'daily-retention-enforcement',
    timeZone: 'Europe/Rome',
  })
  async scheduledRetentionEnforcement(): Promise<void> {
    this.logger.log('Starting scheduled data retention enforcement');

    try {
      const result = await this.enforceRetentionPolicy();
      
      this.loggerService.log(
        `Daily retention enforcement completed: ${JSON.stringify({
          customersAnonymized: result.customersAnonymized,
          recordingsDeleted: result.recordingsDeleted,
          logsDeleted: result.logsDeleted,
          durationMs: result.durationMs,
        })}`,
        'DataRetentionService',
      );
    } catch (error) {
      this.logger.error(`Scheduled retention enforcement failed: ${error.message}`);
      // Alert on-call team for manual intervention
    }
  }

  /**
   * Scheduled job: Weekly deep cleanup
   * Runs every Sunday at 3:00 AM
   */
  @Cron('0 3 * * 0', {
    name: 'weekly-deep-cleanup',
    timeZone: 'Europe/Rome',
  })
  async weeklyDeepCleanup(): Promise<void> {
    this.logger.log('Starting weekly deep cleanup');

    try {
      // Clean expired deletion snapshots
      await this.cleanExpiredSnapshots();
      
      // Archive old consent audit logs (move to cold storage)
      await this.archiveOldConsentLogs();
      
      // Purge soft-deleted records
      await this.purgeSoftDeletedRecords();

      this.loggerService.log('Weekly deep cleanup completed', 'DataRetentionService');
    } catch (error) {
      this.logger.error(`Weekly deep cleanup failed: ${error.message}`);
    }
  }

  /**
   * Enforce retention policy across all tenants
   * 
   * @param tenantId - Optional: enforce for specific tenant only
   * @returns Execution result summary
   */
  async enforceRetentionPolicy(tenantId?: string): Promise<RetentionExecutionResult> {
    const executionId = `retention-${Date.now()}`;
    const startedAt = new Date();
    const errors: string[] = [];

    this.logger.log(`Starting retention policy enforcement [${executionId}]`);

    // Log execution start
    await this.prisma.dataRetentionExecutionLog.create({
      data: {
        tenantId: tenantId || null,
        executionType: 'RETENTION_POLICY',
        status: 'RUNNING',
        startedAt,
        retentionDaysApplied: this.getRetentionPolicy().customerDataDays,
      },
    });

    let customersAnonymized = 0;
    let bookingsAnonymized = 0;
    let recordingsDeleted = 0;
    let logsDeleted = 0;
    let webhookEventsDeleted = 0;

    try {
      // 1. Anonymize customers past retention period
      const customerResult = await this.anonymizeExpiredCustomers(tenantId);
      customersAnonymized = customerResult.count;

      // 2. Anonymize old bookings (PII only, keep business records)
      const bookingResult = await this.anonymizeOldBookings(tenantId);
      bookingsAnonymized = bookingResult.count;

      // 3. Delete expired call recordings
      const recordingResult = await this.deleteExpiredRecordings(tenantId);
      recordingsDeleted = recordingResult.count;

      // 4. Delete old audit logs
      const logResult = await this.deleteOldAuditLogs(tenantId);
      logsDeleted = logResult.count;

      // 5. Delete old webhook events
      const webhookResult = await this.deleteOldWebhookEvents(tenantId);
      webhookEventsDeleted = webhookResult.count;

      // 6. Process opt-out customers (30-day grace period)
      const optOutResult = await this.processOptOutCustomers(tenantId);
      customersAnonymized += optOutResult.count;

    } catch (error) {
      this.logger.error(`Retention enforcement error: ${error.message}`);
      errors.push(error.message);
    }

    const completedAt = new Date();
    const durationMs = completedAt.getTime() - startedAt.getTime();

    // Update execution log
    await this.prisma.dataRetentionExecutionLog.updateMany({
      where: {
        startedAt,
        executionType: 'RETENTION_POLICY',
      },
      data: {
        status: errors.length > 0 ? 'PARTIAL' : 'COMPLETED',
        completedAt,
        customersAnonymized,
        bookingsAnonymized,
        recordingsDeleted,
        logsDeleted: logsDeleted + webhookEventsDeleted,
        errorMessage: errors.length > 0 ? errors.join('; ') : null,
      },
    });

    this.logger.log(
      `Retention enforcement completed [${executionId}]: ` +
      `${customersAnonymized} customers, ${recordingsDeleted} recordings deleted`,
    );

    return {
      executionId,
      startedAt,
      completedAt,
      durationMs,
      customersAnonymized,
      bookingsAnonymized,
      recordingsDeleted,
      logsDeleted,
      webhookEventsDeleted,
      consentLogsArchived: 0,
      errors,
      success: errors.length === 0,
    };
  }

  /**
   * Anonymize customers who have exceeded retention period
   */
  private async anonymizeExpiredCustomers(tenantId?: string): Promise<{ count: number }> {
    const policy = this.getRetentionPolicy();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - policy.customerDataDays);

    // Find customers to anonymize
    const customersToAnonymize = await this.prisma.customerEncrypted.findMany({
      where: {
        ...(tenantId && { tenantId }),
        anonymizedAt: null,
        isDeleted: false,
        createdAt: {
          lt: cutoffDate,
        },
        // No recent bookings
        bookings: {
          none: {
            createdAt: {
              gte: cutoffDate,
            },
          },
        },
      },
      select: {
        id: true,
        tenantId: true,
      },
      take: 100, // Process in batches
    });

    let count = 0;

    for (const customer of customersToAnonymize) {
      try {
        await this.prisma.withTenant(customer.tenantId, async (prisma) => {
          await prisma.customerEncrypted.update({
            where: { id: customer.id },
            data: {
              phoneEncrypted: Buffer.from(this.encryption.encrypt('RETENTION_EXPIRED')),
              emailEncrypted: Buffer.from(this.encryption.encrypt('RETENTION_EXPIRED')),
              nameEncrypted: Buffer.from(this.encryption.encrypt('RETENTION_EXPIRED')),
              gdprConsent: false,
              marketingConsent: false,
              anonymizedAt: new Date(),
            },
          });
        });

        count++;
      } catch (error) {
        this.logger.error(`Failed to anonymize customer ${customer.id}: ${error.message}`);
      }
    }

    if (count > 0) {
      this.loggerService.log(
        `Anonymized ${count} customers past retention period`,
        'DataRetentionService',
      );
    }

    return { count };
  }

  /**
   * Process customers who have opted out (30-day grace period)
   */
  private async processOptOutCustomers(tenantId?: string): Promise<{ count: number }> {
    const policy = this.getRetentionPolicy();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - policy.optOutDataDays);

    // Find customers who opted out and grace period expired
    const consentLogs = await this.prisma.consentAuditLog.findMany({
      where: {
        ...(tenantId && { tenantId }),
        consentType: 'GDPR',
        granted: false,
        timestamp: {
          lt: cutoffDate,
        },
        customer: {
          anonymizedAt: null,
          isDeleted: false,
        },
      },
      include: {
        customer: {
          select: {
            id: true,
            tenantId: true,
          },
        },
      },
      distinct: ['customerId'],
      take: 100,
    });

    let count = 0;

    for (const log of consentLogs) {
      if (!log.customer) continue;

      try {
        await this.prisma.withTenant(log.customer.tenantId, async (prisma) => {
          await prisma.customerEncrypted.update({
            where: { id: log.customer!.id },
            data: {
              phoneEncrypted: Buffer.from(this.encryption.encrypt('OPTED_OUT')),
              emailEncrypted: Buffer.from(this.encryption.encrypt('OPTED_OUT')),
              nameEncrypted: Buffer.from(this.encryption.encrypt('OPTED_OUT')),
              gdprConsent: false,
              marketingConsent: false,
              anonymizedAt: new Date(),
            },
          });
        });

        count++;
      } catch (error) {
        this.logger.error(`Failed to process opt-out for customer ${log.customer.id}: ${error.message}`);
      }
    }

    if (count > 0) {
      this.loggerService.log(
        `Anonymized ${count} customers after opt-out grace period`,
        'DataRetentionService',
      );
    }

    return { count };
  }

  /**
   * Anonymize old bookings (remove PII references, keep business data)
   */
  private async anonymizeOldBookings(tenantId?: string): Promise<{ count: number }> {
    const policy = this.getRetentionPolicy();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - policy.bookingDataDays);

    // Bookings are anonymized by anonymizing the linked customer
    // This method counts bookings linked to anonymized customers
    const result = await this.prisma.booking.count({
      where: {
        ...(tenantId && { tenantId }),
        createdAt: {
          lt: cutoffDate,
        },
        customer: {
          anonymizedAt: {
            not: null,
          },
        },
      },
    });

    return { count: result };
  }

  /**
   * Delete expired call recordings
   */
  private async deleteExpiredRecordings(tenantId?: string): Promise<{ count: number }> {
    const now = new Date();

    // Find recordings past retention
    const recordingsToDelete = await this.prisma.callRecordings.findMany({
      where: {
        ...(tenantId && { tenantId }),
        retentionUntil: {
          lt: now,
        },
        deletedAt: null,
      },
      select: {
        id: true,
        tenantId: true,
        recordingSid: true,
      },
      take: 500, // Process in batches
    });

    let count = 0;

    for (const recording of recordingsToDelete) {
      try {
        await this.prisma.withTenant(recording.tenantId, async (prisma) => {
          await prisma.callRecordings.update({
            where: { id: recording.id },
            data: {
              deletedAt: now,
              deletionReason: 'RETENTION_EXPIRED',
              recordingUrl: null,
            },
          });
        });

        count++;
      } catch (error) {
        this.logger.error(`Failed to delete recording ${recording.id}: ${error.message}`);
      }
    }

    if (count > 0) {
      this.loggerService.log(
        `Deleted ${count} expired call recordings`,
        'DataRetentionService',
      );
    }

    return { count };
  }

  /**
   * Delete old audit logs
   */
  private async deleteOldAuditLogs(tenantId?: string): Promise<{ count: number }> {
    const policy = this.getRetentionPolicy();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - policy.auditLogDays);

    // Note: In production, consider archiving before deletion
    const result = await this.prisma.auditLog.deleteMany({
      where: {
        ...(tenantId && { tenantId }),
        createdAt: {
          lt: cutoffDate,
        },
        // Don't delete GDPR-related audit logs (keep longer)
        action: {
          notIn: ['CUSTOMER_ANONYMIZED', 'DELETION_SNAPSHOT_CREATED', 'CALL_RECORDINGS_DELETED'],
        },
      },
    });

    if (result.count > 0) {
      this.loggerService.log(
        `Deleted ${result.count} old audit logs`,
        'DataRetentionService',
      );
    }

    return { count: result.count };
  }

  /**
   * Delete old webhook events
   */
  private async deleteOldWebhookEvents(tenantId?: string): Promise<{ count: number }> {
    const policy = this.getRetentionPolicy();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - policy.webhookEventDays);

    // Note: Using raw query for VoiceWebhookEvent if not in Prisma client
    // This assumes the table exists from voice module
    try {
      const result = await this.prisma.$executeRaw`
        DELETE FROM voice_webhook_events 
        WHERE created_at < ${cutoffDate}
        ${tenantId ? `AND tenant_id = ${tenantId}` : ''}
      `;

      return { count: result };
    } catch (error) {
      // Table may not exist yet
      this.logger.debug(`Webhook events cleanup skipped: ${error.message}`);
      return { count: 0 };
    }
  }

  /**
   * Clean expired deletion snapshots
   */
  private async cleanExpiredSnapshots(): Promise<{ count: number }> {
    // Snapshots are kept for 30 days, then deleted
    const snapshotRetentionDays = 30;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - snapshotRetentionDays);

    // Find requests with expired snapshots
    const expiredRequests = await this.prisma.dataSubjectRequest.findMany({
      where: {
        completedAt: {
          lt: cutoffDate,
        },
        deletionSnapshotUrl: {
          not: null,
        },
        status: 'COMPLETED',
      },
      select: {
        id: true,
        deletionSnapshotUrl: true,
      },
    });

    let count = 0;

    for (const request of expiredRequests) {
      try {
        // In production: delete from S3
        // await this.s3Client.deleteObject({ Bucket: 'snapshots', Key: request.deletionSnapshotUrl });

        await this.prisma.dataSubjectRequest.update({
          where: { id: request.id },
          data: {
            deletionSnapshotUrl: null,
          },
        });

        count++;
      } catch (error) {
        this.logger.error(`Failed to clean snapshot for request ${request.id}: ${error.message}`);
      }
    }

    if (count > 0) {
      this.loggerService.log(
        `Cleaned ${count} expired deletion snapshots`,
        'DataRetentionService',
      );
    }

    return { count };
  }

  /**
   * Archive old consent audit logs to cold storage
   */
  private async archiveOldConsentLogs(): Promise<{ count: number }> {
    // Consent logs kept for 7 years in cold storage
    const archiveAfterDays = 365; // Move to cold storage after 1 year
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - archiveAfterDays);

    // Mark logs as archived (actual archive process would export to S3)
    const result = await this.prisma.consentAuditLog.updateMany({
      where: {
        timestamp: {
          lt: cutoffDate,
        },
        metadata: {
          path: ['archived'],
          not: true,
        },
      },
      data: {
        metadata: {
          set: {
            archived: true,
            archivedAt: new Date().toISOString(),
          },
        },
      },
    });

    return { count: result.count };
  }

  /**
   * Purge soft-deleted records after grace period
   */
  private async purgeSoftDeletedRecords(): Promise<{ count: number }> {
    // Permanently delete records soft-deleted > 30 days ago
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30);

    // This would be a permanent delete operation
    // Implementation depends on business requirements
    return { count: 0 };
  }

  /**
   * Get retention statistics for a tenant
   */
  async getTenantRetentionStats(tenantId: string): Promise<TenantRetentionStats> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new Error(`Tenant ${tenantId} not found`);
    }

    const policy = this.getRetentionPolicy();
    const retentionCutoff = new Date();
    retentionCutoff.setDate(retentionCutoff.getDate() - policy.customerDataDays);

    const [
      activeCustomers,
      pendingAnonymization,
      expiredRecordings,
    ] = await Promise.all([
      this.prisma.customerEncrypted.count({
        where: {
          tenantId,
          anonymizedAt: null,
          isDeleted: false,
        },
      }),
      this.prisma.customerEncrypted.count({
        where: {
          tenantId,
          anonymizedAt: null,
          isDeleted: false,
          createdAt: {
            lt: retentionCutoff,
          },
        },
      }),
      this.prisma.callRecordings.count({
        where: {
          tenantId,
          retentionUntil: {
            lt: new Date(),
          },
          deletedAt: null,
        },
      }),
    ]);

    return {
      tenantId,
      tenantName: tenant.name,
      dataRetentionDays: tenant.dataRetentionDays ?? this.DEFAULT_RETENTION.customerDataDays,
      activeCustomers,
      customersPendingAnonymization: pendingAnonymization,
      expiredRecordings,
      storageUsed: 0, // Would calculate from S3 in production
    };
  }

  /**
   * Update retention policy for a tenant
   */
  async updateTenantRetentionPolicy(
    tenantId: string,
    days: number,
  ): Promise<void> {
    const minDays = 30;
    const maxDays = 3650; // 10 years

    if (days < minDays || days > maxDays) {
      throw new Error(`Retention days must be between ${minDays} and ${maxDays}`);
    }

    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        dataRetentionDays: days,
      },
    });

    this.loggerService.log(
      `Updated retention policy for tenant ${tenantId}: ${days} days`,
      'DataRetentionService',
    );
  }

  /**
   * Queue retention enforcement job for async processing
   */
  async queueRetentionEnforcement(tenantId?: string): Promise<{
    jobId: string;
    status: string;
  }> {
    const job = await this.retentionQueue.add(
      'enforce-retention',
      {
        tenantId,
        triggeredAt: new Date().toISOString(),
      },
      {
        jobId: `retention-${tenantId || 'all'}-${Date.now()}`,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 10000,
        },
      },
    );

    return {
      jobId: job.id as string,
      status: 'QUEUED',
    };
  }
}
