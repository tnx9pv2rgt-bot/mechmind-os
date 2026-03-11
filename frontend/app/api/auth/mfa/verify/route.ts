import { NextRequest } from 'next/server';
import { proxyAuthToBackend } from '@/lib/auth/backend-proxy';

export async function POST(request: NextRequest): Promise<Response> {
  const body = (await request.json()) as Record<string, unknown>;

  return proxyAuthToBackend('auth/mfa/verify', {
    method: 'POST',
    body,
  });
}
