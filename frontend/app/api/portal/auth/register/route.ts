/**
 * POST /api/portal/auth/register
 * Register a new portal customer — proxies to NestJS backend portal endpoint
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { BACKEND_BASE } from '@/lib/config';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();

    const res = await fetch(`${BACKEND_BASE}/v1/auth/portal/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
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

      const response = NextResponse.json({
        success: true,
        token: data.accessToken,
        customer: data.customer,
      });

      response.cookies.set('portal_token', data.accessToken as string, cookieOptions);
      if (data.refreshToken) {
        response.cookies.set('portal_refresh_token', data.refreshToken as string, cookieOptions);
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
      { error: { code: 'SERVER_ERROR', message: 'Errore durante la registrazione' } },
      { status: 500 },
    );
  }
}
