import { type NextRequest } from 'next/server';
import { proxyToNestJS, getQueryParams } from '@/lib/auth/api-proxy';

export const dynamic = 'force-dynamic';

/** GET /api/dashboard/settings/team → GET /v1/users */
export async function GET(request: NextRequest) {
  return proxyToNestJS({
    backendPath: 'v1/users',
    params: getQueryParams(request),
  });
}

/** POST /api/dashboard/settings/team → POST /v1/users */
export async function POST(request: NextRequest) {
  const body: unknown = await request.json();
  return proxyToNestJS({
    backendPath: 'v1/users',
    method: 'POST',
    body,
  });
}
