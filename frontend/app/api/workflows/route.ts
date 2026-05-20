import { NextRequest } from 'next/server';
import { proxyToNestJS, getQueryParams } from '@/lib/auth/api-proxy';

export async function GET(req: NextRequest): Promise<Response> {
  const params = getQueryParams(req);
  return proxyToNestJS({ backendPath: 'v1/workflows', params });
}

export async function POST(req: NextRequest): Promise<Response> {
  const body = await req.json();
  return proxyToNestJS({
    backendPath: 'v1/workflows',
    method: 'POST',
    body,
  });
}
