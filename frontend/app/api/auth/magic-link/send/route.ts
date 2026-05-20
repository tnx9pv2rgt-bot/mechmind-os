import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/auth/backend-proxy';

export async function POST(request: NextRequest): Promise<Response> {
  const body = await request.json();
  const { email, tenantSlug } = body;

  // tenantSlug is optional — generic login finds user by email across tenants
  const payload: Record<string, string> = { email };
  if (tenantSlug) payload.tenantSlug = tenantSlug;

  return proxyToBackend('auth/magic-link/send', {
    method: 'POST',
    body: payload,
  });
}
