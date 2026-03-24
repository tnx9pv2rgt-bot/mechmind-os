/**
 * GET /api/canned-jobs — List canned jobs
 * POST /api/canned-jobs — Create canned job
 */

export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { proxyToNestJS, getQueryParams } from '@/lib/auth/api-proxy';

export async function GET(req: NextRequest) {
  const params = getQueryParams(req);
  return proxyToNestJS({ backendPath: 'v1/canned-jobs', params });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  return proxyToNestJS({ backendPath: 'v1/canned-jobs', method: 'POST', body });
}
