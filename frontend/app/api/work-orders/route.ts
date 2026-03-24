export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { proxyToNestJS, getQueryParams } from '@/lib/auth/api-proxy';

/** GET /api/work-orders -> GET /v1/work-orders */
export async function GET(request: NextRequest) {
  return proxyToNestJS({
    backendPath: 'v1/work-orders',
    params: getQueryParams(request),
  });
}

/** POST /api/work-orders -> POST /v1/work-orders */
export async function POST(request: NextRequest) {
  const body = await request.json();
  return proxyToNestJS({ backendPath: 'v1/work-orders', method: 'POST', body });
}
