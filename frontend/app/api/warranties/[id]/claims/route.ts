import { NextRequest } from 'next/server';
import { proxyToNestJS, getQueryParams } from '@/lib/auth/api-proxy';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams): Promise<Response> {
  const { id } = await params;
  const queryParams = getQueryParams(req);
  return proxyToNestJS({ backendPath: `v1/inspections/${id}/findings`, params: queryParams });
}

export async function POST(req: NextRequest, { params }: RouteParams): Promise<Response> {
  const { id } = await params;
  const body: unknown = await req.json();
  return proxyToNestJS({ backendPath: `v1/inspections/${id}/findings`, method: 'POST', body });
}
