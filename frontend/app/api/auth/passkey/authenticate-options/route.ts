import { proxyToBackend } from '@/lib/auth/backend-proxy';

export const dynamic = 'force-dynamic';

export async function GET(): Promise<Response> {
  return proxyToBackend('auth/passkey/authenticate-options', {
    method: 'POST',
  });
}
