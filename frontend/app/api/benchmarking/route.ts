export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { proxyToNestJS, getQueryParams } from '@/lib/auth/api-proxy';

/** GET /api/benchmarking → GET /v1/benchmarking/metrics */
export async function GET(request: NextRequest) {
  const params = getQueryParams(request);

  // Backend requires `period` in YYYY-MM format
  if (!params.period) {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    params.period = `${year}-${month}`;
  }

  return proxyToNestJS({
    backendPath: 'v1/benchmarking/metrics',
    params,
  });
}
