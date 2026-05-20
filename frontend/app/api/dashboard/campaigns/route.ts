import { NextRequest } from 'next/server';
import { proxyToNestJS, getQueryParams } from '@/lib/auth/api-proxy';

export async function GET(req: NextRequest) {
  const params = getQueryParams(req);
  return proxyToNestJS({ backendPath: 'v1/campaigns', params });
}

export async function POST(req: NextRequest) {
  const body: unknown = await req.json();
  return proxyToNestJS({ backendPath: 'v1/campaigns', method: 'POST', body });
}
