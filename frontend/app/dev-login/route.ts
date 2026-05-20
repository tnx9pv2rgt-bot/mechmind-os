import { NextResponse } from 'next/server';
import { BACKEND_URL } from '@/lib/config';

export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse> {
  const res = await fetch(`${BACKEND_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@demo.mechmind.it',
      password: 'Demo2026!',
      tenantSlug: 'demo',
    }),
  });

  const raw = (await res.json()) as Record<string, unknown>;
  const data = (raw.data && typeof raw.data === 'object' ? raw.data : raw) as Record<
    string,
    unknown
  >;
  const accessToken = data.accessToken as string;
  const refreshToken = data.refreshToken as string;

  let tenantId = '';
  try {
    const payload = JSON.parse(Buffer.from(accessToken.split('.')[1], 'base64url').toString()) as {
      tenantId?: string;
      sub?: string;
    };
    tenantId = payload.tenantId || payload.sub?.split(':')[1] || '';
  } catch {
    /* ignore */
  }

  const response = NextResponse.redirect(new URL('/dashboard', 'http://localhost:3000'));
  const base = { httpOnly: true, secure: false, sameSite: 'lax' as const, path: '/', maxAge: 3600 };

  response.cookies.set('auth_token', accessToken, base);
  response.cookies.set('refresh_token', refreshToken, base);
  response.cookies.set('tenant_id', tenantId, { ...base, httpOnly: false });
  response.cookies.set('tenant_slug', 'demo', { ...base, httpOnly: false });

  return response;
}
