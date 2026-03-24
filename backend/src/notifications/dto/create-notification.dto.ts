/**
 * Create Notification DTO
 * Data transfer object for creating notifications
 */

import { IsString, IsEnum, IsOptional, IsObject, IsNumber, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationType, NotificationChannel } from '@prisma/client';

export class CreateNotificationDto {
  @ApiProperty({
    description: 'ID del cliente destinatario',
    example: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
  })
  @IsUUID()
  customerId: string;

  @ApiProperty({ description: 'ID del tenant', example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @IsUUID()
  tenantId: string;

  @ApiProperty({
    description: 'Tipo di notifica',
    enum: NotificationType,
    example: 'BOOKING_CONFIRMATION',
  })
  @IsEnum(NotificationType)
  type: NotificationType;

  @ApiProperty({ description: 'Canale di invio', enum: NotificationChannel, example: 'EMAIL' })
  @IsEnum(NotificationChannel)
  channel: NotificationChannel;

  @ApiPropertyOptional({
    description: 'Messaggio della notifica',
    example: 'La tua prenotazione è confermata per il 15/03/2026',
  })
  @IsString()
  @IsOptional()
  message?: string;

  @ApiPropertyOptional({
    description: 'Metadati aggiuntivi',
    example: { bookingId: 'bk_123', service: 'Tagliando' },
  })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Numero massimo di tentativi', example: 3 })
  @IsNumber()
  @IsOptional()
  maxRetries?: number;
}

export class SendNotificationDto extends CreateNotificationDto {
  @ApiPropertyOptional({ description: 'Telefono del cliente', example: '+393331234567' })
  @IsString()
  @IsOptional()
  customerPhone?: string;

  @ApiPropertyOptional({ description: 'Nome del cliente', example: 'Mario Rossi' })
  @IsString()
  @IsOptional()
  customerName?: string;
}

export class UpdatePreferenceDto {
  @ApiProperty({ description: 'ID del cliente', example: 'b2c3d4e5-f6a7-8901-bcde-f12345678901' })
  @IsUUID()
  customerId: string;

  @ApiProperty({ description: 'Canale di notifica', enum: NotificationChannel, example: 'SMS' })
  @IsEnum(NotificationChannel)
  channel: NotificationChannel;

  @ApiProperty({ description: 'Abilitato', example: true })
  @IsString()
  enabled: boolean;
}

export class PreviewTemplateDto {
  @ApiProperty({ description: 'Tipo di template', example: 'booking_confirmation' })
  @IsString()
  type: string;

  @ApiProperty({ description: 'Lingua del template', example: 'it' })
  @IsString()
  language: string;

  @ApiProperty({
    description: 'Variabili del template',
    example: { customerName: 'Mario Rossi', date: '15/03/2026' },
  })
  @IsObject()
  variables: Record<string, string>;
}
