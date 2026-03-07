import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Edge runtime configuration
export const runtime = 'experimental-edge'

// Route matcher configuration
export const config = {
  matcher: [
    // API routes with edge caching
    '/api/:path*',
    // Static assets optimization
    '/_next/static/:path*',
    // Dashboard routes for prefetching
    '/dashboard/:path*',
    '/portal/:path*',
    // Exclude auth routes from aggressive caching
    '/((?!auth/mfa|api/auth).*)',
  ],
}

// Cache duration configurations (in seconds)
const CACHE_CONFIG = {
  // Static assets - long cache
  static: 'public, max-age=31536000, immutable',
  // API responses - short cache with stale-while-revalidate
  api: 'public, s-maxage=60, stale-while-revalidate=300',
  // Edge API - medium cache
  edge: 'public, s-maxage=300, stale-while-revalidate=600',
  // HTML pages - no cache for dynamic content
  html: 'public, max-age=0, must-revalidate',
  // Real-time data - no cache
  realtime: 'no-store, no-cache, must-revalidate',
}

// =============================================================================
// Tenant Configuration
// =============================================================================

const TENANT_CONFIG = {
  publicRoutes: [
    '/api/tenant/register',
    '/api/tenant/setup',
    '/api/tenant/verify',
    '/api/tenant/resolve',
    '/api/auth',
    '/api/webhooks',
    '/api/health',
    '/auth',
    '/tenant-select',
    '/subscription',
    '/setup',
    '/',
    '/_next',
    '/favicon.ico',
    '/robots.txt',
    '/billing',
    '/landing',
  ],
  cookieName: 'tenant_id',
  cookieMaxAge: 60 * 60 * 24 * 7, // 7 days
}

// =============================================================================
// Main Middleware
// =============================================================================

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const hostname = request.headers.get('host') || ''
  
  // Add security headers for all routes
  const response = NextResponse.next()
  response.headers.set('X-DNS-Prefetch-Control', 'on')
  response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'origin-when-cross-origin')
  
  // Performance headers
  response.headers.set('X-Response-Time', Date.now().toString())
  
  // =============================================================================
  // TENANT RESOLUTION
  // =============================================================================
  
  // Skip tenant resolution for public routes
  if (!isPublicRoute(pathname)) {
    const tenantResult = await resolveTenant(request, hostname)
    
    if (tenantResult.error) {
      return tenantResult.error
    }
    
    if (tenantResult.tenant) {
      // Add tenant context headers
      response.headers.set('x-tenant-id', tenantResult.tenant.id)
      response.headers.set('x-tenant-slug', tenantResult.tenant.slug)
      response.headers.set('x-tenant-tier', tenantResult.tenant.subscriptionTier)
      
      // Set tenant cookies
      response.cookies.set({
        name: TENANT_CONFIG.cookieName,
        value: tenantResult.tenant.id,
        maxAge: TENANT_CONFIG.cookieMaxAge,
        path: '/',
        sameSite: 'strict',
        secure: process.env.NODE_ENV === 'production',
      })
      
      response.cookies.set({
        name: 'tenant_slug',
        value: tenantResult.tenant.slug,
        maxAge: TENANT_CONFIG.cookieMaxAge,
        path: '/',
        sameSite: 'strict',
        secure: process.env.NODE_ENV === 'production',
      })
    }
  }
  
  // =============================================================================
  // CACHE STRATEGY
  // =============================================================================
  
  // Route-specific caching strategies
  if (pathname.startsWith('/_next/static/')) {
    // Static assets - immutable
    response.headers.set('Cache-Control', CACHE_CONFIG.static)
    response.headers.set('Vary', 'Accept-Encoding')
  } 
  else if (pathname.startsWith('/api/geo')) {
    // Geolocation API - edge cached
    response.headers.set('Cache-Control', CACHE_CONFIG.edge)
    response.headers.set('Vary', 'Accept-Language, Cloudflare-IPCountry')
  }
  else if (pathname.startsWith('/api/validate')) {
    // Validation APIs - short cache
    response.headers.set('Cache-Control', CACHE_CONFIG.api)
    response.headers.set('Vary', 'Authorization')
  }
  else if (pathname.startsWith('/api/tenant/')) {
    // Tenant APIs - no cache
    response.headers.set('Cache-Control', CACHE_CONFIG.realtime)
  }
  else if (pathname.startsWith('/api/')) {
    // General API routes - no cache for data consistency
    response.headers.set('Cache-Control', CACHE_CONFIG.realtime)
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')
  }
  else if (pathname.startsWith('/dashboard/')) {
    // Dashboard pages - allow CDN caching but revalidate
    response.headers.set('Cache-Control', 'public, max-age=0, s-maxage=60, stale-while-revalidate=300')
  }
  else if (pathname.startsWith('/portal/')) {
    // Portal pages - no cache for customer data
    response.headers.set('Cache-Control', CACHE_CONFIG.realtime)
  }
  else {
    // Default HTML pages
    response.headers.set('Cache-Control', CACHE_CONFIG.html)
  }
  
  // Add performance timing header (visible in dev)
  if (process.env.NODE_ENV === 'development') {
    response.headers.set('X-Edge-Region', process.env.VERCEL_REGION || 'local')
  }
  
  return response
}

// =============================================================================
// Helper Functions
// =============================================================================

function isPublicRoute(pathname: string): boolean {
  return TENANT_CONFIG.publicRoutes.some(route => 
    pathname === route || pathname.startsWith(`${route}/`)
  )
}

interface TenantInfo {
  id: string
  slug: string
  name: string
  status: string
  subscriptionTier: string
  subscriptionStatus: string
}

interface TenantResolutionResult {
  tenant?: TenantInfo
  error?: NextResponse
}

async function resolveTenant(request: NextRequest, hostname: string): Promise<TenantResolutionResult> {
  // Extract tenant identifier from request
  const tenantIdentifier = await extractTenantIdentifier(request, hostname)
  
  if (!tenantIdentifier) {
    // For API routes, return error
    if (request.nextUrl.pathname.startsWith('/api/')) {
      return {
        error: NextResponse.json(
          { error: { code: 'TENANT_REQUIRED', message: 'Tenant identifier is required' } },
          { status: 400 }
        )
      }
    }
    
    // For page routes, continue without tenant (will be handled by client-side)
    return {}
  }
  
  // Validate tenant
  const tenant = await validateTenant(tenantIdentifier.value, tenantIdentifier.type)
  
  if (!tenant) {
    return {
      error: NextResponse.json(
        { error: { code: 'TENANT_NOT_FOUND', message: 'Tenant not found' } },
        { status: 404 }
      )
    }
  }
  
  // Check subscription status
  const subscriptionError = checkSubscriptionStatus(tenant)
  if (subscriptionError) {
    return { error: subscriptionError }
  }
  
  return { tenant }
}

async function extractTenantIdentifier(
  request: NextRequest,
  hostname: string
): Promise<{ type: 'subdomain' | 'domain' | 'header' | 'cookie' | 'param'; value: string } | null> {
  const url = new URL(request.url)
  
  // 1. Check for custom domain
  const isLocalhost = hostname.includes('localhost') || 
                      hostname.includes('127.0.0.1') ||
                      /^\d+\.\d+\.\d+\.\d+/.test(hostname)
  
  if (!isLocalhost && !hostname.endsWith('.vercel.app')) {
    return { type: 'domain', value: hostname }
  }
  
  // 2. Check for subdomain
  const hostParts = hostname.split('.')
  if (hostParts.length >= 3 && !isLocalhost) {
    const subdomain = hostParts[0]
    const reservedSubdomains = ['www', 'api', 'app', 'admin', 'staging', 'demo']
    if (!reservedSubdomains.includes(subdomain)) {
      return { type: 'subdomain', value: subdomain }
    }
  }
  
  // 3. Check header
  const tenantHeader = request.headers.get('x-tenant-id') || 
                       request.headers.get('x-tenant-slug')
  if (tenantHeader) {
    return { type: 'header', value: tenantHeader }
  }
  
  // 4. Check cookie
  const tenantCookie = request.cookies.get(TENANT_CONFIG.cookieName)?.value ||
                       request.cookies.get('tenant_slug')?.value
  if (tenantCookie) {
    return { type: 'cookie', value: tenantCookie }
  }
  
  // 5. Check query param
  const tenantParam = url.searchParams.get('tenantId') || 
                      url.searchParams.get('tenant')
  if (tenantParam) {
    return { type: 'param', value: tenantParam }
  }
  
  return null
}

async function validateTenant(
  identifier: string,
  type: 'subdomain' | 'domain' | 'header' | 'cookie' | 'param'
): Promise<TenantInfo | null> {
  try {
    // Use internal API route instead of external backend
    const { getTenantByIdentifier } = await import('@/lib/tenant/server')
    
    const tenant = await getTenantByIdentifier(identifier, type)
    
    if (tenant) {
      return {
        id: tenant.id,
        slug: tenant.slug,
        name: tenant.name,
        status: tenant.status,
        subscriptionTier: tenant.subscriptionTier,
        subscriptionStatus: tenant.subscriptionStatus,
      }
    }
    
    // Development fallback
    if (process.env.NODE_ENV === 'development') {
      if (identifier === 'demo' || identifier === 'demo-tenant') {
        return {
          id: 'demo-tenant',
          slug: 'demo',
          name: 'Demo Shop',
          status: 'ACTIVE',
          subscriptionTier: 'PROFESSIONAL',
          subscriptionStatus: 'ACTIVE',
        }
      }
    }
    
    return null
  } catch (error) {
    console.error('Tenant validation error:', error)
    
    // Development fallback
    if (process.env.NODE_ENV === 'development') {
      if (identifier === 'demo' || identifier === 'demo-tenant') {
        return {
          id: 'demo-tenant',
          slug: 'demo',
          name: 'Demo Shop',
          status: 'ACTIVE',
          subscriptionTier: 'PROFESSIONAL',
          subscriptionStatus: 'ACTIVE',
        }
      }
    }
    
    return null
  }
}

function checkSubscriptionStatus(tenant: TenantInfo): NextResponse | null {
  if (tenant.status === 'SUSPENDED') {
    return NextResponse.json(
      { error: { code: 'TENANT_SUSPENDED', message: 'Account suspended. Contact support.' } },
      { status: 403 }
    )
  }
  
  if (tenant.status === 'CANCELLED') {
    return NextResponse.json(
      { error: { code: 'TENANT_CANCELLED', message: 'Account cancelled.' } },
      { status: 403 }
    )
  }
  
  if (tenant.subscriptionStatus === 'EXPIRED') {
    return NextResponse.json(
      { error: { code: 'SUBSCRIPTION_EXPIRED', message: 'Subscription expired. Please renew.' } },
      { status: 403 }
    )
  }
  
  return null
}
