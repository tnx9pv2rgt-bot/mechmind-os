/**
 * Portal Booking Slots API Route
 * GET: Fetch available slots for a given date + service type
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { BACKEND_BASE } from '@/lib/config';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value || cookieStore.get('portal_token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Autenticazione richiesta' } },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(request.url);
    const qs = searchParams.toString();
    const url = `${BACKEND_BASE}/v1/portal/bookings/slots${qs ? `?${qs}` : ''}`;

    const res = await fetch(url, {
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
