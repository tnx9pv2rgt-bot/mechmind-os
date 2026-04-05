import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { BACKEND_BASE } from '@/lib/config';

export const dynamic = 'force-dynamic';

export async function GET(_request: NextRequest): Promise<NextResponse> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('portal_token')?.value || cookieStore.get('auth_token')?.value;
    if (!token) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Autenticazione richiesta' } },
        { status: 401 },
      );
    }

    const res = await fetch(`${BACKEND_BASE}/v1/portal/tracking`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({ error: 'Errore backend' }));
      return NextResponse.json(data, { status: res.status });
    }

    return NextResponse.json(await res.json());
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return NextResponse.json(
        { error: { code: 'BACKEND_COLD_START', message: 'Server in avvio, riprova...' } },
        { status: 503 },
      );
    }
    return NextResponse.json(
      { error: { code: 'BACKEND_UNAVAILABLE', message: 'Backend non raggiungibile' } },
      { status: 502 },
    );
  }
}
