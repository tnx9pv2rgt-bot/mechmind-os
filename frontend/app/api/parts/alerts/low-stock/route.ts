export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { proxyToNestJS, getQueryParams } from '@/lib/auth/api-proxy';

export async function GET(req: NextRequest) {
  return proxyToNestJS({ backendPath: 'v1/parts/alerts/low-stock', params: getQueryParams(req) });
}
