import { NextRequest } from 'next/server';
import { proxyToNestJS, getQueryParams } from '@/lib/auth/api-proxy';

export const dynamic = 'force-dynamic';

/** GET /api/dashboard/analytics/revenue → GET /v1/analytics/revenue
 *  Backend YearMonthQueryDto requires: year (number, 2020-2100), month (optional, 1-12).
 *  Default to current year if not provided.
 */
export async function GET(req: NextRequest) {
  const params = getQueryParams(req);

  // Backend requires `year` — default to current year
  if (!params.year) {
    params.year = String(new Date().getFullYear());
  }

  return proxyToNestJS({ backendPath: 'v1/analytics/revenue', params });
}
