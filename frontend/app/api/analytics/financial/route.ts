/**
 * GET /api/analytics/financial — Financial dashboard data
 * Proxies to GET /v1/analytics/dashboard and /v1/analytics/revenue
 */

export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { proxyToNestJS, getQueryParams } from '@/lib/auth/api-proxy';

export async function GET(req: NextRequest) {
  const params = getQueryParams(req);
  return proxyToNestJS({ backendPath: 'v1/analytics/dashboard', params });
}
