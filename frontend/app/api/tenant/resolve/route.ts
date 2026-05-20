/**
 * GET /api/tenant/resolve
 * Resolve tenant by subdomain, domain, ID, or slug — proxied to NestJS backend
 */

export const dynamic = 'force-dynamic';

import { type NextRequest } from 'next/server';
import { proxyToNestJS, getQueryParams } from '@/lib/auth/api-proxy';

export async function GET(request: NextRequest) {
  return proxyToNestJS({
    backendPath: 'v1/tenant/resolve',
    params: getQueryParams(request),
  });
}
