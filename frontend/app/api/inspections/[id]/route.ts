import { NextRequest } from 'next/server';
import { proxyToNestJS } from '@/lib/auth/api-proxy';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams): Promise<Response> {
  const { id } = await params;
  return proxyToNestJS({ backendPath: `v1/inspections/${id}` });
}

export async function PATCH(req: NextRequest, { params }: RouteParams): Promise<Response> {
  const { id } = await params;
  const body = await req.json();
  return proxyToNestJS({ backendPath: `v1/inspections/${id}`, method: 'PATCH', body });
}

export async function DELETE(req: NextRequest, { params }: RouteParams): Promise<Response> {
  const { id } = await params;
  return proxyToNestJS({ backendPath: `v1/inspections/${id}`, method: 'DELETE' });
}
