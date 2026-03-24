import { NextRequest } from 'next/server';
import { proxyToNestJS } from '@/lib/auth/api-proxy';

export async function POST(req: NextRequest): Promise<Response> {
  const body = (await req.json()) as Record<string, unknown>;
  return proxyToNestJS({ backendPath: 'v1/auth/sms-otp/send', method: 'POST', body });
}
