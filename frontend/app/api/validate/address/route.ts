/**
 * Address Validation API Route
 * Proxies to NestJS backend validation endpoint
 */

export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { proxyToNestJS, getQueryParams } from '@/lib/auth/api-proxy';

/** GET /api/validate/address -> GET /v1/api/validation/address/autocomplete */
export async function GET(request: NextRequest) {
  const params = getQueryParams(request);

  // If placeId is provided, get details instead
  if (params.placeId) {
    return proxyToNestJS({
      backendPath: 'v1/api/validation/address/details',
      params,
    });
  }

  return proxyToNestJS({
    backendPath: 'v1/api/validation/address/autocomplete',
    params,
  });
}

/** POST /api/validate/address -> POST /v1/api/validation/address/postalcode */
export async function POST(request: NextRequest) {
  const body = await request.json();
  return proxyToNestJS({ backendPath: 'v1/api/validation/postalcode/validate', method: 'POST', body });
}
