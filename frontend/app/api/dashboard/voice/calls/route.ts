import { type NextRequest } from 'next/server';
import { proxyToNestJS, getQueryParams } from '@/lib/auth/api-proxy';

export const dynamic = 'force-dynamic';

/** GET /api/dashboard/voice/calls → GET /v1/voice/calls */
export async function GET(request: NextRequest) {
  return proxyToNestJS({
    backendPath: 'v1/voice/calls',
    params: getQueryParams(request),
  });
}
