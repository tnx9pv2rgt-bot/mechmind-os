export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { proxyToNestJS, getQueryParams } from '@/lib/auth/api-proxy';

/** GET /api/predictive-maintenance → GET /v1/predictive-maintenance */
export async function GET(request: NextRequest) {
  return proxyToNestJS({
    backendPath: 'v1/predictive-maintenance',
    params: getQueryParams(request),
  });
}

/** POST /api/predictive-maintenance → POST /v1/predictive-maintenance */
export async function POST(request: NextRequest) {
  const body = await request.json();
  return proxyToNestJS({ backendPath: 'v1/predictive-maintenance', method: 'POST', body });
}
