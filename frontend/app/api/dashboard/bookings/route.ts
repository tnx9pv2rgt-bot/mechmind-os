import { type NextRequest } from 'next/server';
import { proxyToNestJS, getQueryParams } from '@/lib/auth/api-proxy';

export const dynamic = 'force-dynamic';

/** GET /api/dashboard/bookings → GET /v1/bookings */
export async function GET(request: NextRequest): Promise<Response> {
  return proxyToNestJS({
    backendPath: 'v1/bookings',
    params: getQueryParams(request),
  });
}

/** POST /api/dashboard/bookings → POST /v1/bookings */
export async function POST(request: NextRequest): Promise<Response> {
  const body: unknown = await request.json();
  return proxyToNestJS({
    backendPath: 'v1/bookings',
    method: 'POST',
    body,
  });
}
