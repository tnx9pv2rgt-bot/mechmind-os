import { type NextRequest } from 'next/server';
import { proxyToNestJS, getQueryParams } from '@/lib/auth/api-proxy';

export const dynamic = 'force-dynamic';

/** GET /api/dashboard/search → GET /v1/search */
export async function GET(request: NextRequest) {
  return proxyToNestJS({
    backendPath: 'v1/analytics/search',
    params: getQueryParams(request),
  });
}
