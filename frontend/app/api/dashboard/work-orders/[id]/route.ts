import { type NextRequest } from 'next/server';
import { proxyToNestJS, getQueryParams } from '@/lib/auth/api-proxy';

export const dynamic = 'force-dynamic';

/** GET /api/dashboard/work-orders/[id] → GET /v1/work-orders/:id */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  return proxyToNestJS({
    backendPath: `v1/work-orders/${id}`,
    params: getQueryParams(request),
  });
}

/** PUT /api/dashboard/work-orders/[id] → PUT /v1/work-orders/:id */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  const body = await request.json();
  return proxyToNestJS({ backendPath: `v1/work-orders/${id}`, method: 'PUT', body });
}

/** PATCH /api/dashboard/work-orders/[id] → PATCH /v1/work-orders/:id */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  const body = await request.json();
  return proxyToNestJS({ backendPath: `v1/work-orders/${id}`, method: 'PATCH', body });
}

/** DELETE /api/dashboard/work-orders/[id] → DELETE /v1/work-orders/:id */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  return proxyToNestJS({ backendPath: `v1/work-orders/${id}`, method: 'DELETE' });
}
