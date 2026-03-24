import { NextResponse } from 'next/server';
import { BACKEND_URL } from '@/lib/config';

/** Timeout in ms for backend requests (Render free tier cold start ~30s) */
const BACKEND_TIMEOUT_MS = 30_000;

interface ProxyOptions {
  method: string;
  body?: Record<string, unknown>;
  headers?: Record<string, string>;
}

/**
 * Execute a fetch with AbortController timeout.
 * Returns the Response or throws on timeout/network error.
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number = BACKEND_TIMEOUT_MS,
): Promise<globalThis.Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return res;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Proxy a request to the backend NestJS API.
 * Strips the /api/auth prefix and forwards to /v1/auth/*.
 * Includes a 30-second timeout for Render cold starts.
 */
export async function proxyToBackend(
  backendPath: string,
  options: ProxyOptions,
): Promise<NextResponse> {
  const url = `${BACKEND_URL}/${backendPath}`;

  try {
    const res = await fetchWithTimeout(url, {
      method: options.method,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    const data: unknown = await res.json();

    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error(`Backend proxy error [${backendPath}]:`, error);

    if (error instanceof DOMException && error.name === 'AbortError') {
      return NextResponse.json(
        {
          error: {
            code: 'BACKEND_COLD_START',
            message: 'Il server si sta avviando, riprova tra qualche secondo...',
          },
        },
        { status: 503 },
      );
    }

    return NextResponse.json(
      {
        error: {
          code: 'BACKEND_UNAVAILABLE',
          message: 'Servizio temporaneamente non disponibile. Riprova tra qualche secondo.',
        },
      },
      { status: 502 },
    );
  }
}

/**
 * Proxy a request and set auth cookie on success.
 * Includes a 30-second timeout for Render cold starts.
 */
export async function proxyAuthToBackend(
  backendPath: string,
  options: ProxyOptions,
): Promise<NextResponse> {
  const url = `${BACKEND_URL}/${backendPath}`;

  try {
    const res = await fetchWithTimeout(url, {
      method: options.method,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    const raw = (await res.json()) as Record<string, unknown>;

    if (!res.ok) {
      return NextResponse.json(raw, { status: res.status });
    }

    // Backend wraps responses in { success, data: { ... }, timestamp }
    // Unwrap the envelope to access tokens directly
    const data = (raw.data && typeof raw.data === 'object' ? raw.data : raw) as Record<string, unknown>;

    // If response contains tokens, set HttpOnly cookies
    if (data.accessToken) {
      // Decode JWT payload to extract tenantId and tenantSlug
      let tenantId = '';
      let tenantSlug = '';
      try {
        const parts = (data.accessToken as string).split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(
            Buffer.from(parts[1], 'base64url').toString('utf-8'),
          ) as { tenantId?: string; tenantSlug?: string; sub?: string };
          tenantId = payload.tenantId || '';
          tenantSlug = payload.tenantSlug || '';
          // sub format is "userId:tenantId" — extract tenantId as fallback
          if (!tenantId && payload.sub) {
            const subParts = payload.sub.split(':');
            if (subParts.length >= 2) tenantId = subParts[1];
          }
        }
      } catch { /* ignore decode errors */ }

      // Fallback: look up slug from the login request body or response data
      if (!tenantSlug && options.body && 'tenantSlug' in options.body) {
        tenantSlug = options.body.tenantSlug as string;
      }
      if (!tenantSlug && data.tenantSlug) {
        tenantSlug = data.tenantSlug as string;
      }
      if (!tenantSlug && data.tenant && typeof data.tenant === 'object') {
        tenantSlug = (data.tenant as Record<string, unknown>).slug as string || '';
      }

      const response = NextResponse.json({
        success: true,
        expiresIn: data.expiresIn,
        requiresMFA: false,
      });

      const isProduction = process.env.NODE_ENV === 'production';
      const cookieOptions = {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax' as const,
        path: '/',
      };

      response.cookies.set('auth_token', data.accessToken as string, {
        ...cookieOptions,
        maxAge: (data.expiresIn as number) || 86400,
      });

      response.cookies.set('refresh_token', data.refreshToken as string, {
        ...cookieOptions,
        maxAge: 7 * 24 * 60 * 60, // 7 days
      });

      // Set tenant context cookies (needed by api-proxy for backend requests)
      if (tenantId) {
        response.cookies.set('tenant_id', tenantId, {
          ...cookieOptions,
          httpOnly: false, // frontend needs to read this
        });
      }
      if (tenantSlug) {
        response.cookies.set('tenant_slug', tenantSlug, {
          ...cookieOptions,
          httpOnly: false,
        });
      }

      return response;
    }

    // MFA required response (tempToken)
    if (data.tempToken) {
      return NextResponse.json({
        requiresMFA: true,
        tempToken: data.tempToken,
        methods: data.methods,
        riskLevel: data.riskLevel,
      });
    }

    return NextResponse.json(raw, { status: res.status });
  } catch (error) {
    console.error(`Backend auth proxy error [${backendPath}]:`, error);

    if (error instanceof DOMException && error.name === 'AbortError') {
      return NextResponse.json(
        {
          error: {
            code: 'BACKEND_COLD_START',
            message: 'Il server si sta avviando, riprova tra qualche secondo...',
          },
        },
        { status: 503 },
      );
    }

    return NextResponse.json(
      {
        error: {
          code: 'BACKEND_UNAVAILABLE',
          message: 'Servizio temporaneamente non disponibile. Riprova tra qualche secondo.',
        },
      },
      { status: 502 },
    );
  }
}
