import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/auth/backend-proxy';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest): Promise<Response> {
  // Support both Authorization header and auth_token cookie
  const authHeader = request.headers.get('authorization') || '';
  const authCookie = request.cookies.get('auth_token')?.value;
  const authorization = authHeader || (authCookie ? `Bearer ${authCookie}` : '');

  return proxyToBackend('auth/passkey/register-options', {
    method: 'POST',
    headers: { Authorization: authorization },
  });
}
