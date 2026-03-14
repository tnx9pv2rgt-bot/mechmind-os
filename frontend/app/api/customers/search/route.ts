import { type NextRequest } from 'next/server';
import { proxyToNestJS, getQueryParams } from '@/lib/auth/api-proxy';

export const dynamic = 'force-dynamic';

/** GET /api/customers/search → GET /v1/customers/search */
export async function GET(request: NextRequest) {
  return proxyToNestJS({
    backendPath: 'v1/customers/search',
    params: getQueryParams(request),
  });
}
