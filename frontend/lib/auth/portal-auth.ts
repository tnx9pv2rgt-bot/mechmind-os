/**
 * Portal Authentication with Multi-Tenant Support
 *
 * All authentication operations are delegated to the NestJS backend.
 * No direct database access from the frontend.
 *
 * @module lib/auth/portal-auth
 * @version 3.0.0
 */

import { BACKEND_BASE } from '@/lib/config';

const BACKEND_URL = BACKEND_BASE;
const TIMEOUT_MS = 15_000;

// =============================================================================
// Types
// =============================================================================

export interface PortalUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  tenantId: string;
  tenantSlug: string;
  tenantName: string;
}

export interface PortalTokenPayload {
  customerId: string;
  email: string;
  tenantId: string;
  tenantSlug: string;
  type: 'portal';
  iat: number;
  exp: number;
}

export interface LoginCredentials {
  email: string;
  password: string;
  tenantId?: string;
  tenantSlug?: string;
}

export interface RegistrationData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  tenantId?: string;
  gdprConsent?: boolean;
  marketingConsent?: boolean;
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
    super(message);
    this.name = 'PortalAuthError';
  }
}

export class CustomerNotFoundError extends PortalAuthError {
  constructor() {
    super('Customer not found', 'CUSTOMER_NOT_FOUND', 404);
  }
}

export class InvalidCredentialsError extends PortalAuthError {
  constructor() {
    super('Invalid email or password', 'INVALID_CREDENTIALS', 401);
  }
}

export class TenantMismatchError extends PortalAuthError {
  constructor() {
    super('Customer does not belong to this tenant', 'TENANT_MISMATCH', 403);
  }
}

export class InactiveTenantError extends PortalAuthError {
  constructor() {
    super('Tenant account is inactive or suspended', 'INACTIVE_TENANT', 403);
  }
}

// =============================================================================
// Backend HTTP Helper
// =============================================================================

async function backendFetch<T>(
  path: string,
  options?: RequestInit & { token?: string }
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string>),
  };

  if (options?.token) {
    headers['Authorization'] = `Bearer ${options.token}`;
  }

  try {
    const res = await fetch(`${BACKEND_URL}/${path}`, {
      ...options,
      headers,
      signal: controller.signal,
    });

    const body = await res.json().catch(() => ({}));

    if (!res.ok) {
      const errorCode = (body as { error?: { code?: string } })?.error?.code || 'BACKEND_ERROR';
      const errorMsg =
        (body as { error?: { message?: string } })?.error?.message ||
        `Backend error: ${res.status}`;

      if (res.status === 404) throw new CustomerNotFoundError();
      if (res.status === 401) throw new InvalidCredentialsError();
      if (res.status === 403) {
        if (errorCode === 'TENANT_MISMATCH') throw new TenantMismatchError();
        throw new InactiveTenantError();
      }
      throw new PortalAuthError(errorMsg, errorCode, res.status);
    }

    return ((body as { data?: T }).data ?? body) as T;
  } finally {
    clearTimeout(timeoutId);
  }
}

// =============================================================================
// Token Management
// =============================================================================

/**
 * Generate a portal token via the backend
 */
export async function generateToken(user: PortalUser): Promise<string> {
  const result = await backendFetch<{ token: string }>('v1/portal/auth/token', {
    method: 'POST',
    body: JSON.stringify(user),
  });
  return result.token;
}

/**
 * Verify a portal token via the backend
 */
export async function verifyToken(token: string): Promise<PortalTokenPayload> {
  return backendFetch<PortalTokenPayload>('v1/portal/auth/verify', {
    method: 'POST',
    body: JSON.stringify({ token }),
  });
}

// =============================================================================
// Authentication Functions
// =============================================================================

/**
 * Authenticate a customer portal user via backend
 */
export async function authenticateCustomer(
  credentials: LoginCredentials
): Promise<{ user: PortalUser; token: string }> {
  return backendFetch<{ user: PortalUser; token: string }>('v1/portal/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  });
}

/**
 * Register a new customer portal user via backend
 */
export async function registerCustomer(
  data: RegistrationData
): Promise<{ user: PortalUser; token: string }> {
  return backendFetch<{ user: PortalUser; token: string }>('v1/portal/auth/register', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Get current customer from token via backend
 */
export async function getCurrentCustomer(token: string): Promise<PortalUser> {
  return backendFetch<PortalUser>('v1/portal/auth/me', {
    method: 'GET',
    token,
  });
}

/**
 * Verify customer has access to a specific resource via backend
 */
export async function verifyResourceAccess(
  customerId: string,
  tenantId: string,
  resourceType: 'vehicle' | 'inspection' | 'warranty' | 'booking',
  resourceId: string
): Promise<boolean> {
  try {
    const result = await backendFetch<{ hasAccess: boolean }>(
      `v1/portal/auth/verify-access`,
      {
        method: 'POST',
        body: JSON.stringify({ customerId, tenantId, resourceType, resourceId }),
      }
    );
    return result.hasAccess;
  } catch {
    return false;
  }
}

/**
 * Get customer vehicles scoped to tenant via backend
 */
export async function getCustomerVehicles(customerId: string, tenantId: string) {
  return backendFetch<
    Array<{
      id: string;
      vin: string;
      licensePlate: string;
      make: string;
      model: string;
      year: number;
      mileage: number;
      color: string;
    }>
  >(`v1/portal/customers/${customerId}/vehicles`, {
    method: 'GET',
    headers: { 'x-tenant-id': tenantId } as Record<string, string>,
  });
}

/**
 * Get customer inspections scoped to tenant via backend
 */
export async function getCustomerInspections(customerId: string, tenantId: string) {
  return backendFetch<
    Array<{
      id: string;
      vehicleId: string;
      scheduledDate: string;
      vehicle: {
        make: string;
        model: string;
        licensePlate: string;
      };
    }>
  >(`v1/portal/customers/${customerId}/inspections`, {
    method: 'GET',
    headers: { 'x-tenant-id': tenantId } as Record<string, string>,
  });
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
};

// =============================================================================
// PortalAuthService Singleton Class (for compatibility)
// =============================================================================

export class PortalAuthService {
  private static instance: PortalAuthService;
  private token: string | null = null;
  private user: PortalUser | null = null;

  private constructor() {}

  static getInstance(): PortalAuthService {
    if (!PortalAuthService.instance) {
      PortalAuthService.instance = new PortalAuthService();
    }
    return PortalAuthService.instance;
  }

  /**
   * Initialize auth state from storage
   */
  init(): boolean {
    if (typeof window === 'undefined') return false;

    const storedToken = localStorage.getItem('portal_token');
    const storedUser = localStorage.getItem('portal_user');

    if (storedToken && storedUser) {
      this.token = storedToken;
      try {
        this.user = JSON.parse(storedUser);
        return true;
      } catch {
        this.logout();
        return false;
      }
    }

    return false;
  }

  /**
   * Login customer
   */
  async login(email: string, password: string, tenantSlug: string): Promise<PortalUser> {
    const result = await authenticateCustomer({ email, password, tenantSlug });

    this.token = result.token;
    this.user = result.user;

    if (typeof window !== 'undefined') {
      localStorage.setItem('portal_token', result.token);
      localStorage.setItem('portal_user', JSON.stringify(result.user));
    }

    return result.user;
  }

  /**
   * Logout customer
   */
  logout(): void {
    this.token = null;
    this.user = null;

    if (typeof window !== 'undefined') {
      localStorage.removeItem('portal_token');
      localStorage.removeItem('portal_user');
    }
  }

  /**
   * Check if authenticated
   */
  isAuthenticated(): boolean {
    return !!this.token && !!this.user;
  }

  /**
   * Get current user
   */
  getUser(): PortalUser | null {
    return this.user;
  }

  /**
   * Get auth token
   */
  getToken(): string | null {
    return this.token;
  }

  /**
   * Refresh current user data
   */
  async refreshUser(): Promise<PortalUser | null> {
    if (!this.token) return null;

    try {
      const user = await getCurrentCustomer(this.token);
      this.user = user;

      if (typeof window !== 'undefined') {
        localStorage.setItem('portal_user', JSON.stringify(user));
      }

      return user;
    } catch {
      this.logout();
      return null;
    }
  }
}
