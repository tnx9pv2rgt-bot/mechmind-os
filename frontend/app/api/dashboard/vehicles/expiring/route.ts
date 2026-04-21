import { type NextRequest } from 'next/server';
import { proxyToNestJS, getQueryParams } from '@/lib/auth/api-proxy';

export const dynamic = 'force-dynamic';

/** GET /api/dashboard/vehicles/expiring → GET /v1/vehicles/expiring */
export async function GET(request: NextRequest): Promise<Response> {
  return proxyToNestJS({
    backendPath: 'v1/vehicles/expiring',
    params: getQueryParams(request),
  });
}
