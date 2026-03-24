import { type NextRequest } from 'next/server';
import { proxyToNestJS, getQueryParams } from '@/lib/auth/api-proxy';

export const dynamic = 'force-dynamic';

/** GET /api/dashboard/settings/audit → GET /v1/audit-logs */
export async function GET(request: NextRequest) {
  return proxyToNestJS({
    backendPath: 'v1/audit-logs',
    params: getQueryParams(request),
  });
}
