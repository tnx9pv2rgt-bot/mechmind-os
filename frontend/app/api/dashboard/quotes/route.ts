import { type NextRequest } from 'next/server';
import { proxyToNestJS, getQueryParams } from '@/lib/auth/api-proxy';

export const dynamic = 'force-dynamic';

/** GET /api/dashboard/quotes → GET /v1/estimates */
export async function GET(request: NextRequest) {
  return proxyToNestJS({
    backendPath: 'v1/estimates',
    params: getQueryParams(request),
  });
}

/** POST /api/dashboard/quotes → POST /v1/estimates */
export async function POST(request: NextRequest) {
  const body = await request.json();
  return proxyToNestJS({
    backendPath: 'v1/estimates',
    method: 'POST',
    body,
  });
}
