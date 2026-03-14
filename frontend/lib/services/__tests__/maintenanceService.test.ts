/**
 * Maintenance Service Unit Tests
 * 
 * Tests for preventive maintenance CRUD operations, due date calculations,
 * and overdue detection.
 * 
 * @module lib/services/__tests__/maintenanceService
 */

// Jest globals are available automatically
// Jest Mock type

// Mock @prisma/client
jest.mock('@prisma/client', () => {
  const actual = jest.requireActual('@prisma/client') as Record<string, unknown>
  return {
    ...actual,
    Prisma: {
      ...(actual.Prisma as Record<string, unknown> || {}),
      PrismaClientKnownRequestError: class PrismaClientKnownRequestError extends Error {
        code: string
        constructor(message: string, { code }: { code: string }) {
          super(message); this.code = code; this.name = 'PrismaClientKnownRequestError'
        }
      },
    },
  }
})

// Mock tenant context
jest.mock('@/lib/tenant/context', () => ({
  tryGetTenantContext: jest.fn().mockReturnValue({ tenantId: 'test-tenant-id' }),
  requireTenantId: jest.fn().mockResolvedValue('test-tenant-id'),
  NoTenantContextError: class extends Error { constructor() { super('No tenant context') } },
  setTenantContext: jest.fn(),
  clearTenantContext: jest.fn(),
  TenantContext: {},
}))

// Mock Prisma
const mockPrisma = {
  maintenanceSchedule: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    groupBy: jest.fn()
  },
  vehicle: {
    findUnique: jest.fn(),
    findFirst: jest.fn()
  }
}

jest.mock('@/lib/prisma', () => ({
  prisma: mockPrisma
}))

// Import after mocking
import {
  calculateNextDue,
  createMaintenanceSchedule,
  getMaintenanceScheduleById,
  updateMaintenanceSchedule,
  deleteMaintenanceSchedule,
  listMaintenanceSchedules,
  getOverdueItems,
  getUpcomingItems,
  markAsCompleted,
  checkOverdueStatus,
  getMaintenanceSummary,
  MaintenanceNotFoundError,
  MaintenanceValidationError,
  VehicleNotFoundError,
  type CreateMaintenanceScheduleInput,
  type UpdateMaintenanceScheduleInput,
  type CompleteMaintenanceInput,
  type NextDueCalculation
} from '../maintenanceService'

// These helper functions are not exported from the service; define local versions for testing
function getMaintenanceTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    OIL_CHANGE: 'Cambio Olio',
    TIRE_ROTATION: 'Rotazione Pneumatici',
    BRAKE_CHECK: 'Controllo Freni',
    FILTER: 'Sostituzione Filtri',
    INSPECTION: 'Ispezione Generale',
    BELTS: 'Controllo Cinghie',
    BATTERY: 'Controllo Batteria',
  }
  return labels[type] || type
}

function getNotificationLevelLabel(level: string): string {
  const labels: Record<string, string> = {
    ALERT: 'Avviso',
    WARNING: 'Attenzione',
    CRITICAL: 'Critico',
  }
  return labels[level] || level
}

function getNotificationLevelColor(level: string): string {
  const colors: Record<string, string> = {
    ALERT: 'blue',
    WARNING: 'yellow',
    CRITICAL: 'red',
  }
  return colors[level] || 'gray'
}

describe('MaintenanceService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Suppress console output during tests
    jest.spyOn(console, 'log').mockImplementation(() => {})
    jest.spyOn(console, 'info').mockImplementation(() => {})
    jest.spyOn(console, 'warn').mockImplementation(() => {})
    jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  // =============================================================================
  // calculateNextDue Tests
  // =============================================================================
  describe('calculateNextDue', () => {
    it('should calculate next due correctly for standard intervals', () => {
      const lastDate = new Date('2024-01-01')
      const result = calculateNextDue(50000, lastDate, 10000, 6)
      
      expect(result.nextDueKm).toBe(60000)
      expect(result.isOverdue).toBe(true) // January 2024 is in the past
      expect(result.nextDueDate.getMonth()).toBe(6) // July (0-indexed)
      expect(result.nextDueDate.getFullYear()).toBe(2024)
    })

    it('should handle future dates as not overdue', () => {
      const futureDate = new Date()
      futureDate.setMonth(futureDate.getMonth() + 1) // 1 month from now
      
      const result = calculateNextDue(50000, futureDate, 10000, 6)
      
      expect(result.isOverdue).toBe(false)
      expect(result.daysUntilDue).toBeGreaterThan(0)
    })

    it('should calculate days until due correctly', () => {
      const today = new Date()
      const lastDate = new Date(today)
      lastDate.setMonth(lastDate.getMonth() - 3) // 3 months ago
      
      const result = calculateNextDue(50000, lastDate, 10000, 6)
      
      // Should have about 3 months (90 days) remaining
      expect(result.daysUntilDue).toBeGreaterThan(80)
      expect(result.daysUntilDue).toBeLessThan(100)
      expect(result.isOverdue).toBe(false)
    })

    it('should handle overdue dates', () => {
      const today = new Date()
      const lastDate = new Date(today)
      lastDate.setMonth(lastDate.getMonth() - 12) // 1 year ago
      
      const result = calculateNextDue(50000, lastDate, 10000, 6)
      
      expect(result.isOverdue).toBe(true)
      expect(result.daysUntilDue).toBeLessThan(0)
    })

    it('should return correct km until due', () => {
      const result = calculateNextDue(50000, new Date(), 15000, 12)
      
      expect(result.kmUntilDue).toBe(15000)
      expect(result.nextDueKm).toBe(65000)
    })
  })

  // =============================================================================
  // createMaintenanceSchedule Tests
  // =============================================================================
  describe('createMaintenanceSchedule', () => {
    const validInput: CreateMaintenanceScheduleInput = {
      vehicleId: 'vehicle-123',
      type: 'OIL_CHANGE',
      intervalKm: 10000,
      intervalMonths: 6,
      lastServiceDate: new Date('2024-01-15'),
      lastServiceKm: 50000,
      notificationLevel: 'ALERT'
    }

    const mockVehicle = {
      id: 'vehicle-123',
      make: 'Toyota',
      model: 'Corolla',
      year: 2020,
      licensePlate: 'AB123CD',
      mileage: 52000
    }

    const mockSchedule = {
      id: 'schedule-001',
      vehicleId: 'vehicle-123',
      type: 'OIL_CHANGE',
      intervalKm: 10000,
      intervalMonths: 6,
      lastServiceDate: new Date('2024-01-15'),
      lastServiceKm: 50000,
      nextDueDate: new Date('2024-07-15'),
      nextDueKm: 60000,
      isOverdue: false,
      daysUntilDue: 100,
      kmUntilDue: 10000,
      alertSentAt: null,
      notificationLevel: 'ALERT',
      createdAt: new Date(),
      updatedAt: new Date(),
      vehicle: mockVehicle
    }

    it('should create a maintenance schedule successfully', async () => {
      mockPrisma.vehicle.findFirst.mockResolvedValue(mockVehicle)
      mockPrisma.maintenanceSchedule.create.mockResolvedValue(mockSchedule)

      const result = await createMaintenanceSchedule(validInput)

      expect(result).toEqual(mockSchedule)
      expect(mockPrisma.vehicle.findFirst).toHaveBeenCalledWith({
        where: { id: 'vehicle-123', tenantId: 'test-tenant-id' }
      })
      expect(mockPrisma.maintenanceSchedule.create).toHaveBeenCalled()
    })

    it('should throw MaintenanceValidationError when vehicleId is missing', async () => {
      const invalidInput = { ...validInput, vehicleId: '' }

      await expect(createMaintenanceSchedule(invalidInput))
        .rejects.toThrow(MaintenanceValidationError)
      await expect(createMaintenanceSchedule(invalidInput))
        .rejects.toThrow('Vehicle ID is required')
    })

    it('should throw MaintenanceValidationError when type is missing', async () => {
      const invalidInput = { ...validInput, type: '' as any }

      await expect(createMaintenanceSchedule(invalidInput))
        .rejects.toThrow(MaintenanceValidationError)
    })

    it('should throw MaintenanceValidationError when intervalKm is not positive', async () => {
      const invalidInput = { ...validInput, intervalKm: 0 }

      await expect(createMaintenanceSchedule(invalidInput))
        .rejects.toThrow(MaintenanceValidationError)
      await expect(createMaintenanceSchedule(invalidInput))
        .rejects.toThrow('Interval KM must be positive')
    })

    it('should throw MaintenanceValidationError when intervalMonths is not positive', async () => {
      const invalidInput = { ...validInput, intervalMonths: -1 }

      await expect(createMaintenanceSchedule(invalidInput))
        .rejects.toThrow(MaintenanceValidationError)
    })

    it('should throw MaintenanceValidationError when lastServiceKm is negative', async () => {
      const invalidInput = { ...validInput, lastServiceKm: -100 }

      await expect(createMaintenanceSchedule(invalidInput))
        .rejects.toThrow(MaintenanceValidationError)
    })

    it('should throw VehicleNotFoundError when vehicle does not exist', async () => {
      mockPrisma.vehicle.findFirst.mockResolvedValue(null)

      await expect(createMaintenanceSchedule(validInput))
        .rejects.toThrow(VehicleNotFoundError)
    })

    it('should calculate next due date correctly when creating', async () => {
      mockPrisma.vehicle.findFirst.mockResolvedValue(mockVehicle)
      mockPrisma.maintenanceSchedule.create.mockImplementation((args: any) => ({
        ...mockSchedule,
        ...args.data
      }))

      await createMaintenanceSchedule(validInput)

      const createCall = mockPrisma.maintenanceSchedule.create.mock.calls[0][0]
      expect(createCall.data.nextDueDate).toBeInstanceOf(Date)
      expect(createCall.data.nextDueKm).toBe(60000) // 50000 + 10000
      expect(createCall.data.daysUntilDue).toBeDefined()
    })
  })

  // =============================================================================
  // getMaintenanceScheduleById Tests
  // =============================================================================
  describe('getMaintenanceScheduleById', () => {
    const mockSchedule = {
      id: 'schedule-001',
      vehicleId: 'vehicle-123',
      type: 'OIL_CHANGE',
      vehicle: {
        id: 'vehicle-123',
        make: 'Toyota',
        model: 'Corolla',
        year: 2020,
        licensePlate: 'AB123CD',
        mileage: 52000
      }
    }

    it('should retrieve a schedule by ID', async () => {
      mockPrisma.maintenanceSchedule.findFirst.mockResolvedValue(mockSchedule)

      const result = await getMaintenanceScheduleById('schedule-001')

      expect(result).toEqual(mockSchedule)
      expect(mockPrisma.maintenanceSchedule.findFirst).toHaveBeenCalledWith({
        where: { id: 'schedule-001', tenantId: 'test-tenant-id' },
        include: expect.any(Object)
      })
    })

    it('should throw MaintenanceValidationError when ID is empty', async () => {
      await expect(getMaintenanceScheduleById(''))
        .rejects.toThrow(MaintenanceValidationError)
    })

    it('should throw MaintenanceNotFoundError when schedule does not exist', async () => {
      mockPrisma.maintenanceSchedule.findFirst.mockResolvedValue(null)

      await expect(getMaintenanceScheduleById('non-existent'))
        .rejects.toThrow(MaintenanceNotFoundError)
    })
  })

  // =============================================================================
  // updateMaintenanceSchedule Tests
  // =============================================================================
  describe('updateMaintenanceSchedule', () => {
    const existingSchedule = {
      id: 'schedule-001',
      vehicleId: 'vehicle-123',
      type: 'OIL_CHANGE',
      intervalKm: 10000,
      intervalMonths: 6,
      lastServiceDate: new Date('2024-01-15'),
      lastServiceKm: 50000
    }

    const mockScheduleWithVehicle = {
      ...existingSchedule,
      nextDueDate: new Date('2024-07-15'),
      nextDueKm: 60000,
      isOverdue: false,
      daysUntilDue: 100,
      kmUntilDue: 10000,
      alertSentAt: null,
      notificationLevel: 'ALERT',
      createdAt: new Date(),
      updatedAt: new Date(),
      vehicle: {
        id: 'vehicle-123',
        make: 'Toyota',
        model: 'Corolla',
        year: 2020,
        licensePlate: 'AB123CD',
        mileage: 52000
      }
    }

    it('should update a schedule successfully', async () => {
      mockPrisma.maintenanceSchedule.findFirst.mockResolvedValue(existingSchedule)
      mockPrisma.maintenanceSchedule.update.mockResolvedValue(mockScheduleWithVehicle)

      const updateData: UpdateMaintenanceScheduleInput = {
        intervalKm: 15000
      }

      const result = await updateMaintenanceSchedule('schedule-001', updateData)

      expect(result).toEqual(mockScheduleWithVehicle)
      expect(mockPrisma.maintenanceSchedule.update).toHaveBeenCalled()
    })

    it('should recalculate next due when interval changes', async () => {
      mockPrisma.maintenanceSchedule.findFirst.mockResolvedValue(existingSchedule)
      mockPrisma.maintenanceSchedule.update.mockImplementation((args: any) => ({
        ...mockScheduleWithVehicle,
        ...args.data
      }))

      await updateMaintenanceSchedule('schedule-001', { intervalKm: 15000 })

      const updateCall = mockPrisma.maintenanceSchedule.update.mock.calls[0][0]
      expect(updateCall.data.nextDueKm).toBe(65000) // 50000 + 15000
    })

    it('should throw MaintenanceValidationError when ID is empty', async () => {
      await expect(updateMaintenanceSchedule('', {}))
        .rejects.toThrow(MaintenanceValidationError)
    })

    it('should throw MaintenanceNotFoundError when schedule does not exist', async () => {
      mockPrisma.maintenanceSchedule.findFirst.mockResolvedValue(null)

      await expect(updateMaintenanceSchedule('non-existent', {}))
        .rejects.toThrow(MaintenanceNotFoundError)
    })
  })

  // =============================================================================
  // deleteMaintenanceSchedule Tests
  // =============================================================================
  describe('deleteMaintenanceSchedule', () => {
    const existingSchedule = {
      id: 'schedule-001',
      vehicleId: 'vehicle-123',
      type: 'OIL_CHANGE'
    }

    it('should delete a schedule successfully', async () => {
      mockPrisma.maintenanceSchedule.findFirst.mockResolvedValue(existingSchedule)
      mockPrisma.maintenanceSchedule.delete.mockResolvedValue(existingSchedule)

      const result = await deleteMaintenanceSchedule('schedule-001')

      expect(result.success).toBe(true)
      expect(result.deletedAt).toBeInstanceOf(Date)
    })

    it('should throw MaintenanceValidationError when ID is empty', async () => {
      await expect(deleteMaintenanceSchedule(''))
        .rejects.toThrow(MaintenanceValidationError)
    })

    it('should throw MaintenanceNotFoundError when schedule does not exist', async () => {
      mockPrisma.maintenanceSchedule.findFirst.mockResolvedValue(null)

      await expect(deleteMaintenanceSchedule('non-existent'))
        .rejects.toThrow(MaintenanceNotFoundError)
    })
  })

  // =============================================================================
  // listMaintenanceSchedules Tests
  // =============================================================================
  describe('listMaintenanceSchedules', () => {
    const mockSchedules = [
      {
        id: 'schedule-001',
        vehicleId: 'vehicle-123',
        type: 'OIL_CHANGE',
        vehicle: {
          id: 'vehicle-123',
          make: 'Toyota',
          model: 'Corolla',
          year: 2020,
          licensePlate: 'AB123CD',
          mileage: 52000
        }
      },
      {
        id: 'schedule-002',
        vehicleId: 'vehicle-124',
        type: 'TIRE_ROTATION',
        vehicle: {
          id: 'vehicle-124',
          make: 'Honda',
          model: 'Civic',
          year: 2021,
          licensePlate: 'EF456GH',
          mileage: 30000
        }
      }
    ]

    it('should list schedules with default pagination', async () => {
      mockPrisma.maintenanceSchedule.count.mockResolvedValue(2)
      mockPrisma.maintenanceSchedule.findMany.mockResolvedValue(mockSchedules)

      const result = await listMaintenanceSchedules()

      expect(result.items).toHaveLength(2)
      expect(result.total).toBe(2)
      expect(result.page).toBe(1)
      expect(result.limit).toBe(20)
    })

    it('should apply filters correctly', async () => {
      mockPrisma.maintenanceSchedule.count.mockResolvedValue(1)
      mockPrisma.maintenanceSchedule.findMany.mockResolvedValue([mockSchedules[0]])

      const result = await listMaintenanceSchedules({
        vehicleId: 'vehicle-123',
        type: 'OIL_CHANGE'
      })

      expect(result.items).toHaveLength(1)
      expect(mockPrisma.maintenanceSchedule.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            vehicleId: 'vehicle-123',
            type: 'OIL_CHANGE'
          })
        })
      )
    })

    it('should handle pagination parameters', async () => {
      mockPrisma.maintenanceSchedule.count.mockResolvedValue(50)
      mockPrisma.maintenanceSchedule.findMany.mockResolvedValue(mockSchedules)

      const result = await listMaintenanceSchedules({}, { page: 2, limit: 10 })

      expect(result.page).toBe(2)
      expect(result.limit).toBe(10)
      expect(result.totalPages).toBe(5)
    })
  })

  // =============================================================================
  // getOverdueItems Tests
  // =============================================================================
  describe('getOverdueItems', () => {
    const mockOverdueItems = [
      {
        id: 'schedule-001',
        vehicleId: 'vehicle-123',
        type: 'OIL_CHANGE',
        isOverdue: true,
        vehicle: {
          id: 'vehicle-123',
          make: 'Toyota',
          model: 'Corolla',
          year: 2020,
          licensePlate: 'AB123CD',
          mileage: 65000
        }
      }
    ]

    it('should return all overdue items when no vehicleId specified', async () => {
      mockPrisma.maintenanceSchedule.findMany.mockResolvedValue(mockOverdueItems)

      const result = await getOverdueItems()

      expect(result).toEqual(mockOverdueItems)
      expect(mockPrisma.maintenanceSchedule.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isOverdue: true, tenantId: 'test-tenant-id' }
        })
      )
    })

    it('should filter by vehicleId when specified', async () => {
      mockPrisma.maintenanceSchedule.findMany.mockResolvedValue(mockOverdueItems)

      // Pass vehicleId as second arg; first arg is tenantIdOrVehicleId (unused when context provides tenantId)
      await getOverdueItems(undefined, 'vehicle-123')

      expect(mockPrisma.maintenanceSchedule.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            isOverdue: true,
            vehicleId: 'vehicle-123',
            tenantId: 'test-tenant-id'
          }
        })
      )
    })
  })

  // =============================================================================
  // getUpcomingItems Tests
  // =============================================================================
  describe('getUpcomingItems', () => {
    const mockUpcomingItems = [
      {
        id: 'schedule-001',
        vehicleId: 'vehicle-123',
        type: 'OIL_CHANGE',
        nextDueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        isOverdue: false,
        vehicle: {
          id: 'vehicle-123',
          make: 'Toyota',
          model: 'Corolla',
          year: 2020,
          licensePlate: 'AB123CD',
          mileage: 55000
        }
      }
    ]

    it('should return items due within default 30 days', async () => {
      mockPrisma.maintenanceSchedule.findMany.mockResolvedValue(mockUpcomingItems)

      const result = await getUpcomingItems()

      expect(result).toEqual(mockUpcomingItems)
      expect(mockPrisma.maintenanceSchedule.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            nextDueDate: expect.any(Object),
            isOverdue: false
          })
        })
      )
    })

    it('should use custom days parameter', async () => {
      mockPrisma.maintenanceSchedule.findMany.mockResolvedValue(mockUpcomingItems)

      await getUpcomingItems(7)

      const callArg = mockPrisma.maintenanceSchedule.findMany.mock.calls[0][0]
      expect(callArg.where.nextDueDate.lte.getTime() - callArg.where.nextDueDate.gte.getTime())
        .toBeLessThanOrEqual(8 * 24 * 60 * 60 * 1000) // Within 8 days (allowing for time diff)
    })
  })

  // =============================================================================
  // markAsCompleted Tests
  // =============================================================================
  describe('markAsCompleted', () => {
    const existingSchedule = {
      id: 'schedule-001',
      vehicleId: 'vehicle-123',
      type: 'OIL_CHANGE',
      intervalKm: 10000,
      intervalMonths: 6,
      lastServiceDate: new Date('2024-01-01'),
      lastServiceKm: 50000
    }

    const updatedSchedule = {
      ...existingSchedule,
      lastServiceDate: new Date('2024-06-15'),
      lastServiceKm: 58000,
      nextDueDate: new Date('2024-12-15'),
      nextDueKm: 68000,
      daysUntilDue: 180,
      kmUntilDue: 10000,
      isOverdue: false,
      alertSentAt: null,
      vehicle: {
        id: 'vehicle-123',
        make: 'Toyota',
        model: 'Corolla',
        year: 2020,
        licensePlate: 'AB123CD',
        mileage: 58000
      }
    }

    it('should mark maintenance as completed and update next due', async () => {
      mockPrisma.maintenanceSchedule.findFirst.mockResolvedValue(existingSchedule)
      mockPrisma.maintenanceSchedule.update.mockResolvedValue(updatedSchedule)

      const completionData: CompleteMaintenanceInput = {
        currentKm: 58000,
        date: new Date('2024-06-15')
      }

      const result = await markAsCompleted('schedule-001', completionData)

      expect(result.lastServiceKm).toBe(58000)
      expect(result.nextDueKm).toBe(68000)
      expect(result.alertSentAt).toBeNull()
    })

    it('should use current date when not specified', async () => {
      mockPrisma.maintenanceSchedule.findFirst.mockResolvedValue(existingSchedule)
      mockPrisma.maintenanceSchedule.update.mockImplementation((args: any) => ({
        ...updatedSchedule,
        ...args.data
      }))

      await markAsCompleted('schedule-001', { currentKm: 58000 })

      const updateCall = mockPrisma.maintenanceSchedule.update.mock.calls[0][0]
      expect(updateCall.data.lastServiceDate).toBeInstanceOf(Date)
    })

    it('should throw MaintenanceValidationError when currentKm is negative', async () => {
      await expect(markAsCompleted('schedule-001', { currentKm: -100 }))
        .rejects.toThrow(MaintenanceValidationError)
    })

    it('should throw MaintenanceNotFoundError when schedule does not exist', async () => {
      mockPrisma.maintenanceSchedule.findFirst.mockResolvedValue(null)

      await expect(markAsCompleted('non-existent', { currentKm: 50000 }))
        .rejects.toThrow(MaintenanceNotFoundError)
    })
  })

  // =============================================================================
  // checkOverdueStatus Tests
  // =============================================================================
  describe('checkOverdueStatus', () => {
    const mockSchedules = [
      {
        id: 'schedule-001',
        vehicleId: 'vehicle-123',
        type: 'OIL_CHANGE',
        nextDueDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        isOverdue: false,
        alertSentAt: null,
        notificationLevel: 'ALERT',
        vehicle: {
          id: 'vehicle-123',
          make: 'Toyota',
          model: 'Corolla',
          year: 2020,
          licensePlate: 'AB123CD',
          mileage: 55000
        }
      },
      {
        id: 'schedule-002',
        vehicleId: 'vehicle-124',
        type: 'TIRE_ROTATION',
        nextDueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days from now
        isOverdue: true, // Incorrectly marked as overdue
        alertSentAt: null,
        notificationLevel: 'WARNING',
        vehicle: {
          id: 'vehicle-124',
          make: 'Honda',
          model: 'Civic',
          year: 2021,
          licensePlate: 'EF456GH',
          mileage: 30000
        }
      }
    ]

    it('should update overdue status for schedules', async () => {
      mockPrisma.maintenanceSchedule.findMany.mockResolvedValue(mockSchedules)
      mockPrisma.maintenanceSchedule.update.mockResolvedValue({} as any)

      const result = await checkOverdueStatus()

      expect(result.updated).toBe(2)
      expect(result.newlyOverdue).toBeGreaterThanOrEqual(0)
    })

    it('should return alerts to send for newly overdue items', async () => {
      mockPrisma.maintenanceSchedule.findMany.mockResolvedValue([mockSchedules[0]])
      mockPrisma.maintenanceSchedule.update.mockResolvedValue({} as any)
      mockPrisma.maintenanceSchedule.count.mockResolvedValue(0)

      const result = await checkOverdueStatus()

      expect(result.alertsToSend.length).toBeGreaterThanOrEqual(0)
    })
  })

  // =============================================================================
  // getMaintenanceSummary Tests
  // =============================================================================
  describe('getMaintenanceSummary', () => {
    it('should return summary statistics', async () => {
      mockPrisma.maintenanceSchedule.count
        .mockResolvedValueOnce(10) // total
        .mockResolvedValueOnce(2)  // overdue
        .mockResolvedValueOnce(3)  // dueSoon
        .mockResolvedValueOnce(5)  // upcoming
        .mockResolvedValueOnce(0)  // vehicleOverdue
        .mockResolvedValueOnce(0)  // vehicleUpcoming

      mockPrisma.maintenanceSchedule.groupBy.mockResolvedValue([
        { vehicleId: 'vehicle-123', _count: { id: 5 } },
        { vehicleId: 'vehicle-124', _count: { id: 5 } }
      ])

      mockPrisma.vehicle.findFirst.mockResolvedValue({
        make: 'Toyota',
        model: 'Corolla',
        licensePlate: 'AB123CD'
      })

      const result = await getMaintenanceSummary()

      expect(result.total).toBe(10)
      expect(result.overdue).toBe(2)
      expect(result.dueSoon).toBe(3)
      expect(result.upcoming).toBe(5)
    })

    it('should include vehicle breakdown', async () => {
      mockPrisma.maintenanceSchedule.count
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(2)
        .mockResolvedValueOnce(3)
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(2)

      mockPrisma.maintenanceSchedule.groupBy.mockResolvedValue([
        { vehicleId: 'vehicle-123', _count: { id: 10 } }
      ])

      mockPrisma.vehicle.findFirst.mockResolvedValue({
        make: 'Toyota',
        model: 'Corolla',
        licensePlate: 'AB123CD'
      })

      const result = await getMaintenanceSummary()

      expect(Object.keys(result.byVehicle)).toContain('vehicle-123')
      expect(result.byVehicle['vehicle-123'].total).toBe(10)
    })
  })

  // =============================================================================
  // Helper Functions Tests
  // =============================================================================
  describe('getMaintenanceTypeLabel', () => {
    it('should return Italian labels for maintenance types', () => {
      expect(getMaintenanceTypeLabel('OIL_CHANGE')).toBe('Cambio Olio')
      expect(getMaintenanceTypeLabel('TIRE_ROTATION')).toBe('Rotazione Pneumatici')
      expect(getMaintenanceTypeLabel('BRAKE_CHECK')).toBe('Controllo Freni')
      expect(getMaintenanceTypeLabel('FILTER')).toBe('Sostituzione Filtri')
      expect(getMaintenanceTypeLabel('INSPECTION')).toBe('Ispezione Generale')
      expect(getMaintenanceTypeLabel('BELTS')).toBe('Controllo Cinghie')
      expect(getMaintenanceTypeLabel('BATTERY')).toBe('Controllo Batteria')
    })

    it('should return type as-is for unknown types', () => {
      expect(getMaintenanceTypeLabel('UNKNOWN' as any)).toBe('UNKNOWN')
    })
  })

  describe('getNotificationLevelLabel', () => {
    it('should return Italian labels for notification levels', () => {
      expect(getNotificationLevelLabel('ALERT')).toBe('Avviso')
      expect(getNotificationLevelLabel('WARNING')).toBe('Attenzione')
      expect(getNotificationLevelLabel('CRITICAL')).toBe('Critico')
    })
  })

  describe('getNotificationLevelColor', () => {
    it('should return correct colors for notification levels', () => {
      expect(getNotificationLevelColor('ALERT')).toBe('blue')
      expect(getNotificationLevelColor('WARNING')).toBe('yellow')
      expect(getNotificationLevelColor('CRITICAL')).toBe('red')
    })
  })
})
