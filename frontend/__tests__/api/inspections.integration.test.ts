/**
 * Integration Tests for Vehicle Inspection API
 * 
 * Tests the full inspection workflow:
 * 1. POST /api/inspections (create)
 * 2. PUT /api/inspections/[id]/sensory (add sensory)
 * 3. POST /api/inspections/[id]/warranty (add warranty)
 * 4. GET /api/inspections/[id] (verify all data)
 * 
 * @module __tests__/api/inspections.integration.test
 * @version 1.0.0
 */

import {
  server,
  createInspectionHandlers,
  generateMockInspection,
  generateMockSensoryInspection,
  generateMockWarranty,
  generateInspectionId,
  wait,
} from '../utils/test-utils'

// =============================================================================
// Test Database (Mock)
// =============================================================================

// In-memory storage simulating test database
const testDatabase = {
  inspections: new Map<string, ReturnType<typeof generateMockInspection>>(),
  sensoryInspections: new Map<string, ReturnType<typeof generateMockSensoryInspection>>(),
  warranties: new Map<string, ReturnType<typeof generateMockWarranty>>(),

  clear() {
    this.inspections.clear()
    this.sensoryInspections.clear()
    this.warranties.clear()
  },

  setupTestData() {
    this.clear()
    // Pre-populate with some test data
    const inspection = generateMockInspection()
    this.inspections.set(inspection.id, inspection)
    return inspection
  },
}

// =============================================================================
// Setup and Teardown
// =============================================================================

describe('Inspection API Integration Tests', () => {
  // Setup MSW handlers before all tests
  beforeAll(() => {
    server.use(...createInspectionHandlers(testDatabase))
  })

  // Clear test database before each test for isolation
  beforeEach(() => {
    testDatabase.clear()
  })

  describe('POST /api/inspections - Create Inspection', () => {
    it('should create a new inspection with valid data', async () => {
      const inspectionData = {
        templateId: 'tmpl_test_001',
        vehicleId: 'veh_test_001',
        customerId: 'cust_test_001',
        mechanicId: 'mech_test_001',
        mileage: 50000,
        fuelLevel: 'HALF',
        notes: 'Pre-purchase inspection',
      }

      const response = await fetch('/api/inspections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inspectionData),
      })

      expect(response.status).toBe(201)
      const result = await response.json()
      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      expect(result.data.id).toBeDefined()
      expect(result.data.templateId).toBe(inspectionData.templateId)
      expect(result.data.vehicleId).toBe(inspectionData.vehicleId)
      expect(result.data.customerId).toBe(inspectionData.customerId)
      expect(result.data.mechanicId).toBe(inspectionData.mechanicId)
      expect(result.data.mileage).toBe(inspectionData.mileage)
      expect(result.data.fuelLevel).toBe(inspectionData.fuelLevel)
      expect(result.data.status).toBe('IN_PROGRESS')

      // Verify it was stored in the database
      expect(testDatabase.inspections.has(result.data.id)).toBe(true)
    })

    it('should return 400 when required fields are missing', async () => {
      const invalidData = {
        vehicleId: 'veh_test_001',
        // Missing templateId, customerId, mechanicId
      }

      const response = await fetch('/api/inspections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidData),
      })

      expect(response.status).toBe(400)
      const result = await response.json()
      expect(result.error).toBe('Missing required fields')
      expect(result.details).toContain('templateId')
      expect(result.details).toContain('customerId')
      expect(result.details).toContain('mechanicId')
    })

    it('should create inspection with minimal required fields', async () => {
      const minimalData = {
        templateId: 'tmpl_minimal',
        vehicleId: 'veh_minimal',
        customerId: 'cust_minimal',
        mechanicId: 'mech_minimal',
      }

      const response = await fetch('/api/inspections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(minimalData),
      })

      expect(response.status).toBe(201)
      const result = await response.json()
      expect(result.success).toBe(true)
      expect(result.data.id).toBeDefined()
    })
  })

  describe('PUT /api/inspections/[id]/sensory - Add Sensory Inspection', () => {
    it('should add sensory data to an existing inspection', async () => {
      // First create an inspection
      const inspection = generateMockInspection()
      testDatabase.inspections.set(inspection.id, inspection)

      const sensoryId = `sens_${generateInspectionId().slice(5)}`
      const sensoryData = {
        sensoryId,
        odors: {
          smokeDetected: false,
          smokeIntensity: 'NONE',
          petSmellDetected: false,
          moldDetected: true,
          moldLocations: ['CARPET_FRONT', 'AC_VENTS'],
          mustyDetected: true,
        },
        moisture: {
          interiorHumidity: 65,
          carpetMoisture: [{ location: 'front', percentage: 45 }],
          doorPanelMoisture: [{ location: 'driver', percentage: 38 }],
          measuredAt: new Date().toISOString(),
          ambientTemperature: 22,
        },
        ac: {
          acDrainTest: true,
          acBlockage: 'MINOR',
          filterCondition: 'FAIR',
        },
      }

      const response = await fetch(`/api/inspections/${inspection.id}/sensory`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sensoryData),
      })

      expect(response.status).toBe(200)
      const result = await response.json()
      expect(result.success).toBe(true)
      expect(result.data.sensoryId).toBe(sensoryId)
      expect(result.data.odors.moldDetected).toBe(true)
      expect(result.data.moisture.interiorHumidity).toBe(65)

      // Verify mold risk was calculated correctly
      // Humidity 65 + mold smell = HIGH risk
      expect(result.data.moldRiskLevel).toBe('HIGH')
    })

    it('should calculate LOW mold risk for optimal conditions', async () => {
      const inspection = generateMockInspection()
      testDatabase.inspections.set(inspection.id, inspection)

      const sensoryData = {
        sensoryId: `sens_${generateInspectionId().slice(5)}`,
        odors: {
          smokeDetected: false,
          smokeIntensity: 'NONE',
          petSmellDetected: false,
          moldDetected: false,
          moldLocations: [],
          mustyDetected: false,
        },
        moisture: {
          interiorHumidity: 45,
          carpetMoisture: [],
          doorPanelMoisture: [],
        },
        ac: {
          acDrainTest: true,
          acBlockage: 'NONE',
          filterCondition: 'GOOD',
        },
      }

      const response = await fetch(`/api/inspections/${inspection.id}/sensory`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sensoryData),
      })

      const result = await response.json()
      expect(result.data.moldRiskLevel).toBe('LOW')
    })

    it('should calculate MEDIUM mold risk for elevated humidity', async () => {
      const inspection = generateMockInspection()
      testDatabase.inspections.set(inspection.id, inspection)

      const sensoryData = {
        sensoryId: `sens_${generateInspectionId().slice(5)}`,
        odors: {
          smokeDetected: false,
          petSmellDetected: false,
          moldDetected: false,
          mustyDetected: false,
        },
        moisture: {
          interiorHumidity: 62,
          carpetMoisture: [],
          doorPanelMoisture: [],
        },
        ac: {
          acDrainTest: true,
          acBlockage: 'NONE',
          filterCondition: 'GOOD',
        },
      }

      const response = await fetch(`/api/inspections/${inspection.id}/sensory`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sensoryData),
      })

      const result = await response.json()
      expect(result.data.moldRiskLevel).toBe('MEDIUM')
    })

    it('should return 400 when sensoryId is missing', async () => {
      const inspection = generateMockInspection()
      testDatabase.inspections.set(inspection.id, inspection)

      const response = await fetch(`/api/inspections/${inspection.id}/sensory`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          moisture: { interiorHumidity: 50 },
        }),
      })

      expect(response.status).toBe(400)
      const result = await response.json()
      expect(result.error).toBe('Validation failed')
      expect(result.details).toContain('sensoryId')
    })

    it('should return 404 for non-existent inspection', async () => {
      const response = await fetch('/api/inspections/non-existent-id/sensory', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sensoryId: `sens_${generateInspectionId().slice(5)}`,
          moisture: { interiorHumidity: 50 },
        }),
      })

      expect(response.status).toBe(404)
      const result = await response.json()
      expect(result.error).toBe('Inspection not found')
    })
  })

  describe('POST /api/inspections/[id]/warranty - Add Warranty', () => {
    it('should create warranty for an inspection', async () => {
      const inspection = generateMockInspection()
      testDatabase.inspections.set(inspection.id, inspection)

      const warrantyData = {
        type: 'extended',
        startDate: new Date().toISOString(),
        expirationDate: new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000).toISOString(),
        maxCoverage: 5000,
        mileageLimit: 50000,
        alertDaysBeforeExpiry: 30,
        sendEmail: true,
        sendSMS: false,
        startMileage: 45000,
      }

      const response = await fetch(`/api/inspections/${inspection.id}/warranty`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(warrantyData),
      })

      expect(response.status).toBe(201)
      const result = await response.json()
      expect(result.success).toBe(true)
      expect(result.data.id).toBeDefined()
      expect(result.data.inspectionId).toBe(inspection.id)
      expect(result.data.type).toBe(warrantyData.type)
      expect(result.data.maxCoverage).toBe(warrantyData.maxCoverage)
      expect(result.data.mileageLimit).toBe(warrantyData.mileageLimit)
      expect(result.data.status).toBe('active')
    })

    it('should validate warranty type', async () => {
      const inspection = generateMockInspection()
      testDatabase.inspections.set(inspection.id, inspection)

      const response = await fetch(`/api/inspections/${inspection.id}/warranty`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'invalid_type',
          startDate: new Date().toISOString(),
          expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
          maxCoverage: 1000,
        }),
      })

      expect(response.status).toBe(400)
    })

    it('should validate expiration date is after start date', async () => {
      const inspection = generateMockInspection()
      testDatabase.inspections.set(inspection.id, inspection)

      const startDate = new Date()
      const expirationDate = new Date(startDate.getTime() - 24 * 60 * 60 * 1000) // Yesterday

      const response = await fetch(`/api/inspections/${inspection.id}/warranty`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'manufacturer',
          startDate: startDate.toISOString(),
          expirationDate: expirationDate.toISOString(),
          maxCoverage: 1000,
        }),
      })

      expect(response.status).toBe(400)
      const result = await response.json()
      expect(result.error).toBe('Validation failed')
      expect(result.details).toContain('Expiration date must be after start date')
    })

    it('should validate maxCoverage is not negative', async () => {
      const inspection = generateMockInspection()
      testDatabase.inspections.set(inspection.id, inspection)

      const response = await fetch(`/api/inspections/${inspection.id}/warranty`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'as_is',
          startDate: new Date().toISOString(),
          expirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          maxCoverage: -100,
        }),
      })

      expect(response.status).toBe(400)
      const result = await response.json()
      expect(result.error).toBe('Validation failed')
      expect(result.details).toContain('maxCoverage cannot be negative')
    })

    it('should return 400 when required fields are missing', async () => {
      const inspection = generateMockInspection()
      testDatabase.inspections.set(inspection.id, inspection)

      const response = await fetch(`/api/inspections/${inspection.id}/warranty`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'extended',
          // Missing startDate, expirationDate, maxCoverage
        }),
      })

      expect(response.status).toBe(400)
      const result = await response.json()
      expect(result.error).toBe('Validation failed')
    })
  })

  describe('GET /api/inspections/[id] - Get Inspection with All Data', () => {
    it('should retrieve inspection with all related data', async () => {
      // Create full inspection workflow
      const inspection = generateMockInspection()
      testDatabase.inspections.set(inspection.id, inspection)

      // Add sensory data
      const sensory = generateMockSensoryInspection({
        inspectionId: inspection.id,
        moldRiskLevel: 'MEDIUM',
      })
      testDatabase.sensoryInspections.set(sensory.id, sensory)

      // Add warranty
      const warranty = generateMockWarranty({
        inspectionId: inspection.id,
      })
      testDatabase.warranties.set(warranty.id, warranty)

      const response = await fetch(`/api/inspections/${inspection.id}`)

      expect(response.status).toBe(200)
      const result = await response.json()
      expect(result.success).toBe(true)
      expect(result.data.id).toBe(inspection.id)
      expect(result.data.vehicle).toBeDefined()
      expect(result.data.customer).toBeDefined()
      expect(result.data.mechanic).toBeDefined()
    })

    it('should return 404 for non-existent inspection', async () => {
      const response = await fetch('/api/inspections/non-existent-id')

      expect(response.status).toBe(404)
      const result = await response.json()
      expect(result.error).toBe('Inspection not found')
    })
  })

  describe('Full Inspection Workflow', () => {
    it('should complete full inspection workflow end-to-end', async () => {
      // Step 1: Create inspection
      const createResponse = await fetch('/api/inspections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: 'tmpl_workflow_001',
          vehicleId: 'veh_workflow_001',
          customerId: 'cust_workflow_001',
          mechanicId: 'mech_workflow_001',
          mileage: 75000,
          fuelLevel: 'THREE_QUARTERS',
          notes: 'Full workflow test',
        }),
      })

      expect(createResponse.status).toBe(201)
      const { data: createdInspection } = await createResponse.json()
      const inspectionId = createdInspection.id

      // Step 2: Add sensory inspection
      const sensoryResponse = await fetch(`/api/inspections/${inspectionId}/sensory`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sensoryId: `sens_${generateInspectionId().slice(5)}`,
          odors: {
            smokeDetected: true,
            smokeIntensity: 'MODERATE',
            petSmellDetected: false,
            moldDetected: false,
            mustyDetected: true,
          },
          moisture: {
            interiorHumidity: 68,
            carpetMoisture: [{ location: 'front', percentage: 55 }],
            doorPanelMoisture: [],
          },
          ac: {
            acDrainTest: true,
            acBlockage: 'MINOR',
            filterCondition: 'FAIR',
          },
        }),
      })

      expect(sensoryResponse.status).toBe(200)
      const { data: sensoryData } = await sensoryResponse.json()
      expect(sensoryData.moldRiskLevel).toBe('HIGH') // 68% + musty smell = HIGH

      // Step 3: Add warranty
      const warrantyResponse = await fetch(`/api/inspections/${inspectionId}/warranty`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'extended',
          startDate: new Date().toISOString(),
          expirationDate: new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000).toISOString(),
          maxCoverage: 8000,
          mileageLimit: 60000,
          alertDaysBeforeExpiry: 30,
          sendEmail: true,
          sendSMS: false,
          startMileage: 75000,
        }),
      })

      expect(warrantyResponse.status).toBe(201)
      const { data: warrantyData } = await warrantyResponse.json()
      expect(warrantyData.id).toBeDefined()
      expect(warrantyData.inspectionId).toBe(inspectionId)

      // Step 4: Verify complete inspection data
      const getResponse = await fetch(`/api/inspections/${inspectionId}`)

      expect(getResponse.status).toBe(200)
      const { data: finalInspection } = await getResponse.json()
      expect(finalInspection.id).toBe(inspectionId)
      expect(finalInspection.mileage).toBe(75000)
      expect(finalInspection.vehicle).toBeDefined()
      expect(finalInspection.customer).toBeDefined()

      // Verify all data is consistent
      expect(testDatabase.inspections.has(inspectionId)).toBe(true)
      expect(sensoryData.inspectionId).toBe(inspectionId)
      expect(warrantyData.inspectionId).toBe(inspectionId)
    })

    it('should handle concurrent updates correctly', async () => {
      // Create initial inspection
      const inspection = generateMockInspection()
      testDatabase.inspections.set(inspection.id, inspection)

      // Simulate concurrent sensory updates
      const updatePromises = [
        fetch(`/api/inspections/${inspection.id}/sensory`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sensoryId: `sens_${generateInspectionId().slice(5)}`,
            moisture: { interiorHumidity: 55 },
            odors: { smokeDetected: false, petSmellDetected: false, moldDetected: false, mustyDetected: false },
            ac: { acDrainTest: true, acBlockage: 'NONE', filterCondition: 'GOOD' },
          }),
        }),
        fetch(`/api/inspections/${inspection.id}/sensory`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sensoryId: `sens_${generateInspectionId().slice(5)}`,
            moisture: { interiorHumidity: 75 },
            odors: { smokeDetected: true, smokeIntensity: 'LIGHT', petSmellDetected: false, moldDetected: false, mustyDetected: true },
            ac: { acDrainTest: true, acBlockage: 'MODERATE', filterCondition: 'POOR' },
          }),
        }),
      ]

      const results = await Promise.all(updatePromises)

      // Both requests should succeed
      expect(results[0].status).toBe(200)
      expect(results[1].status).toBe(200)

      // Verify data was stored
      const getResponse = await fetch(`/api/inspections/${inspection.id}`)
      expect(getResponse.status).toBe(200)
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle invalid JSON in request body', async () => {
      const response = await fetch('/api/inspections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json {',
      })

      // Should return error (implementation specific)
      expect(response.status).toBeGreaterThanOrEqual(400)
    })

    it('should handle very long notes field', async () => {
      const inspection = generateMockInspection()
      testDatabase.inspections.set(inspection.id, inspection)

      const longNotes = 'A'.repeat(10000)

      const response = await fetch(`/api/inspections/${inspection.id}/sensory`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sensoryId: `sens_${generateInspectionId().slice(5)}`,
          notes: longNotes,
          moisture: { interiorHumidity: 50 },
          odors: { smokeDetected: false, petSmellDetected: false, moldDetected: false, mustyDetected: false },
          ac: { acDrainTest: true, acBlockage: 'NONE', filterCondition: 'GOOD' },
        }),
      })

      expect(response.status).toBe(200)
    })

    it('should handle special characters in notes', async () => {
      const inspection = generateMockInspection()
      testDatabase.inspections.set(inspection.id, inspection)

      const specialNotes = 'Special chars: <script>alert("xss")</script> "quotes" \n newline \t tab'

      const response = await fetch(`/api/inspections/${inspection.id}/sensory`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sensoryId: `sens_${generateInspectionId().slice(5)}`,
          notes: specialNotes,
          moisture: { interiorHumidity: 50 },
          odors: { smokeDetected: false, petSmellDetected: false, moldDetected: false, mustyDetected: false },
          ac: { acDrainTest: true, acBlockage: 'NONE', filterCondition: 'GOOD' },
        }),
      })

      expect(response.status).toBe(200)
    })

    it('should handle boundary humidity values', async () => {
      const inspection = generateMockInspection()
      testDatabase.inspections.set(inspection.id, inspection)

      // Test exactly 50% (LOW boundary)
      const response50 = await fetch(`/api/inspections/${inspection.id}/sensory`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sensoryId: `sens_${generateInspectionId().slice(5)}`,
          moisture: { interiorHumidity: 50 },
          odors: { smokeDetected: false, petSmellDetected: false, moldDetected: false, mustyDetected: false },
          ac: { acDrainTest: true, acBlockage: 'NONE', filterCondition: 'GOOD' },
        }),
      })

      const result50 = await response50.json()
      expect(result50.data.moldRiskLevel).toBe('LOW')

      // Test exactly 70% (HIGH boundary without mold)
      const response70 = await fetch(`/api/inspections/${inspection.id}/sensory`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sensoryId: `sens_${generateInspectionId().slice(5)}`,
          moisture: { interiorHumidity: 70 },
          odors: { smokeDetected: false, petSmellDetected: false, moldDetected: false, mustyDetected: false },
          ac: { acDrainTest: true, acBlockage: 'NONE', filterCondition: 'GOOD' },
        }),
      })

      const result70 = await response70.json()
      expect(result70.data.moldRiskLevel).toBe('MEDIUM')

      // Test > 70% (HIGH)
      const response71 = await fetch(`/api/inspections/${inspection.id}/sensory`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sensoryId: `sens_${generateInspectionId().slice(5)}`,
          moisture: { interiorHumidity: 71 },
          odors: { smokeDetected: false, petSmellDetected: false, moldDetected: false, mustyDetected: false },
          ac: { acDrainTest: true, acBlockage: 'NONE', filterCondition: 'GOOD' },
        }),
      })

      const result71 = await response71.json()
      expect(result71.data.moldRiskLevel).toBe('HIGH')
    })
  })
})
