/**
 * GET /api/stripe/billing-info
 * Get tenant billing information — proxied to NestJS backend
 */

export const dynamic = 'force-dynamic';

import { type NextRequest } from 'next/server';
import { proxyToNestJS, getQueryParams } from '@/lib/auth/api-proxy';

export async function GET(request: NextRequest) {
  return proxyToNestJS({
    backendPath: 'v1/subscription/billing-info',
    params: getQueryParams(request),
  });
}
