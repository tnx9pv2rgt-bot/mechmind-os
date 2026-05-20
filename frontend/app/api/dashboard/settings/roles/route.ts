import { type NextRequest } from 'next/server';
import { proxyToNestJS, getQueryParams } from '@/lib/auth/api-proxy';

export const dynamic = 'force-dynamic';

/** GET /api/dashboard/settings/roles → GET /v1/roles */
export async function GET(request: NextRequest) {
  return proxyToNestJS({
    backendPath: 'v1/roles',
    params: getQueryParams(request),
  });
}

/** POST /api/dashboard/settings/roles → POST /v1/roles */
export async function POST(request: NextRequest) {
  const body: unknown = await request.json();
  return proxyToNestJS({
    backendPath: 'v1/roles',
    method: 'POST',
    body,
  });
}
