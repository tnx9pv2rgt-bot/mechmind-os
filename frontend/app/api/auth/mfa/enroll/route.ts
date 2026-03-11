import { NextRequest, NextResponse } from 'next/server';
import { proxyToBackend } from '@/lib/auth/backend-proxy';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest): Promise<Response> {
  // Forward auth cookie to backend
  const authToken = request.cookies.get('auth_token')?.value;

  if (!authToken) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Sessione non valida. Effettua il login.' } },
      { status: 401 },
    );
  }

  return proxyToBackend('auth/mfa/enroll', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
  });
}
