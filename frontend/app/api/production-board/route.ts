export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { proxyToNestJS, getQueryParams } from '@/lib/auth/api-proxy';

/** GET /api/production-board -> GET /v1/production-board */
export async function GET(request: NextRequest) {
  return proxyToNestJS({
    backendPath: 'v1/production-board',
    params: getQueryParams(request),
  });
}

/** POST /api/production-board -> POST /v1/production-board/assign */
export async function POST(request: NextRequest) {
  const body = await request.json();
  return proxyToNestJS({ backendPath: 'v1/production-board/assign', method: 'POST', body });
}
