/**
 * POST /api/portal/auth/reset-password — Request password reset
 * Proxies to backend /v1/auth/portal/forgot-password
 */

export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { BACKEND_BASE } from '@/lib/config';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: { code: 'MISSING_EMAIL', message: 'Email obbligatoria' } },
        { status: 400 }
      );
    }

    const res = await fetch(`${BACKEND_BASE}/v1/auth/portal/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: (email as string).toLowerCase().trim() }),
      signal: AbortSignal.timeout(10000),
    });

    const data: unknown = await res.json().catch(() => ({
      error: { code: 'PARSE_ERROR', message: 'Risposta server non valida' },
    }));

    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return NextResponse.json(
        { error: { code: 'BACKEND_COLD_START', message: 'Il server si sta avviando, riprova...' } },
        { status: 503 }
      );
    }

    console.error('Portal reset-password error:', error);
    return NextResponse.json(
      { error: { code: 'SERVER_ERROR', message: 'Errore durante la richiesta' } },
      { status: 502 }
    );
  }
}
