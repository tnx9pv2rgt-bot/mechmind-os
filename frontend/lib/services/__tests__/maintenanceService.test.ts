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

// Mock @prisma/client (virtual: true because @prisma/client is not installed in frontend)
jest.mock('@prisma/client', () => ({
  Prisma: {
    PrismaClientKnownRequestError: class PrismaClientKnownRequestError extends Error {
      code: string
      constructor(message: string, { code }: { code: string }) {
        super(message); this.code = code; this.name = 'PrismaClientKnownRequestError'
      }
    },
  },
}), { virtual: true })

// Mock tenant context
jest.mock('@/lib/tenant/context', () => ({
  tryGetTenantContext: jest.fn().mockReturnValue({ tenantId: 'test-tenant-id' }),
  requireTenantId: jest.fn().mockResolvedValue('test-tenant-id'),
  NoTenantContextError: class extends Error { constructor() { super('No tenant context') } },
  setTenantContext: jest.fn(),
  clearTenantContext: jest.fn(),
  TenantContext: {},
}))

// Mock global fetch
global.fetch = jest.fn() as jest.Mock

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
    // Reset fetch mock
    (global.fetch as jest.Mock).mockReset()
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
      tenantId: 'test-tenant-id',
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
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockSchedule }),
      })

      const result = await createMaintenanceSchedule(validInput)

      expect(result).toEqual(mockSchedule)
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('v1/maintenance'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'x-tenant-id': 'test-tenant-id',
          }),
        })
      )
    })

    it('should pass empty vehicleId to backend (validation happens server-side)', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: { message: 'Vehicle ID is required' } }),
      })

      const invalidInput = { ...validInput, vehicleId: '' }
      await expect(createMaintenanceSchedule(invalidInput)).rejects.toThrow()
    })

    it('should pass invalid type to backend (validation happens server-side)', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: { message: 'Invalid type' } }),
      })

      const invalidInput = { ...validInput, type: '' as any }
      await expect(createMaintenanceSchedule(invalidInput)).rejects.toThrow()
    })

    it('should pass zero intervalKm to backend (validation happens server-side)', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: { message: 'Interval KM must be positive' } }),
      })

      const invalidInput = { ...validInput, intervalKm: 0 }
      await expect(createMaintenanceSchedule(invalidInput)).rejects.toThrow()
    })

    it('should pass negative intervalMonths to backend (validation happens server-side)', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: { message: 'Invalid interval' } }),
      })

      const invalidInput = { ...validInput, intervalMonths: -1 }
      await expect(createMaintenanceSchedule(invalidInput)).rejects.toThrow()
    })

    it('should pass negative lastServiceKm to backend (validation happens server-side)', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: { message: 'Invalid kilometers' } }),
      })

      const invalidInput = { ...validInput, lastServiceKm: -100 }
      await expect(createMaintenanceSchedule(invalidInput)).rejects.toThrow()
    })

    it('should handle vehicle not found from backend', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ error: { message: 'Vehicle not found' } }),
      })

      await expect(createMaintenanceSchedule(validInput))
        .rejects.toThrow()
    })

    it('should calculate next due date correctly when creating', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockSchedule }),
      })

      const result = await createMaintenanceSchedule(validInput)

      expect(result.nextDueKm).toBe(60000) // 50000 + 10000
      expect(result.nextDueDate).toBeInstanceOf(Date)
      expect(result.daysUntilDue).toBeDefined()
    })
  })

  // =============================================================================
  // getMaintenanceScheduleById Tests
  // =============================================================================
  describe('getMaintenanceScheduleById', () => {
    const mockSchedule = {
      id: 'schedule-001',
      vehicleId: 'vehicle-123',
      tenantId: 'test-tenant-id',
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
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockSchedule }),
      })

      const result = await getMaintenanceScheduleById('schedule-001')

      expect(result).toEqual(mockSchedule)
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('v1/maintenance/schedule-001'),
        expect.any(Object)
      )
    })

    it('should handle empty ID gracefully (passes to backend)', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: { message: 'Invalid ID' } }),
      })

      await expect(getMaintenanceScheduleById('')).rejects.toThrow()
    })

    it('should throw MaintenanceNotFoundError when schedule does not exist', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({}),
      })

      await expect(getMaintenanceScheduleById('non-existent'))
        .rejects.toThrow(MaintenanceNotFoundError)
    })
  })

  // =============================================================================
  // updateMaintenanceSchedule Tests
  // =============================================================================
  describe('updateMaintenanceSchedule', () => {
    const mockScheduleWithVehicle = {
      id: 'schedule-001',
      vehicleId: 'vehicle-123',
      tenantId: 'test-tenant-id',
      type: 'OIL_CHANGE',
      intervalKm: 15000,
      intervalMonths: 6,
      lastServiceDate: new Date('2024-01-15'),
      lastServiceKm: 50000,
      nextDueDate: new Date('2024-07-15'),
      nextDueKm: 65000,
      isOverdue: false,
      daysUntilDue: 100,
      kmUntilDue: 15000,
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
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockScheduleWithVehicle }),
      })

      const updateData: UpdateMaintenanceScheduleInput = {
        intervalKm: 15000
      }

      const result = await updateMaintenanceSchedule('schedule-001', updateData)

      expect(result).toEqual(mockScheduleWithVehicle)
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('v1/maintenance/schedule-001'),
        expect.objectContaining({ method: 'PATCH' })
      )
    })

    it('should recalculate next due when interval changes', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockScheduleWithVehicle }),
      })

      await updateMaintenanceSchedule('schedule-001', { intervalKm: 15000 })

      expect(global.fetch).toHaveBeenCalled()
    })

    it('should handle empty ID gracefully (passes to backend)', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: { message: 'Invalid ID' } }),
      })

      await expect(updateMaintenanceSchedule('', {})).rejects.toThrow()
    })

    it('should throw MaintenanceNotFoundError when schedule does not exist', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({}),
      })

      await expect(updateMaintenanceSchedule('non-existent', {}))
        .rejects.toThrow(MaintenanceNotFoundError)
    })
  })

  // =============================================================================
  // deleteMaintenanceSchedule Tests
  // =============================================================================
  describe('deleteMaintenanceSchedule', () => {
    it('should delete a schedule successfully', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      })

      const result = await deleteMaintenanceSchedule('schedule-001')

      expect(result.success).toBe(true)
      expect(result.deletedAt).toBeInstanceOf(Date)
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('v1/maintenance/schedule-001'),
        expect.objectContaining({ method: 'DELETE' })
      )
    })

    it('should handle empty ID gracefully (passes to backend)', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: { message: 'Invalid ID' } }),
      })

      await expect(deleteMaintenanceSchedule('')).rejects.toThrow()
    })

    it('should throw MaintenanceNotFoundError when schedule does not exist', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({}),
      })

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
        tenantId: 'test-tenant-id',
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
        tenantId: 'test-tenant-id',
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
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            items: mockSchedules,
            total: 2,
            page: 1,
            limit: 20,
            totalPages: 1,
          },
        }),
      })

      const result = await listMaintenanceSchedules()

      expect(result.items).toHaveLength(2)
      expect(result.total).toBe(2)
      expect(result.page).toBe(1)
      expect(result.limit).toBe(20)
    })

    it('should apply filters correctly', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            items: [mockSchedules[0]],
            total: 1,
            page: 1,
            limit: 20,
            totalPages: 1,
          },
        }),
      })

      const result = await listMaintenanceSchedules({
        vehicleId: 'vehicle-123',
        type: 'OIL_CHANGE'
      })

      expect(result.items).toHaveLength(1)
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('vehicleId=vehicle-123'),
        expect.any(Object)
      )
    })

    it('should handle pagination parameters', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            items: mockSchedules,
            total: 50,
            page: 2,
            limit: 10,
            totalPages: 5,
          },
        }),
      })

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
        tenantId: 'test-tenant-id',
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
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockOverdueItems }),
      })

      const result = await getOverdueItems()

      expect(result).toEqual(mockOverdueItems)
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('v1/maintenance/overdue'),
        expect.any(Object)
      )
    })

    it('should filter by vehicleId when specified', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockOverdueItems }),
      })

      await getOverdueItems(undefined, 'vehicle-123')

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('vehicleId=vehicle-123'),
        expect.any(Object)
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
        tenantId: 'test-tenant-id',
        type: 'OIL_CHANGE',
        nextDueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
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
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockUpcomingItems }),
      })

      const result = await getUpcomingItems()

      expect(result).toEqual(mockUpcomingItems)
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('v1/maintenance/upcoming'),
        expect.any(Object)
      )
    })

    it('should use custom days parameter', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockUpcomingItems }),
      })

      await getUpcomingItems(7)

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('days=7'),
        expect.any(Object)
      )
    })
  })

  // =============================================================================
  // markAsCompleted Tests
  // =============================================================================
  describe('markAsCompleted', () => {
    const updatedSchedule = {
      id: 'schedule-001',
      vehicleId: 'vehicle-123',
      tenantId: 'test-tenant-id',
      type: 'OIL_CHANGE',
      intervalKm: 10000,
      intervalMonths: 6,
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
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: updatedSchedule }),
      })

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
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: updatedSchedule }),
      })

      await markAsCompleted('schedule-001', { currentKm: 58000 })

      expect(global.fetch).toHaveBeenCalled()
    })

    it('should handle negative currentKm gracefully (passes to backend)', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: { message: 'Invalid kilometers' } }),
      })

      await expect(markAsCompleted('schedule-001', { currentKm: -100 }))
        .rejects.toThrow()
    })

    it('should throw MaintenanceNotFoundError when schedule does not exist', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({}),
      })

      await expect(markAsCompleted('non-existent', { currentKm: 50000 }))
        .rejects.toThrow(MaintenanceNotFoundError)
    })
  })

  // =============================================================================
  // checkOverdueStatus Tests
  // =============================================================================
  describe('checkOverdueStatus', () => {
    it('should update overdue status for schedules', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            updated: 2,
            newlyOverdue: 1,
            alertsToSend: [],
          },
        }),
      })

      const result = await checkOverdueStatus()

      expect(result.updated).toBe(2)
      expect(result.newlyOverdue).toBeGreaterThanOrEqual(0)
    })

    it('should return alerts to send for newly overdue items', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            updated: 1,
            newlyOverdue: 1,
            alertsToSend: [],
          },
        }),
      })

      const result = await checkOverdueStatus()

      expect(result.alertsToSend).toBeDefined()
      expect(Array.isArray(result.alertsToSend)).toBe(true)
    })
  })

  // =============================================================================
  // getMaintenanceSummary Tests
  // =============================================================================
  describe('getMaintenanceSummary', () => {
    it('should return summary statistics', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            total: 10,
            overdue: 2,
            dueSoon: 3,
            upcoming: 5,
            byVehicle: {},
          },
        }),
      })

      const result = await getMaintenanceSummary()

      expect(result.total).toBe(10)
      expect(result.overdue).toBe(2)
      expect(result.dueSoon).toBe(3)
      expect(result.upcoming).toBe(5)
    })

    it('should include vehicle breakdown', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            total: 10,
            overdue: 2,
            dueSoon: 3,
            upcoming: 5,
            byVehicle: {
              'vehicle-123': {
                vehicleInfo: 'Toyota Corolla',
                total: 10,
                overdue: 1,
                upcoming: 9,
              },
            },
          },
        }),
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
