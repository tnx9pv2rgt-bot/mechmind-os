/**
 * Warranty Service - MechMind OS Frontend (Multi-Tenant)
 * 
 * Manages warranty records and claims for vehicles including:
 * - Warranty creation and management
 * - Warranty claims processing (file, review, approve, reject, pay)
 * - Expiration tracking and alerts
 * - Remaining coverage calculation
 * 
 * All operations are scoped to the current tenant for data isolation.
 * 
 * @module lib/services/warrantyService
 * @version 3.0.0
 */

import { prisma } from '@/lib/prisma'
import type { Warranty, WarrantyClaim } from '@prisma/client'
import {
  WarrantyStatus,
  ClaimStatus,
  Prisma
} from '@prisma/client'
import { 
  tryGetTenantContext, 
  requireTenantId,
  NoTenantContextError,
} from '@/lib/tenant/context'

// =============================================================================
// Type Definitions
// =============================================================================

export type { Warranty, WarrantyClaim } from '@prisma/client'
export { WarrantyStatus, ClaimStatus }

export enum WarrantyType {
  MANUFACTURER = 'MANUFACTURER',
  EXTENDED = 'EXTENDED',
  DEALER = 'DEALER',
  AS_IS = 'AS_IS',
}

export const WarrantyTypeValues = Object.values(WarrantyType) as string[]

export interface CreateWarrantyDTO {
  vehicleId: string
  type: WarrantyType
  provider: string
  startDate: Date | string
  expirationDate: Date | string
  coverageKm?: number | null
  currentKm: number
  maxCoverage: number
  deductible: number
  terms?: string
  certificateUrl?: string
}

export interface FileClaimDTO {
  issueDescription: string
  estimatedCost: number
  evidence?: string[]
}

export interface ReviewClaimDTO {
  decision: 'APPROVE' | 'REJECT'
  amount?: number
  notes?: string
  reviewedBy: string
}

export interface RemainingCoverage {
  km: number | null
  amount: number
}

export interface WarrantyWithClaims {
  id: string
  tenantId: string
  warrantyNumber: string
  vehicleId: string
  coverageType: string
  startDate: Date
  expirationDate: Date
  status: WarrantyStatus
  mileageLimit: number | null
  maxClaimAmount: number | null
  deductibleAmount: number | null
  createdAt: Date
  updatedAt: Date
  claims: WarrantyClaim[]
  vehicle?: {
    id: string
    vin: string
    make: string
    model: string
    year: number
  }
}

// =============================================================================
// Error Types
// =============================================================================

export class WarrantyError extends Error {
  code: string
  statusCode?: number

  constructor(message: string, code: string, statusCode?: number) {
    super(message)
    this.name = 'WarrantyError'
    this.code = code
    this.statusCode = statusCode
  }
}

export class WarrantyNotFoundError extends WarrantyError {
  constructor(warrantyId: string) {
    super(`Warranty with ID "${warrantyId}" not found`, 'WARRANTY_NOT_FOUND', 404)
    this.name = 'WarrantyNotFoundError'
  }
}

export class ClaimNotFoundError extends WarrantyError {
  constructor(claimId: string) {
    super(`Claim with ID "${claimId}" not found`, 'CLAIM_NOT_FOUND', 404)
    this.name = 'ClaimNotFoundError'
  }
}

export class InvalidWarrantyDataError extends WarrantyError {
  constructor(message: string) {
    super(message, 'INVALID_WARRANTY_DATA', 400)
    this.name = 'InvalidWarrantyDataError'
  }
}

export class InvalidClaimDataError extends WarrantyError {
  constructor(message: string) {
    super(message, 'INVALID_CLAIM_DATA', 400)
    this.name = 'InvalidClaimDataError'
  }
}

export class TenantRequiredError extends Error {
  constructor() {
    super('Tenant context is required for this operation')
    this.name = 'TenantRequiredError'
  }
}

export class UnauthorizedTenantAccessError extends WarrantyError {
  constructor() {
    super('Unauthorized access to tenant data', 'UNAUTHORIZED_TENANT_ACCESS', 403)
    this.name = 'UnauthorizedTenantAccessError'
  }
}

// =============================================================================
// Tenant Context Helper
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
// Utility Functions
// =============================================================================

function daysBetween(date1: Date, date2: Date): number {
  const oneDay = 24 * 60 * 60 * 1000
  return Math.round((date2.getTime() - date1.getTime()) / oneDay)
}

function calculateWarrantyStatus(warranty: { 
  status: WarrantyStatus
  expirationDate: Date 
}): WarrantyStatus {
  const now = new Date()
  const expirationDate = new Date(warranty.expirationDate)
  const daysRemaining = daysBetween(now, expirationDate)

  if (warranty.status === WarrantyStatus.VOID) {
    return WarrantyStatus.VOID
  }

  if (expirationDate < now) {
    return WarrantyStatus.EXPIRED
  }

  if (daysRemaining <= 60) {
    return WarrantyStatus.EXPIRING_SOON
  }

  return WarrantyStatus.ACTIVE
}

function generateWarrantyNumber(tenantId: string): string {
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).substr(2, 4).toUpperCase()
  return `W-${timestamp}-${random}`
}

function generateClaimNumber(tenantId: string): string {
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).substr(2, 4).toUpperCase()
  return `C-${timestamp}-${random}`
}

// =============================================================================
// Validation Functions
// =============================================================================

function validateWarrantyData(data: CreateWarrantyDTO): void {
  const errors: string[] = []

  if (!data.vehicleId?.trim()) {
    errors.push('Vehicle ID is required')
  }

  if (!data.type) {
    errors.push('Warranty type is required')
  }

  if (!data.provider?.trim()) {
    errors.push('Provider is required')
  }

  if (!data.startDate) {
    errors.push('Start date is required')
  }

  if (!data.expirationDate) {
    errors.push('Expiration date is required')
  }

  const startDate = new Date(data.startDate)
  const expirationDate = new Date(data.expirationDate)

  if (isNaN(startDate.getTime())) {
    errors.push('Invalid start date format')
  }

  if (isNaN(expirationDate.getTime())) {
    errors.push('Invalid expiration date format')
  }

  if (!isNaN(startDate.getTime()) && !isNaN(expirationDate.getTime())) {
    if (expirationDate <= startDate) {
      errors.push('Expiration date must be after start date')
    }
  }

  if (data.maxCoverage === undefined || data.maxCoverage === null) {
    errors.push('Maximum coverage amount is required')
  } else if (data.maxCoverage < 0) {
    errors.push('Maximum coverage amount cannot be negative')
  }

  if (data.deductible === undefined || data.deductible === null) {
    errors.push('Deductible amount is required')
  } else if (data.deductible < 0) {
    errors.push('Deductible cannot be negative')
  }

  if (data.currentKm === undefined || data.currentKm === null) {
    errors.push('Current km is required')
  } else if (data.currentKm < 0) {
    errors.push('Current km cannot be negative')
  }

  if (data.coverageKm !== undefined && data.coverageKm !== null && data.coverageKm < 0) {
    errors.push('Coverage km cannot be negative')
  }

  if (errors.length > 0) {
    throw new InvalidWarrantyDataError(errors.join('; '))
  }
}

function validateClaimData(data: FileClaimDTO): void {
  const errors: string[] = []

  if (!data.issueDescription?.trim()) {
    errors.push('Issue description is required')
  } else if (data.issueDescription.length > 5000) {
    errors.push('Issue description cannot exceed 5000 characters')
  }

  if (data.estimatedCost === undefined || data.estimatedCost === null) {
    errors.push('Estimated cost is required')
  } else if (data.estimatedCost <= 0) {
    errors.push('Estimated cost must be greater than zero')
  }

  if (data.evidence && !Array.isArray(data.evidence)) {
    errors.push('Evidence must be an array of URLs')
  }

  if (errors.length > 0) {
    throw new InvalidClaimDataError(errors.join('; '))
  }
}

// =============================================================================
// Warranty Service Class
// =============================================================================

export class WarrantyService {
  /**
   * Create a new warranty for a tenant
   */
  async createWarranty(
    data: CreateWarrantyDTO,
    inputTenantId?: string
  ): Promise<WarrantyWithClaims> {
    const tenantId = await resolveTenantId(inputTenantId)
    validateWarrantyData(data)

    const startDate = new Date(data.startDate)
    const expirationDate = new Date(data.expirationDate)

    // Determine initial status
    let status: WarrantyStatus = WarrantyStatus.ACTIVE
    const now = new Date()
    if (expirationDate < now) {
      status = WarrantyStatus.EXPIRED
    } else if (daysBetween(now, expirationDate) <= 60) {
      status = WarrantyStatus.EXPIRING_SOON
    }

    try {
      // Verify vehicle belongs to tenant
      const vehicle = await prisma.vehicle.findFirst({
        where: {
          id: data.vehicleId,
          tenantId,
        }
      })

      if (!vehicle) {
        throw new WarrantyError('Vehicle not found or does not belong to tenant', 'VEHICLE_NOT_FOUND', 404)
      }

      const warranty = await prisma.warranty.create({
        data: {
          tenantId,
          vehicleId: data.vehicleId,
          warrantyNumber: generateWarrantyNumber(tenantId),
          coverageType: data.type,
          startDate,
          expirationDate,
          mileageLimit: data.coverageKm,
          maxClaimAmount: data.maxCoverage,
          deductibleAmount: data.deductible,
          status,
          alertsSent: [],
          vehicleVin: vehicle.vin,
        },
        include: {
          claims: true,
          vehicle: {
            select: {
              id: true,
              vin: true,
              make: true,
              model: true,
              year: true,
            },
          },
        },
      })

      return warranty as WarrantyWithClaims
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2003') {
          throw new WarrantyError('Vehicle not found', 'VEHICLE_NOT_FOUND', 404)
        }
      }
      if (error instanceof WarrantyError || error instanceof TenantRequiredError) {
        throw error
      }
      throw new WarrantyError(
        error instanceof Error ? error.message : 'Failed to create warranty',
        'CREATE_FAILED',
        500
      )
    }
  }

  /**
   * Get warranty by ID - scoped to tenant
   */
  async getWarranty(
    warrantyId: string,
    inputTenantId?: string
  ): Promise<WarrantyWithClaims | null> {
    const tenantId = await resolveTenantId(inputTenantId)

    try {
      const warranty = await prisma.warranty.findFirst({
        where: {
          id: warrantyId,
          tenantId,
        },
        include: {
          claims: true,
          vehicle: {
            select: {
              id: true,
              vin: true,
              make: true,
              model: true,
              year: true,
            },
          },
        },
      })

      return warranty as WarrantyWithClaims | null
    } catch (error) {
      throw new WarrantyError(
        error instanceof Error ? error.message : 'Failed to get warranty',
        'GET_FAILED',
        500
      )
    }
  }

  /**
   * Get warranty by vehicle ID - scoped to tenant
   */
  async getWarrantyByVehicle(
    vehicleId: string,
    inputTenantId?: string
  ): Promise<WarrantyWithClaims | null> {
    const tenantId = await resolveTenantId(inputTenantId)

    try {
      const warranty = await prisma.warranty.findFirst({
        where: {
          vehicleId,
          tenantId,
        },
        include: {
          claims: true,
          vehicle: {
            select: {
              id: true,
              vin: true,
              make: true,
              model: true,
              year: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      })

      return warranty as WarrantyWithClaims | null
    } catch (error) {
      throw new WarrantyError(
        error instanceof Error ? error.message : 'Failed to get warranty',
        'GET_FAILED',
        500
      )
    }
  }

  /**
   * Update warranty status
   */
  async updateStatus(
    warrantyId: string,
    inputTenantId?: string
  ): Promise<WarrantyWithClaims> {
    const tenantId = await resolveTenantId(inputTenantId)

    const warranty = await prisma.warranty.findFirst({
      where: {
        id: warrantyId,
        tenantId,
      },
      include: {
        claims: true,
        vehicle: {
          select: {
            id: true,
            vin: true,
            make: true,
            model: true,
            year: true,
          },
        },
      },
    })

    if (!warranty) {
      throw new WarrantyNotFoundError(warrantyId)
    }

    const newStatus = calculateWarrantyStatus(warranty)

    if (newStatus !== warranty.status) {
      const updated = await prisma.warranty.update({
        where: { id: warrantyId },
        data: { status: newStatus },
        include: {
          claims: true,
          vehicle: {
            select: {
              id: true,
              vin: true,
              make: true,
              model: true,
              year: true,
            },
          },
        },
      })
      return updated as WarrantyWithClaims
    }

    return warranty as WarrantyWithClaims
  }

  /**
   * Update all warranty statuses for a tenant (for cron job)
   */
  async updateAllStatuses(
    inputTenantId?: string
  ): Promise<{ updated: number }> {
    const tenantId = await resolveTenantId(inputTenantId)

    const warranties = await prisma.warranty.findMany({
      where: {
        tenantId,
        status: {
          in: [WarrantyStatus.ACTIVE, WarrantyStatus.EXPIRING_SOON],
        },
      },
    })

    let updated = 0
    const now = new Date()

    for (const warranty of warranties) {
      const newStatus = calculateWarrantyStatus(warranty)
      if (newStatus !== warranty.status) {
        await prisma.warranty.update({
          where: { id: warranty.id },
          data: { status: newStatus },
        })
        updated++
      }
    }

    return { updated }
  }

  /**
   * File a new warranty claim
   */
  async fileClaim(
    warrantyId: string,
    data: FileClaimDTO,
    inputTenantId?: string
  ): Promise<WarrantyClaim> {
    const tenantId = await resolveTenantId(inputTenantId)
    validateClaimData(data)

    const warranty = await prisma.warranty.findFirst({
      where: {
        id: warrantyId,
        tenantId,
      },
    })

    if (!warranty) {
      throw new WarrantyNotFoundError(warrantyId)
    }

    if (warranty.status === WarrantyStatus.EXPIRED) {
      throw new InvalidClaimDataError('Cannot file claim on expired warranty')
    }

    if (warranty.status === WarrantyStatus.VOID) {
      throw new InvalidClaimDataError('Cannot file claim on void warranty')
    }

    try {
      const claim = await prisma.warrantyClaim.create({
        data: {
          tenantId,
          warrantyId,
          claimNumber: generateClaimNumber(tenantId),
          description: data.issueDescription,
          amount: data.estimatedCost,
          evidencePhotos: data.evidence || [],
          status: ClaimStatus.SUBMITTED,
        },
      })

      return claim
    } catch (error) {
      throw new WarrantyError(
        error instanceof Error ? error.message : 'Failed to file claim',
        'CLAIM_FAILED',
        500
      )
    }
  }

  /**
   * Review a claim (approve or reject)
   */
  async reviewClaim(
    claimId: string,
    decision: 'APPROVE' | 'REJECT',
    amount?: number,
    notes?: string,
    reviewedBy?: string,
    inputTenantId?: string
  ): Promise<WarrantyClaim> {
    const tenantId = await resolveTenantId(inputTenantId)

    const claim = await prisma.warrantyClaim.findFirst({
      where: {
        id: claimId,
        tenantId,
      },
      include: { warranty: true },
    })

    if (!claim) {
      throw new ClaimNotFoundError(claimId)
    }

    if (claim.status !== ClaimStatus.SUBMITTED && claim.status !== ClaimStatus.UNDER_REVIEW) {
      throw new InvalidClaimDataError(`Cannot review claim with status: ${claim.status}`)
    }

    const updateData: Prisma.WarrantyClaimUpdateInput = {
      status: decision === 'APPROVE' ? ClaimStatus.APPROVED : ClaimStatus.REJECTED,
      reviewedDate: new Date(),
    }

    if (decision === 'APPROVE') {
      if (amount === undefined || amount === null) {
        throw new InvalidClaimDataError('Approved amount is required when approving a claim')
      }
      if (amount <= 0) {
        throw new InvalidClaimDataError('Approved amount must be greater than zero')
      }
      updateData.amount = amount
      updateData.resolvedDate = new Date()
    }

    if (reviewedBy || notes) {
      const reviewNotes = [
        reviewedBy && `Reviewed by: ${reviewedBy}`,
        notes
      ].filter(Boolean).join('\n\n')
      
      if (reviewNotes) {
        updateData.description = `${claim.description}\n\n---\n${reviewNotes}`
      }
    }

    try {
      const updatedClaim = await prisma.warrantyClaim.update({
        where: { id: claimId },
        data: updateData,
      })

      return updatedClaim
    } catch (error) {
      throw new WarrantyError(
        error instanceof Error ? error.message : 'Failed to review claim',
        'REVIEW_FAILED',
        500
      )
    }
  }

  /**
   * Mark claim as paid
   */
  async markClaimPaid(
    claimId: string,
    inputTenantId?: string
  ): Promise<WarrantyClaim> {
    const tenantId = await resolveTenantId(inputTenantId)

    const claim = await prisma.warrantyClaim.findFirst({
      where: {
        id: claimId,
        tenantId,
      },
    })

    if (!claim) {
      throw new ClaimNotFoundError(claimId)
    }

    if (claim.status !== ClaimStatus.APPROVED) {
      throw new InvalidClaimDataError(`Cannot mark as paid. Claim status is: ${claim.status}`)
    }

    try {
      const updatedClaim = await prisma.warrantyClaim.update({
        where: { id: claimId },
        data: {
          status: ClaimStatus.PAID,
          resolvedDate: new Date(),
        },
      })

      return updatedClaim
    } catch (error) {
      throw new WarrantyError(
        error instanceof Error ? error.message : 'Failed to mark claim as paid',
        'PAYMENT_FAILED',
        500
      )
    }
  }

  /**
   * Get expiring warranties for a tenant (for alerts)
   * CRITICAL: Always filters by tenantId for data isolation
   */
  async getExpiringWarranties(
    days: number,
    inputTenantId?: string
  ): Promise<WarrantyWithClaims[]> {
    const tenantId = await resolveTenantId(inputTenantId)

    if (days < 0) {
      throw new InvalidWarrantyDataError('Days parameter cannot be negative')
    }

    const now = new Date()
    const cutoffDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000)

    try {
      const warranties = await prisma.warranty.findMany({
        where: {
          tenantId,
          expirationDate: {
            lte: cutoffDate,
            gte: now,
          },
          status: {
            in: [WarrantyStatus.ACTIVE, WarrantyStatus.EXPIRING_SOON],
          },
        },
        include: {
          claims: true,
          vehicle: {
            select: {
              id: true,
              vin: true,
              make: true,
              model: true,
              year: true,
            },
          },
        },
        orderBy: {
          expirationDate: 'asc',
        },
      })

      return warranties as WarrantyWithClaims[]
    } catch (error) {
      throw new WarrantyError(
        error instanceof Error ? error.message : 'Failed to get expiring warranties',
        'QUERY_FAILED',
        500
      )
    }
  }

  /**
   * Get claims by status for a tenant
   */
  async getClaims(
    status?: ClaimStatus,
    inputTenantId?: string
  ): Promise<WarrantyClaim[]> {
    const tenantId = await resolveTenantId(inputTenantId)

    try {
      const claims = await prisma.warrantyClaim.findMany({
        where: {
          tenantId,
          status,
        },
        include: {
          warranty: {
            include: {
              vehicle: {
                select: {
                  id: true,
                  vin: true,
                  make: true,
                  model: true,
                },
              },
            },
          },
        },
        orderBy: {
          submittedDate: 'desc',
        },
      })

      return claims
    } catch (error) {
      throw new WarrantyError(
        error instanceof Error ? error.message : 'Failed to get claims',
        'QUERY_FAILED',
        500
      )
    }
  }

  /**
   * Get claims for a specific warranty
   */
  async getClaimsByWarranty(
    warrantyId: string,
    inputTenantId?: string
  ): Promise<WarrantyClaim[]> {
    const tenantId = await resolveTenantId(inputTenantId)

    try {
      // First verify warranty belongs to tenant
      const warranty = await prisma.warranty.findFirst({
        where: {
          id: warrantyId,
          tenantId,
        },
      })

      if (!warranty) {
        throw new WarrantyNotFoundError(warrantyId)
      }

      const claims = await prisma.warrantyClaim.findMany({
        where: {
          warrantyId,
          tenantId,
        },
        orderBy: {
          submittedDate: 'desc',
        },
      })

      return claims
    } catch (error) {
      if (error instanceof WarrantyNotFoundError) {
        throw error
      }
      throw new WarrantyError(
        error instanceof Error ? error.message : 'Failed to get claims',
        'QUERY_FAILED',
        500
      )
    }
  }

  /**
   * Get a single claim by ID
   */
  async getClaim(
    claimId: string,
    inputTenantId?: string
  ): Promise<WarrantyClaim | null> {
    const tenantId = await resolveTenantId(inputTenantId)

    try {
      const claim = await prisma.warrantyClaim.findFirst({
        where: {
          id: claimId,
          tenantId,
        },
        include: {
          warranty: {
            include: {
              vehicle: {
                select: {
                  id: true,
                  vin: true,
                  make: true,
                  model: true,
                  year: true,
                },
              },
            },
          },
        },
      })

      return claim
    } catch (error) {
      throw new WarrantyError(
        error instanceof Error ? error.message : 'Failed to get claim',
        'QUERY_FAILED',
        500
      )
    }
  }

  /**
   * Calculate remaining coverage
   */
  async getRemainingCoverage(
    warrantyId: string,
    inputTenantId?: string
  ): Promise<RemainingCoverage> {
    const tenantId = await resolveTenantId(inputTenantId)

    const warranty = await prisma.warranty.findFirst({
      where: {
        id: warrantyId,
        tenantId,
      },
      include: {
        claims: {
          where: {
            status: {
              in: [ClaimStatus.APPROVED, ClaimStatus.PAID],
            },
          },
        },
      },
    })

    if (!warranty) {
      throw new WarrantyNotFoundError(warrantyId)
    }

    // Calculate remaining amount
    const totalApproved = warranty.claims.reduce(
      (sum, claim) => sum + (claim.amount || 0),
      0
    )
    const remainingAmount = Math.max(0, (warranty.maxClaimAmount || 0) - totalApproved)

    // Calculate remaining km (if applicable)
    const remainingKm: number | null = warranty.mileageLimit ?? null

    return {
      km: remainingKm,
      amount: remainingAmount,
    }
  }

  /**
   * List all warranties for a tenant with optional filters
   */
  async listWarranties(
    filters?: {
      vehicleId?: string
      status?: WarrantyStatus
      type?: WarrantyType
    },
    inputTenantId?: string
  ): Promise<WarrantyWithClaims[]> {
    const tenantId = await resolveTenantId(inputTenantId)

    try {
      const warranties = await prisma.warranty.findMany({
        where: {
          tenantId,
          vehicleId: filters?.vehicleId,
          status: filters?.status,
          coverageType: filters?.type,
        },
        include: {
          claims: true,
          vehicle: {
            select: {
              id: true,
              vin: true,
              make: true,
              model: true,
              year: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      })

      return warranties as WarrantyWithClaims[]
    } catch (error) {
      throw new WarrantyError(
        error instanceof Error ? error.message : 'Failed to list warranties',
        'QUERY_FAILED',
        500
      )
    }
  }

  /**
   * Update warranty
   */
  async updateWarranty(
    warrantyId: string,
    data: Partial<CreateWarrantyDTO>,
    inputTenantId?: string
  ): Promise<WarrantyWithClaims> {
    const tenantId = await resolveTenantId(inputTenantId)

    const warranty = await prisma.warranty.findFirst({
      where: {
        id: warrantyId,
        tenantId,
      },
    })

    if (!warranty) {
      throw new WarrantyNotFoundError(warrantyId)
    }

    try {
      const updated = await prisma.warranty.update({
        where: { id: warrantyId },
        data: {
          coverageType: data.type,
          mileageLimit: data.coverageKm,
          maxClaimAmount: data.maxCoverage,
          deductibleAmount: data.deductible,
          startDate: data.startDate ? new Date(data.startDate) : undefined,
          expirationDate: data.expirationDate ? new Date(data.expirationDate) : undefined,
        },
        include: {
          claims: true,
          vehicle: {
            select: {
              id: true,
              vin: true,
              make: true,
              model: true,
              year: true,
            },
          },
        },
      })

      return updated as WarrantyWithClaims
    } catch (error) {
      throw new WarrantyError(
        error instanceof Error ? error.message : 'Failed to update warranty',
        'UPDATE_FAILED',
        500
      )
    }
  }

  /**
   * Delete warranty
   */
  async deleteWarranty(
    warrantyId: string,
    inputTenantId?: string
  ): Promise<void> {
    const tenantId = await resolveTenantId(inputTenantId)

    const warranty = await prisma.warranty.findFirst({
      where: {
        id: warrantyId,
        tenantId,
      },
    })

    if (!warranty) {
      throw new WarrantyNotFoundError(warrantyId)
    }

    try {
      await prisma.warranty.delete({
        where: { id: warrantyId },
      })
    } catch (error) {
      throw new WarrantyError(
        error instanceof Error ? error.message : 'Failed to delete warranty',
        'DELETE_FAILED',
        500
      )
    }
  }

  /**
   * Record that an alert was sent
   */
  async recordAlertSent(
    warrantyId: string,
    inputTenantId?: string
  ): Promise<WarrantyWithClaims> {
    const tenantId = await resolveTenantId(inputTenantId)

    const warranty = await prisma.warranty.findFirst({
      where: {
        id: warrantyId,
        tenantId,
      },
    })

    if (!warranty) {
      throw new WarrantyNotFoundError(warrantyId)
    }

    const currentAlerts = warranty.alertsSent || []

    const updated = await prisma.warranty.update({
      where: { id: warrantyId },
      data: {
        alertsSent: [...currentAlerts, new Date()],
      },
      include: {
        claims: true,
        vehicle: {
          select: {
            id: true,
            vin: true,
            make: true,
            model: true,
            year: true,
          },
        },
      },
    })

    return updated as WarrantyWithClaims
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

export const warrantyService = new WarrantyService()

// =============================================================================
// Convenience Functions with Tenant Support
// =============================================================================

export const createWarranty = (data: CreateWarrantyDTO, tenantId?: string) => 
  warrantyService.createWarranty(data, tenantId)
export const getWarranty = (warrantyId: string, tenantId?: string) => 
  warrantyService.getWarranty(warrantyId, tenantId)
export const getWarrantyByVehicle = (vehicleId: string, tenantId?: string) => 
  warrantyService.getWarrantyByVehicle(vehicleId, tenantId)
export const updateWarrantyStatus = (warrantyId: string, tenantId?: string) => 
  warrantyService.updateStatus(warrantyId, tenantId)
export const fileClaim = (warrantyId: string, data: FileClaimDTO, tenantId?: string) => 
  warrantyService.fileClaim(warrantyId, data, tenantId)
export const reviewClaim = (
  claimId: string,
  decision: 'APPROVE' | 'REJECT',
  amount?: number,
  notes?: string,
  reviewedBy?: string,
  tenantId?: string
) => warrantyService.reviewClaim(claimId, decision, amount, notes, reviewedBy, tenantId)
export const markClaimPaid = (claimId: string, tenantId?: string) => 
  warrantyService.markClaimPaid(claimId, tenantId)
export const getExpiringWarranties = (days: number, tenantId?: string) => 
  warrantyService.getExpiringWarranties(days, tenantId)
export const getClaims = (status?: ClaimStatus, tenantId?: string) => 
  warrantyService.getClaims(status, tenantId)
export const getClaimsByWarranty = (warrantyId: string, tenantId?: string) => 
  warrantyService.getClaimsByWarranty(warrantyId, tenantId)
export const getClaim = (claimId: string, tenantId?: string) => 
  warrantyService.getClaim(claimId, tenantId)
export const getRemainingCoverage = (warrantyId: string, tenantId?: string) => 
  warrantyService.getRemainingCoverage(warrantyId, tenantId)
export const listWarranties = (filters?: Parameters<WarrantyService['listWarranties']>[0], tenantId?: string) => 
  warrantyService.listWarranties(filters, tenantId)
export const updateWarranty = (warrantyId: string, data: Partial<CreateWarrantyDTO>, tenantId?: string) => 
  warrantyService.updateWarranty(warrantyId, data, tenantId)
export const deleteWarranty = (warrantyId: string, tenantId?: string) => 
  warrantyService.deleteWarranty(warrantyId, tenantId)
export const updateAllWarrantyStatuses = (tenantId?: string) => 
  warrantyService.updateAllStatuses(tenantId)
export const recordAlertSent = (warrantyId: string, tenantId?: string) => 
  warrantyService.recordAlertSent(warrantyId, tenantId)

// =============================================================================
// Additional Compatibility Exports
// =============================================================================

/**
 * Create a warranty claim (alias for fileClaim)
 */
export const createWarrantyClaim = fileClaim

/**
 * Get warranty by inspection ID
 * Returns the warranty associated with a specific inspection
 */
export async function getWarrantyByInspection(
  _inspectionId: string,
  tenantId?: string
): Promise<WarrantyWithClaims | null> {
  // Note: Warranty and WarrantyClaim models do not have a metadata JSON field.
  // This function is a placeholder until the schema supports inspection-warranty linking.
  const _effectiveTenantId = tenantId || await requireTenantId()
  return null
}


// Additional exports for compatibility
export async function getWarrantyClaims(warrantyId: string, tenantId?: string) {
  const effectiveTenantId = tenantId || await requireTenantId()
  return prisma.warrantyClaim.findMany({
    where: {
      warrantyId,
      warranty: {
        tenantId: effectiveTenantId
      }
    },
    orderBy: { createdAt: 'desc' }
  })
}

export async function updateWarrantyAlerts(
  warrantyId: string,
  alertSettings: { email?: boolean; sms?: boolean; daysBefore?: number },
  tenantId?: string
): Promise<Warranty> {
  const effectiveTenantId = tenantId || await requireTenantId()
  const data: Prisma.WarrantyUpdateInput = {}
  if (alertSettings.email !== undefined) {
    data.alertEmailEnabled = alertSettings.email
  }
  if (alertSettings.sms !== undefined) {
    data.alertSmsEnabled = alertSettings.sms
  }
  if (alertSettings.daysBefore !== undefined) {
    data.alertDaysBeforeExpiry = alertSettings.daysBefore
  }
  return prisma.warranty.update({
    where: {
      id: warrantyId,
      tenantId: effectiveTenantId
    },
    data
  })
}
