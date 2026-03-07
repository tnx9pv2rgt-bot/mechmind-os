/**
 * Inspection Service Unit Tests
 * 
 * Tests for vehicle inspection CRUD operations, scoring, and error handling.
 * Uses mocked tRPC client to isolate service logic.
 * 
 * @module lib/services/__tests__/inspectionService
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { Mock } from 'vitest'

// Mock the tRPC client
vi.mock('@/lib/trpc-client', () => ({
  trpc: {
    inspection: {
      create: { mutate: vi.fn() },
      get: { query: vi.fn() },
      update: { mutate: vi.fn() },
      list: { query: vi.fn() },
      delete: { mutate: vi.fn() },
      submit: { mutate: vi.fn() },
      addFinding: { mutate: vi.fn() },
      customerApproval: { mutate: vi.fn() },
      stats: { query: vi.fn() },
    },
  },
  TRPCClientError: class TRPCClientError extends Error {
    code: string
    statusCode?: number
    constructor(message: string, code: string, statusCode?: number) {
      super(message)
      this.name = 'TRPCClientError'
      this.code = code
      this.statusCode = statusCode
    }
  },
  NetworkError: class NetworkError extends Error {
    constructor(message = 'Network error') {
      super(message)
      this.name = 'NetworkError'
    }
  },
  ServerError: class ServerError extends Error {
    statusCode?: number
    constructor(message = 'Server error', statusCode?: number) {
      super(message)
      this.name = 'ServerError'
      this.statusCode = statusCode
    }
  },
}))

// Import after mocking
import {
  createInspection,
  getInspectionById,
  updateInspection,
  listInspections,
  deleteInspection,
  submitInspection,
  addFinding,
  calculateOverallScore,
  generateCertificateId,
  canEditInspection,
  canSubmitInspection,
  getInspectionStatusLabel,
  getSeverityLabel,
  InspectionNotFoundError,
  InspectionValidationError,
  InspectionSubmissionError,
  type Inspection,
  type CreateInspectionInput,
  type UpdateInspectionInput,
  type CreateFindingInput,
} from '../inspectionService'
import { trpc, TRPCClientError, ServerError } from '@/lib/trpc-client'

describe('InspectionService', () => {
  // Mock console methods to reduce noise in tests
  const originalConsole = { ...console }
  
  beforeEach(() => {
    vi.clearAllMocks()
    // Suppress console output during tests
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'info').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // =============================================================================
  // createInspection Tests
  // =============================================================================
  describe('createInspection', () => {
    const validInput: CreateInspectionInput = {
      templateId: 'template-123',
      vehicleId: 'vehicle-456',
      customerId: 'customer-789',
      mechanicId: 'mechanic-abc',
      mileage: 50000,
      fuelLevel: 'HALF',
      notes: 'Initial inspection',
    }

    const mockInspection: Inspection = {
      id: 'inspection-001',
      status: 'IN_PROGRESS',
      templateId: 'template-123',
      vehicleId: 'vehicle-456',
      vehicle: {
        id: 'vehicle-456',
        make: 'Toyota',
        model: 'Corolla',
        year: 2020,
        licensePlate: 'AB123CD',
        vin: 'JTDBU4EE3B9123456',
      },
      customerId: 'customer-789',
      customer: {
        id: 'customer-789',
        firstName: 'Mario',
        lastName: 'Rossi',
        email: 'mario.rossi@example.com',
        phone: '+39123456789',
      },
      mechanicId: 'mechanic-abc',
      mechanic: {
        id: 'mechanic-abc',
        firstName: 'Luigi',
        lastName: 'Bianchi',
        email: 'luigi.bianchi@garage.it',
        role: 'mechanic',
      },
      tenantId: 'tenant-001',
      startedAt: new Date('2024-01-15T10:00:00Z'),
      mileage: 50000,
      fuelLevel: 'HALF',
      items: [],
      findings: [],
      photos: [],
      customerNotified: false,
      customerViewed: false,
      isDeleted: false,
    }

    it('should create an inspection successfully with valid data', async () => {
      const mockMutate = trpc.inspection.create.mutate as Mock
      mockMutate.mockResolvedValue(mockInspection)

      const result = await createInspection(validInput)

      expect(result).toEqual(mockInspection)
      expect(mockMutate).toHaveBeenCalledWith(validInput)
      expect(mockMutate).toHaveBeenCalledTimes(1)
    })

    it('should throw InspectionValidationError when templateId is missing', async () => {
      const invalidInput = { ...validInput, templateId: '' }

      await expect(createInspection(invalidInput)).rejects.toThrow(InspectionValidationError)
      await expect(createInspection(invalidInput)).rejects.toThrow('Missing required fields')
    })

    it('should throw InspectionValidationError when vehicleId is missing', async () => {
      const invalidInput = { ...validInput, vehicleId: '' }

      await expect(createInspection(invalidInput)).rejects.toThrow(InspectionValidationError)
    })

    it('should throw InspectionValidationError when customerId is missing', async () => {
      const invalidInput = { ...validInput, customerId: '' }

      await expect(createInspection(invalidInput)).rejects.toThrow(InspectionValidationError)
    })

    it('should throw InspectionValidationError when mechanicId is missing', async () => {
      const invalidInput = { ...validInput, mechanicId: '' }

      await expect(createInspection(invalidInput)).rejects.toThrow(InspectionValidationError)
    })

    it('should propagate TRPCClientError when API returns an error', async () => {
      const mockMutate = trpc.inspection.create.mutate as Mock
      const trpcError = new TRPCClientError('Database error', 'INTERNAL_ERROR', 500)
      mockMutate.mockRejectedValue(trpcError)

      await expect(createInspection(validInput)).rejects.toThrow(TRPCClientError)
    })

    it('should throw ServerError for unexpected errors', async () => {
      const mockMutate = trpc.inspection.create.mutate as Mock
      mockMutate.mockRejectedValue(new Error('Network timeout'))

      await expect(createInspection(validInput)).rejects.toThrow(ServerError)
    })

    it('should handle optional fields correctly', async () => {
      const minimalInput: CreateInspectionInput = {
        templateId: 'template-123',
        vehicleId: 'vehicle-456',
        customerId: 'customer-789',
        mechanicId: 'mechanic-abc',
      }
      const mockMutate = trpc.inspection.create.mutate as Mock
      mockMutate.mockResolvedValue(mockInspection)

      const result = await createInspection(minimalInput)

      expect(result).toBeDefined()
    })
  })

  // =============================================================================
  // getInspectionById Tests
  // =============================================================================
  describe('getInspectionById', () => {
    const mockInspection: Inspection = {
      id: 'inspection-001',
      status: 'IN_PROGRESS',
      templateId: 'template-123',
      vehicleId: 'vehicle-456',
      vehicle: {
        id: 'vehicle-456',
        make: 'Toyota',
        model: 'Corolla',
        year: 2020,
        licensePlate: 'AB123CD',
        vin: 'JTDBU4EE3B9123456',
      },
      customerId: 'customer-789',
      customer: {
        id: 'customer-789',
        firstName: 'Mario',
        lastName: 'Rossi',
        email: 'mario.rossi@example.com',
      },
      mechanicId: 'mechanic-abc',
      mechanic: {
        id: 'mechanic-abc',
        firstName: 'Luigi',
        lastName: 'Bianchi',
        email: 'luigi.bianchi@garage.it',
        role: 'mechanic',
      },
      tenantId: 'tenant-001',
      startedAt: new Date('2024-01-15T10:00:00Z'),
      items: [],
      findings: [],
      photos: [],
      customerNotified: false,
      customerViewed: false,
      isDeleted: false,
    }

    it('should retrieve an inspection by ID successfully', async () => {
      const mockQuery = trpc.inspection.get.query as Mock
      mockQuery.mockResolvedValue(mockInspection)

      const result = await getInspectionById('inspection-001')

      expect(result).toEqual(mockInspection)
      expect(mockQuery).toHaveBeenCalledWith({ id: 'inspection-001' })
    })

    it('should throw InspectionValidationError when ID is empty', async () => {
      await expect(getInspectionById('')).rejects.toThrow(InspectionValidationError)
      await expect(getInspectionById('')).rejects.toThrow('Inspection ID is required')
    })

    it('should throw InspectionNotFoundError when inspection does not exist', async () => {
      const mockQuery = trpc.inspection.get.query as Mock
      mockQuery.mockResolvedValue(null)

      await expect(getInspectionById('non-existent-id')).rejects.toThrow(InspectionNotFoundError)
    })

    it('should propagate TRPCClientError from API', async () => {
      const mockQuery = trpc.inspection.get.query as Mock
      const trpcError = new TRPCClientError('Not found', 'NOT_FOUND', 404)
      mockQuery.mockRejectedValue(trpcError)

      await expect(getInspectionById('inspection-001')).rejects.toThrow(TRPCClientError)
    })

    it('should throw ServerError for unexpected errors', async () => {
      const mockQuery = trpc.inspection.get.query as Mock
      mockQuery.mockRejectedValue(new TypeError('Cannot read property'))

      await expect(getInspectionById('inspection-001')).rejects.toThrow(ServerError)
    })
  })

  // =============================================================================
  // updateInspection Tests
  // =============================================================================
  describe('updateInspection', () => {
    const mockInspection: Inspection = {
      id: 'inspection-001',
      status: 'PENDING_REVIEW',
      templateId: 'template-123',
      vehicleId: 'vehicle-456',
      vehicle: {
        id: 'vehicle-456',
        make: 'Toyota',
        model: 'Corolla',
        licensePlate: 'AB123CD',
      },
      customerId: 'customer-789',
      customer: {
        id: 'customer-789',
        firstName: 'Mario',
        lastName: 'Rossi',
      },
      mechanicId: 'mechanic-abc',
      mechanic: {
        id: 'mechanic-abc',
        firstName: 'Luigi',
        lastName: 'Bianchi',
        email: 'luigi@garage.it',
        role: 'mechanic',
      },
      tenantId: 'tenant-001',
      startedAt: new Date('2024-01-15T10:00:00Z'),
      mileage: 50100,
      fuelLevel: 'HALF',
      items: [],
      findings: [],
      photos: [],
      customerNotified: false,
      customerViewed: false,
      isDeleted: false,
    }

    const updateData: UpdateInspectionInput = {
      status: 'PENDING_REVIEW',
      mileage: 50100,
      notes: 'Inspection completed',
    }

    it('should update an inspection successfully', async () => {
      const mockMutate = trpc.inspection.update.mutate as Mock
      mockMutate.mockResolvedValue(mockInspection)

      const result = await updateInspection('inspection-001', updateData)

      expect(result).toEqual(mockInspection)
      expect(mockMutate).toHaveBeenCalledWith({ id: 'inspection-001', data: updateData })
    })

    it('should throw InspectionValidationError when ID is empty', async () => {
      await expect(updateInspection('', updateData)).rejects.toThrow(InspectionValidationError)
    })

    it('should throw InspectionNotFoundError when TRPC returns NOT_FOUND', async () => {
      const mockMutate = trpc.inspection.update.mutate as Mock
      const trpcError = new TRPCClientError('Not found', 'NOT_FOUND', 404)
      mockMutate.mockRejectedValue(trpcError)

      await expect(updateInspection('non-existent', updateData)).rejects.toThrow(InspectionNotFoundError)
    })

    it('should propagate TRPCClientError for other errors', async () => {
      const mockMutate = trpc.inspection.update.mutate as Mock
      const trpcError = new TRPCClientError('Server error', 'INTERNAL_ERROR', 500)
      mockMutate.mockRejectedValue(trpcError)

      await expect(updateInspection('inspection-001', updateData)).rejects.toThrow(TRPCClientError)
    })

    it('should throw ServerError for unexpected errors', async () => {
      const mockMutate = trpc.inspection.update.mutate as Mock
      mockMutate.mockRejectedValue(new Error('Unexpected'))

      await expect(updateInspection('inspection-001', updateData)).rejects.toThrow(ServerError)
    })

    it('should handle partial updates correctly', async () => {
      const mockMutate = trpc.inspection.update.mutate as Mock
      mockMutate.mockResolvedValue(mockInspection)

      const partialUpdate: UpdateInspectionInput = { mileage: 55000 }
      const result = await updateInspection('inspection-001', partialUpdate)

      expect(result).toBeDefined()
      expect(mockMutate).toHaveBeenCalledWith({ id: 'inspection-001', data: partialUpdate })
    })
  })

  // =============================================================================
  // listInspections Tests
  // =============================================================================
  describe('listInspections', () => {
    const mockPaginatedResponse = {
      items: [
        {
          id: 'inspection-001',
          status: 'IN_PROGRESS',
          startedAt: new Date('2024-01-15T10:00:00Z'),
          vehicleInfo: 'Toyota Corolla (AB123CD)',
          customerName: 'Mario Rossi',
          mechanicName: 'Luigi Bianchi',
          issuesFound: 2,
          criticalIssues: 0,
        },
      ],
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    }

    it('should list inspections with default pagination', async () => {
      const mockQuery = trpc.inspection.list.query as Mock
      mockQuery.mockResolvedValue(mockPaginatedResponse)

      const result = await listInspections()

      expect(result).toEqual(mockPaginatedResponse)
      expect(mockQuery).toHaveBeenCalledWith({
        filters: {},
        pagination: { page: 1, limit: 20, sortBy: 'startedAt', sortOrder: 'desc' },
      })
    })

    it('should apply filters correctly', async () => {
      const mockQuery = trpc.inspection.list.query as Mock
      mockQuery.mockResolvedValue(mockPaginatedResponse)

      await listInspections({
        status: 'IN_PROGRESS',
        inspectorId: 'mechanic-abc',
        vehicleId: 'vehicle-456',
      })

      expect(mockQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          filters: expect.objectContaining({
            status: 'IN_PROGRESS',
            inspectorId: 'mechanic-abc',
            vehicleId: 'vehicle-456',
          }),
        })
      )
    })

    it('should convert dates to ISO strings in filters', async () => {
      const mockQuery = trpc.inspection.list.query as Mock
      mockQuery.mockResolvedValue(mockPaginatedResponse)

      const dateFrom = new Date('2024-01-01')
      const dateTo = new Date('2024-01-31')

      await listInspections({ dateFrom, dateTo })

      expect(mockQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          filters: expect.objectContaining({
            dateFrom: dateFrom.toISOString(),
            dateTo: dateTo.toISOString(),
          }),
        })
      )
    })

    it('should throw ServerError on API failure', async () => {
      const mockQuery = trpc.inspection.list.query as Mock
      mockQuery.mockRejectedValue(new Error('Database error'))

      await expect(listInspections()).rejects.toThrow(ServerError)
    })
  })

  // =============================================================================
  // deleteInspection Tests
  // =============================================================================
  describe('deleteInspection', () => {
    it('should soft delete an inspection successfully', async () => {
      const mockMutate = trpc.inspection.delete.mutate as Mock
      mockMutate.mockResolvedValue({ success: true, deletedAt: new Date() })

      const result = await deleteInspection('inspection-001', 'user-abc')

      expect(result.success).toBe(true)
      expect(result.deletedAt).toBeInstanceOf(Date)
    })

    it('should throw InspectionValidationError when ID is empty', async () => {
      await expect(deleteInspection('', 'user-abc')).rejects.toThrow(InspectionValidationError)
    })

    it('should throw InspectionValidationError when deletedBy is empty', async () => {
      await expect(deleteInspection('inspection-001', '')).rejects.toThrow(InspectionValidationError)
    })

    it('should throw InspectionNotFoundError when inspection not found', async () => {
      const mockMutate = trpc.inspection.delete.mutate as Mock
      const trpcError = new TRPCClientError('Not found', 'NOT_FOUND', 404)
      mockMutate.mockRejectedValue(trpcError)

      await expect(deleteInspection('non-existent', 'user-abc')).rejects.toThrow(InspectionNotFoundError)
    })
  })

  // =============================================================================
  // submitInspection Tests
  // =============================================================================
  describe('submitInspection', () => {
    const mockInspection: Inspection = {
      id: 'inspection-001',
      status: 'PENDING_REVIEW',
      templateId: 'template-123',
      vehicleId: 'vehicle-456',
      vehicle: { id: 'vehicle-456', make: 'Toyota', model: 'Corolla', licensePlate: 'AB123CD' },
      customerId: 'customer-789',
      customer: { id: 'customer-789', firstName: 'Mario', lastName: 'Rossi' },
      mechanicId: 'mechanic-abc',
      mechanic: { id: 'mechanic-abc', firstName: 'Luigi', lastName: 'Bianchi', email: 'luigi@garage.it', role: 'mechanic' },
      tenantId: 'tenant-001',
      startedAt: new Date(),
      items: [],
      findings: [],
      photos: [],
      customerNotified: false,
      customerViewed: false,
      isDeleted: false,
      certificateId: 'CERT-2024-00123',
    }

    it('should submit an inspection successfully', async () => {
      // Mock getInspectionById for validation
      const mockGetQuery = trpc.inspection.get.query as Mock
      mockGetQuery.mockResolvedValue({ ...mockInspection, status: 'IN_PROGRESS' })

      const mockSubmitMutate = trpc.inspection.submit.mutate as Mock
      mockSubmitMutate.mockResolvedValue(mockInspection)

      const result = await submitInspection('inspection-001')

      expect(result.certificateId).toBeDefined()
      expect(result.status).toBe('PENDING_REVIEW')
    })

    it('should throw InspectionSubmissionError when already approved', async () => {
      const mockGetQuery = trpc.inspection.get.query as Mock
      mockGetQuery.mockResolvedValue({ ...mockInspection, status: 'APPROVED' })

      await expect(submitInspection('inspection-001')).rejects.toThrow(InspectionSubmissionError)
      await expect(submitInspection('inspection-001')).rejects.toThrow('already been approved')
    })

    it('should throw InspectionSubmissionError when already declined', async () => {
      const mockGetQuery = trpc.inspection.get.query as Mock
      mockGetQuery.mockResolvedValue({ ...mockInspection, status: 'DECLINED' })

      await expect(submitInspection('inspection-001')).rejects.toThrow(InspectionSubmissionError)
      await expect(submitInspection('inspection-001')).rejects.toThrow('been declined')
    })

    it('should throw InspectionSubmissionError when deleted', async () => {
      const mockGetQuery = trpc.inspection.get.query as Mock
      mockGetQuery.mockResolvedValue({ ...mockInspection, isDeleted: true, status: 'IN_PROGRESS' })

      await expect(submitInspection('inspection-001')).rejects.toThrow(InspectionSubmissionError)
      await expect(submitInspection('inspection-001')).rejects.toThrow('deleted')
    })
  })

  // =============================================================================
  // calculateOverallScore Tests
  // =============================================================================
  describe('calculateOverallScore', () => {
    const baseInspection: Inspection = {
      id: 'inspection-001',
      status: 'IN_PROGRESS',
      templateId: 'template-123',
      vehicleId: 'vehicle-456',
      vehicle: { id: 'vehicle-456', make: 'Toyota', model: 'Corolla', licensePlate: 'AB123CD' },
      customerId: 'customer-789',
      customer: { id: 'customer-789', firstName: 'Mario', lastName: 'Rossi' },
      mechanicId: 'mechanic-abc',
      mechanic: { id: 'mechanic-abc', firstName: 'Luigi', lastName: 'Bianchi', email: 'luigi@garage.it', role: 'mechanic' },
      tenantId: 'tenant-001',
      startedAt: new Date(),
      items: [],
      findings: [],
      photos: [],
      customerNotified: false,
      customerViewed: false,
      isDeleted: false,
    }

    it('should return perfect scores for inspection with no issues', () => {
      const scores = calculateOverallScore(baseInspection)

      expect(scores.overall).toBe(10)
      expect(scores.mechanical).toBe(10)
      expect(scores.electrical).toBe(10)
      expect(scores.bodywork).toBe(10)
      expect(scores.tires).toBe(10)
      expect(scores.fluids).toBe(10)
      expect(scores.safety).toBe(10)
    })

    it('should reduce scores based on critical findings', () => {
      const inspectionWithCritical = {
        ...baseInspection,
        findings: [
          {
            id: 'finding-001',
            inspectionId: 'inspection-001',
            category: 'ENGINE',
            title: 'Oil leak',
            description: 'Major oil leak detected',
            severity: 'CRITICAL',
            status: 'OPEN',
            approvedByCustomer: false,
          },
        ],
      }

      const scores = calculateOverallScore(inspectionWithCritical)

      expect(scores.mechanical).toBeLessThan(10)
      expect(scores.overall).toBeLessThan(10)
    })

    it('should reduce scores based on HIGH severity findings', () => {
      const inspectionWithHigh = {
        ...baseInspection,
        findings: [
          {
            id: 'finding-002',
            inspectionId: 'inspection-001',
            category: 'BRAKES',
            title: 'Worn brake pads',
            description: 'Brake pads need replacement',
            severity: 'HIGH',
            status: 'OPEN',
            approvedByCustomer: false,
          },
        ],
      }

      const scores = calculateOverallScore(inspectionWithHigh)

      expect(scores.safety).toBeLessThan(10)
    })

    it('should cap minimum score at 1', () => {
      const inspectionWithManyCritical = {
        ...baseInspection,
        findings: Array(20).fill(null).map((_, i) => ({
          id: `finding-${i}`,
          inspectionId: 'inspection-001',
          category: 'ENGINE',
          title: 'Critical issue',
          description: 'Major problem',
          severity: 'CRITICAL',
          status: 'OPEN',
          approvedByCustomer: false,
        })),
      }

      const scores = calculateOverallScore(inspectionWithManyCritical)

      expect(scores.mechanical).toBeGreaterThanOrEqual(1)
      expect(scores.overall).toBeGreaterThanOrEqual(1)
    })

    it('should calculate weighted overall score correctly', () => {
      const inspectionWithMixedIssues = {
        ...baseInspection,
        findings: [
          {
            id: 'finding-001',
            inspectionId: 'inspection-001',
            category: 'ELECTRICAL',
            title: 'Battery issue',
            description: 'Weak battery',
            severity: 'MEDIUM',
            status: 'OPEN',
            approvedByCustomer: false,
          },
        ],
      }

      const scores = calculateOverallScore(inspectionWithMixedIssues)

      // Electrical has weight 0.20, so a MEDIUM issue (weight 4) should reduce it
      expect(scores.electrical).toBeLessThan(10)
      expect(scores.overall).toBeGreaterThanOrEqual(1)
      expect(scores.overall).toBeLessThanOrEqual(10)
    })
  })

  // =============================================================================
  // Helper Functions Tests
  // =============================================================================
  describe('generateCertificateId', () => {
    it('should generate certificate ID in correct format', () => {
      const certificateId = generateCertificateId()

      expect(certificateId).toMatch(/^CERT-\d{4}-\d{5}$/)
    })

    it('should generate unique certificate IDs', () => {
      const id1 = generateCertificateId()
      const id2 = generateCertificateId()

      expect(id1).not.toBe(id2)
    })
  })

  describe('canEditInspection', () => {
    it('should return true for IN_PROGRESS inspection', () => {
      const inspection = { status: 'IN_PROGRESS', isDeleted: false } as Inspection
      expect(canEditInspection(inspection)).toBe(true)
    })

    it('should return true for PENDING_REVIEW inspection', () => {
      const inspection = { status: 'PENDING_REVIEW', isDeleted: false } as Inspection
      expect(canEditInspection(inspection)).toBe(true)
    })

    it('should return false for APPROVED inspection', () => {
      const inspection = { status: 'APPROVED', isDeleted: false } as Inspection
      expect(canEditInspection(inspection)).toBe(false)
    })

    it('should return false for deleted inspection', () => {
      const inspection = { status: 'IN_PROGRESS', isDeleted: true } as Inspection
      expect(canEditInspection(inspection)).toBe(false)
    })
  })

  describe('canSubmitInspection', () => {
    it('should return true for IN_PROGRESS inspection', () => {
      const inspection = { status: 'IN_PROGRESS', isDeleted: false } as Inspection
      expect(canSubmitInspection(inspection)).toBe(true)
    })

    it('should return false for APPROVED inspection', () => {
      const inspection = { status: 'APPROVED', isDeleted: false } as Inspection
      expect(canSubmitInspection(inspection)).toBe(false)
    })

    it('should return false for deleted inspection', () => {
      const inspection = { status: 'IN_PROGRESS', isDeleted: true } as Inspection
      expect(canSubmitInspection(inspection)).toBe(false)
    })
  })

  describe('getInspectionStatusLabel', () => {
    it('should return Italian labels for status', () => {
      expect(getInspectionStatusLabel('IN_PROGRESS')).toBe('In Corso')
      expect(getInspectionStatusLabel('PENDING_REVIEW')).toBe('In Attesa di Revisione')
      expect(getInspectionStatusLabel('READY_FOR_CUSTOMER')).toBe('Pronto per il Cliente')
      expect(getInspectionStatusLabel('CUSTOMER_REVIEWING')).toBe('Cliente in Revisione')
      expect(getInspectionStatusLabel('APPROVED')).toBe('Approvato')
      expect(getInspectionStatusLabel('DECLINED')).toBe('Rifiutato')
      expect(getInspectionStatusLabel('ARCHIVED')).toBe('Archiviato')
    })

    it('should return status as-is for unknown status', () => {
      expect(getInspectionStatusLabel('UNKNOWN' as any)).toBe('UNKNOWN')
    })
  })

  describe('getSeverityLabel', () => {
    it('should return Italian labels for severity', () => {
      expect(getSeverityLabel('CRITICAL')).toBe('Critico')
      expect(getSeverityLabel('HIGH')).toBe('Alto')
      expect(getSeverityLabel('MEDIUM')).toBe('Medio')
      expect(getSeverityLabel('LOW')).toBe('Basso')
      expect(getSeverityLabel('OK')).toBe('OK')
    })
  })

  // =============================================================================
  // addFinding Tests
  // =============================================================================
  describe('addFinding', () => {
    const findingInput: CreateFindingInput = {
      category: 'ENGINE',
      title: 'Oil Leak',
      description: 'Minor oil leak from gasket',
      severity: 'MEDIUM',
      recommendation: 'Replace gasket',
      estimatedCost: 150,
    }

    const mockFinding = {
      id: 'finding-001',
      inspectionId: 'inspection-001',
      ...findingInput,
      status: 'OPEN',
      approvedByCustomer: false,
    }

    it('should add a finding successfully', async () => {
      const mockMutate = trpc.inspection.addFinding.mutate as Mock
      mockMutate.mockResolvedValue(mockFinding)

      const result = await addFinding('inspection-001', findingInput)

      expect(result).toEqual(mockFinding)
      expect(mockMutate).toHaveBeenCalledWith({ inspectionId: 'inspection-001', data: findingInput })
    })

    it('should propagate errors from API', async () => {
      const mockMutate = trpc.inspection.addFinding.mutate as Mock
      mockMutate.mockRejectedValue(new Error('Database error'))

      await expect(addFinding('inspection-001', findingInput)).rejects.toThrow('Database error')
    })
  })
})
