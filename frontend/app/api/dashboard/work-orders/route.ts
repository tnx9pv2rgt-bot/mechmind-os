import { type NextRequest } from 'next/server';
import { proxyToNestJS, getQueryParams } from '@/lib/auth/api-proxy';

export const dynamic = 'force-dynamic';

/** GET /api/dashboard/work-orders → GET /v1/work-orders */
export async function GET(request: NextRequest): Promise<Response> {
  return proxyToNestJS({
    backendPath: 'v1/work-orders',
    params: getQueryParams(request),
  });
}

/** POST /api/dashboard/work-orders → POST /v1/work-orders */
export async function POST(request: NextRequest): Promise<Response> {
  const body = await request.json();
  return proxyToNestJS({ backendPath: 'v1/work-orders', method: 'POST', body });
}
