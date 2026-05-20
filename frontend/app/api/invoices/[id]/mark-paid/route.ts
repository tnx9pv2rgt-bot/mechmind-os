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
    signal: AbortSignal.timeout(15000),
  });

  const json = await res.json();
  return NextResponse.json(json, { status: res.status });
}

/** POST /api/invoices/[id]/mark-paid → POST /v1/invoices/:id/mark-paid */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  return proxyToBackend(`/v1/invoices/${id}/mark-paid`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
