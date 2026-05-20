/**
 * GET /api/notifications/history — Proxy to backend notifications endpoint
 */

export const dynamic = 'force-dynamic';

import { type NextRequest } from 'next/server';
import { proxyToNestJS, getQueryParams } from '@/lib/auth/api-proxy';

export async function GET(request: NextRequest) {
  const params = getQueryParams(request);

  // Provide pagination defaults
  if (!params.limit) params.limit = '50';
  if (!params.offset) params.offset = '0';

  return proxyToNestJS({ backendPath: 'v1/notifications', params });
}
