/**
 * Notification Service - MechMind OS Frontend (Multi-Tenant)
 * 
 * Manages notifications across all channels (email, SMS, WhatsApp, push)
 * All operations are scoped to the current tenant for data isolation.
 * 
 * @module lib/services/notificationService
 * @version 2.0.0
 */

import { prisma } from '@/lib/prisma'
import {
  requireTenantId,
  NoTenantContextError,
} from '@/lib/tenant/context'

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
  | 'MARKETING'

export type NotificationChannel = 'EMAIL' | 'SMS' | 'WHATSAPP' | 'PUSH' | 'BOTH' | 'AUTO'

export type NotificationStatus = 'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED' | 'READ'

export interface CreateNotificationInput {
  customerId?: string
  type: NotificationType
  channel: NotificationChannel
  title: string
  message: string
  metadata?: Record<string, unknown>
  scheduledFor?: Date
}

export interface SendToTenantInput {
  type: NotificationType
  channel: NotificationChannel
  title: string
  message: string
  metadata?: Record<string, unknown>
  filter?: {
    customerIds?: string[]
    hasVehicles?: boolean
    hasOverdueMaintenance?: boolean
    hasExpiringWarranty?: boolean
  }
}

export interface NotificationFilters {
  customerId?: string
  type?: NotificationType
  channel?: NotificationChannel
  status?: NotificationStatus
  startDate?: Date
  endDate?: Date
  tenantId?: string // Optional override for admin
}

export interface PaginationParams {
  page?: number
  limit?: number
  sortBy?: 'createdAt' | 'sentAt' | 'scheduledFor'
  sortOrder?: 'asc' | 'desc'
}

// =============================================================================
// Error Classes
// =============================================================================

export class NotificationError extends Error {
  constructor(message: string, public code?: string) {
    super(message)
    this.name = 'NotificationError'
  }
}

export class TenantRequiredError extends Error {
  constructor() {
    super('Tenant context is required for notification operations')
    this.name = 'TenantRequiredError'
  }
}

// =============================================================================
// Logger
// =============================================================================

const logger = {
  info: (message: string, meta?: Record<string, unknown>) => {
    console.info(`[NotificationService] ${message}`, meta ? JSON.stringify(meta) : '')
  },
  error: (message: string, error?: unknown, meta?: Record<string, unknown>) => {
    console.error(`[NotificationService] ${message}`, error, meta ? JSON.stringify(meta) : '')
  }
}

// =============================================================================
// Helper Functions
// =============================================================================

async function resolveTenantId(inputTenantId?: string): Promise<string> {
  if (inputTenantId) {
    return inputTenantId
  }

  try {
    return await requireTenantId()
  } catch {
    throw new TenantRequiredError()
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
  id: string
  customerId: string | null
  type: string
  status: string
  createdAt: Date
}> {
  const tenantId = await resolveTenantId(inputTenantId)
  
  logger.info('Creating notification', { tenantId, type: data.type, channel: data.channel })
  
  try {
    // If customerId provided, verify they belong to tenant
    if (data.customerId) {
      const customer = await prisma.customer.findFirst({
        where: {
          id: data.customerId,
          tenantId,
        },
      })
      
      if (!customer) {
        throw new NotificationError('Customer not found or does not belong to tenant', 'CUSTOMER_NOT_FOUND')
      }
    }
    
    const notification = await prisma.notification.create({
      data: {
        tenantId,
        customerId: data.customerId,
        type: data.type,
        channel: data.channel,
        title: data.title,
        message: data.message,
        metadata: (data.metadata || {}) as Record<string, string | number | boolean | null>,
        status: data.scheduledFor && data.scheduledFor > new Date() ? 'PENDING' : 'PENDING',
      },
    })
    
    return notification
  } catch (error) {
    logger.error('Failed to create notification', error, { tenantId, data })
    throw error
  }
}

/**
 * Send notification to all customers in a tenant
 * CRITICAL: Always filters by tenantId for data isolation
 */
export async function sendToTenant(
  data: SendToTenantInput,
  inputTenantId?: string
): Promise<{
  sent: number
  failed: number
  notifications: string[]
}> {
  const tenantId = await resolveTenantId(inputTenantId)
  
  logger.info('Sending notification to tenant', { 
    tenantId, 
    type: data.type, 
    channel: data.channel,
    filter: data.filter 
  })
  
  try {
    // Build customer filter
    const customerWhere: NonNullable<Parameters<typeof prisma.customer.findMany>[0]>['where'] = {
      tenantId,
    }
    
    if (data.filter?.customerIds) {
      customerWhere.id = { in: data.filter.customerIds }
    }
    
    // Get customers
    const customers = await prisma.customer.findMany({
      where: customerWhere,
      select: {
        id: true,
      },
    })
    
    // Create notifications for all customers
    const notifications = await Promise.all(
      customers.map(customer =>
        prisma.notification.create({
          data: {
            tenantId,
            customerId: customer.id,
            type: data.type,
            channel: data.channel,
            title: data.title,
            message: data.message,
            metadata: (data.metadata || {}) as Record<string, string | number | boolean | null>,
            status: 'PENDING',
          },
        })
      )
    )
    
    logger.info('Notifications created for tenant', { 
      tenantId, 
      count: notifications.length 
    })
    
    return {
      sent: notifications.length,
      failed: 0,
      notifications: notifications.map(n => n.id),
    }
  } catch (error) {
    logger.error('Failed to send notification to tenant', error, { tenantId, data })
    throw error
  }
}

/**
 * Send maintenance due notification to relevant customers
 */
export async function sendMaintenanceNotifications(
  tenantId?: string
): Promise<{
  sent: number
  maintenanceIds: string[]
}> {
  const effectiveTenantId = await resolveTenantId(tenantId)
  
  // Get upcoming maintenance items for tenant
  const maintenanceItems = await prisma.maintenanceSchedule.findMany({
    where: {
      tenantId: effectiveTenantId,
      OR: [
        { isOverdue: true },
        { 
          nextDueDate: {
            lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Within 7 days
            gte: new Date(),
          },
        },
      ],
    },
    include: {
      vehicle: {
        select: {
          ownerName: true,
          ownerEmail: true,
          customerId: true,
        },
      },
    },
  })
  
  const notifications: string[] = []
  
  for (const item of maintenanceItems) {
    if (!item.vehicle?.customerId) continue
    
    const isOverdue = item.isOverdue
    const notification = await prisma.notification.create({
      data: {
        tenantId: effectiveTenantId,
        customerId: item.vehicle.customerId,
        type: isOverdue ? 'MAINTENANCE_OVERDUE' : 'MAINTENANCE_DUE',
        channel: 'EMAIL',
        title: isOverdue ? 'Maintenance Overdue' : 'Maintenance Due Soon',
        message: `Your ${item.type} maintenance for vehicle is ${isOverdue ? 'overdue' : 'due soon'}.`,
        metadata: {
          maintenanceId: item.id,
          vehicleId: item.vehicleId,
          type: item.type,
          daysUntilDue: item.daysUntilDue,
        },
        status: 'PENDING',
      },
    })
    
    notifications.push(notification.id)
  }
  
  return {
    sent: notifications.length,
    maintenanceIds: maintenanceItems.map(m => m.id),
  }
}

/**
 * Send warranty expiration notifications
 */
export async function sendWarrantyNotifications(
  daysThreshold: number = 30,
  tenantId?: string
): Promise<{
  sent: number
  warrantyIds: string[]
}> {
  const effectiveTenantId = await resolveTenantId(tenantId)
  
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() + daysThreshold)
  
  const warranties = await prisma.warranty.findMany({
    where: {
      tenantId: effectiveTenantId,
      expirationDate: {
        lte: cutoffDate,
        gte: new Date(),
      },
      status: {
        in: ['ACTIVE', 'EXPIRING_SOON'],
      },
    },
    include: {
      vehicle: {
        select: {
          customerId: true,
        },
      },
    },
  })
  
  const notifications: string[] = []
  
  for (const warranty of warranties) {
    if (!warranty.vehicle?.customerId) continue
    
    const daysUntilExpiry = Math.ceil(
      (new Date(warranty.expirationDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    )
    
    const notification = await prisma.notification.create({
      data: {
        tenantId: effectiveTenantId,
        customerId: warranty.vehicle.customerId,
        type: 'WARRANTY_EXPIRING',
        channel: 'EMAIL',
        title: 'Warranty Expiring Soon',
        message: `Your warranty expires in ${daysUntilExpiry} days.`,
        metadata: {
          warrantyId: warranty.id,
          vehicleId: warranty.vehicleId,
          expirationDate: warranty.expirationDate,
          daysUntilExpiry,
        },
        status: 'PENDING',
      },
    })
    
    notifications.push(notification.id)
    
    // Record that alert was sent
    await prisma.warranty.update({
      where: { id: warranty.id },
      data: {
        alertsSent: {
          push: new Date(),
        },
      },
    })
  }
  
  return {
    sent: notifications.length,
    warrantyIds: warranties.map(w => w.id),
  }
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
    id: string
    customerId: string | null
    type: string
    channel: string
    title: string
    status: string
    createdAt: Date
    sentAt: Date | null
    customer?: {
      firstName: string
      lastName: string
      email: string
    }
  }>
  total: number
  page: number
  totalPages: number
}> {
  const tenantId = filters.tenantId || await resolveTenantId(inputTenantId)
  
  const page = pagination.page ?? 1
  const limit = pagination.limit ?? 50
  const skip = (page - 1) * limit
  
  const where: NonNullable<Parameters<typeof prisma.notification.findMany>[0]>['where'] = {
    tenantId,
  }
  
  if (filters.customerId) {
    where.customerId = filters.customerId
  }
  
  if (filters.type) {
    where.type = filters.type
  }
  
  if (filters.channel) {
    where.channel = filters.channel
  }
  
  if (filters.status) {
    where.status = filters.status
  }
  
  if (filters.startDate || filters.endDate) {
    where.createdAt = {}
    if (filters.startDate) {
      where.createdAt.gte = filters.startDate
    }
    if (filters.endDate) {
      where.createdAt.lte = filters.endDate
    }
  }
  
  const [notifications, total] = await Promise.all([
    prisma.notification.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [pagination.sortBy ?? 'createdAt']: pagination.sortOrder ?? 'desc' },
      include: {
        customer: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    }),
    prisma.notification.count({ where }),
  ])
  
  return {
    notifications: notifications.map(n => ({
      ...n,
      customer: n.customer ?? undefined,
    })),
    total,
    page,
    totalPages: Math.ceil(total / limit),
  }
}

/**
 * Mark notification as sent
 */
export async function markAsSent(
  notificationId: string,
  inputTenantId?: string
): Promise<void> {
  const tenantId = await resolveTenantId(inputTenantId)
  
  await prisma.notification.updateMany({
    where: {
      id: notificationId,
      tenantId,
    },
    data: {
      status: 'SENT',
      sentAt: new Date(),
    },
  })
}

/**
 * Mark notification as delivered
 */
export async function markAsDelivered(
  notificationId: string,
  inputTenantId?: string
): Promise<void> {
  const tenantId = await resolveTenantId(inputTenantId)
  
  await prisma.notification.updateMany({
    where: {
      id: notificationId,
      tenantId,
    },
    data: {
      status: 'DELIVERED',
      deliveredAt: new Date(),
    },
  })
}

/**
 * Mark notification as read
 */
export async function markAsRead(
  notificationId: string,
  inputTenantId?: string
): Promise<void> {
  const tenantId = await resolveTenantId(inputTenantId)
  
  await prisma.notification.updateMany({
    where: {
      id: notificationId,
      tenantId,
    },
    data: {
      status: 'READ',
      readAt: new Date(),
    },
  })
}

/**
 * Mark notification as failed
 */
export async function markAsFailed(
  notificationId: string,
  errorMessage: string,
  inputTenantId?: string
): Promise<void> {
  const tenantId = await resolveTenantId(inputTenantId)
  
  await prisma.notification.updateMany({
    where: {
      id: notificationId,
      tenantId,
    },
    data: {
      status: 'FAILED',
      errorMessage,
      retryCount: { increment: 1 },
    },
  })
}

/**
 * Get notification statistics for a tenant
 */
export async function getNotificationStats(
  inputTenantId?: string
): Promise<{
  total: number
  pending: number
  sent: number
  delivered: number
  failed: number
  read: number
  byChannel: Record<string, number>
  byType: Record<string, number>
}> {
  const tenantId = await resolveTenantId(inputTenantId)
  
  const [
    total,
    pending,
    sent,
    delivered,
    failed,
    read,
    byChannel,
    byType,
  ] = await Promise.all([
    prisma.notification.count({ where: { tenantId } }),
    prisma.notification.count({ where: { tenantId, status: 'PENDING' } }),
    prisma.notification.count({ where: { tenantId, status: 'SENT' } }),
    prisma.notification.count({ where: { tenantId, status: 'DELIVERED' } }),
    prisma.notification.count({ where: { tenantId, status: 'FAILED' } }),
    prisma.notification.count({ where: { tenantId, status: 'READ' } }),
    // By channel
    prisma.notification.groupBy({
      by: ['channel'],
      where: { tenantId },
      _count: { id: true },
    }),
    // By type
    prisma.notification.groupBy({
      by: ['type'],
      where: { tenantId },
      _count: { id: true },
    }),
  ])
  
  return {
    total,
    pending,
    sent,
    delivered,
    failed,
    read,
    byChannel: byChannel.reduce((acc, curr) => {
      acc[curr.channel] = curr._count.id
      return acc
    }, {} as Record<string, number>),
    byType: byType.reduce((acc, curr) => {
      acc[curr.type] = curr._count.id
      return acc
    }, {} as Record<string, number>),
  }
}

// =============================================================================
// Export Service Class
// =============================================================================

export class NotificationService {
  private tenantId: string

  constructor(tenantId: string) {
    this.tenantId = tenantId
  }
  
  async create(data: CreateNotificationInput) {
    return createNotification(data, this.tenantId)
  }
  
  async sendToTenant(data: SendToTenantInput) {
    return sendToTenant(data, this.tenantId)
  }
  
  async list(filters?: NotificationFilters, pagination?: PaginationParams) {
    return listNotifications(filters, pagination, this.tenantId)
  }
  
  async getStats() {
    return getNotificationStats(this.tenantId)
  }
  
  async markAsSent(notificationId: string) {
    return markAsSent(notificationId, this.tenantId)
  }
  
  async markAsDelivered(notificationId: string) {
    return markAsDelivered(notificationId, this.tenantId)
  }
  
  async markAsRead(notificationId: string) {
    return markAsRead(notificationId, this.tenantId)
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
}

// =============================================================================
// COMPATIBILITY EXPORTS (for hooks)
// =============================================================================

export { NotificationError as NotificationServiceError }

// Aliases for hook compatibility
export async function sendNotification(
  data: {
    customerId?: string
    tenantId?: string
    type: NotificationType | string
    channel: NotificationChannel | string
    title?: string
    message?: string
    metadata?: Record<string, unknown>
  }
) {
  const typeStr = String(data.type).replace(/_/g, ' ')
  return createNotification({
    customerId: data.customerId,
    type: data.type as NotificationType,
    channel: data.channel as NotificationChannel,
    title: data.title || typeStr,
    message: data.message || `Notification: ${typeStr}`,
    metadata: data.metadata,
  }, data.tenantId)
}
export const sendBatchNotifications = sendToTenant
export const getNotificationHistory = listNotifications

/**
 * Get notification by ID
 */
export async function getNotificationById(
  id: string,
  inputTenantId?: string
): Promise<{
  id: string
  customerId: string | null
  type: string
  channel: string
  title: string
  message: string
  status: string
  createdAt: Date
  sentAt: Date | null
  deliveredAt: Date | null
  readAt: Date | null
  metadata: Record<string, unknown>
  customer?: {
    firstName: string
    lastName: string
    email: string
  }
} | null> {
  const tenantId = await resolveTenantId(inputTenantId)
  
  const notification = await prisma.notification.findFirst({
    where: {
      id,
      tenantId,
    },
    include: {
      customer: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  })
  
  if (!notification) return null

  return {
    ...notification,
    metadata: (notification.metadata as Record<string, unknown>) ?? {},
    customer: notification.customer ?? undefined,
  }
}

/**
 * Get unread notifications count
 */
export async function getUnreadCount(inputTenantId?: string): Promise<number> {
  const tenantId = await resolveTenantId(inputTenantId)
  
  return prisma.notification.count({
    where: {
      tenantId,
      status: { not: 'READ' },
    },
  })
}

/**
 * Mark all notifications as read
 */
export async function markAllAsRead(inputTenantId?: string): Promise<{ count: number }> {
  const tenantId = await resolveTenantId(inputTenantId)
  
  const result = await prisma.notification.updateMany({
    where: {
      tenantId,
      status: { not: 'READ' },
    },
    data: {
      status: 'READ',
      readAt: new Date(),
    },
  })
  
  return { count: result.count }
}

/**
 * Delete a notification
 */
export async function deleteNotification(
  id: string,
  inputTenantId?: string
): Promise<void> {
  const tenantId = await resolveTenantId(inputTenantId)
  
  await prisma.notification.deleteMany({
    where: {
      id,
      tenantId,
    },
  })
}

/**
 * Retry a failed notification
 */
export async function retryNotification(
  id: string,
  inputTenantId?: string
): Promise<void> {
  const tenantId = await resolveTenantId(inputTenantId)
  
  await prisma.notification.updateMany({
    where: {
      id,
      tenantId,
      status: 'FAILED',
    },
    data: {
      status: 'PENDING',
      errorMessage: null,
      retryCount: { increment: 1 },
    },
  })
}

// Mock functions for preferences and templates (to be implemented)
export async function getNotificationPreferences(_customerId: string) {
  return {
    channels: ['EMAIL', 'SMS'],
    types: ['BOOKING_CONFIRMATION', 'STATUS_UPDATE'],
  }
}

export async function updateNotificationPreferences(_data: unknown) {
  return { success: true }
}

export async function getMessageTemplates() {
  return [
    { id: '1', name: 'Booking Confirmation', type: 'BOOKING_CONFIRMATION' },
    { id: '2', name: 'Status Update', type: 'STATUS_UPDATE' },
  ]
}

export async function previewTemplate(_data: unknown) {
  return { preview: 'Template preview...' }
}

// Template sending functions
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
  })
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
  })
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
    message: `Your invoice for €${data.amount} is ready for payment.`,
    metadata: { invoiceId: data.invoiceId, amount: data.amount },
  })
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
  })
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
    message: `Your vehicle ${data.vehiclePlate} is ready for pickup.${data.totalCost ? ` Total cost: €${data.totalCost}` : ''}`,
    metadata: { vehiclePlate: data.vehiclePlate, totalCost: data.totalCost },
  })
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
  })
}

/**
 * Queue a notification for later delivery (alias for createNotification with scheduledAt)
 */
export async function queueNotification(
  data: {
    customerId?: string
    tenantId?: string
    type: NotificationType | string
    channel: NotificationChannel | string
    title?: string
    message?: string
    metadata?: Record<string, unknown>
    scheduledAt?: string
  },
  inputTenantId?: string
) {
  const typeStr = String(data.type).replace(/_/g, ' ')
  return createNotification({
    customerId: data.customerId,
    type: data.type as NotificationType,
    channel: data.channel as NotificationChannel,
    title: data.title || typeStr,
    message: data.message || `Notification: ${typeStr}`,
    metadata: data.metadata,
  }, inputTenantId || data.tenantId)
}

