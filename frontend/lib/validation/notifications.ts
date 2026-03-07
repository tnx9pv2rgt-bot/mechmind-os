/**
 * Notification Validation Schemas
 * Zod validation schemas for notifications
 */

import { z } from 'zod';
import {
  NotificationType,
  NotificationChannel,
  NotificationPriority,
  NotificationStatus,
} from '@/types/notifications';

// Send Notification Schema
export const sendNotificationSchema = z.object({
  customerId: z.string().uuid({ message: 'ID cliente non valido' }),
  tenantId: z.string().min(1, { message: 'ID officina richiesto' }),
  type: z.nativeEnum(NotificationType, {
    message: 'Tipo di notifica non valido',
  }),
  channel: z.nativeEnum(NotificationChannel).default(NotificationChannel.AUTO),
  message: z.string().optional(),
  metadata: z.record(z.any()).optional(),
  scheduledAt: z.string().datetime().optional(),
  priority: z.nativeEnum(NotificationPriority).default(NotificationPriority.NORMAL),
});

export type SendNotificationSchema = z.infer<typeof sendNotificationSchema>;

// Batch Notification Schema
export const batchNotificationSchema = z.object({
  notifications: z.array(sendNotificationSchema).min(1, {
    message: 'Inserisci almeno una notifica',
  }),
  options: z
    .object({
      throttleMs: z.number().min(0).max(5000).default(100),
      continueOnError: z.boolean().default(true),
    })
    .optional(),
});

export type BatchNotificationSchema = z.infer<typeof batchNotificationSchema>;

// Notification History Query Schema
export const notificationHistorySchema = z.object({
  customerId: z.string().uuid().optional(),
  type: z.nativeEnum(NotificationType).optional(),
  status: z.nativeEnum(NotificationStatus).optional(),
  channel: z.nativeEnum(NotificationChannel).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['createdAt', 'sentAt', 'status']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type NotificationHistorySchema = z.infer<typeof notificationHistorySchema>;

// Update Preferences Schema
export const updatePreferencesSchema = z.object({
  customerId: z.string().uuid({ message: 'ID cliente non valido' }),
  channel: z.nativeEnum(NotificationChannel).optional(),
  enabled: z.boolean().optional(),
  preferredChannel: z.nativeEnum(NotificationChannel).optional(),
  language: z.enum(['it', 'en']).default('it'),
  quietHoursStart: z
    .string()
    .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, {
      message: 'Formato orario non valido (HH:MM)',
    })
    .optional(),
  quietHoursEnd: z
    .string()
    .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, {
      message: 'Formato orario non valido (HH:MM)',
    })
    .optional(),
});

export type UpdatePreferencesSchema = z.infer<typeof updatePreferencesSchema>;

// Template Preview Schema
export const previewTemplateSchema = z.object({
  type: z.nativeEnum(NotificationType, {
    message: 'Tipo di template non valido',
  }),
  language: z.enum(['it', 'en']).default('it'),
  variables: z.record(z.string()),
});

export type PreviewTemplateSchema = z.infer<typeof previewTemplateSchema>;

// Notification ID Param Schema
export const notificationIdSchema = z.object({
  id: z.string().uuid({ message: 'ID notifica non valido' }),
});

export type NotificationIdSchema = z.infer<typeof notificationIdSchema>;

// Customer ID Param Schema
export const customerIdSchema = z.object({
  customerId: z.string().uuid({ message: 'ID cliente non valido' }),
});

export type CustomerIdSchema = z.infer<typeof customerIdSchema>;

// Retry Notification Schema
export const retryNotificationSchema = z.object({
  id: z.string().uuid({ message: 'ID notifica non valido' }),
});

export type RetryNotificationSchema = z.infer<typeof retryNotificationSchema>;

// Auto-send Configuration Schema
export const autoSendConfigSchema = z.object({
  bookingCreated: z.boolean().default(true),
  bookingReminder24h: z.boolean().default(true),
  invoiceGenerated: z.boolean().default(true),
  inspectionCompleted: z.boolean().default(true),
  maintenanceDue: z.boolean().default(false),
  vehicleReady: z.boolean().default(true),
});

export type AutoSendConfigSchema = z.infer<typeof autoSendConfigSchema>;

// Message Template Data Schema
export const messageTemplateDataSchema = z.object({
  customerName: z.string().min(1),
  date: z.string().optional(),
  time: z.string().optional(),
  location: z.string().optional(),
  status: z.string().optional(),
  amount: z.string().optional(),
  link: z.string().url().optional(),
  service: z.string().optional(),
  days: z.coerce.number().optional(),
  score: z.string().optional(),
  bookingCode: z.string().optional(),
  workshopName: z.string().optional(),
  vehicle: z.string().optional(),
});

export type MessageTemplateDataSchema = z.infer<typeof messageTemplateDataSchema>;

// Booking Confirmation Data Schema
export const bookingConfirmationDataSchema = messageTemplateDataSchema.extend({
  service: z.string().min(1),
  date: z.string().min(1),
  time: z.string().min(1),
  vehicle: z.string().min(1),
  bookingCode: z.string().min(1),
  notes: z.string().optional(),
});

export type BookingConfirmationDataSchema = z.infer<typeof bookingConfirmationDataSchema>;

// Booking Reminder Data Schema
export const bookingReminderDataSchema = messageTemplateDataSchema.extend({
  service: z.string().min(1),
  date: z.string().min(1),
  time: z.string().min(1),
  vehicle: z.string().min(1),
  bookingCode: z.string().min(1),
  reminderType: z.enum(['24h', 'same_day']).default('24h'),
});

export type BookingReminderDataSchema = z.infer<typeof bookingReminderDataSchema>;

// Invoice Ready Data Schema
export const invoiceReadyDataSchema = messageTemplateDataSchema.extend({
  invoiceNumber: z.string().min(1),
  invoiceDate: z.string().min(1),
  amount: z.string().min(1),
  downloadUrl: z.string().url(),
});

export type InvoiceReadyDataSchema = z.infer<typeof invoiceReadyDataSchema>;

// Inspection Complete Data Schema
export const inspectionCompleteDataSchema = messageTemplateDataSchema.extend({
  score: z.string().optional(),
  reportUrl: z.string().url().optional(),
  findings: z.array(z.string()).optional(),
});

export type InspectionCompleteDataSchema = z.infer<typeof inspectionCompleteDataSchema>;

// Vehicle Ready Data Schema
export const vehicleReadyDataSchema = messageTemplateDataSchema.extend({
  vehicle: z.string().min(1),
  pickupTime: z.string().optional(),
  totalAmount: z.string().optional(),
});

export type VehicleReadyDataSchema = z.infer<typeof vehicleReadyDataSchema>;

// Maintenance Due Data Schema
export const maintenanceDueDataSchema = messageTemplateDataSchema.extend({
  service: z.string().min(1),
  days: z.coerce.number().min(0),
  lastServiceDate: z.string().optional(),
  mileage: z.coerce.number().optional(),
});

export type MaintenanceDueDataSchema = z.infer<typeof maintenanceDueDataSchema>;
