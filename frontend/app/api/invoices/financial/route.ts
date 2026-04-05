export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { proxyToNestJS, getQueryParams } from '@/lib/auth/api-proxy';

/** GET /api/invoices/financial → GET /v1/invoices with financial filters */
export async function GET(req: NextRequest) {
  const params = getQueryParams(req);
  return proxyToNestJS({ backendPath: 'v1/invoices', params });
}
