/**
 * Warranty Service Unit Tests
 * 
 * Tests for warranty creation, validation, expiration tracking,
 * claims management, and remaining coverage calculation.
 * 
 * @module lib/services/__tests__/warrantyService
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { Mock } from 'vitest'

// Mock Prisma
const mockPrismaWarranty = {
  create: vi.fn(),
  findUnique: vi.fn(),
  findFirst: vi.fn(),
  findMany: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
}

const mockPrismaWarrantyClaim = {
  create: vi.fn(),
  findUnique: vi.fn(),
  findMany: vi.fn(),
  update: vi.fn(),
}

vi.mock('@/lib/prisma', () => ({
  prisma: {
    warranty: mockPrismaWarranty,
    warrantyClaim: mockPrismaWarrantyClaim,
    $disconnect: vi.fn(),
  },
}))

// Import after mocking
import { 
  WarrantyService,
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
  let service: WarrantyService

  beforeEach(() => {
    service = new WarrantyService()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
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

    it('should create a warranty with valid data', async () => {
      const mockWarranty = {
        id: 'warranty-001',
        ...validWarrantyData,
        status: WarrantyStatus.ACTIVE,
        alertsSent: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockPrismaWarranty.create.mockResolvedValue(mockWarranty)

      const result = await service.createWarranty(validWarrantyData)

      expect(result).toEqual(mockWarranty)
      expect(mockPrismaWarranty.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          vehicleId: validWarrantyData.vehicleId,
          type: validWarrantyData.type,
          provider: validWarrantyData.provider,
          maxCoverage: validWarrantyData.maxCoverage,
          deductible: validWarrantyData.deductible,
        }),
      })
    })

    it('should throw InvalidWarrantyDataError for missing vehicleId', async () => {
      const invalidData = { ...validWarrantyData, vehicleId: '' }

      await expect(service.createWarranty(invalidData)).rejects.toThrow(InvalidWarrantyDataError)
    })

    it('should throw InvalidWarrantyDataError for missing provider', async () => {
      const invalidData = { ...validWarrantyData, provider: '' }

      await expect(service.createWarranty(invalidData)).rejects.toThrow(InvalidWarrantyDataError)
    })

    it('should throw InvalidWarrantyDataError for expiration before start', async () => {
      const invalidData = {
        ...validWarrantyData,
        startDate: new Date('2026-01-01'),
        expirationDate: new Date('2024-01-01'),
      }

      await expect(service.createWarranty(invalidData)).rejects.toThrow(InvalidWarrantyDataError)
    })

    it('should throw InvalidWarrantyDataError for negative max coverage', async () => {
      const invalidData = { ...validWarrantyData, maxCoverage: -100 }

      await expect(service.createWarranty(invalidData)).rejects.toThrow(InvalidWarrantyDataError)
    })

    it('should throw InvalidWarrantyDataError for negative deductible', async () => {
      const invalidData = { ...validWarrantyData, deductible: -50 }

      await expect(service.createWarranty(invalidData)).rejects.toThrow(InvalidWarrantyDataError)
    })

    it('should throw InvalidWarrantyDataError for negative currentKm', async () => {
      const invalidData = { ...validWarrantyData, currentKm: -1000 }

      await expect(service.createWarranty(invalidData)).rejects.toThrow(InvalidWarrantyDataError)
    })

    it('should set EXPIRED status if expiration date is in the past', async () => {
      const expiredData = {
        ...validWarrantyData,
        startDate: new Date('2020-01-01'),
        expirationDate: new Date('2021-01-01'),
      }

      mockPrismaWarranty.create.mockResolvedValue({
        id: 'warranty-002',
        ...expiredData,
        status: WarrantyStatus.EXPIRED,
      })

      const result = await service.createWarranty(expiredData)
      expect(result.status).toBe(WarrantyStatus.EXPIRED)
    })

    it('should set EXPIRING_SOON status if expiration is within 60 days', async () => {
      const expiringSoon = new Date()
      expiringSoon.setDate(expiringSoon.getDate() + 30)

      const expiringData = {
        ...validWarrantyData,
        startDate: new Date(),
        expirationDate: expiringSoon,
      }

      mockPrismaWarranty.create.mockResolvedValue({
        id: 'warranty-003',
        ...expiringData,
        status: WarrantyStatus.EXPIRING_SOON,
      })

      const result = await service.createWarranty(expiringData)
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

    it('should file a claim with valid data', async () => {
      mockPrismaWarranty.findUnique.mockResolvedValue(mockActiveWarranty)
      mockPrismaWarrantyClaim.create.mockResolvedValue({
        id: 'claim-001',
        warrantyId,
        ...validClaimData,
        status: ClaimStatus.SUBMITTED,
        submittedAt: new Date(),
      })

      const result = await service.fileClaim(warrantyId, validClaimData)

      expect(result.status).toBe(ClaimStatus.SUBMITTED)
      expect(result.estimatedCost).toBe(validClaimData.estimatedCost)
    })

    it('should throw WarrantyNotFoundError if warranty not found', async () => {
      mockPrismaWarranty.findUnique.mockResolvedValue(null)

      await expect(service.fileClaim(warrantyId, validClaimData))
        .rejects.toThrow(WarrantyNotFoundError)
    })

    it('should throw InvalidClaimDataError if warranty is expired', async () => {
      mockPrismaWarranty.findUnique.mockResolvedValue({
        ...mockActiveWarranty,
        status: WarrantyStatus.EXPIRED,
      })

      await expect(service.fileClaim(warrantyId, validClaimData))
        .rejects.toThrow(InvalidClaimDataError)
    })

    it('should throw InvalidClaimDataError if warranty is void', async () => {
      mockPrismaWarranty.findUnique.mockResolvedValue({
        ...mockActiveWarranty,
        status: WarrantyStatus.VOID,
      })

      await expect(service.fileClaim(warrantyId, validClaimData))
        .rejects.toThrow(InvalidClaimDataError)
    })

    it('should throw InvalidClaimDataError for missing description', async () => {
      mockPrismaWarranty.findUnique.mockResolvedValue(mockActiveWarranty)

      const invalidData = { ...validClaimData, issueDescription: '' }
      await expect(service.fileClaim(warrantyId, invalidData))
        .rejects.toThrow(InvalidClaimDataError)
    })

    it('should throw InvalidClaimDataError for zero estimated cost', async () => {
      mockPrismaWarranty.findUnique.mockResolvedValue(mockActiveWarranty)

      const invalidData = { ...validClaimData, estimatedCost: 0 }
      await expect(service.fileClaim(warrantyId, invalidData))
        .rejects.toThrow(InvalidClaimDataError)
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
      mockPrismaWarrantyClaim.findUnique.mockResolvedValue(mockSubmittedClaim)
      mockPrismaWarrantyClaim.update.mockResolvedValue({
        ...mockSubmittedClaim,
        status: ClaimStatus.APPROVED,
        approvedAmount: 450,
        reviewedAt: new Date(),
      })

      const result = await service.reviewClaim(claimId, 'APPROVE', 450, 'Looks good', 'admin-001')

      expect(result.status).toBe(ClaimStatus.APPROVED)
      expect(result.approvedAmount).toBe(450)
    })

    it('should reject a claim', async () => {
      mockPrismaWarrantyClaim.findUnique.mockResolvedValue(mockSubmittedClaim)
      mockPrismaWarrantyClaim.update.mockResolvedValue({
        ...mockSubmittedClaim,
        status: ClaimStatus.REJECTED,
        reviewedAt: new Date(),
        reviewNotes: 'Not covered',
      })

      const result = await service.reviewClaim(claimId, 'REJECT', undefined, 'Not covered', 'admin-001')

      expect(result.status).toBe(ClaimStatus.REJECTED)
    })

    it('should throw ClaimNotFoundError if claim not found', async () => {
      mockPrismaWarrantyClaim.findUnique.mockResolvedValue(null)

      await expect(service.reviewClaim(claimId, 'APPROVE', 100))
        .rejects.toThrow(ClaimNotFoundError)
    })

    it('should throw InvalidClaimDataError when approving without amount', async () => {
      mockPrismaWarrantyClaim.findUnique.mockResolvedValue(mockSubmittedClaim)

      await expect(service.reviewClaim(claimId, 'APPROVE'))
        .rejects.toThrow(InvalidClaimDataError)
    })

    it('should throw InvalidClaimDataError for already processed claim', async () => {
      mockPrismaWarrantyClaim.findUnique.mockResolvedValue({
        ...mockSubmittedClaim,
        status: ClaimStatus.APPROVED,
      })

      await expect(service.reviewClaim(claimId, 'APPROVE', 100))
        .rejects.toThrow(InvalidClaimDataError)
    })
  })

  // =============================================================================
  // markClaimPaid Tests
  // =============================================================================
  describe('markClaimPaid', () => {
    const claimId = 'claim-001'

    it('should mark an approved claim as paid', async () => {
      mockPrismaWarrantyClaim.findUnique.mockResolvedValue({
        id: claimId,
        status: ClaimStatus.APPROVED,
        approvedAmount: 450,
      })
      mockPrismaWarrantyClaim.update.mockResolvedValue({
        id: claimId,
        status: ClaimStatus.PAID,
        paidAt: new Date(),
      })

      const result = await service.markClaimPaid(claimId)

      expect(result.status).toBe(ClaimStatus.PAID)
    })

    it('should throw ClaimNotFoundError if claim not found', async () => {
      mockPrismaWarrantyClaim.findUnique.mockResolvedValue(null)

      await expect(service.markClaimPaid(claimId))
        .rejects.toThrow(ClaimNotFoundError)
    })

    it('should throw InvalidClaimDataError if claim is not approved', async () => {
      mockPrismaWarrantyClaim.findUnique.mockResolvedValue({
        id: claimId,
        status: ClaimStatus.SUBMITTED,
      })

      await expect(service.markClaimPaid(claimId))
        .rejects.toThrow(InvalidClaimDataError)
    })
  })

  // =============================================================================
  // getRemainingCoverage Tests
  // =============================================================================
  describe('getRemainingCoverage', () => {
    const warrantyId = 'warranty-001'

    it('should calculate remaining coverage correctly', async () => {
      mockPrismaWarranty.findUnique.mockResolvedValue({
        id: warrantyId,
        maxCoverage: 5000,
        currentKm: 10000,
        coverageKm: 50000,
        claims: [
          { approvedAmount: 1000 },
          { approvedAmount: 500 },
        ],
      })

      const result = await service.getRemainingCoverage(warrantyId)

      expect(result.amount).toBe(3500) // 5000 - 1500
      expect(result.km).toBe(50000) // Unlimited since we're not tracking current vehicle km
    })

    it('should return null km if no coverage limit', async () => {
      mockPrismaWarranty.findUnique.mockResolvedValue({
        id: warrantyId,
        maxCoverage: 5000,
        currentKm: 10000,
        coverageKm: null,
        claims: [],
      })

      const result = await service.getRemainingCoverage(warrantyId)

      expect(result.amount).toBe(5000)
      expect(result.km).toBeNull()
    })

    it('should throw WarrantyNotFoundError if warranty not found', async () => {
      mockPrismaWarranty.findUnique.mockResolvedValue(null)

      await expect(service.getRemainingCoverage(warrantyId))
        .rejects.toThrow(WarrantyNotFoundError)
    })
  })

  // =============================================================================
  // getExpiringWarranties Tests
  // =============================================================================
  describe('getExpiringWarranties', () => {
    it('should get warranties expiring within specified days', async () => {
      const mockWarranties = [
        {
          id: 'warranty-001',
          expirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          status: WarrantyStatus.ACTIVE,
        },
        {
          id: 'warranty-002',
          expirationDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
          status: WarrantyStatus.EXPIRING_SOON,
        },
      ]

      mockPrismaWarranty.findMany.mockResolvedValue(mockWarranties)

      const result = await service.getExpiringWarranties(60)

      expect(result).toHaveLength(2)
      expect(mockPrismaWarranty.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            expirationDate: expect.objectContaining({
              lte: expect.any(Date),
              gte: expect.any(Date),
            }),
          }),
        })
      )
    })

    it('should throw InvalidWarrantyDataError for negative days', async () => {
      await expect(service.getExpiringWarranties(-5))
        .rejects.toThrow(InvalidWarrantyDataError)
    })
  })

  // =============================================================================
  // updateStatus Tests
  // =============================================================================
  describe('updateStatus', () => {
    it('should update warranty status based on expiration', async () => {
      const expirationDate = new Date()
      expirationDate.setDate(expirationDate.getDate() - 1) // Yesterday

      mockPrismaWarranty.findUnique.mockResolvedValue({
        id: 'warranty-001',
        status: WarrantyStatus.ACTIVE,
        expirationDate,
      })
      mockPrismaWarranty.update.mockResolvedValue({
        id: 'warranty-001',
        status: WarrantyStatus.EXPIRED,
      })

      const result = await service.updateStatus('warranty-001')

      expect(result.status).toBe(WarrantyStatus.EXPIRED)
    })

    it('should not update if status is already correct', async () => {
      const expirationDate = new Date()
      expirationDate.setDate(expirationDate.getDate() + 100) // Far future

      mockPrismaWarranty.findUnique.mockResolvedValue({
        id: 'warranty-001',
        status: WarrantyStatus.ACTIVE,
        expirationDate,
      })

      const result = await service.updateStatus('warranty-001')

      expect(mockPrismaWarranty.update).not.toHaveBeenCalled()
      expect(result.status).toBe(WarrantyStatus.ACTIVE)
    })
  })

  // =============================================================================
  // updateAllStatuses Tests
  // =============================================================================
  describe('updateAllStatuses', () => {
    it('should update all warranty statuses', async () => {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)

      mockPrismaWarranty.findMany.mockResolvedValue([
        { id: 'warranty-001', status: WarrantyStatus.ACTIVE, expirationDate: yesterday },
        { id: 'warranty-002', status: WarrantyStatus.EXPIRING_SOON, expirationDate: yesterday },
      ])
      mockPrismaWarranty.update.mockResolvedValue({})

      const result = await service.updateAllStatuses()

      expect(result.updated).toBe(2)
      expect(mockPrismaWarranty.update).toHaveBeenCalledTimes(2)
    })
  })
})
