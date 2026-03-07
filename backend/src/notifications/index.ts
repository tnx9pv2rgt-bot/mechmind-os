// Notifications Module - Public API

// Services
export { EmailService } from './email/email.service';
export { SmsService } from './sms/sms.service';
export { NotificationOrchestratorService } from './services/notification.service';
export { NotificationsService } from './services/notifications.service';

// DTOs and Enums
export {
  NotificationType,
  NotificationChannel,
  NotificationPriority,
  SendNotificationDto,
  SendBookingConfirmationDto,
  SendBookingReminderDto,
  SendInvoiceReadyDto,
  SendGdprExportDto,
  BulkNotificationDto,
  TestNotificationDto,
  NotificationPreferencesDto,
} from './dto/send-notification.dto';

// Types
export type {
  BookingConfirmationData,
  BookingReminderData,
  InvoiceReadyData,
  GdprDataExportData,
  WelcomeData,
  PasswordResetData,
  BookingCancelledData,
  EmailResult,
} from './email/email.service';

export type {
  BookingReminderSmsData,
  BookingConfirmationSmsData,
  InvoiceReadySmsData,
  BookingCancelledSmsData,
  SmsResult,
  SmsTemplate,
} from './sms/sms.service';
