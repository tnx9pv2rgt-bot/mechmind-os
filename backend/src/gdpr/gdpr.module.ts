import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { ScheduleModule } from '@nestjs/schedule';
import { CommonModule } from '@common/common.module';
import { CustomerModule } from '@customer/customer.module';

// Services
import { GdprDeletionService } from './services/gdpr-deletion.service';
import { DataRetentionService } from './services/data-retention.service';
import { GdprConsentService } from './services/gdpr-consent.service';
import { GdprExportService } from './services/gdpr-export.service';
import { GdprRequestService } from './services/gdpr-request.service';
import { AuditLogService } from './services/audit-log.service';

// Controllers
import { GdprController } from './controllers/gdpr.controller';
import { GdprWebhookController } from './controllers/gdpr-webhook.controller';

// Processors
import { GdprDeletionProcessor } from './processors/gdpr-deletion.processor';
import { DataRetentionProcessor } from './processors/data-retention.processor';

/**
 * GDPR Compliance Module for MechMind OS v10
 * 
 * This module provides comprehensive GDPR compliance functionality:
 * - Data subject request handling (Access, Deletion, Rectification, Portability)
 * - Automated data retention enforcement
 * - Consent management and audit logging
 * - Right to erasure (Art. 17) with BullMQ job processing
 * - Data export capabilities (Art. 15, 20)
 * - Breach notification workflows
 * 
 * @module GdprModule
 */
@Module({
  imports: [
    ConfigModule,
    CommonModule,
    CustomerModule,
    ScheduleModule.forRoot(),
    BullModule.registerQueue(
      {
        name: 'gdpr-deletion',
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
          removeOnComplete: 100,
          removeOnFail: 50,
        },
      },
      {
        name: 'gdpr-retention',
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 10000,
          },
          removeOnComplete: 50,
          removeOnFail: 25,
        },
      },
      {
        name: 'gdpr-export',
        defaultJobOptions: {
          attempts: 2,
          backoff: {
            type: 'fixed',
            delay: 5000,
          },
          removeOnComplete: 20,
          removeOnFail: 10,
        },
      },
    ),
  ],
  controllers: [
    GdprController,
    GdprWebhookController,
  ],
  providers: [
    // Core GDPR Services
    GdprDeletionService,
    DataRetentionService,
    GdprConsentService,
    GdprExportService,
    GdprRequestService,
    AuditLogService,
    
    // BullMQ Job Processors
    GdprDeletionProcessor,
    DataRetentionProcessor,
  ],
  exports: [
    GdprDeletionService,
    DataRetentionService,
    GdprConsentService,
    GdprExportService,
    GdprRequestService,
    AuditLogService,
  ],
})
export class GdprModule {}
