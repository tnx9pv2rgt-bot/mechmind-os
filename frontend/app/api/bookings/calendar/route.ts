import { NextRequest } from 'next/server';
import { proxyToNestJS, getQueryParams } from '@/lib/auth/api-proxy';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest): Promise<Response> {
  const params = getQueryParams(req);
  return proxyToNestJS({ backendPath: 'v1/bookings/calendar', params });
}
