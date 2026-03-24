import { NextRequest, NextResponse } from 'next/server';
import { proxyToBackend } from '@/lib/auth/backend-proxy';

export async function POST(request: NextRequest): Promise<Response> {
  const body = (await request.json()) as { email?: string };
  const { email } = body;

  if (!email) {
    return NextResponse.json(
      { error: 'Email obbligatoria' },
      { status: 400 },
    );
  }

  return proxyToBackend('auth/resend-verification', {
    method: 'POST',
    body: { email },
  });
}
