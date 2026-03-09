import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/auth/backend-proxy';

export async function POST(request: NextRequest): Promise<Response> {
  const body = await request.json();
  const { email, tenantSlug } = body;

  return proxyToBackend('auth/magic-link/send', {
    method: 'POST',
    body: { email, tenantSlug },
  });
}
