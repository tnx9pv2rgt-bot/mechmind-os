import { NextRequest } from 'next/server';
import { proxyAuthToBackend } from '@/lib/auth/backend-proxy';

export async function POST(request: NextRequest): Promise<Response> {
  const body = await request.json();

  return proxyAuthToBackend('auth/oauth/google', {
    method: 'POST',
    body,
  });
}
