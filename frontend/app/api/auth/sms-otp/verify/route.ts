import { NextRequest } from 'next/server';
import { proxyAuthToBackend } from '@/lib/auth/backend-proxy';

export async function POST(req: NextRequest): Promise<Response> {
  const body = (await req.json()) as Record<string, unknown>;
  return proxyAuthToBackend('auth/sms-otp/verify', {
    method: 'POST',
    body,
  });
}
