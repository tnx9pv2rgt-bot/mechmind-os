import { type NextRequest } from 'next/server';
import { proxyToNestJS, getQueryParams } from '@/lib/auth/api-proxy';

export const dynamic = 'force-dynamic';

/** GET /api/dashboard/vehicles → GET /v1/vehicles */
export async function GET(request: NextRequest): Promise<Response> {
  return proxyToNestJS({
    backendPath: 'v1/vehicles',
    params: getQueryParams(request),
  });
}

/** POST /api/dashboard/vehicles → POST /v1/vehicles */
export async function POST(request: NextRequest): Promise<Response> {
  const body = await request.json();
  return proxyToNestJS({ backendPath: 'v1/vehicles', method: 'POST', body });
}
