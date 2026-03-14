/**
 * Test Utilities for MechMind OS Integration Tests
 * 
 * Provides helper functions, mocks, and setup for Jest + React Testing Library + MSW
 * 
 * @module __tests__/utils/test-utils
 * @version 1.0.0
 */

// Polyfill Request/Response/Headers for jsdom test environments (Node 18+ has them natively)
if (typeof globalThis.Request === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { Request: NR, Response: NRes, Headers: NH } = require('node:http') as Record<string, unknown>
  // Fallback: minimal polyfill if node:http doesn't export them
  if (!NR) {
    // Use a minimal shim that the mock fetch handler can work with
    (globalThis as Record<string, unknown>).Request = class Request {
      url: string; method: string; headers: Record<string, string>; body: string | null
      constructor(url: string, init?: RequestInit) {
        this.url = url; this.method = init?.method || 'GET'
        this.headers = {}; this.body = init?.body as string || null
        if (init?.headers) {
          const h = init.headers as Record<string, string>
          for (const [k, v] of Object.entries(h)) { this.headers[k] = v }
        }
      }
      async json() {
        try { return JSON.parse(this.body || '{}') }
        catch { return {} }
      }
      async text() { return this.body || '' }
    } as unknown as typeof globalThis.Request
  }
}
if (typeof globalThis.Response === 'undefined') {
  (globalThis as Record<string, unknown>).Response = class Response {
    _body: string; status: number; headers: Map<string, string>; ok: boolean
    constructor(body?: string | null, init?: { status?: number; headers?: Record<string, string> }) {
      this._body = body || ''; this.status = init?.status || 200
      this.ok = this.status >= 200 && this.status < 300
      this.headers = new Map(Object.entries(init?.headers || {}))
    }
    async json() { return JSON.parse(this._body) }
    async text() { return this._body }
  } as unknown as typeof globalThis.Response
}
if (typeof globalThis.Headers === 'undefined') {
  (globalThis as Record<string, unknown>).Headers = Map as unknown as typeof globalThis.Headers
}

import { render, RenderOptions } from '@testing-library/react'
import { ReactElement, ReactNode } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

// =============================================================================
// MSW Server Setup (Conditional)
// =============================================================================

// Try to import MSW, but provide fallbacks if not installed
type HandlerEntry = {
  method: string
  pattern: string
  handler: (ctx: { params: Record<string, string>; request: Request }) => Response | Promise<Response>
}

let registeredHandlers: HandlerEntry[] = []
let originalFetch: typeof global.fetch | null = null
let mswAvailable = false

let server: { listen: (options: unknown) => void; resetHandlers: () => void; close: () => void; use: (...handlers: unknown[]) => void }
let http: { post: (path: string, handler: (ctx: { params: Record<string, string>; request: Request }) => Response | Promise<Response>) => HandlerEntry; get: (path: string, handler: (ctx: { params: Record<string, string>; request: Request }) => Response | Promise<Response>) => HandlerEntry; put: (path: string, handler: (ctx: { params: Record<string, string>; request: Request }) => Response | Promise<Response>) => HandlerEntry; delete: (path: string, handler: (ctx: { params: Record<string, string>; request: Request }) => Response | Promise<Response>) => HandlerEntry }
let HttpResponse: { json: (body: unknown, init?: { status?: number }) => Response }

function matchRoute(pattern: string, path: string): Record<string, string> | null {
  const patternParts = pattern.split('/')
  const pathParts = path.split('/')
  if (patternParts.length !== pathParts.length) return null
  const params: Record<string, string> = {}
  for (let i = 0; i < patternParts.length; i++) {
    if (patternParts[i].startsWith(':')) {
      params[patternParts[i].slice(1)] = pathParts[i]
    } else if (patternParts[i] !== pathParts[i]) {
      return null
    }
  }
  return params
}

function createMockFetch(): typeof global.fetch {
  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
    const method = (init?.method || 'GET').toUpperCase()
    const path = url.startsWith('http') ? new URL(url).pathname : url.split('?')[0]

    for (const entry of registeredHandlers) {
      if (entry.method !== method) continue
      const params = matchRoute(entry.pattern, path)
      if (params !== null) {
        const request = new Request(url.startsWith('http') ? url : `http://localhost${url}`, init)
        return await entry.handler({ params, request })
      }
    }
    // No handler matched
    return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } })
  }
}

try {
  const msw = require('msw/node')
  const mswHttp = require('msw')
  server = msw.setupServer()
  http = mswHttp.http
  HttpResponse = mswHttp.HttpResponse
  mswAvailable = true
} catch {
  // MSW not installed - provide mock fetch-based implementations
  const createHandler = (method: string) => (pattern: string, handler: (ctx: { params: Record<string, string>; request: Request }) => Response | Promise<Response>): HandlerEntry => {
    return { method, pattern, handler }
  }

  http = {
    post: createHandler('POST'),
    get: createHandler('GET'),
    put: createHandler('PUT'),
    delete: createHandler('DELETE'),
  }

  HttpResponse = {
    json: (body: unknown, init?: { status?: number }) => new Response(JSON.stringify(body), {
      status: init?.status || 200,
      headers: { 'Content-Type': 'application/json' },
    }),
  }

  server = {
    listen: () => {
      originalFetch = global.fetch
      global.fetch = createMockFetch()
    },
    resetHandlers: () => {},
    close: () => {
      if (originalFetch) {
        global.fetch = originalFetch
        originalFetch = null
      }
    },
    use: (...handlers: unknown[]) => {
      registeredHandlers = handlers as HandlerEntry[]
    },
  }
}

export { server, http, HttpResponse }

// Start server before all tests
if (typeof beforeAll !== 'undefined') {
  beforeAll(() => {
    if (server && typeof server.listen === 'function') {
      server.listen({ onUnhandledRequest: 'error' })
    }
  })

  // Reset handlers after each test
  afterEach(() => {
    if (server && typeof server.resetHandlers === 'function') {
      server.resetHandlers()
    }
  })

  // Close server after all tests
  afterAll(() => {
    if (server && typeof server.close === 'function') {
      server.close()
    }
  })
}

// =============================================================================
// Mock Data Generators
// =============================================================================

import { faker } from '@faker-js/faker'

/**
 * Generate a mock inspection ID
 */
export function generateInspectionId(): string {
  return `insp_${faker.string.alphanumeric(12)}`
}

/**
 * Generate a mock vehicle
 */
export function generateMockVehicle() {
  return {
    id: `veh_${faker.string.alphanumeric(12)}`,
    vin: faker.vehicle.vin(),
    plate: faker.helpers.replaceSymbols('??###??'),
    make: faker.vehicle.manufacturer(),
    model: faker.vehicle.model(),
    year: faker.date.past({ years: 10 }).getFullYear(),
  }
}

/**
 * Generate a mock customer
 */
export function generateMockCustomer() {
  return {
    id: `cust_${faker.string.alphanumeric(12)}`,
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    email: faker.internet.email(),
    phone: faker.phone.number(),
  }
}

/**
 * Generate a mock inspector/mechanic
 */
export function generateMockInspector() {
  return {
    id: `mech_${faker.string.alphanumeric(12)}`,
    name: faker.person.fullName(),
    role: faker.helpers.arrayElement(['Senior Mechanic', 'Junior Mechanic', 'Master Technician']),
  }
}

/**
 * Generate mock inspection data
 */
export function generateMockInspection(overrides: Partial<InspectionResponse> = {}): InspectionResponse {
  const id = generateInspectionId()
  
  return {
    id,
    status: 'IN_PROGRESS',
    templateId: `tmpl_${faker.string.alphanumeric(12)}`,
    vehicleId: `veh_${faker.string.alphanumeric(12)}`,
    vehicle: {
      id: `veh_${faker.string.alphanumeric(12)}`,
      make: faker.vehicle.manufacturer(),
      model: faker.vehicle.model(),
      year: faker.date.past({ years: 10 }).getFullYear(),
      licensePlate: faker.helpers.replaceSymbols('??###??'),
      vin: faker.vehicle.vin(),
    },
    customerId: `cust_${faker.string.alphanumeric(12)}`,
    customer: {
      id: `cust_${faker.string.alphanumeric(12)}`,
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      email: faker.internet.email(),
      phone: faker.phone.number(),
    },
    mechanicId: `mech_${faker.string.alphanumeric(12)}`,
    mechanic: {
      id: `mech_${faker.string.alphanumeric(12)}`,
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      email: faker.internet.email(),
      role: 'Senior Mechanic',
    },
    tenantId: `tenant_${faker.string.alphanumeric(8)}`,
    startedAt: new Date().toISOString(),
    mileage: faker.number.int({ min: 1000, max: 200000 }),
    fuelLevel: faker.helpers.arrayElement(['EMPTY', 'QUARTER', 'HALF', 'THREE_QUARTERS', 'FULL']),
    items: [],
    findings: [],
    photos: [],
    customerNotified: false,
    customerViewed: false,
    isDeleted: false,
    ...overrides,
  }
}

/**
 * Generate mock sensory inspection data
 */
export function generateMockSensoryInspection(overrides: Partial<SensoryInspectionResponse> = {}) {
  return {
    id: `sens_${faker.string.alphanumeric(12)}`,
    inspectionId: generateInspectionId(),
    odors: {
      smokeDetected: false,
      smokeIntensity: 'NONE',
      petSmellDetected: false,
      moldDetected: false,
      moldLocations: [],
      mustyDetected: false,
    },
    moisture: {
      interiorHumidity: faker.number.int({ min: 30, max: 80 }),
      carpetMoisture: [],
      doorPanelMoisture: [],
      measuredAt: new Date().toISOString(),
      ambientTemperature: 22,
    },
    ac: {
      acDrainTest: true,
      acBlockage: 'NONE',
      filterCondition: 'GOOD',
      notes: '',
    },
    moldRiskLevel: 'LOW',
    notes: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }
}

/**
 * Generate mock warranty data
 */
export function generateMockWarranty(overrides: Partial<WarrantyResponse> = {}) {
  const startDate = faker.date.recent()
  const expirationDate = new Date(startDate)
  expirationDate.setFullYear(expirationDate.getFullYear() + 2)
  
  return {
    id: `warr_${faker.string.alphanumeric(12)}`,
    inspectionId: generateInspectionId(),
    vehicleId: `veh_${faker.string.alphanumeric(12)}`,
    customerId: `cust_${faker.string.alphanumeric(12)}`,
    type: faker.helpers.arrayElement(['manufacturer', 'extended', 'as_is']) as 'manufacturer' | 'extended' | 'as_is',
    startDate: startDate.toISOString(),
    expirationDate: expirationDate.toISOString(),
    maxCoverage: faker.number.int({ min: 1000, max: 10000 }),
    mileageLimit: faker.number.int({ min: 10000, max: 100000 }),
    alertDaysBeforeExpiry: 30,
    sendEmail: true,
    sendSMS: false,
    startMileage: faker.number.int({ min: 1000, max: 50000 }),
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    claimsCount: 0,
    totalClaimsAmount: 0,
    ...overrides,
  }
}

// =============================================================================
// Type Definitions
// =============================================================================

interface InspectionResponse {
  id: string
  status: string
  templateId: string
  vehicleId: string
  vehicle: {
    id: string
    make: string
    model: string
    year?: number
    licensePlate: string
    vin?: string
  }
  customerId: string
  customer: {
    id: string
    firstName: string
    lastName: string
    email?: string
    phone?: string
  }
  mechanicId: string
  mechanic: {
    id: string
    firstName: string
    lastName: string
    email: string
    role: string
  }
  tenantId: string
  startedAt: string
  completedAt?: string
  mileage?: number
  fuelLevel?: string
  items: unknown[]
  findings: unknown[]
  photos: unknown[]
  customerNotified: boolean
  customerViewed: boolean
  approvedAt?: string
  approvedBy?: string
  certificateId?: string
  deletedAt?: string
  deletedBy?: string
  isDeleted: boolean
}

interface SensoryInspectionResponse {
  id: string
  inspectionId: string
  odors: {
    smokeDetected: boolean
    smokeIntensity: string
    petSmellDetected: boolean
    moldDetected: boolean
    moldLocations: string[]
    mustyDetected: boolean
  }
  moisture: {
    interiorHumidity: number
    carpetMoisture: unknown[]
    doorPanelMoisture: unknown[]
    measuredAt?: string
    ambientTemperature?: number
  }
  ac: {
    acDrainTest: boolean
    acBlockage: string
    filterCondition: string
    notes?: string
  }
  moldRiskLevel: string
  notes?: string
  createdAt: string
  updatedAt: string
  inspectorId?: string
}

interface WarrantyResponse {
  id: string
  inspectionId: string
  vehicleId: string
  customerId: string
  type: 'manufacturer' | 'extended' | 'as_is'
  startDate: string
  expirationDate: string
  maxCoverage: number
  mileageLimit?: number
  alertDaysBeforeExpiry: number
  sendEmail: boolean
  sendSMS: boolean
  startMileage?: number
  status: string
  createdAt: string
  updatedAt: string
  voidReason?: string
  claimsCount: number
  totalClaimsAmount: number
}

// =============================================================================
// MSW Handlers
// =============================================================================

/**
 * Create MSW handlers for inspection API
 */
export function createInspectionHandlers(mockData: {
  inspections?: Map<string, InspectionResponse>
  sensoryInspections?: Map<string, SensoryInspectionResponse>
  warranties?: Map<string, WarrantyResponse>
} = {}) {
  const inspections = mockData.inspections || new Map()
  const sensoryInspections = mockData.sensoryInspections || new Map()
  const warranties = mockData.warranties || new Map()

  return [
    // POST /api/inspections - Create inspection
    http.post('/api/inspections', async ({ request }) => {
      const body = await request.json() as Record<string, unknown>
      
      if (!body.templateId || !body.vehicleId || !body.customerId || !body.mechanicId) {
        return HttpResponse.json(
          { error: 'Missing required fields', details: 'templateId, vehicleId, customerId, and mechanicId are required' },
          { status: 400 }
        )
      }

      const inspection = generateMockInspection({
        templateId: body.templateId as string,
        vehicleId: body.vehicleId as string,
        customerId: body.customerId as string,
        mechanicId: body.mechanicId as string,
        mileage: body.mileage as number,
        fuelLevel: body.fuelLevel as string,
      })

      inspections.set(inspection.id, inspection)

      return HttpResponse.json(
        { success: true, data: inspection },
        { status: 201 }
      )
    }),

    // GET /api/inspections/[id] - Get inspection
    http.get('/api/inspections/:id', ({ params }) => {
      const { id } = params
      const inspection = inspections.get(id as string)

      if (!inspection) {
        return HttpResponse.json(
          { error: 'Inspection not found' },
          { status: 404 }
        )
      }

      return HttpResponse.json(
        { success: true, data: inspection },
        { status: 200 }
      )
    }),

    // PUT /api/inspections/[id] - Update inspection
    http.put('/api/inspections/:id', async ({ params, request }) => {
      const { id } = params
      const body = await request.json() as Record<string, unknown>
      const inspection = inspections.get(id as string)

      if (!inspection) {
        return HttpResponse.json(
          { error: 'Inspection not found' },
          { status: 404 }
        )
      }

      const updated = { ...inspection, ...body }
      inspections.set(id as string, updated)

      return HttpResponse.json(
        { success: true, data: updated },
        { status: 200 }
      )
    }),

    // PUT /api/inspections/[id]/sensory - Update sensory inspection
    http.put('/api/inspections/:id/sensory', async ({ params, request }) => {
      const { id } = params
      const body = await request.json() as Record<string, unknown>
      
      if (!body.sensoryId) {
        return HttpResponse.json(
          { error: 'Validation failed', details: 'sensoryId is required' },
          { status: 400 }
        )
      }

      const inspection = inspections.get(id as string)
      if (!inspection) {
        return HttpResponse.json(
          { error: 'Inspection not found' },
          { status: 404 }
        )
      }

      let sensory = sensoryInspections.get(body.sensoryId as string)
      if (!sensory) {
        sensory = generateMockSensoryInspection({
          id: body.sensoryId as string,
          inspectionId: id as string,
        })
      }

      const updated = {
        ...sensory,
        ...body,
        updatedAt: new Date().toISOString(),
      }
      
      // Recalculate mold risk if moisture or odors changed
      if (body.moisture || body.odors) {
        const humidity = (body.moisture as { interiorHumidity?: number })?.interiorHumidity ?? 
                        updated.moisture.interiorHumidity
        const hasMoldSmell = ((body.odors as { moldDetected?: boolean })?.moldDetected ?? updated.odors.moldDetected) ||
                            ((body.odors as { mustyDetected?: boolean })?.mustyDetected ?? updated.odors.mustyDetected)
        
        if (humidity > 70) {
          updated.moldRiskLevel = 'HIGH'
        } else if (humidity >= 60 && hasMoldSmell) {
          updated.moldRiskLevel = 'HIGH'
        } else if (humidity >= 50 && hasMoldSmell) {
          updated.moldRiskLevel = 'MEDIUM'
        } else if (humidity >= 60) {
          updated.moldRiskLevel = 'MEDIUM'
        } else {
          updated.moldRiskLevel = 'LOW'
        }
      }

      sensoryInspections.set(body.sensoryId as string, updated)

      return HttpResponse.json(
        { success: true, data: updated },
        { status: 200 }
      )
    }),

    // POST /api/inspections/[id]/warranty - Create warranty
    http.post('/api/inspections/:id/warranty', async ({ params, request }) => {
      const { id } = params
      const body = await request.json() as Record<string, unknown>

      if (!body.type || !body.startDate || !body.expirationDate || body.maxCoverage === undefined) {
        return HttpResponse.json(
          { error: 'Validation failed', details: 'type, startDate, expirationDate, and maxCoverage are required' },
          { status: 400 }
        )
      }

      const start = new Date(body.startDate as string)
      const expiration = new Date(body.expirationDate as string)

      if (isNaN(start.getTime()) || isNaN(expiration.getTime())) {
        return HttpResponse.json(
          { error: 'Validation failed', details: 'Invalid date format' },
          { status: 400 }
        )
      }

      if (expiration <= start) {
        return HttpResponse.json(
          { error: 'Validation failed', details: 'Expiration date must be after start date' },
          { status: 400 }
        )
      }

      if (body.maxCoverage < 0) {
        return HttpResponse.json(
          { error: 'Validation failed', details: 'maxCoverage cannot be negative' },
          { status: 400 }
        )
      }

      const warranty = generateMockWarranty({
        inspectionId: id as string,
        type: body.type as 'manufacturer' | 'extended' | 'as_is',
        startDate: body.startDate as string,
        expirationDate: body.expirationDate as string,
        maxCoverage: body.maxCoverage as number,
        mileageLimit: body.mileageLimit as number,
        alertDaysBeforeExpiry: body.alertDaysBeforeExpiry as number,
        sendEmail: body.sendEmail as boolean,
        sendSMS: body.sendSMS as boolean,
        startMileage: body.startMileage as number,
      })

      warranties.set(warranty.id, warranty)

      return HttpResponse.json(
        { success: true, data: warranty },
        { status: 201 }
      )
    }),

    // GET /api/inspections/[id]/warranty - Get warranty
    http.get('/api/inspections/:id/warranty', ({ params }) => {
      const { id } = params
      const warranty = Array.from(warranties.values()).find(w => w.inspectionId === id)

      return HttpResponse.json(
        { success: true, data: warranty || null },
        { status: 200 }
      )
    }),

    // GET /api/sync - Get sync status
    http.get('/api/sync', () => {
      return HttpResponse.json(
        { success: true, data: { pendingCount: 0 } },
        { status: 200 }
      )
    }),

    // POST /api/sync - Process sync queue
    http.post('/api/sync', async () => {
      return HttpResponse.json(
        { 
          success: true, 
          data: {
            total: 0,
            successful: 0,
            failed: 0,
            conflicts: 0,
            cleared: 0,
            completedAt: new Date().toISOString(),
            results: [],
          }
        },
        { status: 200 }
      )
    }),
  ]
}

// =============================================================================
// React Testing Library Custom Render
// =============================================================================

interface FormWrapperProps {
  children: ReactNode
  schema?: z.ZodType<unknown>
  defaultValues?: Record<string, unknown>
}

/**
 * Wrapper component that provides FormProvider for form testing
 */
function FormWrapper({ children, schema, defaultValues = {} }: FormWrapperProps) {
  const form = useForm({
    resolver: schema ? zodResolver(schema) : undefined,
    defaultValues,
    mode: 'onChange',
  })

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(() => {})}>
        {children}
      </form>
    </FormProvider>
  )
}

/**
 * Custom render function that wraps component with FormProvider
 */
export function renderWithForm(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'> & {
    formSchema?: z.ZodType<unknown>
    formDefaultValues?: Record<string, unknown>
  }
) {
  const { formSchema, formDefaultValues, ...renderOptions } = options || {}

  return render(ui, {
    wrapper: ({ children }) => (
      <FormWrapper schema={formSchema} defaultValues={formDefaultValues}>
        {children}
      </FormWrapper>
    ),
    ...renderOptions,
  })
}

// =============================================================================
// Async Utilities
// =============================================================================

/**
 * Wait for a specified amount of time
 */
export function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Wait for an element to be removed from the DOM
 */
export async function waitForElementToBeRemoved(
  callback: () => HTMLElement | null,
  timeout = 5000
): Promise<void> {
  const startTime = Date.now()
  
  while (Date.now() - startTime < timeout) {
    const element = callback()
    if (!element) return
    await wait(50)
  }
  
  throw new Error('Timeout waiting for element to be removed')
}

// =============================================================================
// IndexedDB Mock for Offline Sync Tests
// =============================================================================

/**
 * Create a mock IndexedDB for testing
 */
export function createMockIndexedDB() {
  const stores = new Map<string, Map<string, unknown>>()

  return {
    addStore: (name: string) => {
      if (!stores.has(name)) {
        stores.set(name, new Map())
      }
    },

    put: (storeName: string, key: string, value: unknown) => {
      const store = stores.get(storeName)
      if (!store) throw new Error(`Store ${storeName} not found`)
      store.set(key, value)
    },

    get: (storeName: string, key: string) => {
      const store = stores.get(storeName)
      if (!store) return null
      return store.get(key) || null
    },

    delete: (storeName: string, key: string) => {
      const store = stores.get(storeName)
      if (!store) return
      store.delete(key)
    },

    getAll: (storeName: string) => {
      const store = stores.get(storeName)
      if (!store) return []
      return Array.from(store.values())
    },

    getAllKeys: (storeName: string) => {
      const store = stores.get(storeName)
      if (!store) return []
      return Array.from(store.keys())
    },

    clear: (storeName: string) => {
      const store = stores.get(storeName)
      if (!store) return
      store.clear()
    },

    clearAll: () => {
      stores.clear()
    },
  }
}

// =============================================================================
// Export Testing Library utilities
// =============================================================================

export * from '@testing-library/react'
