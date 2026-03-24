/**
 * Portal Messages API Route
 * GET: List messages between customer and shop
 * POST: Send a new message
 */

export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { BACKEND_BASE } from '@/lib/config';

async function getToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get('auth_token')?.value || cookieStore.get('portal_token')?.value || null;
}

export async function GET(): Promise<NextResponse> {
  try {
    const token = await getToken();
    if (!token) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Autenticazione richiesta' } },
        { status: 401 },
      );
    }

    const res = await fetch(`${BACKEND_BASE}/v1/portal/messages`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      const data: unknown = await res.json().catch(() => ({ error: 'Errore backend' }));
      return NextResponse.json(data, { status: res.status });
    }

    const json = await res.json();
    return NextResponse.json({ success: true, data: json.data || json || [] });
  } catch {
    return NextResponse.json(
      { error: { code: 'BACKEND_UNAVAILABLE', message: 'Backend non raggiungibile' } },
      { status: 502 },
    );
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const token = await getToken();
    if (!token) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Autenticazione richiesta' } },
        { status: 401 },
      );
    }

    const body = await request.json();

    const res = await fetch(`${BACKEND_BASE}/v1/portal/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10000),
    });

    const data: unknown = await res.json().catch(() => ({ error: 'Risposta non valida' }));
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json(
      { error: { code: 'BACKEND_UNAVAILABLE', message: 'Backend non raggiungibile' } },
      { status: 502 },
    );
  }
}
