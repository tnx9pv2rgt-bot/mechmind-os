/**
 * Portal Login API Route
 * Proxies customer authentication to the NestJS backend.
 * On success, sets HttpOnly cookies for portal_token and tenant context.
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { BACKEND_BASE } from '@/lib/config';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { email, password, tenantSlug } = body;

    // Validation
    if (!email || !password) {
      return NextResponse.json(
        {
          error: {
            code: 'MISSING_CREDENTIALS',
            message: 'Email e password sono obbligatorie',
          },
        },
        { status: 400 }
      );
    }

    // Proxy to backend auth endpoint
    const res = await fetch(`${BACKEND_BASE}/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      signal: AbortSignal.timeout(15000),
    });

    const raw = (await res.json().catch(() => ({
      error: { code: 'PARSE_ERROR', message: 'Risposta server non valida' },
    }))) as Record<string, unknown>;

    if (!res.ok) {
      return NextResponse.json(raw, { status: res.status });
    }

    // Unwrap backend envelope { success, data: { accessToken, refreshToken, ... } }
    const data = (raw.data && typeof raw.data === 'object' ? raw.data : raw) as Record<
      string,
      unknown
    >;

    // If the backend returned tokens, set HttpOnly cookies
    if (data.accessToken) {
      let tenantId = '';
      try {
        const parts = (data.accessToken as string).split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf-8')) as {
            tenantId?: string;
            sub?: string;
            customerId?: string;
          };
          tenantId = payload.tenantId || '';
          if (!tenantId && payload.sub) {
            const subParts = payload.sub.split(':');
            if (subParts.length >= 2) tenantId = subParts[1];
          }
        }
      } catch {
        /* ignore decode errors */
      }

      const isProduction = process.env.NODE_ENV === 'production';
      const cookieOptions = {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax' as const,
        path: '/',
      };

      const response = NextResponse.json({
        success: true,
        data: {
          accessToken: data.accessToken,
          user: data.user,
        },
      });

      response.cookies.set('portal_token', data.accessToken as string, {
        ...cookieOptions,
        maxAge: 30 * 24 * 60 * 60, // 30 days
      });

      if (data.refreshToken) {
        response.cookies.set('portal_refresh_token', data.refreshToken as string, {
          ...cookieOptions,
          maxAge: 30 * 24 * 60 * 60,
        });
      }

      if (tenantId) {
        response.cookies.set('tenant_id', tenantId, {
          ...cookieOptions,
          httpOnly: false,
        });
      }

      if (tenantSlug) {
        response.cookies.set('tenant_slug', tenantSlug as string, {
          ...cookieOptions,
          httpOnly: false,
        });
      }

      return response;
    }

    // Fallback: return raw response (e.g. MFA required)
    return NextResponse.json(raw, { status: res.status });
  } catch (error) {
    console.error('Portal login error:', error);

    if (error instanceof DOMException && error.name === 'AbortError') {
      return NextResponse.json(
        {
          error: {
            code: 'BACKEND_COLD_START',
            message: 'Il server si sta avviando, riprova tra qualche secondo...',
          },
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        error: {
          code: 'SERVER_ERROR',
          message: 'Errore durante il login',
        },
      },
      { status: 500 }
    );
  }
}
