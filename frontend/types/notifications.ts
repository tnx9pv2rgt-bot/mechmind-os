/**
 * Notification Types
 * TypeScript types for the MechMind OS Notifications System
 */

// Enums matching the backend
export enum NotificationType {
  BOOKING_CONFIRMATION = 'BOOKING_CONFIRMATION',
  BOOKING_REMINDER = 'BOOKING_REMINDER',
  BOOKING_CANCELLED = 'BOOKING_CANCELLED',
  INVOICE_READY = 'INVOICE_READY',
  INSPECTION_COMPLETE = 'INSPECTION_COMPLETE',
  MAINTENANCE_DUE = 'MAINTENANCE_DUE',
  VEHICLE_READY = 'VEHICLE_READY',
  STATUS_UPDATE = 'STATUS_UPDATE',
  PAYMENT_REMINDER = 'PAYMENT_REMINDER',
  WELCOME = 'WELCOME',
  PASSWORD_RESET = 'PASSWORD_RESET',
  CUSTOM = 'CUSTOM',
  GDPR_EXPORT_READY = 'GDPR_EXPORT_READY',
}

export enum NotificationChannel {
  SMS = 'SMS',
  WHATSAPP = 'WHATSAPP',
  EMAIL = 'EMAIL',
  BOTH = 'BOTH',
  AUTO = 'AUTO',
}

export enum NotificationStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export enum NotificationPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}

// Core Notification Interface
export interface Notification {
  id: string;
  customerId: string;
  tenantId: string;
  type: NotificationType;
  channel: NotificationChannel;
  status: NotificationStatus;
  message: string;
  messageId?: string;
  metadata?: Record<string, any>;
  sentAt?: string;
  deliveredAt?: string;
  failedAt?: string;
  error?: string;
  retries: number;
  maxRetries: number;
  createdAt: string;
  updatedAt: string;
}

// Notification with customer info
export interface NotificationWithCustomer extends Notification {
  customer?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };
}

// Send Notification Request
export interface SendNotificationRequest {
  customerId: string;
  tenantId: string;
  type: NotificationType;
  channel: NotificationChannel;
  message?: string;
  metadata?: Record<string, any>;
  scheduledAt?: string;
  priority?: NotificationPriority;
}

// Send Notification Response
export interface SendNotificationResponse {
  success: boolean;
  notificationId?: string;
  messageId?: string;
  error?: string;
}

// Batch Notification Request
export interface BatchNotificationRequest {
  notifications: SendNotificationRequest[];
  options?: {
    throttleMs?: number;
    continueOnError?: boolean;
  };
}

// Batch Notification Response
export interface BatchNotificationResponse {
  results: SendNotificationResponse[];
  total: number;
  successful: number;
  failed: number;
}

// Notification History
export interface NotificationHistory {
  notifications: Notification[];
  total: number;
  pagination: {
    page: number;
    limit: number;
    totalPages: number;
  };
}

// Notification History Query Params
export interface NotificationHistoryParams {
  customerId?: string;
  type?: NotificationType;
  status?: NotificationStatus;
  channel?: NotificationChannel;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'sentAt' | 'status';
  sortOrder?: 'asc' | 'desc';
}

// Customer Notification Preferences
export interface NotificationPreferences {
  customerId: string;
  channels: {
    channel: NotificationChannel;
    enabled: boolean;
  }[];
  types: {
    type: NotificationType;
    enabled: boolean;
  }[];
  preferredChannel: NotificationChannel;
  language: string;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  timezone?: string;
}

// Update Preferences Request
export interface UpdatePreferencesRequest {
  customerId: string;
  channel?: NotificationChannel;
  enabled?: boolean;
  preferredChannel?: NotificationChannel;
  language?: string;
  quietHoursStart?: string;
  quietHoursEnd?: string;
}

// Notification Template
export interface NotificationTemplate {
  type: NotificationType;
  name: string;
  description: string;
  defaultMessage: string;
  variables: string[];
  supportedChannels: NotificationChannel[];
}

// Template Preview Request
export interface PreviewTemplateRequest {
  type: NotificationType;
  language: string;
  variables: Record<string, string>;
}

// Template Preview Response
export interface PreviewTemplateResponse {
  message: string;
}

// Unread Count Response
export interface UnreadCountResponse {
  count: number;
}

// Webhook Status Update
export interface WebhookStatusUpdate {
  messageId: string;
  status: string;
  errorCode?: string;
  timestamp: string;
}

// Real-time Notification Event
export interface NotificationEvent {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  timestamp: string;
  isRead: boolean;
}

// Notification Filters
export interface NotificationFilters {
  type?: NotificationType[];
  status?: NotificationStatus[];
  channel?: NotificationChannel[];
  dateRange?: {
    from?: Date;
    to?: Date;
  };
  searchQuery?: string;
}

// Auto-send Configuration
export interface AutoSendConfig {
  bookingCreated: boolean;
  bookingReminder24h: boolean;
  invoiceGenerated: boolean;
  inspectionCompleted: boolean;
  maintenanceDue: boolean;
  vehicleReady: boolean;
}

// SMS/WhatsApp specific message data
export interface MessageTemplateData {
  customerName: string;
  date?: string;
  time?: string;
  location?: string;
  status?: string;
  amount?: string;
  link?: string;
  service?: string;
  days?: number;
  score?: string;
  bookingCode?: string;
  workshopName?: string;
  vehicle?: string;
}

// Booking Confirmation Data
export interface BookingConfirmationData extends MessageTemplateData {
  service: string;
  date: string;
  time: string;
  vehicle: string;
  bookingCode: string;
  workshopName?: string;
  notes?: string;
}

// Booking Reminder Data
export interface BookingReminderData extends MessageTemplateData {
  service: string;
  date: string;
  time: string;
  vehicle: string;
  bookingCode: string;
  reminderType: '24h' | 'same_day';
}

// Invoice Ready Data
export interface InvoiceReadyData extends MessageTemplateData {
  invoiceNumber: string;
  invoiceDate: string;
  amount: string;
  downloadUrl: string;
}

// Inspection Complete Data
export interface InspectionCompleteData extends MessageTemplateData {
  score?: string;
  reportUrl?: string;
  findings?: string[];
}

// Vehicle Ready Data
export interface VehicleReadyData extends MessageTemplateData {
  vehicle: string;
  pickupTime?: string;
  totalAmount?: string;
}

// Maintenance Due Data
export interface MaintenanceDueData extends MessageTemplateData {
  service: string;
  days: number;
  lastServiceDate?: string;
  mileage?: number;
}
