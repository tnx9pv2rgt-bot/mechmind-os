export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { proxyToNestJS, getQueryParams } from '@/lib/auth/api-proxy';

/** GET /api/vehicle-history/:vehicleId → GET /v1/vehicle-history/:vehicleId */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ vehicleId: string }> },
) {
  const { vehicleId } = await params;
  return proxyToNestJS({
    backendPath: `v1/vehicle-history/${vehicleId}`,
    params: getQueryParams(request),
  });
}
