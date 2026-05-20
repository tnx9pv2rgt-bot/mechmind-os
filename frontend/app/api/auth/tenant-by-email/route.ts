import { NextRequest, NextResponse } from 'next/server';
import { BACKEND_BASE } from '@/lib/config';

export const dynamic = 'force-dynamic';

/**
 * GET /api/auth/tenant-by-email?email=xxx
 *
 * Proxies to the backend to find all active tenants associated with an email address.
 * Used by the two-step login UI (Step 1: email → Step 2: password + workspace).
 * Returns { tenants: [{ slug, name }] } — empty array if no tenants found.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const email = request.nextUrl.searchParams.get('email') ?? '';

  if (!email || !email.includes('@')) {
    return NextResponse.json({ tenants: [] });
  }

  try {
    const res = await fetch(
      `${BACKEND_BASE}/v1/auth/tenant-by-email?email=${encodeURIComponent(email)}`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(5000),
      }
    );

    if (!res.ok) {
      return NextResponse.json({ tenants: [] });
    }

    const raw = (await res.json()) as { tenants?: unknown; data?: { tenants?: unknown } };
    const list = Array.isArray(raw.tenants)
      ? raw.tenants
      : Array.isArray(raw.data?.tenants)
        ? raw.data.tenants
        : [];
    return NextResponse.json({ tenants: list });
  } catch {
    return NextResponse.json({ tenants: [] });
  }
}
