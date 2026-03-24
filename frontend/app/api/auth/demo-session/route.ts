import { NextResponse } from 'next/server';
import { BACKEND_URL } from '@/lib/config';

export const dynamic = 'force-dynamic';

const DEMO_MAX_AGE = 3600; // 1 hour

/**
 * POST /api/auth/demo-session
 * Authenticates with demo credentials, sets auth + demo cookies.
 */
export async function POST(): Promise<NextResponse> {
  try {
    const res = await fetch(`${BACKEND_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@demo.mechmind.it',
        password: process.env.DEMO_PASSWORD || 'Demo2026!',
        tenantSlug: 'demo',
      }),
    });

    const raw = (await res.json()) as Record<string, unknown>;
    if (!res.ok) {
      return NextResponse.json(
        { success: false, error: 'Credenziali demo non valide o backend non pronto' },
        { status: 502 },
      );
    }

    const data = (raw.data && typeof raw.data === 'object' ? raw.data : raw) as Record<
      string,
      unknown
    >;
    const accessToken = data.accessToken as string | undefined;
    const refreshToken = data.refreshToken as string | undefined;

    if (!accessToken) {
      return NextResponse.json({ success: false, error: 'No token received' }, { status: 500 });
    }

    let tenantId = '';
    try {
      const parts = accessToken.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf-8')) as {
          tenantId?: string;
          sub?: string;
        };
        tenantId = payload.tenantId || '';
        if (!tenantId && payload.sub) {
          const subParts = payload.sub.split(':');
          if (subParts.length >= 2) tenantId = subParts[1];
        }
      }
    } catch {
      /* ignore */
    }

    const response = NextResponse.json({ success: true, demo: true });
    const isProduction = process.env.NODE_ENV === 'production';
    const cookieBase = { secure: isProduction, sameSite: 'lax' as const, path: '/' };

    response.cookies.set('auth_token', accessToken, {
      ...cookieBase,
      httpOnly: true,
      maxAge: DEMO_MAX_AGE,
    });
    if (refreshToken) {
      response.cookies.set('refresh_token', refreshToken, {
        ...cookieBase,
        httpOnly: true,
        maxAge: DEMO_MAX_AGE,
      });
    }
    response.cookies.set('demo_session', '1', {
      ...cookieBase,
      httpOnly: true,
      maxAge: DEMO_MAX_AGE,
    });
    if (tenantId) {
      response.cookies.set('tenant_id', tenantId, {
        ...cookieBase,
        httpOnly: false,
        maxAge: DEMO_MAX_AGE,
      });
    }
    response.cookies.set('tenant_slug', 'demo', {
      ...cookieBase,
      httpOnly: false,
      maxAge: DEMO_MAX_AGE,
    });

    return response;
  } catch {
    return NextResponse.json({ success: false, error: 'Backend unavailable' }, { status: 502 });
  }
}

export async function DELETE(): Promise<NextResponse> {
  const response = NextResponse.json({ success: true });
  response.cookies.set('demo_session', '', { path: '/', maxAge: 0 });
  response.cookies.set('auth_token', '', { path: '/', maxAge: 0 });
  response.cookies.set('refresh_token', '', { path: '/', maxAge: 0 });
  response.cookies.set('tenant_id', '', { path: '/', maxAge: 0 });
  response.cookies.set('tenant_slug', '', { path: '/', maxAge: 0 });
  return response;
}
