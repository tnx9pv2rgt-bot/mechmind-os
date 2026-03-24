import { type NextRequest } from 'next/server';
import { proxyToNestJS } from '@/lib/auth/api-proxy';

export const dynamic = 'force-dynamic';

/** PUT /api/dashboard/settings/roles/:id → PUT /v1/roles/:id */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body: unknown = await request.json();
  return proxyToNestJS({
    backendPath: `v1/roles/${id}`,
    method: 'PUT',
    body,
  });
}

/** DELETE /api/dashboard/settings/roles/:id → DELETE /v1/roles/:id */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return proxyToNestJS({
    backendPath: `v1/roles/${id}`,
    method: 'DELETE',
  });
}
