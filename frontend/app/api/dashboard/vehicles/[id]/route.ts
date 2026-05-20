import { type NextRequest } from 'next/server';
import { proxyToNestJS, getQueryParams } from '@/lib/auth/api-proxy';

export const dynamic = 'force-dynamic';

/** GET /api/dashboard/vehicles/[id] → GET /v1/vehicles/:id */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  return proxyToNestJS({
    backendPath: `v1/vehicles/${id}`,
    params: getQueryParams(request),
  });
}

/** PUT /api/dashboard/vehicles/[id] → PUT /v1/vehicles/:id */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  const body = await request.json();
  return proxyToNestJS({ backendPath: `v1/vehicles/${id}`, method: 'PUT', body });
}

/** DELETE /api/dashboard/vehicles/[id] → DELETE /v1/vehicles/:id */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  return proxyToNestJS({ backendPath: `v1/vehicles/${id}`, method: 'DELETE' });
}
