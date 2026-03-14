/**
 * Portal Authentication Client-Side Service
 *
 * Client-safe auth service that uses localStorage.
 * Does NOT import Prisma or server-only modules.
 *
 * For server-side auth functions (Prisma queries), use portal-auth.ts
 */

// =============================================================================
// Types (duplicated from portal-auth.ts to avoid importing server-only code)
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

// =============================================================================
// PortalAuthService Singleton Class (client-side only)
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
   * Store auth result after login (called from API route handlers)
   */
  setAuth(token: string, user: PortalUser): void {
    this.token = token
    this.user = user

    if (typeof window !== 'undefined') {
      localStorage.setItem('portal_token', token)
      localStorage.setItem('portal_user', JSON.stringify(user))
    }
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
}
