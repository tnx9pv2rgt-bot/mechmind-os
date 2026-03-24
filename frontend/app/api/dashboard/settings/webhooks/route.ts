import { type NextRequest } from 'next/server';
import { proxyToNestJS, getQueryParams } from '@/lib/auth/api-proxy';

export const dynamic = 'force-dynamic';

/** GET /api/dashboard/settings/webhooks → GET /v1/webhooks */
export async function GET(request: NextRequest) {
  return proxyToNestJS({
    backendPath: 'v1/webhooks',
    params: getQueryParams(request),
  });
}

/** POST /api/dashboard/settings/webhooks → POST /v1/webhooks */
export async function POST(request: NextRequest) {
  const body: unknown = await request.json();
  return proxyToNestJS({
    backendPath: 'v1/webhooks',
    method: 'POST',
    body,
  });
}
