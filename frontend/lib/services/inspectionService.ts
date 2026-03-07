/**
 * MechMind OS - Vehicle Inspection Service
 * 
 * Service layer for managing digital vehicle inspections (DVI).
 * Provides CRUD operations, scoring, and workflow management.
 * 
 * @module lib/services/inspectionService
 * @version 1.0.0
 * @requires @trpc/client
 */

import { trpc, TRPCClientError, NetworkError, ServerError } from '../trpc-client'
import type { 
  InspectionStatus, 
  InspectionItemStatus, 
  FindingSeverity, 
  FindingStatus,
  FuelLevel 
} from '@prisma/client'

// =============================================================================
// Type Definitions
// =============================================================================

/**
 * Vehicle information in inspection context
 */
export interface InspectionVehicle {
  id: string
  make: string
  model: string
  year?: number
  licensePlate: string
  vin?: string
}

/**
 * Customer information in inspection context
 */
export interface InspectionCustomer {
  id: string
  firstName: string
  lastName: string
  email?: string
  phone?: string
}

/**
 * Inspector/Mechanic information
 */
export interface Inspector {
  id: string
  firstName: string
  lastName: string
  email: string
  role: string
}

/**
 * Sensory inspection data (visual, auditory, tactile checks)
 */
export interface SensoryInspection {
  id: string
  inspectionId: string
  category: string
  visualNotes?: string
  auditoryNotes?: string
  tactileNotes?: string
  olfactoryNotes?: string
  severity: FindingSeverity
  photos: InspectionPhoto[]
  createdAt: Date
  updatedAt: Date
}

/**
 * Warranty information for inspected components
 */
export interface WarrantyInfo {
  id: string
  inspectionId: string
  component: string
  hasWarranty: boolean
  warrantyProvider?: string
  warrantyExpiryDate?: Date
  warrantyCoveragePercentage?: number
  notes?: string
}

/**
 * AI analysis results for inspection
 */
export interface AIAnalysis {
  id: string
  inspectionId: string
  analysisType: string
  confidence: number
  findings: string[]
  recommendations: string[]
  estimatedRepairCost?: number
  urgencyScore: number // 1-10
  analyzedAt: Date
  modelVersion: string
}

/**
 * Video recording information
 */
export interface InspectionVideo {
  id: string
  inspectionId: string
  url: string
  thumbnailUrl?: string
  category: string
  description?: string
  durationSeconds?: number
  takenAt: Date
  takenBy: string
}

/**
 * Inspection photo with metadata
 */
export interface InspectionPhoto {
  id: string
  url: string
  thumbnailUrl?: string
  category?: string
  description?: string
  takenAt: Date
  takenBy: string
  annotations?: PhotoAnnotation[]
}

/**
 * Photo annotation for marking specific areas
 */
export interface PhotoAnnotation {
  id: string
  x: number // percentage 0-100
  y: number // percentage 0-100
  text: string
  color: string
  arrowDirection?: 'up' | 'down' | 'left' | 'right'
}

/**
 * Template item for inspection checklist
 */
export interface InspectionTemplateItem {
  id: string
  category: string
  name: string
  description?: string
  position: number
  isRequired: boolean
}

/**
 * Individual inspection item (checklist entry)
 */
export interface InspectionItem {
  id: string
  inspectionId: string
  templateItemId: string
  templateItem: InspectionTemplateItem
  status: InspectionItemStatus
  notes?: string
  severity?: FindingSeverity
  photos: InspectionPhoto[]
}

/**
 * Finding/issue discovered during inspection
 */
export interface InspectionFinding {
  id: string
  inspectionId: string
  category: string
  title: string
  description: string
  severity: FindingSeverity
  recommendation?: string
  estimatedCost?: number
  status: FindingStatus
  approvedByCustomer: boolean
  approvedAt?: Date
}

/**
 * Main Inspection entity
 */
export interface Inspection {
  id: string
  status: InspectionStatus
  templateId: string
  vehicleId: string
  vehicle: InspectionVehicle
  customerId: string
  customer: InspectionCustomer
  mechanicId: string
  mechanic: Inspector
  tenantId: string
  
  // Metadata
  startedAt: Date
  completedAt?: Date
  mileage?: number
  fuelLevel?: FuelLevel
  
  // Relations
  items: InspectionItem[]
  findings: InspectionFinding[]
  photos: InspectionPhoto[]
  sensoryInspections?: SensoryInspection[]
  warrantyInfo?: WarrantyInfo[]
  aiAnalysis?: AIAnalysis[]
  videos?: InspectionVideo[]
  
  // Customer interaction
  customerNotified: boolean
  customerViewed: boolean
  approvedAt?: Date
  approvedBy?: string
  certificateId?: string
  
  // Soft delete
  deletedAt?: Date
  deletedBy?: string
  isDeleted: boolean
}

/**
 * Paginated response structure
 */
export interface PaginatedInspections {
  items: InspectionSummary[]
  total: number
  page: number
  limit: number
  totalPages: number
}

/**
 * Inspection summary for list views
 */
export interface InspectionSummary {
  id: string
  status: InspectionStatus
  startedAt: Date
  completedAt?: Date
  vehicleInfo: string
  customerName: string
  mechanicName: string
  issuesFound: number
  criticalIssues: number
  overallScore?: number
  certificateId?: string
}

/**
 * Score breakdown by category
 */
export interface InspectionScoreBreakdown {
  overall: number // 1-10
  mechanical: number
  electrical: number
  bodywork: number
  tires: number
  fluids: number
  safety: number
}

// =============================================================================
// Input Types
// =============================================================================

/**
 * Data required to create a new inspection
 */
export interface CreateInspectionInput {
  templateId: string
  vehicleId: string
  customerId: string
  mechanicId: string
  mileage?: number
  fuelLevel?: FuelLevel
  notes?: string
}

/**
 * Data for updating an inspection
 */
export interface UpdateInspectionInput {
  status?: InspectionStatus
  mileage?: number
  fuelLevel?: FuelLevel
  notes?: string
  items?: UpdateInspectionItemInput[]
}

/**
 * Data for updating an inspection item
 */
export interface UpdateInspectionItemInput {
  templateItemId: string
  status: InspectionItemStatus
  notes?: string
  severity?: FindingSeverity
}

/**
 * Data for creating a finding
 */
export interface CreateFindingInput {
  category: string
  title: string
  description: string
  severity: FindingSeverity
  recommendation?: string
  estimatedCost?: number
}

/**
 * Filter options for listing inspections
 */
export interface InspectionFilters {
  status?: InspectionStatus
  inspectorId?: string
  vehicleId?: string
  customerId?: string
  dateFrom?: Date
  dateTo?: Date
  hasFindings?: boolean
  minScore?: number
  maxScore?: number
  searchQuery?: string
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

/**
 * Customer approval input
 */
export interface CustomerApprovalInput {
  email: string
  signature?: string
  approvedFindingIds: string[]
  declinedFindingIds: string[]
  notes?: string
}

// =============================================================================
// Error Classes
// =============================================================================

/**
 * Error thrown when an inspection is not found
 */
export class InspectionNotFoundError extends Error {
  constructor(inspectionId: string) {
    super(`Inspection with ID "${inspectionId}" not found`)
    this.name = 'InspectionNotFoundError'
  }
}

/**
 * Error thrown when inspection validation fails
 */
export class InspectionValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message)
    this.name = 'InspectionValidationError'
  }
}

/**
 * Error thrown when inspection cannot be submitted
 */
export class InspectionSubmissionError extends Error {
  constructor(message: string, public reason?: string) {
    super(message)
    this.name = 'InspectionSubmissionError'
  }
}

// =============================================================================
// Logger
// =============================================================================

const logger = {
  debug: (message: string, meta?: Record<string, unknown>) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[InspectionService] ${message}`, meta ? JSON.stringify(meta) : '')
    }
  },
  info: (message: string, meta?: Record<string, unknown>) => {
    console.info(`[InspectionService] ${message}`, meta ? JSON.stringify(meta) : '')
  },
  warn: (message: string, meta?: Record<string, unknown>) => {
    console.warn(`[InspectionService] ${message}`, meta ? JSON.stringify(meta) : '')
  },
  error: (message: string, error?: unknown, meta?: Record<string, unknown>) => {
    console.error(`[InspectionService] ${message}`, error, meta ? JSON.stringify(meta) : '')
  }
}

// =============================================================================
// Service Functions
// =============================================================================

/**
 * Create a new vehicle inspection
 * 
 * @param data - Inspection creation data
 * @returns Created inspection with all relations
 * @throws {InspectionValidationError} When validation fails
 * @throws {TRPCClientError} On API error
 * 
 * @example
 * ```typescript
 * const inspection = await createInspection({
 *   templateId: 'template-123',
 *   vehicleId: 'vehicle-456',
 *   customerId: 'customer-789',
 *   mechanicId: 'mechanic-abc',
 *   mileage: 50000,
 *   fuelLevel: 'HALF'
 * })
 * ```
 */
export async function createInspection(data: CreateInspectionInput): Promise<Inspection> {
  logger.info('Creating new inspection', { vehicleId: data.vehicleId, mechanicId: data.mechanicId })
  
  try {
    // Validate required fields
    if (!data.templateId || !data.vehicleId || !data.customerId || !data.mechanicId) {
      throw new InspectionValidationError(
        'Missing required fields: templateId, vehicleId, customerId, mechanicId'
      )
    }

    // Note: This assumes the backend has an inspection.create procedure
    // If using direct API calls instead of tRPC, replace this
    const inspection = await trpc.inspection.create.mutate(data)
    
    logger.info('Inspection created successfully', { inspectionId: inspection.id })
    return inspection
  } catch (error) {
    if (error instanceof InspectionValidationError) {
      throw error
    }
    
    logger.error('Failed to create inspection', error, { data })
    
    if (error instanceof TRPCClientError) {
      throw error
    }
    
    throw new ServerError('Failed to create inspection. Please try again.')
  }
}

/**
 * Get a single inspection by ID with all relations
 * 
 * @param id - Inspection ID
 * @returns Inspection with all related data (sensory, warranty, ai, video)
 * @throws {InspectionNotFoundError} When inspection not found
 * @throws {TRPCClientError} On API error
 * 
 * @example
 * ```typescript
 * const inspection = await getInspectionById('inspection-123')
 * console.log(inspection.findings.length)
 * ```
 */
export async function getInspectionById(id: string): Promise<Inspection> {
  logger.debug('Fetching inspection by ID', { inspectionId: id })
  
  try {
    if (!id) {
      throw new InspectionValidationError('Inspection ID is required')
    }

    const inspection = await trpc.inspection.get.query({ id })
    
    if (!inspection) {
      throw new InspectionNotFoundError(id)
    }
    
    logger.debug('Inspection fetched successfully', { inspectionId: id })
    return inspection
  } catch (error) {
    if (error instanceof InspectionNotFoundError || error instanceof InspectionValidationError) {
      throw error
    }
    
    logger.error('Failed to fetch inspection', error, { inspectionId: id })
    
    if (error instanceof TRPCClientError) {
      throw error
    }
    
    throw new ServerError('Failed to fetch inspection details.')
  }
}

/**
 * Update inspection data
 * 
 * @param id - Inspection ID
 * @param data - Update data
 * @returns Updated inspection
 * @throws {InspectionNotFoundError} When inspection not found
 * @throws {InspectionValidationError} When validation fails
 * @throws {TRPCClientError} On API error
 * 
 * @example
 * ```typescript
 * const updated = await updateInspection('inspection-123', {
 *   status: 'PENDING_REVIEW',
 *   mileage: 50100,
 *   items: [
 *     { templateItemId: 'item-1', status: 'CHECKED', severity: 'OK' }
 *   ]
 * })
 * ```
 */
export async function updateInspection(
  id: string, 
  data: UpdateInspectionInput
): Promise<Inspection> {
  logger.info('Updating inspection', { inspectionId: id, updates: Object.keys(data) })
  
  try {
    if (!id) {
      throw new InspectionValidationError('Inspection ID is required')
    }

    const inspection = await trpc.inspection.update.mutate({ id, data })
    
    logger.info('Inspection updated successfully', { inspectionId: id })
    return inspection
  } catch (error) {
    if (error instanceof InspectionValidationError) {
      throw error
    }
    
    logger.error('Failed to update inspection', error, { inspectionId: id, data })
    
    if (error instanceof TRPCClientError) {
      if (error.code === 'NOT_FOUND') {
        throw new InspectionNotFoundError(id)
      }
      throw error
    }
    
    throw new ServerError('Failed to update inspection.')
  }
}

/**
 * List inspections with pagination and filtering
 * 
 * @param filters - Filter criteria
 * @param pagination - Pagination parameters
 * @returns Paginated list of inspection summaries
 * @throws {TRPCClientError} On API error
 * 
 * @example
 * ```typescript
 * const { items, total } = await listInspections(
 *   { status: 'IN_PROGRESS', dateFrom: new Date('2024-01-01') },
 *   { page: 1, limit: 20 }
 * )
 * ```
 */
export async function listInspections(
  filters: InspectionFilters = {},
  pagination: PaginationParams = {}
): Promise<PaginatedInspections> {
  logger.debug('Listing inspections', { filters, pagination })
  
  try {
    const params = {
      filters: {
        ...filters,
        dateFrom: filters.dateFrom?.toISOString(),
        dateTo: filters.dateTo?.toISOString(),
      },
      pagination: {
        page: pagination.page ?? 1,
        limit: pagination.limit ?? 20,
        sortBy: pagination.sortBy ?? 'startedAt',
        sortOrder: pagination.sortOrder ?? 'desc',
      }
    }

    const result = await trpc.inspection.list.query(params)
    
    logger.debug('Inspections listed', { count: result.items.length, total: result.total })
    return result
  } catch (error) {
    logger.error('Failed to list inspections', error, { filters, pagination })
    
    if (error instanceof TRPCClientError) {
      throw error
    }
    
    throw new ServerError('Failed to fetch inspections list.')
  }
}

/**
 * Soft delete an inspection with audit log
 * 
 * @param id - Inspection ID to delete
 * @param deletedBy - User ID performing the deletion
 * @returns Success confirmation
 * @throws {InspectionNotFoundError} When inspection not found
 * @throws {TRPCClientError} On API error
 * 
 * @example
 * ```typescript
 * await deleteInspection('inspection-123', 'user-abc-456')
 * ```
 */
export async function deleteInspection(
  id: string, 
  deletedBy: string
): Promise<{ success: boolean; deletedAt: Date }> {
  logger.info('Soft deleting inspection', { inspectionId: id, deletedBy })
  
  try {
    if (!id) {
      throw new InspectionValidationError('Inspection ID is required')
    }
    
    if (!deletedBy) {
      throw new InspectionValidationError('deletedBy user ID is required')
    }

    const result = await trpc.inspection.delete.mutate({ id, deletedBy })
    
    logger.info('Inspection soft deleted successfully', { inspectionId: id })
    return result
  } catch (error) {
    logger.error('Failed to delete inspection', error, { inspectionId: id, deletedBy })
    
    if (error instanceof InspectionValidationError) {
      throw error
    }
    
    if (error instanceof TRPCClientError) {
      if (error.code === 'NOT_FOUND') {
        throw new InspectionNotFoundError(id)
      }
      throw error
    }
    
    throw new ServerError('Failed to delete inspection.')
  }
}

/**
 * Submit a completed inspection for final review
 * Generates certificate ID and triggers customer notification
 * 
 * @param id - Inspection ID
 * @returns Updated inspection with certificateId
 * @throws {InspectionNotFoundError} When inspection not found
 * @throws {InspectionSubmissionError} When inspection cannot be submitted
 * @throws {TRPCClientError} On API error
 * 
 * @example
 * ```typescript
 * const submitted = await submitInspection('inspection-123')
 * console.log(submitted.certificateId) // "CERT-2024-XXXXX"
 * ```
 */
export async function submitInspection(id: string): Promise<Inspection> {
  logger.info('Submitting inspection', { inspectionId: id })
  
  try {
    if (!id) {
      throw new InspectionValidationError('Inspection ID is required')
    }

    // Fetch current inspection to validate state
    const currentInspection = await getInspectionById(id)
    
    // Validate inspection can be submitted
    if (currentInspection.status === 'APPROVED') {
      throw new InspectionSubmissionError(
        'Inspection has already been approved',
        'ALREADY_APPROVED'
      )
    }
    
    if (currentInspection.status === 'DECLINED') {
      throw new InspectionSubmissionError(
        'Inspection has been declined and cannot be submitted',
        'ALREADY_DECLINED'
      )
    }
    
    if (currentInspection.isDeleted) {
      throw new InspectionSubmissionError(
        'Cannot submit a deleted inspection',
        'INSPECTION_DELETED'
      )
    }

    const inspection = await trpc.inspection.submit.mutate({ id })
    
    logger.info('Inspection submitted successfully', { 
      inspectionId: id, 
      certificateId: inspection.certificateId 
    })
    
    return inspection
  } catch (error) {
    if (error instanceof InspectionValidationError || 
        error instanceof InspectionSubmissionError ||
        error instanceof InspectionNotFoundError) {
      throw error
    }
    
    logger.error('Failed to submit inspection', error, { inspectionId: id })
    
    if (error instanceof TRPCClientError) {
      throw error
    }
    
    throw new ServerError('Failed to submit inspection.')
  }
}

/**
 * Calculate overall inspection score (1-10) based on all sections
 * 
 * The scoring algorithm:
 * - Each category (mechanical, electrical, bodywork, tires, fluids, safety) is scored 1-10
 * - Category scores are weighted based on criticality
 * - Findings reduce scores based on severity
 * - Overall score is weighted average of category scores
 * 
 * @param inspection - Inspection data with findings and items
 * @returns Score breakdown with overall score
 * 
 * @example
 * ```typescript
 * const scores = calculateOverallScore(inspection)
 * console.log(scores.overall) // 8.5
 * console.log(scores.mechanical) // 7.2
 * ```
 */
export function calculateOverallScore(inspection: Inspection): InspectionScoreBreakdown {
  logger.debug('Calculating inspection score', { inspectionId: inspection.id })
  
  // Severity weights (higher = more negative impact on score)
  const severityWeights: Record<FindingSeverity, number> = {
    CRITICAL: 10,
    HIGH: 7,
    MEDIUM: 4,
    LOW: 1,
    OK: 0
  }
  
  // Category base scores and weights
  const categories = {
    mechanical: { base: 10, weight: 0.25 },
    electrical: { base: 10, weight: 0.20 },
    bodywork: { base: 10, weight: 0.15 },
    tires: { base: 10, weight: 0.15 },
    fluids: { base: 10, weight: 0.15 },
    safety: { base: 10, weight: 0.10 }
  }
  
  // Calculate deductions per category from findings
  const categoryDeductions: Record<string, number> = {
    mechanical: 0,
    electrical: 0,
    bodywork: 0,
    tires: 0,
    fluids: 0,
    safety: 0
  }
  
  // Process findings to calculate deductions
  for (const finding of inspection.findings) {
    const category = mapFindingCategoryToScoreCategory(finding.category)
    const deduction = severityWeights[finding.severity] * 0.3 // Scale down the impact
    categoryDeductions[category] = Math.min(
      categoryDeductions[category] + deduction,
      9 // Cap deduction to keep minimum score at 1
    )
  }
  
  // Process items status for additional scoring
  for (const item of inspection.items) {
    const category = mapTemplateCategoryToScoreCategory(item.templateItem.category)
    
    if (item.status === 'ISSUE_FOUND' && item.severity) {
      const deduction = severityWeights[item.severity] * 0.2
      categoryDeductions[category] = Math.min(
        categoryDeductions[category] + deduction,
        9
      )
    }
  }
  
  // Calculate final scores
  const mechanical = Math.max(1, categories.mechanical.base - categoryDeductions.mechanical)
  const electrical = Math.max(1, categories.electrical.base - categoryDeductions.electrical)
  const bodywork = Math.max(1, categories.bodywork.base - categoryDeductions.bodywork)
  const tires = Math.max(1, categories.tires.base - categoryDeductions.tires)
  const fluids = Math.max(1, categories.fluids.base - categoryDeductions.fluids)
  const safety = Math.max(1, categories.safety.base - categoryDeductions.safety)
  
  // Calculate weighted overall score
  const overall = Math.round(
    (mechanical * categories.mechanical.weight +
     electrical * categories.electrical.weight +
     bodywork * categories.bodywork.weight +
     tires * categories.tires.weight +
     fluids * categories.fluids.weight +
     safety * categories.safety.weight) * 10
  ) / 10
  
  const result: InspectionScoreBreakdown = {
    overall,
    mechanical: Math.round(mechanical * 10) / 10,
    electrical: Math.round(electrical * 10) / 10,
    bodywork: Math.round(bodywork * 10) / 10,
    tires: Math.round(tires * 10) / 10,
    fluids: Math.round(fluids * 10) / 10,
    safety: Math.round(safety * 10) / 10
  }
  
  logger.debug('Inspection score calculated', { 
    inspectionId: inspection.id, 
    scores: result 
  })
  
  return result
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Map finding category to score category
 */
function mapFindingCategoryToScoreCategory(category: string): string {
  const categoryMap: Record<string, string> = {
    'ENGINE': 'mechanical',
    'TRANSMISSION': 'mechanical',
    'BRAKES': 'safety',
    'TIRES': 'tires',
    'SUSPENSION': 'mechanical',
    'ELECTRICAL': 'electrical',
    'BODY': 'bodywork',
    'FLUIDS': 'fluids',
    'HVAC': 'mechanical',
    'SAFETY': 'safety'
  }
  
  return categoryMap[category.toUpperCase()] || 'mechanical'
}

/**
 * Map template category to score category
 */
function mapTemplateCategoryToScoreCategory(category: string): string {
  const categoryMap: Record<string, string> = {
    'ENGINE': 'mechanical',
    'TRANSMISSION': 'mechanical',
    'BRAKES': 'safety',
    'TIRES': 'tires',
    'SUSPENSION_STEERING': 'mechanical',
    'ELECTRICAL': 'electrical',
    'BODY_EXTERIOR': 'bodywork',
    'FLUIDS': 'fluids',
    'HVAC': 'mechanical',
    'SAFETY_SYSTEMS': 'safety',
    'INTERIOR': 'bodywork',
    'EXHAUST': 'mechanical'
  }
  
  return categoryMap[category.toUpperCase()] || 'mechanical'
}

/**
 * Generate a certificate ID for completed inspections
 */
export function generateCertificateId(): string {
  const year = new Date().getFullYear()
  const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0')
  return `CERT-${year}-${random}`
}

/**
 * Check if inspection can be edited
 */
export function canEditInspection(inspection: Inspection): boolean {
  return !inspection.isDeleted && 
    !['APPROVED', 'DECLINED', 'ARCHIVED'].includes(inspection.status)
}

/**
 * Check if inspection can be submitted
 */
export function canSubmitInspection(inspection: Inspection): boolean {
  return !inspection.isDeleted && 
    ['IN_PROGRESS', 'PENDING_REVIEW'].includes(inspection.status)
}

/**
 * Get inspection status label (Italian)
 */
export function getInspectionStatusLabel(status: InspectionStatus): string {
  const labels: Record<InspectionStatus, string> = {
    'IN_PROGRESS': 'In Corso',
    'PENDING_REVIEW': 'In Attesa di Revisione',
    'READY_FOR_CUSTOMER': 'Pronto per il Cliente',
    'CUSTOMER_REVIEWING': 'Cliente in Revisione',
    'APPROVED': 'Approvato',
    'DECLINED': 'Rifiutato',
    'ARCHIVED': 'Archiviato'
  }
  
  return labels[status] || status
}

/**
 * Get severity label (Italian)
 */
export function getSeverityLabel(severity: FindingSeverity): string {
  const labels: Record<FindingSeverity, string> = {
    'CRITICAL': 'Critico',
    'HIGH': 'Alto',
    'MEDIUM': 'Medio',
    'LOW': 'Basso',
    'OK': 'OK'
  }
  
  return labels[severity] || severity
}

// =============================================================================
// Additional Service Functions
// =============================================================================

/**
 * Add a finding to an inspection
 */
export async function addFinding(
  inspectionId: string, 
  data: CreateFindingInput
): Promise<InspectionFinding> {
  logger.info('Adding finding to inspection', { inspectionId, category: data.category })
  
  try {
    const finding = await trpc.inspection.addFinding.mutate({ inspectionId, data })
    logger.info('Finding added successfully', { findingId: finding.id })
    return finding
  } catch (error) {
    logger.error('Failed to add finding', error, { inspectionId, data })
    throw error
  }
}

/**
 * Upload a photo to an inspection
 */
export async function uploadInspectionPhoto(
  inspectionId: string,
  file: File,
  metadata: {
    category?: string
    description?: string
    itemId?: string
  }
): Promise<InspectionPhoto> {
  logger.info('Uploading inspection photo', { inspectionId, category: metadata.category })
  
  try {
    // Create FormData for file upload
    const formData = new FormData()
    formData.append('file', file)
    formData.append('inspectionId', inspectionId)
    if (metadata.category) formData.append('category', metadata.category)
    if (metadata.description) formData.append('description', metadata.description)
    if (metadata.itemId) formData.append('itemId', metadata.itemId)
    
    // Use direct API for file uploads (tRPC doesn't handle files well)
    const response = await fetch('/api/inspections/upload-photo', {
      method: 'POST',
      body: formData
    })
    
    if (!response.ok) {
      throw new ServerError('Failed to upload photo')
    }
    
    const photo = await response.json()
    logger.info('Photo uploaded successfully', { photoId: photo.id })
    return photo
  } catch (error) {
    logger.error('Failed to upload photo', error, { inspectionId })
    throw error
  }
}

/**
 * Submit customer approval for inspection findings
 */
export async function submitCustomerApproval(
  inspectionId: string,
  data: CustomerApprovalInput
): Promise<{ success: boolean }> {
  logger.info('Submitting customer approval', { inspectionId, email: data.email })
  
  try {
    const result = await trpc.inspection.customerApproval.mutate({ inspectionId, data })
    logger.info('Customer approval submitted', { inspectionId })
    return result
  } catch (error) {
    logger.error('Failed to submit customer approval', error, { inspectionId })
    throw error
  }
}

/**
 * Get inspection statistics for dashboard
 */
export async function getInspectionStats(
  dateFrom?: Date,
  dateTo?: Date
): Promise<{
  total: number
  byStatus: Record<InspectionStatus, number>
  averageScore: number
  criticalIssuesCount: number
}> {
  logger.debug('Fetching inspection stats', { dateFrom, dateTo })
  
  try {
    const stats = await trpc.inspection.stats.query({
      dateFrom: dateFrom?.toISOString(),
      dateTo: dateTo?.toISOString()
    })
    
    return stats
  } catch (error) {
    logger.error('Failed to fetch inspection stats', error)
    throw error
  }
}

// Export all types for consumers
export type {
  InspectionStatus,
  InspectionItemStatus,
  FindingSeverity,
  FindingStatus,
  FuelLevel
}
