/**
 * POST /api/maintenance/complete — Mark maintenance as completed (proxy to backend)
 */

export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { proxyToNestJS } from '@/lib/auth/api-proxy';

export async function POST(request: NextRequest) {
  const body = await request.json();
  return proxyToNestJS({ backendPath: 'v1/fleets/maintenance/complete', method: 'POST', body });
}
