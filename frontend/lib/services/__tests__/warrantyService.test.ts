/**
 * Warranty Service Unit Tests
 *
 * Tests for warranty creation, validation, expiration tracking,
 * claims management, and remaining coverage calculation.
 *
 * @module lib/services/__tests__/warrantyService
 */

// Jest globals are available automatically
// Jest Mock type

// Mock @prisma/client (virtual: true because @prisma/client is not installed in frontend)
jest.mock('@prisma/client', () => ({
  Prisma: {
    PrismaClientKnownRequestError: class PrismaClientKnownRequestError extends Error {
      code: string
      constructor(message: string, { code }: { code: string; clientVersion?: string }) {
        super(message)
        this.code = code
        this.name = 'PrismaClientKnownRequestError'
      }
    },
  },
}), { virtual: true })

// Mock tenant context
jest.mock('@/lib/tenant/context', () => ({
  tryGetTenantContext: jest.fn().mockReturnValue({ tenantId: 'test-tenant-id' }),
  requireTenantId: jest.fn().mockResolvedValue('test-tenant-id'),
  NoTenantContextError: class NoTenantContextError extends Error {
    constructor() { super('No tenant context'); this.name = 'NoTenantContextError' }
  },
  setTenantContext: jest.fn(),
  clearTenantContext: jest.fn(),
  TenantContext: {},
}))

// Mock global fetch
;(global as any).fetch = jest.fn()

// Import after mocking
import {
  createWarranty,
  fileClaim,
  reviewClaim,
  markClaimPaid,
  getRemainingCoverage,
  getExpiringWarranties,
  updateWarrantyStatus,
  updateAllWarrantyStatuses,
  getWarranty,
  WarrantyError,
  WarrantyNotFoundError,
  ClaimNotFoundError,
  InvalidWarrantyDataError,
  InvalidClaimDataError,
  WarrantyType,
  WarrantyStatus,
  ClaimStatus,
  CreateWarrantyDTO,
  FileClaimDTO,
} from '../warrantyService'

describe('WarrantyService', () => {
  beforeEach(() => {
    (global.fetch as jest.Mock).mockReset()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  // =============================================================================
  // createWarranty Tests
  // =============================================================================
  describe('createWarranty', () => {
    const validWarrantyData: CreateWarrantyDTO = {
      vehicleId: 'vehicle-001',
      type: WarrantyType.EXTENDED,
      provider: 'Extended Warranty Co.',
      startDate: new Date('2024-01-01'),
      expirationDate: new Date('2026-01-01'),
      coverageKm: 50000,
      currentKm: 10000,
      maxCoverage: 5000,
      deductible: 100,
      terms: 'https://example.com/terms',
      certificateUrl: 'https://example.com/cert',
    }

    // Helper to create warranty response
    function createWarrantyResponse(overrides: Record<string, any> = {}) {
      return {
        id: overrides.id || 'warranty-001',
        tenantId: overrides.tenantId || 'test-tenant-id',
        warrantyNumber: overrides.warrantyNumber || 'W-001',
        vehicleId: overrides.vehicleId || validWarrantyData.vehicleId,
        type: overrides.type || validWarrantyData.type,
        provider: overrides.provider || validWarrantyData.provider,
        startDate: overrides.startDate || validWarrantyData.startDate,
        expirationDate: overrides.expirationDate || validWarrantyData.expirationDate,
        coverageKm: overrides.coverageKm || validWarrantyData.coverageKm,
        currentKm: overrides.currentKm || validWarrantyData.currentKm,
        maxCoverage: overrides.maxCoverage || validWarrantyData.maxCoverage,
        deductible: overrides.deductible || validWarrantyData.deductible,
        terms: overrides.terms || validWarrantyData.terms,
        certificateUrl: overrides.certificateUrl || validWarrantyData.certificateUrl,
        status: overrides.status || WarrantyStatus.ACTIVE,
        alertsSent: overrides.alertsSent || [],
        alertEmailEnabled: overrides.alertEmailEnabled !== undefined ? overrides.alertEmailEnabled : true,
        alertSmsEnabled: overrides.alertSmsEnabled || false,
        alertDaysBeforeExpiry: overrides.alertDaysBeforeExpiry || 30,
        mileageLimit: overrides.mileageLimit || null,
        maxClaimAmount: overrides.maxClaimAmount || validWarrantyData.maxCoverage,
        deductibleAmount: overrides.deductibleAmount || validWarrantyData.deductible,
        claims: overrides.claims || [],
        createdAt: overrides.createdAt || new Date(),
        updatedAt: overrides.updatedAt || new Date(),
      }
    }

    it('should create a warranty with valid data', async () => {
      const mockResponse = createWarrantyResponse()

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ data: mockResponse }),
      })

      const result = await createWarranty(validWarrantyData)

      expect(result.id).toBe('warranty-001')
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('v1/warranties'),
        expect.objectContaining({ method: 'POST' })
      )
    })

    it('should pass empty vehicleId to backend (validation happens server-side)', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: { code: 'INVALID_WARRANTY_DATA', message: 'Vehicle ID is required' } }),
      })

      const invalidData = { ...validWarrantyData, vehicleId: '' }
      await expect(createWarranty(invalidData)).rejects.toThrow()
    })

    it('should pass empty provider to backend (validation happens server-side)', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: { code: 'INVALID_WARRANTY_DATA', message: 'Provider is required' } }),
      })

      const invalidData = { ...validWarrantyData, provider: '' }
      await expect(createWarranty(invalidData)).rejects.toThrow()
    })

    it('should pass invalid dates to backend (validation happens server-side)', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: { code: 'INVALID_WARRANTY_DATA', message: 'Expiration before start' } }),
      })

      const invalidData = {
        ...validWarrantyData,
        startDate: new Date('2026-01-01'),
        expirationDate: new Date('2024-01-01'),
      }
      await expect(createWarranty(invalidData)).rejects.toThrow()
    })

    it('should pass negative max coverage to backend (validation happens server-side)', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: { code: 'INVALID_WARRANTY_DATA', message: 'Coverage must be positive' } }),
      })

      const invalidData = { ...validWarrantyData, maxCoverage: -100 }
      await expect(createWarranty(invalidData)).rejects.toThrow()
    })

    it('should pass negative deductible to backend (validation happens server-side)', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: { code: 'INVALID_WARRANTY_DATA', message: 'Deductible must be positive' } }),
      })

      const invalidData = { ...validWarrantyData, deductible: -50 }
      await expect(createWarranty(invalidData)).rejects.toThrow()
    })

    it('should pass negative currentKm to backend (validation happens server-side)', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: { code: 'INVALID_WARRANTY_DATA', message: 'Kilometers must be non-negative' } }),
      })

      const invalidData = { ...validWarrantyData, currentKm: -1000 }
      await expect(createWarranty(invalidData)).rejects.toThrow()
    })

    it('should set EXPIRED status if expiration date is in the past', async () => {
      const expiredData: CreateWarrantyDTO = {
        vehicleId: validWarrantyData.vehicleId,
        type: validWarrantyData.type,
        provider: validWarrantyData.provider,
        startDate: new Date('2020-01-01'),
        expirationDate: new Date('2021-01-01'),
        coverageKm: validWarrantyData.coverageKm,
        currentKm: validWarrantyData.currentKm,
        maxCoverage: validWarrantyData.maxCoverage,
        deductible: validWarrantyData.deductible,
        terms: validWarrantyData.terms,
        certificateUrl: validWarrantyData.certificateUrl,
      }

      const mockResponse = createWarrantyResponse({
        id: 'warranty-002',
        warrantyNumber: 'W-002',
        startDate: expiredData.startDate,
        expirationDate: expiredData.expirationDate,
        status: WarrantyStatus.EXPIRED,
      })

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ data: mockResponse }),
      })

      const result = await createWarranty(expiredData)
      expect(result.status).toBe(WarrantyStatus.EXPIRED)
    })

    it('should set EXPIRING_SOON status if expiration is within 60 days', async () => {
      const expiringSoon = new Date()
      expiringSoon.setDate(expiringSoon.getDate() + 30)
      const startDate = new Date()

      const expiringData: CreateWarrantyDTO = {
        vehicleId: validWarrantyData.vehicleId,
        type: validWarrantyData.type,
        provider: validWarrantyData.provider,
        startDate,
        expirationDate: expiringSoon,
        coverageKm: validWarrantyData.coverageKm,
        currentKm: validWarrantyData.currentKm,
        maxCoverage: validWarrantyData.maxCoverage,
        deductible: validWarrantyData.deductible,
        terms: validWarrantyData.terms,
        certificateUrl: validWarrantyData.certificateUrl,
      }

      const mockResponse = createWarrantyResponse({
        id: 'warranty-003',
        warrantyNumber: 'W-003',
        startDate,
        expirationDate: expiringSoon,
        status: WarrantyStatus.EXPIRING_SOON,
      })

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ data: mockResponse }),
      })

      const result = await createWarranty(expiringData)
      expect(result.status).toBe(WarrantyStatus.EXPIRING_SOON)
    })
  })

  // =============================================================================
  // fileClaim Tests
  // =============================================================================
  describe('fileClaim', () => {
    const warrantyId = 'warranty-001'
    const validClaimData: FileClaimDTO = {
      issueDescription: 'Engine failure - piston damage requiring replacement',
      estimatedCost: 850.50,
      evidence: ['https://example.com/photo1.jpg'],
    }

    const mockActiveWarranty = {
      id: warrantyId,
      vehicleId: 'vehicle-001',
      status: WarrantyStatus.ACTIVE,
      maxCoverage: 5000,
      deductible: 100,
    }

    // Helper to create claim response
    function createClaimResponse(overrides: Record<string, any> = {}) {
      return {
        id: overrides.id || 'claim-001',
        tenantId: overrides.tenantId || 'test-tenant-id',
        warrantyId: overrides.warrantyId || warrantyId,
        claimNumber: overrides.claimNumber || 'C-001',
        description: overrides.description || validClaimData.issueDescription,
        amount: overrides.amount || validClaimData.estimatedCost,
        status: overrides.status || ClaimStatus.SUBMITTED,
        evidencePhotos: overrides.evidencePhotos || [],
        documents: overrides.documents || [],
        submittedDate: overrides.submittedDate || new Date(),
        reviewedDate: overrides.reviewedDate || null,
        resolvedDate: overrides.resolvedDate || null,
        createdAt: overrides.createdAt || new Date(),
        updatedAt: overrides.updatedAt || new Date(),
      }
    }

    it('should file a claim with valid data', async () => {
      const mockResponse = createClaimResponse()

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ data: mockResponse }),
      })

      const result = await fileClaim(warrantyId, validClaimData)

      expect(result.status).toBe(ClaimStatus.SUBMITTED)
      expect(result.amount).toBe(validClaimData.estimatedCost)
    })

    it('should throw WarrantyNotFoundError if warranty not found', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ error: { code: 'WARRANTY_NOT_FOUND' } }),
      })

      await expect(fileClaim(warrantyId, validClaimData))
        .rejects.toThrow(WarrantyNotFoundError)
    })

    it('should throw InvalidClaimDataError if warranty is expired', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: { code: 'INVALID_CLAIM_DATA', message: 'Warranty is expired' } }),
      })

      await expect(fileClaim(warrantyId, validClaimData))
        .rejects.toThrow(InvalidClaimDataError)
    })

    it('should throw InvalidClaimDataError if warranty is void', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: { code: 'INVALID_CLAIM_DATA', message: 'Warranty is void' } }),
      })

      await expect(fileClaim(warrantyId, validClaimData))
        .rejects.toThrow(InvalidClaimDataError)
    })

    it('should pass empty description to backend (validation happens server-side)', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: { code: 'INVALID_CLAIM_DATA', message: 'Description is required' } }),
      })

      const invalidData = { ...validClaimData, issueDescription: '' }
      await expect(fileClaim(warrantyId, invalidData))
        .rejects.toThrow()
    })

    it('should pass zero cost to backend (validation happens server-side)', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: { code: 'INVALID_CLAIM_DATA', message: 'Cost must be positive' } }),
      })

      const invalidData = { ...validClaimData, estimatedCost: 0 }
      await expect(fileClaim(warrantyId, invalidData))
        .rejects.toThrow()
    })
  })

  // =============================================================================
  // reviewClaim Tests
  // =============================================================================
  describe('reviewClaim', () => {
    const claimId = 'claim-001'

    const mockSubmittedClaim = {
      id: claimId,
      warrantyId: 'warranty-001',
      status: ClaimStatus.SUBMITTED,
      estimatedCost: 500,
      warranty: {
        id: 'warranty-001',
        maxCoverage: 5000,
      },
    }

    it('should approve a claim with valid amount', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            ...mockSubmittedClaim,
            status: ClaimStatus.APPROVED,
            amount: 450,
            reviewedDate: new Date(),
          },
        }),
      })

      const result = await reviewClaim(claimId, 'APPROVE', 450, 'Looks good', 'admin-001')

      expect(result.status).toBe(ClaimStatus.APPROVED)
      expect(result.amount).toBe(450)
    })

    it('should reject a claim', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            ...mockSubmittedClaim,
            status: ClaimStatus.REJECTED,
            reviewedDate: new Date(),
          },
        }),
      })

      const result = await reviewClaim(claimId, 'REJECT', undefined, 'Not covered', 'admin-001')

      expect(result.status).toBe(ClaimStatus.REJECTED)
    })

    it('should throw ClaimNotFoundError if claim not found', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ error: { code: 'CLAIM_NOT_FOUND' } }),
      })

      await expect(reviewClaim(claimId, 'APPROVE', 100))
        .rejects.toThrow(ClaimNotFoundError)
    })

    it('should pass approving without amount to backend (validation happens server-side)', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: { code: 'INVALID_CLAIM_DATA', message: 'Amount required for approval' } }),
      })

      await expect(reviewClaim(claimId, 'APPROVE'))
        .rejects.toThrow()
    })

    it('should handle already processed claim (validation happens server-side)', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: { code: 'INVALID_CLAIM_DATA', message: 'Claim already processed' } }),
      })

      await expect(reviewClaim(claimId, 'APPROVE', 100))
        .rejects.toThrow()
    })
  })

  // =============================================================================
  // markClaimPaid Tests
  // =============================================================================
  describe('markClaimPaid', () => {
    const claimId = 'claim-001'

    it('should mark an approved claim as paid', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            id: claimId,
            status: ClaimStatus.PAID,
            resolvedDate: new Date(),
          },
        }),
      })

      const result = await markClaimPaid(claimId)

      expect(result.status).toBe(ClaimStatus.PAID)
    })

    it('should throw ClaimNotFoundError if claim not found', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ error: { code: 'CLAIM_NOT_FOUND' } }),
      })

      await expect(markClaimPaid(claimId))
        .rejects.toThrow(ClaimNotFoundError)
    })

    it('should handle unapproved claim (validation happens server-side)', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: { code: 'INVALID_CLAIM_DATA', message: 'Claim must be approved' } }),
      })

      await expect(markClaimPaid(claimId))
        .rejects.toThrow()
    })
  })

  // =============================================================================
  // getRemainingCoverage Tests
  // =============================================================================
  describe('getRemainingCoverage', () => {
    const warrantyId = 'warranty-001'

    it('should calculate remaining coverage correctly', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            amount: 3500,
            km: 50000,
          },
        }),
      })

      const result = await getRemainingCoverage(warrantyId)

      expect(result.amount).toBe(3500)
      expect(result.km).toBe(50000)
    })

    it('should return null km if no coverage limit', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            amount: 5000,
            km: null,
          },
        }),
      })

      const result = await getRemainingCoverage(warrantyId)

      expect(result.amount).toBe(5000)
      expect(result.km).toBeNull()
    })

    it('should throw WarrantyNotFoundError if warranty not found', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ error: { code: 'WARRANTY_NOT_FOUND' } }),
      })

      await expect(getRemainingCoverage(warrantyId))
        .rejects.toThrow(WarrantyNotFoundError)
    })
  })

  // =============================================================================
  // getExpiringWarranties Tests
  // =============================================================================
  describe('getExpiringWarranties', () => {
    // Helper to create warranty list response
    function createExpiringWarranties() {
      return [
        {
          id: 'warranty-001',
          tenantId: 'test-tenant-id',
          expirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          status: WarrantyStatus.ACTIVE,
          claims: [],
        },
        {
          id: 'warranty-002',
          tenantId: 'test-tenant-id',
          expirationDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
          status: WarrantyStatus.EXPIRING_SOON,
          claims: [],
        },
      ]
    }

    it('should get warranties expiring within specified days', async () => {
      const mockWarranties = createExpiringWarranties()

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ data: mockWarranties }),
      })

      const result = await getExpiringWarranties(60)

      expect(result).toHaveLength(2)
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('v1/warranties/expiring'),
        expect.any(Object)
      )
    })

    it('should handle negative days gracefully', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: { code: 'INVALID_WARRANTY_DATA', message: 'Days must be positive' } }),
      })

      await expect(getExpiringWarranties(-5))
        .rejects.toThrow()
    })
  })

  // =============================================================================
  // updateStatus Tests
  // =============================================================================
  describe('updateStatus', () => {
    it('should update warranty status based on expiration', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            id: 'warranty-001',
            tenantId: 'test-tenant-id',
            status: WarrantyStatus.EXPIRED,
            claims: [],
            expirationDate: new Date(Date.now() - 1000),
            vehicle: { id: 'v1', vin: 'VIN123', make: 'Toyota', model: 'Corolla', year: 2020 },
          },
        }),
      })

      const result = await updateWarrantyStatus('warranty-001')

      expect(result.status).toBe(WarrantyStatus.EXPIRED)
    })

    it('should not update if status is already correct', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            id: 'warranty-001',
            tenantId: 'test-tenant-id',
            status: WarrantyStatus.ACTIVE,
            expirationDate: new Date('2026-12-31'),
            claims: [],
            vehicle: { id: 'v1', vin: 'VIN123', make: 'Toyota', model: 'Corolla', year: 2020 },
          },
        }),
      })

      const result = await updateWarrantyStatus('warranty-001')

      expect(result.status).toBe(WarrantyStatus.ACTIVE)
    })
  })

  // =============================================================================
  // updateAllStatuses Tests
  // =============================================================================
  describe('updateAllStatuses', () => {
    it('should update all warranty statuses', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            updated: 2,
          },
        }),
      })

      const result = await updateAllWarrantyStatuses()

      expect(result.updated).toBe(2)
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('v1/warranties/update-all-statuses'),
        expect.any(Object)
      )
    })
  })
})
