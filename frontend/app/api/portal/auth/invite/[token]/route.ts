/**
 * GET /api/portal/auth/invite/[token] — Get invitation details
 * Proxies to backend /v1/auth/invite/:token
 */

export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { BACKEND_BASE } from '@/lib/config';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
): Promise<NextResponse> {
  const { token } = await params;

  try {
    const res = await fetch(`${BACKEND_BASE}/v1/auth/invite/${token}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
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

    console.error('Portal invite details error:', error);
    return NextResponse.json(
      { error: { code: 'SERVER_ERROR', message: 'Errore nel caricamento dell\'invito' } },
      { status: 502 }
    );
  }
}
