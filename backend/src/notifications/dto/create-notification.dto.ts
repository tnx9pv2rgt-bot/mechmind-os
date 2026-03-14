/**
 * Create Notification DTO
 * Data transfer object for creating notifications
 */

import { IsString, IsEnum, IsOptional, IsObject, IsNumber, IsUUID } from 'class-validator';
import { NotificationType, NotificationChannel } from '@prisma/client';

export class CreateNotificationDto {
  @IsUUID()
  customerId: string;

  @IsUUID()
  tenantId: string;

  @IsEnum(NotificationType)
  type: NotificationType;

  @IsEnum(NotificationChannel)
  channel: NotificationChannel;

  @IsString()
  @IsOptional()
  message?: string;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;

  @IsNumber()
  @IsOptional()
  maxRetries?: number;
}

export class SendNotificationDto extends CreateNotificationDto {
  @IsString()
  @IsOptional()
  customerPhone?: string;

  @IsString()
  @IsOptional()
  customerName?: string;
}

export class UpdatePreferenceDto {
  @IsUUID()
  customerId: string;

  @IsEnum(NotificationChannel)
  channel: NotificationChannel;

  @IsString()
  enabled: boolean;
}

export class PreviewTemplateDto {
  @IsString()
  type: string;

  @IsString()
  language: string;

  @IsObject()
  variables: Record<string, string>;
}
