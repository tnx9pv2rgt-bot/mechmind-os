import { NextRequest } from 'next/server';
import { proxyToNestJS, getQueryParams } from '@/lib/auth/api-proxy';

export async function GET(req: NextRequest, { params }: { params: Promise<{ vehicleId: string }> }) {
  const { vehicleId } = await params;
  const query = getQueryParams(req);
  return proxyToNestJS({ backendPath: `v1/obd/${vehicleId}/history`, params: query });
}
