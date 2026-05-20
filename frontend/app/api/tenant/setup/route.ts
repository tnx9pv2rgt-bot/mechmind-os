/**
 * POST /api/tenant/setup — Complete tenant setup after registration
 * GET  /api/tenant/setup — Check if tenant setup is complete
 * Proxied to NestJS backend
 */

export const dynamic = 'force-dynamic';

import { type NextRequest } from 'next/server';
import { proxyToNestJS, getQueryParams } from '@/lib/auth/api-proxy';

export async function POST(request: NextRequest) {
  const body = await request.json();
  return proxyToNestJS({
    backendPath: 'v1/tenant/setup',
    method: 'POST',
    body,
  });
}

export async function GET(request: NextRequest) {
  return proxyToNestJS({
    backendPath: 'v1/tenant/setup',
    params: getQueryParams(request),
  });
}
