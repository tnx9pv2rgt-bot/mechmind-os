/**
 * GET /api/obd/devices — List OBD devices
 * POST /api/obd/devices — Register OBD device
 */

export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { proxyToNestJS, getQueryParams } from '@/lib/auth/api-proxy';

export async function GET(req: NextRequest) {
  const params = getQueryParams(req);
  return proxyToNestJS({ backendPath: 'v1/obd/devices', params });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  return proxyToNestJS({ backendPath: 'v1/obd/devices', method: 'POST', body });
}
