/**
 * GET /api/maintenance — List maintenance schedules (proxy to backend)
 * POST /api/maintenance — Create maintenance schedule (proxy to backend)
 */

export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { proxyToNestJS, getQueryParams } from '@/lib/auth/api-proxy';

export async function GET(request: NextRequest) {
  const params = getQueryParams(request);
  return proxyToNestJS({ backendPath: 'v1/predictive-maintenance', params });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  return proxyToNestJS({ backendPath: 'v1/predictive-maintenance', method: 'POST', body });
}
