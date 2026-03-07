import { IsString, IsOptional, IsEnum, IsObject, IsEmail, IsPhoneNumber, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum NotificationType {
  BOOKING_CONFIRMATION = 'booking_confirmation',
  BOOKING_REMINDER = 'booking_reminder',
  BOOKING_CANCELLED = 'booking_cancelled',
  INVOICE_READY = 'invoice_ready',
  GDPR_EXPORT_READY = 'gdpr_export_ready',
  WELCOME = 'welcome',
  PASSWORD_RESET = 'password_reset',
  CUSTOM = 'custom',
}

export enum NotificationChannel {
  SMS = 'sms',
  EMAIL = 'email',
  BOTH = 'both',
  AUTO = 'auto', // Try SMS first, fallback to Email
}

export enum NotificationPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}

// Base DTO
export class SendNotificationDto {
  @ApiProperty({
    description: 'Type of notification',
    enum: NotificationType,
    example: NotificationType.BOOKING_CONFIRMATION,
  })
  @IsEnum(NotificationType)
  type: NotificationType;

  @ApiProperty({
    description: 'Customer ID',
    example: 'cust_123456789',
  })
  @IsString()
  customerId: string;

  @ApiProperty({
    description: 'Tenant/Workshop ID',
    example: 'tenant_abc123',
  })
  @IsString()
  tenantId: string;

  @ApiProperty({
    description: 'Notification channel preference',
    enum: NotificationChannel,
    default: NotificationChannel.AUTO,
  })
  @IsEnum(NotificationChannel)
  channel: NotificationChannel = NotificationChannel.AUTO;

  @ApiPropertyOptional({
    description: 'Notification priority',
    enum: NotificationPriority,
    default: NotificationPriority.NORMAL,
  })
  @IsOptional()
  @IsEnum(NotificationPriority)
  priority?: NotificationPriority = NotificationPriority.NORMAL;

  @ApiProperty({
    description: 'Notification data/payload',
    example: {
      service: 'Tagliando',
      date: '2024-03-15',
      time: '14:30',
    },
  })
  @IsObject()
  data: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Override customer email',
    example: 'customer@example.com',
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({
    description: 'Override customer phone',
    example: '+393331234567',
  })
  @IsOptional()
  @IsPhoneNumber()
  phone?: string;

  @ApiPropertyOptional({
    description: 'Schedule notification for later (ISO 8601)',
    example: '2024-03-14T10:00:00Z',
  })
  @IsOptional()
  @IsString()
  scheduledAt?: string;

  @ApiPropertyOptional({
    description: 'Additional metadata',
    example: { source: 'booking_system', retry_count: 0 },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

// Booking Confirmation DTO
export class SendBookingConfirmationDto {
  @ApiProperty({ example: 'cust_123456789' })
  @IsString()
  customerId: string;

  @ApiProperty({ example: 'tenant_abc123' })
  @IsString()
  tenantId: string;

  @ApiProperty({ example: 'Mario Rossi' })
  @IsString()
  customerName: string;

  @ApiProperty({ example: 'mario.rossi@example.com' })
  @IsEmail()
  customerEmail: string;

  @ApiPropertyOptional({ example: '+393331234567' })
  @IsOptional()
  @IsPhoneNumber()
  customerPhone?: string;

  @ApiProperty({ example: 'Tagliando completo' })
  @IsString()
  service: string;

  @ApiProperty({ example: '2024-03-15' })
  @IsString()
  date: string;

  @ApiProperty({ example: '14:30' })
  @IsString()
  time: string;

  @ApiProperty({ example: 'Fiat Panda ABC123' })
  @IsString()
  vehicle: string;

  @ApiProperty({ example: 'BK-2024-001' })
  @IsString()
  bookingCode: string;

  @ApiPropertyOptional({ example: 'Controllare freni anteriori' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ enum: NotificationChannel, default: NotificationChannel.AUTO })
  @IsOptional()
  @IsEnum(NotificationChannel)
  channel?: NotificationChannel;
}

// Booking Reminder DTO
export class SendBookingReminderDto {
  @ApiProperty({ example: 'cust_123456789' })
  @IsString()
  customerId: string;

  @ApiProperty({ example: 'tenant_abc123' })
  @IsString()
  tenantId: string;

  @ApiProperty({ example: 'Mario Rossi' })
  @IsString()
  customerName: string;

  @ApiProperty({ example: 'mario.rossi@example.com' })
  @IsEmail()
  customerEmail: string;

  @ApiPropertyOptional({ example: '+393331234567' })
  @IsOptional()
  @IsPhoneNumber()
  customerPhone?: string;

  @ApiProperty({ example: 'Tagliando completo' })
  @IsString()
  service: string;

  @ApiProperty({ example: '2024-03-15' })
  @IsString()
  date: string;

  @ApiProperty({ example: '14:30' })
  @IsString()
  time: string;

  @ApiProperty({ example: 'Fiat Panda ABC123' })
  @IsString()
  vehicle: string;

  @ApiProperty({ example: 'BK-2024-001' })
  @IsString()
  bookingCode: string;

  @ApiPropertyOptional({ enum: ['24h', 'same_day'], default: '24h' })
  @IsOptional()
  @IsString()
  reminderType?: '24h' | 'same_day' = '24h';

  @ApiPropertyOptional({ enum: NotificationChannel, default: NotificationChannel.AUTO })
  @IsOptional()
  @IsEnum(NotificationChannel)
  channel?: NotificationChannel;
}

// Invoice Ready DTO
export class SendInvoiceReadyDto {
  @ApiProperty({ example: 'cust_123456789' })
  @IsString()
  customerId: string;

  @ApiProperty({ example: 'tenant_abc123' })
  @IsString()
  tenantId: string;

  @ApiProperty({ example: 'Mario Rossi' })
  @IsString()
  customerName: string;

  @ApiProperty({ example: 'mario.rossi@example.com' })
  @IsEmail()
  customerEmail: string;

  @ApiPropertyOptional({ example: '+393331234567' })
  @IsOptional()
  @IsPhoneNumber()
  customerPhone?: string;

  @ApiProperty({ example: 'INV-2024-001' })
  @IsString()
  invoiceNumber: string;

  @ApiProperty({ example: '2024-03-15' })
  @IsString()
  invoiceDate: string;

  @ApiProperty({ example: '250.00' })
  @IsString()
  amount: string;

  @ApiProperty({ example: 'https://mechmind.io/invoice/inv-2024-001' })
  @IsString()
  downloadUrl: string;

  @ApiPropertyOptional({ enum: NotificationChannel, default: NotificationChannel.AUTO })
  @IsOptional()
  @IsEnum(NotificationChannel)
  channel?: NotificationChannel;
}

// GDPR Export DTO
export class SendGdprExportDto {
  @ApiProperty({ example: 'cust_123456789' })
  @IsString()
  customerId: string;

  @ApiProperty({ example: 'Mario Rossi' })
  @IsString()
  customerName: string;

  @ApiProperty({ example: 'mario.rossi@example.com' })
  @IsEmail()
  customerEmail: string;

  @ApiProperty({ example: 'https://mechmind.io/gdpr/download/abc123' })
  @IsString()
  downloadUrl: string;

  @ApiProperty({ example: '2024-03-22' })
  @IsString()
  expiryDate: string;

  @ApiProperty({ example: 'GDPR-2024-001' })
  @IsString()
  requestId: string;
}

// Bulk Notification DTO
export class BulkNotificationDto {
  @ApiProperty({
    description: 'Array of notification requests',
    type: [SendNotificationDto],
  })
  @ValidateNested({ each: true })
  @Type(() => SendNotificationDto)
  notifications: SendNotificationDto[];

  @ApiPropertyOptional({
    description: 'Batch processing options',
    example: { throttleMs: 100, continueOnError: true },
  })
  @IsOptional()
  @IsObject()
  options?: {
    throttleMs?: number;
    continueOnError?: boolean;
  };
}

// Webhook DTOs for delivery status
export class EmailWebhookDto {
  @ApiProperty()
  @IsString()
  type: string;

  @ApiProperty()
  @IsObject()
  data: {
    email_id: string;
    from: string;
    to: string[];
    subject: string;
    created_at: string;
    status: string;
  };
}

export class SmsWebhookDto {
  @ApiProperty()
  @IsString()
  MessageSid: string;

  @ApiProperty()
  @IsString()
  MessageStatus: string;

  @ApiProperty()
  @IsString()
  To: string;

  @ApiProperty()
  @IsString()
  From: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ErrorCode?: string;
}

// Notification Status Response DTO
export class NotificationStatusDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: NotificationType })
  type: NotificationType;

  @ApiProperty({ enum: ['pending', 'sent', 'delivered', 'failed'] })
  status: string;

  @ApiProperty({ enum: NotificationChannel })
  channel: NotificationChannel;

  @ApiPropertyOptional()
  sentAt?: Date;

  @ApiPropertyOptional()
  deliveredAt?: Date;

  @ApiPropertyOptional()
  error?: string;

  @ApiPropertyOptional()
  metadata?: Record<string, any>;
}

// Notification Preferences DTO
export class NotificationPreferencesDto {
  @ApiProperty({ example: 'cust_123456789' })
  @IsString()
  customerId: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  bookingConfirmations?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  bookingReminders?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  invoiceNotifications?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  promotionalMessages?: boolean;

  @ApiPropertyOptional({ enum: NotificationChannel })
  @IsOptional()
  preferredChannel?: NotificationChannel;

  @ApiPropertyOptional({ example: 'it' })
  @IsOptional()
  @IsString()
  language?: string;
}

// Test Notification DTO
export class TestNotificationDto {
  @ApiProperty({ enum: NotificationType })
  @IsEnum(NotificationType)
  type: NotificationType;

  @ApiProperty({ enum: NotificationChannel })
  @IsEnum(NotificationChannel)
  channel: NotificationChannel;

  @ApiProperty({ example: 'test@example.com' })
  @IsString()
  recipient: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  data?: Record<string, any>;
}
