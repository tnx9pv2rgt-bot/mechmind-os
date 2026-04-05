import { type NextRequest } from 'next/server';
import { proxyToNestJS, getQueryParams } from '@/lib/auth/api-proxy';

export const dynamic = 'force-dynamic';

/** GET /api/dashboard/settings → GET /v1/admin/tenant-settings */
export async function GET(request: NextRequest) {
  return proxyToNestJS({
    backendPath: 'v1/settings',
    params: getQueryParams(request),
  });
}

/** PUT /api/dashboard/settings → PUT /v1/admin/tenant-settings */
export async function PUT(request: NextRequest) {
  const body: unknown = await request.json();
  return proxyToNestJS({
    backendPath: 'v1/settings',
    method: 'PUT',
    body,
  });
}
