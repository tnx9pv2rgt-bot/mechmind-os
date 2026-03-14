import { type NextRequest } from 'next/server';
import { proxyToNestJS, getQueryParams } from '@/lib/auth/api-proxy';

export const dynamic = 'force-dynamic';

/** GET /api/bookings/slots/available → GET /v1/bookings/slots/available */
export async function GET(request: NextRequest) {
  return proxyToNestJS({
    backendPath: 'v1/bookings/slots/available',
    params: getQueryParams(request),
  });
}
