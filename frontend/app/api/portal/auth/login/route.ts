/**
 * POST /api/portal/auth/login
 * Portal customer login — proxies to NestJS backend portal endpoint
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { BACKEND_BASE } from '@/lib/config';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: { code: 'MISSING_CREDENTIALS', message: 'Email e password sono obbligatorie' } },
        { status: 400 },
      );
    }

    const res = await fetch(`${BACKEND_BASE}/v1/auth/portal/login`, {
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

    // Unwrap backend envelope { success, data: { accessToken, refreshToken, customer } }
    const data = (raw.data && typeof raw.data === 'object' ? raw.data : raw) as Record<string, unknown>;

    if (data.accessToken) {
      const isProduction = process.env.NODE_ENV === 'production';
      const cookieOptions = {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax' as const,
        path: '/',
        maxAge: 30 * 24 * 60 * 60,
      };

      const customer = data.customer as Record<string, unknown> | undefined;

      const response = NextResponse.json({
        success: true,
        token: data.accessToken,
        customer: data.customer,
      });

      response.cookies.set('portal_token', data.accessToken as string, cookieOptions);
      if (data.refreshToken) {
        response.cookies.set('portal_refresh_token', data.refreshToken as string, cookieOptions);
      }

      if (customer?.tenantId) {
        response.cookies.set('tenant_id', customer.tenantId as string, {
          ...cookieOptions,
          httpOnly: false,
        });
      }
      if (customer?.tenantSlug) {
        response.cookies.set('tenant_slug', customer.tenantSlug as string, {
          ...cookieOptions,
          httpOnly: false,
        });
      }

      return response;
    }

    return NextResponse.json(raw, { status: res.status });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return NextResponse.json(
        { error: { code: 'BACKEND_COLD_START', message: 'Il server si sta avviando, riprova tra qualche secondo...' } },
        { status: 503 },
      );
    }

    return NextResponse.json(
      { error: { code: 'SERVER_ERROR', message: 'Errore durante il login' } },
      { status: 500 },
    );
  }
}
