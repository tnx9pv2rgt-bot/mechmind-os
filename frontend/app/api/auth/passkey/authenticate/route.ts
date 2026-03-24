/**
 * POST /api/auth/passkey/authenticate
 * Verifica l'autenticazione con passkey — proxies to NestJS backend
 * Sets auth + tenant cookies on success.
 */

export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { proxyAuthToBackend } from '@/lib/auth/backend-proxy';

export async function POST(request: NextRequest): Promise<Response> {
  const body = await request.json();
  return proxyAuthToBackend('auth/passkey/authenticate', {
    method: 'POST',
    body,
  });
}
