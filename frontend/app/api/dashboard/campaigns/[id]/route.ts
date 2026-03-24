import { NextRequest } from 'next/server';
import { proxyToNestJS, getQueryParams } from '@/lib/auth/api-proxy';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const query = getQueryParams(req);
  return proxyToNestJS({ backendPath: `v1/campaigns/${id}`, params: query });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body: unknown = await req.json();
  return proxyToNestJS({ backendPath: `v1/campaigns/${id}`, method: 'PUT', body });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyToNestJS({ backendPath: `v1/campaigns/${id}`, method: 'DELETE' });
}
