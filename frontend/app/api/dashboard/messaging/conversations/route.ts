import { NextRequest } from 'next/server';
import { proxyToNestJS, getQueryParams } from '@/lib/auth/api-proxy';

export async function GET(req: NextRequest) {
  const params = getQueryParams(req);
  return proxyToNestJS({ backendPath: 'v1/sms/conversations', params });
}

export async function POST(req: NextRequest) {
  const body: unknown = await req.json();
  return proxyToNestJS({ backendPath: 'v1/sms/conversations', method: 'POST', body });
}
