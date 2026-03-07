/**
 * MechMind OS - Preventive Maintenance Service (Multi-Tenant)
 * 
 * Service layer for managing vehicle preventive maintenance schedules.
 * All operations are scoped to the current tenant for data isolation.
 * 
 * @module lib/services/maintenanceService
 * @version 2.0.0
 * @requires @prisma/client
 */

import { prisma } from '@/lib/prisma'
import type { 
  MaintenanceSchedule, 
  MaintenanceType, 
  NotificationLevel,
  Prisma 
} from '@prisma/client'
import { 
  tryGetTenantContext, 
  requireTenantId, 
  NoTenantContextError,
  buildTenantQuery 
} from '@/lib/tenant/context'

// =============================================================================
// Type Definitions
// =============================================================================

export interface InspectionFinding {
  id: string
  category: string
  title: string
  description: string
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'OK'
}

export interface CreateMaintenanceScheduleInput {
  vehicleId: string
  type: MaintenanceType
  intervalKm: number
  intervalMonths: number
  lastServiceDate: Date
  lastServiceKm: number
  notificationLevel?: NotificationLevel
}

export interface UpdateMaintenanceScheduleInput {
  intervalKm?: number
  intervalMonths?: number
  lastServiceDate?: Date
  lastServiceKm?: number
  nextDueDate?: Date
  nextDueKm?: number
  notificationLevel?: NotificationLevel
}

export interface CompleteMaintenanceInput {
  currentKm: number
  date?: Date
  notes?: string
}

export interface NextDueCalculation {
  nextDueDate: Date
  nextDueKm: number
  daysUntilDue: number
  kmUntilDue: number
  isOverdue: boolean
}

export interface MaintenanceSummary {
  total: number
  overdue: number
  dueSoon: number
  upcoming: number
  byVehicle: Record<string, {
    vehicleInfo: string
    total: number
    overdue: number
    upcoming: number
  }>
}

export interface PaginatedMaintenance {
  items: MaintenanceScheduleWithVehicle[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface MaintenanceScheduleWithVehicle extends MaintenanceSchedule {
  vehicle: {
    id: string
    make: string
    model: string
    year: number
    licensePlate: string | null
    mileage: number | null
  }
}

export interface MaintenanceFilters {
  vehicleId?: string
  type?: MaintenanceType
  isOverdue?: boolean
  dueBefore?: Date
  dueAfter?: Date
  notificationLevel?: NotificationLevel
  tenantId?: string // Optional override for admin operations
}

export interface PaginationParams {
  page?: number
  limit?: number
  sortBy?: keyof MaintenanceSchedule
  sortOrder?: 'asc' | 'desc'
}

// =============================================================================
// Error Classes
// =============================================================================

export class MaintenanceNotFoundError extends Error {
  constructor(scheduleId: string) {
    super(`Maintenance schedule with ID "${scheduleId}" not found`)
    this.name = 'MaintenanceNotFoundError'
  }
}

export class MaintenanceValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message)
    this.name = 'MaintenanceValidationError'
  }
}

export class VehicleNotFoundError extends Error {
  constructor(vehicleId: string) {
    super(`Vehicle with ID "${vehicleId}" not found`)
    this.name = 'VehicleNotFoundError'
  }
}

export class TenantRequiredError extends Error {
  constructor() {
    super('Tenant context is required for this operation')
    this.name = 'TenantRequiredError'
  }
}

// =============================================================================
// Logger
// =============================================================================

const logger = {
  debug: (message: string, meta?: Record<string, unknown>) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[MaintenanceService] ${message}`, meta ? JSON.stringify(meta) : '')
    }
  },
  info: (message: string, meta?: Record<string, unknown>) => {
    console.info(`[MaintenanceService] ${message}`, meta ? JSON.stringify(meta) : '')
  },
  warn: (message: string, meta?: Record<string, unknown>) => {
    console.warn(`[MaintenanceService] ${message}`, meta ? JSON.stringify(meta) : '')
  },
  error: (message: string, error?: unknown, meta?: Record<string, unknown>) => {
    console.error(`[MaintenanceService] ${message}`, error, meta ? JSON.stringify(meta) : '')
  }
}

// =============================================================================
// Tenant Context Helper
// =============================================================================

/**
 * Get tenant ID from context or input
 */
function resolveTenantId(inputTenantId?: string): string {
  // If tenantId provided explicitly (e.g., for admin operations), use it
  if (inputTenantId) {
    return inputTenantId
  }
  
  // Otherwise, get from context
  try {
    return requireTenantId()
  } catch {
    throw new TenantRequiredError()
  }
}

// =============================================================================
// Core Functions
// =============================================================================

export function calculateNextDue(
  lastKm: number,
  lastDate: Date,
  intervalKm: number,
  intervalMonths: number
): NextDueCalculation {
  logger.debug('Calculating next due', { lastKm, lastDate, intervalKm, intervalMonths })
  
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const nextDueDate = new Date(lastDate)
  nextDueDate.setMonth(nextDueDate.getMonth() + intervalMonths)
  
  const nextDueKm = lastKm + intervalKm
  
  const diffTime = nextDueDate.getTime() - today.getTime()
  const daysUntilDue = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  const kmUntilDue = intervalKm
  
  const isOverdue = daysUntilDue < 0
  
  const result: NextDueCalculation = {
    nextDueDate,
    nextDueKm,
    daysUntilDue,
    kmUntilDue,
    isOverdue
  }
  
  logger.debug('Next due calculated', result)
  return result
}

export async function createMaintenanceSchedule(
  data: CreateMaintenanceScheduleInput,
  inputTenantId?: string
): Promise<MaintenanceScheduleWithVehicle> {
  const tenantId = resolveTenantId(inputTenantId)
  
  logger.info('Creating maintenance schedule', { 
    tenantId,
    vehicleId: data.vehicleId, 
    type: data.type 
  })
  
  try {
    // Validate required fields
    if (!data.vehicleId) {
      throw new MaintenanceValidationError('Vehicle ID is required', 'vehicleId')
    }
    if (!data.type) {
      throw new MaintenanceValidationError('Maintenance type is required', 'type')
    }
    if (data.intervalKm <= 0) {
      throw new MaintenanceValidationError('Interval KM must be positive', 'intervalKm')
    }
    if (data.intervalMonths <= 0) {
      throw new MaintenanceValidationError('Interval months must be positive', 'intervalMonths')
    }
    if (data.lastServiceKm < 0) {
      throw new MaintenanceValidationError('Last service KM cannot be negative', 'lastServiceKm')
    }

    // Verify vehicle exists AND belongs to tenant
    const vehicle = await prisma.vehicle.findFirst({
      where: {
        id: data.vehicleId,
        tenantId,
      }
    })
    
    if (!vehicle) {
      throw new VehicleNotFoundError(data.vehicleId)
    }
    
    const nextDue = calculateNextDue(
      data.lastServiceKm,
      data.lastServiceDate,
      data.intervalKm,
      data.intervalMonths
    )
    
    // Create schedule with tenant ID
    const schedule = await prisma.maintenanceSchedule.create({
      data: {
        tenantId,
        vehicleId: data.vehicleId,
        type: data.type,
        intervalKm: data.intervalKm,
        intervalMonths: data.intervalMonths,
        lastServiceDate: data.lastServiceDate,
        lastServiceKm: data.lastServiceKm,
        nextDueDate: nextDue.nextDueDate,
        nextDueKm: nextDue.nextDueKm,
        daysUntilDue: nextDue.daysUntilDue,
        kmUntilDue: nextDue.kmUntilDue,
        isOverdue: nextDue.isOverdue,
        notificationLevel: data.notificationLevel || 'ALERT'
      },
      include: {
        vehicle: {
          select: {
            id: true,
            make: true,
            model: true,
            year: true,
            licensePlate: true,
            mileage: true
          }
        }
      }
    })
    
    logger.info('Maintenance schedule created', { tenantId, scheduleId: schedule.id })
    return schedule
  } catch (error) {
    if (error instanceof MaintenanceValidationError || 
        error instanceof VehicleNotFoundError ||
        error instanceof TenantRequiredError) {
      throw error
    }
    
    logger.error('Failed to create maintenance schedule', error, { tenantId, data })
    throw new Error('Failed to create maintenance schedule')
  }
}

export async function getMaintenanceScheduleById(
  id: string,
  inputTenantId?: string
): Promise<MaintenanceScheduleWithVehicle> {
  const tenantId = resolveTenantId(inputTenantId)
  
  logger.debug('Fetching maintenance schedule', { tenantId, scheduleId: id })
  
  try {
    if (!id) {
      throw new MaintenanceValidationError('Schedule ID is required')
    }
    
    // Must include tenantId in query for data isolation
    const schedule = await prisma.maintenanceSchedule.findFirst({
      where: {
        id,
        tenantId,
      },
      include: {
        vehicle: {
          select: {
            id: true,
            make: true,
            model: true,
            year: true,
            licensePlate: true,
            mileage: true
          }
        }
      }
    })
    
    if (!schedule) {
      throw new MaintenanceNotFoundError(id)
    }
    
    return schedule
  } catch (error) {
    if (error instanceof MaintenanceNotFoundError || 
        error instanceof MaintenanceValidationError ||
        error instanceof TenantRequiredError) {
      throw error
    }
    
    logger.error('Failed to fetch maintenance schedule', error, { tenantId, scheduleId: id })
    throw new Error('Failed to fetch maintenance schedule')
  }
}

export async function updateMaintenanceSchedule(
  id: string,
  data: UpdateMaintenanceScheduleInput,
  inputTenantId?: string
): Promise<MaintenanceScheduleWithVehicle> {
  const tenantId = resolveTenantId(inputTenantId)
  
  logger.info('Updating maintenance schedule', { tenantId, scheduleId: id })
  
  try {
    if (!id) {
      throw new MaintenanceValidationError('Schedule ID is required')
    }
    
    // Check if schedule exists AND belongs to tenant
    const existing = await prisma.maintenanceSchedule.findFirst({
      where: {
        id,
        tenantId,
      }
    })
    
    if (!existing) {
      throw new MaintenanceNotFoundError(id)
    }
    
    let updateData: Prisma.MaintenanceScheduleUpdateInput = { ...data }
    
    if (data.lastServiceDate || data.lastServiceKm !== undefined || 
        data.intervalKm !== undefined || data.intervalMonths !== undefined) {
      const lastDate = data.lastServiceDate || existing.lastServiceDate
      const lastKm = data.lastServiceKm !== undefined ? data.lastServiceKm : existing.lastServiceKm
      const intervalKm = data.intervalKm !== undefined ? data.intervalKm : existing.intervalKm
      const intervalMonths = data.intervalMonths !== undefined ? data.intervalMonths : existing.intervalMonths
      
      const nextDue = calculateNextDue(lastKm, lastDate, intervalKm, intervalMonths)
      
      updateData = {
        ...updateData,
        nextDueDate: nextDue.nextDueDate,
        nextDueKm: nextDue.nextDueKm,
        daysUntilDue: nextDue.daysUntilDue,
        kmUntilDue: nextDue.kmUntilDue,
        isOverdue: nextDue.isOverdue
      }
    }
    
    const schedule = await prisma.maintenanceSchedule.update({
      where: { id },
      data: updateData,
      include: {
        vehicle: {
          select: {
            id: true,
            make: true,
            model: true,
            year: true,
            licensePlate: true,
            mileage: true
          }
        }
      }
    })
    
    logger.info('Maintenance schedule updated', { tenantId, scheduleId: id })
    return schedule
  } catch (error) {
    if (error instanceof MaintenanceNotFoundError || 
        error instanceof MaintenanceValidationError ||
        error instanceof TenantRequiredError) {
      throw error
    }
    
    logger.error('Failed to update maintenance schedule', error, { tenantId, scheduleId: id })
    throw new Error('Failed to update maintenance schedule')
  }
}

export async function deleteMaintenanceSchedule(
  id: string,
  inputTenantId?: string
): Promise<{ success: boolean; deletedAt: Date }> {
  const tenantId = resolveTenantId(inputTenantId)
  
  logger.info('Deleting maintenance schedule', { tenantId, scheduleId: id })
  
  try {
    if (!id) {
      throw new MaintenanceValidationError('Schedule ID is required')
    }
    
    // Check if schedule exists AND belongs to tenant
    const existing = await prisma.maintenanceSchedule.findFirst({
      where: {
        id,
        tenantId,
      }
    })
    
    if (!existing) {
      throw new MaintenanceNotFoundError(id)
    }
    
    await prisma.maintenanceSchedule.delete({
      where: { id }
    })
    
    logger.info('Maintenance schedule deleted', { tenantId, scheduleId: id })
    return { success: true, deletedAt: new Date() }
  } catch (error) {
    if (error instanceof MaintenanceNotFoundError || 
        error instanceof MaintenanceValidationError ||
        error instanceof TenantRequiredError) {
      throw error
    }
    
    logger.error('Failed to delete maintenance schedule', error, { tenantId, scheduleId: id })
    throw new Error('Failed to delete maintenance schedule')
  }
}

export async function listMaintenanceSchedules(
  filters: MaintenanceFilters = {},
  pagination: PaginationParams = {},
  inputTenantId?: string
): Promise<PaginatedMaintenance> {
  const tenantId = filters.tenantId || resolveTenantId(inputTenantId)
  
  logger.debug('Listing maintenance schedules', { tenantId, filters, pagination })
  
  try {
    const page = pagination.page ?? 1
    const limit = pagination.limit ?? 20
    const skip = (page - 1) * limit
    const sortBy = pagination.sortBy ?? 'nextDueDate'
    const sortOrder = pagination.sortOrder ?? 'asc'
    
    // Build where clause WITH tenant isolation
    const where: Prisma.MaintenanceScheduleWhereInput = {
      tenantId, // Always filter by tenant
    }
    
    if (filters.vehicleId) {
      where.vehicleId = filters.vehicleId
    }
    
    if (filters.type) {
      where.type = filters.type
    }
    
    if (filters.isOverdue !== undefined) {
      where.isOverdue = filters.isOverdue
    }
    
    if (filters.notificationLevel) {
      where.notificationLevel = filters.notificationLevel
    }
    
    if (filters.dueBefore || filters.dueAfter) {
      where.nextDueDate = {}
      if (filters.dueAfter) {
        where.nextDueDate.gte = filters.dueAfter
      }
      if (filters.dueBefore) {
        where.nextDueDate.lte = filters.dueBefore
      }
    }
    
    const [total, items] = await Promise.all([
      prisma.maintenanceSchedule.count({ where }),
      prisma.maintenanceSchedule.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          vehicle: {
            select: {
              id: true,
              make: true,
              model: true,
              year: true,
              licensePlate: true,
              mileage: true
            }
          }
        }
      })
    ])
    
    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  } catch (error) {
    if (error instanceof TenantRequiredError) {
      throw error
    }
    
    logger.error('Failed to list maintenance schedules', error, { tenantId, filters, pagination })
    throw new Error('Failed to list maintenance schedules')
  }
}

/**
 * Get overdue maintenance items for a tenant
 * CRITICAL: Always filters by tenantId for data isolation
 */
export async function getOverdueItems(
  tenantIdOrVehicleId?: string,
  vehicleId?: string,
  inputTenantId?: string
): Promise<MaintenanceScheduleWithVehicle[]> {
  // Handle both signatures for backward compatibility
  const actualTenantId = inputTenantId || 
    (tryGetTenantContext()?.tenantId) || 
    tenantIdOrVehicleId
  
  const actualVehicleId = vehicleId || 
    (inputTenantId ? tenantIdOrVehicleId : undefined)
  
  if (!actualTenantId) {
    throw new TenantRequiredError()
  }
  
  logger.debug('Fetching overdue maintenance items', { tenantId: actualTenantId, vehicleId: actualVehicleId })
  
  try {
    const where: Prisma.MaintenanceScheduleWhereInput = {
      tenantId: actualTenantId,
      isOverdue: true
    }
    
    if (actualVehicleId) {
      where.vehicleId = actualVehicleId
    }
    
    const items = await prisma.maintenanceSchedule.findMany({
      where,
      orderBy: { nextDueDate: 'asc' },
      include: {
        vehicle: {
          select: {
            id: true,
            make: true,
            model: true,
            year: true,
            licensePlate: true,
            mileage: true
          }
        }
      }
    })
    
    return items
  } catch (error) {
    logger.error('Failed to fetch overdue items', error, { tenantId: actualTenantId, vehicleId: actualVehicleId })
    throw new Error('Failed to fetch overdue items')
  }
}

export async function getUpcomingItems(
  days: number = 30,
  vehicleId?: string,
  inputTenantId?: string
): Promise<MaintenanceScheduleWithVehicle[]> {
  const tenantId = resolveTenantId(inputTenantId)
  
  logger.debug('Fetching upcoming maintenance items', { tenantId, days, vehicleId })
  
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const futureDate = new Date(today)
    futureDate.setDate(futureDate.getDate() + days)
    
    const where: Prisma.MaintenanceScheduleWhereInput = {
      tenantId,
      nextDueDate: {
        gte: today,
        lte: futureDate
      },
      isOverdue: false
    }
    
    if (vehicleId) {
      where.vehicleId = vehicleId
    }
    
    const items = await prisma.maintenanceSchedule.findMany({
      where,
      orderBy: { nextDueDate: 'asc' },
      include: {
        vehicle: {
          select: {
            id: true,
            make: true,
            model: true,
            year: true,
            licensePlate: true,
            mileage: true
          }
        }
      }
    })
    
    return items
  } catch (error) {
    if (error instanceof TenantRequiredError) {
      throw error
    }
    
    logger.error('Failed to fetch upcoming items', error, { tenantId, days, vehicleId })
    throw new Error('Failed to fetch upcoming items')
  }
}

export async function markAsCompleted(
  scheduleId: string,
  data: CompleteMaintenanceInput,
  inputTenantId?: string
): Promise<MaintenanceScheduleWithVehicle> {
  const tenantId = resolveTenantId(inputTenantId)
  
  logger.info('Marking maintenance as completed', { tenantId, scheduleId, ...data })
  
  try {
    if (!scheduleId) {
      throw new MaintenanceValidationError('Schedule ID is required')
    }
    
    if (data.currentKm === undefined || data.currentKm < 0) {
      throw new MaintenanceValidationError('Valid current KM is required', 'currentKm')
    }
    
    // Check schedule exists AND belongs to tenant
    const schedule = await prisma.maintenanceSchedule.findFirst({
      where: {
        id: scheduleId,
        tenantId,
      }
    })
    
    if (!schedule) {
      throw new MaintenanceNotFoundError(scheduleId)
    }
    
    const completionDate = data.date || new Date()
    
    const nextDue = calculateNextDue(
      data.currentKm,
      completionDate,
      schedule.intervalKm,
      schedule.intervalMonths
    )
    
    const updated = await prisma.maintenanceSchedule.update({
      where: { id: scheduleId },
      data: {
        lastServiceDate: completionDate,
        lastServiceKm: data.currentKm,
        nextDueDate: nextDue.nextDueDate,
        nextDueKm: nextDue.nextDueKm,
        daysUntilDue: nextDue.daysUntilDue,
        kmUntilDue: nextDue.kmUntilDue,
        isOverdue: nextDue.isOverdue,
        alertSentAt: null
      },
      include: {
        vehicle: {
          select: {
            id: true,
            make: true,
            model: true,
            year: true,
            licensePlate: true,
            mileage: true
          }
        }
      }
    })
    
    logger.info('Maintenance marked as completed', { tenantId, scheduleId })
    return updated
  } catch (error) {
    if (error instanceof MaintenanceNotFoundError || 
        error instanceof MaintenanceValidationError ||
        error instanceof TenantRequiredError) {
      throw error
    }
    
    logger.error('Failed to mark maintenance as completed', error, { tenantId, scheduleId, data })
    throw new Error('Failed to mark maintenance as completed')
  }
}

export async function checkOverdueStatus(
  inputTenantId?: string
): Promise<{
  updated: number
  newlyOverdue: number
  alertsToSend: MaintenanceScheduleWithVehicle[]
}> {
  const tenantId = resolveTenantId(inputTenantId)
  
  logger.info('Checking overdue status', { tenantId })
  
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    // Get schedules that need updating - scoped to tenant
    const schedules = await prisma.maintenanceSchedule.findMany({
      where: {
        tenantId,
        OR: [
          { nextDueDate: { lt: today }, isOverdue: false },
          { nextDueDate: { gte: today }, isOverdue: true }
        ]
      },
      include: {
        vehicle: {
          select: {
            id: true,
            make: true,
            model: true,
            year: true,
            licensePlate: true,
            mileage: true
          }
        }
      }
    })
    
    let updated = 0
    let newlyOverdue = 0
    const alertsToSend: MaintenanceScheduleWithVehicle[] = []
    
    for (const schedule of schedules) {
      const diffTime = schedule.nextDueDate.getTime() - today.getTime()
      const daysUntilDue = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      const isOverdue = daysUntilDue < 0
      
      if (isOverdue && !schedule.isOverdue) {
        newlyOverdue++
        if (!schedule.alertSentAt) {
          alertsToSend.push(schedule)
        }
      }
      
      await prisma.maintenanceSchedule.update({
        where: { id: schedule.id },
        data: {
          daysUntilDue,
          isOverdue
        }
      })
      
      updated++
    }
    
    // Check for items due within 7 days
    const dueSoon = await getUpcomingItems(7, undefined, tenantId)
    for (const schedule of dueSoon) {
      if (!schedule.alertSentAt && schedule.notificationLevel !== 'CRITICAL') {
        alertsToSend.push(schedule)
      }
    }
    
    logger.info('Overdue status check completed', { 
      tenantId,
      updated, 
      newlyOverdue, 
      alertsToSend: alertsToSend.length 
    })
    
    return { updated, newlyOverdue, alertsToSend }
  } catch (error) {
    if (error instanceof TenantRequiredError) {
      throw error
    }
    
    logger.error('Failed to check overdue status', error, { tenantId })
    throw new Error('Failed to check overdue status')
  }
}

export async function getMaintenanceSummary(
  inputTenantId?: string
): Promise<MaintenanceSummary> {
  const tenantId = resolveTenantId(inputTenantId)
  
  logger.debug('Fetching maintenance summary', { tenantId })
  
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const sevenDaysFromNow = new Date(today)
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7)
    
    const thirtyDaysFromNow = new Date(today)
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)
    
    const baseWhere = { tenantId }
    
    const [
      total,
      overdue,
      dueSoon,
      upcoming,
      byVehicleData
    ] = await Promise.all([
      prisma.maintenanceSchedule.count({ where: baseWhere }),
      prisma.maintenanceSchedule.count({ 
        where: { ...baseWhere, isOverdue: true } 
      }),
      prisma.maintenanceSchedule.count({
        where: {
          ...baseWhere,
          nextDueDate: { gte: today, lte: sevenDaysFromNow },
          isOverdue: false
        }
      }),
      prisma.maintenanceSchedule.count({
        where: {
          ...baseWhere,
          nextDueDate: { gte: today, lte: thirtyDaysFromNow },
          isOverdue: false
        }
      }),
      prisma.maintenanceSchedule.groupBy({
        by: ['vehicleId'],
        where: baseWhere,
        _count: { id: true }
      })
    ])
    
    // Get vehicle details for breakdown
    const byVehicle: MaintenanceSummary['byVehicle'] = {}
    
    for (const v of byVehicleData) {
      const vehicle = await prisma.vehicle.findFirst({
        where: {
          id: v.vehicleId,
          tenantId,
        },
        select: {
          make: true,
          model: true,
          year: true,
          licensePlate: true
        }
      })
      
      if (vehicle) {
        const vehicleSchedules = await prisma.maintenanceSchedule.findMany({
          where: {
            tenantId,
            vehicleId: v.vehicleId
          },
          select: {
            isOverdue: true,
            nextDueDate: true
          }
        })
        
        byVehicle[v.vehicleId] = {
          vehicleInfo: `${vehicle.make} ${vehicle.model} (${vehicle.year}) - ${vehicle.licensePlate}`,
          total: v._count.id,
          overdue: vehicleSchedules.filter(s => s.isOverdue).length,
          upcoming: vehicleSchedules.filter(s => {
            const dueDate = new Date(s.nextDueDate)
            return !s.isOverdue && dueDate <= thirtyDaysFromNow && dueDate >= today
          }).length
        }
      }
    }
    
    return {
      total,
      overdue,
      dueSoon,
      upcoming,
      byVehicle
    }
  } catch (error) {
    if (error instanceof TenantRequiredError) {
      throw error
    }
    
    logger.error('Failed to fetch maintenance summary', error, { tenantId })
    throw new Error('Failed to fetch maintenance summary')
  }
}

// Helper function for mapping (placeholder)
function mapFindingToMaintenanceType(category: string): MaintenanceType | null {
  const mapping: Record<string, MaintenanceType> = {
    'OIL': 'OIL_CHANGE',
    'TIRE': 'TIRE_ROTATION',
    'BRAKE': 'BRAKE_CHECK',
    'FILTER': 'FILTER',
    'BELT': 'BELTS',
    'BATTERY': 'BATTERY',
  }
  return mapping[category.toUpperCase()] || null
}

function mapSeverityToNotificationLevel(severity: string): NotificationLevel {
  switch (severity) {
    case 'CRITICAL':
      return 'CRITICAL'
    case 'HIGH':
      return 'WARNING'
    default:
      return 'ALERT'
  }
}

export async function createFromInspection(
  inspectionId: string,
  findings: InspectionFinding[],
  inputTenantId?: string
): Promise<MaintenanceScheduleWithVehicle[]> {
  const tenantId = resolveTenantId(inputTenantId)
  
  logger.info('Creating maintenance from inspection findings', { 
    tenantId,
    inspectionId, 
    findingCount: findings.length 
  })
  
  try {
    const created: MaintenanceScheduleWithVehicle[] = []
    
    for (const finding of findings) {
      const maintenanceType = mapFindingToMaintenanceType(finding.category)
      
      if (!maintenanceType) {
        continue
      }
      
      // Check if schedule already exists for this vehicle and type
      const existing = await prisma.maintenanceSchedule.findFirst({
        where: {
          tenantId,
          type: maintenanceType
        }
      })
      
      if (existing) {
        logger.debug('Maintenance schedule already exists, skipping', {
          tenantId,
          vehicleId: existing.vehicleId,
          type: maintenanceType
        })
        continue
      }
      
      logger.debug('Would create maintenance schedule for finding', {
        tenantId,
        findingId: finding.id,
        type: maintenanceType
      })
    }
    
    return created
  } catch (error) {
    if (error instanceof TenantRequiredError) {
      throw error
    }
    
    logger.error('Failed to create maintenance from inspection', error, { 
      tenantId,
      inspectionId, 
      findings 
    })
    throw new Error('Failed to create maintenance from inspection')
  }
}
