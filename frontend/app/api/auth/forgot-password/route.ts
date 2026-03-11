import { NextRequest, NextResponse } from 'next/server';
import { proxyToBackend } from '@/lib/auth/backend-proxy';

export async function POST(request: NextRequest): Promise<Response> {
  const body = (await request.json()) as { email?: string };
  const { email } = body;

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json(
      { error: { code: 'INVALID_EMAIL', message: 'Email non valida' } },
      { status: 400 },
    );
  }

  return proxyToBackend('auth/forgot-password', {
    method: 'POST',
    body: { email },
  });
}
