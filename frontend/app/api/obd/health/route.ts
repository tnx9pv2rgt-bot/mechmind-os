/**
 * GET /api/obd/health?vehicleId=xxx — Get vehicle health score
 */

export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { proxyToNestJS, getQueryParams } from '@/lib/auth/api-proxy';

export async function GET(req: NextRequest) {
  const params = getQueryParams(req);
  const vehicleId = params.vehicleId;
  if (!vehicleId) {
    return proxyToNestJS({ backendPath: 'v1/obd/devices', params });
  }
  return proxyToNestJS({ backendPath: `v1/obd/vehicles/${vehicleId}/health` });
}
