import { type NextRequest } from 'next/server';
import { proxyToNestJS, getQueryParams } from '@/lib/auth/api-proxy';

export const dynamic = 'force-dynamic';

/** GET /api/dashboard/settings/webhooks/:id → GET /v1/webhooks/:id */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return proxyToNestJS({
    backendPath: `v1/webhooks/${id}`,
    params: getQueryParams(request),
  });
}

/** DELETE /api/dashboard/settings/webhooks/:id → DELETE /v1/webhooks/:id */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return proxyToNestJS({
    backendPath: `v1/webhooks/${id}`,
    method: 'DELETE',
  });
}
