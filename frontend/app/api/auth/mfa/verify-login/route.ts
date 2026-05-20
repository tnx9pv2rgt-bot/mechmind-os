import { NextRequest, NextResponse } from 'next/server';
import { BACKEND_URL } from '@/lib/config';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = (await request.json()) as {
      tempToken?: string;
      token?: string;
      isBackupCode?: boolean;
    };

    const { tempToken, token, isBackupCode } = body;

    if (!tempToken || !token) {
      return NextResponse.json(
        { error: 'Token e codice sono obbligatori' },
        { status: 400 },
      );
    }

    const res = await fetch(`${BACKEND_URL}/auth/mfa/verify-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tempToken, token, isBackupCode }),
      signal: AbortSignal.timeout(30_000),
    });

    const raw = (await res.json()) as Record<string, unknown>;

    if (!res.ok) {
      return NextResponse.json(
        {
          error: (raw.message as string) || 'Codice non valido',
          remainingAttempts: raw.remainingAttempts,
        },
        { status: res.status },
      );
    }

    // Unwrap backend envelope
    const data = (raw.data && typeof raw.data === 'object' ? raw.data : raw) as Record<
      string,
      unknown
    >;

    if (data.accessToken) {
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
          if (!tenantId && payload.sub) {
            const subParts = payload.sub.split(':');
            if (subParts.length >= 2) tenantId = subParts[1];
          }
        }
      } catch {
        /* ignore decode errors */
      }

      // Fallback: try getting slug from response data
      if (!tenantSlug && data.tenantSlug) {
        tenantSlug = data.tenantSlug as string;
      }
      if (!tenantSlug && data.tenant && typeof data.tenant === 'object') {
        tenantSlug = (data.tenant as Record<string, unknown>).slug as string || '';
      }

      const isProduction = process.env.NODE_ENV === 'production';
      const cookieOptions = {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax' as const,
        path: '/',
      };

      const response = NextResponse.json({ success: true });

      response.cookies.set('auth_token', data.accessToken as string, {
        ...cookieOptions,
        maxAge: (data.expiresIn as number) || 86400,
      });

      if (data.refreshToken) {
        response.cookies.set('refresh_token', data.refreshToken as string, {
          ...cookieOptions,
          maxAge: 7 * 24 * 60 * 60,
        });
      }

      if (tenantId) {
        response.cookies.set('tenant_id', tenantId, {
          ...cookieOptions,
          httpOnly: false,
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

    return NextResponse.json(raw, { status: res.status });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return NextResponse.json(
        { error: 'Il server si sta avviando, riprova...' },
        { status: 503 },
      );
    }

    return NextResponse.json(
      { error: 'Servizio temporaneamente non disponibile' },
      { status: 502 },
    );
  }
}
