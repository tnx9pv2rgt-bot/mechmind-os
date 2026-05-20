export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { BACKEND_BASE } from '@/lib/config';

const TIMEOUT_MS = 30_000;

/** GET /api/public/pay/:token -> GET /v1/public/pay/:token */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
): Promise<NextResponse> {
  const { token } = await params;
  return publicProxy(`v1/public/pay/${token}`);
}

async function publicProxy(
  backendPath: string,
  method: string = 'GET',
  body?: unknown
): Promise<NextResponse> {
  const url = `${BACKEND_BASE}/${backendPath}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
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
    console.error(`[public-proxy] ${method} ${url}:`, error);
    return NextResponse.json(
      { error: { code: 'BACKEND_UNAVAILABLE', message: 'Backend non raggiungibile' } },
      { status: 502 }
    );
  } finally {
    clearTimeout(timeoutId);
  }
}
