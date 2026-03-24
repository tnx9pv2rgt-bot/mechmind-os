export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

import { BACKEND_BASE } from '@/lib/config';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value || cookieStore.get('portal_token')?.value;

    if (!token) {
      return NextResponse.json({ data: [] });
    }

    const res = await fetch(`${BACKEND_BASE}/v1/invoices?portal=true`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      return NextResponse.json({ data: [] });
    }

    const json = await res.json();
    return NextResponse.json({ success: true, data: json.data || json || [] });
  } catch {
    return NextResponse.json({ data: [] });
  }
}
