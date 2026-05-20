/**
 * GET /api/estimates — List estimates
 * POST /api/estimates — Create estimate
 */

export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { proxyToNestJS, getQueryParams } from '@/lib/auth/api-proxy';

export async function GET(req: NextRequest) {
  const params = getQueryParams(req);
  return proxyToNestJS({ backendPath: 'v1/estimates', params });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  return proxyToNestJS({ backendPath: 'v1/estimates', method: 'POST', body });
}
