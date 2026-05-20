import { type NextRequest } from 'next/server';
import { proxyToNestJS, getQueryParams } from '@/lib/auth/api-proxy';

export const dynamic = 'force-dynamic';

/** GET /api/dashboard/voice/stats → GET /v1/voice/stats */
export async function GET(request: NextRequest) {
  return proxyToNestJS({
    backendPath: 'v1/voice/stats',
    params: getQueryParams(request),
  });
}
