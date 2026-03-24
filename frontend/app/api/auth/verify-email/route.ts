import { NextRequest, NextResponse } from 'next/server';
import { proxyToBackend } from '@/lib/auth/backend-proxy';

export async function POST(request: NextRequest): Promise<Response> {
  const body = (await request.json()) as { token?: string };
  const { token } = body;

  if (!token) {
    return NextResponse.json(
      { error: 'Token di verifica mancante' },
      { status: 400 },
    );
  }

  return proxyToBackend('auth/verify-email', {
    method: 'POST',
    body: { token },
  });
}
