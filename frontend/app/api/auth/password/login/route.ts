import { NextRequest } from 'next/server';
import { proxyAuthToBackend } from '@/lib/auth/backend-proxy';

export async function POST(request: NextRequest): Promise<Response> {
  const body = await request.json();
  const { email, password, tenantSlug } = body;

  return proxyAuthToBackend('auth/login', {
    method: 'POST',
    body: { email, password, tenantSlug },
  });
}
