export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { proxyToNestJS } from '@/lib/auth/api-proxy';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/** GET /api/work-orders/:id -> GET /v1/work-orders/:id */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  return proxyToNestJS({ backendPath: `v1/work-orders/${id}` });
}

/** PATCH /api/work-orders/:id -> PATCH /v1/work-orders/:id */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const body = await request.json();
  return proxyToNestJS({ backendPath: `v1/work-orders/${id}`, method: 'PATCH', body });
}
