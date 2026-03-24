import { NextRequest } from 'next/server';
import { proxyToNestJS } from '@/lib/auth/api-proxy';

export async function POST(req: NextRequest): Promise<Response> {
  const body = await req.json();
  return proxyToNestJS({
    backendPath: 'v1/subscription/checkout-session',
    method: 'POST',
    body,
  });
}
