/**
 * Portal Authentication with Multi-Tenant Support
 * 
 * Verifies customers belong to the correct tenant.
 * Ensures data isolation between different auto-repair shops.
 * 
 * @module lib/auth/portal-auth
 * @version 2.0.0
 */

import { prisma } from '@/lib/prisma'
import { SignJWT, jwtVerify } from 'jose'

// =============================================================================
// Configuration
// =============================================================================

const JWT_SECRET = new TextEncoder().encode(
  process.env.PORTAL_JWT_SECRET || 'portal-secret-key-change-in-production'
)

const TOKEN_EXPIRY = '30d'

// =============================================================================
// Types
// =============================================================================

export interface PortalUser {
  id: string
  email: string
  firstName: string
  lastName: string
  tenantId: string
  tenantSlug: string
  tenantName: string
}

export interface PortalTokenPayload {
  customerId: string
  email: string
  tenantId: string
  tenantSlug: string
  type: 'portal'
  iat: number
  exp: number
}

export interface LoginCredentials {
  email: string
  password: string
  tenantId?: string
  tenantSlug?: string
}

export interface RegistrationData {
  email: string
  password: string
  firstName: string
  lastName: string
  phone?: string
  tenantId: string
  gdprConsent?: boolean
  marketingConsent?: boolean
}

// =============================================================================
// Error Classes
// =============================================================================

export class PortalAuthError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 401
  ) {
    super(message)
    this.name = 'PortalAuthError'
  }
}

export class CustomerNotFoundError extends PortalAuthError {
  constructor() {
    super('Customer not found', 'CUSTOMER_NOT_FOUND', 404)
  }
}

export class InvalidCredentialsError extends PortalAuthError {
  constructor() {
    super('Invalid email or password', 'INVALID_CREDENTIALS', 401)
  }
}

export class TenantMismatchError extends PortalAuthError {
  constructor() {
    super('Customer does not belong to this tenant', 'TENANT_MISMATCH', 403)
  }
}

export class InactiveTenantError extends PortalAuthError {
  constructor() {
    super('Tenant account is inactive or suspended', 'INACTIVE_TENANT', 403)
  }
}

// =============================================================================
// Token Management
// =============================================================================

export async function generateToken(user: PortalUser): Promise<string> {
  const token = await new SignJWT({
    customerId: user.id,
    email: user.email,
    tenantId: user.tenantId,
    tenantSlug: user.tenantSlug,
    type: 'portal',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(TOKEN_EXPIRY)
    .sign(JWT_SECRET)
  
  return token
}

export async function verifyToken(token: string): Promise<PortalTokenPayload> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload as unknown as PortalTokenPayload
  } catch {
    throw new PortalAuthError('Invalid or expired token', 'INVALID_TOKEN', 401)
  }
}

// =============================================================================
// Authentication Functions
// =============================================================================

/**
 * Authenticate a customer portal user
 * Verifies customer belongs to the specified tenant
 */
export async function authenticateCustomer(
  credentials: LoginCredentials
): Promise<{ user: PortalUser; token: string }> {
  const { email, password, tenantId, tenantSlug } = credentials
  
  // In production, hash and compare passwords with bcrypt
  // For demo, we use a simple comparison
  
  // Find customer in database
  const customer = await prisma.customer.findFirst({
    where: {
      email: email.toLowerCase(),
    },
    include: {
      tenant: {
        select: {
          id: true,
          slug: true,
          name: true,
          status: true,
          subscriptionStatus: true,
        },
      },
    },
  })
  
  if (!customer) {
    throw new CustomerNotFoundError()
  }
  
  // Verify tenant match if specified
  if (tenantId && customer.tenantId !== tenantId) {
    throw new TenantMismatchError()
  }
  
  if (tenantSlug && customer.tenant.slug !== tenantSlug) {
    throw new TenantMismatchError()
  }
  
  // Verify tenant is active
  if (customer.tenant.status !== 'ACTIVE') {
    throw new InactiveTenantError()
  }
  
  // Verify subscription is valid
  if (customer.tenant.subscriptionStatus === 'EXPIRED' ||
      customer.tenant.subscriptionStatus === 'SUSPENDED') {
    throw new InactiveTenantError()
  }
  
  // In production: verify password hash
  // const isValidPassword = await bcrypt.compare(password, customer.passwordHash)
  // For demo purposes:
  const isValidPassword = password === 'password123' // Demo only!
  
  if (!isValidPassword) {
    throw new InvalidCredentialsError()
  }
  
  // Create user object
  const user: PortalUser = {
    id: customer.id,
    email: customer.email,
    firstName: customer.firstName,
    lastName: customer.lastName,
    tenantId: customer.tenantId,
    tenantSlug: customer.tenant.slug,
    tenantName: customer.tenant.name,
  }
  
  // Generate token
  const token = await generateToken(user)
  
  // Update last login (if we had this field)
  // await prisma.customer.update({
  //   where: { id: customer.id },
  //   data: { lastLoginAt: new Date() },
  // })
  
  return { user, token }
}

/**
 * Register a new customer portal user
 */
export async function registerCustomer(
  data: RegistrationData
): Promise<{ user: PortalUser; token: string }> {
  const { email, password, firstName, lastName, phone, tenantId } = data
  
  // Verify tenant exists and is active
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      id: true,
      slug: true,
      name: true,
      status: true,
      maxCustomers: true,
      subscriptionStatus: true,
    },
  })
  
  if (!tenant) {
    throw new PortalAuthError('Tenant not found', 'TENANT_NOT_FOUND', 404)
  }
  
  if (tenant.status !== 'ACTIVE') {
    throw new InactiveTenantError()
  }
  
  // Check if customer limit reached
  const customerCount = await prisma.customer.count({
    where: { tenantId },
  })
  
  if (customerCount >= tenant.maxCustomers) {
    throw new PortalAuthError(
      'Customer limit reached for this tenant',
      'CUSTOMER_LIMIT_REACHED',
      403
    )
  }
  
  // Check if email already exists for this tenant
  const existingCustomer = await prisma.customer.findFirst({
    where: {
      email: email.toLowerCase(),
      tenantId,
    },
  })
  
  if (existingCustomer) {
    throw new PortalAuthError(
      'Email already registered for this shop',
      'EMAIL_EXISTS',
      409
    )
  }
  
  // Create customer
  // In production: hash password with bcrypt
  // const passwordHash = await bcrypt.hash(password, 10)
  
  const customer = await prisma.customer.create({
    data: {
      tenantId,
      externalId: `portal_${Date.now()}`,
      email: email.toLowerCase(),
      firstName,
      lastName,
      phone,
      gdprConsent: true,
      gdprConsentAt: new Date(),
    },
  })
  
  // Create user object
  const user: PortalUser = {
    id: customer.id,
    email: customer.email,
    firstName: customer.firstName,
    lastName: customer.lastName,
    tenantId: tenant.id,
    tenantSlug: tenant.slug,
    tenantName: tenant.name,
  }
  
  // Generate token
  const token = await generateToken(user)
  
  return { user, token }
}

/**
 * Get current customer from token
 * Verifies customer still belongs to tenant
 */
export async function getCurrentCustomer(
  token: string
): Promise<PortalUser> {
  const payload = await verifyToken(token)
  
  // Fetch customer and verify tenant membership
  const customer = await prisma.customer.findFirst({
    where: {
      id: payload.customerId,
      tenantId: payload.tenantId,
    },
    include: {
      tenant: {
        select: {
          id: true,
          slug: true,
          name: true,
          status: true,
        },
      },
    },
  })
  
  if (!customer) {
    throw new CustomerNotFoundError()
  }
  
  if (customer.tenant.status !== 'ACTIVE') {
    throw new InactiveTenantError()
  }
  
  return {
    id: customer.id,
    email: customer.email,
    firstName: customer.firstName,
    lastName: customer.lastName,
    tenantId: customer.tenantId,
    tenantSlug: customer.tenant.slug,
    tenantName: customer.tenant.name,
  }
}

/**
 * Verify customer has access to a specific resource
 * Checks that the resource belongs to the same tenant
 */
export async function verifyResourceAccess(
  customerId: string,
  tenantId: string,
  resourceType: 'vehicle' | 'inspection' | 'warranty' | 'booking',
  resourceId: string
): Promise<boolean> {
  // Verify customer belongs to tenant
  const customer = await prisma.customer.findFirst({
    where: {
      id: customerId,
      tenantId,
    },
  })
  
  if (!customer) {
    return false
  }
  
  // Verify resource belongs to tenant
  switch (resourceType) {
    case 'vehicle': {
      const vehicle = await prisma.vehicle.findFirst({
        where: {
          id: resourceId,
          tenantId,
        },
      })
      return !!vehicle
    }
    
    case 'inspection': {
      const inspection = await prisma.inspection.findFirst({
        where: {
          id: resourceId,
          tenantId,
        },
      })
      return !!inspection
    }
    
    case 'warranty': {
      const warranty = await prisma.warranty.findFirst({
        where: {
          id: resourceId,
          tenantId,
        },
      })
      return !!warranty
    }
    
    case 'booking': {
      const booking = await prisma.booking.findFirst({
        where: {
          id: resourceId,
          tenantId,
        },
      })
      return !!booking
    }
    
    default:
      return false
  }
}

/**
 * Get customer vehicles scoped to tenant
 */
export async function getCustomerVehicles(
  customerId: string,
  tenantId: string
) {
  // Verify customer belongs to tenant
  const customer = await prisma.customer.findFirst({
    where: {
      id: customerId,
      tenantId,
    },
  })
  
  if (!customer) {
    throw new TenantMismatchError()
  }
  
  // Get vehicles for customer in this tenant
  return prisma.vehicle.findMany({
    where: {
      tenantId,
      customerId,
    },
    select: {
      id: true,
      vin: true,
      licensePlate: true,
      make: true,
      model: true,
      year: true,
      mileage: true,
      color: true,
    },
  })
}

/**
 * Get customer inspections scoped to tenant
 */
export async function getCustomerInspections(
  customerId: string,
  tenantId: string
) {
  // Get customer's vehicles first
  const vehicles = await getCustomerVehicles(customerId, tenantId)
  const vehicleIds = vehicles.map(v => v.id)
  
  // Get inspections for those vehicles
  return prisma.inspection.findMany({
    where: {
      tenantId,
      vehicleId: { in: vehicleIds },
    },
    include: {
      vehicle: {
        select: {
          make: true,
          model: true,
          licensePlate: true,
        },
      },
    },
    orderBy: { scheduledDate: 'desc' },
  })
}

// =============================================================================
// Export
// =============================================================================

export const portalAuth = {
  authenticateCustomer,
  registerCustomer,
  getCurrentCustomer,
  verifyResourceAccess,
  getCustomerVehicles,
  getCustomerInspections,
  generateToken,
  verifyToken,
}

// =============================================================================
// PortalAuthService Singleton Class (for compatibility)
// =============================================================================

export class PortalAuthService {
  private static instance: PortalAuthService
  private token: string | null = null
  private user: PortalUser | null = null

  private constructor() {}

  static getInstance(): PortalAuthService {
    if (!PortalAuthService.instance) {
      PortalAuthService.instance = new PortalAuthService()
    }
    return PortalAuthService.instance
  }

  /**
   * Initialize auth state from storage
   */
  init(): boolean {
    if (typeof window === 'undefined') return false
    
    const storedToken = localStorage.getItem('portal_token')
    const storedUser = localStorage.getItem('portal_user')
    
    if (storedToken && storedUser) {
      this.token = storedToken
      try {
        this.user = JSON.parse(storedUser)
        return true
      } catch {
        this.logout()
        return false
      }
    }
    
    return false
  }

  /**
   * Login customer
   */
  async login(email: string, password: string, tenantSlug: string): Promise<PortalUser> {
    const result = await authenticateCustomer({ email, password, tenantSlug })
    
    this.token = result.token
    this.user = result.user
    
    if (typeof window !== 'undefined') {
      localStorage.setItem('portal_token', result.token)
      localStorage.setItem('portal_user', JSON.stringify(result.user))
    }
    
    return result.user
  }

  /**
   * Logout customer
   */
  logout(): void {
    this.token = null
    this.user = null
    
    if (typeof window !== 'undefined') {
      localStorage.removeItem('portal_token')
      localStorage.removeItem('portal_user')
    }
  }

  /**
   * Check if authenticated
   */
  isAuthenticated(): boolean {
    return !!this.token && !!this.user
  }

  /**
   * Get current user
   */
  getUser(): PortalUser | null {
    return this.user
  }

  /**
   * Get auth token
   */
  getToken(): string | null {
    return this.token
  }

  /**
   * Refresh current user data
   */
  async refreshUser(): Promise<PortalUser | null> {
    if (!this.token) return null
    
    try {
      const user = await getCurrentCustomer(this.token)
      this.user = user
      
      if (typeof window !== 'undefined') {
        localStorage.setItem('portal_user', JSON.stringify(user))
      }
      
      return user
    } catch {
      this.logout()
      return null
    }
  }
}
