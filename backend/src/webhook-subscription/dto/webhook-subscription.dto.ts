import {
  IsString,
  IsOptional,
  IsArray,
  IsInt,
  IsBoolean,
  IsUrl,
  IsEnum,
  Min,
  Max,
  MinLength,
  ArrayMinSize,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

// ─── Enums ───

export const WEBHOOK_EVENTS = [
  // eslint-disable-next-line sonarjs/no-duplicate-string
  'booking.created',
  'booking.cancelled',
  'booking.confirmed',
  'invoice.paid',
  'estimate.approved',
  'work_order.completed',
  'work_order.invoiced',
] as const;
export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];

// ─── Create DTO ───

export class CreateWebhookSubscriptionDto {
  @ApiProperty({
    description: 'HTTPS endpoint del cliente',
    example: 'https://client.example.com/webhooks',
  })
  @IsString()
  @IsUrl({ require_protocol: true, require_tld: false, protocols: ['https'] })
  url: string;

  @ApiProperty({
    description: 'Eventi da sottoscrivere',
    enum: WEBHOOK_EVENTS,
    example: ['booking.created', 'invoice.paid'],
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsEnum(WEBHOOK_EVENTS, { each: true })
  events: WebhookEvent[];

  @ApiProperty({
    description: 'Segreto HMAC per firma payload (minimo 16 caratteri)',
    example: 'supersecretkey1234',
  })
  @IsString()
  @MinLength(16)
  secret: string;
}

// ─── Update DTO ───

export class UpdateWebhookSubscriptionDto {
  @ApiPropertyOptional({
    description: 'HTTPS endpoint del cliente',
    example: 'https://client.example.com/webhooks',
  })
  @IsOptional()
  @IsString()
  @IsUrl({ require_protocol: true, require_tld: false, protocols: ['https'] })
  url?: string;

  @ApiPropertyOptional({
    description: 'Eventi da sottoscrivere',
    enum: WEBHOOK_EVENTS,
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsEnum(WEBHOOK_EVENTS, { each: true })
  events?: WebhookEvent[];

  @ApiPropertyOptional({
    description: 'Segreto HMAC per firma payload (minimo 16 caratteri)',
  })
  @IsOptional()
  @IsString()
  @MinLength(16)
  secret?: string;

  @ApiPropertyOptional({
    description: 'Attiva/disattiva la sottoscrizione',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

// ─── Test Payload DTO ───

export class TestWebhookPayloadDto {
  @ApiProperty({
    description: 'ID della sottoscrizione',
    example: 'webhook-uuid-001',
  })
  @IsString()
  id: string;

  @ApiProperty({
    description: 'Evento da testare',
    enum: WEBHOOK_EVENTS,
    example: 'booking.created',
  })
  @IsEnum(WEBHOOK_EVENTS)
  event: WebhookEvent;
}

// ─── Query DTO ───

export class WebhookSubscriptionQueryDto {
  @ApiPropertyOptional({
    description: 'Filtra per stato attivo',
    example: true,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Filtra per evento',
    enum: WEBHOOK_EVENTS,
    example: 'booking.created',
  })
  @IsOptional()
  @IsEnum(WEBHOOK_EVENTS)
  event?: WebhookEvent;

  @ApiPropertyOptional({ description: 'Pagina', example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: 'Elementi per pagina', example: 20, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
