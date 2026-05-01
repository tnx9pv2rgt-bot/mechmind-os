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
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Create Data Subject Request DTO
 */
export class CreateDataSubjectRequestDto {
  // eslint-disable-next-line sonarjs/no-duplicate-string
  @ApiProperty({ description: 'ID del tenant', example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @IsUUID()
  tenantId: string;

  @ApiProperty({
    description: 'Tipo di richiesta GDPR',
    enum: ['ACCESS', 'DELETION', 'RECTIFICATION', 'PORTABILITY', 'RESTRICTION', 'OBJECTION'],
    example: 'ACCESS',
  })
  @IsEnum(['ACCESS', 'DELETION', 'RECTIFICATION', 'PORTABILITY', 'RESTRICTION', 'OBJECTION'])
  requestType: string;

  @ApiPropertyOptional({ description: 'Email del richiedente', example: 'mario.rossi@example.com' })
  @IsOptional()
  @IsEmail()
  requesterEmail?: string;

  @ApiPropertyOptional({ description: 'Telefono del richiedente', example: '+393331234567' })
  @IsOptional()
  @IsString()
  requesterPhone?: string;

  @ApiPropertyOptional({
    description: 'ID del cliente associato',
    example: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
  })
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @ApiPropertyOptional({
    description: 'Priorità della richiesta',
    enum: ['LOW', 'NORMAL', 'HIGH', 'URGENT'],
    example: 'NORMAL',
  })
  @IsOptional()
  @IsEnum(['LOW', 'NORMAL', 'HIGH', 'URGENT'])
  priority?: string;

  @ApiPropertyOptional({
    description: 'Note aggiuntive',
    example: 'Richiesta di accesso ai dati personali',
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    description: 'Metadati aggiuntivi',
    example: { source: 'customer_portal' },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

/**
 * Update Request Status DTO
 */
export class UpdateRequestStatusDto {
  @ApiProperty({
    description: 'Nuovo stato della richiesta',
    enum: [
      'RECEIVED',
      'VERIFICATION_PENDING',
      'VERIFIED',
      'IN_PROGRESS',
      'COMPLETED',
      'REJECTED',
      'CANCELLED',
    ],
    example: 'IN_PROGRESS',
  })
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

  @ApiPropertyOptional({ description: 'Note sullo stato', example: 'Verifica identità completata' })
  @IsOptional()
  @IsString()
  notes?: string;
}

/**
 * Verify Identity DTO
 */
export class VerifyIdentityDto {
  @ApiProperty({ description: 'Metodo di verifica identità', example: 'document_upload' })
  @IsString()
  method: string;

  @ApiPropertyOptional({ description: 'Documenti di verifica', example: ['carta_identita.pdf'] })
  @IsOptional()
  documents?: string[];

  @ApiPropertyOptional({ description: "ID dell'operatore che ha verificato", example: 'admin_001' })
  @IsOptional()
  @IsString()
  verifiedBy?: string;
}

/**
 * Create Consent DTO
 */
export class CreateConsentDto {
  @ApiProperty({
    description: 'Tipo di consenso',
    enum: ['GDPR', 'MARKETING', 'CALL_RECORDING', 'DATA_SHARING', 'THIRD_PARTY', 'ANALYTICS'],
    example: 'GDPR',
  })
  @IsEnum(['GDPR', 'MARKETING', 'CALL_RECORDING', 'DATA_SHARING', 'THIRD_PARTY', 'ANALYTICS'])
  consentType: string;

  @ApiProperty({ description: 'Consenso concesso', example: true })
  @IsBoolean()
  granted: boolean;

  @ApiPropertyOptional({ description: 'Metodo di raccolta del consenso', example: 'web_form' })
  @IsOptional()
  @IsString()
  collectionMethod?: string;

  @ApiPropertyOptional({
    description: 'Punto di raccolta del consenso',
    example: 'registration_page',
  })
  @IsOptional()
  @IsString()
  collectionPoint?: string;

  @ApiPropertyOptional({ description: 'Base legale del trattamento', example: 'Art. 6(1)(a) GDPR' })
  @IsOptional()
  @IsString()
  legalBasis?: string;

  @ApiPropertyOptional({ description: 'Identità verificata', example: false })
  @IsOptional()
  @IsBoolean()
  verifiedIdentity?: boolean;

  @ApiPropertyOptional({ description: 'Metadati aggiuntivi', example: { ip: '192.168.1.1' } })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

/**
 * Queue Deletion DTO
 */
export class QueueDeletionDto {
  @ApiProperty({
    description: 'ID della richiesta di cancellazione',
    example: 'c3d4e5f6-a7b8-9012-cdef-234567890abc',
  })
  @IsUUID()
  requestId: string;

  @ApiProperty({
    description: 'Motivo della cancellazione',
    example: 'Richiesta del cliente ai sensi Art. 17 GDPR',
  })
  @IsString()
  reason: string;

  @ApiPropertyOptional({
    description: 'Metodo di verifica utilizzato',
    example: 'email_confirmation',
  })
  @IsOptional()
  @IsString()
  verificationMethod?: string;
}

/**
 * Export Request DTO
 */
export class ExportRequestDto {
  @ApiProperty({
    description: 'Formato di esportazione',
    enum: ['JSON', 'CSV', 'PDF'],
    example: 'JSON',
  })
  @IsEnum(['JSON', 'CSV', 'PDF'])
  format: string;

  @ApiPropertyOptional({
    description: 'ID della richiesta associata',
    example: 'd4e5f6a7-b8c9-0123-def4-567890abcdef',
  })
  @IsOptional()
  @IsUUID()
  requestId?: string;
}

/**
 * Retention Policy Update DTO
 */
export class UpdateRetentionPolicyDto {
  @ApiProperty({ description: 'ID del tenant', example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @IsString()
  tenantId: string;

  @ApiProperty({ description: 'Tipo di dato soggetto a retention', example: 'customer_data' })
  @IsString()
  dataType: string;

  @ApiProperty({ description: 'Giorni di conservazione', example: 365 })
  days: number;
}

/**
 * Data Rectification DTO (Art. 16)
 */
export class DataRectificationDto {
  @ApiProperty({ description: 'ID del cliente', example: 'b2c3d4e5-f6a7-8901-bcde-f12345678901' })
  @IsUUID()
  customerId: string;

  @ApiProperty({ description: 'ID del tenant', example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @IsUUID()
  tenantId: string;

  @ApiProperty({
    description: 'Modifiche ai dati da rettificare',
    example: { email: 'nuovo@example.com' },
  })
  @IsObject()
  changes: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Motivo della rettifica', example: 'Indirizzo email errato' })
  @IsOptional()
  @IsString()
  reason?: string;
}

/**
 * GDPR Webhook Payload DTO
 */
export class GdprWebhookPayloadDto {
  @ApiProperty({ description: 'Tipo di evento webhook', example: 'data_deletion_completed' })
  @IsString()
  event: string;

  @ApiProperty({ description: "Timestamp dell'evento (ISO 8601)", example: '2026-03-16T10:30:00Z' })
  @IsDateString()
  timestamp: string;

  @ApiProperty({
    description: "Dati dell'evento",
    example: { requestId: 'req_123', status: 'completed' },
  })
  @IsObject()
  data: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Firma HMAC per verifica',
    example: 'sha256=abc123def456...',
  })
  @IsOptional()
  @IsString()
  signature?: string;
}
