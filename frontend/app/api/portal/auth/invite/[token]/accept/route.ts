/**
 * POST /api/portal/auth/invite/[token]/accept — Accept invitation
 * Proxies to backend /v1/auth/invite/:token/accept
 */

export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { BACKEND_BASE } from '@/lib/config';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
): Promise<NextResponse> {
  const { token } = await params;

  try {
    const body = await request.json();
    const { password } = body;

    if (!password || (password as string).length < 8) {
      return NextResponse.json(
        { error: { code: 'INVALID_PASSWORD', message: 'La password deve avere almeno 8 caratteri' } },
        { status: 400 }
      );
    }

    const res = await fetch(`${BACKEND_BASE}/v1/auth/invite/${token}/accept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
      signal: AbortSignal.timeout(15000),
    });

    const data = (await res.json().catch(() => ({
      error: { code: 'PARSE_ERROR', message: 'Risposta server non valida' },
    }))) as Record<string, unknown>;

    if (!res.ok) {
      return NextResponse.json(data, { status: res.status });
    }

    // If backend returns a token, set cookies
    const responseData = (data.data && typeof data.data === 'object' ? data.data : data) as Record<
      string,
      unknown
    >;

    if (responseData.accessToken) {
      const isProduction = process.env.NODE_ENV === 'production';
      const cookieOptions = {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax' as const,
        path: '/',
      };

      const response = NextResponse.json({ success: true, data: responseData });

      response.cookies.set('portal_token', responseData.accessToken as string, {
        ...cookieOptions,
        maxAge: 30 * 24 * 60 * 60,
      });

      if (responseData.refreshToken) {
        response.cookies.set('portal_refresh_token', responseData.refreshToken as string, {
          ...cookieOptions,
          maxAge: 30 * 24 * 60 * 60,
        });
      }

      return response;
    }

    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return NextResponse.json(
        { error: { code: 'BACKEND_COLD_START', message: 'Il server si sta avviando, riprova...' } },
        { status: 503 }
      );
    }

    console.error('Portal invite accept error:', error);
    return NextResponse.json(
      { error: { code: 'SERVER_ERROR', message: 'Errore durante l\'accettazione' } },
      { status: 502 }
    );
  }
}
