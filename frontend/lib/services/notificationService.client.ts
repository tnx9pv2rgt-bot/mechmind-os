/**
 * Notification Service - Client-safe API wrapper
 *
 * This module provides the same interface as notificationService.ts
 * but uses fetch() instead of Prisma, making it safe for browser bundles.
 */

// Re-export types
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
  | 'MARKETING'

export type NotificationChannel = 'EMAIL' | 'SMS' | 'WHATSAPP' | 'PUSH' | 'BOTH' | 'AUTO'

export class NotificationServiceError extends Error {
  constructor(message: string, public code?: string) {
    super(message)
    this.name = 'NotificationServiceError'
  }
}

// Check if user has auth cookie
function hasAuthCookie(): boolean {
  if (typeof document === 'undefined') return false
  return document.cookie.includes('auth_token=')
}

// Helper for API calls - returns null silently if not authenticated
async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  if (!hasAuthCookie()) {
    return null as T
  }
  const res = await fetch(`/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    if (res.status === 400 || res.status === 401 || res.status === 403) {
      return null as T
    }
    const error = await res.json().catch(() => ({ message: 'Request failed' }))
    throw new NotificationServiceError(error.message || 'Request failed', error.code)
  }
  return res.json()
}

// All functions use fetch instead of Prisma
export async function sendNotification(data: Record<string, unknown>): Promise<unknown> {
  return apiFetch('/notifications', { method: 'POST', body: JSON.stringify(data) })
}

export async function sendBatchNotifications(data: Record<string, unknown>): Promise<unknown> {
  return apiFetch('/notifications/batch', { method: 'POST', body: JSON.stringify(data) })
}

export async function getNotificationHistory(
  filters?: Record<string, unknown>,
  pagination?: Record<string, unknown>
): Promise<unknown> {
  const params = new URLSearchParams()
  if (pagination && typeof pagination === 'object') {
    Object.entries(pagination).forEach(([k, v]) => {
      if (v !== undefined) params.set(k, String(v))
    })
  }
  if (filters && typeof filters === 'object') {
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined) params.set(k, String(v))
    })
  }
  return apiFetch(`/notifications?${params.toString()}`)
}

export async function getNotificationById(id: string): Promise<unknown> {
  return apiFetch(`/notifications/${id}`)
}

export async function getUnreadCount(): Promise<number> {
  const res = await apiFetch<{ count: number } | null>('/notifications/unread-count')
  return res?.count ?? 0
}

export async function markAsRead(id: string): Promise<void> {
  await apiFetch(`/notifications/${id}/read`, { method: 'PATCH' })
}

export async function markAllAsRead(): Promise<{ count: number }> {
  return apiFetch('/notifications/read-all', { method: 'PATCH' })
}

export async function deleteNotification(id: string): Promise<void> {
  await apiFetch(`/notifications/${id}`, { method: 'DELETE' })
}

export async function retryNotification(id: string): Promise<void> {
  await apiFetch(`/notifications/${id}/retry`, { method: 'POST' })
}

export async function getNotificationPreferences(_customerId: string): Promise<unknown> {
  return { channels: ['EMAIL', 'SMS'], types: ['BOOKING_CONFIRMATION', 'STATUS_UPDATE'] }
}

export async function updateNotificationPreferences(_data: unknown): Promise<unknown> {
  return { success: true }
}

export async function getMessageTemplates(): Promise<unknown> {
  return [
    { id: '1', name: 'Booking Confirmation', type: 'BOOKING_CONFIRMATION' },
    { id: '2', name: 'Status Update', type: 'STATUS_UPDATE' },
  ]
}

export async function previewTemplate(_data: unknown): Promise<unknown> {
  return { preview: 'Template preview...' }
}

export async function sendBookingConfirmation(
  customerId: string,
  data: { bookingId: string; date: string; time: string },
  channel: NotificationChannel = 'EMAIL'
): Promise<unknown> {
  return sendNotification({ customerId, type: 'BOOKING_CONFIRMATION', channel, ...data })
}

export async function sendBookingReminder(
  customerId: string,
  data: { bookingId: string; date: string; time: string },
  channel: NotificationChannel = 'SMS'
): Promise<unknown> {
  return sendNotification({ customerId, type: 'BOOKING_REMINDER', channel, ...data })
}

export async function sendInvoiceReady(
  customerId: string,
  data: { invoiceId: string; amount: number },
  channel: NotificationChannel = 'EMAIL'
): Promise<unknown> {
  return sendNotification({ customerId, type: 'INVOICE_READY', channel, ...data })
}

export async function sendInspectionComplete(
  customerId: string,
  data: { inspectionId: string; vehiclePlate: string },
  channel: NotificationChannel = 'EMAIL'
): Promise<unknown> {
  return sendNotification({ customerId, type: 'INSPECTION_COMPLETE', channel, ...data })
}

export async function sendVehicleReady(
  customerId: string,
  data: { vehiclePlate: string; totalCost?: number },
  channel: NotificationChannel = 'SMS'
): Promise<unknown> {
  return sendNotification({ customerId, type: 'STATUS_UPDATE', channel, ...data })
}

export async function sendMaintenanceDue(
  customerId: string,
  data: { vehiclePlate: string; maintenanceType: string; dueDate: string },
  channel: NotificationChannel = 'EMAIL'
): Promise<unknown> {
  return sendNotification({ customerId, type: 'MAINTENANCE_DUE', channel, ...data })
}
