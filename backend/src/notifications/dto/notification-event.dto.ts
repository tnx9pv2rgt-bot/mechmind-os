export type NotificationEventType =
  | 'booking_created'
  | 'booking_confirmed'
  | 'booking_cancelled'
  | 'invoice_paid'
  | 'gdpr_deletion_scheduled';

export interface NotificationEventData {
  type: NotificationEventType;
  tenantId: string;
  userId?: string;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  timestamp: string;
}

export interface SseMessageEvent {
  id?: string;
  event?: string;
  data: string;
}

export interface NotificationPayload {
  tenantId: string;
  userId?: string;
  type: NotificationEventType;
  title: string;
  message: string;
  data?: Record<string, unknown>;
}
