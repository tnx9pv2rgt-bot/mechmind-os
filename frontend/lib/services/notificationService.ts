/**
 * Notification Service - MechMind OS Frontend (Multi-Tenant)
 *
 * All operations delegate to the NestJS backend API.
 * No direct database access from the frontend.
 *
 * @module lib/services/notificationService
 * @version 3.0.0
 */

import { BACKEND_BASE } from '@/lib/config';
import { requireTenantId } from '@/lib/tenant/context';

const BACKEND_URL = BACKEND_BASE;
const TIMEOUT_MS = 15_000;

// =============================================================================
// Types
// =============================================================================

export type NotificationType =
  | 'BOOKING_REMINDER'
  | 'BOOKING_CONFIRMATION'
  | 'STATUS_UPDATE'
  | 'INVOICE_READY'
  | 'MAINTENANCE_DUE'
  | 'MAINTENANCE_OVERDUE'
  | 'WARRANTY_EXPIRING'
  | 'WARRANTY_EXPIRED'
  | 'INSPECTION_COMPLETE'
  | 'INSPECTION_APPROVAL'
  | 'PAYMENT_REMINDER'
  | 'PAYMENT_RECEIVED'
  | 'CLAIM_SUBMITTED'
  | 'CLAIM_APPROVED'
  | 'CLAIM_REJECTED'
  | 'CUSTOMER_WELCOME'
  | 'MARKETING';

export type NotificationChannel = 'EMAIL' | 'SMS' | 'WHATSAPP' | 'PUSH' | 'BOTH' | 'AUTO';

export type NotificationStatus = 'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED' | 'READ';

export interface CreateNotificationInput {
  customerId?: string;
  type: NotificationType;
  channel: NotificationChannel;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
  scheduledFor?: Date;
}

export interface SendToTenantInput {
  type: NotificationType;
  channel: NotificationChannel;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
  filter?: {
    customerIds?: string[];
    hasVehicles?: boolean;
    hasOverdueMaintenance?: boolean;
    hasExpiringWarranty?: boolean;
  };
}

export interface NotificationFilters {
  customerId?: string;
  type?: NotificationType;
  channel?: NotificationChannel;
  status?: NotificationStatus;
  startDate?: Date;
  endDate?: Date;
  tenantId?: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'sentAt' | 'scheduledFor';
  sortOrder?: 'asc' | 'desc';
}

// =============================================================================
// Error Classes
// =============================================================================

export class NotificationError extends Error {
  constructor(
    message: string,
    public code?: string
  ) {
    super(message);
    this.name = 'NotificationError';
  }
}

export class TenantRequiredError extends Error {
  constructor() {
    super('Tenant context is required for notification operations');
    this.name = 'TenantRequiredError';
  }
}

// =============================================================================
// Logger
// =============================================================================

const logger = {
  info: (message: string, meta?: Record<string, unknown>) => {
    console.info(`[NotificationService] ${message}`, meta ? JSON.stringify(meta) : '');
  },
  error: (message: string, error?: unknown, meta?: Record<string, unknown>) => {
    console.error(`[NotificationService] ${message}`, error, meta ? JSON.stringify(meta) : '');
  },
};

// =============================================================================
// Backend HTTP Helper
// =============================================================================

async function backendFetch<T>(
  path: string,
  options?: RequestInit & { tenantId?: string }
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string>),
  };

  if (options?.tenantId) {
    headers['x-tenant-id'] = options.tenantId;
  }

  try {
    const res = await fetch(`${BACKEND_URL}/${path}`, {
      ...options,
      headers,
      signal: controller.signal,
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const msg =
        (body as { error?: { message?: string } })?.error?.message ||
        `Backend error: ${res.status}`;
      throw new NotificationError(msg, 'BACKEND_ERROR');
    }

    const body = await res.json();
    return ((body as { data?: T }).data ?? body) as T;
  } finally {
    clearTimeout(timeoutId);
  }
}

// =============================================================================
// Helper Functions
// =============================================================================

async function resolveTenantId(inputTenantId?: string): Promise<string> {
  if (inputTenantId) {
    return inputTenantId;
  }

  try {
    return await requireTenantId();
  } catch {
    throw new TenantRequiredError();
  }
}

// =============================================================================
// Core Functions
// =============================================================================

/**
 * Create a notification for a customer
 */
export async function createNotification(
  data: CreateNotificationInput,
  inputTenantId?: string
): Promise<{
  id: string;
  customerId: string | null;
  type: string;
  status: string;
  createdAt: Date;
}> {
  const tenantId = await resolveTenantId(inputTenantId);

  logger.info('Creating notification', { tenantId, type: data.type, channel: data.channel });

  return backendFetch('v1/notifications', {
    method: 'POST',
    body: JSON.stringify(data),
    tenantId,
  });
}

/**
 * Send notification to all customers in a tenant
 */
export async function sendToTenant(
  data: SendToTenantInput,
  inputTenantId?: string
): Promise<{
  sent: number;
  failed: number;
  notifications: string[];
}> {
  const tenantId = await resolveTenantId(inputTenantId);

  return backendFetch('v1/notifications/send-to-tenant', {
    method: 'POST',
    body: JSON.stringify(data),
    tenantId,
  });
}

/**
 * Send maintenance due notification to relevant customers
 */
export async function sendMaintenanceNotifications(
  tenantId?: string
): Promise<{
  sent: number;
  maintenanceIds: string[];
}> {
  const effectiveTenantId = await resolveTenantId(tenantId);

  return backendFetch('v1/notifications/send-maintenance', {
    method: 'POST',
    tenantId: effectiveTenantId,
  });
}

/**
 * Send warranty expiration notifications
 */
export async function sendWarrantyNotifications(
  daysThreshold: number = 30,
  tenantId?: string
): Promise<{
  sent: number;
  warrantyIds: string[];
}> {
  const effectiveTenantId = await resolveTenantId(tenantId);

  return backendFetch('v1/notifications/send-warranty', {
    method: 'POST',
    body: JSON.stringify({ daysThreshold }),
    tenantId: effectiveTenantId,
  });
}

/**
 * Get notifications for a tenant with filtering
 */
export async function listNotifications(
  filters: NotificationFilters = {},
  pagination: PaginationParams = {},
  inputTenantId?: string
): Promise<{
  notifications: Array<{
    id: string;
    customerId: string | null;
    type: string;
    channel: string;
    title: string;
    status: string;
    createdAt: Date;
    sentAt: Date | null;
    customer?: {
      firstName: string;
      lastName: string;
      email: string;
    };
  }>;
  total: number;
  page: number;
  totalPages: number;
}> {
  const tenantId = filters.tenantId || (await resolveTenantId(inputTenantId));

  const params = new URLSearchParams();
  if (filters.customerId) params.set('customerId', filters.customerId);
  if (filters.type) params.set('type', filters.type);
  if (filters.channel) params.set('channel', filters.channel);
  if (filters.status) params.set('status', filters.status);
  if (filters.startDate) params.set('startDate', filters.startDate.toISOString());
  if (filters.endDate) params.set('endDate', filters.endDate.toISOString());
  if (pagination.page) params.set('page', String(pagination.page));
  if (pagination.limit) params.set('limit', String(pagination.limit));
  if (pagination.sortBy) params.set('sortBy', pagination.sortBy);
  if (pagination.sortOrder) params.set('sortOrder', pagination.sortOrder);

  const qs = params.toString();
  return backendFetch(`v1/notifications${qs ? `?${qs}` : ''}`, {
    method: 'GET',
    tenantId,
  });
}

/**
 * Mark notification as sent
 */
export async function markAsSent(
  notificationId: string,
  inputTenantId?: string
): Promise<void> {
  const tenantId = await resolveTenantId(inputTenantId);

  await backendFetch(`v1/notifications/${notificationId}/sent`, {
    method: 'POST',
    tenantId,
  });
}

/**
 * Mark notification as delivered
 */
export async function markAsDelivered(
  notificationId: string,
  inputTenantId?: string
): Promise<void> {
  const tenantId = await resolveTenantId(inputTenantId);

  await backendFetch(`v1/notifications/${notificationId}/delivered`, {
    method: 'POST',
    tenantId,
  });
}

/**
 * Mark notification as read
 */
export async function markAsRead(
  notificationId: string,
  inputTenantId?: string
): Promise<void> {
  const tenantId = await resolveTenantId(inputTenantId);

  await backendFetch(`v1/notifications/${notificationId}/read`, {
    method: 'POST',
    tenantId,
  });
}

/**
 * Mark notification as failed
 */
export async function markAsFailed(
  notificationId: string,
  errorMessage: string,
  inputTenantId?: string
): Promise<void> {
  const tenantId = await resolveTenantId(inputTenantId);

  await backendFetch(`v1/notifications/${notificationId}/failed`, {
    method: 'POST',
    body: JSON.stringify({ errorMessage }),
    tenantId,
  });
}

/**
 * Get notification statistics for a tenant
 */
export async function getNotificationStats(
  inputTenantId?: string
): Promise<{
  total: number;
  pending: number;
  sent: number;
  delivered: number;
  failed: number;
  read: number;
  byChannel: Record<string, number>;
  byType: Record<string, number>;
}> {
  const tenantId = await resolveTenantId(inputTenantId);

  return backendFetch('v1/notifications/stats', {
    method: 'GET',
    tenantId,
  });
}

// =============================================================================
// Export Service Class
// =============================================================================

export class NotificationService {
  private tenantId: string;

  constructor(tenantId: string) {
    this.tenantId = tenantId;
  }

  async create(data: CreateNotificationInput) {
    return createNotification(data, this.tenantId);
  }

  async sendToTenant(data: SendToTenantInput) {
    return sendToTenant(data, this.tenantId);
  }

  async list(filters?: NotificationFilters, pagination?: PaginationParams) {
    return listNotifications(filters, pagination, this.tenantId);
  }

  async getStats() {
    return getNotificationStats(this.tenantId);
  }

  async markAsSent(notificationId: string) {
    return markAsSent(notificationId, this.tenantId);
  }

  async markAsDelivered(notificationId: string) {
    return markAsDelivered(notificationId, this.tenantId);
  }

  async markAsRead(notificationId: string) {
    return markAsRead(notificationId, this.tenantId);
  }
}

export const notificationService = {
  create: createNotification,
  sendToTenant,
  sendMaintenanceNotifications,
  sendWarrantyNotifications,
  list: listNotifications,
  markAsSent,
  markAsDelivered,
  markAsRead,
  markAsFailed,
  getStats: getNotificationStats,
};

// =============================================================================
// COMPATIBILITY EXPORTS (for hooks)
// =============================================================================

export { NotificationError as NotificationServiceError };

export async function sendNotification(data: {
  customerId?: string;
  tenantId?: string;
  type: NotificationType | string;
  channel: NotificationChannel | string;
  title?: string;
  message?: string;
  metadata?: Record<string, unknown>;
}) {
  const typeStr = String(data.type).replace(/_/g, ' ');
  return createNotification(
    {
      customerId: data.customerId,
      type: data.type as NotificationType,
      channel: data.channel as NotificationChannel,
      title: data.title || typeStr,
      message: data.message || `Notification: ${typeStr}`,
      metadata: data.metadata,
    },
    data.tenantId
  );
}
export const sendBatchNotifications = sendToTenant;
export const getNotificationHistory = listNotifications;

/**
 * Get notification by ID
 */
export async function getNotificationById(
  id: string,
  inputTenantId?: string
): Promise<{
  id: string;
  customerId: string | null;
  type: string;
  channel: string;
  title: string;
  message: string;
  status: string;
  createdAt: Date;
  sentAt: Date | null;
  deliveredAt: Date | null;
  readAt: Date | null;
  metadata: Record<string, unknown>;
  customer?: {
    firstName: string;
    lastName: string;
    email: string;
  };
} | null> {
  const tenantId = await resolveTenantId(inputTenantId);

  try {
    return await backendFetch(`v1/notifications/${id}`, {
      method: 'GET',
      tenantId,
    });
  } catch {
    return null;
  }
}

/**
 * Get unread notifications count
 */
export async function getUnreadCount(inputTenantId?: string): Promise<number> {
  const tenantId = await resolveTenantId(inputTenantId);

  const result = await backendFetch<{ count: number }>('v1/notifications/unread-count', {
    method: 'GET',
    tenantId,
  });

  return result.count;
}

/**
 * Mark all notifications as read
 */
export async function markAllAsRead(inputTenantId?: string): Promise<{ count: number }> {
  const tenantId = await resolveTenantId(inputTenantId);

  return backendFetch('v1/notifications/read-all', {
    method: 'POST',
    tenantId,
  });
}

/**
 * Delete a notification
 */
export async function deleteNotification(
  id: string,
  inputTenantId?: string
): Promise<void> {
  const tenantId = await resolveTenantId(inputTenantId);

  await backendFetch(`v1/notifications/${id}`, {
    method: 'DELETE',
    tenantId,
  });
}

/**
 * Retry a failed notification
 */
export async function retryNotification(
  id: string,
  inputTenantId?: string
): Promise<void> {
  const tenantId = await resolveTenantId(inputTenantId);

  await backendFetch(`v1/notifications/${id}/retry`, {
    method: 'POST',
    tenantId,
  });
}

export async function getNotificationPreferences(_customerId: string) {
  return {
    channels: ['EMAIL', 'SMS'],
    types: ['BOOKING_CONFIRMATION', 'STATUS_UPDATE'],
  };
}

export async function updateNotificationPreferences(_data: unknown) {
  return { success: true };
}

export async function getMessageTemplates() {
  return [
    { id: '1', name: 'Booking Confirmation', type: 'BOOKING_CONFIRMATION' },
    { id: '2', name: 'Status Update', type: 'STATUS_UPDATE' },
  ];
}

export async function previewTemplate(_data: unknown) {
  return { preview: 'Template preview...' };
}

export async function sendBookingConfirmation(
  customerId: string,
  data: { bookingId: string; date: string; time: string },
  channel: NotificationChannel = 'EMAIL'
) {
  return createNotification({
    customerId,
    type: 'BOOKING_CONFIRMATION',
    channel,
    title: 'Booking Confirmed',
    message: `Your booking for ${data.date} at ${data.time} has been confirmed.`,
    metadata: { bookingId: data.bookingId },
  });
}

export async function sendBookingReminder(
  customerId: string,
  data: { bookingId: string; date: string; time: string },
  channel: NotificationChannel = 'SMS'
) {
  return createNotification({
    customerId,
    type: 'BOOKING_REMINDER',
    channel,
    title: 'Booking Reminder',
    message: `Reminder: You have a booking tomorrow at ${data.time}.`,
    metadata: { bookingId: data.bookingId },
  });
}

export async function sendInvoiceReady(
  customerId: string,
  data: { invoiceId: string; amount: number },
  channel: NotificationChannel = 'EMAIL'
) {
  return createNotification({
    customerId,
    type: 'INVOICE_READY',
    channel,
    title: 'Invoice Ready',
    message: `Your invoice for \u20AC${data.amount} is ready for payment.`,
    metadata: { invoiceId: data.invoiceId, amount: data.amount },
  });
}

export async function sendInspectionComplete(
  customerId: string,
  data: { inspectionId: string; vehiclePlate: string },
  channel: NotificationChannel = 'EMAIL'
) {
  return createNotification({
    customerId,
    type: 'INSPECTION_COMPLETE',
    channel,
    title: 'Inspection Complete',
    message: `The inspection for vehicle ${data.vehiclePlate} has been completed.`,
    metadata: { inspectionId: data.inspectionId },
  });
}

export async function sendVehicleReady(
  customerId: string,
  data: { vehiclePlate: string; totalCost?: number },
  channel: NotificationChannel = 'SMS'
) {
  return createNotification({
    customerId,
    type: 'STATUS_UPDATE',
    channel,
    title: 'Vehicle Ready',
    message: `Your vehicle ${data.vehiclePlate} is ready for pickup.${data.totalCost ? ` Total cost: \u20AC${data.totalCost}` : ''}`,
    metadata: { vehiclePlate: data.vehiclePlate, totalCost: data.totalCost },
  });
}

export async function sendMaintenanceDue(
  customerId: string,
  data: { vehiclePlate: string; maintenanceType: string; dueDate: string },
  channel: NotificationChannel = 'EMAIL'
) {
  return createNotification({
    customerId,
    type: 'MAINTENANCE_DUE',
    channel,
    title: 'Maintenance Due',
    message: `Your ${data.maintenanceType} maintenance for ${data.vehiclePlate} is due on ${data.dueDate}.`,
    metadata: { vehiclePlate: data.vehiclePlate, maintenanceType: data.maintenanceType },
  });
}

/**
 * Queue a notification for later delivery
 */
export async function queueNotification(
  data: {
    customerId?: string;
    tenantId?: string;
    type: NotificationType | string;
    channel: NotificationChannel | string;
    title?: string;
    message?: string;
    metadata?: Record<string, unknown>;
    scheduledAt?: string;
  },
  inputTenantId?: string
) {
  const typeStr = String(data.type).replace(/_/g, ' ');
  return createNotification(
    {
      customerId: data.customerId,
      type: data.type as NotificationType,
      channel: data.channel as NotificationChannel,
      title: data.title || typeStr,
      message: data.message || `Notification: ${typeStr}`,
      metadata: data.metadata,
    },
    inputTenantId || data.tenantId
  );
}
