export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const BACKEND_URL = (
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  'http://localhost:3000'
)
  .replace(/\/+$/, '')
  .replace(/\/v1$/, '');

async function getToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get('auth_token')?.value || cookieStore.get('portal_token')?.value;
}

async function proxyToBackend(path: string, options?: RequestInit): Promise<NextResponse> {
  const token = await getToken();
  if (!token) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const res = await fetch(`${BACKEND_URL}${path}`, {
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

/** POST /api/invoices/[id]/send → POST /v1/invoices/:id/send */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyToBackend(`/v1/invoices/${id}/send`, { method: 'POST' });
}
