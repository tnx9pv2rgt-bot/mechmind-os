export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { BACKEND_BASE } from '@/lib/config';

async function getToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get('auth_token')?.value || cookieStore.get('portal_token')?.value;
}

async function proxyToBackend(path: string, options?: RequestInit): Promise<NextResponse> {
  const token = await getToken();
  if (!token) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const res = await fetch(`${BACKEND_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options?.headers || {}),
    },
    signal: AbortSignal.timeout(30000),
  });

  const json = await res.json();
  return NextResponse.json(json, { status: res.status });
}

/** POST /api/gdpr/export → POST /v1/gdpr/export */
export async function POST() {
  return proxyToBackend('/v1/gdpr/export', { method: 'POST' });
}

/** GET /api/gdpr/export?requestId=xxx → GET /v1/gdpr/export/:requestId/status */
export async function GET(req: NextRequest) {
  const requestId = req.nextUrl.searchParams.get('requestId');
  if (!requestId) {
    return NextResponse.json({ error: 'requestId richiesto' }, { status: 400 });
  }
  return proxyToBackend(`/v1/gdpr/export/${requestId}/status`, { method: 'GET' });
}
