import { type NextRequest, NextResponse } from 'next/server';
import { BACKEND_BASE } from '@/lib/config';

export const dynamic = 'force-dynamic';

const TIMEOUT_MS = 30_000;

/** POST /api/public/estimates/[token]/approve-all → POST /v1/public/estimates/:token/approve-all */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
): Promise<NextResponse> {
  const { token } = await params;
  const body = await request.json();
  const url = `${BACKEND_BASE}/v1/public/estimates/${token}/approve-all`;
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
      return NextResponse.json({ error: 'Server in avvio, riprova...' }, { status: 503 });
    }
    return NextResponse.json({ error: 'Backend non raggiungibile' }, { status: 502 });
  } finally {
    clearTimeout(timeoutId);
  }
}
