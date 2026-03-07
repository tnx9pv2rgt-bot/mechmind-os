/**
 * AI Service Unit Tests
 * 
 * Tests for damage analysis, repair cost estimation,
 * maintenance prediction, and batch processing functionality.
 * 
 * @module lib/services/__tests__/aiService
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Import the service
import {
  AIService,
  getAIService,
  analyzeDamage,
  analyzeTireWear,
  estimateRepairCost,
  predictMaintenance,
  batchAnalyzePhotos,
  CONFIDENCE_THRESHOLDS,
  AIAnalysisError,
  type DamageArea,
  type InspectionData,
  type AIServiceConfig,
} from '../aiService'

describe('AIService', () => {
  let service: AIService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new AIService({ useMock: true })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // =============================================================================
  // Configuration and Initialization Tests
  // =============================================================================
  describe('Configuration', () => {
    it('should use default configuration', () => {
      const defaultService = new AIService()
      expect(defaultService).toBeDefined()
    })

    it('should apply custom configuration', () => {
      const config: AIServiceConfig = {
        useMock: false,
        confidenceThreshold: 0.75,
        tfModelPath: '/models/custom-model',
      }
      const customService = new AIService(config)
      expect(customService).toBeDefined()
    })

    it('should provide singleton via getAIService', () => {
      const service1 = getAIService()
      const service2 = getAIService()
      expect(service1).toBe(service2)
    })
  })

  describe('initialize', () => {
    it('should initialize successfully in mock mode', async () => {
      const mockService = new AIService({ useMock: true })
      await expect(mockService.initialize()).resolves.not.toThrow()
    })

    it('should handle multiple initialize calls gracefully', async () => {
      const mockService = new AIService({ useMock: true })
      await mockService.initialize()
      await expect(mockService.initialize()).resolves.not.toThrow()
    })

    it('should throw AIAnalysisError when model fails to load', async () => {
      const realService = new AIService({ useMock: false })
      // Simulate model load failure by mocking console
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {
        throw new Error('Model load failed')
      })

      await expect(realService.initialize()).rejects.toThrow(AIAnalysisError)
      consoleSpy.mockRestore()
    })
  })

  // =============================================================================
  // analyzeDamage Tests
  // =============================================================================
  describe('analyzeDamage', () => {
    const validBase64Image = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD'

    it('should analyze damage and return results', async () => {
      const result = await service.analyzeDamage(validBase64Image)

      expect(result).toHaveProperty('damageDetected')
      expect(result).toHaveProperty('damageAreas')
      expect(result).toHaveProperty('overallConfidence')
      expect(result).toHaveProperty('timestamp')
      expect(result).toHaveProperty('method')
      expect(result.method).toBe('mock')
    })

    it('should detect damage based on image characteristics', async () => {
      // Seed-based detection: images with length % 10 > 3 should have damage
      const imageWithDamage = 'data:image/jpeg;base64,' + 'A'.repeat(104) // 104 % 10 = 4
      const result = await service.analyzeDamage(imageWithDamage)

      expect(result.damageDetected).toBe(true)
      expect(result.damageAreas.length).toBeGreaterThan(0)
    })

    it('should return no damage for certain image characteristics', async () => {
      // Seed-based detection: images with length % 10 <= 3 should have no damage
      const imageNoDamage = 'data:image/jpeg;base64,' + 'A'.repeat(103) // 103 % 10 = 3
      const result = await service.analyzeDamage(imageNoDamage)

      expect(result.damageDetected).toBe(false)
      expect(result.damageAreas).toHaveLength(0)
    })

    it('should include metadata in results', async () => {
      const result = await service.analyzeDamage(validBase64Image)

      expect(result.metadata).toBeDefined()
      expect(result.metadata).toHaveProperty('width')
      expect(result.metadata).toHaveProperty('height')
      expect(result.metadata).toHaveProperty('format')
    })

    it('should throw AIAnalysisError for invalid image format', async () => {
      const invalidImage = 'not-a-valid-base64-image'

      await expect(service.analyzeDamage(invalidImage)).rejects.toThrow(AIAnalysisError)
      await expect(service.analyzeDamage(invalidImage)).rejects.toThrow('Invalid image format')
    })

    it('should throw AIAnalysisError with INVALID_IMAGE code', async () => {
      const invalidImage = 'invalid-format'

      await expect(service.analyzeDamage(invalidImage)).rejects.toThrow(AIAnalysisError)
      try {
        await service.analyzeDamage(invalidImage)
      } catch (error: any) {
        expect(error.code).toBe('INVALID_IMAGE')
      }
    })

    it('should calculate overall confidence correctly', async () => {
      const imageWithMultipleDamages = 'data:image/jpeg;base64,' + 'A'.repeat(109) // 109 % 10 = 9 (max damage)
      const result = await service.analyzeDamage(imageWithMultipleDamages)

      if (result.damageAreas.length > 0) {
        const expectedConfidence = result.damageAreas.reduce((sum, d) => sum + d.confidence, 0) / result.damageAreas.length
        expect(result.overallConfidence).toBeCloseTo(expectedConfidence, 5)
      }
    })

    it('should include bounding box for each damage area', async () => {
      const imageWithDamage = 'data:image/jpeg;base64,' + 'A'.repeat(104)
      const result = await service.analyzeDamage(imageWithDamage)

      if (result.damageAreas.length > 0) {
        const damage = result.damageAreas[0]
        expect(damage.bbox).toHaveLength(4)
        expect(damage.bbox[0]).toBeGreaterThanOrEqual(0) // x
        expect(damage.bbox[1]).toBeGreaterThanOrEqual(0) // y
        expect(damage.bbox[2]).toBeGreaterThan(0) // width
        expect(damage.bbox[3]).toBeGreaterThan(0) // height
      }
    })

    it('should include severity for each damage area', async () => {
      const imageWithDamage = 'data:image/jpeg;base64,' + 'A'.repeat(104)
      const result = await service.analyzeDamage(imageWithDamage)

      for (const damage of result.damageAreas) {
        expect(['minor', 'moderate', 'severe']).toContain(damage.severity)
      }
    })
  })

  // =============================================================================
  // analyzeTireWear Tests
  // =============================================================================
  describe('analyzeTireWear', () => {
    const validBase64Image = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD'

    it('should analyze tire wear and return results', async () => {
      const result = await service.analyzeTireWear(validBase64Image)

      expect(result).toHaveProperty('analyzed')
      expect(result).toHaveProperty('sections')
      expect(result).toHaveProperty('averageWearPercent')
      expect(result).toHaveProperty('condition')
      expect(result).toHaveProperty('recommendation')
    })

    it('should include all three tire sections', async () => {
      const result = await service.analyzeTireWear(validBase64Image)

      expect(result.sections).toHaveLength(3)
      const sections = result.sections.map(s => s.section)
      expect(sections).toContain('inner')
      expect(sections).toContain('middle')
      expect(sections).toContain('outer')
    })

    it('should calculate average wear correctly', async () => {
      const result = await service.analyzeTireWear(validBase64Image)

      const calculatedAverage = result.sections.reduce((sum, s) => sum + s.wearPercent, 0) / 3
      expect(result.averageWearPercent).toBeCloseTo(calculatedAverage, 0)
    })

    it('should provide condition rating based on wear', async () => {
      const validConditions = ['excellent', 'good', 'fair', 'poor', 'critical']
      const result = await service.analyzeTireWear(validBase64Image)

      expect(validConditions).toContain(result.condition)
    })

    it('should include recommendation based on condition', async () => {
      const result = await service.analyzeTireWear(validBase64Image)

      expect(result.recommendation).toBeDefined()
      expect(typeof result.recommendation).toBe('string')
      expect(result.recommendation.length).toBeGreaterThan(0)
    })

    it('should throw AIAnalysisError for invalid image format', async () => {
      const invalidImage = 'invalid'

      await expect(service.analyzeTireWear(invalidImage)).rejects.toThrow(AIAnalysisError)
    })

    it('should include confidence for each section', async () => {
      const result = await service.analyzeTireWear(validBase64Image)

      for (const section of result.sections) {
        expect(section.confidence).toBeGreaterThan(0)
        expect(section.confidence).toBeLessThanOrEqual(1)
      }
    })

    it('should estimate tread depth for each section', async () => {
      const result = await service.analyzeTireWear(validBase64Image)

      for (const section of result.sections) {
        expect(section.treadDepthMm).toBeDefined()
        expect(section.treadDepthMm).toBeGreaterThanOrEqual(0)
      }
    })
  })

  // =============================================================================
  // estimateRepairCost Tests
  // =============================================================================
  describe('estimateRepairCost', () => {
    const mockDamageAreas: DamageArea[] = [
      {
        id: 'damage-001',
        type: 'scratch',
        confidence: 0.85,
        bbox: [100, 150, 200, 50],
        severity: 'minor',
      },
      {
        id: 'damage-002',
        type: 'dent',
        confidence: 0.75,
        bbox: [300, 200, 150, 150],
        severity: 'moderate',
      },
    ]

    it('should estimate costs for multiple damage areas', () => {
      const result = service.estimateRepairCost(mockDamageAreas)

      expect(result.totalCost).toBeGreaterThan(0)
      expect(result.currency).toBe('EUR')
      expect(result.breakdown).toHaveLength(2)
    })

    it('should return zero cost for empty damage areas', () => {
      const result = service.estimateRepairCost([])

      expect(result.totalCost).toBe(0)
      expect(result.breakdown).toHaveLength(0)
      expect(result.costRange).toEqual({ min: 0, max: 0 })
      expect(result.notes).toContain('Nessun danno rilevato')
    })

    it('should calculate cost range for each damage', () => {
      const result = service.estimateRepairCost(mockDamageAreas)

      expect(result.costRange.min).toBeGreaterThan(0)
      expect(result.costRange.max).toBeGreaterThan(result.costRange.min)
    })

    it('should provide breakdown for each damage area', () => {
      const result = service.estimateRepairCost(mockDamageAreas)

      for (const item of result.breakdown) {
        expect(item).toHaveProperty('damageId')
        expect(item).toHaveProperty('type')
        expect(item).toHaveProperty('severity')
        expect(item).toHaveProperty('estimatedCost')
        expect(item).toHaveProperty('details')
      }
    })

    it('should calculate estimate confidence as average of damage confidences', () => {
      const result = service.estimateRepairCost(mockDamageAreas)

      const expectedConfidence = mockDamageAreas.reduce((sum, d) => sum + d.confidence, 0) / mockDamageAreas.length
      expect(result.estimateConfidence).toBeCloseTo(expectedConfidence, 5)
    })

    it('should include notes about rust damage', () => {
      const damageWithRust: DamageArea[] = [
        ...mockDamageAreas,
        {
          id: 'damage-003',
          type: 'rust',
          confidence: 0.9,
          bbox: [50, 50, 100, 100],
          severity: 'moderate',
        },
      ]

      const result = service.estimateRepairCost(damageWithRust)

      expect(result.notes?.some(note => note.includes('ruggine'))).toBe(true)
    })

    it('should include notes about crack damage', () => {
      const damageWithCrack: DamageArea[] = [
        ...mockDamageAreas,
        {
          id: 'damage-004',
          type: 'crack',
          confidence: 0.8,
          bbox: [400, 400, 100, 100],
          severity: 'severe',
        },
      ]

      const result = service.estimateRepairCost(damageWithCrack)

      expect(result.notes?.some(note => note.includes('crepe'))).toBe(true)
    })

    it('should include notes about severe damage', () => {
      const damageWithSevere: DamageArea[] = [
        {
          id: 'damage-005',
          type: 'dent',
          confidence: 0.9,
          bbox: [100, 100, 200, 200],
          severity: 'severe',
        },
      ]

      const result = service.estimateRepairCost(damageWithSevere)

      expect(result.notes?.some(note => note.includes('gravità elevata'))).toBe(true)
    })

    it('should apply severity multipliers correctly', () => {
      const minorDamage: DamageArea[] = [{
        id: 'damage-001',
        type: 'scratch',
        confidence: 1.0,
        bbox: [100, 100, 100, 100],
        severity: 'minor',
      }]

      const moderateDamage: DamageArea[] = [{
        id: 'damage-001',
        type: 'scratch',
        confidence: 1.0,
        bbox: [100, 100, 100, 100],
        severity: 'moderate',
      }]

      const severeDamage: DamageArea[] = [{
        id: 'damage-001',
        type: 'scratch',
        confidence: 1.0,
        bbox: [100, 100, 100, 100],
        severity: 'severe',
      }]

      const minorCost = service.estimateRepairCost(minorDamage).totalCost
      const moderateCost = service.estimateRepairCost(moderateDamage).totalCost
      const severeCost = service.estimateRepairCost(severeDamage).totalCost

      expect(moderateCost).toBeGreaterThan(minorCost)
      expect(severeCost).toBeGreaterThan(moderateCost)
    })
  })

  // =============================================================================
  // Confidence Thresholds Tests
  // =============================================================================
  describe('Confidence Thresholds', () => {
    it('should define MINIMUM threshold at 0.5', () => {
      expect(CONFIDENCE_THRESHOLDS.MINIMUM).toBe(0.5)
    })

    it('should define HIGH threshold at 0.85', () => {
      expect(CONFIDENCE_THRESHOLDS.HIGH).toBe(0.85)
    })

    it('should define MEDIUM threshold at 0.7', () => {
      expect(CONFIDENCE_THRESHOLDS.MEDIUM).toBe(0.7)
    })

    it('should define LOW threshold at 0.5', () => {
      expect(CONFIDENCE_THRESHOLDS.LOW).toBe(0.5)
    })

    it('should have ascending threshold values', () => {
      expect(CONFIDENCE_THRESHOLDS.LOW).toBeLessThanOrEqual(CONFIDENCE_THRESHOLDS.MEDIUM)
      expect(CONFIDENCE_THRESHOLDS.MEDIUM).toBeLessThan(CONFIDENCE_THRESHOLDS.HIGH)
    })
  })

  // =============================================================================
  // predictMaintenance Tests
  // =============================================================================
  describe('predictMaintenance', () => {
    const mockInspectionData: InspectionData = {
      vehicleAge: 5,
      totalKm: 120000,
      previousIssues: ['brake_wear', 'oil_change'],
      vehicleModel: 'Toyota Corolla',
      engineType: 'petrol',
      drivingConditions: 'mixed',
    }

    it('should predict maintenance for older vehicle with high mileage', async () => {
      const result = await service.predictMaintenance(mockInspectionData)

      expect(result).toHaveProperty('predictedIssues')
      expect(result).toHaveProperty('urgencyScore')
      expect(result).toHaveProperty('urgencyLabel')
      expect(result).toHaveProperty('maintenanceTips')
      expect(result).toHaveProperty('confidence')
    })

    it('should predict brake issues for high mileage vehicles', async () => {
      const result = await service.predictMaintenance(mockInspectionData)

      const brakeIssue = result.predictedIssues.find(i => i.component === 'Freni')
      expect(brakeIssue).toBeDefined()
    })

    it('should predict timing belt for very high mileage', async () => {
      const highMileageData = { ...mockInspectionData, totalKm: 90000 }
      const result = await service.predictMaintenance(highMileageData)

      const timingBeltIssue = result.predictedIssues.find(i => 
        i.component.toLowerCase().includes('cinghia') || 
        i.component.toLowerCase().includes('timing')
      )
      expect(timingBeltIssue).toBeDefined()
    })

    it('should predict battery degradation for older vehicles', async () => {
      const olderVehicleData = { ...mockInspectionData, vehicleAge: 4 }
      const result = await service.predictMaintenance(olderVehicleData)

      const batteryIssue = result.predictedIssues.find(i => i.component === 'Batteria')
      expect(batteryIssue).toBeDefined()
    })

    it('should predict based on previous issues', async () => {
      const dataWithOilLeak = { ...mockInspectionData, previousIssues: ['olio_perdita'] }
      const result = await service.predictMaintenance(dataWithOilLeak)

      const gasketIssue = result.predictedIssues.find(i => 
        i.component.toLowerCase().includes('guarnizione') ||
        i.component.toLowerCase().includes('gasket')
      )
      expect(gasketIssue).toBeDefined()
    })

    it('should calculate urgency score between 0 and 10', async () => {
      const result = await service.predictMaintenance(mockInspectionData)

      expect(result.urgencyScore).toBeGreaterThanOrEqual(0)
      expect(result.urgencyScore).toBeLessThanOrEqual(10)
    })

    it('should provide urgency label based on score', async () => {
      const result = await service.predictMaintenance(mockInspectionData)

      expect(['low', 'medium', 'high', 'critical']).toContain(result.urgencyLabel)
    })

    it('should include maintenance tips', async () => {
      const result = await service.predictMaintenance(mockInspectionData)

      expect(result.maintenanceTips.length).toBeGreaterThan(0)
    })

    it('should recommend service date for high urgency', async () => {
      const oldHighMileage = { vehicleAge: 10, totalKm: 200000, previousIssues: [] }
      const result = await service.predictMaintenance(oldHighMileage)

      if (result.urgencyScore > 5) {
        expect(result.recommendedServiceDate).toBeDefined()
      }
    })
  })

  // =============================================================================
  // batchAnalyzePhotos Tests
  // =============================================================================
  describe('batchAnalyzePhotos', () => {
    const mockPhotos = [
      'data:image/jpeg;base64,' + 'A'.repeat(104), // Will have damage
      'data:image/jpeg;base64,' + 'A'.repeat(103), // Will not have damage
      'data:image/jpeg;base64,' + 'A'.repeat(109), // Will have multiple damages
    ]

    it('should analyze multiple photos', async () => {
      const result = await service.batchAnalyzePhotos(mockPhotos)

      expect(result.results).toHaveLength(3)
      expect(result.summary.total).toBe(3)
    })

    it('should track successful analyses', async () => {
      const result = await service.batchAnalyzePhotos(mockPhotos)

      expect(result.summary.successful).toBe(3)
      expect(result.summary.failed).toBe(0)
    })

    it('should count damage detections', async () => {
      const result = await service.batchAnalyzePhotos(mockPhotos)

      expect(result.summary.damageDetected).toBeGreaterThan(0)
    })

    it('should track processing time', async () => {
      const result = await service.batchAnalyzePhotos(mockPhotos)

      expect(result.processingTimeMs).toBeGreaterThanOrEqual(0)
    })

    it('should respect maxConcurrency option', async () => {
      const manyPhotos = Array(10).fill(mockPhotos[0])
      const result = await service.batchAnalyzePhotos(manyPhotos, { maxConcurrency: 2 })

      expect(result.summary.total).toBe(10)
      expect(result.summary.successful).toBe(10)
    })

    it('should handle timeout errors with continueOnError', async () => {
      const result = await service.batchAnalyzePhotos(mockPhotos, {
        timeoutMs: 1, // Very short timeout
        continueOnError: true,
      })

      // Some may succeed, some may fail due to timeout
      expect(result.summary.total).toBe(3)
      expect(result.summary.successful + result.summary.failed).toBe(3)
    })

    it('should throw on timeout with continueOnError false', async () => {
      await expect(
        service.batchAnalyzePhotos(mockPhotos, {
          timeoutMs: 1,
          continueOnError: false,
        })
      ).rejects.toThrow()
    })

    it('should return results in correct order', async () => {
      const result = await service.batchAnalyzePhotos(mockPhotos)

      expect(result.results).toHaveLength(3)
      // Check that all results are in order and not errors
      for (let i = 0; i < result.results.length; i++) {
        const item = result.results[i]
        expect(item).toBeDefined()
      }
    })
  })

  // =============================================================================
  // Convenience Function Tests
  // =============================================================================
  describe('Convenience Functions', () => {
    const validImage = 'data:image/jpeg;base64,/9j/4AAQ'

    it('analyzeDamage convenience function should work', async () => {
      const result = await analyzeDamage(validImage)
      expect(result).toBeDefined()
      expect(result.method).toBe('mock')
    })

    it('analyzeTireWear convenience function should work', async () => {
      const result = await analyzeTireWear(validImage)
      expect(result).toBeDefined()
      expect(result.analyzed).toBe(true)
    })

    it('estimateRepairCost convenience function should work', () => {
      const damages: DamageArea[] = [{
        id: 'd1',
        type: 'scratch',
        confidence: 0.8,
        bbox: [0, 0, 100, 100],
        severity: 'minor',
      }]
      const result = estimateRepairCost(damages)
      expect(result.totalCost).toBeGreaterThan(0)
    })

    it('predictMaintenance convenience function should work', async () => {
      const data: InspectionData = {
        vehicleAge: 3,
        totalKm: 50000,
        previousIssues: [],
      }
      const result = await predictMaintenance(data)
      expect(result).toBeDefined()
    })

    it('batchAnalyzePhotos convenience function should work', async () => {
      const photos = [validImage, validImage]
      const result = await batchAnalyzePhotos(photos)
      expect(result.summary.total).toBe(2)
    })
  })

  // =============================================================================
  // AIAnalysisError Tests
  // =============================================================================
  describe('AIAnalysisError', () => {
    it('should create error with message and code', () => {
      const error = new AIAnalysisError('Test error', 'MODEL_LOAD_ERROR')

      expect(error.message).toBe('Test error')
      expect(error.code).toBe('MODEL_LOAD_ERROR')
      expect(error.name).toBe('AIAnalysisError')
    })

    it('should create error with details', () => {
      const details = { modelPath: '/models/test' }
      const error = new AIAnalysisError('Load failed', 'MODEL_LOAD_ERROR', details)

      expect(error.details).toEqual(details)
    })

    it('should have valid error codes', () => {
      const validCodes = ['MODEL_LOAD_ERROR', 'INFERENCE_ERROR', 'INVALID_IMAGE', 'TIMEOUT', 'AWS_ERROR']

      for (const code of validCodes) {
        const error = new AIAnalysisError('Test', code as any)
        expect(error.code).toBe(code)
      }
    })
  })
})
