import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsUUID,
  IsOptional,
  IsEnum,
  IsObject,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum VapiEventType {
  CALL_COMPLETED = 'call_completed',
  MESSAGE = 'message',
  TRANSFER_REQUESTED = 'transfer_requested',
  CALL_STARTED = 'call_started',
  CALL_UPDATED = 'call_updated',
}

export enum VoiceIntent {
  BOOKING = 'booking',
  STATUS_CHECK = 'status_check',
  COMPLAINT = 'complaint',
  OTHER = 'other',
}

export class ExtractedDataDto {
  @ApiPropertyOptional({ example: '2024-01-15' })
  @IsOptional()
  @IsString()
  preferredDate?: string;

  @ApiPropertyOptional({ example: '09:00' })
  @IsOptional()
  @IsString()
  preferredTime?: string;

  @ApiPropertyOptional({ example: 'Oil change' })
  @IsOptional()
  @IsString()
  serviceType?: string;

  @ApiPropertyOptional({ example: 'ABC123' })
  @IsOptional()
  @IsString()
  licensePlate?: string;

  @ApiPropertyOptional({ example: 'Engine making noise' })
  @IsOptional()
  @IsString()
  issueDescription?: string;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  @IsOptional()
  @IsObject()
  additionalData?: Record<string, any>;
}

export class VapiWebhookDto {
  @ApiProperty({
    description: 'Event type',
    enum: VapiEventType,
    example: VapiEventType.CALL_COMPLETED,
  })
  @IsEnum(VapiEventType)
  event: VapiEventType;

  @ApiProperty({
    description: 'Call ID from Vapi',
    example: 'call_abc123xyz',
  })
  @IsString()
  callId: string;

  @ApiProperty({
    description: 'Customer phone number',
    example: '+390123456789',
  })
  @IsString()
  customerPhone: string;

  @ApiProperty({
    description: 'Tenant ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  tenantId: string;

  @ApiPropertyOptional({
    description: 'Call transcript',
    example: 'Customer: I need to book a service...',
  })
  @IsOptional()
  @IsString()
  transcript?: string;

  @ApiPropertyOptional({
    description: 'Detected intent',
    enum: VoiceIntent,
    example: VoiceIntent.BOOKING,
  })
  @IsOptional()
  @IsEnum(VoiceIntent)
  intent?: VoiceIntent;

  @ApiPropertyOptional({
    description: 'Extracted data from conversation',
    type: ExtractedDataDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ExtractedDataDto)
  extractedData?: ExtractedDataDto;

  @ApiPropertyOptional({
    description: 'Call duration in seconds',
    example: 120,
  })
  @IsOptional()
  duration?: number;

  @ApiPropertyOptional({
    description: 'Recording URL',
    example: 'https://cdn.vapi.ai/recordings/rec_123.mp3',
  })
  @IsOptional()
  @IsString()
  recordingUrl?: string;

  @ApiPropertyOptional({
    description: 'Additional metadata',
    type: 'object',
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class VoiceWebhookResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Webhook processed successfully' })
  message: string;

  @ApiPropertyOptional({
    description: 'Action taken',
    example: 'booking_created',
  })
  action?: string;

  @ApiPropertyOptional({
    description: 'Booking ID if created',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  bookingId?: string;

  @ApiPropertyOptional({
    description: 'Escalation info if escalated',
    type: 'object',
  })
  escalation?: {
    escalated: boolean;
    reason: string;
    agentId?: string;
  };
}

export class TransferRequestDto {
  @ApiProperty({ example: 'call_abc123xyz' })
  @IsString()
  callId: string;

  @ApiProperty({ example: '+390123456789' })
  @IsString()
  customerPhone: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsUUID()
  tenantId: string;

  @ApiProperty({ example: 'Customer requests to speak with manager' })
  @IsString()
  reason: string;

  @ApiPropertyOptional({ example: 'booking_issue' })
  @IsOptional()
  @IsString()
  category?: string;
}
