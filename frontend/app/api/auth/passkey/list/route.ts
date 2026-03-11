import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/auth/backend-proxy';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest): Promise<Response> {
  const authHeader = request.headers.get('authorization') || '';

  return proxyToBackend('auth/passkey/list', {
    method: 'GET',
    headers: { Authorization: authHeader },
  });
}
