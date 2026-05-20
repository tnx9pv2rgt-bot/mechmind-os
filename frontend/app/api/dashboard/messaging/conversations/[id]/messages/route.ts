import { NextRequest } from 'next/server';
import { proxyToNestJS, getQueryParams } from '@/lib/auth/api-proxy';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const query = getQueryParams(req);
  return proxyToNestJS({ backendPath: `v1/sms/conversations/${id}/messages`, params: query });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body: unknown = await req.json();
  return proxyToNestJS({ backendPath: `v1/sms/conversations/${id}/messages`, method: 'POST', body });
}
