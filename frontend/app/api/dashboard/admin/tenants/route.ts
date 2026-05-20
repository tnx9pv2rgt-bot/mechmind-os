import { type NextRequest } from 'next/server';
import { proxyToNestJS, getQueryParams } from '@/lib/auth/api-proxy';

export const dynamic = 'force-dynamic';

/** GET /api/dashboard/admin/tenants → GET /v1/admin/tenants */
export async function GET(request: NextRequest) {
  return proxyToNestJS({
    backendPath: 'v1/admin/tenants',
    params: getQueryParams(request),
  });
}
