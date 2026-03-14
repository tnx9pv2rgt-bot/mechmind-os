/**
 * Sensory Inspection Service - MechMind OS Frontend
 * 
 * Service for managing sensory inspections (moisture + odors) in vehicle inspections.
 * Provides CRUD operations and mold risk assessment algorithms.
 * 
 * @module lib/services/sensoryService
 * @version 1.0.0
 */

import { api } from '@/lib/api-client'

// =============================================================================
// Enums and Constants
// =============================================================================

/**
 * Mold risk level classifications
 */
export enum MoldRiskLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

/**
 * AC filter condition states
 */
export enum FilterCondition {
  GOOD = 'GOOD',
  FAIR = 'FAIR',
  POOR = 'POOR',
  REPLACEMENT_NEEDED = 'REPLACEMENT_NEEDED',
}

/**
 * AC blockage severity levels
 */
export enum BlockageSeverity {
  NONE = 'NONE',
  MINOR = 'MINOR',
  MODERATE = 'MODERATE',
  SEVERE = 'SEVERE',
}

/**
 * Smoke intensity levels
 */
export enum SmokeIntensity {
  NONE = 'NONE',
  LIGHT = 'LIGHT',
  MODERATE = 'MODERATE',
  STRONG = 'STRONG',
  VERY_STRONG = 'VERY_STRONG',
}

// =============================================================================
// Type Definitions
// =============================================================================

/**
 * Odor detection data
 */
export interface OdorData {
  /** Whether smoke smell was detected */
  smokeDetected: boolean
  /** Intensity of smoke smell (if detected) */
  smokeIntensity?: SmokeIntensity
  /** Whether pet smell was detected */
  petSmellDetected: boolean
  /** Whether mold/mildew smell was detected */
  moldDetected: boolean
  /** Locations where mold smell was detected */
  moldLocations?: MoldLocation[]
  /** Whether general musty smell was detected */
  mustyDetected: boolean
}

/**
 * Vehicle locations where mold can be detected
 */
export type MoldLocation =
  | 'DRIVER_SEAT'
  | 'PASSENGER_SEAT'
  | 'REAR_SEATS'
  | 'TRUNK'
  | 'CARPET_FRONT'
  | 'CARPET_REAR'
  | 'HEADLINER'
  | 'DOOR_PANELS'
  | 'AC_VENTS'
  | 'GLOVE_BOX'
  | 'CENTER_CONSOLE'

/**
 * Moisture reading for a specific location
 */
export interface MoistureReading {
  /** Location identifier */
  location: string
  /** Moisture level as percentage (0-100) */
  percentage: number
  /** Timestamp of the reading */
  timestamp?: Date
  /** Additional notes about this reading */
  notes?: string
}

/**
 * Moisture detection data
 */
export interface MoistureData {
  /** Interior humidity level (0-100%) */
  interiorHumidity: number
  /** Carpet moisture readings by location */
  carpetMoisture: MoistureReading[]
  /** Door panel moisture readings by location */
  doorPanelMoisture: MoistureReading[]
  /** Timestamp when moisture was measured */
  measuredAt?: Date
  /** Ambient temperature during measurement (Celsius) */
  ambientTemperature?: number
}

/**
 * AC system inspection data
 */
export interface ACData {
  /** Result of AC drain test (pass/fail) */
  acDrainTest: boolean
  /** Whether AC drain blockage was detected */
  acBlockage: BlockageSeverity
  /** Condition of the cabin air filter */
  filterCondition: FilterCondition
  /** Notes about AC inspection findings */
  notes?: string
}

/**
 * Complete sensory inspection record
 */
export interface SensoryInspection {
  /** Unique identifier for the inspection record */
  id: string
  /** Reference to the parent vehicle inspection */
  inspectionId: string
  /** Odor detection data */
  odors: OdorData
  /** Moisture detection data */
  moisture: MoistureData
  /** AC system inspection data */
  ac: ACData
  /** Calculated mold risk level */
  moldRiskLevel: MoldRiskLevel
  /** Inspector notes */
  notes?: string
  /** Timestamp when record was created */
  createdAt: Date
  /** Timestamp when record was last updated */
  updatedAt: Date
  /** ID of the inspector who created the record */
  inspectorId?: string
}

/**
 * Input data for creating a new sensory inspection
 */
export interface CreateSensoryInspectionInput {
  /** Odor detection data */
  odors: OdorData
  /** Moisture detection data */
  moisture: MoistureData
  /** AC system inspection data */
  ac: ACData
  /** Inspector notes */
  notes?: string
}

/**
 * Input data for updating an existing sensory inspection
 */
export interface UpdateSensoryInspectionInput {
  /** Odor detection data (partial update) */
  odors?: Partial<OdorData>
  /** Moisture detection data (partial update) */
  moisture?: Partial<MoistureData>
  /** AC system inspection data (partial update) */
  ac?: Partial<ACData>
  /** Mold risk level (if manually overridden) */
  moldRiskLevel?: MoldRiskLevel
  /** Inspector notes */
  notes?: string
}

// =============================================================================
// Mold Risk Calculation Algorithm
// =============================================================================

/**
 * Calculates mold risk level based on sensory data
 * 
 * Algorithm rules:
 * - Humidity > 70% = HIGH risk
 * - Humidity 60-70% + any mold smell = HIGH risk
 * - Humidity 50-60% + mold smell = MEDIUM risk
 * - Humidity < 50% + no mold smell = LOW risk
 * - Any mold smell detected increases risk by one level
 * - Musty smell counts as potential mold indicator
 * 
 * @param sensoryData - The sensory inspection data to analyze
 * @returns Calculated MoldRiskLevel
 * 
 * @example
 * ```typescript
 * const risk = calculateMoldRisk({
 *   moisture: { interiorHumidity: 75, carpetMoisture: [], doorPanelMoisture: [] },
 *   odors: { smokeDetected: false, petSmellDetected: false, moldDetected: false, mustyDetected: false }
 * })
 * // Returns: MoldRiskLevel.HIGH
 * ```
 */
export function calculateMoldRisk(
  sensoryData: Pick<SensoryInspection, 'moisture' | 'odors'>
): MoldRiskLevel {
  const { moisture, odors } = sensoryData
  const humidity = moisture.interiorHumidity

  // Check for any mold-related indicators
  const hasMoldSmell = odors.moldDetected || odors.mustyDetected
  const hasPetSmell = odors.petSmellDetected

  // Rule 1: Humidity > 70% = HIGH risk regardless of other factors
  if (humidity > 70) {
    return MoldRiskLevel.HIGH
  }

  // Rule 2: Humidity 60-70% + mold smell = HIGH risk
  if (humidity >= 60 && humidity <= 70 && hasMoldSmell) {
    return MoldRiskLevel.HIGH
  }

  // Rule 3: Humidity 50-60% + mold smell = MEDIUM risk
  if (humidity >= 50 && humidity < 60 && hasMoldSmell) {
    return MoldRiskLevel.MEDIUM
  }

  // Rule 4: Humidity 60-70% without mold smell = MEDIUM risk (elevated humidity)
  if (humidity >= 60 && humidity <= 70 && !hasMoldSmell) {
    return MoldRiskLevel.MEDIUM
  }

  // Rule 5: Pet smell with humidity > 60% increases to MEDIUM
  if (humidity >= 60 && hasPetSmell) {
    return MoldRiskLevel.MEDIUM
  }

  // Default: LOW risk for humidity < 50% without mold indicators
  return MoldRiskLevel.LOW
}

// =============================================================================
// Service Functions
// =============================================================================

/**
 * Creates a new sensory inspection record
 * 
 * Automatically calculates mold risk level based on the provided data.
 * 
 * @param inspectionId - The parent vehicle inspection ID
 * @param data - The sensory inspection data
 * @returns The created sensory inspection record with calculated risk level
 * @throws TRPCClientError on API errors
 * 
 * @example
 * ```typescript
 * const inspection = await createSensoryInspection('insp-123', {
 *   odors: {
 *     smokeDetected: false,
 *     petSmellDetected: true,
 *     moldDetected: false,
 *     mustyDetected: true
 *   },
 *   moisture: {
 *     interiorHumidity: 65,
 *     carpetMoisture: [
 *       { location: 'front-driver', percentage: 45 },
 *       { location: 'front-passenger', percentage: 42 }
 *     ],
 *     doorPanelMoisture: [
 *       { location: 'driver-door', percentage: 38 }
 *     ]
 *   },
 *   ac: {
 *     acDrainTest: true,
 *     acBlockage: BlockageSeverity.NONE,
 *     filterCondition: FilterCondition.FAIR
 *   },
 *   notes: 'Detected musty odor from AC vents'
 * })
 * ```
 */
export async function createSensoryInspection(
  inspectionId: string,
  data: CreateSensoryInspectionInput
): Promise<SensoryInspection> {
  // Calculate mold risk before sending to API
  const moldRiskLevel = calculateMoldRisk({
    moisture: data.moisture,
    odors: data.odors,
  })

  const res = await api.post<SensoryInspection>(`/inspections/${inspectionId}/sensory`, {
    ...data,
    moldRiskLevel,
  })
  const result = res.data

  return result
}

/**
 * Retrieves a sensory inspection record by inspection ID
 * 
 * @param inspectionId - The parent vehicle inspection ID
 * @returns The sensory inspection record or null if not found
 * @throws TRPCClientError on API errors
 * 
 * @example
 * ```typescript
 * const inspection = await getSensoryInspection('insp-123')
 * if (inspection) {
 *   console.log(`Mold risk level: ${inspection.moldRiskLevel}`)
 * }
 * ```
 */
export async function getSensoryInspection(
  inspectionId: string
): Promise<SensoryInspection | null> {
  try {
    const res = await api.get<{ data: SensoryInspection | null }>(`/inspections/${inspectionId}/sensory`)
    const result = res.data?.data ?? null

    return result ?? null
  } catch (error) {
    // Handle case where record doesn't exist
    if (
      error instanceof Error &&
      (error.message.includes('NOT_FOUND') || error.message.includes('404'))
    ) {
      return null
    }
    throw error
  }
}

/**
 * Updates an existing sensory inspection record
 * 
 * Recalculates mold risk level if moisture or odor data is changed.
 * 
 * @param id - The sensory inspection record ID
 * @param data - The partial update data
 * @returns The updated sensory inspection record
 * @throws TRPCClientError on API errors
 * 
 * @example
 * ```typescript
 * const updated = await updateSensoryInspection('sensory-456', {
 *   moisture: {
 *     interiorHumidity: 72  // Will trigger HIGH risk recalculation
 *   },
 *   notes: 'Humidity increased after AC test'
 * })
 * ```
 */
export async function updateSensoryInspection(
  id: string,
  data: UpdateSensoryInspectionInput
): Promise<SensoryInspection> {
  // Recalculate mold risk if relevant data changed
  let updatedRiskLevel = data.moldRiskLevel

  if (data.moisture || data.odors) {
    // Fetch current data to merge with updates
    const currentRes = await api.get<{ data: SensoryInspection }>(`/inspections/sensory/${id}`)
    const current = currentRes.data.data

    const mergedMoisture = {
      ...current.moisture,
      ...data.moisture,
    }
    const mergedOdors = {
      ...current.odors,
      ...data.odors,
    }

    updatedRiskLevel = calculateMoldRisk({
      moisture: mergedMoisture,
      odors: mergedOdors,
    })
  }

  const res = await api.put<SensoryInspection>(`/inspections/sensory/${id}`, {
    ...data,
    moldRiskLevel: updatedRiskLevel,
  })
  const result = res.data

  return result
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Gets a human-readable description of the mold risk level
 * 
 * @param level - The mold risk level
 * @returns Localized description string
 */
export function getMoldRiskDescription(level: MoldRiskLevel): string {
  const descriptions: Record<MoldRiskLevel, string> = {
    [MoldRiskLevel.LOW]: 'Low risk - No immediate action required',
    [MoldRiskLevel.MEDIUM]:
      'Medium risk - Monitor conditions and consider preventive measures',
    [MoldRiskLevel.HIGH]:
      'High risk - Immediate attention recommended. Potential mold growth conditions present',
  }
  return descriptions[level]
}

/**
 * Validates moisture readings are within acceptable ranges
 * 
 * @param reading - The moisture reading to validate
 * @returns Validation result with optional error message
 */
export function validateMoistureReading(
  reading: MoistureReading
): { valid: boolean; error?: string } {
  if (reading.percentage < 0 || reading.percentage > 100) {
    return {
      valid: false,
      error: `Moisture percentage must be between 0 and 100, got ${reading.percentage}`,
    }
  }
  return { valid: true }
}

/**
 * Validates humidity value is within acceptable range
 * 
 * @param humidity - The humidity percentage to validate
 * @returns Validation result with optional error message
 */
export function validateHumidity(humidity: number): {
  valid: boolean
  error?: string
} {
  if (humidity < 0 || humidity > 100) {
    return {
      valid: false,
      error: `Humidity must be between 0% and 100%, got ${humidity}%`,
    }
  }
  return { valid: true }
}

/**
 * Checks if immediate action is required based on sensory data
 * 
 * @param inspection - The sensory inspection record
 * @returns True if immediate action is recommended
 */
export function requiresImmediateAction(inspection: SensoryInspection): boolean {
  // HIGH mold risk always requires immediate action
  if (inspection.moldRiskLevel === MoldRiskLevel.HIGH) {
    return true
  }

  // Check for severe AC blockage
  if (inspection.ac.acBlockage === BlockageSeverity.SEVERE) {
    return true
  }

  // Check for very high humidity (> 80%)
  if (inspection.moisture.interiorHumidity > 80) {
    return true
  }

  return false
}

// =============================================================================
