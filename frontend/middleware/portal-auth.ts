/**
 * Portal Authentication Middleware
 * Protects portal routes and ensures data isolation
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// ============================================
// CONFIGURATION
// ============================================

const PORTAL_ROUTES = {
  protected: ['/portal/dashboard', '/portal/bookings', '/portal/inspections', '/portal/documents', '/portal/maintenance', '/portal/warranty', '/portal/settings'],
  public: ['/portal/login', '/portal/register', '/portal/reset-password'],
  api: ['/api/portal'],
}

const TOKEN_KEY = 'portal_token'

// ============================================
// TOKEN EXTRACTION
// ============================================

function extractToken(request: NextRequest): string | null {
  // Check Authorization header
  const authHeader = request.headers.get('Authorization')
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7)
  }

  // Check cookies
  const token = request.cookies.get(TOKEN_KEY)?.value
  if (token) {
    return token
  }

  return null
}

// ============================================
// TOKEN VERIFICATION
// ============================================

interface TokenPayload {
  customerId: string
  email: string
  exp: number
  iat: number
}

async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    // In production, this should verify the JWT signature with your secret key
    // For now, we decode and check expiration
    const base64Url = token.split('.')[1]
    if (!base64Url) return null

    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    )

    const payload = JSON.parse(jsonPayload) as TokenPayload

    // Check expiration
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      return null
    }

    return payload
  } catch {
    return null
  }
}

// ============================================
// ROUTE MATCHING
// ============================================

function isProtectedRoute(pathname: string): boolean {
  return PORTAL_ROUTES.protected.some(route => pathname.startsWith(route))
}

function isPublicRoute(pathname: string): boolean {
  return PORTAL_ROUTES.public.some(route => pathname.startsWith(route))
}

function isApiRoute(pathname: string): boolean {
  return PORTAL_ROUTES.api.some(route => pathname.startsWith(route))
}

// ============================================
// MIDDLEWARE
// ============================================

export async function portalMiddleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Only process portal routes
  if (!pathname.startsWith('/portal') && !pathname.startsWith('/api/portal')) {
    return NextResponse.next()
  }

  // Extract and verify token
  const token = extractToken(request)
  const payload = token ? await verifyToken(token) : null

  // ============================================
  // PUBLIC ROUTES (login, register)
  // ============================================

  if (isPublicRoute(pathname)) {
    // If already authenticated, redirect to dashboard
    if (payload) {
      return NextResponse.redirect(new URL('/portal/dashboard', request.url))
    }
    return NextResponse.next()
  }

  // ============================================
  // PROTECTED ROUTES
  // ============================================

  if (isProtectedRoute(pathname)) {
    // Not authenticated - redirect to login
    if (!payload) {
      const loginUrl = new URL('/portal/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }

    // Add customer ID to headers for downstream use
    const response = NextResponse.next()
    response.headers.set('X-Customer-Id', payload.customerId)
    response.headers.set('X-Customer-Email', payload.email)

    return response
  }

  // ============================================
  // API ROUTES - Data Isolation
  // ============================================

  if (isApiRoute(pathname)) {
    // Public API routes (login, register) don't require auth
    if (pathname.includes('/auth/')) {
      return NextResponse.next()
    }

    // Not authenticated - return 401
    if (!payload) {
      return new NextResponse(
        JSON.stringify({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } }),
        { 
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    // Check route parameter for data isolation
    // If URL has customerId param, verify it matches authenticated user
    const customerIdMatch = pathname.match(/\/api\/portal\/customers\/([^\/]+)/)
    if (customerIdMatch) {
      const requestedCustomerId = customerIdMatch[1]
      
      // Customer can only access their own data
      if (requestedCustomerId !== payload.customerId) {
        return new NextResponse(
          JSON.stringify({ error: { code: 'FORBIDDEN', message: 'Access denied to this resource' } }),
          { 
            status: 403,
            headers: { 'Content-Type': 'application/json' }
          }
        )
      }
    }

    // Add customer context to headers
    const response = NextResponse.next()
    response.headers.set('X-Customer-Id', payload.customerId)
    response.headers.set('X-Customer-Email', payload.email)

    return response
  }

  return NextResponse.next()
}

// ============================================
// CONFIG
// ============================================

export const config = {
  matcher: ['/portal/:path*', '/api/portal/:path*'],
}

// ============================================
// HELPER FUNCTIONS FOR API ROUTES
// ============================================

export function getCustomerIdFromRequest(request: Request): string | null {
  // First check header from middleware
  const customerId = request.headers.get('X-Customer-Id')
  if (customerId) {
    return customerId
  }

  // Fallback: extract from Authorization header
  const authHeader = request.headers.get('Authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7)
    try {
      const base64Url = token.split('.')[1]
      if (!base64Url) return null

      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      )

      const payload = JSON.parse(jsonPayload)
      return payload.customerId || null
    } catch {
      return null
    }
  }

  return null
}

export function requireAuth(request: Request): { customerId: string; email: string } {
  const customerId = getCustomerIdFromRequest(request)
  const email = request.headers.get('X-Customer-Email')

  if (!customerId) {
    throw new Error('UNAUTHORIZED')
  }

  return { customerId, email: email || '' }
}

export function verifyCustomerAccess(request: Request, requestedCustomerId: string): void {
  const { customerId } = requireAuth(request)

  if (customerId !== requestedCustomerId) {
    throw new Error('FORBIDDEN')
  }
}

// ============================================
// ERROR RESPONSES
// ============================================

export function unauthorizedResponse(): Response {
  return new Response(
    JSON.stringify({ 
      error: { 
        code: 'UNAUTHORIZED', 
        message: 'Authentication required. Please log in.' 
      } 
    }),
    { 
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    }
  )
}

export function forbiddenResponse(): Response {
  return new Response(
    JSON.stringify({ 
      error: { 
        code: 'FORBIDDEN', 
        message: 'You do not have permission to access this resource.' 
      } 
    }),
    { 
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    }
  )
}

export function notFoundResponse(resource: string = 'Resource'): Response {
  return new Response(
    JSON.stringify({ 
      error: { 
        code: 'NOT_FOUND', 
        message: `${resource} not found.` 
      } 
    }),
    { 
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    }
  )
}

export function serverErrorResponse(message: string = 'Internal server error'): Response {
  return new Response(
    JSON.stringify({ 
      error: { 
        code: 'SERVER_ERROR', 
        message 
      } 
    }),
    { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    }
  )
}
