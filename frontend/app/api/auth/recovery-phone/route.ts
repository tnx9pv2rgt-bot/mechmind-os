import { NextRequest } from 'next/server';
import { proxyToNestJS } from '@/lib/auth/api-proxy';

export async function POST(req: NextRequest): Promise<Response> {
  const body = (await req.json()) as Record<string, unknown>;
  return proxyToNestJS({ backendPath: 'v1/auth/recovery-phone/set', method: 'POST', body });
}

export async function DELETE(): Promise<Response> {
  return proxyToNestJS({ backendPath: 'v1/auth/recovery-phone', method: 'DELETE' });
}
