/**
 * GET /api/inspections — List inspections (proxy to backend)
 * POST /api/inspections — Create a new vehicle inspection (proxy to backend)
 */

export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { proxyToNestJS, getQueryParams } from '@/lib/auth/api-proxy';

export async function GET(request: NextRequest) {
  const params = getQueryParams(request);
  return proxyToNestJS({ backendPath: 'v1/inspections', params });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  return proxyToNestJS({ backendPath: 'v1/inspections', method: 'POST', body });
}
