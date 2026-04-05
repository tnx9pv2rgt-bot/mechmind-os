import { NextRequest } from 'next/server';
import { proxyToNestJS, getQueryParams } from '@/lib/auth/api-proxy';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest): Promise<Response> {
  const params = getQueryParams(req);

  // Backend requires `from` and `to` ISO date strings
  if (!params.from || !params.to) {
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    if (!params.from) params.from = thirtyDaysAgo.toISOString();
    if (!params.to) params.to = now.toISOString();
  }

  return proxyToNestJS({ backendPath: 'v1/bookings/calendar', params });
}
