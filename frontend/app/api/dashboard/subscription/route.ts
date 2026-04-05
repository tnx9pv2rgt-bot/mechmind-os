import { type NextRequest } from 'next/server';
import { proxyToNestJS, getQueryParams } from '@/lib/auth/api-proxy';

export const dynamic = 'force-dynamic';

/** GET /api/dashboard/subscription → GET /v1/subscription */
export async function GET(request: NextRequest) {
  return proxyToNestJS({
    backendPath: 'v1/subscription/current',
    params: getQueryParams(request),
  });
}
