/**
 * VAT Validation API Route
 * Proxies to NestJS backend validation endpoint
 */

export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { proxyToNestJS, getQueryParams } from '@/lib/auth/api-proxy';

/** GET /api/validate/vat -> GET /v1/api/validation/vat */
export async function GET(request: NextRequest) {
  return proxyToNestJS({
    backendPath: 'v1/api/validation/vat',
    params: getQueryParams(request),
  });
}

/** POST /api/validate/vat -> POST /v1/api/validation/vat */
export async function POST(request: NextRequest) {
  const body = await request.json();
  return proxyToNestJS({ backendPath: 'v1/api/validation/vat', method: 'POST', body });
}
