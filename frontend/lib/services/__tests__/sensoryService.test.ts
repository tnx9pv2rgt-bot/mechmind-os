/**
 * Sensory Service Unit Tests
 * 
 * Tests for mold risk calculation algorithm, sensory inspection CRUD,
 * and validation functions.
 * 
 * @module lib/services/__tests__/sensoryService
 */

// Jest globals are available automatically
// Jest Mock type

// Mock the api-client
const mockApi = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  patch: jest.fn(),
  delete: jest.fn(),
}
jest.mock('@/lib/api-client', () => ({
  api: mockApi,
}))

// Import after mocking
import {
  calculateMoldRisk,
  createSensoryInspection,
  getSensoryInspection,
  updateSensoryInspection,
  validateMoistureReading,
  validateHumidity,
  requiresImmediateAction,
  getMoldRiskDescription,
  MoldRiskLevel,
  FilterCondition,
  BlockageSeverity,
  SmokeIntensity,
  type SensoryInspection,
  type CreateSensoryInspectionInput,
  type MoistureData,
  type OdorData,
  type ACData,
} from '../sensoryService'
import { api } from '@/lib/api-client'

describe('SensoryService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  // =============================================================================
  // calculateMoldRisk Algorithm Tests
  // =============================================================================
  describe('calculateMoldRisk', () => {
    // Helper to create sensory data
    const createSensoryData = (
      humidity: number,
      odors: Partial<OdorData> = {}
    ): { moisture: MoistureData; odors: OdorData } => ({
      moisture: {
        interiorHumidity: humidity,
        carpetMoisture: [],
        doorPanelMoisture: [],
      },
      odors: {
        smokeDetected: false,
        petSmellDetected: false,
        moldDetected: false,
        mustyDetected: false,
        ...odors,
      },
    })

    // Rule 1: Humidity > 70% = HIGH risk
    describe('HIGH risk conditions', () => {
      it('should return HIGH risk when humidity > 70%', () => {
        const data = createSensoryData(75)
        expect(calculateMoldRisk(data)).toBe(MoldRiskLevel.HIGH)
      })

      it('should return HIGH risk when humidity = 71%', () => {
        const data = createSensoryData(71)
        expect(calculateMoldRisk(data)).toBe(MoldRiskLevel.HIGH)
      })

      it('should return HIGH risk when humidity 60-70% with mold smell', () => {
        const data = createSensoryData(65, { moldDetected: true })
        expect(calculateMoldRisk(data)).toBe(MoldRiskLevel.HIGH)
      })

      it('should return HIGH risk when humidity 60-70% with musty smell', () => {
        const data = createSensoryData(65, { mustyDetected: true })
        expect(calculateMoldRisk(data)).toBe(MoldRiskLevel.HIGH)
      })

      it('should return HIGH risk at exactly 60% with mold smell', () => {
        const data = createSensoryData(60, { moldDetected: true })
        expect(calculateMoldRisk(data)).toBe(MoldRiskLevel.HIGH)
      })

      it('should return HIGH risk at exactly 70% with mold smell', () => {
        const data = createSensoryData(70, { moldDetected: true })
        expect(calculateMoldRisk(data)).toBe(MoldRiskLevel.HIGH)
      })
    })

    // Rule 2: Humidity 50-60% + mold smell = MEDIUM risk
    // Rule 3: Humidity 60-70% without mold smell = MEDIUM risk
    describe('MEDIUM risk conditions', () => {
      it('should return MEDIUM risk when humidity 50-60% with mold smell', () => {
        const data = createSensoryData(55, { moldDetected: true })
        expect(calculateMoldRisk(data)).toBe(MoldRiskLevel.MEDIUM)
      })

      it('should return MEDIUM risk when humidity 50-60% with musty smell', () => {
        const data = createSensoryData(55, { mustyDetected: true })
        expect(calculateMoldRisk(data)).toBe(MoldRiskLevel.MEDIUM)
      })

      it('should return MEDIUM risk at exactly 50% with mold smell', () => {
        const data = createSensoryData(50, { moldDetected: true })
        expect(calculateMoldRisk(data)).toBe(MoldRiskLevel.MEDIUM)
      })

      it('should return MEDIUM risk when humidity 60-70% without mold smell', () => {
        const data = createSensoryData(65)
        expect(calculateMoldRisk(data)).toBe(MoldRiskLevel.MEDIUM)
      })

      it('should return MEDIUM risk at exactly 60% without mold smell', () => {
        const data = createSensoryData(60)
        expect(calculateMoldRisk(data)).toBe(MoldRiskLevel.MEDIUM)
      })

      it('should return MEDIUM risk at exactly 70% without mold smell', () => {
        const data = createSensoryData(70)
        expect(calculateMoldRisk(data)).toBe(MoldRiskLevel.MEDIUM)
      })

      it('should return MEDIUM risk when humidity >=60% with pet smell', () => {
        const data = createSensoryData(62, { petSmellDetected: true })
        expect(calculateMoldRisk(data)).toBe(MoldRiskLevel.MEDIUM)
      })

      it('should return MEDIUM risk at exactly 60% with pet smell', () => {
        const data = createSensoryData(60, { petSmellDetected: true })
        expect(calculateMoldRisk(data)).toBe(MoldRiskLevel.MEDIUM)
      })
    })

    // Rule 4: LOW risk conditions
    describe('LOW risk conditions', () => {
      it('should return LOW risk when humidity < 50% without mold indicators', () => {
        const data = createSensoryData(45)
        expect(calculateMoldRisk(data)).toBe(MoldRiskLevel.LOW)
      })

      it('should return LOW risk at exactly 49%', () => {
        const data = createSensoryData(49)
        expect(calculateMoldRisk(data)).toBe(MoldRiskLevel.LOW)
      })

      it('should return LOW risk at 0% humidity', () => {
        const data = createSensoryData(0)
        expect(calculateMoldRisk(data)).toBe(MoldRiskLevel.LOW)
      })

      it('should return LOW risk with low humidity even with pet smell', () => {
        const data = createSensoryData(45, { petSmellDetected: true })
        expect(calculateMoldRisk(data)).toBe(MoldRiskLevel.LOW)
      })
    })

    // Edge cases
    describe('edge cases', () => {
      it('should handle humidity at exact boundary (50%)', () => {
        // At exactly 50% without mold smell - should be LOW (default case)
        const data = createSensoryData(50)
        expect(calculateMoldRisk(data)).toBe(MoldRiskLevel.LOW)
      })

      it('should handle humidity at exact boundary (60%) with both smells', () => {
        // 60% with moldDetected takes precedence (HIGH)
        const data = createSensoryData(60, { 
          moldDetected: true, 
          petSmellDetected: true 
        })
        expect(calculateMoldRisk(data)).toBe(MoldRiskLevel.HIGH)
      })

      it('should handle 100% humidity', () => {
        const data = createSensoryData(100)
        expect(calculateMoldRisk(data)).toBe(MoldRiskLevel.HIGH)
      })

      it('should treat mustyDetected same as moldDetected', () => {
        const dataMusty = createSensoryData(65, { mustyDetected: true })
        const dataMold = createSensoryData(65, { moldDetected: true })
        
        expect(calculateMoldRisk(dataMusty)).toBe(calculateMoldRisk(dataMold))
      })
    })
  })

  // =============================================================================
  // createSensoryInspection Tests
  // =============================================================================
  describe('createSensoryInspection', () => {
    const mockInput: CreateSensoryInspectionInput = {
      odors: {
        smokeDetected: false,
        petSmellDetected: true,
        moldDetected: false,
        mustyDetected: true,
      },
      moisture: {
        interiorHumidity: 65,
        carpetMoisture: [
          { location: 'front-driver', percentage: 45 },
          { location: 'front-passenger', percentage: 42 },
        ],
        doorPanelMoisture: [
          { location: 'driver-door', percentage: 38 },
        ],
      },
      ac: {
        acDrainTest: true,
        acBlockage: BlockageSeverity.NONE,
        filterCondition: FilterCondition.FAIR,
      },
      notes: 'Detected musty odor from AC vents',
    }

    const mockResponse = {
      id: 'sensory-001',
      inspectionId: 'insp-123',
      odors: mockInput.odors,
      moisture: {
        ...mockInput.moisture,
        measuredAt: '2024-01-15T10:00:00Z',
      },
      ac: mockInput.ac,
      moldRiskLevel: MoldRiskLevel.HIGH,
      notes: mockInput.notes,
      createdAt: '2024-01-15T10:00:00Z',
      updatedAt: '2024-01-15T10:00:00Z',
    }

    it('should create sensory inspection with calculated mold risk', async () => {
      mockApi.post.mockResolvedValue({ data: mockResponse })

      const result = await createSensoryInspection('insp-123', mockInput)

      expect(result).toBeDefined()
      expect(result.moldRiskLevel).toBe(MoldRiskLevel.HIGH)
    })

    it('should pass data with calculated risk to API', async () => {
      mockApi.post.mockResolvedValue({ data: mockResponse })

      await createSensoryInspection('insp-123', mockInput)

      expect(mockApi.post).toHaveBeenCalledWith(
        '/inspections/insp-123/sensory',
        expect.objectContaining({ moldRiskLevel: MoldRiskLevel.HIGH })
      )
    })

    it('should handle undefined measuredAt', async () => {
      const responseWithoutMeasuredAt = { ...mockResponse, moisture: { ...mockResponse.moisture, measuredAt: undefined } }
      mockApi.post.mockResolvedValue({ data: responseWithoutMeasuredAt })

      const result = await createSensoryInspection('insp-123', mockInput)

      expect(result.moisture.measuredAt).toBeUndefined()
    })
  })

  // =============================================================================
  // getSensoryInspection Tests
  // =============================================================================
  describe('getSensoryInspection', () => {
    const mockResponse = {
      id: 'sensory-001',
      inspectionId: 'insp-123',
      odors: {
        smokeDetected: false,
        petSmellDetected: false,
        moldDetected: true,
        mustyDetected: false,
      },
      moisture: {
        interiorHumidity: 72,
        carpetMoisture: [],
        doorPanelMoisture: [],
        measuredAt: '2024-01-15T10:00:00Z',
      },
      ac: {
        acDrainTest: false,
        acBlockage: BlockageSeverity.MODERATE,
        filterCondition: FilterCondition.POOR,
      },
      moldRiskLevel: MoldRiskLevel.HIGH,
      notes: 'High humidity detected',
      createdAt: '2024-01-15T10:00:00Z',
      updatedAt: '2024-01-15T10:00:00Z',
    }

    it('should retrieve sensory inspection successfully', async () => {
      mockApi.get.mockResolvedValue({ data: { data: mockResponse } })

      const result = await getSensoryInspection('insp-123')

      expect(result).toBeDefined()
      expect(result?.id).toBe('sensory-001')
      expect(result?.moldRiskLevel).toBe(MoldRiskLevel.HIGH)
    })

    it('should return null when inspection not found', async () => {
      mockApi.get.mockResolvedValue({ data: { data: null } })

      const result = await getSensoryInspection('non-existent')

      expect(result).toBeNull()
    })

    it('should return null on NOT_FOUND error', async () => {
      mockApi.get.mockRejectedValue(new Error('NOT_FOUND'))

      const result = await getSensoryInspection('insp-123')

      expect(result).toBeNull()
    })

    it('should return null on 404 error message', async () => {
      mockApi.get.mockRejectedValue(new Error('Request failed with status 404'))

      const result = await getSensoryInspection('insp-123')

      expect(result).toBeNull()
    })

    it('should throw other errors', async () => {
      mockApi.get.mockRejectedValue(new Error('Database error'))

      await expect(getSensoryInspection('insp-123')).rejects.toThrow('Database error')
    })
  })

  // =============================================================================
  // updateSensoryInspection Tests
  // =============================================================================
  describe('updateSensoryInspection', () => {
    const currentData = {
      odors: {
        smokeDetected: false,
        petSmellDetected: false,
        moldDetected: false,
        mustyDetected: false,
      },
      moisture: {
        interiorHumidity: 45,
        carpetMoisture: [],
        doorPanelMoisture: [],
      },
      ac: {
        acDrainTest: true,
        acBlockage: BlockageSeverity.NONE,
        filterCondition: FilterCondition.GOOD,
      },
    }

    const mockGetByIdResponse = {
      id: 'sensory-001',
      inspectionId: 'insp-123',
      ...currentData,
      moldRiskLevel: MoldRiskLevel.LOW,
      createdAt: '2024-01-15T10:00:00Z',
      updatedAt: '2024-01-15T10:00:00Z',
    }

    it('should update sensory inspection without recalculating risk if no moisture/odor change', async () => {
      mockApi.put.mockResolvedValue({
        data: {
          ...mockGetByIdResponse,
          notes: 'Updated notes',
        },
      })

      const result = await updateSensoryInspection('sensory-001', { notes: 'Updated notes' })

      expect(result.notes).toBe('Updated notes')
    })

    it('should recalculate mold risk when moisture changes', async () => {
      // updateSensoryInspection fetches current data via api.get, then calls api.put
      mockApi.get.mockResolvedValue({ data: { data: mockGetByIdResponse } })
      mockApi.put.mockImplementation((_url: string, data: Record<string, unknown>) => Promise.resolve({
        data: {
          ...mockGetByIdResponse,
          ...data,
          createdAt: '2024-01-15T10:00:00Z',
          updatedAt: '2024-01-15T11:00:00Z',
        },
      }))

      const result = await updateSensoryInspection('sensory-001', {
        moisture: { interiorHumidity: 75 },
      })

      expect(result.moldRiskLevel).toBe(MoldRiskLevel.HIGH)
    })

    it('should recalculate mold risk when odors change', async () => {
      mockApi.get.mockResolvedValue({ data: { data: mockGetByIdResponse } })
      mockApi.put.mockImplementation((_url: string, data: Record<string, unknown>) => Promise.resolve({
        data: {
          ...mockGetByIdResponse,
          ...data,
          createdAt: '2024-01-15T10:00:00Z',
          updatedAt: '2024-01-15T11:00:00Z',
        },
      }))

      const result = await updateSensoryInspection('sensory-001', {
        odors: { moldDetected: true },
      })

      // At 45% humidity with mold smell = should still be LOW (humidity < 50%)
      expect(result.moldRiskLevel).toBe(MoldRiskLevel.LOW)
    })
  })

  // =============================================================================
  // Validation Function Tests
  // =============================================================================
  describe('validateMoistureReading', () => {
    it('should return valid for normal moisture percentage', () => {
      const result = validateMoistureReading({ location: 'front-driver', percentage: 45 })
      expect(result.valid).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('should return valid for 0% moisture', () => {
      const result = validateMoistureReading({ location: 'front-driver', percentage: 0 })
      expect(result.valid).toBe(true)
    })

    it('should return valid for 100% moisture', () => {
      const result = validateMoistureReading({ location: 'front-driver', percentage: 100 })
      expect(result.valid).toBe(true)
    })

    it('should return invalid for negative moisture', () => {
      const result = validateMoistureReading({ location: 'front-driver', percentage: -5 })
      expect(result.valid).toBe(false)
      expect(result.error).toContain('-5')
    })

    it('should return invalid for moisture > 100%', () => {
      const result = validateMoistureReading({ location: 'front-driver', percentage: 105 })
      expect(result.valid).toBe(false)
      expect(result.error).toContain('105')
    })
  })

  describe('validateHumidity', () => {
    it('should return valid for normal humidity', () => {
      const result = validateHumidity(50)
      expect(result.valid).toBe(true)
    })

    it('should return valid for 0% humidity', () => {
      const result = validateHumidity(0)
      expect(result.valid).toBe(true)
    })

    it('should return valid for 100% humidity', () => {
      const result = validateHumidity(100)
      expect(result.valid).toBe(true)
    })

    it('should return invalid for negative humidity', () => {
      const result = validateHumidity(-10)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('-10')
    })

    it('should return invalid for humidity > 100%', () => {
      const result = validateHumidity(150)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('150')
    })
  })

  // =============================================================================
  // requiresImmediateAction Tests
  // =============================================================================
  describe('requiresImmediateAction', () => {
    const baseInspection: SensoryInspection = {
      id: 'sensory-001',
      inspectionId: 'insp-123',
      odors: {
        smokeDetected: false,
        petSmellDetected: false,
        moldDetected: false,
        mustyDetected: false,
      },
      moisture: {
        interiorHumidity: 45,
        carpetMoisture: [],
        doorPanelMoisture: [],
      },
      ac: {
        acDrainTest: true,
        acBlockage: BlockageSeverity.NONE,
        filterCondition: FilterCondition.GOOD,
      },
      moldRiskLevel: MoldRiskLevel.LOW,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    it('should return true for HIGH mold risk', () => {
      const inspection = { ...baseInspection, moldRiskLevel: MoldRiskLevel.HIGH }
      expect(requiresImmediateAction(inspection)).toBe(true)
    })

    it('should return true for severe AC blockage', () => {
      const inspection = {
        ...baseInspection,
        ac: { ...baseInspection.ac, acBlockage: BlockageSeverity.SEVERE },
      }
      expect(requiresImmediateAction(inspection)).toBe(true)
    })

    it('should return true for humidity > 80%', () => {
      const inspection = {
        ...baseInspection,
        moisture: { ...baseInspection.moisture, interiorHumidity: 85 },
      }
      expect(requiresImmediateAction(inspection)).toBe(true)
    })

    it('should return false for MEDIUM mold risk', () => {
      const inspection = { ...baseInspection, moldRiskLevel: MoldRiskLevel.MEDIUM }
      expect(requiresImmediateAction(inspection)).toBe(false)
    })

    it('should return false for moderate AC blockage', () => {
      const inspection = {
        ...baseInspection,
        ac: { ...baseInspection.ac, acBlockage: BlockageSeverity.MODERATE },
      }
      expect(requiresImmediateAction(inspection)).toBe(false)
    })

    it('should return false for humidity <= 80%', () => {
      const inspection = {
        ...baseInspection,
        moisture: { ...baseInspection.moisture, interiorHumidity: 80 },
      }
      expect(requiresImmediateAction(inspection)).toBe(false)
    })

    it('should return false for LOW risk with no issues', () => {
      expect(requiresImmediateAction(baseInspection)).toBe(false)
    })
  })

  // =============================================================================
  // getMoldRiskDescription Tests
  // =============================================================================
  describe('getMoldRiskDescription', () => {
    it('should return description for LOW risk', () => {
      const description = getMoldRiskDescription(MoldRiskLevel.LOW)
      expect(description).toContain('Low risk')
      expect(description).toContain('No immediate action')
    })

    it('should return description for MEDIUM risk', () => {
      const description = getMoldRiskDescription(MoldRiskLevel.MEDIUM)
      expect(description).toContain('Medium risk')
      expect(description).toContain('Monitor')
    })

    it('should return description for HIGH risk', () => {
      const description = getMoldRiskDescription(MoldRiskLevel.HIGH)
      expect(description).toContain('High risk')
      expect(description).toContain('Immediate attention')
    })
  })
})
