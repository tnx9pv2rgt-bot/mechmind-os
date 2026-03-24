import { type NextRequest } from 'next/server';
import { proxyToNestJS, getQueryParams } from '@/lib/auth/api-proxy';

export const dynamic = 'force-dynamic';

/** GET /api/dashboard/billing/payment-method → GET /v1/billing/payment-method */
export async function GET(request: NextRequest) {
  return proxyToNestJS({
    backendPath: 'v1/billing/payment-method',
    params: getQueryParams(request),
  });
}
