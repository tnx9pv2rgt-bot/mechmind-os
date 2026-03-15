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

/** GET /api/locations → GET /v1/locations */
export async function GET(_req: NextRequest) {
  const token = await getToken();
  if (!token) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const res = await fetch(`${BACKEND_URL}/v1/locations`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(15000),
    });

    const json = await res.json();
    return NextResponse.json(json, { status: res.status });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch locations' },
      { status: 502 }
    );
  }
}
