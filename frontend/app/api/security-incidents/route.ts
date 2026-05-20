export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { proxyToNestJS, getQueryParams } from '@/lib/auth/api-proxy';

/** GET /api/security-incidents -> GET /v1/security-incidents */
export async function GET(request: NextRequest) {
  return proxyToNestJS({
    backendPath: 'v1/security-incidents',
    params: getQueryParams(request),
  });
}

/** POST /api/security-incidents -> POST /v1/security-incidents */
export async function POST(request: NextRequest) {
  const body = await request.json();
  return proxyToNestJS({ backendPath: 'v1/security-incidents', method: 'POST', body });
}
