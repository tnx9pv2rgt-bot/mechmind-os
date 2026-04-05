export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { proxyToNestJS, getQueryParams } from '@/lib/auth/api-proxy';

/** GET /api/estimates/stats → GET /v1/estimates with count query */
export async function GET(req: NextRequest) {
  const params = getQueryParams(req);
  return proxyToNestJS({ backendPath: 'v1/estimates', params });
}
