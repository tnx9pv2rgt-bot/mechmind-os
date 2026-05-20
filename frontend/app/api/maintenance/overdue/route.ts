/**
 * GET /api/maintenance/overdue — Get overdue maintenance items (proxy to backend)
 */

export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { proxyToNestJS, getQueryParams } from '@/lib/auth/api-proxy';

export async function GET(request: NextRequest) {
  const params = getQueryParams(request);
  return proxyToNestJS({ backendPath: 'v1/predictive-maintenance', params });
}
