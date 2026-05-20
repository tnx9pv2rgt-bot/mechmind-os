import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Route matcher — exclude static files, images, and public assets
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|favicon\\.svg|manifest\\.json|robots\\.txt|sw\\.js|mockServiceWorker\\.js|og-image|twitter-image|api).*)',
  ],
};

// Supported locales for i18n
const LOCALES = ['it', 'en', 'de'];
const DEFAULT_LOCALE = 'it';

// =============================================================================
// Route Classification
// =============================================================================

/** Routes that require NO authentication at all */
const PUBLIC_PATHS = [
  '/auth',
  '/portal/login',
  '/portal/register',
  '/portal/reset-password',
  '/portal/invite',
  '/onboarding',
  '/demo',
  '/landing',
  '/terms',
  '/privacy',
  '/api/auth',
  '/api/webhooks',
  '/api/health',
  '/api/tenant',
  '/_next',
  '/favicon.ico',
  '/tenant-select',
  '/subscription',
  '/setup',
  '/billing',
];

function isPublicPath(pathname: string): boolean {
  if (pathname === '/') return true;
  return PUBLIC_PATHS.some(route => pathname === route || pathname.startsWith(`${route}/`));
}

function isDashboardPath(pathname: string): boolean {
  return pathname.startsWith('/dashboard');
}

function isPortalPath(pathname: string): boolean {
  return pathname.startsWith('/portal') && !isPublicPath(pathname);
}

// =============================================================================
// Main Middleware — Edge-compatible (NO Prisma, NO Node.js APIs)
// =============================================================================

export function proxy(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;
  const isDev = process.env.NODE_ENV !== 'production';

  // =========================================================================
  // CSP nonce — generated per-request for script-src strict-dynamic
  // =========================================================================
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');

  const cspHeader = [
    "default-src 'self'",
    // Hashes per inline scripts non-nonceable:
    //  - sha256-Ph/Qw... : next-themes FOUC prevention script (v0.2.x — legacy)
    //  - sha256-q1+Da... : next-themes FOUC prevention script (v0.3.x+ con enableSystem)
    //  - sha256-K1cBb... : Next.js inline error overlay (dev-only, ignorato in prod)
    `script-src 'self' 'nonce-${nonce}' 'sha256-Ph/QwnQiwklgtr/n++X4WjXCJZg7LwOQMhFEhUOkmls=' 'sha256-q1+DaXsZUnEJs3jpN9ZoWp6ypK1xBwXiRxG+C31xOUA=' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ''} https://accounts.google.com https://www.google.com https://www.gstatic.com https://js.stripe.com https://www.googletagmanager.com`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://accounts.google.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: https://*.googleusercontent.com https://*.supabase.co https://www.googletagmanager.com https://www.google-analytics.com blob:",
    "connect-src 'self' https://accounts.google.com https://*.supabase.co https://api.ipapi.co https://www.google.com https://*.upstash.io https://nexo-gestionale.onrender.com https://nexo-frontend.onrender.com https://www.google-analytics.com https://*.google-analytics.com https://www.googletagmanager.com https://*.analytics.google.com https://*.sentry.io https://sentry.io" +
      (isDev
        ? ' http://localhost:3000 http://localhost:3001 http://localhost:3002 ws://localhost:3000 ws://localhost:3001'
        : ''),
    "frame-src 'self' https://accounts.google.com https://www.google.com https://js.stripe.com https://hooks.stripe.com",
    "media-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(!isDev ? ['upgrade-insecure-requests', 'block-all-mixed-content'] : []),
  ].join('; ');

  // =========================================================================
  // i18n — Set locale cookie (no URL prefix — pages live at /dashboard, not /it/dashboard)
  // =========================================================================
  const localeCookie = request.cookies.get('NEXT_LOCALE')?.value;
  const locale = localeCookie && LOCALES.includes(localeCookie) ? localeCookie : DEFAULT_LOCALE;

  // Forward nonce to server components via request headers
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', cspHeader);

  // Create response — forward mutated request headers so layout.tsx can read nonce
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('Content-Security-Policy', cspHeader);

  if (!localeCookie) {
    response.cookies.set('NEXT_LOCALE', locale, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
    });
  }

  // =========================================================================
  // Security headers
  // =========================================================================
  // CSP is set above with per-request nonce. x-nonce already forwarded via requestHeaders.
  response.headers.set('X-DNS-Prefetch-Control', 'on');
  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=63072000; includeSubDomains; preload'
    );
  }
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'origin-when-cross-origin');

  // =========================================================================
  // AUTH GUARD — redirect unauthenticated users
  // =========================================================================

  if (!isPublicPath(pathname)) {
    const authToken = request.cookies.get('auth_token')?.value;
    const portalToken = request.cookies.get('portal_token')?.value;

    // Dashboard paths require auth_token
    if (isDashboardPath(pathname) && !authToken) {
      const loginUrl = new URL('/auth', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Portal paths require portal_token OR auth_token
    if (isPortalPath(pathname) && !portalToken && !authToken) {
      const loginUrl = new URL('/portal/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // =========================================================================
  // TENANT RESOLUTION (cookie/header only — no DB calls in middleware)
  // =========================================================================

  if (!isPublicPath(pathname)) {
    let tenantId =
      request.cookies.get('tenant_id')?.value || request.headers.get('x-tenant-id') || '';
    const tenantSlug =
      request.cookies.get('tenant_slug')?.value || request.headers.get('x-tenant-slug') || '';
    const demoSession = request.cookies.get('demo_session')?.value;

    // Fallback: extract tenantId from JWT in auth_token cookie
    if (!tenantId) {
      const authToken = request.cookies.get('auth_token')?.value;
      if (authToken) {
        try {
          const parts = authToken.split('.');
          if (parts.length === 3) {
            const payload = JSON.parse(
              atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'))
            ) as Record<string, unknown>;
            if (typeof payload.tenantId === 'string') {
              tenantId = payload.tenantId;
            } else if (typeof payload.sub === 'string' && payload.sub.includes(':')) {
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

    // Require tenant context for non-demo sessions
    if (!tenantId && !tenantSlug && !demoSession) {
      // API routes without tenant → 400
      if (
        pathname.startsWith('/api/') &&
        !pathname.startsWith('/api/auth') &&
        !pathname.startsWith('/api/portal/')
      ) {
        return NextResponse.json(
          {
            error: {
              code: 'TENANT_REQUIRED',
              message: 'Tenant identifier is required',
            },
          },
          { status: 400 }
        );
      }
      // Page routes that need tenant → redirect to auth
      if (isDashboardPath(pathname) || isPortalPath(pathname)) {
        const loginUrl = new URL('/auth', request.url);
        loginUrl.searchParams.set('redirect', pathname);
        return NextResponse.redirect(loginUrl);
      }
    }
  }

  // =========================================================================
  // CSRF — Double-Submit Cookie Pattern
  // =========================================================================

  // Set CSRF cookie if not present (on any request — the cookie is non-HttpOnly)
  if (!request.cookies.get('csrf-token')?.value) {
    const csrfBytes = new Uint8Array(32);
    crypto.getRandomValues(csrfBytes);
    const csrfToken = Array.from(csrfBytes, b => b.toString(16).padStart(2, '0')).join('');
    response.cookies.set('csrf-token', csrfToken, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60,
    });
  }

  // Validate CSRF on mutating API requests (POST/PUT/PATCH/DELETE)
  const MUTATING_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];
  const CSRF_SKIP_PATHS = [
    '/api/auth',
    '/api/portal/auth',
    '/api/webhooks',
    '/api/stripe/webhook',
    '/api/csrf',
  ];
  if (
    pathname.startsWith('/api/') &&
    MUTATING_METHODS.includes(request.method) &&
    !CSRF_SKIP_PATHS.some(p => pathname.startsWith(p))
  ) {
    const cookieToken = request.cookies.get('csrf-token')?.value;
    const headerToken = request.headers.get('x-csrf-token');

    if (!cookieToken || !headerToken || cookieToken !== headerToken) {
      return NextResponse.json(
        { error: { code: 'CSRF_INVALID', message: 'Token CSRF non valido' } },
        { status: 403 }
      );
    }
  }

  // =========================================================================
  // CACHE STRATEGY
  // =========================================================================

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
