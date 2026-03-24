/**
 * Notifications API Route
 * GET: List notifications with filters
 * POST: Send new notification
 */

export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { proxyToNestJS, getQueryParams } from '@/lib/auth/api-proxy';

/** GET /api/notifications -> GET /v1/notifications */
export async function GET(request: NextRequest) {
  return proxyToNestJS({
    backendPath: 'v1/notifications',
    params: getQueryParams(request),
  });
}

/** POST /api/notifications -> POST /v1/notifications */
export async function POST(request: NextRequest) {
  const body = await request.json();
  return proxyToNestJS({ backendPath: 'v1/notifications', method: 'POST', body });
}
