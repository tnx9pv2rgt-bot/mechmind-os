/**
 * GET /api/obd/readings — List OBD readings
 * POST /api/obd/readings — Create OBD reading
 */

export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { proxyToNestJS, getQueryParams } from '@/lib/auth/api-proxy';

export async function GET(req: NextRequest) {
  const params = getQueryParams(req);
  return proxyToNestJS({ backendPath: 'v1/obd/readings', params });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  return proxyToNestJS({ backendPath: 'v1/obd/readings', method: 'POST', body });
}
