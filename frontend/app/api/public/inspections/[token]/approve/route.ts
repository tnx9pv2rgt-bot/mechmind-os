export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { BACKEND_BASE } from '@/lib/config';

const TIMEOUT_MS = 30_000;

/** POST /api/public/inspections/:token/approve -> POST /v1/public/inspections/:token/approve */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
): Promise<NextResponse> {
  const { token } = await params;
  const body = await req.json();
  const url = `${BACKEND_BASE}/v1/public/inspections/${token}/approve`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    const data: unknown = await res.json().catch(() => ({ error: 'Invalid JSON response' }));
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return NextResponse.json(
        { error: { code: 'BACKEND_COLD_START', message: 'Server in avvio, riprova...' } },
        { status: 503 }
      );
    }
    console.error(`[public-proxy] POST ${url}:`, error);
    return NextResponse.json(
      { error: { code: 'BACKEND_UNAVAILABLE', message: 'Backend non raggiungibile' } },
      { status: 502 }
    );
  } finally {
    clearTimeout(timeoutId);
  }
}
