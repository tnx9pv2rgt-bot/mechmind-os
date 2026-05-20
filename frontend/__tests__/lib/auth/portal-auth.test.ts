/**
 * Tests for lib/auth/portal-auth.ts
 */

// =========================================================================
// Mocks — must be declared before any import from the module under test
// =========================================================================

const mockFetch = jest.fn()
global.fetch = mockFetch

// =========================================================================
// Imports
// =========================================================================

import {
  authenticateCustomer,
  registerCustomer,
  getCurrentCustomer,
  verifyResourceAccess,
  getCustomerVehicles,
  getCustomerInspections,
  generateToken,
  verifyToken,
  PortalAuthService,
  PortalAuthError,
  CustomerNotFoundError,
  InvalidCredentialsError,
  TenantMismatchError,
  InactiveTenantError,
  type PortalUser,
} from '@/lib/auth/portal-auth'

// =========================================================================
// Helpers
// =========================================================================

function okResponse(body: unknown) {
  return {
    ok: true,
    status: 200,
    json: jest.fn().mockResolvedValueOnce(body),
  }
}

function errResponse(status: number, body: unknown) {
  return {
    ok: false,
    status,
    json: jest.fn().mockResolvedValueOnce(body),
  }
}

const SAMPLE_USER: PortalUser = {
  id: 'u1',
  email: 'a@test.com',
  firstName: 'Mario',
  lastName: 'Rossi',
  tenantId: 't1',
  tenantSlug: 'officina',
  tenantName: 'Officina Test',
}

// =========================================================================
// Error Classes
// =========================================================================

describe('Error Classes', () => {
  it('PortalAuthError stores message, code and statusCode', () => {
    const err = new PortalAuthError('Custom error', 'ERR_CODE', 422)
    expect(err.message).toBe('Custom error')
    expect(err.code).toBe('ERR_CODE')
    expect(err.statusCode).toBe(422)
    expect(err.name).toBe('PortalAuthError')
    expect(err).toBeInstanceOf(Error)
  })

  it('PortalAuthError defaults statusCode to 401', () => {
    const err = new PortalAuthError('msg', 'CODE')
    expect(err.statusCode).toBe(401)
  })

  it('CustomerNotFoundError has correct code and 404 status', () => {
    const err = new CustomerNotFoundError()
    expect(err.code).toBe('CUSTOMER_NOT_FOUND')
    expect(err.statusCode).toBe(404)
    expect(err).toBeInstanceOf(PortalAuthError)
  })

  it('InvalidCredentialsError has correct code and 401 status', () => {
    const err = new InvalidCredentialsError()
    expect(err.code).toBe('INVALID_CREDENTIALS')
    expect(err.statusCode).toBe(401)
  })

  it('TenantMismatchError has correct code and 403 status', () => {
    const err = new TenantMismatchError()
    expect(err.code).toBe('TENANT_MISMATCH')
    expect(err.statusCode).toBe(403)
  })

  it('InactiveTenantError has correct code and 403 status', () => {
    const err = new InactiveTenantError()
    expect(err.code).toBe('INACTIVE_TENANT')
    expect(err.statusCode).toBe(403)
  })
})

// =========================================================================
// backendFetch — tested via public functions
// =========================================================================

describe('backendFetch error mapping', () => {
  beforeEach(() => mockFetch.mockReset())

  it('throws CustomerNotFoundError on 404', async () => {
    mockFetch.mockResolvedValueOnce(errResponse(404, {}))
    await expect(authenticateCustomer({ email: 'a@b.com', password: 'p' })).rejects.toBeInstanceOf(CustomerNotFoundError)
  })

  it('throws InvalidCredentialsError on 401', async () => {
    mockFetch.mockResolvedValueOnce(errResponse(401, {}))
    await expect(authenticateCustomer({ email: 'a@b.com', password: 'p' })).rejects.toBeInstanceOf(InvalidCredentialsError)
  })

  it('throws TenantMismatchError on 403 with TENANT_MISMATCH code', async () => {
    mockFetch.mockResolvedValueOnce(errResponse(403, { error: { code: 'TENANT_MISMATCH' } }))
    await expect(authenticateCustomer({ email: 'a@b.com', password: 'p' })).rejects.toBeInstanceOf(TenantMismatchError)
  })

  it('throws InactiveTenantError on 403 without TENANT_MISMATCH code', async () => {
    mockFetch.mockResolvedValueOnce(errResponse(403, { error: { code: 'OTHER' } }))
    await expect(authenticateCustomer({ email: 'a@b.com', password: 'p' })).rejects.toBeInstanceOf(InactiveTenantError)
  })

  it('throws PortalAuthError on other non-ok status', async () => {
    mockFetch.mockResolvedValueOnce(errResponse(500, { error: { message: 'Server exploded', code: 'SERVER_ERROR' } }))
    await expect(authenticateCustomer({ email: 'a@b.com', password: 'p' })).rejects.toBeInstanceOf(PortalAuthError)
  })

  it('uses fallback error message when backend provides none', async () => {
    mockFetch.mockResolvedValueOnce(errResponse(500, {}))
    await expect(authenticateCustomer({ email: 'a@b.com', password: 'p' }))
      .rejects.toMatchObject({ message: expect.stringContaining('500') })
  })

  it('handles non-JSON response body gracefully (json throws)', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: jest.fn().mockRejectedValueOnce(new Error('Not JSON')),
    })
    await expect(authenticateCustomer({ email: 'a@b.com', password: 'p' })).rejects.toBeInstanceOf(PortalAuthError)
  })

  it('returns body.data when present (data wrapper)', async () => {
    const payload = { user: SAMPLE_USER, token: 'jwt' }
    mockFetch.mockResolvedValueOnce(okResponse({ data: payload }))
    const result = await authenticateCustomer({ email: 'a@test.com', password: 'p' })
    expect(result).toEqual(payload)
  })

  it('returns body directly when no data wrapper', async () => {
    const payload = { user: SAMPLE_USER, token: 'jwt' }
    mockFetch.mockResolvedValueOnce(okResponse(payload))
    const result = await authenticateCustomer({ email: 'a@test.com', password: 'p' })
    expect(result).toEqual(payload)
  })

  it('adds Authorization header when token option is provided', async () => {
    mockFetch.mockResolvedValueOnce(okResponse(SAMPLE_USER))
    await getCurrentCustomer('bearer-token-xyz')
    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer bearer-token-xyz' }),
      })
    )
  })

  it('does NOT add Authorization header when no token', async () => {
    const payload = { user: SAMPLE_USER, token: 'jwt' }
    mockFetch.mockResolvedValueOnce(okResponse(payload))
    await authenticateCustomer({ email: 'a@test.com', password: 'p' })
    const callHeaders = mockFetch.mock.calls[0][1].headers as Record<string, string>
    expect(callHeaders['Authorization']).toBeUndefined()
  })
})

// =========================================================================
// generateToken
// =========================================================================

describe('generateToken', () => {
  beforeEach(() => mockFetch.mockReset())

  it('returns token string from backend', async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ token: 'portal-jwt-123' }))
    const token = await generateToken(SAMPLE_USER)
    expect(token).toBe('portal-jwt-123')
  })

  it('calls the correct endpoint', async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ token: 'x' }))
    await generateToken(SAMPLE_USER)
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('portal/auth/token'),
      expect.objectContaining({ method: 'POST' })
    )
  })
})

// =========================================================================
// verifyToken
// =========================================================================

describe('verifyToken', () => {
  beforeEach(() => mockFetch.mockReset())

  it('returns decoded payload', async () => {
    const payload = { customerId: 'c1', email: 'a@test.com', tenantId: 't1', tenantSlug: 'officina', type: 'portal' as const, iat: 0, exp: 9999 }
    mockFetch.mockResolvedValueOnce(okResponse(payload))
    const result = await verifyToken('some-token')
    expect(result).toEqual(payload)
  })
})

// =========================================================================
// authenticateCustomer
// =========================================================================

describe('authenticateCustomer', () => {
  beforeEach(() => mockFetch.mockReset())

  it('returns user and token on success', async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ user: SAMPLE_USER, token: 'jwt' }))
    const result = await authenticateCustomer({ email: 'a@test.com', password: 'pass', tenantSlug: 'officina' })
    expect(result.user).toEqual(SAMPLE_USER)
    expect(result.token).toBe('jwt')
  })

  it('includes optional tenantId in request body', async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ user: SAMPLE_USER, token: 'jwt' }))
    await authenticateCustomer({ email: 'a@test.com', password: 'p', tenantId: 't1', tenantSlug: 'officina' })
    const body = JSON.parse(mockFetch.mock.calls[0][1].body as string)
    expect(body.tenantId).toBe('t1')
  })
})

// =========================================================================
// registerCustomer
// =========================================================================

describe('registerCustomer', () => {
  beforeEach(() => mockFetch.mockReset())

  it('returns user and token on success', async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ user: SAMPLE_USER, token: 'jwt2' }))
    const result = await registerCustomer({ email: 'new@test.com', password: 'pass', firstName: 'Mario', lastName: 'Rossi', gdprConsent: true })
    expect(result.user).toEqual(SAMPLE_USER)
    expect(result.token).toBe('jwt2')
  })
})

// =========================================================================
// getCurrentCustomer
// =========================================================================

describe('getCurrentCustomer', () => {
  beforeEach(() => mockFetch.mockReset())

  it('returns current user', async () => {
    mockFetch.mockResolvedValueOnce(okResponse(SAMPLE_USER))
    const result = await getCurrentCustomer('my-token')
    expect(result).toEqual(SAMPLE_USER)
  })
})

// =========================================================================
// verifyResourceAccess
// =========================================================================

describe('verifyResourceAccess', () => {
  beforeEach(() => mockFetch.mockReset())

  it('returns true when backend grants access', async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ hasAccess: true }))
    const result = await verifyResourceAccess('cust-1', 't1', 'booking', 'book-1')
    expect(result).toBe(true)
  })

  it('returns false when backend denies access', async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ hasAccess: false }))
    const result = await verifyResourceAccess('cust-1', 't1', 'vehicle', 'v-1')
    expect(result).toBe(false)
  })

  it('returns false when fetch throws (catch path)', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Forbidden'))
    const result = await verifyResourceAccess('cust-1', 't1', 'inspection', 'i-1')
    expect(result).toBe(false)
  })

  it('supports all resourceType values', async () => {
    for (const resourceType of ['vehicle', 'inspection', 'warranty', 'booking'] as const) {
      mockFetch.mockResolvedValueOnce(okResponse({ hasAccess: true }))
      const result = await verifyResourceAccess('c', 't', resourceType, 'r')
      expect(result).toBe(true)
    }
  })
})

// =========================================================================
// getCustomerVehicles
// =========================================================================

describe('getCustomerVehicles', () => {
  beforeEach(() => mockFetch.mockReset())

  it('returns vehicles list with correct x-tenant-id header', async () => {
    const vehicles = [{ id: 'v1', vin: 'VIN1', licensePlate: 'AB123CD', make: 'Fiat', model: '500', year: 2020, mileage: 45000, color: 'rosso' }]
    mockFetch.mockResolvedValueOnce(okResponse(vehicles))
    const result = await getCustomerVehicles('cust-1', 't1')
    expect(result).toEqual(vehicles)
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('cust-1/vehicles'),
      expect.objectContaining({ headers: expect.objectContaining({ 'x-tenant-id': 't1' }) })
    )
  })
})

// =========================================================================
// getCustomerInspections
// =========================================================================

describe('getCustomerInspections', () => {
  beforeEach(() => mockFetch.mockReset())

  it('returns inspections list', async () => {
    const inspections = [{ id: 'i1', vehicleId: 'v1', scheduledDate: '2026-06-01', vehicle: { make: 'Fiat', model: '500', licensePlate: 'AB123CD' } }]
    mockFetch.mockResolvedValueOnce(okResponse(inspections))
    const result = await getCustomerInspections('cust-1', 't1')
    expect(result).toEqual(inspections)
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('cust-1/inspections'),
      expect.objectContaining({ headers: expect.objectContaining({ 'x-tenant-id': 't1' }) })
    )
  })
})

// =========================================================================
// PortalAuthService (singleton)
// NOTE: global setup.ts mocks localStorage with jest.fn() — we use
//       mockReturnValue/mockImplementation to control getItem behaviour,
//       and assert on setItem/removeItem calls for write operations.
// =========================================================================

describe('PortalAuthService', () => {
  // Reset singleton before each test; reset localStorage mock state.
  beforeEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(PortalAuthService as any).instance = undefined
    mockFetch.mockReset()
    // Default: getItem returns null (empty storage)
    ;(localStorage.getItem as jest.Mock).mockReturnValue(null)
    ;(localStorage.setItem as jest.Mock).mockReset()
    ;(localStorage.removeItem as jest.Mock).mockReset()
  })

  it('is a singleton', () => {
    const a = PortalAuthService.getInstance()
    const b = PortalAuthService.getInstance()
    expect(a).toBe(b)
  })

  // --- init() ---
  describe('init()', () => {
    it('returns false when nothing is in localStorage', () => {
      ;(localStorage.getItem as jest.Mock).mockReturnValue(null)
      const svc = PortalAuthService.getInstance()
      expect(svc.init()).toBe(false)
      expect(svc.isAuthenticated()).toBe(false)
    })

    it('returns true and restores state when valid data is stored', () => {
      ;(localStorage.getItem as jest.Mock).mockImplementation((key: string) => {
        if (key === 'portal_token') return 'stored-jwt'
        if (key === 'portal_user') return JSON.stringify(SAMPLE_USER)
        return null
      })

      const svc = PortalAuthService.getInstance()
      expect(svc.init()).toBe(true)
      expect(svc.isAuthenticated()).toBe(true)
      expect(svc.getToken()).toBe('stored-jwt')
      expect(svc.getUser()).toEqual(SAMPLE_USER)
    })

    it('returns false and calls logout when user JSON is malformed', () => {
      ;(localStorage.getItem as jest.Mock).mockImplementation((key: string) => {
        if (key === 'portal_token') return 'tok'
        if (key === 'portal_user') return '{bad json{{'
        return null
      })

      const svc = PortalAuthService.getInstance()
      expect(svc.init()).toBe(false)
      expect(svc.isAuthenticated()).toBe(false)
      // logout() should have called removeItem on both keys
      expect(localStorage.removeItem).toHaveBeenCalledWith('portal_token')
      expect(localStorage.removeItem).toHaveBeenCalledWith('portal_user')
    })
  })

  // --- login() ---
  describe('login()', () => {
    it('authenticates, stores token/user in state and localStorage', async () => {
      mockFetch.mockResolvedValueOnce(okResponse({ user: SAMPLE_USER, token: 'new-jwt' }))

      const svc = PortalAuthService.getInstance()
      const user = await svc.login('a@test.com', 'secret', 'officina')

      expect(user).toEqual(SAMPLE_USER)
      expect(svc.getToken()).toBe('new-jwt')
      expect(svc.getUser()).toEqual(SAMPLE_USER)
      expect(localStorage.setItem).toHaveBeenCalledWith('portal_token', 'new-jwt')
      expect(localStorage.setItem).toHaveBeenCalledWith('portal_user', JSON.stringify(SAMPLE_USER))
    })

    it('propagates errors from authenticateCustomer', async () => {
      mockFetch.mockResolvedValueOnce(errResponse(401, {}))
      const svc = PortalAuthService.getInstance()
      await expect(svc.login('bad@test.com', 'wrong', 'officina')).rejects.toBeInstanceOf(InvalidCredentialsError)
    })
  })

  // --- logout() ---
  describe('logout()', () => {
    it('clears token, user and calls removeItem on both keys', () => {
      ;(localStorage.getItem as jest.Mock).mockImplementation((key: string) => {
        if (key === 'portal_token') return 'tok'
        if (key === 'portal_user') return JSON.stringify(SAMPLE_USER)
        return null
      })

      const svc = PortalAuthService.getInstance()
      svc.init()
      svc.logout()

      expect(svc.getToken()).toBeNull()
      expect(svc.getUser()).toBeNull()
      expect(svc.isAuthenticated()).toBe(false)
      expect(localStorage.removeItem).toHaveBeenCalledWith('portal_token')
      expect(localStorage.removeItem).toHaveBeenCalledWith('portal_user')
    })
  })

  // --- isAuthenticated() ---
  describe('isAuthenticated()', () => {
    it('returns false initially', () => {
      const svc = PortalAuthService.getInstance()
      expect(svc.isAuthenticated()).toBe(false)
    })

    it('returns true after successful login', async () => {
      mockFetch.mockResolvedValueOnce(okResponse({ user: SAMPLE_USER, token: 'jwt' }))
      const svc = PortalAuthService.getInstance()
      await svc.login('a@test.com', 'p', 'officina')
      expect(svc.isAuthenticated()).toBe(true)
    })
  })

  // --- refreshUser() ---
  describe('refreshUser()', () => {
    it('returns null when not authenticated (no token)', async () => {
      const svc = PortalAuthService.getInstance()
      const result = await svc.refreshUser()
      expect(result).toBeNull()
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('updates user and calls localStorage.setItem on success', async () => {
      ;(localStorage.getItem as jest.Mock).mockImplementation((key: string) => {
        if (key === 'portal_token') return 'tok'
        if (key === 'portal_user') return JSON.stringify(SAMPLE_USER)
        return null
      })

      const svc = PortalAuthService.getInstance()
      svc.init()

      const updatedUser = { ...SAMPLE_USER, firstName: 'Luigi' }
      mockFetch.mockResolvedValueOnce(okResponse(updatedUser))

      const result = await svc.refreshUser()
      expect(result).toEqual(updatedUser)
      expect(svc.getUser()).toEqual(updatedUser)
      expect(localStorage.setItem).toHaveBeenCalledWith('portal_user', JSON.stringify(updatedUser))
    })

    it('calls logout and returns null when getCurrentCustomer fails', async () => {
      ;(localStorage.getItem as jest.Mock).mockImplementation((key: string) => {
        if (key === 'portal_token') return 'tok'
        if (key === 'portal_user') return JSON.stringify(SAMPLE_USER)
        return null
      })

      const svc = PortalAuthService.getInstance()
      svc.init()

      mockFetch.mockResolvedValueOnce(errResponse(401, {}))

      const result = await svc.refreshUser()
      expect(result).toBeNull()
      expect(svc.isAuthenticated()).toBe(false)
    })
  })

  // --- getUser() / getToken() ---
  describe('getUser() and getToken()', () => {
    it('return null when not authenticated', () => {
      const svc = PortalAuthService.getInstance()
      expect(svc.getUser()).toBeNull()
      expect(svc.getToken()).toBeNull()
    })

    it('return stored values after init', () => {
      ;(localStorage.getItem as jest.Mock).mockImplementation((key: string) => {
        if (key === 'portal_token') return 'tok'
        if (key === 'portal_user') return JSON.stringify(SAMPLE_USER)
        return null
      })
      const svc = PortalAuthService.getInstance()
      svc.init()
      expect(svc.getToken()).toBe('tok')
      expect(svc.getUser()).toEqual(SAMPLE_USER)
    })
  })
})
