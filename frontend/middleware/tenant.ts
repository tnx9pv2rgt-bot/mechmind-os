/**
 * Multi-Tenant Middleware
 *
 * Extracts tenant from subdomain, custom domain, or headers.
 * Validates tenant subscription status.
 * Sets tenant context for downstream request handling.
 *
 * @module middleware/tenant
 * @version 1.0.0
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
  extractTenantFromRequest,
  TenantNotFoundError,
  TenantSuspendedError,
  TenantExpiredError,
} from '@/lib/tenant/context';
import { BACKEND_BASE } from '@/lib/config';

// =============================================================================
// Configuration
// =============================================================================

const CONFIG = {
  // Routes that don't require tenant context
  publicRoutes: [
    '/api/tenant/register',
    '/api/tenant/setup',
    '/api/tenant/verify',
    '/api/auth',
    '/auth',
    '/_next',
    '/favicon.ico',
    '/robots.txt',
  ],

  // Routes that bypass tenant validation
  bypassRoutes: ['/api/webhooks', '/api/health', '/api/status'],

  // Subscription tiers and their features
  tiers: {
    FREE: { maxUsers: 2, maxVehicles: 10 },
    STARTER: { maxUsers: 5, maxVehicles: 50 },
    PROFESSIONAL: { maxUsers: 20, maxVehicles: 500 },
    ENTERPRISE: { maxUsers: Infinity, maxVehicles: Infinity },
  },

  // Cookie settings
  cookieName: 'tenant_id',
  cookieMaxAge: 60 * 60 * 24 * 7, // 7 days
};

// =============================================================================
// Main Middleware Function
// =============================================================================

export async function tenantMiddleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for public and bypass routes
  if (isPublicRoute(pathname) || isBypassRoute(pathname)) {
    return NextResponse.next();
  }

  try {
    // Extract tenant identifier from request
    const tenantIdentifier = await extractTenantFromRequest(request);

    if (!tenantIdentifier) {
      // No tenant found - check if this is an API route
      if (pathname.startsWith('/api/')) {
        return createErrorResponse('TENANT_REQUIRED', 'Tenant identifier is required', 400);
      }

      // For page routes, redirect to tenant selection or onboarding
      return redirectToTenantSelection(request);
    }

    // Validate tenant with backend
    const tenant = await validateTenant(tenantIdentifier.value, tenantIdentifier.type);

    if (!tenant) {
      return createErrorResponse('TENANT_NOT_FOUND', 'Tenant not found', 404);
    }

    // Check subscription status
    const subscriptionError = checkSubscriptionStatus(tenant);
    if (subscriptionError) {
      if (pathname.startsWith('/api/')) {
        return subscriptionError;
      }
      // Redirect to subscription page for web routes
      return redirectToSubscriptionPage(request, tenant);
    }

    // Clone the response to add tenant headers
    const response = NextResponse.next();

    // Add tenant context headers for downstream use
    response.headers.set('x-tenant-id', tenant.id);
    response.headers.set('x-tenant-slug', tenant.slug);
    response.headers.set('x-tenant-tier', tenant.subscriptionTier);

    // Set tenant cookie for subsequent requests
    response.cookies.set({
      name: CONFIG.cookieName,
      value: tenant.id,
      maxAge: CONFIG.cookieMaxAge,
      path: '/',
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
    });

    // Also set slug cookie
    response.cookies.set({
      name: 'tenant_slug',
      value: tenant.slug,
      maxAge: CONFIG.cookieMaxAge,
      path: '/',
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
    });

    return response;
  } catch (error) {
    console.error('Tenant middleware error:', error);

    if (error instanceof TenantNotFoundError) {
      return createErrorResponse('TENANT_NOT_FOUND', error.message, 404);
    }

    if (error instanceof TenantSuspendedError) {
      return createErrorResponse('TENANT_SUSPENDED', error.message, 403);
    }

    if (error instanceof TenantExpiredError) {
      return createErrorResponse('TENANT_EXPIRED', error.message, 403);
    }

    return createErrorResponse('INTERNAL_ERROR', 'Failed to process tenant context', 500);
  }
}

// =============================================================================
// Helper Functions
// =============================================================================

function isPublicRoute(pathname: string): boolean {
  return CONFIG.publicRoutes.some(route => pathname === route || pathname.startsWith(`${route}/`));
}

function isBypassRoute(pathname: string): boolean {
  return CONFIG.bypassRoutes.some(route => pathname.startsWith(route));
}

function createErrorResponse(code: string, message: string, status: number): NextResponse {
  return NextResponse.json(
    {
      error: {
        code,
        message,
        timestamp: new Date().toISOString(),
      },
    },
    { status }
  );
}

function redirectToTenantSelection(request: NextRequest): NextResponse {
  // If on localhost/development, show tenant selection
  const url = request.nextUrl.clone();
  url.pathname = '/tenant-select';
  url.searchParams.set('redirect', request.nextUrl.pathname);
  return NextResponse.redirect(url);
}

function redirectToSubscriptionPage(request: NextRequest, tenant: TenantInfo): NextResponse {
  const url = request.nextUrl.clone();
  url.pathname = '/subscription';
  url.searchParams.set('tenant', tenant.slug);
  url.searchParams.set('status', tenant.subscriptionStatus);
  return NextResponse.redirect(url);
}

// =============================================================================
// Tenant Validation
// =============================================================================

interface TenantInfo {
  id: string;
  slug: string;
  name: string;
  status: string;
  subscriptionTier: string;
  subscriptionStatus: string;
  trialEndsAt?: string | null;
  subscriptionEndsAt?: string | null;
}

async function validateTenant(
  identifier: string,
  type: 'subdomain' | 'domain' | 'header' | 'cookie' | 'param'
): Promise<TenantInfo | null> {
  // In production, this would call your backend API or database
  // For now, we'll use a fetch to the tenant API

  try {
    const backendUrl = BACKEND_BASE;

    // Build query based on identifier type
    let queryParam = '';
    switch (type) {
      case 'subdomain':
        queryParam = `subdomain=${encodeURIComponent(identifier)}`;
        break;
      case 'domain':
        queryParam = `domain=${encodeURIComponent(identifier)}`;
        break;
      default:
        queryParam = `id=${encodeURIComponent(identifier)}`;
    }

    const response = await fetch(`${backendUrl}/api/tenant/resolve?${queryParam}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // Short timeout to avoid blocking requests
      signal: AbortSignal.timeout(3000),
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`Failed to validate tenant: ${response.statusText}`);
    }

    const data = await response.json();
    return data.tenant as TenantInfo;
  } catch (error) {
    // If backend is unavailable, check local cache or fallback
    console.error('Tenant validation error:', error);

    // For development: allow fallback to mock tenant
    if (process.env.NODE_ENV === 'development' && identifier === 'demo') {
      return {
        id: 'demo-tenant',
        slug: 'demo',
        name: 'Demo Shop',
        status: 'ACTIVE',
        subscriptionTier: 'PROFESSIONAL',
        subscriptionStatus: 'ACTIVE',
      };
    }

    return null;
  }
}

function checkSubscriptionStatus(tenant: TenantInfo): NextResponse | null {
  // Check if tenant is active
  if (tenant.status === 'SUSPENDED') {
    return createErrorResponse(
      'TENANT_SUSPENDED',
      'This account has been suspended. Please contact support.',
      403
    );
  }

  if (tenant.status === 'CANCELLED') {
    return createErrorResponse('TENANT_CANCELLED', 'This account has been cancelled.', 403);
  }

  // Check subscription status
  if (tenant.subscriptionStatus === 'EXPIRED') {
    const gracePeriodEnd = tenant.subscriptionEndsAt
      ? new Date(new Date(tenant.subscriptionEndsAt).getTime() + 7 * 24 * 60 * 60 * 1000)
      : null;

    if (!gracePeriodEnd || new Date() > gracePeriodEnd) {
      return createErrorResponse(
        'SUBSCRIPTION_EXPIRED',
        'Your subscription has expired. Please renew to continue.',
        403
      );
    }
  }

  if (tenant.subscriptionStatus === 'PAST_DUE') {
    // Allow access but flag for notification
    // This could set a header that the frontend checks
    return null;
  }

  // Check trial expiration
  if (tenant.subscriptionStatus === 'TRIAL' && tenant.trialEndsAt) {
    const trialEnd = new Date(tenant.trialEndsAt);
    if (new Date() > trialEnd) {
      return createErrorResponse(
        'TRIAL_EXPIRED',
        'Your trial has expired. Please upgrade to continue.',
        403
      );
    }
  }

  return null;
}

// =============================================================================
// Route Matcher Configuration
// =============================================================================

export const config = {
  matcher: [
    // Apply to all routes except static files
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)',
  ],
};

// =============================================================================
// Edge Runtime Handler
// =============================================================================

/**
 * Edge-compatible middleware handler
 * Can be used directly in middleware.ts
 */
export function createTenantMiddleware(options?: {
  publicRoutes?: string[];
  bypassRoutes?: string[];
  onTenantNotFound?: (request: NextRequest) => NextResponse;
  onSubscriptionExpired?: (request: NextRequest, tenant: TenantInfo) => NextResponse;
}) {
  const mergedConfig = {
    ...CONFIG,
    ...options,
    publicRoutes: [...CONFIG.publicRoutes, ...(options?.publicRoutes || [])],
    bypassRoutes: [...CONFIG.bypassRoutes, ...(options?.bypassRoutes || [])],
  };

  return async function (request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Check public routes
    if (mergedConfig.publicRoutes.some(route => pathname.startsWith(route))) {
      return NextResponse.next();
    }

    // Check bypass routes
    if (mergedConfig.bypassRoutes.some(route => pathname.startsWith(route))) {
      return NextResponse.next();
    }

    // Extract tenant
    const tenantIdentifier = await extractTenantFromRequest(request);

    if (!tenantIdentifier) {
      if (options?.onTenantNotFound) {
        return options.onTenantNotFound(request);
      }
      return redirectToTenantSelection(request);
    }

    // Set tenant headers
    const response = NextResponse.next();
    response.headers.set('x-tenant-identifier', tenantIdentifier.value);
    response.headers.set('x-tenant-type', tenantIdentifier.type);

    return response;
  };
}
