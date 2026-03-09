import { NextRequest } from 'next/server';
import { proxyAuthToBackend } from '@/lib/auth/backend-proxy';

export async function POST(request: NextRequest): Promise<Response> {
  const body = await request.json();
  const { token } = body;

  return proxyAuthToBackend('auth/magic-link/verify', {
    method: 'POST',
    body: { token },
  });
}
