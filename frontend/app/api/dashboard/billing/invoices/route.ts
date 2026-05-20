import { type NextRequest } from 'next/server';
import { proxyToNestJS, getQueryParams } from '@/lib/auth/api-proxy';

export const dynamic = 'force-dynamic';

/** GET /api/dashboard/billing/invoices → GET /v1/billing/invoices */
export async function GET(request: NextRequest) {
  return proxyToNestJS({
    backendPath: 'v1/invoices',
    params: getQueryParams(request),
  });
}
