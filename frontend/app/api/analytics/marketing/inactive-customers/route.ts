/**
 * GET /api/analytics/marketing/inactive-customers — Inactive customers for re-engagement
 */

export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { proxyToNestJS, getQueryParams } from '@/lib/auth/api-proxy';

export async function GET(request: NextRequest) {
  const params = getQueryParams(request);
  return proxyToNestJS({ backendPath: 'v1/campaigns/segments/preview', params: { ...params, segment: 'inactive' } });
}
