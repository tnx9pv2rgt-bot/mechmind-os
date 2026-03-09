import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/auth/backend-proxy';

export async function POST(request: NextRequest): Promise<Response> {
  const authHeader = request.headers.get('authorization') || '';

  return proxyToBackend('auth/passkey/register-options', {
    method: 'POST',
    headers: { Authorization: authHeader },
  });
}
