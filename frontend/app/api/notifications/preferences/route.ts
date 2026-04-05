/**
 * Notification Preferences API Route
 * Proxies to backend settings endpoint
 */

export const dynamic = 'force-dynamic';

import { type NextRequest } from 'next/server';
import { proxyToNestJS, getQueryParams } from '@/lib/auth/api-proxy';

/** GET /api/notifications/preferences → GET /v1/settings */
export async function GET(request: NextRequest) {
  const params = getQueryParams(request);
  return proxyToNestJS({ backendPath: 'v1/settings', params });
}

/** PUT /api/notifications/preferences → PUT /v1/settings */
export async function PUT(request: NextRequest) {
  const body = await request.json();
  return proxyToNestJS({
    backendPath: 'v1/settings',
    method: 'PUT',
    body,
  });
}

/** POST /api/notifications/preferences → POST /v1/settings (compatibility) */
export async function POST(request: NextRequest) {
  return PUT(request);
}
