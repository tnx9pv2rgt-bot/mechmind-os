import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Route matcher — exclude static files, images, and public assets
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|favicon\\.svg|manifest\\.json|robots\\.txt|sw\\.js|mockServiceWorker\\.js|og-image|twitter-image).*)',
  ],
};

// =============================================================================
// Public Routes — no tenant resolution needed
// =============================================================================

const PUBLIC_ROUTES = [
  '/api/tenant',
  '/api/auth',
  '/api/webhooks',
  '/api/health',
  '/auth',
  '/tenant-select',
  '/subscription',
  '/setup',
  '/billing',
  '/landing',
  '/demo',
  '/portal/login',
  '/portal/register',
  '/portal/reset-password',
];

function isPublicRoute(pathname: string): boolean {
  if (pathname === '/') return true;
  return PUBLIC_ROUTES.some(route => pathname === route || pathname.startsWith(`${route}/`));
}

// =============================================================================
// Main Middleware — Edge-compatible (NO Prisma, NO Node.js APIs)
// =============================================================================

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Create response
  const response = NextResponse.next();

  // Security headers
  response.headers.set('X-DNS-Prefetch-Control', 'on');
  response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'origin-when-cross-origin');

  // =============================================================================
  // TENANT RESOLUTION (cookie/header only — no DB calls in middleware)
  // =============================================================================

  if (!isPublicRoute(pathname)) {
    let tenantId =
      request.cookies.get('tenant_id')?.value || request.headers.get('x-tenant-id') || '';
    let tenantSlug =
      request.cookies.get('tenant_slug')?.value || request.headers.get('x-tenant-slug') || '';
    const demoSession = request.cookies.get('demo_session')?.value;

    // Fallback: extract tenantId from JWT in auth_token cookie
    if (!tenantId) {
      const authToken = request.cookies.get('auth_token')?.value;
      if (authToken) {
        try {
          const parts = authToken.split('.');
          if (parts.length === 3) {
            const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
            if (payload.tenantId) {
              tenantId = payload.tenantId;
            } else if (payload.sub && payload.sub.includes(':')) {
              tenantId = payload.sub.split(':')[1];
            }
          }
        } catch {
          /* ignore decode errors */
        }
      }
    }

    if (tenantId) {
      response.headers.set('x-tenant-id', tenantId);
    }
    if (tenantSlug) {
      response.headers.set('x-tenant-slug', tenantSlug);
    }

    // Allow demo sessions through without tenant
    if (!tenantId && !tenantSlug && !demoSession) {
      // For API routes without tenant context, return 400
      if (pathname.startsWith('/api/') && !pathname.startsWith('/api/auth')) {
        return NextResponse.json(
          { error: { code: 'TENANT_REQUIRED', message: 'Tenant identifier is required' } },
          { status: 400 }
        );
      }
      // For page routes that require auth, redirect to login
      if (
        pathname.startsWith('/dashboard') ||
        pathname.startsWith('/portal/dashboard') ||
        pathname.startsWith('/portal/bookings') ||
        pathname.startsWith('/portal/inspections') ||
        pathname.startsWith('/portal/documents') ||
        pathname.startsWith('/portal/maintenance') ||
        pathname.startsWith('/portal/settings') ||
        pathname.startsWith('/portal/warranty')
      ) {
        const loginUrl = new URL('/auth', request.url);
        loginUrl.searchParams.set('redirect', pathname);
        return NextResponse.redirect(loginUrl);
      }
    }
  }

  // =============================================================================
  // CACHE STRATEGY
  // =============================================================================

  if (pathname.startsWith('/api/')) {
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
  } else if (pathname.startsWith('/dashboard/') || pathname.startsWith('/portal/')) {
    response.headers.set('Cache-Control', 'public, max-age=0, must-revalidate');
  } else {
    response.headers.set('Cache-Control', 'public, max-age=0, must-revalidate');
  }

  return response;
}
