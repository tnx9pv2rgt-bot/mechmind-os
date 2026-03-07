// ============================================================================
// GDPR Module - Public API
// ============================================================================

// Module
export { GdprModule } from './gdpr.module';

// Services
export { 
  GdprDeletionService,
  DeletionJobPayload,
  DeletionSnapshot,
  AnonymizationResult,
  RecordingDeletionResult,
} from './services/gdpr-deletion.service';

export {
  DataRetentionService,
  RetentionPolicy,
  RetentionExecutionResult,
  TenantRetentionStats,
} from './services/data-retention.service';

export {
  GdprConsentService,
  ConsentRecord,
  ConsentAuditEntry,
  CustomerConsentStatus,
} from './services/gdpr-consent.service';

export {
  GdprExportService,
  CustomerDataExport,
  DataPortabilityExport,
  ExportJobResult,
  ExportFormat,
} from './services/gdpr-export.service';

export {
  GdprRequestService,
  DataSubjectRequestType,
  RequestStatus,
  RequestPriority,
  CreateDataSubjectRequestDto,
  DataSubjectRequestResponse,
  RequestStatistics,
  VerificationResult,
} from './services/gdpr-request.service';

export {
  AuditLogService,
  AuditLogEntry,
  AuditLogQuery,
  PaginationOptions,
  PaginatedAuditLogResult,
  AuditLogStats,
} from './services/audit-log.service';

// Controllers
export { GdprController } from './controllers/gdpr.controller';
export { GdprWebhookController } from './controllers/gdpr-webhook.controller';

// Processors
export { GdprDeletionProcessor } from './processors/gdpr-deletion.processor';
export { DataRetentionProcessor } from './processors/data-retention.processor';

// DTOs
export {
  CreateDataSubjectRequestDto,
  UpdateRequestStatusDto,
  VerifyIdentityDto,
  CreateConsentDto,
  QueueDeletionDto,
  ExportRequestDto,
  UpdateRetentionPolicyDto,
  DataRectificationDto,
  GdprWebhookPayloadDto,
} from './dto/gdpr.dto';
