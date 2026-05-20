import { NextRequest, NextResponse } from 'next/server';
import { BACKEND_BASE } from '@/lib/config';

export const dynamic = 'force-dynamic';

/**
 * GET /api/auth/check-slug?slug=xxx
 *
 * Checks if a tenant slug is available for registration.
 * Proxies to the backend; if the backend endpoint doesn't exist yet,
 * returns available: true as a safe default (the backend will validate
 * during actual registration).
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const slug = request.nextUrl.searchParams.get('slug');

  if (!slug || slug.length < 3) {
    return NextResponse.json({ available: false, error: 'Minimo 3 caratteri' }, { status: 400 });
  }

  try {
    const backendUrl = `${BACKEND_BASE}/v1/auth/check-slug?slug=${encodeURIComponent(slug)}`;
    const res = await fetch(backendUrl, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(5000),
    });

    if (res.ok) {
      const data = (await res.json()) as { available?: boolean };
      return NextResponse.json({ available: data.available ?? true });
    }

    // Backend endpoint doesn't exist yet — default to available
    // The actual registration will validate uniqueness
    if (res.status === 404) {
      return NextResponse.json({ available: true });
    }

    return NextResponse.json({ available: true });
  } catch {
    // Backend unreachable — default to available, registration will catch duplicates
    return NextResponse.json({ available: true });
  }
}
