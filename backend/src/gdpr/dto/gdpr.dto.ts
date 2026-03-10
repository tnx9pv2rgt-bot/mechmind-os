import {
  IsString,
  IsUUID,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsEmail,
  IsObject,
  IsDateString,
} from 'class-validator';

/**
 * Create Data Subject Request DTO
 */
export class CreateDataSubjectRequestDto {
  @IsUUID()
  tenantId: string;

  @IsEnum(['ACCESS', 'DELETION', 'RECTIFICATION', 'PORTABILITY', 'RESTRICTION', 'OBJECTION'])
  requestType: string;

  @IsOptional()
  @IsEmail()
  requesterEmail?: string;

  @IsOptional()
  @IsString()
  requesterPhone?: string;

  @IsOptional()
  @IsUUID()
  customerId?: string;

  @IsOptional()
  @IsEnum(['LOW', 'NORMAL', 'HIGH', 'URGENT'])
  priority?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

/**
 * Update Request Status DTO
 */
export class UpdateRequestStatusDto {
  @IsEnum([
    'RECEIVED',
    'VERIFICATION_PENDING',
    'VERIFIED',
    'IN_PROGRESS',
    'COMPLETED',
    'REJECTED',
    'CANCELLED',
  ])
  status: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

/**
 * Verify Identity DTO
 */
export class VerifyIdentityDto {
  @IsString()
  method: string;

  @IsOptional()
  documents?: string[];

  @IsOptional()
  @IsString()
  verifiedBy?: string;
}

/**
 * Create Consent DTO
 */
export class CreateConsentDto {
  @IsEnum(['GDPR', 'MARKETING', 'CALL_RECORDING', 'DATA_SHARING', 'THIRD_PARTY', 'ANALYTICS'])
  consentType: string;

  @IsBoolean()
  granted: boolean;

  @IsOptional()
  @IsString()
  collectionMethod?: string;

  @IsOptional()
  @IsString()
  collectionPoint?: string;

  @IsOptional()
  @IsString()
  legalBasis?: string;

  @IsOptional()
  @IsBoolean()
  verifiedIdentity?: boolean;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

/**
 * Queue Deletion DTO
 */
export class QueueDeletionDto {
  @IsUUID()
  requestId: string;

  @IsString()
  reason: string;

  @IsOptional()
  @IsString()
  verificationMethod?: string;
}

/**
 * Export Request DTO
 */
export class ExportRequestDto {
  @IsEnum(['JSON', 'CSV', 'PDF'])
  format: string;

  @IsOptional()
  @IsUUID()
  requestId?: string;
}

/**
 * Retention Policy Update DTO
 */
export class UpdateRetentionPolicyDto {
  @IsString()
  tenantId: string;

  @IsString()
  dataType: string;

  days: number;
}

/**
 * Data Rectification DTO (Art. 16)
 */
export class DataRectificationDto {
  @IsUUID()
  customerId: string;

  @IsUUID()
  tenantId: string;

  @IsObject()
  changes: Record<string, any>;

  @IsOptional()
  @IsString()
  reason?: string;
}

/**
 * GDPR Webhook Payload DTO
 */
export class GdprWebhookPayloadDto {
  @IsString()
  event: string;

  @IsDateString()
  timestamp: string;

  @IsObject()
  data: Record<string, any>;

  @IsOptional()
  @IsString()
  signature?: string;
}
